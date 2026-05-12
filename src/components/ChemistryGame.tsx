import { useEffect, useRef, useState, useCallback } from "react";
import { LEVELS } from "./game/levels";
import LearningScreen from "./game/LearningScreen";
import QuizScreen from "./game/QuizScreen";
import { sfx } from "./game/sound";
import { loadLB, saveLB, type LBEntry } from "./game/leaderboard";

type Phase = "menu" | "learn-intro" | "quiz" | "play" | "learn-recap" | "gameover" | "leaderboard" | "victory";
type V = { x: number; y: number };
type Bullet = V & { vx: number; vy: number; dmg: number; life: number };
type PBullet = Bullet & { seek?: boolean; split?: number; trail?: string };
type Enemy = V & { hp: number; cd: number; vx: number; vy: number };
type Atom = V & { taken: boolean; symbol: string; pulse: number };
type Particle = V & { vx: number; vy: number; life: number; color: string };
type Boss = { x: number; y: number; hp: number; maxHp: number; phase: number; cd: number; t: number; introT: number; specialCd: number; dashT: number };

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
    if (levelIdx >= LEVELS.length - 1) {
      setPhase("victory");
    } else {
      setPhase("learn-recap");
    }
  };

  const onPlayerDied = () => {
    sfx("die");
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
          {phase === "menu" && (
            <Menu onStart={startGame} onLB={() => setPhase("leaderboard")} lb={lb} />
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
              onPass={(c) => { setScore(s => s + c * 75); sfx("win"); setPhase("play"); }}
              onFail={() => { sfx("die"); setPhase("learn-intro"); }}
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

function Menu({ onStart, onLB, lb }: { onStart: () => void; onLB: () => void; lb: LBEntry[] }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center crt p-6"
      style={{ background: "radial-gradient(circle at 50% 30%, #2a0a55, #07020f 70%)" }}>
      <div className="text-6xl md:text-7xl mb-4 neon" style={{ color: "#0ff" }}>⚛</div>
      <h2 className="text-xl md:text-3xl flicker mb-2" style={{ color: "#fff176" }}>PRESS START</h2>
      <p className="text-[10px] md:text-xs mb-6 max-w-md text-center opacity-80">
        Battle through 5 chemistry-themed levels. Collect atoms, evolve weapons, defeat mutated bosses.
      </p>
      <div className="flex gap-3 mb-6">
        <NeonBtn color="#39ff14" onClick={onStart}>▶ NEW GAME</NeonBtn>
        <NeonBtn color="#0ff" onClick={onLB}>★ LEADERBOARD</NeonBtn>
      </div>
      <div className="text-[10px] opacity-70 text-center">
        Top Score: <span style={{color:"#fff176"}}>{lb[0]?.score ?? 0}</span> by {lb[0]?.name ?? "—"}
      </div>
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

function PlayCanvas({ level, onComplete, onDeath, onScore, onStat, onHud }: {
  level: typeof LEVELS[number];
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
    for (let i = 0; i < 8; i++) {
      enemies.push({
        x: 80 + Math.random()*(W-160),
        y: 60 + Math.random()*(H-120),
        hp: level.enemyHp, cd: Math.random()*60,
        vx: (Math.random()-0.5)*level.enemySpeed,
        vy: (Math.random()-0.5)*level.enemySpeed,
      });
    }
    const atoms: Atom[] = [];
    for (let i = 0; i < 8; i++) {
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
      ammo: 10, unlimited: false, atomsCollected: 0,
      keys: {} as Record<string, boolean>,
      mouse: { x: W/2, y: 0, down: false },
      boss: null as Boss | null,
      bossDefeated: false,
      shake: 0, comboT: 0, combo: 0,
      lastShot: 0, time: 0,
    };
  }, [level.id]);

  const fire = useCallback(() => {
    const s = stateRef.current; if (!s) return;
    const cooldown = level.id === 2 ? 260 : level.id === 3 ? 180 : level.id === 5 ? 200 : 140;
    if (s.lastShot && performance.now() - s.lastShot < cooldown) return;
    if (!s.unlimited && s.ammo <= 0) return;
    s.lastShot = performance.now();
    if (!s.unlimited) s.ammo--;
    const px = s.player.x, py = s.player.y;
    const dx = s.mouse.x - px, dy = s.mouse.y - py;
    const d = Math.hypot(dx,dy) || 1;
    const aim = Math.atan2(dy, dx);
    const sp = level.weapon.speed;
    const dmg = level.weapon.damage + Math.floor(s.atomsCollected/3);
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
      case 3: { // spray: 5-bullet cone toward mouse
        for (let i = -2; i <= 2; i++) {
          const a = aim + i * 0.18;
          s.bullets.push(mk(Math.cos(a)*sp, Math.sin(a)*sp, { life: 80 }));
        }
        break;
      }
      case 4: { // homing chain: 3 seeking bullets
        for (let i = -1; i <= 1; i++) {
          const a = aim + i * 0.35;
          s.bullets.push(mk(Math.cos(a)*sp*0.8, Math.sin(a)*sp*0.8, { seek: true, life: 110 }));
        }
        break;
      }
      case 5: { // fusion orb: heavy splitting projectile + 2 orbiters
        s.bullets.push(mk(Math.cos(aim)*sp, Math.sin(aim)*sp, { split: 2, life: 90 }));
        for (let i = 0; i < 2; i++) {
          const a = aim + (i ? Math.PI/2 : -Math.PI/2);
          s.bullets.push(mk(Math.cos(a)*sp*0.6, Math.sin(a)*sp*0.6, { life: 50 }));
        }
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
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.split && b.life === 40) {
          // split into 3 mini-bullets
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(b.vy, b.vx) + i * 0.4;
            newBullets.push({ x: b.x, y: b.y, vx: Math.cos(a)*level.weapon.speed*0.9, vy: Math.sin(a)*level.weapon.speed*0.9, dmg: Math.max(1, b.dmg-1), life: 50 });
          }
          b.split = 0;
        }
        return b.life > 0 && b.x > -10 && b.x < W+10 && b.y > -10 && b.y < H+10;
      });
      if (newBullets.length) s.bullets.push(...newBullets);
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
            e.hp -= b.dmg; b.life = 0;
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

      // Boss spawn after all enemies dead
      if (s.enemies.length === 0 && !s.boss && !s.bossDefeated) {
        s.boss = { x: W/2, y: 80, hp: level.boss.hp, maxHp: level.boss.hp, phase: 0, cd: 120, t: 0, introT: 120 };
        sfx("boss");
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
          // touch
          if (Math.hypot(b.x-p.x, b.y-p.y) < 55 && p.iframes<=0) {
            p.hp -= 2; p.iframes = 70; s.shake = 14; sfx("hit");
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

      // atoms — orbital rings around glowing nucleus
      for (const a of s.atoms) {
        if (a.taken) continue;
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.shadowBlur = 14; ctx.shadowColor = "#22e0d0";
        ctx.strokeStyle = "#22e0d0"; ctx.lineWidth = 2;
        // two crossed elliptical orbits
        for (let k=0;k<2;k++) {
          ctx.save();
          ctx.rotate(a.pulse*0.6 + k*Math.PI/2);
          ctx.beginPath(); ctx.ellipse(0,0,16,7,0,0,Math.PI*2); ctx.stroke();
          ctx.restore();
        }
        // nucleus
        ctx.shadowBlur = 0;
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
          ctx.shadowBlur = 30; ctx.shadowColor = level.boss.color;
          ctx.fillStyle = level.boss.color;
          ctx.beginPath(); ctx.arc(b.x, b.y, 45, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.fillRect(b.x-20, b.y-10, 8,8); ctx.fillRect(b.x+12, b.y-10, 8,8);
          ctx.fillRect(b.x-15, b.y+10, 30, 4);
        }
      }

      // bullets player
      for (const b of s.bullets) {
        ctx.shadowBlur = 14; ctx.shadowColor = level.weapon.color;
        ctx.fillStyle = level.weapon.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, level.weapon.size, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // bullets enemy
      for (const b of s.eBullets) {
        ctx.shadowBlur = 8; ctx.shadowColor = "#ff2e2e";
        ctx.fillStyle = "#ff2e2e";
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
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
