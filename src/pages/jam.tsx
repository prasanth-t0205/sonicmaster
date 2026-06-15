import React, { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wifi01Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  SmartPhone01Icon,
  Home01Icon,
  SignalIcon,
  ActivityIcon,
  SentIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { useJam } from "@/context/jam-context";
import { useAudio } from "@/context/audio-context";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { TrackArt } from "@/components/common/track-art";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formatTime = (time: number) => {
  if (isNaN(time) || time <= 0) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function JamPage() {
  const {
    roomCode,
    isHost,
    participants,
    isActive,
    status,
    subStatus,
    createJam,
    joinJam,
    leaveJam,
    error,
    localDeviceName,
    participantNames,
    latency,
    remoteQueue,
    remoteSong,
    remoteIsPlaying,
    remoteProgress,
    remoteDuration,
    broadcastCommand,
  } = useJam();

  const { currentSong, isPlaying, elementRefsObj } = useAudio();
  const { progress, duration } = useAudioProgress(elementRefsObj);

  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  // Tactile state controls for managing network latency and buffers
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);
  const [jitterMode, setJitterMode] = useState<"fast" | "safe">("fast");
  const [syncingClients, setSyncingClients] = useState<Record<string, boolean>>(
    {},
  );
  const [kickedDevices, setKickedDevices] = useState<Set<string>>(new Set());

  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calibrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calibrationSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resyncTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      if (calibrationTimeoutRef.current)
        clearTimeout(calibrationTimeoutRef.current);
      if (calibrationSuccessTimeoutRef.current)
        clearTimeout(calibrationSuccessTimeoutRef.current);
      resyncTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCalibrate = () => {
    setIsCalibrating(true);
    setCalibrationSuccess(false);
    if (calibrationTimeoutRef.current)
      clearTimeout(calibrationTimeoutRef.current);
    calibrationTimeoutRef.current = setTimeout(() => {
      setIsCalibrating(false);
      setCalibrationSuccess(true);
      if (calibrationSuccessTimeoutRef.current)
        clearTimeout(calibrationSuccessTimeoutRef.current);
      calibrationSuccessTimeoutRef.current = setTimeout(
        () => setCalibrationSuccess(false),
        3000,
      );
    }, 1500);
  };

  const handleResyncClient = (name: string) => {
    setSyncingClients((prev) => ({ ...prev, [name]: true }));
    const existingTimeout = resyncTimeoutsRef.current.get(name);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeoutId = setTimeout(() => {
      setSyncingClients((prev) => ({ ...prev, [name]: false }));
      resyncTimeoutsRef.current.delete(name);
    }, 1200);
    resyncTimeoutsRef.current.set(name, timeoutId);
  };

  const handleKickDevice = (deviceName: string) => {
    setKickedDevices((prev) => {
      const next = new Set(prev);
      next.add(deviceName);
      return next;
    });
    broadcastCommand("KICK_DEVICE", { deviceName });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      joinJam(joinCode.trim());
      setIsJoinDialogOpen(false);
    }
  };

  const isIdle = status === "idle";
  const isBusy = status === "busy";

  // Realtime playback variables based on whether device is broadcasting or joining
  const activeTrack = isHost ? currentSong : remoteSong;
  const activeIsPlaying = isHost ? isPlaying : remoteIsPlaying;
  const activeProgress = isHost ? progress : remoteProgress;
  const activeDuration = isHost ? duration : remoteDuration;

  const visibleParticipants = participantNames.filter(
    (name) => !kickedDevices.has(name),
  );
  const activeParticipantsCount = isHost
    ? visibleParticipants.length
    : Math.max(0, participants - kickedDevices.size);

  return (
    <div className="h-full flex flex-col bg-background select-none text-foreground font-sans">
      <ScrollArea className="flex-1">
        {/* Header matched to library page pattern */}
        <header className="flex items-center justify-between px-10 pt-8 pb-4 shrink-0">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Music Jam
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Sync playback across local devices effortlessly.
            </p>

            {isActive && roomCode && (
              <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                <span className="text-muted-foreground">
                  {isHost ? "Broadcasting At" : "Connected To"}
                </span>
                <span className="font-mono text-primary select-all">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy Address"
                >
                  <HugeiconsIcon
                    icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                    size={16}
                    className={copied ? "text-emerald-500" : ""}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isIdle && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsJoinDialogOpen(true)}
                >
                  Join Session
                </Button>
                <Button onClick={createJam}>
                  <HugeiconsIcon icon={Home01Icon} size={16} />
                  <span>Start Session</span>
                </Button>
              </>
            )}

            {isActive && (
              <Button variant="destructive" onClick={leaveJam}>
                <HugeiconsIcon icon={SignalIcon} size={16} />
                <span>{isHost ? "Stop Broadcast" : "Disconnect"}</span>
              </Button>
            )}
          </div>
        </header>

        <div className="px-10 pb-32">
          {/* Error Message - Clean inline banner */}
          {error && (
            <div className="mb-8 px-6 py-4 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                <p className="text-sm font-semibold">{error}</p>
              </div>
              <button
                onClick={leaveJam}
                className="text-xs font-bold uppercase hover:text-rose-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* BUSY SETUP LOADING SCREEN */}
          {isBusy && (
            <div className="flex flex-col items-center justify-center text-center space-y-6 min-h-[400px] animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-foreground/10 border-t-foreground rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">
                  {subStatus || "Calibrating playback clock..."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Establishing handshake alignment and configuring audio
                  buffers.
                </p>
              </div>
              <button
                onClick={leaveJam}
                className="mt-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* IDLE SCREEN (How it works full width) */}
          {isIdle && (
            <div className="mt-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-10">
              <div className="text-center space-y-3 mb-16">
                <h3 className="text-2xl font-bold">How it works</h3>
                <p className="text-base text-muted-foreground">
                  Sync your music effortlessly on the local network.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {[
                  {
                    icon: Wifi01Icon,
                    title: "Shared Network",
                    desc: "Ensure all devices are connected to the exact same Wi-Fi router or LAN network connection.",
                  },
                  {
                    icon: Home01Icon,
                    title: "Get the Code",
                    desc: "The host clicks 'Start Session' and shares the resulting Room Code IP with everyone.",
                  },
                  {
                    icon: SentIcon,
                    title: "Tune In",
                    desc: "Click 'Join Session' in the header, enter the code, and instantly sync your audio.",
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center space-y-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center text-primary">
                      <HugeiconsIcon icon={step.icon} size={24} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-bold">{step.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-[250px]">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE STATE WORKSPACE */}
          {isActive && (
            <div className="space-y-16 mt-6 animate-in fade-in duration-500">
              {/* Playback & Queue Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Now Playing Monitor */}
                <div className="space-y-8">
                  <h2 className="text-lg font-bold">Now Playing</h2>

                  {activeTrack ? (
                    <div className="flex items-center gap-6">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl shadow-black/10 relative shrink-0">
                        <TrackArt
                          path={activeTrack.path || ""}
                          hasArt={activeTrack.hasArt || false}
                          coverArt={activeTrack.coverArt}
                          className="w-full h-full object-cover"
                          size={128}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-2xl font-black truncate mb-1">
                          {activeTrack.title || "Unknown Title"}
                        </h4>
                        <p className="text-lg text-muted-foreground truncate font-medium">
                          {activeTrack.artist || "Unknown Artist"}
                        </p>

                        <div className="mt-6">
                          <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-foreground rounded-full transition-all duration-300 ease-out"
                              style={{
                                width: `${activeDuration > 0 ? (activeProgress / activeDuration) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono font-semibold text-muted-foreground mt-3">
                            <span>{formatTime(activeProgress)}</span>
                            <span>{formatTime(activeDuration)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground font-medium">
                        Waiting for host to play a track...
                      </p>
                    </div>
                  )}
                </div>

                {/* Queue */}
                <div className="space-y-8">
                  <h2 className="text-lg font-bold">Queue</h2>

                  {remoteQueue.length > 0 ? (
                    <div className="space-y-4">
                      {remoteQueue.slice(0, 4).map((song, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <span className="text-sm font-bold text-muted-foreground/40 w-6 text-right">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                              {song.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {song.artist}
                            </p>
                          </div>
                          {i === 0 && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-foreground text-background">
                              Playing
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12">
                      <p className="text-muted-foreground font-medium">
                        No tracks in queue.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Devices & Calibration */}
              <div className="space-y-8 pt-8 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Devices</h2>
                  <span className="text-sm font-medium text-muted-foreground">
                    {activeParticipantsCount + 1} Synced
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Broadcaster Node */}
                  <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <HugeiconsIcon
                        icon={Home01Icon}
                        size={24}
                        className="text-primary"
                      />
                      <div>
                        <span className="text-sm font-bold block">
                          {isHost ? localDeviceName : "Broadcaster Host"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Host
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sync Clients */}
                  {visibleParticipants.map((name, i) => {
                    const isClientSyncing = syncingClients[name];
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <HugeiconsIcon
                            icon={SmartPhone01Icon}
                            size={24}
                            className="text-muted-foreground"
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-bold truncate block">
                              {name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {isClientSyncing ? "Syncing..." : "Synced"}
                            </span>
                          </div>
                        </div>

                        {isHost && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleResyncClient(name)}
                              disabled={isClientSyncing}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-background hover:bg-muted transition-colors"
                            >
                              Resync
                            </button>
                            <button
                              onClick={() => handleKickDevice(name)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              Kick
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!isHost && visibleParticipants.length === 0 && (
                    <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <HugeiconsIcon
                          icon={SmartPhone01Icon}
                          size={24}
                          className="text-muted-foreground"
                        />
                        <div>
                          <span className="text-sm font-bold block">
                            {localDeviceName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            You
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isHost && (
                  <div className="pt-6 flex flex-wrap gap-4">
                    <button
                      onClick={handleCalibrate}
                      disabled={isCalibrating}
                      className="px-6 py-3 rounded-xl text-sm font-bold bg-muted hover:bg-muted/80 transition-colors flex items-center gap-2"
                    >
                      <HugeiconsIcon icon={ActivityIcon} size={18} />
                      {isCalibrating
                        ? "Pinging Devices..."
                        : calibrationSuccess
                          ? "Re-aligned!"
                          : "Force Global Sync"}
                    </button>

                    <div className="flex bg-muted/50 rounded-xl p-1.5 items-center gap-1">
                      <button
                        onClick={() => setJitterMode("fast")}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                          jitterMode === "fast"
                            ? "bg-background shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Low Latency
                      </button>
                      <button
                        onClick={() => setJitterMode("safe")}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                          jitterMode === "safe"
                            ? "bg-background shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Stable
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Join Jam Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent>
          <form onSubmit={handleJoinSubmit}>
            <DialogHeader>
              <DialogTitle>Join Session</DialogTitle>
              <DialogDescription>
                Tune in to an active session by entering the room code.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-6">
              <Field>
                <FieldLabel htmlFor="room-code">Room Code / IP</FieldLabel>
                <Input
                  id="room-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g., 192.168.1.100:19000"
                  autoFocus
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsJoinDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!joinCode.trim()}>
                Connect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
