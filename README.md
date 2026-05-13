# Atom Arcade Blast

A retro-style chemistry-themed arcade shooter game built with React, TanStack Start, and Canvas rendering.

![Atom Arcade Blast](screenshot.png)

## Overview

Atom Arcade Blast is an educational arcade game that combines chemistry learning with fast-paced shooting action. Players battle through 5 chemistry-themed levels, collecting atoms, evolving weapons, and defeating mutated bosses while learning about elements and chemical concepts.

## Features

- **5 Challenging Levels**: Each level introduces new chemistry concepts and gameplay mechanics
- **Retro Pixel Art Style**: Authentic 8-bit inspired visuals with CRT screen effects
- **Chemistry Education**: Learn element symbols, atomic structure, and chemical properties through gameplay
- **Progressive Weapon System**: Collect atoms to unlock and upgrade your weapon arsenal
- **Boss Battles**: Five unique boss encounters with distinct attack patterns
- **Leaderboard System**: Save and compete for high scores
- **Responsive Design**: Playable on desktop and mobile devices
- **Sound Effects**: Immersive retro audio feedback for actions and events

## Gameplay

### Controls
- **WASD / Arrow Keys**: Move your scientist character
- **Mouse / Spacebar**: Shoot your current weapon
- **Mouse Movement**: Aim your weapon

### Game Flow
1. **Main Menu**: Start new game or view leaderboard
2. **Learning Screen**: Brief chemistry lesson for the current level
3. **Quiz Screen**: Test your knowledge from the learning screen
4. **Play Screen**: Action gameplay where you:
   - Defeat waves of enemy creatures
   - Collect floating atoms (element symbols)
   - Upgrade your weapon by collecting atoms
   - Defeat the level boss to progress
5. **Game Over / Victory**: Save your score to the leaderboard

### Weapon Evolution
As you collect atoms, your weapon evolves through 5 stages:
1. **Straight Beam** (Level 1)
2. **Shield Burst** (Level 2 - 8-directional shots)
3. **Spray Cone** (Level 3 - 5-shot spread)
4. **Homing Chain** (Level 4 - seeking projectiles)
5. **Fusion Orb** (Level 5 - splitting projectile with satellites)

## Technical Stack

- **Framework**: React 19 with TanStack Start
- **Routing**: TanStack Router
- **State Management**: React Hooks (useState, useEffect, useCallback, useRef)
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite
- **Rendering**: HTML5 Canvas for game graphics
- **Form Validation**: React Hook Form with Zod
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Notifications**: Sonner toast notifications
- **Development**: TypeScript, ESLint, Prettier

## Project Structure

```
src/
├── components/
│   ├── ChemistryGame.tsx     # Main game component
│   ├── game/                 # Game logic and screens
│   │   ├── LearningScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   ├── levels.ts         # Level definitions
│   │   ├── leaderboard.ts    # Score persistence
│   │   └── sound.ts          # Audio effects
│   └── ui/                   # Reusable UI components
├── routes/                   # Route definitions
├── lib/                      # Utility functions
├── hooks/                    # Custom React hooks
├── server.ts                 # Server configuration
└── start.ts                  # Application entry point
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- Bun or npm package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/mailsitnc-ai/atom-arcade-blast.git

# Navigate to project directory
cd atom-arcade-blast

# Install dependencies
bun install
# or
npm install
```

### Development

```bash
# Start development server
bun run dev
# or
npm run dev
```

The game will be available at `http://localhost:5173`

### Building for Production

```bash
# Create production build
bun run build
# or
npm run build

# Preview production build
bun run preview
# or
npm run preview
```

## How to Play

1. Visit the game URL (localhost:5173 in development)
2. Click "NEW GAME" or press START on the main menu
3. Complete the learning module for Level 1
4. Pass the quiz to unlock the gameplay section
5. Use WASD to move and mouse/spacebar to shoot
6. Collect all 8 atoms (H, He, Li, C, N, O, Na, Fe) to unlock unlimited ammo
7. Defeat the boss to complete the level
8. Repeat for all 5 levels to achieve victory
9. Enter your initials to save your score to the leaderboard

## Game Levels

1. **Level 1: Hydrogen & Helium** - Learn about the lightest elements
2. **Level 2: Lithium & Carbon** - Explore alkali metals and life's building block
3. **Level 3: Nitrogen & Oxygen** - Discover atmospheric gases
4. **Level 4: Sodium & Iron** - Study metals and their properties
5. **Level 5: Final Challenge** - Comprehensive review of all elements

## Leaderboard

The leaderboard tracks:
- Player initials (up to 8 characters)
- Score
- Highest level reached
- Completion time
- Atoms collected
- Enemies defeated
- Maximum combo achieved
- Lives remaining at completion
- Date achieved

Top 15 scores are displayed, with the highest score highlighted.

## Educational Content

Throughout the game, players learn:
- Element symbols and names
- Basic atomic structure
- Chemical properties of common elements
- Periodic table organization
- Real-world applications of elements

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add: amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by classic arcade shooters
- Built with modern web technologies
- Educational content designed for chemistry learners
- Sound effects created for retro gaming feel
- Special thanks to the open-source community for the libraries used

---

Enjoy playing Atom Arcade Blast and learning chemistry through arcade action! 🔬💥