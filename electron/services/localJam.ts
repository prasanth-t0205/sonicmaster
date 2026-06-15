import http from "http";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import os from "os";
import { BrowserWindow } from "electron";

let server: http.Server | null = null;
let sseClients: { res: http.ServerResponse; name: string }[] = [];
let currentJamState: any = {
  currentSong: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  queue: [],
  participants: 0,
  participantNames: [],
};

export function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();
  const sortedNames = Object.keys(interfaces).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aIsPriority = aLower.includes("wi-fi") || aLower.includes("wlan") || aLower.includes("ethernet") || aLower.includes("lan");
    const bIsPriority = bLower.includes("wi-fi") || bLower.includes("wlan") || bLower.includes("ethernet") || bLower.includes("lan");
    const aIsVirtual = aLower.includes("virtual") || aLower.includes("vbox") || aLower.includes("vmware") || aLower.includes("wsl") || aLower.includes("hyper-v") || aLower.includes("host-only") || aLower.includes("vethernet") || aLower.includes("docker") || aLower.includes("vpn");
    const bIsVirtual = bLower.includes("virtual") || bLower.includes("vbox") || bLower.includes("vmware") || bLower.includes("wsl") || bLower.includes("hyper-v") || bLower.includes("host-only") || bLower.includes("vethernet") || bLower.includes("docker") || bLower.includes("vpn");

    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    if (aIsVirtual && !bIsVirtual) return 1;
    if (!aIsVirtual && bIsVirtual) return -1;
    return 0;
  });

  for (const name of sortedNames) {
    const lowerName = name.toLowerCase();
    const isVirtual = lowerName.includes("virtual") || lowerName.includes("vbox") || lowerName.includes("vmware") || lowerName.includes("wsl") || lowerName.includes("hyper-v") || lowerName.includes("host-only") || lowerName.includes("vethernet") || lowerName.includes("docker") || lowerName.includes("vpn");
    
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        if (!isVirtual) {
          return iface.address;
        }
      }
    }
  }

  // Fallback to any non-internal IPv4 including virtual ones if no physical found
  for (const name of sortedNames) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

function notifyHostOfClients() {
  const windows = BrowserWindow.getAllWindows();
  const clientNames = sseClients.map((c) => c.name);
  windows.forEach((win) => {
    win.webContents.send("jam-clients-updated", {
      count: sseClients.length,
      names: clientNames,
    });
  });
}

export function startLocalJamServer(port: number = 19000): Promise<{ ip: string; port: number }> {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve({ ip: getLocalIPAddress(), port });
      return;
    }

    server = http.createServer(async (req, res) => {
      // Enable permissive CORS for all incoming connections
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const pathname = parsedUrl.pathname;

      // Endpoint 1: SSE Events
      if (pathname === "/events") {
        const clientName = parsedUrl.searchParams.get("name") || "Guest Device";

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        sseClients.push({ res, name: clientName });
        
        // Update state with new client list before pushing to sync up
        currentJamState.participants = sseClients.length;
        currentJamState.participantNames = sseClients.map((c) => c.name);

        // Immediately push initial state to sync up
        res.write(`data: ${JSON.stringify({ type: "SYNC_STATE", ...currentJamState })}\n\n`);

        notifyHostOfClients();
        // Broadcast new state to other clients as well
        broadcastLocalJamState({});

        req.on("close", () => {
          sseClients = sseClients.filter((c) => c.res !== res);
          currentJamState.participants = sseClients.length;
          currentJamState.participantNames = sseClients.map((c) => c.name);
          notifyHostOfClients();
          broadcastLocalJamState({});
        });
        return;
      }

      // Endpoint 2: Audio Stream
      if (pathname === "/stream") {
        const filePathParam = parsedUrl.searchParams.get("path");
        if (!filePathParam) {
          res.writeHead(400);
          res.end("Missing path parameter");
          return;
        }

        const decodedPath = path.normalize(decodeURIComponent(filePathParam));
        const allowedExtensions = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"];
        const ext = path.extname(decodedPath).toLowerCase();

        if (!path.isAbsolute(decodedPath) || !allowedExtensions.includes(ext)) {
          res.writeHead(403);
          res.end("Forbidden path");
          return;
        }

        try {
          const stat = fs.statSync(decodedPath);
          const fileSize = stat.size;
          const range = req.headers.range;
          const contentType = mime.lookup(decodedPath) || "application/octet-stream";

          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (isNaN(start) || start < 0 || start >= fileSize || isNaN(end) || end < start || end >= fileSize) {
              res.writeHead(416, {
                "Content-Range": `bytes */${fileSize}`,
              });
              res.end();
              return;
            }

            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(decodedPath, { start, end });

            res.writeHead(206, {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunksize,
              "Content-Type": contentType,
            });
            fileStream.pipe(res);
          } else {
            res.writeHead(200, {
              "Content-Length": fileSize,
              "Content-Type": contentType,
              "Accept-Ranges": "bytes",
            });
            fs.createReadStream(decodedPath).pipe(res);
          }
        } catch (err) {
          res.writeHead(404);
          res.end("File Not Found");
        }
        return;
      }

      // Endpoint 3: Album Art Stream
      if (pathname === "/art") {
        const filePathParam = parsedUrl.searchParams.get("path");
        if (!filePathParam) {
          res.writeHead(400);
          res.end("Missing path parameter");
          return;
        }

        const decodedPath = path.normalize(decodeURIComponent(filePathParam));
        const allowedExtensions = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"];
        const ext = path.extname(decodedPath).toLowerCase();

        if (!path.isAbsolute(decodedPath) || !allowedExtensions.includes(ext)) {
          res.writeHead(403);
          res.end("Forbidden path");
          return;
        }

        try {
          const mm = await import("music-metadata");
          const metadata = await mm.parseFile(decodedPath);
          const picture = metadata.common.picture?.[0];
          if (picture) {
            res.writeHead(200, {
              "Content-Type": picture.format || "image/jpeg",
              "Content-Length": picture.data.length,
              "Cache-Control": "public, max-age=86400",
            });
            res.end(picture.data);
          } else {
            res.writeHead(404);
            res.end("No cover art found");
          }
        } catch (err) {
          res.writeHead(500);
          res.end("Error parsing album art");
        }
        return;
      }

      // Default fallback
      res.writeHead(404);
      res.end("Not Found");
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`Local Jam Server running at http://0.0.0.0:${port}`);
      resolve({ ip: getLocalIPAddress(), port });
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        // Automatically try next port
        startLocalJamServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

export function stopLocalJamServer() {
  if (server) {
    // Notify connected SSE clients of disconnection
    const payload = JSON.stringify({ type: "HOST_DISCONNECTED" });
    sseClients.forEach((client) => {
      client.res.write(`data: ${payload}\n\n`);
      client.res.end();
    });
    sseClients = [];

    server.close();
    server = null;
    console.log("Local Jam Server stopped");
  }
}

export function broadcastLocalJamState(state: any) {
  currentJamState = { ...currentJamState, ...state };
  currentJamState.participants = sseClients.length;
  currentJamState.participantNames = sseClients.map((c) => c.name);
  const payload = JSON.stringify({ type: "SYNC_STATE", ...currentJamState });
  sseClients.forEach((client) => {
    client.res.write(`data: ${payload}\n\n`);
  });
}
