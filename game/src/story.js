// The broadcast the player pieces together, one fragment per night cleared,
// plus the per-night tuning of difficulty. The message is the game's spine:
// every decoded signal is progress toward hearing a stranger's whole story.

// One fragment is revealed each night; together they form the full message.
export const FRAGMENTS = [
  'If anyone can hear this —',
  'the storm took the towers, but not the tower keeper.',
  'I have kept this light on every night since.',
  'You are the first voice to answer in nine years.',
  'Stay on this frequency. I am coming home.',
];

// Difficulty for each of the five nights. Speeds are pixels per second,
// spawnEvery is seconds between transmissions, tolerance is the half-height
// in pixels of the tuning window the player must hold to decode a signal.
export const NIGHTS = [
  { quota: 5, speed: 92, spawnEvery: 2.5, tolerance: 28, wispChance: 0.1 },
  { quota: 7, speed: 110, spawnEvery: 2.2, tolerance: 25, wispChance: 0.16 },
  { quota: 8, speed: 128, spawnEvery: 1.95, tolerance: 22, wispChance: 0.22 },
  { quota: 9, speed: 146, spawnEvery: 1.75, tolerance: 20, wispChance: 0.28 },
  { quota: 10, speed: 164, spawnEvery: 1.55, tolerance: 18, wispChance: 0.34 },
];

export const MAX_INTEGRITY = 5;

// The dial is a real FM band: the top of the play field is 108.0 MHz and the
// bottom is 88.0 MHz, so the tuner's height reads as a frequency.
export const FREQ_TOP = 108.0;
export const FREQ_BOTTOM = 88.0;

export function frequencyAt(y, fieldTop, fieldBottom) {
  const t = (y - fieldTop) / (fieldBottom - fieldTop);
  return FREQ_TOP + (FREQ_BOTTOM - FREQ_TOP) * t;
}
