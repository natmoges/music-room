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
    this.rate = 0; this.target = 0; this.coef = 0.004; this.tick = 0; this.brake = 0; this.bt = 0; this.r0 = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === "load") { this.ch = m.channels; this.len = m.channels[0].length; this.ratio = m.sampleRate / sampleRate; }
      else if (m.type === "start") { this.pos = m.seconds * sampleRate * this.ratio; this.rate = m.rate || 0; this.target = this.rate; this.on = true; }
      // ease = seconds to get most of the way there: a light hand brakes over ~1s, a grab is ~10 ms.
      // The palm: pressure builds the longer it stays, so the record sags gently, then chokes.
      else if (m.type === "brake") { this.brake = m.seconds * sampleRate; this.bt = 0; this.r0 = this.rate; }
      else if (m.type === "rate") { this.brake = 0; this.target = m.rate; this.coef = 1 - Math.exp(-1 / (Math.max(0.002, m.ease || 0.06) * sampleRate)); }
      else if (m.type === "stop") { this.on = false; this.port.postMessage({ type: "stopped", seconds: this.pos / (sampleRate * this.ratio) }); }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!this.on || !this.ch) { for (const o of out) o.fill(0); return true; }
    const L = this.ch[0], R = this.ch[1] || this.ch[0], n = out[0].length;
    for (let i = 0; i < n; i++) {
      if (this.brake > 0) { this.bt++; const x = Math.min(1, this.bt / this.brake); this.rate = this.r0 * (1 - x * x); if (x >= 1) { this.brake = 0; this.target = 0; } }
      else this.rate += (this.target - this.rate) * this.coef; // the platter has weight: speed eases, it doesn't jump
      this.pos += this.rate * this.ratio;
      if (this.pos < 0) this.pos = 0;
      if (this.pos > this.len - 2) this.pos = this.len - 2;
      const j = Math.floor(this.pos), f = this.pos - j;
      const g = Math.min(1, Math.abs(this.rate) * 1.5); // quiet near standstill, like a slowing record
      out[0][i] = (L[j] * (1 - f) + L[j + 1] * f) * g;
      if (out[1]) out[1][i] = (R[j] * (1 - f) + R[j + 1] * f) * g;
    }
    if ((this.tick += n) >= 1024) { this.tick = 0; this.port.postMessage({ type: "pos", seconds: this.pos / (sampleRate * this.ratio), rate: this.rate }); }
    return true;
  }
}
registerProcessor("nfp-scratch", Scratch);
`;

export type ScratchEngine = {
  load: (url: string) => Promise<void>;
  start: (seconds: number, rate: number) => void;
  setRate: (rate: number, ease?: number) => void;
  brake: (seconds: number) => void;
  onPos: (cb: ((seconds: number, rate: number) => void) | null) => void;
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
  let posCb: ((s: number, r: number) => void) | null = null;
  node.port.onmessage = (e) => { if (e.data?.type === "pos") posCb?.(e.data.seconds, e.data.rate); };
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
    start: (seconds, rate) => node.port.postMessage({ type: "start", seconds, rate }),
    setRate: (rate, ease) => node.port.postMessage({ type: "rate", rate, ease }),
    onPos: (cb) => { posCb = cb; },
    brake: (seconds) => node.port.postMessage({ type: "brake", seconds }),
    stop: () => new Promise((resolve) => {
      const done = (e: MessageEvent) => { if (e.data?.type === "stopped") { node.port.removeEventListener("message", done); resolve(e.data.seconds); } };
      node.port.addEventListener("message", done);
      node.port.start();
      node.port.postMessage({ type: "stop" });
      setTimeout(() => resolve(-1), 300);
    }),
  };
}
