
CREATE TABLE public.custom_weapons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pattern TEXT NOT NULL CHECK (pattern IN ('beam','shield','pool','chain','nova')),
  color TEXT NOT NULL DEFAULT '#7df9ff',
  size INTEGER NOT NULL DEFAULT 6,
  speed INTEGER NOT NULL DEFAULT 9,
  damage INTEGER NOT NULL DEFAULT 2,
  ammo_cost INTEGER NOT NULL DEFAULT 1,
  particle_color TEXT NOT NULL DEFAULT '#ffffff',
  particle_count INTEGER NOT NULL DEFAULT 10,
  sfx TEXT NOT NULL DEFAULT 'shoot',
  creator_name TEXT NOT NULL DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.custom_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  headline TEXT NOT NULL,
  tagline TEXT NOT NULL,
  bullets TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  analogy TEXT NOT NULL DEFAULT '',
  diagram TEXT NOT NULL DEFAULT 'atom',
  boss_name TEXT NOT NULL,
  boss_color TEXT NOT NULL DEFAULT '#ff2e2e',
  boss_hp INTEGER NOT NULL DEFAULT 200,
  boss_speed REAL NOT NULL DEFAULT 2.0,
  boss_pattern TEXT NOT NULL CHECK (boss_pattern IN ('radial','aimed','spiral','burst','fusion')),
  boss_intro TEXT NOT NULL DEFAULT 'NEW THREAT INCOMING',
  enemy_color TEXT NOT NULL DEFAULT '#ff6ec7',
  enemy_speed REAL NOT NULL DEFAULT 2.0,
  enemy_hp INTEGER NOT NULL DEFAULT 4,
  bg_a TEXT NOT NULL DEFAULT '#0a0628',
  bg_b TEXT NOT NULL DEFAULT '#1a0a4a',
  weapon_id UUID REFERENCES public.custom_weapons(id) ON DELETE SET NULL,
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  creator_name TEXT NOT NULL DEFAULT 'Anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX custom_levels_level_number_idx ON public.custom_levels(level_number);

ALTER TABLE public.custom_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view custom weapons"
  ON public.custom_weapons FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create custom weapons"
  ON public.custom_weapons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view custom levels"
  ON public.custom_levels FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create custom levels"
  ON public.custom_levels FOR INSERT
  WITH CHECK (true);
