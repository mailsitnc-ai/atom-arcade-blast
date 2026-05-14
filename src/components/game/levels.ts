export type LevelDef = {
  id: number;
  title: string;
  concept: string;
  weapon: { name: string; color: string; speed: number; size: number; damage: number; ammoCost: number };
  bgA: string;
  bgB: string;
  enemyColor: string;
  enemySpeed: number;
  enemyHp: number;
  boss: {
    name: string;
    color: string;
    hp: number;
    speed: number;
    pattern: "radial" | "aimed" | "spiral" | "burst" | "fusion";
    intro: string;
  };
  quiz: { q: string; choices: string[]; answer: number }[];
  learning: {
    headline: string;
    tagline: string;
    bullets: string[];
    analogy: string;
    diagram: "atom" | "bond" | "ph" | "reaction" | "periodic";
  };
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: "Atomic Structure",
    concept: "Inside the Atom",
    weapon: { name: "Electron Beam (Straight)", color: "#7df9ff", speed: 9, size: 5, damage: 1, ammoCost: 1 },
    bgA: "#0a0628", bgB: "#1a0a4a",
    enemyColor: "#ff6ec7", enemySpeed: 1.2, enemyHp: 3,
    boss: { name: "Radioactive Slime", color: "#7CFC00", hp: 75, speed: 1.5, pattern: "radial", intro: "WARNING: UNSTABLE ISOTOPE" },
    quiz: [
      { q: "Which particle has a positive charge?", choices: ["Electron", "Proton", "Neutron"], answer: 1 },
      { q: "Where are electrons found?", choices: ["In the nucleus", "Orbiting the nucleus", "Inside protons"], answer: 1 },
      { q: "What charge does a neutron carry?", choices: ["Positive", "Negative", "Neutral (none)"], answer: 2 },
    ],
    learning: {
      headline: "ATOMIC STRUCTURE",
      tagline: "Everything is made of atoms.",
      bullets: [
        "Protons (+) live in the nucleus.",
        "Neutrons (0) sit beside protons.",
        "Electrons (-) zip around in orbits.",
      ],
      analogy: "Think of an atom like a tiny solar system: nucleus = sun, electrons = planets.",
      diagram: "atom",
    },
  },
  {
    id: 2,
    title: "Chemical Bonding",
    concept: "How Atoms Connect",
    weapon: { name: "Molecular Shield Burst (360°)", color: "#b388ff", speed: 9, size: 6, damage: 2, ammoCost: 2 },
    bgA: "#0d0233", bgB: "#2a0a55",
    enemyColor: "#ffb86c", enemySpeed: 1.5, enemyHp: 3,
    boss: { name: "Unstable Molecule Titan", color: "#ff5e94", hp: 110, speed: 1.7, pattern: "aimed", intro: "BOND OVERLOAD DETECTED" },
    quiz: [
      { q: "Which bond involves SHARING electrons?", choices: ["Ionic", "Covalent", "Metallic"], answer: 1 },
      { q: "An ionic bond happens when atoms…", choices: ["Share electrons equally", "Transfer electrons", "Ignore each other"], answer: 1 },
      { q: "Metallic bonds are best described as…", choices: ["A sea of free electrons", "Two atoms holding hands", "No electrons at all"], answer: 0 },
    ],
    learning: {
      headline: "CHEMICAL BONDING",
      tagline: "Atoms hold hands to form molecules.",
      bullets: [
        "Ionic bonds: one atom gives an electron.",
        "Covalent bonds: atoms share electrons.",
        "Metallic bonds: a sea of free electrons.",
      ],
      analogy: "Bonds are like LEGO clicks between atoms — sharing or trading bricks.",
      diagram: "bond",
    },
  },
  {
    id: 3,
    title: "Acids & Bases",
    concept: "The pH Scale",
    weapon: { name: "Corrosive Puddles", color: "#39ff14", speed: 7, size: 8, damage: 2, ammoCost: 3 },
    bgA: "#04231a", bgB: "#0a4a2e",
    enemyColor: "#39ff14", enemySpeed: 1.8, enemyHp: 3,
    boss: { name: "Plasma Reactor Robot", color: "#00e5ff", hp: 160, speed: 2.0, pattern: "spiral", intro: "pH CRITICAL — CORROSIVE MODE" },
    quiz: [
      { q: "Pure water has a pH of…", choices: ["1", "7", "14"], answer: 1 },
      { q: "Acids release which ion?", choices: ["H⁺", "OH⁻", "Na⁺"], answer: 0 },
      { q: "A pH of 12 means the substance is…", choices: ["Strongly acidic", "Neutral", "Strongly basic"], answer: 2 },
    ],
    learning: {
      headline: "ACIDS & BASES",
      tagline: "From sour lemons to slippery soap.",
      bullets: [
        "Acids release H+ ions (pH < 7).",
        "Bases release OH- ions (pH > 7).",
        "Neutral water sits at pH 7.",
      ],
      analogy: "pH scale = volume knob: low = sour acid, mid = water, high = soapy base.",
      diagram: "ph",
    },
  },
  {
    id: 4,
    title: "Chemical Reactions",
    concept: "Reactants → Products",
    weapon: { name: "Chain Lightning", color: "#ff3df0", speed: 12, size: 6, damage: 3, ammoCost: 4 },
    bgA: "#22041a", bgB: "#5a0a3a",
    enemyColor: "#ff3df0", enemySpeed: 2.1, enemyHp: 3,
    boss: { name: "Toxic Mutation Beast", color: "#ff2e2e", hp: 220, speed: 2.2, pattern: "burst", intro: "EXOTHERMIC RAGE INCOMING" },
    quiz: [
      { q: "What are the starting materials called?", choices: ["Products", "Reactants", "Catalysts"], answer: 1 },
      { q: "An exothermic reaction…", choices: ["Absorbs energy", "Releases energy", "Does neither"], answer: 1 },
      { q: "In a reaction, atoms are…", choices: ["Created", "Destroyed", "Rearranged"], answer: 2 },
    ],
    learning: {
      headline: "CHEMICAL REACTIONS",
      tagline: "Atoms rearrange into new substances.",
      bullets: [
        "Reactants are what you start with.",
        "Products are what you end up with.",
        "Energy is released or absorbed.",
      ],
      analogy: "Like baking: flour + eggs → cake. The pieces re-arrange into something new.",
      diagram: "reaction",
    },
  },
  {
    id: 5,
    title: "Periodic Table & Fusion",
    concept: "Element Fusion",
    weapon: { name: "Singularity Vortex", color: "#fff176", speed: 6, size: 14, damage: 4, ammoCost: 5 },
    bgA: "#2a1a04", bgB: "#5a3a0a",
    enemyColor: "#fff176", enemySpeed: 2.4, enemyHp: 4,
    boss: { name: "Fusion-Core Final Boss", color: "#ffe600", hp: 320, speed: 2.4, pattern: "fusion", intro: "STELLAR CORE IGNITED" },
    quiz: [
      { q: "Rows on the periodic table are called…", choices: ["Groups", "Periods", "Families"], answer: 1 },
      { q: "Fusion combines small atoms into…", choices: ["Smaller atoms", "Bigger atoms + energy", "Pure light only"], answer: 1 },
      { q: "The Sun mainly fuses…", choices: ["Carbon → Iron", "Hydrogen → Helium", "Oxygen → Neon"], answer: 1 },
    ],
    learning: {
      headline: "PERIODIC TABLE & FUSION",
      tagline: "118 elements. Infinite possibilities.",
      bullets: [
        "Rows = periods (electron shells).",
        "Columns = groups (similar behavior).",
        "Fusion combines small atoms → bigger atoms + ENERGY.",
      ],
      analogy: "The Sun fuses Hydrogen into Helium — that's how stars shine.",
      diagram: "periodic",
    },
  },
];
