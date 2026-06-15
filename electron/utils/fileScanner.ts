import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);
const VALID_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];

// Folders to stay away from (System, speed, and privacy)
const IGNORE_FOLDERS = [
  "Windows",
  "Program Files",
  "Program Files (x86)",
  "AppData",
  "node_modules",
  "$Recycle.Bin",
  "System Volume Information",
  ".git",
  ".nvm",
  "eSupport",
];

const IGNORE_FOLDERS_LOWER = IGNORE_FOLDERS.map((f) => f.toLowerCase());

export async function getLogicalDrives(): Promise<string[]> {
  if (process.platform !== "win32") {
    return ["/"];
  }

  try {
    // Windows specific drive detection
    const { stdout } = await execPromise("wmic logicaldisk get name");
    const drives = stdout
      .split("\r\r\n")
      .filter((value) => /[A-Za-z]:/.test(value))
      .map((value) => value.trim() + path.sep);
    return drives;
  } catch (error) {
    console.error("Error getting drives:", error);
    // Fallback to C: if detection fails
    return ["C:\\"];
  }
}

export async function findAudioFiles(
  dir: string,
  depth = 0
): Promise<string[]> {
  const files: string[] = [];

  // Safety: Don't go too deep or scan system root too aggressively
  if (depth > 15) return [];

  try {
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Exclusion logic
        if (
          IGNORE_FOLDERS_LOWER.includes(entry.name.toLowerCase()) ||
          entry.name.startsWith(".")
        ) {
          continue;
        }

        try {
          const subFiles = await findAudioFiles(fullPath, depth + 1);
          files.push(...subFiles);
        } catch (e) {
          // Permission errors are common for system folders
          continue;
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VALID_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Common for folders we don't have access to
  }

  return files;
}
