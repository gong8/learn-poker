export const BOT_NAMES = [
  // Classic names
  'Alex', 'Blake', 'Charlie', 'Drew', 'Ellis', 'Finley', 'Gray', 'Harper',
  'Indigo', 'Jordan', 'Kai', 'Lane', 'Morgan', 'Noah', 'Oakley', 'Parker',
  'Quinn', 'River', 'Sage', 'Taylor', 'Uma', 'Val', 'Winter', 'Xander',
  'Yael', 'Zara',
  
  // International names
  'Akira', 'Björn', 'Camila', 'Diego', 'Esme', 'Finn', 'Greta', 'Hugo',
  'Isla', 'Javi', 'Kira', 'Luna', 'Mika', 'Nico', 'Olga', 'Pablo',
  'Quin', 'Rosa', 'Soren', 'Tara', 'Uri', 'Vera', 'Wade', 'Xara',
  'Yuki', 'Zane',

  // Cool/Modern names
  'Ace', 'Blaze', 'Comet', 'Dash', 'Echo', 'Flash', 'Ghost', 'Hunter',
  'Ice', 'Jet', 'Knox', 'Lightning', 'Maverick', 'Nova', 'Onyx', 'Phoenix',
  'Quest', 'Raven', 'Storm', 'Titan', 'Unity', 'Viper', 'Wolf', 'Xtreme',
  'Yonder', 'Zenith',

  // Nature names
  'Aspen', 'Brook', 'Cedar', 'Dawn', 'Ember', 'Forest', 'Gale', 'Heath',
  'Iris', 'Jasper', 'Kelp', 'Leaf', 'Moss', 'North', 'Ocean', 'Pebble',
  'Quartz', 'Rain', 'Sky', 'Thorn', 'Umber', 'Violet', 'Willow', 'Xylem',
  'Yarrow', 'Zephyr',

  // Tech/Sci-Fi names
  'Atom', 'Binary', 'Cipher', 'Delta', 'Electron', 'Flux', 'Gamma', 'Helix',
  'Ion', 'Jinx', 'Krypton', 'Logic', 'Matrix', 'Neon', 'Orbit', 'Pixel',
  'Quantum', 'Radar', 'Synth', 'Techno', 'Upload', 'Vector', 'Warp', 'Xerox',
  'Yottabyte', 'Zero',

  // Short and punchy
  'Bo', 'Cy', 'Dex', 'Eve', 'Fox', 'Gem', 'Hex', 'Ivy',
  'Jay', 'Kit', 'Lex', 'Max', 'Neo', 'Oz', 'Pip', 'Rex',
  'Sam', 'Tux', 'Uri', 'Vex', 'Wiz', 'Xen', 'Zen'
];

const usedNames = new Set<string>();

export function getRandomBotName(): string {
  if (usedNames.size >= BOT_NAMES.length) {
    usedNames.clear();
  }
  
  let name: string;
  do {
    name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  } while (usedNames.has(name));
  
  usedNames.add(name);
  return name;
}

export function resetBotNames(): void {
  usedNames.clear();
}