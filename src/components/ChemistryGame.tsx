import { useEffect, useRef, useState, useCallback } from "react";
import { LEVELS } from "./game/levels";
import LearningScreen from "./game/LearningScreen";
import QuizScreen from "./game/QuizScreen";
import { sfx } from "./game/sound";
import { loadLB, saveLB, type LBEntry } from "./game/leaderboard";

type Phase = "menu" | "learn-intro" | "quiz" | "play" | "learn-recap" | "gameover" | "leaderboard" | "victory" | "practice-select" | "practice-play";
type V = { x: number; y: number };
type Bullet = V & { vx: number; vy: number; dmg: number; life: number };
type PBullet = Bullet & { seek?: boolean; split?: number; trail?: string; puddle?: boolean; chain?: boolean; vortex?: boolean };
type Enemy = V & { hp: number; cd: number; vx: number; vy: number };
type Atom = V & { taken: boolean; symbol: string; pulse: number };
type Particle = V & { vx: number; vy: number; life: number; color: string };
type Boss = { x: number; y: number; hp: number; maxHp: number; phase: number; cd: number; t: number; introT: number };
type Puddle = { x: number; y: number; r: number; life: number; dmgCd: number; dmg: number };
type ChainFx = { points: V[]; life: number };
type PowerupKind = "heal" | "rapid" | "shield" | "double" | "ammo";
type Powerup = { x: number; y: number; kind: PowerupKind; t: number };

const W = 800, H = 500;
const SYMBOLS = ["H", "He", "Li", "C", "N", "O", "Na", "Fe"];

export default function ChemistryGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({ enemies: 0, atoms: 0, bosses: 0, combo: 0, maxCombo: 0, startTime: 0 });
  const [lb, setLb] = useState<LBEntry[]>([]);
  const [nameInput, setNameInput] = useState("AAA");
  const [hud, setHud] = useState({ ammo: 10, atomsCollected: 0, enemiesLeft: 8, unlimited: false, bossHp: 0, bossMax: 0, bossActive: false, weapon: "" });
  const [practiceLevel, setPracticeLevel] = useState(0);

  // Stable callback refs so PlayCanvas effect doesn't re-init every frame
  const onCompleteRef = useRef<() => void>(() => {});
  const onDeathRef = useRef<() => void>(() => {});
  const onScoreRef = useRef<(n: number) => void>(() => {});
  const onStatRef = useRef<(k: any, v?: number) => void>(() => {});
  const onHudRef = useRef<(h: any) => void>(() => {});

  useEffect(() => { setLb(loadLB()); }, []);

  const startGame = () => {
    setLives(5); setScore(0); setLevelIdx(0);
    setStats({ enemies: 0, atoms: 0, bosses: 0, combo: 0, maxCombo: 0, startTime: Date.now() });
    setPhase("learn-intro");
  };

  const onLevelComplete = () => {
    sfx("win");
    setStats(s => ({ ...s, bosses: s.bosses + 1 }));
    if (phase === "practice-play") { setPhase("menu"); return; }
    if (levelIdx >= LEVELS.length - 1) {
      setPhase("victory");
    } else {
      setPhase("learn-recap");
    }
  };

  const onPlayerDied = () => {
    sfx("die");
    if (phase === "practice-play") { setPhase("menu"); return; }
    const newLives = lives - 1;
    setLives(newLives);
    setStats(s => ({ ...s, combo: 0 }));
    if (newLives <= 0) {
      setPhase("gameover");
    } else {
      // restart current level (re-show no learning, jump to play with reset)
      setPhase("learn-intro");
    }
  };

  // Refresh refs every render so PlayCanvas always calls the latest closures
  onCompleteRef.current = onLevelComplete;
  onDeathRef.current = onPlayerDied;
  onScoreRef.current = (d: number) => setScore(s => s + d);
  onStatRef.current = (k: any, v: number = 1) => setStats(s => {
    const next = { ...s, [k]: (s as any)[k] + v };
    if (k === "combo") next.maxCombo = Math.max(s.maxCombo, next.combo);
    return next;
  });
  onHudRef.current = setHud;

  const submitScore = () => {
    const entry: LBEntry = {
      name: nameInput.toUpperCase().slice(0,8) || "???",
      score, level: levelIdx + 1, time: Math.floor((Date.now() - stats.startTime)/1000),
      enemies: stats.enemies, atoms: stats.atoms, bosses: stats.bosses, combo: stats.maxCombo,
      livesLeft: lives, date: Date.now(),
    };
    saveLB(entry); setLb(loadLB()); setPhase("leaderboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#07020f] text-[#e6f7ff]">
      <header className="mb-3 text-center">
        <h1 className="neon text-2xl md:text-4xl tracking-widest" style={{ color: "#0ff" }}>⚛ CHEM QUEST ⚛</h1>
        <p className="text-[10px] md:text-xs mt-1" style={{ color: "#fff176" }}>RETRO CHEMISTRY QUEST · 5 LEVELS · WASD TO MOVE · MOUSE/SPACE TO FIRE</p>
      </header>

      <div className="relative crt" style={{ width: W, maxWidth: "100%" }}>
        <div className="relative" style={{ width: W, height: H, maxWidth: "100%" }}>
          {phase === "play" && (
            <PlayCanvas
              level={LEVELS[levelIdx]}
              onComplete={onCompleteRef}
              onDeath={onDeathRef}
              onScore={onScoreRef}
              onStat={onStatRef}
              onHud={onHudRef}
            />
          )}
          {phase === "practice-play" && (
            <PlayCanvas
              key={`practice-${practiceLevel}`}
              level={LEVELS[practiceLevel]}
              practice
              onComplete={onCompleteRef}
              onDeath={onDeathRef}
              onScore={onScoreRef}
              onStat={onStatRef}
              onHud={onHudRef}
            />
          )}
          {phase === "menu" && (
            <Menu
              onStart={startGame}
              onLB={() => setPhase("leaderboard")}
              onPractice={() => setPhase("practice-select")}
              lb={lb}
            />
          )}
          {phase === "practice-select" && (
            <PracticeSelect
              onPick={(i) => { setPracticeLevel(i); setLives(3); setPhase("practice-play"); }}
              onBack={() => setPhase("menu")}
            />
          )}
          {(phase === "learn-intro" || phase === "learn-recap") && (
            <LearningScreen
              level={LEVELS[levelIdx]}
              mode={phase === "learn-intro" ? "intro" : "recap"}
              onContinue={() => {
                if (phase === "learn-intro") setPhase("quiz");
                else { setLevelIdx(i => i + 1); setPhase("learn-intro"); }
              }}
            />
          )}
          {phase === "quiz" && (
            <QuizScreen
              level={LEVELS[levelIdx]}
              onPass={() => setPhase("play")}
              onRetry={() => setPhase("learn-intro")}
            />
          )}
          {phase === "gameover" && (
            <Overlay title="GAME OVER" color="#ff2e2e">
              <p className="text-xs mb-3">All 5 lives lost. Resetting to Level 1.</p>
              <p className="text-sm mb-2">FINAL SCORE: <span style={{color:"#fff176"}}>{score}</span></p>
              <p className="text-[10px] mb-4">Enter your initials for the leaderboard:</p>
              <input value={nameInput} onChange={e=>setNameInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8))}
                className="w-32 text-center text-lg p-2 bg-black border-2 mb-4 tracking-widest" style={{borderColor:"#0ff", color:"#0ff"}} maxLength={8} />
              <div className="flex gap-3 justify-center">
                <NeonBtn color="#39ff14" onClick={submitScore}>SAVE SCORE</NeonBtn>
                <NeonBtn color="#ff2e2e" onClick={() => setPhase("menu")}>SKIP</NeonBtn>
              </div>
            </Overlay>
          )}
          {phase === "victory" && (
            <Overlay title="★ YOU WIN ★" color="#fff176">
              <p className="text-xs mb-3">All 5 chemistry levels conquered!</p>
              <p className="text-sm mb-4">SCORE: <span style={{color:"#0ff"}}>{score}</span></p>
              <input value={nameInput} onChange={e=>setNameInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8))}
                className="w-32 text-center text-lg p-2 bg-black border-2 mb-4 tracking-widest" style={{borderColor:"#fff176", color:"#fff176"}} maxLength={8} />
              <div className="flex gap-3 justify-center">
                <NeonBtn color="#39ff14" onClick={submitScore}>SAVE SCORE</NeonBtn>
                <NeonBtn color="#0ff" onClick={() => setPhase("menu")}>MAIN MENU</NeonBtn>
              </div>
            </Overlay>
          )}
          {phase === "leaderboard" && (
            <Leaderboard lb={lb} onBack={() => setPhase("menu")} />
          )}
        </div>

        {/* HUD */}
        {phase === "play" && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] md:text-xs">
            <Stat label="LEVEL" value={`${levelIdx+1}/5`} c="#0ff" />
            <Stat label="LIVES" value={"♥".repeat(lives) || "—"} c="#ff2e2e" />
            <Stat label="SCORE" value={score} c="#fff176" />
            <Stat label="AMMO" value={hud.unlimited ? "∞" : hud.ammo} c="#39ff14" />
            <Stat label="ATOMS" value={`${hud.atomsCollected}/8`} c="#b388ff" />
            <Stat label="ENEMIES" value={hud.bossActive ? "BOSS!" : `${hud.enemiesLeft}/8`} c="#ff6ec7" />
          </div>
        )}
        {phase === "play" && hud.bossActive && (
          <div className="mt-2">
            <div className="text-[10px]" style={{color:"#ff2e2e"}}>BOSS HP</div>
            <div className="h-3 border-2" style={{borderColor:"#ff2e2e"}}>
              <div className="h-full" style={{width:`${(hud.bossHp/hud.bossMax)*100}%`, background:"linear-gradient(90deg,#ff2e2e,#fff176)"}} />
            </div>
          </div>
        )}
        {phase === "play" && (
          <div className="mt-2 text-[10px] text-center" style={{color:"#7df9ff"}}>
            WEAPON: <span style={{color:"#fff176"}}>{hud.weapon}</span>
          </div>
        )}
      </div>

      <footer className="mt-4 text-[9px] opacity-60">© CHEM QUEST · made for chemistry nerds</footer>
    </div>
  );
}

