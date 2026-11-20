/*
  The scratch engine. The preview is decoded into memory once, and a small processor plays it
  from wherever the needle was, at whatever speed the hand moves the record: forward,
  backward, fast, slow, or not at all when the hand holds still. That is what makes it sound
  like a record under a hand instead of a player skipping. On release it reports where the
  needle ended up, and the normal player carries on from there.
*/
const CODE = `
class Scratch extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ch = null; this.len = 0; this.ratio = 1; this.pos = 0; this.on = false;
    this.rate = 0; this.target = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === "load") { this.ch = m.channels; this.len = m.channels[0].length; this.ratio = m.sampleRate / sampleRate; }
      else if (m.type === "start") { this.pos = m.seconds * sampleRate * this.ratio; this.rate = 0; this.target = 0; this.on = true; }
      else if (m.type === "rate") { this.target = m.rate; }
      else if (m.type === "stop") { this.on = false; this.port.postMessage({ type: "stopped", seconds: this.pos / (sampleRate * this.ratio) }); }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!this.on || !this.ch) { for (const o of out) o.fill(0); return true; }
    const L = this.ch[0], R = this.ch[1] || this.ch[0], n = out[0].length;
    for (let i = 0; i < n; i++) {
      this.rate += (this.target - this.rate) * 0.004; // the platter has weight: speed eases, it doesn't jump
      this.pos += this.rate * this.ratio;
      if (this.pos < 0) this.pos = 0;
      if (this.pos > this.len - 2) this.pos = this.len - 2;
      const j = Math.floor(this.pos), f = this.pos - j;
      const g = Math.min(1, Math.abs(this.rate) * 1.5); // quiet near standstill, like a slowing record
      out[0][i] = (L[j] * (1 - f) + L[j + 1] * f) * g;
      if (out[1]) out[1][i] = (R[j] * (1 - f) + R[j + 1] * f) * g;
    }
    return true;
  }
}
registerProcessor("nfp-scratch", Scratch);
`;

export type ScratchEngine = {
  load: (url: string) => Promise<void>;
  start: (seconds: number) => void;
  setRate: (rate: number) => void;
  stop: () => Promise<number>;
  ready: () => boolean;
};

export async function makeScratch(ctx: AudioContext, out: AudioNode): Promise<ScratchEngine | null> {
  if (!ctx.audioWorklet) return null;
  const url = URL.createObjectURL(new Blob([CODE], { type: "application/javascript" }));
  let node: AudioWorkletNode;
  try {
    await ctx.audioWorklet.addModule(url);
    node = new AudioWorkletNode(ctx, "nfp-scratch", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
  node.connect(out);
  let loaded = "";
  let loading: Promise<void> | null = null;
  return {
    ready: () => loaded !== "",
    load: (src) => {
      if (loaded === src) return Promise.resolve();
      loading = (async () => {
        const res = await fetch(src);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        const channels = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i).slice());
        node.port.postMessage({ type: "load", channels, sampleRate: buf.sampleRate }, channels.map((c) => c.buffer));
        loaded = src;
      })().catch(() => { loaded = ""; });
      return loading;
    },
    start: (seconds) => node.port.postMessage({ type: "start", seconds }),
    setRate: (rate) => node.port.postMessage({ type: "rate", rate }),
    stop: () => new Promise((resolve) => {
      const done = (e: MessageEvent) => { if (e.data?.type === "stopped") { node.port.removeEventListener("message", done); resolve(e.data.seconds); } };
      node.port.addEventListener("message", done);
      node.port.start();
      node.port.postMessage({ type: "stop" });
      setTimeout(() => resolve(-1), 300);
    }),
  };
}
