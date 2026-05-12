import { useEffect, useState } from "react";
import type { LevelDef } from "./levels";

export default function LearningScreen({
  level, mode, onContinue,
}: { level: LevelDef; mode: "intro" | "recap"; onContinue: () => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);
  const t = tick / 20;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 crt"
      style={{ background: "radial-gradient(circle at 50% 30%, #1a0a4a 0%, #07020f 70%)" }}>
      <div className="w-full max-w-3xl border-4 p-6 md:p-8" style={{ borderColor: "#0ff", boxShadow: "0 0 40px #0ff inset, 0 0 30px #f0f" }}>
        <div className="text-[10px] md:text-xs flicker" style={{ color: "#f0f" }}>
          {mode === "intro" ? `>> CHEMISTRY BRIEFING — LEVEL ${level.id}` : `>> RECAP — LEVEL ${level.id} COMPLETE`}
        </div>
        <h1 className="neon mt-3 text-2xl md:text-4xl" style={{ color: "#0ff" }}>{level.learning.headline}</h1>
        <p className="mt-2 text-xs md:text-sm" style={{ color: "#fff176" }}>{level.learning.tagline}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Diagram kind={level.learning.diagram} t={t} />
          <ul className="space-y-3 text-[11px] md:text-sm">
            {level.learning.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="inline-block w-3 h-3 mt-1 rounded-full" style={{ background: "#0ff", boxShadow: "0 0 10px #0ff" }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 border-2 p-3 text-[11px] md:text-sm" style={{ borderColor: "#fff176", color: "#fff176" }}>
          ★ ANALOGY: {level.learning.analogy}
        </div>

        <button onClick={onContinue}
          className="mt-6 w-full py-3 text-xs md:text-base border-2 hover:scale-[1.02] transition-transform"
          style={{ borderColor: "#39ff14", color: "#39ff14", background: "rgba(57,255,20,0.08)", boxShadow: "0 0 20px #39ff14" }}>
          {mode === "intro" ? `▶ START LEVEL ${level.id} — ${level.title.toUpperCase()}` : `▶ CONTINUE TO LEVEL ${level.id + 1}`}
        </button>
      </div>
    </div>
  );
}

function Diagram({ kind, t }: { kind: LevelDef["learning"]["diagram"]; t: number }) {
  const w = 280, h = 220;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56" style={{ filter: "drop-shadow(0 0 8px #0ff)" }}>
      <rect width={w} height={h} fill="#07020f" stroke="#0ff" strokeWidth="2" />
      {kind === "atom" && (
        <g>
          <circle cx={w/2} cy={h/2} r="14" fill="#ff3df0" />
          {[0,1,2].map(i => {
            const a = t + i * (Math.PI*2/3);
            const rx = 80 + i*15, ry = 30 + i*10;
            return <g key={i}>
              <ellipse cx={w/2} cy={h/2} rx={rx} ry={ry} fill="none" stroke="#0ff" strokeWidth="1" opacity="0.6" />
              <circle cx={w/2 + Math.cos(a)*rx} cy={h/2 + Math.sin(a)*ry} r="5" fill="#fff176" />
            </g>;
          })}
        </g>
      )}
      {kind === "bond" && (
        <g>
          {[60, 220].map((x, i) => <circle key={i} cx={x} cy={h/2} r="22" fill={i?"#fff176":"#7df9ff"} />)}
          <line x1="82" y1={h/2} x2="198" y2={h/2} stroke="#39ff14" strokeWidth={3 + Math.sin(t*4)*2} />
          <text x={w/2} y={h/2-30} textAnchor="middle" fill="#39ff14" fontSize="10">SHARED e⁻</text>
        </g>
      )}
      {kind === "ph" && (
        <g>
          {Array.from({length: 14}).map((_,i) => {
            const hue = 280 - (i/14)*280;
            return <rect key={i} x={10 + i*18} y={80} width="16" height="60" fill={`hsl(${hue},90%,55%)`} />;
          })}
          <text x="14" y="160" fill="#ff3df0" fontSize="10">ACID</text>
          <text x={w-50} y="160" fill="#7df9ff" fontSize="10">BASE</text>
          <circle cx={10 + ((Math.sin(t)+1)/2)*14*18} cy="70" r="6" fill="#fff" />
        </g>
      )}
      {kind === "reaction" && (
        <g>
          <circle cx="50" cy={h/2} r="18" fill="#7df9ff" />
          <circle cx="90" cy={h/2} r="18" fill="#fff176" />
          <text x="125" y={h/2+5} fill="#39ff14" fontSize="20">→</text>
          <circle cx="180" cy={h/2} r="22" fill="#ff3df0" opacity={0.6 + Math.sin(t*3)*0.4} />
          <circle cx="220" cy={h/2} r="10" fill="#fff" />
          <text x={w/2} y="40" textAnchor="middle" fill="#fff176" fontSize="10">REACTANTS → PRODUCTS</text>
        </g>
      )}
      {kind === "periodic" && (
        <g>
          {Array.from({length: 7}).map((_,r) =>
            Array.from({length: 10}).map((__,c) => {
              const on = ((r+c+Math.floor(t*2)) % 5) === 0;
              return <rect key={`${r}-${c}`} x={20+c*24} y={20+r*24} width="20" height="20"
                fill={on ? "#fff176" : "#1a0a4a"} stroke="#0ff" strokeWidth="1" />;
            })
          )}
        </g>
      )}
    </svg>
  );
}
