"use client";

import { useEffect } from "react";
import { type AudioGraphRefs } from "./audioRefs";
import { useSettings } from "@/context/settings-context";
import { applyCalibrationProfile } from "./useAudioGraph";

export function useAudioEffects(
  graphRefs: React.RefObject<AudioGraphRefs>,
  volume: number,
  isMuted: boolean,
) {
  const { settings } = useSettings();
  const g = graphRefs.current; // stable object reference, inner props mutate

  // ── Volume & mute ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = graphRefs.current.ctx;
    const masterGain = graphRefs.current.masterGain;
    if (!masterGain || !ctx) return;

    const target = isMuted ? 0 : volume;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(target, ctx.currentTime);
  }, [volume, isMuted, graphRefs]);

  // ── Equalizer bands ───────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = graphRefs.current.ctx;
    const bands = graphRefs.current.eqBands;
    if (!ctx || !bands.length) return;

    const { enabled, bands: savedBands } = settings.equalizerConfig || {};
    bands.forEach((f, i) => {
      const gain = enabled && savedBands?.[i] != null ? savedBands[i] : 0;
      f.gain.setTargetAtTime(gain, ctx.currentTime, 0.1);
    });
  }, [settings.equalizerConfig, graphRefs]);

  // ── Audio profile / calibration ───────────────────────────────────────────
  useEffect(() => {
    const ctx = graphRefs.current.ctx;
    const nodes = graphRefs.current.correctionNodes;
    if (!ctx || !nodes.length) return;
    applyCalibrationProfile(nodes, settings.audioProfile || "standard", ctx);
  }, [settings.audioProfile, graphRefs]);

  // ── Bit-perfect bypass (reconnects gain nodes around EQ) ─────────────────
  useEffect(() => {
    const { ctx, gain1, gain2, compressor, eqBands, correctionNodes } =
      graphRefs.current;
    if (!ctx || !gain1 || !gain2 || !compressor) return;

    gain1.disconnect();
    gain2.disconnect();

    if (settings.bitPerfect) {
      gain1.connect(compressor);
      gain2.connect(compressor);
    } else {
      const firstNode = eqBands[0] ?? correctionNodes[0] ?? compressor;
      gain1.connect(firstNode);
      gain2.connect(firstNode);
    }
  }, [settings.bitPerfect, graphRefs]);

  // ── Volume normalisation (compressor threshold) ────────────────────────────
  useEffect(() => {
    const { ctx, compressor } = graphRefs.current;
    if (!ctx || !compressor) return;
    const now = ctx.currentTime;
    if (settings.volumeNormalization) {
      compressor.threshold.setTargetAtTime(-24, now, 0.2);
      compressor.knee.setTargetAtTime(30, now, 0.2);
    } else {
      compressor.threshold.setTargetAtTime(-0.1, now, 0.2);
      compressor.knee.setTargetAtTime(0, now, 0.2);
    }
  }, [settings.volumeNormalization, graphRefs]);

  // ── Bass boost ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { ctx, bassBoost } = graphRefs.current;
    if (!ctx || !bassBoost) return;
    const target = settings.bassBoostEnabled ? settings.bassBoostLevel / 5 : 0;
    bassBoost.gain.setTargetAtTime(target, ctx.currentTime, 0.2);
  }, [settings.bassBoostEnabled, settings.bassBoostLevel, graphRefs]);

  // ── Reverb ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { ctx, reverbGain } = graphRefs.current;
    if (!ctx || !reverbGain) return;
    const target = settings.reverbEnabled ? settings.reverbMix : 0;
    reverbGain.gain.setTargetAtTime(target, ctx.currentTime, 0.2);
  }, [settings.reverbEnabled, settings.reverbMix, graphRefs]);

  // ── Spatial audio (3D panner depth) ──────────────────────────────────────
  useEffect(() => {
    const { ctx, spatial3D } = graphRefs.current;
    if (!ctx || !spatial3D) return;
    spatial3D.positionZ.setTargetAtTime(
      settings.spatialAudioEnabled ? -2 : 0,
      ctx.currentTime,
      0.5,
    );
  }, [settings.spatialAudioEnabled, graphRefs]);

  // ── Stereo pan ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { ctx, panner } = graphRefs.current;
    if (!ctx || !panner) return;
    panner.pan.setTargetAtTime(settings.stereoPan, ctx.currentTime, 0.1);
  }, [settings.stereoPan, graphRefs]);

  // ── Mono audio ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { masterGain } = graphRefs.current;
    if (!masterGain) return;
    masterGain.channelCountMode = settings.monoAudio
      ? "clamped-max"
      : "explicit";
    masterGain.channelCount = settings.monoAudio ? 1 : 2;
  }, [settings.monoAudio, graphRefs]);

  // ── L/R hearing channel gains ─────────────────────────────────────────────
  useEffect(() => {
    const { ctx, leftHearingGain, rightHearingGain } = graphRefs.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    const apply = (node: GainNode | null, enabled: boolean) => {
      if (!node) return;
      // Vocal isolation bypasses per-ear muting
      const target = settings.vocalIsolationEnabled ? 1.0 : enabled ? 1.0 : 0.0;
      node.gain.setTargetAtTime(target, now, 0.1);
    };

    apply(leftHearingGain, settings.hearingLeftEnabled);
    apply(rightHearingGain, settings.hearingRightEnabled);
  }, [
    settings.hearingLeftEnabled,
    settings.hearingRightEnabled,
    settings.vocalIsolationEnabled,
    graphRefs,
  ]);

  // ── Playback speed ────────────────────────────────────────────────────────
  // (Audio elements are not in graphRefs but this fits thematically here;
  //  the elements live in elementRefs which we receive indirectly via the
  //  AudioProvider, so we expose a plain effect that reads from the DOM.)
  // Handled in useAudioPlayback instead, since it needs elementRefs.
}
