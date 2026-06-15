/**
 * Simple BPM Detection using Peak Analysis
 * This runs in the browser/renderer process using Web Audio API.
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<number> {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // 1. Analyze peaks (Simple amplitude-based approach)
  // We look for raw energy peaks rather than using complex frequency-domain filtering.

  // Find maximum amplitude for adaptive threshold
  let maxAmplitude = 0;
  for (let i = 0; i < data.length; i += 1000) {
    maxAmplitude = Math.max(maxAmplitude, Math.abs(data[i]));
  }

  const peaks: number[] = [];
  const threshold = maxAmplitude * 0.8; // 80% of max amplitude

  // Basic peak detection
  for (let i = 0; i < data.length; i += 100) {
    // Step to save time
    if (Math.abs(data[i]) > threshold) {
      peaks.push(i);
      i += sampleRate / 4; // Skip 0.25s (max 240 BPM)
    }
  }

  if (peaks.length < 2) return 0;

  // 2. Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i] - peaks[i - 1];
    intervals.push(interval);
  }

  // 3. Convert intervals to BPM and find the mode
  const bpms = intervals.map((int) => (60 * sampleRate) / int);

  // Filter reasonable BPM range (40 - 220)
  const filteredBPMs = bpms.filter((b) => b > 40 && b < 220);

  if (filteredBPMs.length === 0) return 0;

  // Average BPM
  const averageBPM =
    filteredBPMs.reduce((a, b) => a + b, 0) / filteredBPMs.length;

  return Math.round(averageBPM);
}