function Stat({ label, value, c }: { label: string; value: any; c: string }) {
  return (
    <div className="border-2 px-2 py-1 text-center" style={{ borderColor: c, color: c, boxShadow: `0 0 10px ${c}40` }}>
      <div className="opacity-70">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function NeonBtn({ color, onClick, children }: any) {
  return (
    <button onClick={onClick} className="px-4 py-2 text-xs border-2 hover:scale-105 transition"
      style={{ borderColor: color, color, boxShadow: `0 0 18px ${color}` }}>{children}</button>
  );
}

function Overlay({ title, color, children }: any) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center crt"
      style={{ background: "radial-gradient(circle, #1a0a4a, #07020f 80%)" }}>
      <div className="text-center border-4 p-6 max-w-md" style={{ borderColor: color, boxShadow: `0 0 40px ${color}` }}>
        <h2 className="neon text-3xl mb-4" style={{ color }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Menu({ onStart, onLB, onPractice, lb }: { onStart: () => void; onLB: () => void; onPractice: () => void; lb: LBEntry[] }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center crt p-6"
      style={{ background: "radial-gradient(circle at 50% 30%, #2a0a55, #07020f 70%)" }}>
      <div className="text-6xl md:text-7xl mb-4 neon" style={{ color: "#0ff" }}>⚛</div>
      <h2 className="text-xl md:text-3xl flicker mb-2" style={{ color: "#fff176" }}>PRESS START</h2>
      <p className="text-[10px] md:text-xs mb-6 max-w-md text-center opacity-80">
        Battle through 5 chemistry-themed levels. Collect atoms, evolve weapons, defeat mutated bosses.
      </p>
      <div className="flex flex-wrap gap-3 mb-6 justify-center">
        <NeonBtn color="#39ff14" onClick={onStart}>▶ NEW GAME</NeonBtn>
        <NeonBtn color="#ff6ec7" onClick={onPractice}>⚔ BOSS PRACTICE</NeonBtn>
        <NeonBtn color="#0ff" onClick={onLB}>★ LEADERBOARD</NeonBtn>
      </div>
      <div className="text-[10px] opacity-70 text-center">
        Top Score: <span style={{color:"#fff176"}}>{lb[0]?.score ?? 0}</span> by {lb[0]?.name ?? "—"}
      </div>
    </div>
  );
}

function PracticeSelect({ onPick, onBack }: { onPick: (i: number) => void; onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-20 crt overflow-auto p-4 flex flex-col items-center"
      style={{ background: "radial-gradient(circle, #2a0a55, #07020f 80%)" }}>
      <h2 className="neon text-2xl mb-2" style={{ color: "#ff6ec7" }}>⚔ BOSS PRACTICE ⚔</h2>
      <p className="text-[10px] opacity-70 mb-4 text-center max-w-md">
        Fight any boss directly. Unlimited ammo. No score, no leaderboard — just practice.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-xl w-full">
        {LEVELS.map((lv, i) => (
          <button key={lv.id} onClick={() => onPick(i)}
            className="border-2 p-3 text-left hover:scale-[1.02] transition"
            style={{ borderColor: lv.boss.color, color: lv.boss.color, boxShadow: `0 0 12px ${lv.boss.color}55` }}>
            <div className="text-xs opacity-70">LV {lv.id} · {lv.title}</div>
            <div className="text-sm font-bold">{lv.boss.name}</div>
            <div className="text-[10px] opacity-80 mt-1" style={{ color: "#e6f7ff" }}>
              Weapon: {lv.weapon.name}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6"><NeonBtn color="#0ff" onClick={onBack}>← BACK</NeonBtn></div>
    </div>
  );
}

function Leaderboard({ lb, onBack }: { lb: LBEntry[]; onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-20 crt overflow-auto p-4"
      style={{ background: "radial-gradient(circle, #04231a, #07020f 80%)" }}>
      <h2 className="neon text-2xl text-center mb-4" style={{ color: "#fff176" }}>★ HALL OF SCIENCE ★</h2>
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-7 text-[9px] md:text-[10px] gap-1 border-b-2 pb-1 mb-2" style={{ borderColor: "#0ff", color: "#0ff" }}>
          <div>#</div><div>NAME</div><div>SCORE</div><div>LV</div><div>TIME</div><div>ATOMS</div><div>ENM</div>
        </div>
        {lb.length === 0 && <div className="text-center text-xs opacity-60 py-6">No scores yet. Be the first.</div>}
        {lb.slice(0,15).map((e,i) => (
          <div key={i} className="grid grid-cols-7 text-[10px] md:text-xs gap-1 py-1 border-b border-[#0ff3]"
            style={{ color: i===0?"#fff176":i<3?"#0ff":"#e6f7ff" }}>
            <div>{i+1}</div><div className="truncate">{e.name}</div><div>{e.score}</div>
            <div>{e.level}</div><div>{e.time}s</div><div>{e.atoms}</div><div>{e.enemies}</div>
          </div>
        ))}
        <div className="mt-6 flex justify-center"><NeonBtn color="#0ff" onClick={onBack}>← BACK</NeonBtn></div>
      </div>
    </div>
  );
}

// ============== GAME PLAY CANVAS ==============

function PlayCanvas({ level, practice, onComplete, onDeath, onScore, onStat, onHud }: {
  level: typeof LEVELS[number];
  practice?: boolean;
  onComplete: React.RefObject<() => void>;
  onDeath: React.RefObject<() => void>;
  onScore: React.RefObject<(n: number) => void>;
  onStat: React.RefObject<(k: "enemies"|"atoms"|"combo"|"maxCombo", v?: number) => void>;
  onHud: React.RefObject<(h: any) => void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<any>(null);

  // Reset on level change (or remount due to phase)
  useEffect(() => {
    const enemies: Enemy[] = [];
    if (!practice) for (let i = 0; i < 8; i++) {
      enemies.push({
        x: 80 + Math.random()*(W-160),
        y: 60 + Math.random()*(H-120),
        hp: level.enemyHp, cd: Math.random()*60,
        vx: (Math.random()-0.5)*level.enemySpeed,
        vy: (Math.random()-0.5)*level.enemySpeed,
      });
    }
    const atoms: Atom[] = [];
    if (!practice) for (let i = 0; i < 8; i++) {
      atoms.push({
        x: 60 + Math.random()*(W-120),
        y: 60 + Math.random()*(H-120),
        taken: false, symbol: SYMBOLS[i], pulse: Math.random()*Math.PI*2,
      });
    }
    stateRef.current = {
      player: { x: 30, y: H/2, hp: 3, iframes: 0 },
      bullets: [] as Bullet[],
      eBullets: [] as Bullet[],
      enemies, atoms,
      particles: [] as Particle[],
      puddles: [] as Puddle[],
      chains: [] as ChainFx[],
      powerups: [] as Powerup[],
      buffs: { rapid: 0, double: 0, shield: 0 },
      powerupCd: 360,
      powerupsSpawned: 0,
      ammo: practice ? 999 : 10,
      unlimited: !!practice,
      atomsCollected: 0,
      keys: {} as Record<string, boolean>,
      mouse: { x: W/2, y: 0, down: false },
      boss: practice ? { x: W/2, y: 80, hp: level.boss.hp, maxHp: level.boss.hp, phase: 0, cd: 120, t: 0, introT: 120 } as Boss : null,
      bossDefeated: false,
      portal: null as { x: number; y: number; t: number } | null,
      bossExtra: { dashCd: 0, minionCd: 0, beamCd: 0, beamT: 0, beamAngle: 0 },
      shake: 0, comboT: 0, combo: 0,
      lastShot: 0, time: 0,
      practice: !!practice,
    };
  }, [level.id, practice]);

  const fire = useCallback(() => {
    const s = stateRef.current; if (!s) return;
    let cooldown = level.id === 2 ? 260 : level.id === 3 ? 220 : level.id === 4 ? 200 : level.id === 5 ? 280 : 140;
    if (s.buffs.rapid > 0) cooldown *= 0.5;
    if (s.lastShot && performance.now() - s.lastShot < cooldown) return;
    const cost = level.weapon.ammoCost;
    if (!s.unlimited && s.ammo < cost) return;
    s.lastShot = performance.now();
    if (!s.unlimited) s.ammo -= cost;
    const px = s.player.x, py = s.player.y;
    const dx = s.mouse.x - px, dy = s.mouse.y - py;
    const d = Math.hypot(dx,dy) || 1;
    const aim = Math.atan2(dy, dx);
    const sp = level.weapon.speed;
    let dmg = level.weapon.damage + Math.floor(s.atomsCollected/3);
    if (s.buffs.double > 0) dmg *= 2;
    const mk = (vx: number, vy: number, extra: Partial<PBullet> = {}): PBullet => ({
      x: px, y: py, vx, vy, dmg, life: 90, ...extra,
    });
    switch (level.id) {
      case 1: { // straight beam
        s.bullets.push(mk((dx/d)*sp, (dy/d)*sp));
        break;
      }
      case 2: { // shield: 8 bullets fired outward in all directions
        for (let i = 0; i < 8; i++) {
          const a = (i/8)*Math.PI*2 + s.time*0.02;
          s.bullets.push(mk(Math.cos(a)*sp*0.85, Math.sin(a)*sp*0.85, { life: 70 }));
        }
        break;
      }
      case 3: { // corrosive puddles — slow lobs that splat into damaging acid pools
        for (let i = -1; i <= 1; i++) {
          const a = aim + i * 0.22;
          s.bullets.push(mk(Math.cos(a)*sp, Math.sin(a)*sp, { life: 35, puddle: true }));
        }
        break;
      }
      case 4: { // chain lightning — single fast bolt that arcs to nearby enemies on hit
        s.bullets.push(mk(Math.cos(aim)*sp, Math.sin(aim)*sp, { chain: true, life: 60 }));
        break;
      }
      case 5: { // singularity vortex — slow heavy orb that pulls enemies in, then implodes
        s.bullets.push(mk(Math.cos(aim)*sp, Math.sin(aim)*sp, { vortex: true, life: 120 }));
        break;
      }
    }
    sfx("shoot");
  }, [level]);

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d")!; if (!ctx) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current; if (!s) return;
      s.keys[e.key.toLowerCase()] = true;
      if (e.key === " ") { e.preventDefault(); fire(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current; if (!s) return;
      s.keys[e.key.toLowerCase()] = false;
    };
    const onMove = (e: MouseEvent) => {
      const s = stateRef.current; if (!s) return;
      const r = cvs.getBoundingClientRect();
      s.mouse.x = (e.clientX - r.left) * (W/r.width);
      s.mouse.y = (e.clientY - r.top) * (H/r.height);
    };
    const onDown = () => { fire(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("mousedown", onDown);

    let raf = 0;
    let dead = false;

    const loop = () => {
      const s = stateRef.current; if (!s) { raf = requestAnimationFrame(loop); return; }
      s.time++;

      // ---- Update ----
      const p = s.player;
      const speed = 3;
      if (s.keys["w"]) p.y -= speed;
      if (s.keys["s"]) p.y += speed;
      if (s.keys["a"]) p.x -= speed;
      if (s.keys["d"]) p.x += speed;
      p.x = Math.max(15, Math.min(W-15, p.x));
      p.y = Math.max(15, Math.min(H-15, p.y));
      if (p.iframes > 0) p.iframes--;
      if (s.comboT > 0) s.comboT--; else if (s.combo > 0) s.combo = 0;
      // Buff timers
      if (s.buffs.rapid > 0) s.buffs.rapid--;
      if (s.buffs.double > 0) s.buffs.double--;
      if (s.buffs.shield > 0) { s.buffs.shield--; if (p.iframes < 2) p.iframes = 2; }

      // Bullets
      const newBullets: PBullet[] = [];
      s.bullets = s.bullets.filter((b: PBullet) => {
        if (b.seek && s.enemies.length) {
          // find nearest live enemy
          let nearest: Enemy | null = null, nd = 1e9;
          for (const en of s.enemies) {
            if (en.hp <= 0) continue;
            const dd = (en.x-b.x)*(en.x-b.x) + (en.y-b.y)*(en.y-b.y);
            if (dd < nd) { nd = dd; nearest = en; }
          }
          if (nearest) {
            const ax = nearest.x - b.x, ay = nearest.y - b.y, ad = Math.hypot(ax, ay) || 1;
            b.vx += (ax/ad) * 0.6; b.vy += (ay/ad) * 0.6;
            const sp2 = Math.hypot(b.vx, b.vy), max = level.weapon.speed;
            if (sp2 > max) { b.vx = b.vx/sp2*max; b.vy = b.vy/sp2*max; }
          }
        }
        // Vortex: pull enemies in toward the orb each frame
        if (b.vortex) {
          for (const en of s.enemies) {
            if (en.hp <= 0) continue;
            const ax = b.x - en.x, ay = b.y - en.y, ad = Math.hypot(ax,ay) || 1;
            if (ad < 200) { en.x += (ax/ad) * 1.6; en.y += (ay/ad) * 1.6; }
          }
          if (s.boss && !s.boss.introT) {
            const ax = b.x - s.boss.x, ay = b.y - s.boss.y, ad = Math.hypot(ax,ay) || 1;
            if (ad < 220) { s.boss.x += (ax/ad) * 0.4; s.boss.y += (ay/ad) * 0.2; }
          }
          // shrink/spin visually
          b.vx *= 0.97; b.vy *= 0.97;
        }
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.split && b.life === 40) {
          // split into 3 mini-bullets
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(b.vy, b.vx) + i * 0.4;
            newBullets.push({ x: b.x, y: b.y, vx: Math.cos(a)*level.weapon.speed*0.9, vy: Math.sin(a)*level.weapon.speed*0.9, dmg: Math.max(1, b.dmg-1), life: 50 });
          }
          b.split = 0;
        }
        // Puddle bullet expired or off-screen → spawn corrosive puddle
        if (b.puddle && (b.life <= 0 || b.x < 8 || b.x > W-8 || b.y < 8 || b.y > H-8)) {
          s.puddles.push({ x: b.x, y: b.y, r: 38, life: 200, dmgCd: 0, dmg: b.dmg });
          spawnParticles(s, b.x, b.y, "#39ff14", 10);
        }
        // Vortex implodes → AoE blast
        if (b.vortex && b.life <= 0) {
          spawnParticles(s, b.x, b.y, "#fff176", 36);
          for (const en of s.enemies) {
            if (en.hp <= 0) continue;
            if (Math.hypot(en.x-b.x, en.y-b.y) < 110) {
              en.hp -= b.dmg * 2;
              spawnParticles(s, en.x, en.y, "#fff176", 6);
            }
          }
          if (s.boss && !s.boss.introT && Math.hypot(s.boss.x-b.x, s.boss.y-b.y) < 130) {
            s.boss.hp -= b.dmg * 2;
            s.shake = 14;
            if (s.boss.hp <= 0) {
              spawnParticles(s, s.boss.x, s.boss.y, "#fff176", 60);
              s.shake = 25; s.bossDefeated = true; s.boss = null;
              setTimeout(onComplete.current!, 800);
            }
          }
        }
        return b.life > 0 && b.x > -10 && b.x < W+10 && b.y > -10 && b.y < H+10;
      });
      if (newBullets.length) s.bullets.push(...newBullets);

      // Puddles — damage enemies inside, fade out
      s.puddles = s.puddles.filter((pu: Puddle) => {
        pu.life--; pu.dmgCd--;
        if (pu.dmgCd <= 0) {
          pu.dmgCd = 18;
          for (const en of s.enemies) {
            if (en.hp <= 0) continue;
            if (Math.hypot(en.x-pu.x, en.y-pu.y) < pu.r) {
              en.hp -= pu.dmg;
              spawnParticles(s, en.x, en.y, "#39ff14", 3);
              if (en.hp <= 0) {
                s.combo++; s.comboT = 90;
                onStat.current!("combo", 1);
                onScore.current!(100 + s.combo*10); onStat.current!("enemies", 1);
              }
            }
          }
          if (s.boss && !s.boss.introT && Math.hypot(s.boss.x-pu.x, s.boss.y-pu.y) < pu.r + 10) {
            s.boss.hp -= pu.dmg;
            if (s.boss.hp <= 0) {
              spawnParticles(s, s.boss.x, s.boss.y, "#fff176", 60);
              s.shake = 25; s.bossDefeated = true; s.boss = null;
              setTimeout(onComplete.current!, 800);
            }
          }
        }
        return pu.life > 0;
      });
      // Chain lightning visual decay
      s.chains = s.chains.filter((c: ChainFx) => { c.life--; return c.life > 0; });

      s.eBullets = s.eBullets.filter((b: Bullet) => {
        b.x += b.vx; b.y += b.vy; b.life--;
        if (Math.hypot(b.x-p.x, b.y-p.y) < 14 && p.iframes <= 0) {
          p.hp--; p.iframes = 60; s.shake = 12; sfx("hit");
          if (p.hp <= 0 && !dead) { dead = true; setTimeout(onDeath.current!, 200); }
          return false;
        }
        return b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H;
      });

      // Enemies
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        // chase a bit
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx,dy)||1;
        e.x += (dx/d) * level.enemySpeed * 0.4 + e.vx*0.3;
        e.y += (dy/d) * level.enemySpeed * 0.4 + e.vy*0.3;
        if (e.x < 20 || e.x > W-20) e.vx *= -1;
        if (e.y < 20 || e.y > H-20) e.vy *= -1;
        e.cd--;
        if (e.cd <= 0) {
          e.cd = 90 - level.id*8;
          const a = Math.atan2(p.y-e.y, p.x-e.x);
          s.eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a)*3, vy: Math.sin(a)*3, dmg:1, life:120 });
        }
        // collide w/ player
        if (Math.hypot(e.x-p.x, e.y-p.y) < 22 && p.iframes <= 0) {
          p.hp--; p.iframes = 60; s.shake = 8; sfx("hit");
          if (p.hp <= 0 && !dead) { dead = true; setTimeout(onDeath.current!, 200); }
        }
        // bullets hit enemy
        for (const b of s.bullets) {
          if (Math.hypot(b.x-e.x, b.y-e.y) < 18) {
            e.hp -= b.dmg;
            // Chain lightning: arc to up to 3 nearby enemies
            if (b.chain) {
              const hitSet = new Set<Enemy>([e]);
              const points: V[] = [{ x: b.x, y: b.y }, { x: e.x, y: e.y }];
              let from: Enemy = e;
              for (let k = 0; k < 3; k++) {
                let next: Enemy | null = null, nd = 160*160;
                for (const en2 of s.enemies) {
                  if (en2.hp <= 0 || hitSet.has(en2)) continue;
                  const dd = (en2.x-from.x)*(en2.x-from.x) + (en2.y-from.y)*(en2.y-from.y);
                  if (dd < nd) { nd = dd; next = en2; }
                }
                if (!next) break;
                hitSet.add(next);
                points.push({ x: next.x, y: next.y });
                next.hp -= Math.max(1, b.dmg - 1);
                spawnParticles(s, next.x, next.y, "#ff3df0", 5);
                if (next.hp <= 0) {
                  s.combo++; s.comboT = 90;
                  onStat.current!("combo", 1);
                  onScore.current!(100 + s.combo*10); onStat.current!("enemies", 1);
                }
                from = next;
              }
              s.chains.push({ points, life: 12 });
            }
            b.life = 0;
            spawnParticles(s, e.x, e.y, level.enemyColor, 6);
            if (e.hp <= 0) {
              s.combo++; s.comboT = 90;
              onStat.current!("combo", 1);
              const bonus = 100 + s.combo*10;
              onScore.current!(bonus); onStat.current!("enemies", 1);
              spawnParticles(s, e.x, e.y, "#fff176", 16);
              if (s.combo >= 3) sfx("combo");
              sfx("hit");
            }
          }
        }
      }
      s.enemies = s.enemies.filter((e: Enemy) => e.hp > 0);

      // Powerups — spawn up to 3 per level, randomly over time
      if (!s.bossDefeated) {
        s.powerupCd--;
        if (s.powerupCd <= 0 && s.powerupsSpawned < 3 && s.powerups.length < 2) {
          s.powerupCd = 480 + Math.floor(Math.random()*240);
          s.powerupsSpawned++;
          const kinds: PowerupKind[] = ["heal","rapid","shield","double","ammo"];
          const kind = kinds[Math.floor(Math.random()*kinds.length)];
          s.powerups.push({
            x: 60 + Math.random()*(W-120),
            y: 60 + Math.random()*(H-120),
            kind, t: 0,
          });
        }
      }
      for (const pu of s.powerups) pu.t++;
      s.powerups = s.powerups.filter((pu: Powerup) => {
        if (Math.hypot(pu.x-p.x, pu.y-p.y) < 20) {
          if (pu.kind === "heal") p.hp = Math.min(3, p.hp + 1);
          else if (pu.kind === "rapid") s.buffs.rapid = 480;
          else if (pu.kind === "shield") { s.buffs.shield = 360; p.iframes = 360; }
          else if (pu.kind === "double") s.buffs.double = 480;
          else if (pu.kind === "ammo") s.ammo += 25;
          spawnParticles(s, pu.x, pu.y, powerupColor(pu.kind), 22);
          onScore.current!(40);
          sfx("atom");
          return false;
        }
        return pu.t < 1200; // despawn after 20s
      });

      // Atoms
      for (const a of s.atoms) {
        if (a.taken) continue;
        a.pulse += 0.1;
        if (Math.hypot(a.x-p.x, a.y-p.y) < 20) {
          a.taken = true; s.atomsCollected++;
          s.ammo += 5; onScore.current!(50); onStat.current!("atoms", 1);
          spawnParticles(s, a.x, a.y, "#0ff", 20);
          sfx("atom");
          if (s.atomsCollected >= 8 && !s.unlimited) {
            s.unlimited = true; sfx("unlimited"); s.shake = 6;
          }
        }
      }

      // Portal appears after enemies cleared — player must enter it to start boss
      if (!s.practice && s.enemies.length === 0 && !s.boss && !s.bossDefeated && !s.portal) {
        s.portal = { x: W/2, y: H/2, t: 0 };
      }
      if (s.portal && !s.boss) {
        s.portal.t++;
        if (Math.hypot(s.portal.x - p.x, s.portal.y - p.y) < 32) {
          s.boss = { x: W/2, y: 80, hp: level.boss.hp, maxHp: level.boss.hp, phase: 0, cd: 120, t: 0, introT: 120 };
          s.portal = null;
          spawnParticles(s, p.x, p.y, "#22e0d0", 30);
          sfx("boss");
        }
      }

      if (s.boss) {
        const b = s.boss;
        if (b.introT > 0) { b.introT--; }
        else {
          b.t++;
          // movement
          b.x += Math.sin(b.t * 0.02) * level.boss.speed * 1.5;
          b.y = 80 + Math.sin(b.t * 0.01) * 20;
          b.x = Math.max(60, Math.min(W-60, b.x));
          b.cd--;
          if (b.cd <= 0) {
            b.cd = b.hp < b.maxHp/2 ? 30 : 50;
            const pat = level.boss.pattern;
            const bullets: Bullet[] = [];
            if (pat === "radial") {
              for (let i=0;i<10;i++) {
                const a = (i/10)*Math.PI*2 + b.t*0.01;
                bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*3, vy:Math.sin(a)*3, dmg:1, life:200 });
              }
            } else if (pat === "aimed") {
              for (let i=-1;i<=1;i++) {
                const a = Math.atan2(p.y-b.y, p.x-b.x) + i*0.2;
                bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*4, vy:Math.sin(a)*4, dmg:1, life:200 });
              }
            } else if (pat === "spiral") {
              for (let i=0;i<3;i++) {
                const a = b.t*0.1 + i*(Math.PI*2/3);
                bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*3.5, vy:Math.sin(a)*3.5, dmg:1, life:200 });
              }
            } else if (pat === "burst") {
              for (let i=0;i<14;i++) {
                const a = (i/14)*Math.PI*2;
                bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*4, vy:Math.sin(a)*4, dmg:1, life:200 });
              }
            } else { // fusion
              for (let i=0;i<6;i++) {
                const a = (i/6)*Math.PI*2 + b.t*0.05;
                bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*4.5, vy:Math.sin(a)*4.5, dmg:1, life:220 });
              }
              const a = Math.atan2(p.y-b.y, p.x-b.x);
              bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*6, vy:Math.sin(a)*6, dmg:2, life:220 });
            }
            s.eBullets.push(...bullets);
          }
          // Per-boss UNIQUE abilities
          const ex = s.bossExtra;
          const pat = level.boss.pattern;
          if (pat === "radial") {
            // Radioactive Slime: leaves toxic puddles (slow eBullets) every ~2s
            ex.minionCd--;
            if (ex.minionCd <= 0) {
              ex.minionCd = 90;
              for (let i=0;i<4;i++) {
                const a = Math.random()*Math.PI*2;
                s.eBullets.push({ x:b.x+Math.cos(a)*30, y:b.y+Math.sin(a)*30, vx:Math.cos(a)*0.6, vy:Math.sin(a)*0.6, dmg:1, life:260 });
              }
            }
          } else if (pat === "aimed") {
            // Molecule Titan: dashes at the player
            ex.dashCd--;
            if (ex.dashCd <= 0) {
              ex.dashCd = 180;
              const a = Math.atan2(p.y-b.y, p.x-b.x);
              b.x += Math.cos(a)*60; b.y += Math.sin(a)*60;
              s.shake = 10;
            }
          } else if (pat === "spiral") {
            // Plasma Robot: sweeping laser beam (telegraphed, then fires)
            ex.beamCd--;
            if (ex.beamCd <= 0 && ex.beamT <= 0) {
              ex.beamCd = 260;
              ex.beamT = 110;             // total
              ex.beamAngle = Math.atan2(p.y - b.y, p.x - b.x); // lock-in angle
            }
            if (ex.beamT > 0) {
              ex.beamT--;
              // first 50f = warning telegraph (no damage), then 60f live beam
              const live = ex.beamT < 60;
              if (live) {
                const a = ex.beamAngle ?? 0;
                const dx = p.x - b.x, dy = p.y - b.y;
                const projLen = dx*Math.cos(a) + dy*Math.sin(a);
                const px2 = b.x + Math.cos(a)*projLen, py2 = b.y + Math.sin(a)*projLen;
                if (projLen > 0 && Math.hypot(px2-p.x, py2-p.y) < 10 && p.iframes <= 0) {
                  p.hp--; p.iframes = 60; s.shake = 10; sfx("hit");
                  if (p.hp <= 0 && !dead) { dead = true; setTimeout(onDeath.current!, 200); }
                }
              }
            }
          } else if (pat === "burst") {
            // Toxic Beast: spawns minion enemies
            ex.minionCd--;
            if (ex.minionCd <= 0 && s.enemies.length < 4) {
              ex.minionCd = 200;
              for (let i=0;i<2;i++) {
                s.enemies.push({
                  x: b.x + (Math.random()-0.5)*40, y: b.y + 40,
                  hp: 1, cd: 60,
                  vx: (Math.random()-0.5)*level.enemySpeed,
                  vy: (Math.random()-0.5)*level.enemySpeed,
                });
              }
            }
          } else { // fusion
            // Final Boss: orbital satellite shots
            ex.minionCd--;
            if (ex.minionCd <= 0) {
              ex.minionCd = 60;
              for (let i=0;i<2;i++) {
                const a = b.t*0.08 + i*Math.PI;
                const ox = b.x + Math.cos(a)*60, oy = b.y + Math.sin(a)*60;
                const aim = Math.atan2(p.y-oy, p.x-ox);
                s.eBullets.push({ x:ox, y:oy, vx:Math.cos(aim)*4.5, vy:Math.sin(aim)*4.5, dmg:1, life:200 });
              }
            }
          }
          // bullets hit boss
          for (const bl of s.bullets) {
            if (Math.hypot(bl.x-b.x, bl.y-b.y) < 50) {
              b.hp -= bl.dmg; bl.life = 0;
              spawnParticles(s, bl.x, bl.y, level.boss.color, 4);
              onScore.current!(20);
              if (b.hp <= 0) {
                spawnParticles(s, b.x, b.y, "#fff176", 60);
                s.shake = 25; s.bossDefeated = true; s.boss = null;
                setTimeout(onComplete.current!, 800);
                break;
              }
            }
          }
          // touch (1 dmg, big iframe window so contact can't double-tap)
          if (Math.hypot(b.x-p.x, b.y-p.y) < 50 && p.iframes<=0) {
            p.hp -= 1; p.iframes = 90; s.shake = 14; sfx("hit");
            if (p.hp <= 0 && !dead) { dead = true; setTimeout(onDeath.current!, 200); }
          }
        }
      }

      // Particles
      s.particles = s.particles.filter((pa: Particle) => {
        pa.x += pa.vx; pa.y += pa.vy; pa.vx *= 0.95; pa.vy *= 0.95; pa.life--;
        return pa.life > 0;
      });

      if (s.shake > 0) s.shake *= 0.85;

      // ---- Render ----
      ctx.save();
      const sk = s.shake|0;
      ctx.translate((Math.random()-0.5)*sk, (Math.random()-0.5)*sk);

      // bg — flat dark navy lab grid
      ctx.fillStyle = "#06182a"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = "rgba(64,224,208,0.22)"; ctx.lineWidth = 1;
      for (let x=0;x<=W;x+=24) { ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,H); ctx.stroke(); }
      for (let y=0;y<=H;y+=24) { ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(W,y+0.5); ctx.stroke(); }
      // bright frame edges
      ctx.strokeStyle = "#22e0d0"; ctx.lineWidth = 3;
      ctx.strokeRect(1.5,1.5,W-3,H-3);

      // atoms — orbital rings around glowing nucleus (no shadow for perf)
      for (const a of s.atoms) {
        if (a.taken) continue;
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.strokeStyle = "#22e0d0"; ctx.lineWidth = 2;
        // two crossed elliptical orbits
        for (let k=0;k<2;k++) {
          ctx.save();
          ctx.rotate(a.pulse*0.6 + k*Math.PI/2);
          ctx.beginPath(); ctx.ellipse(0,0,16,7,0,0,Math.PI*2); ctx.stroke();
          ctx.restore();
        }
        // nucleus
        ctx.fillStyle = "#eafffb"; ctx.fillRect(-4,-4,8,8);
        ctx.fillStyle = "#22e0d0"; ctx.fillRect(-2,-2,4,4);
        ctx.restore();
      }

      // enemies — red 8-bit pixel monsters
      for (const e of s.enemies) {
        const ex = Math.round(e.x), ey = Math.round(e.y);
        ctx.shadowBlur = 0;
        // body
        ctx.fillStyle = "#ff2e3a";
        ctx.fillRect(ex-10, ey-12, 20, 22);
        // ear bumps
        ctx.fillRect(ex-10, ey-14, 4, 2);
        ctx.fillRect(ex+6, ey-14, 4, 2);
        // dark shadow strip
        ctx.fillStyle = "#a8121c";
        ctx.fillRect(ex-10, ey+6, 20, 4);
        // eyes
        ctx.fillStyle = "#fff"; ctx.fillRect(ex-7, ey-6, 5, 5); ctx.fillRect(ex+2, ey-6, 5, 5);
        ctx.fillStyle = "#000"; ctx.fillRect(ex-6, ey-5, 2, 2); ctx.fillRect(ex+3, ey-5, 2, 2);
        // teeth
        ctx.fillStyle = "#fff"; ctx.fillRect(ex-6, ey+1, 12, 4);
        ctx.fillStyle = "#a8121c"; ctx.fillRect(ex-3, ey+1, 2, 4); ctx.fillRect(ex+1, ey+1, 2, 4);
        // hp bar
        ctx.fillStyle = "#000"; ctx.fillRect(ex-10, ey-18, 20, 3);
        ctx.fillStyle = "#39ff14"; ctx.fillRect(ex-10, ey-18, 20*(e.hp/level.enemyHp), 3);
      }

      // portal (waiting room before boss)
      if (s.portal && !s.boss) {
        const px2 = s.portal.x, py2 = s.portal.y, t = s.portal.t;
        ctx.save();
        for (let r = 4; r > 0; r--) {
          const rad = 24 + r*6 + Math.sin(t*0.08 + r)*3;
          ctx.shadowBlur = 20; ctx.shadowColor = "#22e0d0";
          ctx.strokeStyle = `rgba(34,224,208,${0.25*r})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px2, py2, rad, 0, Math.PI*2); ctx.stroke();
        }
        ctx.shadowBlur = 30; ctx.shadowColor = "#b388ff";
        ctx.fillStyle = "#b388ff";
        ctx.beginPath(); ctx.arc(px2, py2, 18, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText("ENTER PORTAL", px2, py2 - 44);
        ctx.fillStyle = "#fff176"; ctx.font = "9px monospace";
        ctx.fillText("→ BOSS ARENA ←", px2, py2 + 50);
        ctx.restore();
      }

      // boss
      if (s.boss) {
        const b = s.boss;
        if (b.introT > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, H/2-30, W, 60);
          ctx.fillStyle = level.boss.color;
          ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
          ctx.shadowBlur = 20; ctx.shadowColor = level.boss.color;
          ctx.fillText(level.boss.intro, W/2, H/2-5);
          ctx.font = "12px monospace";
          ctx.fillText(`▶ ${level.boss.name.toUpperCase()} ◀`, W/2, H/2+18);
          ctx.shadowBlur = 0;
        } else {
          drawBoss(ctx, b, level.boss.pattern, level.boss.color, s.bossExtra);
        }
      }

      // bullets player (shadow disabled for perf — using bright fill instead)
      ctx.fillStyle = level.weapon.color;
      for (const b of s.bullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, level.weapon.size, 0, Math.PI*2); ctx.fill();
      }
      // bullets enemy
      ctx.fillStyle = "#ff2e2e";
      for (const b of s.eBullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
      }

      // particles
      for (const pa of s.particles) {
        ctx.fillStyle = pa.color; ctx.globalAlpha = Math.max(0, pa.life/30);
        ctx.fillRect(pa.x-2, pa.y-2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // player — white pixel scientist with green visor + cyan sword
      const blink = p.iframes>0 && (p.iframes%6<3);
      if (!blink) {
        const px = Math.round(p.x), py = Math.round(p.y);
        ctx.shadowBlur = 0;
        // body
        ctx.fillStyle = "#f5f7fb"; ctx.fillRect(px-10, py-10, 20, 20);
        // shadow underside
        ctx.fillStyle = "#b9c0cc"; ctx.fillRect(px-10, py+6, 20, 4);
        // green visor eyes
        ctx.fillStyle = "#39ff14"; ctx.fillRect(px-6, py-7, 4, 4); ctx.fillRect(px+2, py-7, 4, 4);
        // antenna
        ctx.fillStyle = "#39ff14"; ctx.fillRect(px-1, py-14, 2, 4);
        // sword pointing toward mouse
        const a = Math.atan2(s.mouse.y-py, s.mouse.x-px);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a);
        ctx.fillStyle = "#22e0d0"; ctx.fillRect(8, -2, 18, 4);
        ctx.fillStyle = "#eafffb"; ctx.fillRect(22, -1, 4, 2);
        ctx.restore();
        // hp
        ctx.fillStyle = "#000"; ctx.fillRect(px-15, py-20, 30, 4);
        ctx.fillStyle = "#ff2e2e"; ctx.fillRect(px-15, py-20, 30*(p.hp/3), 4);
      }

      // combo
      if (s.combo >= 3) {
        ctx.fillStyle = "#fff176"; ctx.font = "bold 14px monospace"; ctx.textAlign = "left";
        ctx.shadowBlur = 8; ctx.shadowColor = "#fff176";
        ctx.fillText(`COMBO x${s.combo}!`, 10, 24);
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // Throttle HUD updates to ~10fps to prevent React re-render lag
      if ((s.time & 5) === 0) {
        const next = {
          ammo: s.ammo,
          atomsCollected: s.atomsCollected,
          enemiesLeft: s.enemies.length,
          unlimited: s.unlimited,
          bossActive: !!s.boss && s.boss.introT <= 0,
          bossHp: s.boss?.hp ?? 0,
          bossMax: s.boss?.maxHp ?? 0,
          weapon: level.weapon.name,
        };
        const prev = s.hudCache;
        if (!prev || prev.ammo !== next.ammo || prev.atomsCollected !== next.atomsCollected
            || prev.enemiesLeft !== next.enemiesLeft || prev.unlimited !== next.unlimited
            || prev.bossActive !== next.bossActive || prev.bossHp !== next.bossHp
            || prev.weapon !== next.weapon) {
          s.hudCache = next;
          onHud.current!(next);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cvs.removeEventListener("mousemove", onMove);
      cvs.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      tabIndex={0}
      className="w-full border-4 outline-none"
      style={{ borderColor: "#0ff", boxShadow: "0 0 30px #0ff inset, 0 0 30px #f0f", imageRendering: "pixelated", aspectRatio: `${W}/${H}`, background: "#000", cursor: "crosshair" }}
    />
  );
}

function spawnParticles(s: any, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random()*Math.PI*2, sp = Math.random()*4+1;
    s.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 20+Math.random()*15, color });
  }
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; t: number; hp: number; maxHp: number },
  pattern: "radial" | "aimed" | "spiral" | "burst" | "fusion",
  color: string,
  ex: { beamT: number; beamAngle?: number },
) {
  const x = Math.round(b.x), y = Math.round(b.y), t = b.t;
  ctx.save();
  if (pattern === "radial") {
    // Radioactive Slime: blobby green slime with bubbling drips
    ctx.shadowBlur = 30; ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i=0;i<24;i++){
      const a=(i/24)*Math.PI*2;
      const r=42 + Math.sin(t*0.15 + i)*4;
      const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r*0.85;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1a4a0a";
    ctx.fillRect(x-22,y-6,10,10); ctx.fillRect(x+12,y-6,10,10);
    ctx.fillStyle = "#fff"; ctx.fillRect(x-19,y-3,4,4); ctx.fillRect(x+15,y-3,4,4);
    // drips
    ctx.fillStyle = color;
    for (let i=0;i<3;i++){
      const dx = x-30+i*30, dy = y+30+Math.sin(t*0.2+i)*4;
      ctx.beginPath(); ctx.arc(dx,dy,5,0,Math.PI*2); ctx.fill();
    }
  } else if (pattern === "aimed") {
    // Molecule Titan: cluster of 3 bonded atoms
    const offs = [[-30,0],[30,0],[0,-25]];
    ctx.strokeStyle = "#fff176"; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x+offs[0][0], y+offs[0][1]); ctx.lineTo(x+offs[1][0], y+offs[1][1]);
    ctx.moveTo(x+offs[0][0], y+offs[0][1]); ctx.lineTo(x+offs[2][0], y+offs[2][1]);
    ctx.moveTo(x+offs[1][0], y+offs[1][1]); ctx.lineTo(x+offs[2][0], y+offs[2][1]);
    ctx.stroke();
    ctx.shadowBlur = 25; ctx.shadowColor = color;
    for (let i=0;i<3;i++){
      ctx.fillStyle = i===0?"#7df9ff":i===1?color:"#b388ff";
      ctx.beginPath(); ctx.arc(x+offs[i][0], y+offs[i][1], 22+Math.sin(t*0.1+i)*2, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle="#000";
    ctx.fillRect(x-2,y-2,6,6);
  } else if (pattern === "spiral") {
    // Plasma Robot: square mech with antenna + sweeping beam
    ctx.shadowBlur = 20; ctx.shadowColor = color;
    ctx.fillStyle = "#1a1a2a"; ctx.fillRect(x-40,y-30,80,60);
    ctx.fillStyle = color; ctx.fillRect(x-36,y-26,72,52);
    ctx.fillStyle = "#0a0a1a"; ctx.fillRect(x-28,y-18,56,20);
    ctx.fillStyle = "#39ff14"; ctx.fillRect(x-22,y-14,12,12); ctx.fillRect(x+10,y-14,12,12);
    ctx.fillStyle = "#fff"; ctx.fillRect(x-18,y-10,4,4); ctx.fillRect(x+14,y-10,4,4);
    ctx.fillStyle = "#ff2e2e"; ctx.fillRect(x-30,y+8,60,6);
    ctx.fillStyle = "#fff176"; ctx.fillRect(x-2,y-40,4,12);
    ctx.fillRect(x-4,y-44,8,4);
    ctx.shadowBlur = 0;
    if (ex.beamT > 0) {
      const live = ex.beamT < 60;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(ex.beamAngle ?? 0);
      if (!live) {
        // warning telegraph — thin dashed orange line
        ctx.fillStyle = "rgba(255,180,40,0.35)";
        ctx.fillRect(0,-1.5, 700, 3);
      } else {
        ctx.fillStyle = "rgba(255,46,46,0.35)";
        ctx.fillRect(0,-8, 700, 16);
        ctx.fillStyle = "#ff2e2e";
        ctx.fillRect(0,-3, 700, 6);
      }
      ctx.restore();
    }
  } else if (pattern === "burst") {
    // Toxic Beast: spiky organic blob
    ctx.shadowBlur = 28; ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i=0;i<16;i++){
      const a = (i/16)*Math.PI*2;
      const r = (i%2===0?52:30) + Math.sin(t*0.2+i)*3;
      const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#2a0010";
    ctx.beginPath(); ctx.arc(x,y,22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff176";
    ctx.fillRect(x-12,y-6,8,8); ctx.fillRect(x+4,y-6,8,8);
    ctx.fillStyle = "#000"; ctx.fillRect(x-9,y-3,3,3); ctx.fillRect(x+7,y-3,3,3);
    ctx.fillStyle = "#fff"; ctx.fillRect(x-10,y+6,20,4);
  } else {
    // Fusion final boss: pulsing star with orbiting satellites
    const pulse = 1 + Math.sin(t*0.15)*0.08;
    ctx.shadowBlur = 40; ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i=0;i<10;i++){
      const a = (i/10)*Math.PI*2 - Math.PI/2;
      const r = (i%2===0?50:22)*pulse;
      const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 50; ctx.shadowColor = "#fff";
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x,y,16*pulse,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // satellites
    for (let i=0;i<2;i++){
      const a = t*0.08 + i*Math.PI;
      const sx = x+Math.cos(a)*60, sy = y+Math.sin(a)*60;
      ctx.fillStyle = "#ff2e2e";
      ctx.beginPath(); ctx.arc(sx,sy,8,0,Math.PI*2); ctx.fill();
    }
  }

  // HP bar (always)
  ctx.fillStyle = "#000"; ctx.fillRect(x-50, y-60, 100, 6);
  ctx.fillStyle = "#ff2e2e"; ctx.fillRect(x-50, y-60, 100*(b.hp/b.maxHp), 6);
  ctx.restore();
}
