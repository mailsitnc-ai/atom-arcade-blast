import { useMemo, useState } from "react";
import type { LevelDef } from "./levels";

export default function QuizScreen({
  level, onPass, onFail,
}: { level: LevelDef; onPass: (correct: number) => void; onFail: () => void }) {
  const questions = useMemo(() => level.quiz, [level.id]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const q = questions[idx];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.answer;
    if (ok) setCorrect(c => c + 1); else setWrong(w => w + 1);
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        const finalCorrect = correct + (ok ? 1 : 0);
        if (finalCorrect >= 2) onPass(finalCorrect);
        else onFail();
      } else {
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 700);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 crt"
      style={{ background: "radial-gradient(circle at 50% 30%, #04231a 0%, #07020f 70%)" }}>
      <div className="w-full max-w-2xl border-4 p-6 md:p-8" style={{ borderColor: "#fff176", boxShadow: "0 0 40px #fff176 inset, 0 0 30px #0ff" }}>
        <div className="flex justify-between text-[10px] md:text-xs mb-4">
          <span style={{ color: "#0ff" }}>{">>"} POP QUIZ — LEVEL {level.id}</span>
          <span style={{ color: "#fff176" }}>Q {idx + 1}/{questions.length} · ✔ {correct} · ✘ {wrong}</span>
        </div>
        <h2 className="neon text-lg md:text-2xl mb-6" style={{ color: "#fff176" }}>{q.q}</h2>
        <div className="grid gap-3">
          {q.choices.map((c, i) => {
            const isPicked = picked === i;
            const isAnswer = picked !== null && i === q.answer;
            const isWrong = isPicked && i !== q.answer;
            const color = isAnswer ? "#39ff14" : isWrong ? "#ff2e2e" : "#0ff";
            return (
              <button key={i} onClick={() => choose(i)} disabled={picked !== null}
                className="text-left px-4 py-3 text-xs md:text-sm border-2 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed"
                style={{ borderColor: color, color, background: `${color}10`, boxShadow: `0 0 16px ${color}80` }}>
                <span className="opacity-70 mr-2">{String.fromCharCode(65 + i)}.</span>{c}
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-[10px] opacity-70 text-center" style={{ color: "#7df9ff" }}>
          Score 2/3 or higher to enter the lab. Otherwise re-read the briefing.
        </p>
      </div>
    </div>
  );
}