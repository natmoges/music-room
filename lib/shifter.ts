/*
  Key shift without changing speed. Two read heads sweep a short delay line at the new pitch
  and crossfade, so the beat moves up or down in key while the tempo stays put. Fine for
  trying a few semitones on a beat; it is a preview tool, not mastering. Runs in an
  AudioWorklet, loaded from a string so it ships inside the page.
*/
const CODE = `
class Shifter extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: "ratio", defaultValue: 1, minValue: 0.5, maxValue: 2 }]; }
  constructor() {
    super();
    this.N = 16384; this.W = 2400;
    this.buf = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.phase = 0;
  }
  read(b, d) {
    let p = this.w - d; while (p < 0) p += this.N;
    const i = Math.floor(p), f = p - i, j = (i + 1) % this.N;
    return b[i] * (1 - f) + b[j] * f;
  }
  process(inputs, outputs, params) {
    const inp = inputs[0], out = outputs[0];
    if (!inp || !inp.length) return true;
    const ratio = params.ratio[0];
    const n = inp[0].length;
    if (Math.abs(ratio - 1) < 1e-4) {
      for (let c = 0; c < out.length; c++) out[c].set(inp[c] || inp[0]);
      for (let i = 0; i < n; i++) { for (let c = 0; c < 2; c++) this.buf[c][this.w] = (inp[c] || inp[0])[i]; this.w = (this.w + 1) % this.N; }
      return true;
    }
    const step = (1 - ratio) / this.W;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 2; c++) this.buf[c][this.w] = (inp[c] || inp[0])[i];
      this.phase += step; if (this.phase >= 1) this.phase -= 1; if (this.phase < 0) this.phase += 1;
      const p2 = (this.phase + 0.5) % 1;
      const g1 = Math.sin(Math.PI * this.phase) ** 2, g2 = Math.sin(Math.PI * p2) ** 2;
      const d1 = 64 + this.phase * this.W, d2 = 64 + p2 * this.W;
      for (let c = 0; c < out.length; c++) out[c][i] = this.read(this.buf[c], d1) * g1 + this.read(this.buf[c], d2) * g2;
      this.w = (this.w + 1) % this.N;
    }
    return true;
  }
}
registerProcessor("nfp-shifter", Shifter);
`;

export async function makeShifter(ctx: AudioContext): Promise<AudioWorkletNode | null> {
  if (!ctx.audioWorklet) return null;
  const url = URL.createObjectURL(new Blob([CODE], { type: "application/javascript" }));
  try {
    await ctx.audioWorklet.addModule(url);
    return new AudioWorkletNode(ctx, "nfp-shifter", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
