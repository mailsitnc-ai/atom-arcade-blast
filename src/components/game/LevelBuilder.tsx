import { useEffect, useState } from "react";
import {
  fetchCustomWeapons, insertCustomLevel, nextLevelNumber, type CustomWeapon,
} from "@/lib/customContent";

const PATTERNS = ["radial", "aimed", "spiral", "burst", "fusion"] as const;
type BossPat = typeof PATTERNS[number];

export default function LevelBuilder({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [num, setNum] = useState<number>(6);
  const [weapons, setWeapons] = useState<CustomWeapon[]>([]);
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [headline, setHeadline] = useState("");
  const [tagline, setTagline] = useState("");
  const [bullets, setBullets] = useState(["", "", ""]);
  const [analogy, setAnalogy] = useState("");
  const [bossName, setBossName] = useState("");
  const [bossColor, setBossColor] = useState("#ff2e2e");
  const [bossHp, setBossHp] = useState(220);
  const [bossSpeed, setBossSpeed] = useState(2);
  const [bossPattern, setBossPattern] = useState<BossPat>("radial");
  const [bossIntro, setBossIntro] = useState("NEW THREAT INCOMING");
  const [enemyColor, setEnemyColor] = useState("#ff6ec7");
  const [enemySpeed, setEnemySpeed] = useState(2);
  const [enemyHp, setEnemyHp] = useState(4);
  const [bgA, setBgA] = useState("#0a0628");
  const [bgB, setBgB] = useState("#1a0a4a");
  const [weaponId, setWeaponId] = useState<string>("");
  const [quiz, setQuiz] = useState([
    { q: "", choices: ["", "", ""], answer: 0 },
    { q: "", choices: ["", "", ""], answer: 0 },
    { q: "", choices: ["", "", ""], answer: 0 },
  ]);
  const [creator, setCreator] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setNum(await nextLevelNumber());
      const ws = await fetchCustomWeapons();
      setWeapons(ws);
      if (ws[0]) setWeaponId(ws[0].id);
    })();
  }, []);

  const save = async () => {
    if (!title.trim() || !concept.trim() || !bossName.trim()) { setErr("Title, concept, boss name required"); return; }
    if (!weaponId) { setErr("Forge a weapon first in the Weapon Forge!"); return; }
    setSaving(true); setErr("");
    const row = await insertCustomLevel({
      level_number: num,
      title: title.trim(), concept: concept.trim(),
      headline: (headline || title).trim(), tagline: tagline.trim() || concept.trim(),
      bullets: bullets.map(b => b.trim()).filter(Boolean),
      analogy: analogy.trim(), diagram: "atom",
      boss_name: bossName.trim(), boss_color: bossColor, boss_hp: bossHp,
      boss_speed: bossSpeed, boss_pattern: bossPattern, boss_intro: bossIntro.trim(),
      enemy_color: enemyColor, enemy_speed: enemySpeed, enemy_hp: enemyHp,
      bg_a: bgA, bg_b: bgB, weapon_id: weaponId,
      quiz: quiz.filter(q => q.q.trim() && q.choices.every(c => c.trim())),
      creator_name: creator.trim() || "Anonymous",
    });
    setSaving(false);
    if (!row) { setErr("Save failed — maybe someone just published the same level number. Re-open to retry."); return; }
    onSaved();
  };

  return (
    <div className="absolute inset-0 z-20 crt overflow-auto p-4"
      style={{ background: "radial-gradient(circle, #2a1a04, #07020f 80%)" }}>
      <h2 className="neon text-2xl text-center mb-1" style={{ color: "#fff176" }}>🏗 LEVEL BUILDER 🏗</h2>
      <p className="text-[10px] text-center opacity-70 mb-4">Publishing as the next official <b>Level {num}</b> for everyone</p>
      <div className="max-w-2xl mx-auto grid gap-3 text-xs">
        <Field label="Title"><input value={title} onChange={e=>setTitle(e.target.value)} className={inp} placeholder="Quantum Mechanics" /></Field>
        <Field label="Concept (one line)"><input value={concept} onChange={e=>setConcept(e.target.value)} className={inp} placeholder="Wave-Particle Duality" /></Field>
        <Field label="Tagline"><input value={tagline} onChange={e=>setTagline(e.target.value)} className={inp} placeholder="Particles act like waves at tiny scales." /></Field>
        {bullets.map((b, i) => (
          <Field key={i} label={`Teaching bullet ${i+1}`}>
            <input value={b} onChange={e => setBullets(bs => bs.map((x, j) => j === i ? e.target.value : x))} className={inp} />
          </Field>
        ))}
        <Field label="Analogy"><textarea value={analogy} onChange={e=>setAnalogy(e.target.value)} className={inp + " h-12"} /></Field>

        <h3 className="mt-2 text-sm" style={{color:"#ff6ec7"}}>BOSS</h3>
        <Field label="Boss name"><input value={bossName} onChange={e=>setBossName(e.target.value)} className={inp} placeholder="Schrödinger Phantom" /></Field>
        <Field label="Boss intro line"><input value={bossIntro} onChange={e=>setBossIntro(e.target.value)} className={inp} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="HP"><input type="number" value={bossHp} onChange={e=>setBossHp(parseInt(e.target.value)||100)} className={inp} min={50} max={500} /></Field>
          <Field label="Speed"><input type="number" step="0.1" value={bossSpeed} onChange={e=>setBossSpeed(parseFloat(e.target.value)||1)} className={inp} min={0.5} max={4} /></Field>
          <Field label="Color"><input type="color" value={bossColor} onChange={e=>setBossColor(e.target.value)} className="w-full h-9 bg-black border-2" style={{borderColor:"#0ff"}} /></Field>
        </div>
        <Field label="Boss attack pattern">
          <select value={bossPattern} onChange={e=>setBossPattern(e.target.value as BossPat)} className={inp}>
            <option value="radial">Radial (slime: rings of bullets + toxic puddles)</option>
            <option value="aimed">Aimed (titan: tri-shot + dash attack)</option>
            <option value="spiral">Spiral (robot: spinning shots + laser beam)</option>
            <option value="burst">Burst (beast: 14-bullet explosions)</option>
            <option value="fusion">Fusion (final: orbital satellites)</option>
          </select>
        </Field>

        <h3 className="mt-2 text-sm" style={{color:"#ff6ec7"}}>MINIONS & SCENE</h3>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Enemy color"><input type="color" value={enemyColor} onChange={e=>setEnemyColor(e.target.value)} className="w-full h-9 bg-black border-2" style={{borderColor:"#0ff"}} /></Field>
          <Field label="Enemy speed"><input type="number" step="0.1" value={enemySpeed} onChange={e=>setEnemySpeed(parseFloat(e.target.value)||1)} className={inp} min={0.5} max={4} /></Field>
          <Field label="Enemy HP"><input type="number" value={enemyHp} onChange={e=>setEnemyHp(parseInt(e.target.value)||3)} className={inp} min={1} max={10} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="BG color A"><input type="color" value={bgA} onChange={e=>setBgA(e.target.value)} className="w-full h-9 bg-black border-2" style={{borderColor:"#0ff"}} /></Field>
          <Field label="BG color B"><input type="color" value={bgB} onChange={e=>setBgB(e.target.value)} className="w-full h-9 bg-black border-2" style={{borderColor:"#0ff"}} /></Field>
        </div>

        <h3 className="mt-2 text-sm" style={{color:"#ff6ec7"}}>WEAPON FOR THIS LEVEL</h3>
        {weapons.length === 0 ? (
          <div className="text-[10px] opacity-70 border-2 p-2" style={{borderColor:"#ff2e2e", color:"#ff2e2e"}}>
            No custom weapons exist yet. Forge one first in the Weapon Forge.
          </div>
        ) : (
          <Field label="Pick a community weapon">
            <select value={weaponId} onChange={e=>setWeaponId(e.target.value)} className={inp}>
              {weapons.map(w => <option key={w.id} value={w.id}>{w.name} · {w.pattern} · {w.damage}dmg ({w.creator_name})</option>)}
            </select>
          </Field>
        )}

        <h3 className="mt-2 text-sm" style={{color:"#ff6ec7"}}>QUIZ (3 questions, optional)</h3>
        {quiz.map((q, qi) => (
          <div key={qi} className="border-2 p-2" style={{borderColor:"#7df9ff"}}>
            <Field label={`Q${qi+1}`}>
              <input value={q.q} onChange={e=>setQuiz(qz=>qz.map((x,i)=>i===qi?{...x, q:e.target.value}:x))} className={inp} />
            </Field>
            {q.choices.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2 mt-1">
                <input type="radio" name={`ans${qi}`} checked={q.answer===ci}
                  onChange={()=>setQuiz(qz=>qz.map((x,i)=>i===qi?{...x, answer:ci}:x))} />
                <input value={c} placeholder={`Choice ${ci+1}`} className={inp}
                  onChange={e=>setQuiz(qz=>qz.map((x,i)=>i===qi?{...x, choices: x.choices.map((y,j)=>j===ci?e.target.value:y)}:x))} />
              </div>
            ))}
          </div>
        ))}

        <Field label="Your creator name"><input value={creator} onChange={e=>setCreator(e.target.value)} className={inp} maxLength={20} placeholder="Anonymous" /></Field>
        {err && <div className="text-[10px] text-center" style={{ color: "#ff2e2e" }}>{err}</div>}
        <div className="flex gap-3 justify-center mt-2 mb-6">
          <button onClick={save} disabled={saving} className="px-4 py-2 text-xs border-2"
            style={{ borderColor: "#fff176", color: "#fff176", boxShadow: "0 0 16px #fff176" }}>
            {saving ? "PUBLISHING…" : `🚀 PUBLISH AS LEVEL ${num}`}
          </button>
          <button onClick={onBack} className="px-4 py-2 text-xs border-2"
            style={{ borderColor: "#0ff", color: "#0ff" }}>← BACK</button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full bg-black border-2 px-2 py-1 text-xs outline-none";
function Field({ label, children }: any) {
  return (<label className="block"><span className="block text-[10px] opacity-70 mb-1" style={{color:"#7df9ff"}}>{label}</span>{children}</label>);
}
