/**
 * 白噪音引擎：全部用 Web Audio 实时合成，不加载任何音频文件。
 * 好处：体积为零、无版权问题、弱网也能用。
 */
export type NoiseId = "rain" | "wind" | "fire" | "forest" | "indoor";

export const NOISES: { id: NoiseId; name: string; desc: string }[] = [
  { id: "rain", name: "雨夜", desc: "窗外有雨，屋里很静" },
  { id: "wind", name: "晚风", desc: "风吹过窗框的声音" },
  { id: "fire", name: "壁炉", desc: "木头在轻轻炸响" },
  { id: "forest", name: "林间雨声", desc: "雨落在树叶上" },
  { id: "indoor", name: "阴天室内", desc: "很低的、均匀的底色" },
];

function createNoiseBuffer(ctx: AudioContext, type: "white" | "pink" | "brown") {
  const seconds = 4;
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "white") {
      data[i] = white * 0.6;
    } else if (type === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      // pink (Paul Kellet)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.11;
    }
  }
  return buffer;
}

export class NoiseEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];
  current: NoiseId | null = null;
  private volume = 0.5;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15);
    }
  }

  private stopNodes() {
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    this.nodes.forEach((n) => {
      try {
        (n as AudioNode & { stop?: () => void }).stop?.();
        n.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.nodes = [];
  }

  stop() {
    this.stopNodes();
    this.current = null;
  }

  play(id: NoiseId) {
    const ctx = this.ensureCtx();
    this.stopNodes();
    this.current = id;

    const master = this.master!;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(master);

    const loop = (buffer: AudioBuffer) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      return src;
    };

    const filter = (
      type: BiquadFilterType,
      freq: number,
      q = 0.7
    ): BiquadFilterNode => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };

    if (id === "rain") {
      const src = loop(createNoiseBuffer(ctx, "white"));
      const hp = filter("highpass", 600);
      const lp = filter("lowpass", 7000);
      const g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(hp).connect(lp).connect(g).connect(out);
      src.start();
      this.nodes.push(src, hp, lp, g);
    }

    if (id === "wind") {
      const src = loop(createNoiseBuffer(ctx, "brown"));
      const lp = filter("lowpass", 420, 1.2);
      const g = ctx.createGain();
      g.gain.value = 0.85;
      src.connect(lp).connect(g).connect(out);
      src.start();
      // 缓慢起伏
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.06;
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain).connect(lp.frequency);
      lfo.start();
      this.nodes.push(src, lp, g, lfo, lfoGain);
    }

    if (id === "fire") {
      const src = loop(createNoiseBuffer(ctx, "brown"));
      const lp = filter("lowpass", 900, 0.8);
      const g = ctx.createGain();
      g.gain.value = 0.72;
      src.connect(lp).connect(g).connect(out);
      src.start();
      this.nodes.push(src, lp, g);

      // 随机木柴爆裂声
      const crackle = () => {
        if (!this.ctx || this.current !== "fire") return;
        const c = this.ctx;
        const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
        }
        const s = c.createBufferSource();
        s.buffer = b;
        const bp = c.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1400 + Math.random() * 2600;
        bp.Q.value = 1.4;
        const cg = c.createGain();
        cg.gain.value = 0.12 + Math.random() * 0.22;
        s.connect(bp).connect(cg).connect(out);
        s.start();
        s.onended = () => {
          s.disconnect();
          bp.disconnect();
          cg.disconnect();
        };
      };
      this.timers.push(
        window.setInterval(() => {
          crackle();
          if (Math.random() > 0.6) setTimeout(crackle, 90 + Math.random() * 160);
        }, 520)
      );
    }

    if (id === "forest") {
      const src = loop(createNoiseBuffer(ctx, "pink"));
      const bp = filter("bandpass", 2600, 0.6);
      const lp = filter("lowpass", 6000);
      const g = ctx.createGain();
      g.gain.value = 0.7;
      src.connect(bp).connect(lp).connect(g).connect(out);
      src.start();
      this.nodes.push(src, bp, lp, g);
      // 稀疏松针落地般的细响
      this.timers.push(
        window.setInterval(() => {
          if (!this.ctx || this.current !== "forest") return;
          const c = this.ctx;
          const o = c.createOscillator();
          const og = c.createGain();
          o.type = "sine";
          o.frequency.value = 900 + Math.random() * 1500;
          og.gain.value = 0.0;
          const now = c.currentTime;
          og.gain.linearRampToValueAtTime(0.03, now + 0.01);
          og.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          o.connect(og).connect(out);
          o.start(now);
          o.stop(now + 0.4);
          o.onended = () => {
            o.disconnect();
            og.disconnect();
          };
        }, 1700)
      );
    }

    if (id === "indoor") {
      const src = loop(createNoiseBuffer(ctx, "pink"));
      const lp = filter("lowpass", 700, 0.5);
      const g = ctx.createGain();
      g.gain.value = 0.55;
      src.connect(lp).connect(g).connect(out);
      src.start();
      // 极低的房间底噪
      const hum = ctx.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 72;
      const hg = ctx.createGain();
      hg.gain.value = 0.012;
      hum.connect(hg).connect(out);
      hum.start();
      this.nodes.push(src, lp, g, hum, hg);
    }

    master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.3);
  }
}

let engine: NoiseEngine | null = null;
export function getNoiseEngine(): NoiseEngine {
  if (!engine) engine = new NoiseEngine();
  return engine;
}
