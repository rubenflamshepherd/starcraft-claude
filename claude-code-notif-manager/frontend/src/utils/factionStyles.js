// Maps faction IDs to Tailwind class names.
// All class names are written as full strings so Tailwind's scanner detects them.
// When adding a new game, add its faction colors to @theme in index.css
// and add the faction's style entry here.

const FACTION_STYLES = {
  protoss: {
    bgClass: 'bg-protoss-dark',
    darkerBgClass: 'bg-protoss-darker',
    borderClass: 'border-protoss-primary/20',
    primaryClass: 'text-protoss-primary',
    inputBg: 'bg-protoss-darker',
    inputBorder: 'border-protoss-primary/30',
    inputFocus: 'focus:border-protoss-primary',
    selectedBg: 'bg-protoss-primary/20',
    primaryBg: 'bg-protoss-primary/20',
    primaryHover: 'hover:bg-protoss-primary/40',
    secondaryClass: 'text-protoss-secondary',
    secondaryBg: 'bg-protoss-secondary/20',
    secondaryHover: 'hover:bg-protoss-secondary/40',
    badgeBg: 'bg-protoss-primary/20',
  },
  terran: {
    bgClass: 'bg-terran-dark',
    darkerBgClass: 'bg-terran-darker',
    borderClass: 'border-terran-primary/20',
    primaryClass: 'text-terran-primary',
    inputBg: 'bg-terran-darker',
    inputBorder: 'border-terran-primary/30',
    inputFocus: 'focus:border-terran-primary',
    selectedBg: 'bg-terran-primary/20',
    primaryBg: 'bg-terran-primary/20',
    primaryHover: 'hover:bg-terran-primary/40',
    secondaryClass: 'text-terran-secondary',
    secondaryBg: 'bg-terran-secondary/20',
    secondaryHover: 'hover:bg-terran-secondary/40',
    badgeBg: 'bg-terran-primary/20',
  },
  zerg: {
    bgClass: 'bg-zerg-dark',
    darkerBgClass: 'bg-zerg-darker',
    borderClass: 'border-zerg-primary/20',
    primaryClass: 'text-zerg-primary',
    inputBg: 'bg-zerg-darker',
    inputBorder: 'border-zerg-primary/30',
    inputFocus: 'focus:border-zerg-primary',
    selectedBg: 'bg-zerg-primary/20',
    primaryBg: 'bg-zerg-primary/20',
    primaryHover: 'hover:bg-zerg-primary/40',
    secondaryClass: 'text-zerg-secondary',
    secondaryBg: 'bg-zerg-secondary/20',
    secondaryHover: 'hover:bg-zerg-secondary/40',
    badgeBg: 'bg-zerg-primary/20',
  },
  alliance: {
    bgClass: 'bg-alliance-dark',
    darkerBgClass: 'bg-alliance-darker',
    borderClass: 'border-alliance-primary/20',
    primaryClass: 'text-alliance-primary',
    inputBg: 'bg-alliance-darker',
    inputBorder: 'border-alliance-primary/30',
    inputFocus: 'focus:border-alliance-primary',
    selectedBg: 'bg-alliance-primary/20',
    primaryBg: 'bg-alliance-primary/20',
    primaryHover: 'hover:bg-alliance-primary/40',
    secondaryClass: 'text-alliance-secondary',
    secondaryBg: 'bg-alliance-secondary/20',
    secondaryHover: 'hover:bg-alliance-secondary/40',
    badgeBg: 'bg-alliance-primary/20',
  },
  horde: {
    bgClass: 'bg-horde-dark',
    darkerBgClass: 'bg-horde-darker',
    borderClass: 'border-horde-primary/20',
    primaryClass: 'text-horde-primary',
    inputBg: 'bg-horde-darker',
    inputBorder: 'border-horde-primary/30',
    inputFocus: 'focus:border-horde-primary',
    selectedBg: 'bg-horde-primary/20',
    primaryBg: 'bg-horde-primary/20',
    primaryHover: 'hover:bg-horde-primary/40',
    secondaryClass: 'text-horde-secondary',
    secondaryBg: 'bg-horde-secondary/20',
    secondaryHover: 'hover:bg-horde-secondary/40',
    badgeBg: 'bg-horde-primary/20',
  },
  european: {
    bgClass: 'bg-european-dark',
    darkerBgClass: 'bg-european-darker',
    borderClass: 'border-european-primary/20',
    primaryClass: 'text-european-primary',
    inputBg: 'bg-european-darker',
    inputBorder: 'border-european-primary/30',
    inputFocus: 'focus:border-european-primary',
    selectedBg: 'bg-european-primary/20',
    primaryBg: 'bg-european-primary/20',
    primaryHover: 'hover:bg-european-primary/40',
    secondaryClass: 'text-european-secondary',
    secondaryBg: 'bg-european-secondary/20',
    secondaryHover: 'hover:bg-european-secondary/40',
    badgeBg: 'bg-european-primary/20',
  },
};

const DEFAULT_STYLES = {
  bgClass: 'bg-gray-900',
  darkerBgClass: 'bg-gray-950',
  borderClass: 'border-gray-700/20',
  primaryClass: 'text-gray-200',
  inputBg: 'bg-gray-950',
  inputBorder: 'border-gray-600/30',
  inputFocus: 'focus:border-gray-400',
  selectedBg: 'bg-gray-600/20',
  primaryBg: 'bg-gray-600/20',
  primaryHover: 'hover:bg-gray-600/40',
  secondaryClass: 'text-gray-400',
  secondaryBg: 'bg-gray-600/20',
  secondaryHover: 'hover:bg-gray-600/40',
  badgeBg: 'bg-gray-600/20',
};

export function getFactionStyles(factionId) {
  return FACTION_STYLES[factionId] || DEFAULT_STYLES;
}

export function getDefaultStyles() {
  return DEFAULT_STYLES;
}

// View configs for non-faction views (home, all, recommended)
export const BASE_VIEW_CONFIGS = {
  home: {
    label: 'Home',
    ...DEFAULT_STYLES,
  },
  all: {
    label: 'All',
    ...DEFAULT_STYLES,
  },
  recommended: {
    label: 'Setup',
    bgClass: 'bg-gray-900',
    darkerBgClass: 'bg-gray-950',
    borderClass: 'border-amber-500/20',
    primaryClass: 'text-amber-400',
    inputBg: 'bg-gray-950',
    inputBorder: 'border-amber-500/30',
    inputFocus: 'focus:border-amber-400',
    selectedBg: 'bg-amber-500/20',
    primaryBg: 'bg-amber-500/20',
    primaryHover: 'hover:bg-amber-500/40',
    secondaryClass: 'text-amber-300',
    secondaryBg: 'bg-amber-500/20',
    secondaryHover: 'hover:bg-amber-500/40',
    badgeBg: 'bg-amber-500/20',
  },
};

// Build a complete viewConfig map for a given game
export function buildViewConfig(game) {
  const config = { ...BASE_VIEW_CONFIGS };
  for (const faction of game.factions) {
    const styles = getFactionStyles(faction.id);
    config[faction.id] = {
      label: faction.name,
      ...styles,
    };
  }
  return config;
}
