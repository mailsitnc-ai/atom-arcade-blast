let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}
export function beep(freq = 440, dur = 0.08, type: OscillatorType = "square", vol = 0.08) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g).connect(a.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.stop(a.currentTime + dur);
}
export function sfx(name: "shoot"|"hit"|"atom"|"die"|"boss"|"win"|"combo"|"unlimited") {
  switch (name) {
    case "shoot": return beep(880, 0.05, "square", 0.04);
    case "hit": return beep(220, 0.08, "sawtooth", 0.06);
    case "atom": beep(660, 0.06); setTimeout(()=>beep(990,0.08),60); return;
    case "die": beep(180,0.2,"sawtooth",0.1); setTimeout(()=>beep(90,0.3,"sawtooth",0.1),120); return;
    case "boss": beep(110,0.3,"sawtooth",0.1); setTimeout(()=>beep(80,0.4,"sawtooth",0.1),200); return;
    case "win": [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.12,"square",0.07), i*100)); return;
    case "combo": beep(1320,0.05,"triangle",0.05); return;
    case "unlimited": [523,784,1046,1568].forEach((f,i)=>setTimeout(()=>beep(f,0.1,"triangle",0.07), i*70)); return;
  }
}
