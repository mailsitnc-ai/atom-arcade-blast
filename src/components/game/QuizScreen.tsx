import { useState } from "react";
import type { LevelDef } from "./levels";

export default function QuizScreen({
  level, onPass, onRetry,
}: { level: LevelDef; onPass: () => void; onRetry: () => void }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const q = level.quiz[idx];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.answer;
    setTimeout(() => {
      const newCorrect = correct + (ok ? 1 : 0);
      if (idx + 1 >= level.quiz.length) {
        setCorrect(newCorrect);
        setDone(true);
      } else {
        setCorrect(newCorrect);
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 700);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 crt"
      style={{ background: "radial-gradient(circle at 50% 30%, #04231a 0%, #07020f 70%)" }}>
      <div className="w-full max-w-2xl border-4 p-6 md:p-8" style={{ borderColor: "#fff176", boxShadow: "0 0 40px #fff17680 inset, 0 0 30px #fff17660" }}>
        <div className="text-[10px] md:text-xs flicker" style={{ color: "#fff176" }}>
          &gt;&gt; KNOWLEDGE CHECK — LEVEL {level.id}
        </div>
        {!done ? (
          <>
            <div className="mt-2 text-[10px]" style={{ color: "#0ff" }}>
              QUESTION {idx + 1} / {level.quiz.length} · SCORE {correct}
            </div>
            <h2 className="neon mt-3 text-lg md:text-2xl" style={{ color: "#0ff" }}>{q.q}</h2>
            <div className="mt-5 grid gap-3">
              {q.choices.map((c, i) => {
                const isPicked = picked === i;
                const isAnswer = picked !== null && i === q.answer;
                const isWrong = isPicked && i !== q.answer;
                const color = isAnswer ? "#39ff14" : isWrong ? "#ff2e2e" : "#0ff";
                return (
                  <button key={i} onClick={() => choose(i)} disabled={picked !== null}
                    className="text-left text-xs md:text-sm border-2 px-4 py-3 hover:scale-[1.01] transition-transform disabled:cursor-default"
                    style={{ borderColor: color, color, background: `${color}10`, boxShadow: isPicked || isAnswer ? `0 0 18px ${color}` : "none" }}>
                    {String.fromCharCode(65 + i)}. {c}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-3xl md:text-5xl neon" style={{ color: correct >= 2 ? "#39ff14" : "#ff2e2e" }}>
              {correct >= 2 ? "★ PASSED ★" : "✗ TRY AGAIN ✗"}
            </div>
            <p className="mt-3 text-xs md:text-sm">You got <span style={{ color: "#fff176" }}>{correct}/{level.quiz.length}</span> correct.</p>
            <p className="mt-1 text-[10px] opacity-70">{correct >= 2 ? "Knowledge confirmed. Suit up." : "Re-read the briefing — knowledge is power."}</p>
            <div className="mt-6 flex gap-3 justify-center">
              {correct >= 2 ? (
                <button onClick={onPass}
                  className="px-5 py-3 text-xs md:text-base border-2 hover:scale-[1.02] transition-transform"
                  style={{ borderColor: "#39ff14", color: "#39ff14", background: "rgba(57,255,20,0.08)", boxShadow: "0 0 20px #39ff14" }}>
                  ▶ ENTER LEVEL {level.id}
                </button>
              ) : (
                <button onClick={onRetry}
                  className="px-5 py-3 text-xs md:text-base border-2 hover:scale-[1.02] transition-transform"
                  style={{ borderColor: "#ff2e2e", color: "#ff2e2e", background: "rgba(255,46,46,0.08)", boxShadow: "0 0 20px #ff2e2e" }}>
                  ↻ REVIEW BRIEFING
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}