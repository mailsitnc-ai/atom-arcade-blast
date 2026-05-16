import { useEffect, useRef, useState, useCallback } from "react";
import { LEVELS } from "./game/levels";
import LearningScreen from "./game/LearningScreen";
import QuizScreen from "./game/QuizScreen";
import { sfx } from "./game/sound";
import { loadLB, saveLB, type LBEntry } from "./game/leaderboard";

type Phase = "menu" | "learn-intro" | "quiz" | "play" | "learn-recap" | "gameover" | "leaderboard" | "victory" | "boss-select" | "boss-practice";
type V = { x: number; y: number };
type Bullet = V & { vx: number; vy: number; dmg: number; life: number };
type PBullet = Bullet & { seek?: boolean; split?: number; trail?: string };
type Enemy = V & { hp: number; cd: number; vx: number; vy: number };
type Atom = V & { taken: boolean; symbol: string; pulse: number };
type Particle = V & { vx: number; vy: number; life: number; color: string };
type Boss = { x: number; y: number; hp: number; maxHp: number; phase: number; cd: number; t: number; introT: number };
type PowerType = "heal" | "shield" | "rapid" | "damage" | "ammo";
type Powerup = V & { kind: PowerType; taken: boolean; pulse: number };
type Pool = V & { life: number; r: number; tick: number; dmg: number };
type Zap = { points: V[]; life: number };
type Blast = V & { r: number; maxR: number; life: number; dmg: number; hit: Set<any> };

