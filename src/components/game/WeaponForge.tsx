import { useState } from "react";
import {
  insertCustomWeapon, PATTERN_LABEL, type WeaponPattern,
} from "@/lib/customContent";

const PATTERNS: WeaponPattern[] = ["beam", "shield", "pool", "chain", "nova"];
const SFX_OPTS = ["shoot", "hit", "boss", "atom", "combo"];

export default function WeaponForge({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pattern, setPattern] = useState<WeaponPattern>("beam");
  const [color, setColor] = useState("#7df9ff");
  const [size, setSize] = useState(6);
  const [speed, setSpeed] = useState(9);
  const [damage, setDamage] = useState(2);
  const [ammoCost, setAmmoCost] = useState(1);
  const [particleColor, setParticleColor] = useState("#ffffff");
  const [particleCount, setParticleCount] = useState(10);
  const [sfx, setSfx] = useState("shoot");
  const [creator, setCreator] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!name.trim()) { setErr("Name required"); return; }
    setSaving(true); setErr("");
    const w = await insertCustomWeapon({
      name: name.trim(), description: description.trim(), pattern,
      color, size, speed, damage, ammo_cost: ammoCost,
      particle_color: particleColor, particle_count: particleCount, sfx,
      creator_name: creator.trim() || "Anonymous",
    });
    setSaving(false);
    if (!w) { setErr("Save failed"); return; }
    onSaved();
  };

  return (
    <div className="absolute inset-0 z-20 crt overflow-auto p-4"
      style={{ background: "radial-gradient(circle, #04231a, #07020f 80%)" }}>
      <h2 className="neon text-2xl text-center mb-1" style={{ color: "#39ff14" }}>🔧 WEAPON FORGE 🔧</h2>
      <p className="text-[10px] text-center opacity-70 mb-4">Build a weapon · usable in community Level 6+</p>
      <div className="max-w-xl mx-auto grid gap-3 text-xs">
        <Field label="Name"><input value={name} onChange={e=>setName(e.target.value)} className={inp} maxLength={40} placeholder="Plasma Lance" /></Field>
        <Field label="Description"><textarea value={description} onChange={e=>setDescription(e.target.value)} className={inp + " h-12"} maxLength={200} placeholder="What does it do?" /></Field>
        <Field label="Projectile pattern">
          <select value={pattern} onChange={e=>setPattern(e.target.value as WeaponPattern)} className={inp}>
            {PATTERNS.map(p => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color"><input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-full h-9 bg-black border-2" style={{borderColor:"#0ff"}} /></Field>
          <Field label="Particle color"><input type="color" value={particleColor} onChange={e=>setParticleColor(e.target.value)} className="w-full h-9 bg-black border-2" style={{borderColor:"#0ff"}} /></Field>
        </div>
        <Slider label={`Size: ${size}`} min={3} max={15} val={size} set={setSize} />
        <Slider label={`Speed: ${speed}`} min={3} max={15} val={speed} set={setSpeed} />
        <Slider label={`Damage: ${damage}`} min={1} max={10} val={damage} set={setDamage} />
        <Slider label={`Ammo cost per shot: ${ammoCost}`} min={1} max={6} val={ammoCost} set={setAmmoCost} />
        <Slider label={`Particles per shot: ${particleCount}`} min={2} max={40} val={particleCount} set={setParticleCount} />
        <Field label="Sound effect">
          <select value={sfx} onChange={e=>setSfx(e.target.value)} className={inp}>
            {SFX_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Your creator name"><input value={creator} onChange={e=>setCreator(e.target.value)} className={inp} maxLength={20} placeholder="Anonymous" /></Field>

        <div className="border-2 p-3 mt-2 text-center" style={{ borderColor: color, boxShadow: `0 0 14px ${color}` }}>
          <div className="text-sm font-bold mb-1" style={{ color }}>{name || "(unnamed)"}</div>
          <div className="text-[10px] opacity-80">{PATTERN_LABEL[pattern]} · {damage} dmg · {ammoCost} ammo/shot</div>
          <div className="text-[10px] opacity-60 mt-1">by {creator || "Anonymous"}</div>
        </div>

        {err && <div className="text-[10px] text-center" style={{ color: "#ff2e2e" }}>{err}</div>}
        <div className="flex gap-3 justify-center mt-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 text-xs border-2"
            style={{ borderColor: "#39ff14", color: "#39ff14", boxShadow: "0 0 16px #39ff14" }}>
            {saving ? "FORGING…" : "💾 SAVE WEAPON"}
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
function Slider({ label, min, max, val, set }: any) {
  return (<label className="block"><span className="block text-[10px] opacity-70 mb-1" style={{color:"#7df9ff"}}>{label}</span>
    <input type="range" min={min} max={max} value={val} onChange={e=>set(parseInt(e.target.value))} className="w-full" /></label>);
}
