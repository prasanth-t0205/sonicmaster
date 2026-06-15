/**
 * audioRefs.ts
 *
 * Shared mutable ref bags passed between hooks.
 * Using plain objects (not React refs) so hooks can share the same
 * underlying reference without re-render coupling.
 */

import Hls from "hls.js";

export interface AudioElementRefs {
  audio1: HTMLAudioElement | null;
  audio2: HTMLAudioElement | null;
  activeKey: "audio1" | "audio2";
  isTransitioning: boolean;
  hls: Hls | null;
}

export interface AudioGraphRefs {
  ctx: AudioContext | null;
  gain1: GainNode | null;
  gain2: GainNode | null;
  compressor: DynamicsCompressorNode | null;
  replayGain: GainNode | null;
  masterGain: GainNode | null;
  streamDest: MediaStreamAudioDestinationNode | null;
  eqBands: BiquadFilterNode[];
  correctionNodes: BiquadFilterNode[];
  panner: StereoPannerNode | null;
  bassBoost: BiquadFilterNode | null;
  reverb: ConvolverNode | null;
  reverbGain: GainNode | null;
  vocalIso: GainNode | null;
  leftHearingGain: GainNode | null;
  rightHearingGain: GainNode | null;
  spatial3D: PannerNode | null;
  analyser: AnalyserNode | null;
}

export function makeAudioElementRefs(): AudioElementRefs {
  return {
    audio1: null,
    audio2: null,
    activeKey: "audio1",
    isTransitioning: false,
    hls: null,
  };
}

export function makeAudioGraphRefs(): AudioGraphRefs {
  return {
    ctx: null,
    gain1: null,
    gain2: null,
    compressor: null,
    replayGain: null,
    masterGain: null,
    streamDest: null,
    eqBands: [],
    correctionNodes: [],
    panner: null,
    bassBoost: null,
    reverb: null,
    reverbGain: null,
    vocalIso: null,
    leftHearingGain: null,
    rightHearingGain: null,
    spatial3D: null,
    analyser: null,
  };
}