const POWER_INFO: Record<PowerType, { color: string; label: string; desc: string }> = {
  heal:   { color: "#ff2e6e", label: "HEAL +1 HP",       desc: "Restored 1 health point" },
  shield: { color: "#7df9ff", label: "SHIELD ACTIVE",    desc: "Invincible for 6 seconds" },
  rapid:  { color: "#39ff14", label: "RAPID FIRE",       desc: "Half cooldown for 6 seconds" },
  damage: { color: "#ff8a00", label: "DAMAGE x2",        desc: "Double damage for 6 seconds" },
  ammo:   { color: "#fff176", label: "+25 AMMO",         desc: "Bonus ammo refilled" },
};

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
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceKey, setPracticeKey] = useState(0);

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
    if (phase === "boss-practice") {
      setPhase("boss-select");
      return;
    }
    setStats(s => ({ ...s, bosses: s.bosses + 1 }));
    if (levelIdx >= LEVELS.length - 1) {
      setPhase("victory");
    } else {
      setPhase("learn-recap");
    }
  };

  const onPlayerDied = () => {
    sfx("die");
    if (phase === "boss-practice") {
      // In practice mode, just restart the same boss without losing lives
      setPracticeKey(k => k + 1);
      return;
    }
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
          {phase === "boss-practice" && (
            <PlayCanvas
              key={`practice-${practiceIdx}-${practiceKey}`}
              level={LEVELS[practiceIdx]}
              practice
              onComplete={onCompleteRef}
              onDeath={onDeathRef}
              onScore={onScoreRef}
              onStat={onStatRef}
              onHud={onHudRef}
            />
          )}
          {phase === "menu" && (
            <Menu onStart={startGame} onLB={() => setPhase("leaderboard")} onPractice={() => setPhase("boss-select")} lb={lb} />
          )}
          {phase === "boss-select" && (
            <BossSelect
              onPick={(i: number) => { setPracticeIdx(i); setPracticeKey(k => k + 1); setPhase("boss-practice"); }}
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
      <div className="flex gap-3 mb-6 flex-wrap justify-center">
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

function BossSelect({ onPick, onBack }: { onPick: (i: number) => void; onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-20 crt overflow-auto p-4"
      style={{ background: "radial-gradient(circle, #2a0a55, #07020f 80%)" }}>
      <h2 className="neon text-2xl text-center mb-1" style={{ color: "#ff6ec7" }}>⚔ BOSS PRACTICE ⚔</h2>
      <p className="text-[10px] text-center opacity-70 mb-4">No lives lost · Unlimited ammo · Master each boss</p>
      <div className="max-w-xl mx-auto grid gap-2">
        {LEVELS.map((lv, i) => (
          <button key={i} onClick={() => onPick(i)}
            className="text-left p-3 border-2 hover:scale-[1.02] transition flex items-center gap-3"
            style={{ borderColor: lv.boss.color, boxShadow: `0 0 12px ${lv.boss.color}80`, color: "#e6f7ff" }}>
            <div className="text-2xl" style={{ color: lv.boss.color, textShadow: `0 0 8px ${lv.boss.color}` }}>
              L{i+1}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold" style={{ color: lv.boss.color }}>{lv.boss.name}</div>
              <div className="text-[10px] opacity-70">{lv.boss.intro}</div>
            </div>
            <div className="text-[10px]" style={{ color: "#fff176" }}>HP {lv.boss.hp}</div>
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-center"><NeonBtn color="#0ff" onClick={onBack}>← BACK</NeonBtn></div>
    </div>
  );
}

// ============== GAME PLAY CANVAS ==============

function PlayCanvas({ level, practice = false, onComplete, onDeath, onScore, onStat, onHud }: {
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
    const enemyCount = practice ? 0 : 8;
    for (let i = 0; i < enemyCount; i++) {
      enemies.push({
        x: 80 + Math.random()*(W-160),
        y: 60 + Math.random()*(H-120),
        hp: level.enemyHp, cd: Math.random()*60,
        vx: (Math.random()-0.5)*level.enemySpeed,
        vy: (Math.random()-0.5)*level.enemySpeed,
      });
    }
    const atoms: Atom[] = [];
    const atomCount = practice ? 0 : 8;
    for (let i = 0; i < atomCount; i++) {
      atoms.push({
        x: 60 + Math.random()*(W-120),
        y: 60 + Math.random()*(H-120),
        taken: false, symbol: SYMBOLS[i], pulse: Math.random()*Math.PI*2,
      });
    }
    // Spawn 3 random powerups (none in practice — unlimited ammo + invuln-restart already)
    const powerups: Powerup[] = [];
    if (!practice) {
      const kinds: PowerType[] = ["heal","shield","rapid","damage","ammo"];
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      for (let i = 0; i < 3; i++) {
        powerups.push({
          x: 80 + Math.random()*(W-160),
          y: 80 + Math.random()*(H-160),
          kind: kinds[i], taken: false, pulse: Math.random()*Math.PI*2,
        });
      }
    }
    stateRef.current = {
      player: { x: 30, y: H/2, hp: 3, iframes: 0 },
      bullets: [] as Bullet[],
      eBullets: [] as Bullet[],
      enemies, atoms,
      powerups,
      pools: [] as Pool[],
      zaps: [] as Zap[],
      blasts: [] as Blast[],
      buffs: { rapid: 0, damage: 0, shield: 0 },
      banner: null as null | { text: string; sub: string; color: string; t: number },
      particles: [] as Particle[],
      ammo: practice ? 999 : 10, unlimited: practice, atomsCollected: practice ? 8 : 0,
      keys: {} as Record<string, boolean>,
      mouse: { x: W/2, y: 0, down: false },
      boss: practice
        ? { x: W/2, y: 80, hp: level.boss.hp, maxHp: level.boss.hp, phase: 0, cd: 120, t: 0, introT: 120 }
        : (null as Boss | null),
      bossDefeated: false,
      portal: null as { x: number; y: number; t: number } | null,
      bossExtra: { dashCd: 0, minionCd: 0, beamCd: 0, beamT: 0, beamAngle: 0 },
      shake: 0, comboT: 0, combo: 0,
      lastShot: 0, time: 0,
      practice,
    };
  }, [level.id, practice]);

  const fire = useCallback(() => {
    const s = stateRef.current; if (!s) return;
    let cooldown = level.id === 2 ? 260 : level.id === 3 ? 320 : level.id === 4 ? 220 : level.id === 5 ? 280 : 140;
    if (s.buffs?.rapid > 0) cooldown = Math.floor(cooldown * 0.5);
    if (s.lastShot && performance.now() - s.lastShot < cooldown) return;
    const ammoCost = [1, 2, 2, 3, 4][level.id - 1] ?? 1;
    if (!s.unlimited && s.ammo < ammoCost) return;
    s.lastShot = performance.now();
    if (!s.unlimited) s.ammo -= ammoCost;
    const px = s.player.x, py = s.player.y;
    const dx = s.mouse.x - px, dy = s.mouse.y - py;
    const d = Math.hypot(dx,dy) || 1;
    const aim = Math.atan2(dy, dx);
    const sp = level.weapon.speed;
    const baseDmg = level.weapon.damage + Math.floor(s.atomsCollected/3);
    const dmg = s.buffs?.damage > 0 ? baseDmg * 2 : baseDmg;
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
      case 3: { // CORROSIVE ACID POOL: drop a lingering puddle at the mouse position
        const tx = Math.max(20, Math.min(W-20, s.mouse.x));
        const ty = Math.max(20, Math.min(H-20, s.mouse.y));
        s.pools.push({ x: tx, y: ty, r: 36, life: 180, tick: 0, dmg });
        spawnParticles(s, tx, ty, "#39ff14", 10);
        break;
      }
      case 4: { // CHAIN LIGHTNING: instant zap that arcs between up to 5 nearest targets
        const targets: { x: number; y: number; hit: (d: number) => void }[] = [];
        for (const e of s.enemies) if (e.hp > 0) targets.push({ x: e.x, y: e.y, hit: (d: number) => { e.hp -= d; spawnParticles(s, e.x, e.y, "#ff3df0", 6); } });
        if (s.boss) {
          const bs = s.boss;
          targets.push({ x: bs.x, y: bs.y, hit: (d: number) => { bs.hp -= d; spawnParticles(s, bs.x, bs.y, "#ff3df0", 4); onScore.current!(20); } });
        }
        if (targets.length === 0) {
          // fallback ranged bolt
          s.bullets.push(mk(Math.cos(aim)*sp, Math.sin(aim)*sp, { life: 60 }));
          break;
        }
        const points: V[] = [{ x: px, y: py }];
        let cur = { x: px, y: py };
        const used = new Set<number>();
        const maxJumps = 5;
        for (let j = 0; j < maxJumps; j++) {
          let bestI = -1, bestD = j === 0 ? 99999 : 130*130;
          for (let i = 0; i < targets.length; i++) {
            if (used.has(i)) continue;
            const t = targets[i];
            const dd = (t.x-cur.x)*(t.x-cur.x) + (t.y-cur.y)*(t.y-cur.y);
            if (dd < bestD) { bestD = dd; bestI = i; }
          }
          if (bestI < 0) break;
          used.add(bestI);
          targets[bestI].hit(dmg);
          points.push({ x: targets[bestI].x, y: targets[bestI].y });
          cur = points[points.length - 1];
        }
        s.zaps.push({ points, life: 14 });
        break;
      }
      case 5: { // FUSION NOVA: a heavy slow orb that detonates into a giant AoE blast on impact
        s.bullets.push(mk(Math.cos(aim)*sp*0.55, Math.sin(aim)*sp*0.55, { life: 110, split: 1 }));
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
        // Fusion Nova orb: detonate into AoE blast when life expires (only if it didn't already explode)
        if (b.split && b.life <= 0) {
          s.blasts.push({ x: b.x, y: b.y, r: 8, maxR: 95, life: 22, dmg: b.dmg + 2, hit: new Set() });
          spawnParticles(s, b.x, b.y, "#fff176", 28);
          s.shake = 10;
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

      // ---- Acid Pools (L3) ----
      s.pools = s.pools.filter((pl: Pool) => {
        pl.life--;
        pl.tick++;
        if (pl.tick % 12 === 0) {
          for (const e of s.enemies) {
            if (e.hp > 0 && Math.hypot(e.x-pl.x, e.y-pl.y) < pl.r) {
              e.hp -= pl.dmg;
              spawnParticles(s, e.x, e.y, "#39ff14", 3);
              if (e.hp <= 0) {
                s.combo++; s.comboT = 90;
                onStat.current!("combo", 1);
                onScore.current!(100 + s.combo*10);
                onStat.current!("enemies", 1);
                spawnParticles(s, e.x, e.y, "#fff176", 12);
              }
            }
          }
          if (s.boss && Math.hypot(s.boss.x-pl.x, s.boss.y-pl.y) < pl.r + 30) {
            s.boss.hp -= pl.dmg;
            onScore.current!(15);
            spawnParticles(s, pl.x, pl.y, "#39ff14", 3);
            if (s.boss.hp <= 0 && !s.bossDefeated) {
              spawnParticles(s, s.boss.x, s.boss.y, "#fff176", 60);
              s.shake = 25; s.bossDefeated = true; s.boss = null;
              setTimeout(onComplete.current!, 800);
            }
          }
        }
        return pl.life > 0;
      });

      // ---- Chain Lightning Zaps (L4) — visual decay only, dmg applied on cast ----
      s.zaps = s.zaps.filter((z: Zap) => { z.life--; return z.life > 0; });

      // ---- Fusion Nova Blasts (L5) ----
      s.blasts = s.blasts.filter((bl: Blast) => {
        bl.life--;
        bl.r = bl.r + (bl.maxR - bl.r) * 0.25;
        for (const e of s.enemies) {
          if (e.hp <= 0 || bl.hit.has(e)) continue;
          if (Math.hypot(e.x-bl.x, e.y-bl.y) < bl.r) {
            bl.hit.add(e); e.hp -= bl.dmg;
            spawnParticles(s, e.x, e.y, "#fff176", 6);
            if (e.hp <= 0) {
              s.combo++; s.comboT = 90;
              onStat.current!("combo", 1);
              onScore.current!(100 + s.combo*10);
              onStat.current!("enemies", 1);
            }
          }
        }
        if (s.boss && !bl.hit.has(s.boss) && Math.hypot(s.boss.x-bl.x, s.boss.y-bl.y) < bl.r + 30) {
          bl.hit.add(s.boss); s.boss.hp -= bl.dmg; onScore.current!(40);
          spawnParticles(s, bl.x, bl.y, "#fff176", 8);
          if (s.boss.hp <= 0 && !s.bossDefeated) {
            spawnParticles(s, s.boss.x, s.boss.y, "#fff176", 60);
            s.shake = 25; s.bossDefeated = true; s.boss = null;
            setTimeout(onComplete.current!, 800);
          }
        }
        return bl.life > 0;
      });

      // ---- Powerups ----
      for (const pu of s.powerups) {
        if (pu.taken) continue;
        pu.pulse += 0.12;
        if (Math.hypot(pu.x-p.x, pu.y-p.y) < 22) {
          pu.taken = true;
          const info = POWER_INFO[pu.kind as PowerType];
          if (pu.kind === "heal") p.hp = Math.min(3, p.hp + 1);
          else if (pu.kind === "shield") s.buffs.shield = 360;
          else if (pu.kind === "rapid") s.buffs.rapid = 360;
          else if (pu.kind === "damage") s.buffs.damage = 360;
          else if (pu.kind === "ammo") s.ammo += 25;
          s.banner = { text: info.label, sub: info.desc, color: info.color, t: 150 };
          spawnParticles(s, pu.x, pu.y, info.color, 24);
          sfx("atom");
          onScore.current!(75);
        }
      }

      // ---- Buffs ----
      if (s.buffs.rapid > 0) s.buffs.rapid--;
      if (s.buffs.damage > 0) s.buffs.damage--;
      if (s.buffs.shield > 0) { s.buffs.shield--; if (p.iframes < 6) p.iframes = 6; }
      if (s.banner) { s.banner.t--; if (s.banner.t <= 0) s.banner = null; }

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
      if (s.enemies.length === 0 && !s.boss && !s.bossDefeated && !s.portal) {
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
            b.cd = b.hp < b.maxHp/2 ? 22 : 38;
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
      // acid pools (under bullets)
      for (const pl of s.pools) {
        const a = Math.min(1, pl.life/40);
        ctx.fillStyle = `rgba(57,255,20,${0.18*a})`;
        ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = `rgba(57,255,20,${0.7*a})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + Math.sin(pl.tick*0.2)*2, 0, Math.PI*2); ctx.stroke();
        // bubbles
        ctx.fillStyle = `rgba(180,255,140,${0.6*a})`;
        for (let i=0;i<3;i++){
          const ang = pl.tick*0.05 + i*2;
          ctx.beginPath(); ctx.arc(pl.x+Math.cos(ang)*pl.r*0.5, pl.y+Math.sin(ang)*pl.r*0.5, 3, 0, Math.PI*2); ctx.fill();
        }
      }
      // fusion blasts (expanding rings)
      for (const bl of s.blasts) {
        const a = Math.max(0, bl.life/22);
        ctx.strokeStyle = `rgba(255,241,118,${a})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = `rgba(255,241,118,${0.18*a})`;
        ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = level.weapon.color;
      for (const b of s.bullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, level.weapon.size, 0, Math.PI*2); ctx.fill();
      }
      // chain lightning zaps
      for (const z of s.zaps) {
        const a = Math.max(0, z.life/14);
        ctx.strokeStyle = `rgba(255,61,240,${a})`; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i=0;i<z.points.length;i++){
          const pt = z.points[i];
          // jitter
          const jx = pt.x + (i===0||i===z.points.length-1 ? 0 : (Math.random()-0.5)*8);
          const jy = pt.y + (i===0||i===z.points.length-1 ? 0 : (Math.random()-0.5)*8);
          if (i===0) ctx.moveTo(jx, jy); else ctx.lineTo(jx, jy);
        }
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1;
        ctx.stroke();
      }
      // powerups
      for (const pu of s.powerups) {
        if (pu.taken) continue;
        const info = POWER_INFO[pu.kind as PowerType];
        const r = 12 + Math.sin(pu.pulse)*2;
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.rotate(pu.pulse*0.3);
        ctx.fillStyle = info.color;
        ctx.beginPath();
        for (let i=0;i<6;i++){
          const a = (i/6)*Math.PI*2;
          const rr = i%2===0 ? r : r*0.55;
          const px = Math.cos(a)*rr, py = Math.sin(a)*rr;
          if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#000"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        const letter = pu.kind === "heal" ? "+" : pu.kind === "shield" ? "S" : pu.kind === "rapid" ? "R" : pu.kind === "damage" ? "D" : "A";
        ctx.fillText(letter, pu.x, pu.y + 4);
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

      // shield ring around player
      if (s.buffs.shield > 0) {
        ctx.strokeStyle = `rgba(125,249,255,${0.5 + 0.4*Math.sin(s.time*0.3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI*2); ctx.stroke();
      }

      // active buff icons (right side)
      const buffList: { k: PowerType; t: number }[] = [];
      if (s.buffs.shield > 0) buffList.push({ k: "shield", t: s.buffs.shield });
      if (s.buffs.rapid > 0)  buffList.push({ k: "rapid",  t: s.buffs.rapid });
      if (s.buffs.damage > 0) buffList.push({ k: "damage", t: s.buffs.damage });
      buffList.forEach((bf, i) => {
        const info = POWER_INFO[bf.k];
        const bx = W - 18, by = 18 + i*22;
        ctx.fillStyle = info.color;
        ctx.fillRect(bx-10, by-8, 20, 16);
        ctx.fillStyle = "#000"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        const letter = bf.k === "shield" ? "S" : bf.k === "rapid" ? "R" : "D";
        ctx.fillText(letter, bx, by + 3);
        // timer bar
        ctx.fillStyle = info.color; ctx.fillRect(bx-10, by+9, 20*(bf.t/360), 2);
      });

      // banner (powerup pickup announcement)
      if (s.banner) {
        const a = Math.min(1, s.banner.t / 30);
        ctx.fillStyle = `rgba(0,0,0,${0.7*a})`;
        ctx.fillRect(W/2 - 160, 40, 320, 50);
        ctx.strokeStyle = s.banner.color; ctx.lineWidth = 2;
        ctx.strokeRect(W/2 - 160, 40, 320, 50);
        ctx.fillStyle = s.banner.color; ctx.textAlign = "center";
        ctx.font = "bold 16px monospace";
        ctx.fillText(s.banner.text, W/2, 62);
        ctx.fillStyle = "#fff"; ctx.font = "10px monospace";
        ctx.fillText(s.banner.sub, W/2, 80);
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
