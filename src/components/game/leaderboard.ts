export type LBEntry = {
  name: string; score: number; level: number; time: number;
  enemies: number; atoms: number; bosses: number; combo: number; livesLeft: number;
  date: number;
};
const KEY = "atom-arcade-leaderboard-v1";
export function loadLB(): LBEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveLB(e: LBEntry) {
  const all = loadLB(); all.push(e);
  all.sort((a,b)=>b.score-a.score);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0,20)));
}
