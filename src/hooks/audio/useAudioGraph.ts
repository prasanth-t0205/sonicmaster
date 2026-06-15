"use client";

import { useCallback, useRef } from "react";
import { type AudioElementRefs, type AudioGraphRefs } from "./audioRefs";
import { useSettings } from "@/context/settings-context";

export const EQ_FREQUENCIES = [
  60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000,
];

// ---------------------------------------------------------------------------
// Calibration helper (also exported so useAudioEffects can reuse it)
// ---------------------------------------------------------------------------
export function applyCalibrationProfile(
  nodes: BiquadFilterNode[],
  profile: string,
  ctx: AudioContext,
) {
  if (!nodes || nodes.length !== 3) return;
  const [low, mid, high] = nodes;
  const now = ctx.currentTime;

  let gLow = 0,
    gMid = 0,
    gHigh = 0;

  switch (profile) {
    case "acoustics":
      gLow = -8;
      gMid = 2;
      gHigh = 4;
      break;
    case "bass_heavy":
      gLow = 6;
      gMid = -1;
      gHigh = 2;
      break;
    case "vocal":
      gLow = -4;
      gMid = 5;
      gHigh = -2;
      break;
    case "standard":
    default:
      gLow = 0;
      gMid = 0;
      gHigh = 0;
      break;
  }

  if (now === 0) {
    low.gain.value = gLow;
    mid.gain.value = gMid;
    high.gain.value = gHigh;
  } else {
    const RAMP = 0.2;
    low.gain.setTargetAtTime(gLow, now, RAMP);
    mid.gain.setTargetAtTime(gMid, now, RAMP);
    high.gain.setTargetAtTime(gHigh, now, RAMP);
  }
}

