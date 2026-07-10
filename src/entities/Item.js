export const ITEM_DEFS = {
  almond_water: {
    id: 'almond_water',
    name: 'Almond Water',
    icon: '\ud83e\uddf9',
    description: 'Bottled water with a faint almond scent. Restores 25 HP.',
    stackable: true,
    maxStack: 4,
    use: (player) => {
      player.heal(25);
    },
  },
  flashlight: {
    id: 'flashlight',
    name: 'Flashlight',
    icon: '\ud83d\udd2e',
    description: 'A heavy-duty flashlight. Illuminates dark areas.',
    stackable: false,
    use: (player) => {
      // Toggle flashlight on/off
    },
  },
  batteries: {
    id: 'batteries',
    name: 'Batteries',
    icon: '\ud83d\udd0b',
    description: 'AA batteries. Used to power the flashlight.',
    stackable: true,
    maxStack: 6,
    use: (player) => {
      // Recharge flashlight
    },
  },
  lighter: {
    id: 'lighter',
    name: 'Lighter',
    icon: '\ud83d\udd25',
    description: 'A simple lighter. Can light dark areas or burn obstacles.',
    stackable: false,
    use: (player) => {
      // Light up area temporarily
    },
  },
  note: {
    id: 'note',
    name: 'Mysterious Note',
    icon: '\ud83d\udcdc',
    description: 'A faded note. It reads: "The exit is not where you think. Follow the hum."',
    stackable: false,
    use: () => {},
  },
  key: {
    id: 'key',
    name: 'Rusty Key',
    icon: '\ud83d\udd11',
    description: 'An old rusted key. It might open something.',
    stackable: false,
    use: () => {},
  },
  medkit: {
    id: 'medkit',
    name: 'Medkit',
    icon: '\u2764\ufe0f',
    description: 'A first aid kit. Restores 50 HP.',
    stackable: false,
    use: (player) => {
      player.heal(50);
    },
  },
};
