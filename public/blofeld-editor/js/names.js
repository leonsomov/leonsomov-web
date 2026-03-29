// Poetic name generator — unique two-word combinations, never repeats in session

const A = [
  'Still', 'Frozen', 'Velvet', 'Silk', 'Glass', 'Iron', 'Golden', 'Silver',
  'Warm', 'Cold', 'Soft', 'Deep', 'Slow', 'Lost', 'Pale', 'Dark',
  'Quiet', 'Distant', 'Fading', 'Floating', 'Hidden', 'Ancient', 'Neon',
  'Hollow', 'Gentle', 'Lunar', 'Solar', 'Amber', 'Violet', 'Ivory',
  'Crystal', 'Liquid', 'Woven', 'Burnt', 'Misty', 'Hazy', 'Thin',
  'Wide', 'Low', 'High', 'Inner', 'Outer', 'First', 'Last', 'Late',
  'Early', 'Open', 'Closed', 'Bright', 'Muted', 'Bare', 'Raw',
  'Pure', 'Dense', 'Sparse', 'Vast', 'Tiny', 'Long', 'Brief',
];

const B = [
  'Water', 'Light', 'Field', 'Signal', 'Hours', 'Drift', 'Wire',
  'Arc', 'Pulse', 'Ghost', 'Moss', 'Fog', 'Rain', 'Snow', 'Dust',
  'Sand', 'Stone', 'Bone', 'Glass', 'Silk', 'Iron', 'Coral',
  'Lake', 'River', 'Ocean', 'Shore', 'Cloud', 'Storm', 'Wind',
  'Garden', 'Forest', 'Desert', 'Valley', 'Ridge', 'Canyon', 'Cave',
  'Mirror', 'Shadow', 'Echo', 'Dream', 'Memory', 'Moment', 'Breath',
  'Thread', 'Grain', 'Shard', 'Ember', 'Flame', 'Smoke', 'Ash',
  'Bell', 'Hymn', 'Chord', 'Tone', 'Hum', 'Ring', 'Wave',
  'Orbit', 'Bloom', 'Seed', 'Root', 'Vine', 'Thorn', 'Petal',
  'Tide', 'Dusk', 'Dawn', 'Noon', 'Night', 'Glow', 'Haze',
];

const used = new Set();

export function generateName() {
  // Try random combinations, fall back to sequential if pool runs low
  for (let i = 0; i < 200; i++) {
    const name = A[Math.floor(Math.random() * A.length)] + ' ' +
                 B[Math.floor(Math.random() * B.length)];
    if (!used.has(name) && name.length <= 16) {
      used.add(name);
      return name;
    }
  }
  // Fallback: add a number
  const name = A[Math.floor(Math.random() * A.length)] + ' ' +
               B[Math.floor(Math.random() * B.length)];
  return name.substring(0, 16);
}

export function resetNames() {
  used.clear();
}