// ---------------------------------------------------------------------------
// Impulse-response generator for the convolver reverb
// ---------------------------------------------------------------------------
function generateImpulseResponse(
  ctx: AudioContext,
  duration: number,
  decay: number,
) {
  const len = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAudioGraph(
  elementRefs: React.RefObject<AudioElementRefs>,
  graphRefs: React.RefObject<AudioGraphRefs>,
  volume: number,
  isMuted: boolean,
) {
  const { settings } = useSettings();
  // Keep a stable ref to settings so the callback doesn't go stale
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const ensureAudioCtx = useCallback((): AudioContext => {
    if (graphRefs.current.ctx) return graphRefs.current.ctx;

    const g = graphRefs.current;
    const e = elementRefs.current;
    const s = settingsRef.current;

    // ── Create context ──────────────────────────────────────────────────────
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(
      {
        latencyHint: s.lowLatencyMode ? "interactive" : "playback",
      },
    );
    g.ctx = ctx;

    // ── Sources ─────────────────────────────────────────────────────────────
    const source1 = ctx.createMediaElementSource(e.audio1!);
    const source2 = ctx.createMediaElementSource(e.audio2!);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    g.gain1 = gain1;
    g.gain2 = gain2;

    // ── EQ bands ────────────────────────────────────────────────────────────
    const { enabled: eqEnabled, bands: savedBands } = s.equalizerConfig || {};
    const eqBands = EQ_FREQUENCIES.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1;
      f.gain.value = eqEnabled && savedBands?.[i] != null ? savedBands[i] : 0;
      return f;
    });
    g.eqBands = eqBands;

    // ── Calibration nodes ───────────────────────────────────────────────────
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 100;

    const midPeaking = ctx.createBiquadFilter();
    midPeaking.type = "peaking";
    midPeaking.frequency.value = 1000;
    midPeaking.Q.value = 1;

    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 10000;

    g.correctionNodes = [lowShelf, midPeaking, highShelf];
    applyCalibrationProfile(
      g.correctionNodes,
      s.audioProfile || "standard",
      ctx,
    );

    // ── Dynamics compressor ─────────────────────────────────────────────────
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
    compressor.knee.setValueAtTime(30, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);
    g.compressor = compressor;

    // ── Enhancement nodes ───────────────────────────────────────────────────
    const bassBoost = ctx.createBiquadFilter();
    bassBoost.type = "lowshelf";
    bassBoost.frequency.value = 60;
    bassBoost.gain.value = s.bassBoostEnabled ? s.bassBoostLevel / 5 : 0;
    g.bassBoost = bassBoost;

    const reverb = ctx.createConvolver();
    reverb.buffer = generateImpulseResponse(ctx, 2.5, 2.0);
    g.reverb = reverb;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = s.reverbEnabled ? s.reverbMix : 0;
    g.reverbGain = reverbGain;

    const vocalIso = ctx.createGain();
    vocalIso.gain.value = 1.0;
    g.vocalIso = vocalIso;

    // ── L/R hearing channel control ─────────────────────────────────────────
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const gainL = ctx.createGain();
    const gainR = ctx.createGain();
    gainL.gain.value = s.hearingLeftEnabled ? 1 : 0;
    gainR.gain.value = s.hearingRightEnabled ? 1 : 0;
    g.leftHearingGain = gainL;
    g.rightHearingGain = gainR;

    // ── Spatial 3D ──────────────────────────────────────────────────────────
    const spatial3D = ctx.createPanner();
    spatial3D.panningModel = "HRTF";
    spatial3D.distanceModel = "inverse";
    spatial3D.positionX.value = 0;
    spatial3D.positionY.value = 0;
    spatial3D.positionZ.value = s.spatialAudioEnabled ? -1 : 0;
    g.spatial3D = spatial3D;

    // ── ReplayGain & master gain ────────────────────────────────────────────
    const replayGain = ctx.createGain();
    replayGain.gain.value = 1.0;
    g.replayGain = replayGain;

    const masterGain = ctx.createGain();
    masterGain.gain.value = isMuted ? 0 : volume;
    g.masterGain = masterGain;

    // ── Stream destination (for broadcasting) ───────────────────────────────
    if (!g.streamDest) g.streamDest = ctx.createMediaStreamDestination();
    compressor.connect(g.streamDest);

    // ── Stereo panner ───────────────────────────────────────────────────────
    const panner = ctx.createStereoPanner();
    panner.pan.value = s.stereoPan || 0;
    g.panner = panner;

    // ── Analyser ────────────────────────────────────────────────────────────
    const analyser = ctx.createAnalyser();
    analyser.fftSize = s.audioQuality === "high" ? 1024 : 512;
    g.analyser = analyser;

    // ── Wire sources → pre-mixer gains ──────────────────────────────────────
    source1.connect(gain1);
    source2.connect(gain2);

    // ── EQ chain ────────────────────────────────────────────────────────────
    if (s.bitPerfect) {
      gain1.connect(compressor);
      gain2.connect(compressor);
    } else if (eqBands.length > 0) {
      gain1.connect(eqBands[0]);
      gain2.connect(eqBands[0]);
      for (let i = 0; i < eqBands.length - 1; i++)
        eqBands[i].connect(eqBands[i + 1]);
      eqBands[eqBands.length - 1].connect(lowShelf);
    } else {
      gain1.connect(lowShelf);
      gain2.connect(lowShelf);
    }

    // ── Calibration → bass boost → compressor ───────────────────────────────
    lowShelf.connect(midPeaking);
    midPeaking.connect(highShelf);
    highShelf.connect(bassBoost);
    bassBoost.connect(compressor);

    // ── Compressor → ReplayGain → Master ────────────────────────────────────
    compressor.connect(replayGain);
    replayGain.connect(masterGain);

    // ── Parallel reverb branch ───────────────────────────────────────────────
    masterGain.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(spatial3D);

    // ── Main branch: master → L/R splitter → merger → spatial → panner ─────
    masterGain.connect(splitter);
    splitter.connect(gainL, 0);
    splitter.connect(gainR, 1);
    gainL.connect(merger, 0, 0);
    gainR.connect(merger, 0, 1);
    merger.connect(spatial3D);

    // ── Spatial → panner → analyser → output ────────────────────────────────
    spatial3D.connect(panner);
    panner.connect(analyser);
    analyser.connect(ctx.destination);

    return ctx;
  }, [elementRefs, graphRefs, volume, isMuted]);

  return { ensureAudioCtx };
}
