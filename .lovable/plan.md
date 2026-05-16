## Goal
Add unlockable Custom Weapon Creator (3 lives left) and Custom Level Creator (4 lives left) with cloud-shared community levels (Level 6, 7, 8…).

## 1. Enable Lovable Cloud + schema
Two tables:
- `custom_weapons` — id, name, description, pattern (beam/shield/pool/chain/nova), color, size, speed, damage, ammo_cost, particle_color, particle_count, sfx ("shoot"/"hit"/"boss"/"atom"/"combo"), creator_name, created_at
- `custom_levels` — id, level_number (auto = max+1, starting at 6), title, concept, headline, tagline, bullets[3], analogy, boss_name, boss_color, boss_hp, boss_speed, boss_pattern, boss_intro, enemy_color, enemy_speed, enemy_hp, bg_a, bg_b, weapon_id (FK custom_weapons), creator_name, created_at, plus 3 quiz Q+choices+answer

RLS: public SELECT for both; INSERT allowed to anyone (anon) — no auth gate, just a "Creator Name" text input.

## 2. Win-screen unlock detection
After defeating Level 5, check `livesLeft`:
- 3 → show "🔓 CUSTOM WEAPON CREATOR UNLOCKED" + button to creator
- 4+ → show both unlocks
- Persist unlocks in localStorage so they stay unlocked across runs

Main menu gains two new buttons (greyed-out + lock icon until unlocked): **🔧 Weapon Forge** and **🏗 Level Builder**.

## 3. Weapon Forge (`/components/game/WeaponForge.tsx`)
Form: name, description, pattern dropdown (5 presets matching engine), color picker, size/speed/damage/ammo sliders, particle color + count slider, sfx dropdown. Live preview canvas firing the weapon at a dummy target. Save → inserts row, returns to menu.

## 4. Level Builder (`/components/game/LevelBuilder.tsx`)
Form: concept text, learning bullets, analogy, boss config (name/color/hp/speed/pattern from 5 existing patterns), enemy config, bg colors, weapon (pick from your custom weapons or built-in), 3 quiz questions. Auto-assigns next level_number = max(level_number)+1 starting at 6. Save → row inserted, becomes the next official level for everyone.

## 5. Engine: support custom levels & weapons
- On menu load, fetch `custom_levels` ordered by level_number; concat onto LEVELS array as Level 6+.
- Custom weapons resolved by id; `fire()` switch extended with a `"custom"` branch that maps `pattern` to existing engine paths (beam → case 1, shield → case 2, pool → case 3, chain → case 4, nova → case 5), but using the custom color/size/speed/damage/ammo_cost/particle settings.
- After a custom-level boss is defeated, advance to the next custom level if one exists, else "You're caught up — build the next one!"

## 6. Community sync
Since rows are public-read, every player automatically sees newly-created levels next time they hit the menu. No realtime needed for v1.

## Files
- new: `src/components/game/WeaponForge.tsx`, `src/components/game/LevelBuilder.tsx`, `src/lib/customContent.functions.ts`, `src/lib/customContent.ts` (types + fetch helpers)
- edit: `src/components/ChemistryGame.tsx` (menu unlock buttons, win-screen unlock detection, custom-level loading, custom-weapon firing branch), `src/components/game/levels.ts` (export type used by custom levels)
- migration: create the two tables + RLS

## Out of scope (v1)
- Realtime "new level just dropped" toast
- Voting / rating community levels
- Custom enemies appearance editor (uses base enemy sprite recolored)
- Custom particle effects beyond color + count
- Custom SFX upload (uses built-in sound keys)
