"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAudio, Song } from "./audio-context";

type JamStatus = "idle" | "busy" | "active";

interface JamContextType {
  roomCode: string | null;
  isHost: boolean;
  participants: number;
  isActive: boolean;
  status: JamStatus;
  subStatus: string | null;
  error: string | null;
  createJam: () => void;
  joinJam: (code: string) => void;
  leaveJam: () => void;
  broadcastCommand: (type: string, payload?: any) => void;
  remoteSong: Partial<Song> | null;
  remoteIsPlaying: boolean;
  remoteProgress: number;
  remoteDuration: number;
  remoteQueue: Song[];
  latency: number;
  localDeviceName: string;
  participantNames: string[];
}

const JamContext = createContext<JamContextType | undefined>(undefined);

export const JamProvider = ({ children }: { children: React.ReactNode }) => {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<JamStatus>("idle");
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remoteSong, setRemoteSong] = useState<Partial<Song> | null>(null);
  const [remoteIsPlaying, setRemoteIsPlaying] = useState(false);
  const [remoteProgress, setRemoteProgress] = useState(0);
  const [remoteDuration, setRemoteDuration] = useState(0);
  const [remoteQueue, setRemoteQueue] = useState<Song[]>([]);
  const [latency, setLatency] = useState(0);
  const [localDeviceName, setLocalDeviceName] = useState("Unknown Device");
  const [participantNames, setParticipantNames] = useState<string[]>([]);

  const { currentSong, isPlaying, volume, isMuted, queue, elementRefsObj } =
    useAudio();

  const eventSourceRef = useRef<EventSource | null>(null);
  const hostIpPortRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (window.electron?.getDeviceName) {
      window.electron.getDeviceName().then(setLocalDeviceName);
    }
  }, []);

  const cleanup = useCallback(async () => {
    // If hosting, stop the local server
    if (isHost && window.electron?.invoke) {
      await window.electron.invoke("stop-local-jam");
    }

    // Close joiner's event stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Stop joiner's audio stream
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.src = "";
      remoteAudioRef.current = null;
    }

    // Reset State
    setRoomCode(null);
    setIsHost(false);
    setParticipants(0);
    setIsActive(false);
    setStatus("idle");
    setSubStatus(null);
    setParticipantNames([]);
    setRemoteSong(null);
    setRemoteIsPlaying(false);
    setRemoteProgress(0);
    setRemoteDuration(0);
    setRemoteQueue([]);
    hostIpPortRef.current = null;
  }, [isHost]);

  const broadcastCommand = useCallback(
    (type: string, payload: any = {}) => {
      // Currently, commands originate from Host to SSE clients via the IPC bridge
      if (isHost && window.electron?.invoke) {
        window.electron.invoke("sync-local-jam-state", { type, ...payload });
      }
    },
    [isHost],
  );

  const createJam = useCallback(async () => {
    await cleanup();
    setStatus("busy");
    setSubStatus("Launching Local Wi-Fi Server...");

    try {
      if (!window.electron?.invoke) {
        throw new Error("Electron context required to host offline Jam rooms.");
      }

      const res = await window.electron.invoke("start-local-jam");
      if (!res.success) {
        throw new Error(res.error || "Failed to start local stream server");
      }

      const hostAddress = `${res.ip}:${res.port}`;
      setRoomCode(hostAddress);
      setIsHost(true);
      setIsActive(true);
      setStatus("active");
      setSubStatus(null);
      setError(null);
    } catch (err: any) {
      console.error("Session Host Failed", err);
      setError(err.message || "Failed to start server");
      setStatus("idle");
    }
  }, [cleanup]);

  const joinJam = useCallback(
    async (enteredCode: string) => {
      await cleanup();
      setStatus("busy");
      setSubStatus("Connecting to Local Wi-Fi Host...");

      try {
        const hostAddress = enteredCode.trim().replace(/^SONIC-/, "");

        const sse = new EventSource(
          `http://${hostAddress}/events?name=${encodeURIComponent(localDeviceName)}`,
        );
        eventSourceRef.current = sse;
        hostIpPortRef.current = hostAddress;

        sse.onopen = () => {
          setRoomCode(hostAddress);
          setIsHost(false);
          setIsActive(true);
          setStatus("active");
          setSubStatus(null);
          setError(null);
        };

        sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "SYNC_STATE") {
              if (data.currentSong) {
                const remoteSongWithArt = {
                  ...data.currentSong,
                  coverArt:
                    data.currentSong.hasArt && hostIpPortRef.current
                      ? `http://${hostIpPortRef.current}/art?path=${encodeURIComponent(data.currentSong.path)}`
                      : undefined,
                };
                setRemoteSong(remoteSongWithArt);
              } else {
                setRemoteSong(null);
              }
              setRemoteIsPlaying(data.isPlaying);
              setRemoteProgress(data.progress);
              setRemoteDuration(data.duration);

              const mappedQueue = (data.queue || []).map((song: any) => ({
                ...song,
                coverArt:
                  song.hasArt && hostIpPortRef.current
                    ? `http://${hostIpPortRef.current}/art?path=${encodeURIComponent(song.path)}`
                    : undefined,
              }));
              setRemoteQueue(mappedQueue);

              if (typeof data.participants === "number") {
                setParticipants(data.participants);
              }
              if (Array.isArray(data.participantNames)) {
                setParticipantNames(data.participantNames);
              }
            } else if (data.type === "HOST_DISCONNECTED") {
              setError("Host ended the session");
              cleanup();
            }
          } catch (err) {
            console.error("Error parsing SSE sync message:", err);
          }
        };

        sse.onerror = (err) => {
          console.error("SSE Connection Error:", err);
          setError("Failed to connect to Local Wi-Fi Host. Check IP address.");
          cleanup();
        };
      } catch (err: any) {
        console.error("Session Join Failed", err);
        setError(err.message || "Failed to connect to host");
        setStatus("idle");
      }
    },
    [cleanup],
  );

  // Host state sync logic
  useEffect(() => {
    if (!isHost || !isActive || !window.electron?.invoke) return;

    const sync = () => {
      const audio = elementRefsObj.current?.[elementRefsObj.current.activeKey];
      const currentProgress = audio?.currentTime || 0;
      const currentDuration = audio?.duration || 0;

      const state = {
        currentSong: currentSong
          ? {
              title: currentSong.title,
              artist: currentSong.artist,
              path: currentSong.path,
              album: currentSong.album,
              lyrics: currentSong.lyrics,
              hasArt: currentSong.hasArt,
            }
          : null,
        isPlaying,
        progress: currentProgress,
        duration: currentDuration,
        queue: queue.slice(0, 5).map((song) => ({
          title: song.title,
          artist: song.artist,
          path: song.path,
          album: song.album,
          hasArt: song.hasArt,
        })),
      };
      window.electron!.invoke("sync-local-jam-state", state);
    };

    // Sync immediately on state change
    sync();

    // And sync periodically to keep clients aligned without flooding IPC
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [isHost, isActive, isPlaying, currentSong, queue, elementRefsObj]);

  // Listen to clients joining/leaving if we are the Host
  useEffect(() => {
    if (isHost && isActive && window.electron?.onJamClientsUpdated) {
      const unsubscribe = window.electron.onJamClientsUpdated((data) => {
        setParticipants(data.count);
        setParticipantNames(data.names);
      });
      return unsubscribe;
    }
  }, [isHost, isActive]);

  // Joiner audio stream logic (Path change)
  useEffect(() => {
    if (!isHost && isActive && remoteSong?.path && hostIpPortRef.current) {
      const streamUrl = `http://${hostIpPortRef.current}/stream?path=${encodeURIComponent(remoteSong.path)}`;

      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
      }

      if (remoteAudioRef.current.src !== streamUrl) {
        remoteAudioRef.current.src = streamUrl;
        remoteAudioRef.current.load();
      }
    } else if (
      !isHost &&
      isActive &&
      !remoteSong?.path &&
      remoteAudioRef.current
    ) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.src = "";
    }
  }, [remoteSong?.path, isHost, isActive]);

  // Joiner play/pause logic
  useEffect(() => {
    if (!isHost && isActive && remoteAudioRef.current && remoteSong?.path) {
      if (remoteIsPlaying) {
        remoteAudioRef.current
          .play()
          .catch((e) => console.warn("Local play blocked", e));
      } else {
        remoteAudioRef.current.pause();
      }
    }
  }, [remoteIsPlaying, isHost, isActive, remoteSong?.path]);

  // Joiner progress sync / drift correction logic
  useEffect(() => {
    if (!isHost && isActive && remoteAudioRef.current && remoteIsPlaying) {
      const diff = Math.abs(
        remoteAudioRef.current.currentTime - remoteProgress,
      );
      // If client time drifts more than 1.5 seconds from host, adjust client currentTime
      if (diff > 1.5) {
        remoteAudioRef.current.currentTime = remoteProgress;
      }
    }
  }, [remoteProgress, isHost, isActive, remoteIsPlaying]);

  // Joiner volume sync
  useEffect(() => {
    if (!isHost && isActive && remoteAudioRef.current) {
      remoteAudioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, isHost, isActive]);

  return (
    <JamContext.Provider
      value={{
        roomCode,
        isHost,
        participants,
        isActive,
        status,
        subStatus,
        error,
        createJam,
        joinJam,
        leaveJam: cleanup,
        broadcastCommand,
        remoteSong,
        remoteIsPlaying,
        remoteProgress,
        remoteDuration,
        remoteQueue,
        latency,
        localDeviceName,
        participantNames,
      }}
    >
      {children}
    </JamContext.Provider>
  );
};

export const useJam = () => {
  const context = useContext(JamContext);
  if (!context) throw new Error("useJam must be used within JamProvider");
  return context;
};
