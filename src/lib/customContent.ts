import { supabase } from "@/integrations/supabase/client";
import type { LevelDef } from "@/components/game/levels";

export type WeaponPattern = "beam" | "shield" | "pool" | "chain" | "nova";
export const PATTERN_TO_KIND: Record<WeaponPattern, 1 | 2 | 3 | 4 | 5> = {
  beam: 1, shield: 2, pool: 3, chain: 4, nova: 5,
};
export const PATTERN_LABEL: Record<WeaponPattern, string> = {
  beam: "Straight Beam",
  shield: "360° Shield Burst",
  pool: "Acid Pool (AoE)",
  chain: "Chain Lightning",
  nova: "Fusion Nova (AoE Blast)",
};

export type CustomWeapon = {
  id: string;
  name: string;
  description: string;
  pattern: WeaponPattern;
  color: string;
  size: number;
  speed: number;
  damage: number;
  ammo_cost: number;
  particle_color: string;
  particle_count: number;
  sfx: string;
  creator_name: string;
  created_at: string;
};

export type CustomLevelRow = {
  id: string;
  level_number: number;
  title: string;
  concept: string;
  headline: string;
  tagline: string;
  bullets: string[];
  analogy: string;
  diagram: string;
  boss_name: string;
  boss_color: string;
  boss_hp: number;
  boss_speed: number;
  boss_pattern: "radial" | "aimed" | "spiral" | "burst" | "fusion";
  boss_intro: string;
  enemy_color: string;
  enemy_speed: number;
  enemy_hp: number;
  bg_a: string;
  bg_b: string;
  weapon_id: string | null;
  quiz: { q: string; choices: string[]; answer: number }[];
  creator_name: string;
};

export async function fetchCustomWeapons(): Promise<CustomWeapon[]> {
  const { data, error } = await supabase
    .from("custom_weapons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data ?? []) as CustomWeapon[];
}

export async function fetchCustomLevels(): Promise<{ row: CustomLevelRow; weapon: CustomWeapon | null }[]> {
  const { data: lvls, error } = await supabase
    .from("custom_levels")
    .select("*")
    .order("level_number", { ascending: true });
  if (error) { console.error(error); return []; }
  const weapons = await fetchCustomWeapons();
  const wmap = new Map(weapons.map(w => [w.id, w]));
  return (lvls ?? []).map((r: any) => ({ row: r as CustomLevelRow, weapon: r.weapon_id ? wmap.get(r.weapon_id) ?? null : null }));
}

export async function nextLevelNumber(): Promise<number> {
  const { data } = await supabase
    .from("custom_levels")
    .select("level_number")
    .order("level_number", { ascending: false })
    .limit(1);
  const top = data?.[0]?.level_number ?? 5;
  return Math.max(6, top + 1);
}

export async function insertCustomWeapon(w: Omit<CustomWeapon, "id" | "created_at">): Promise<CustomWeapon | null> {
  const { data, error } = await supabase
    .from("custom_weapons")
    .insert(w)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data as CustomWeapon;
}

export async function insertCustomLevel(r: Omit<CustomLevelRow, "id">): Promise<CustomLevelRow | null> {
  const { data, error } = await supabase
    .from("custom_levels")
    .insert(r)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data as CustomLevelRow;
}

// Convert a community level + weapon into a runtime LevelDef the engine understands.
export function toLevelDef(row: CustomLevelRow, weapon: CustomWeapon | null): LevelDef {
  const w = weapon ?? {
    name: "Default Beam", color: "#7df9ff", size: 6, speed: 9, damage: 2,
    pattern: "beam" as WeaponPattern, ammo_cost: 1, particle_color: "#7df9ff", particle_count: 8, sfx: "shoot",
  } as Partial<CustomWeapon>;
  return {
    id: row.level_number,
    title: row.title,
    concept: row.concept,
    weapon: {
      name: w.name!,
      color: w.color!,
      speed: w.speed!,
      size: w.size!,
      damage: w.damage!,
      kind: PATTERN_TO_KIND[(w.pattern ?? "beam") as WeaponPattern],
      ammoCost: w.ammo_cost!,
      particleColor: w.particle_color!,
      particleCount: w.particle_count!,
      sfx: w.sfx!,
    },
    bgA: row.bg_a, bgB: row.bg_b,
    enemyColor: row.enemy_color, enemySpeed: row.enemy_speed, enemyHp: row.enemy_hp,
    boss: {
      name: row.boss_name, color: row.boss_color, hp: row.boss_hp,
      speed: row.boss_speed, pattern: row.boss_pattern, intro: row.boss_intro,
    },
    quiz: row.quiz?.length ? row.quiz : [
      { q: "Did you read the concept above?", choices: ["Yes!", "No"], answer: 0 },
    ],
    learning: {
      headline: row.headline, tagline: row.tagline,
      bullets: row.bullets, analogy: row.analogy,
      diagram: (row.diagram as any) || "atom",
    },
    isCustom: true,
    creatorName: row.creator_name,
  };
}

// localStorage unlock flags
const KEY = "chemquest-unlocks-v1";
export type Unlocks = { weaponForge: boolean; levelBuilder: boolean };
export function loadUnlocks(): Unlocks {
  if (typeof window === "undefined") return { weaponForge: false, levelBuilder: false };
  try { return { weaponForge: false, levelBuilder: false, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { weaponForge: false, levelBuilder: false }; }
}
export function saveUnlocks(u: Unlocks) {
  localStorage.setItem(KEY, JSON.stringify(u));
}
export function recordVictory(livesLeft: number): { newWeapon: boolean; newLevel: boolean } {
  const cur = loadUnlocks();
  const next = { ...cur };
  let newWeapon = false, newLevel = false;
  if (livesLeft >= 3 && !cur.weaponForge) { next.weaponForge = true; newWeapon = true; }
  if (livesLeft >= 4 && !cur.levelBuilder) { next.levelBuilder = true; newLevel = true; }
  if (newWeapon || newLevel) saveUnlocks(next);
  return { newWeapon, newLevel };
}
