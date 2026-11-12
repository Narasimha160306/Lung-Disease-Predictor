const { CLASS_KEYS, encodeSymptoms } = require('./features');

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function weightedPick(rng, options) {
  const total = options.reduce((sum, option) => sum + option[1], 0);
  let roll = rng() * total;
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return options[options.length - 1][0];
}

function ageInRange(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function maybeNoise(rng, value, alternatives, chance) {
  if (rng() < chance) return pick(rng, alternatives);
  return value;
}

const PROFILES = {
  healthy: () => ({
    age: [8, 75],
    gender: [
      ['male', 1],
      ['female', 1],
    ],
    smokingHistory: [
      ['no', 12],
      ['ex-smoker', 2],
      ['yes', 1],
    ],
    chestPain: [['none', 20], ['mild', 1]],
    cough: [['none', 20], ['dry', 1]],
    breathingDifficulty: [['none', 20], ['mild', 1]],
    fatigue: [['none', 16], ['mild', 2]],
    wheezing: [['none', 22]],
    fever: [['none', 22]],
    weightLoss: [['none', 22]],
  }),
  copd: () => ({
    age: [48, 82],
    gender: [
      ['male', 3],
      ['female', 2],
    ],
    smokingHistory: [
      ['yes', 10],
      ['ex-smoker', 6],
      ['no', 1],
    ],
    chestPain: [['none', 3], ['mild', 6], ['moderate', 4], ['severe', 1]],
    cough: [['wet', 9], ['persistent', 8], ['dry', 1]],
    breathingDifficulty: [['moderate', 8], ['severe', 7], ['mild', 3]],
    fatigue: [['moderate', 7], ['mild', 5], ['severe', 4], ['none', 1]],
    wheezing: [['mild', 6], ['moderate', 7], ['severe', 3], ['none', 1]],
    fever: [['none', 12], ['low', 2]],
    weightLoss: [['none', 8], ['mild', 3]],
  }),
  asthma: () => ({
    age: [6, 45],
    gender: [
      ['male', 1],
      ['female', 1],
    ],
    smokingHistory: [
      ['no', 10],
      ['ex-smoker', 2],
      ['yes', 1],
    ],
    chestPain: [['mild', 7], ['moderate', 5], ['none', 4], ['severe', 1]],
    cough: [['dry', 10], ['persistent', 4], ['none', 2], ['wet', 1]],
    breathingDifficulty: [['moderate', 8], ['mild', 6], ['severe', 4], ['none', 1]],
    fatigue: [['mild', 7], ['none', 5], ['moderate', 3]],
    wheezing: [['moderate', 8], ['severe', 7], ['mild', 4]],
    fever: [['none', 14], ['low', 1]],
    weightLoss: [['none', 16]],
  }),
  pneumonia: () => ({
    age: [2, 80],
    gender: [
      ['male', 1],
      ['female', 1],
    ],
    smokingHistory: [
      ['no', 6],
      ['yes', 2],
      ['ex-smoker', 2],
    ],
    chestPain: [['moderate', 8], ['severe', 5], ['mild', 4], ['none', 1]],
    cough: [['wet', 12], ['persistent', 3], ['dry', 2]],
    breathingDifficulty: [['moderate', 8], ['severe', 6], ['mild', 3]],
    fatigue: [['moderate', 7], ['severe', 6], ['mild', 3]],
    wheezing: [['none', 6], ['mild', 5], ['moderate', 3]],
    fever: [['high', 12], ['low', 4], ['none', 1]],
    weightLoss: [['none', 10], ['mild', 3]],
  }),
  tuberculosis: () => ({
    age: [16, 70],
    gender: [
      ['male', 3],
      ['female', 2],
    ],
    smokingHistory: [
      ['no', 5],
      ['yes', 3],
      ['ex-smoker', 2],
    ],
    chestPain: [['mild', 6], ['moderate', 6], ['none', 3], ['severe', 2]],
    cough: [['persistent', 12], ['dry', 4], ['wet', 3]],
    breathingDifficulty: [['mild', 7], ['moderate', 6], ['none', 3], ['severe', 2]],
    fatigue: [['severe', 8], ['moderate', 7], ['mild', 2]],
    wheezing: [['none', 10], ['mild', 4]],
    fever: [['low', 10], ['high', 3], ['none', 2]],
    weightLoss: [['severe', 8], ['mild', 7], ['none', 1]],
  }),
  lungCancer: () => ({
    age: [50, 85],
    gender: [
      ['male', 3],
      ['female', 2],
    ],
    smokingHistory: [
      ['yes', 12],
      ['ex-smoker', 6],
      ['no', 1],
    ],
    chestPain: [['moderate', 7], ['severe', 6], ['mild', 4], ['none', 1]],
    cough: [['persistent', 12], ['dry', 4], ['wet', 2]],
    breathingDifficulty: [['moderate', 7], ['mild', 5], ['severe', 5], ['none', 1]],
    fatigue: [['severe', 8], ['moderate', 7], ['mild', 2]],
    wheezing: [['none', 7], ['mild', 5], ['moderate', 2]],
    fever: [['none', 10], ['low', 3]],
    weightLoss: [['severe', 12], ['mild', 4]],
  }),
  bronchitis: () => ({
    age: [8, 65],
    gender: [
      ['male', 1],
      ['female', 1],
    ],
    smokingHistory: [
      ['no', 6],
      ['yes', 3],
      ['ex-smoker', 2],
    ],
    chestPain: [['mild', 8], ['none', 5], ['moderate', 3]],
    cough: [['wet', 12], ['dry', 4], ['persistent', 2], ['none', 1]],
    breathingDifficulty: [['mild', 8], ['none', 5], ['moderate', 3]],
    fatigue: [['mild', 8], ['moderate', 5], ['none', 3]],
    wheezing: [['mild', 8], ['none', 5], ['moderate', 3]],
    fever: [['low', 10], ['none', 5], ['high', 2]],
    weightLoss: [['none', 16], ['mild', 1]],
  }),
  pulmonaryFibrosis: () => ({
    age: [50, 84],
    gender: [
      ['male', 1],
      ['female', 1],
    ],
    smokingHistory: [
      ['no', 5],
      ['ex-smoker', 4],
      ['yes', 2],
    ],
    chestPain: [['mild', 6], ['moderate', 5], ['none', 4], ['severe', 2]],
    cough: [['dry', 14], ['persistent', 4]],
    breathingDifficulty: [['severe', 11], ['moderate', 6]],
    fatigue: [['moderate', 8], ['severe', 6], ['mild', 3]],
    wheezing: [['none', 7], ['mild', 5], ['moderate', 3]],
    fever: [['none', 14], ['low', 1]],
    weightLoss: [['none', 8], ['mild', 5], ['severe', 2]],
  }),
};

function sampleFromProfile(rng, diseaseKey) {
  const profile = PROFILES[diseaseKey]();
  const [minAge, maxAge] = profile.age;
  const sample = {
    age: ageInRange(rng, minAge, maxAge),
    gender: weightedPick(rng, profile.gender),
    smokingHistory: weightedPick(rng, profile.smokingHistory),
    chestPain: weightedPick(rng, profile.chestPain),
    cough: weightedPick(rng, profile.cough),
    breathingDifficulty: weightedPick(rng, profile.breathingDifficulty),
    fatigue: weightedPick(rng, profile.fatigue),
    wheezing: weightedPick(rng, profile.wheezing),
    fever: weightedPick(rng, profile.fever),
    weightLoss: weightedPick(rng, profile.weightLoss),
  };

  // Occasional extra/missing symptoms keep the model from memorizing a single template.
  if (rng() < 0.12 && diseaseKey !== 'healthy') {
    sample.fatigue = maybeNoise(rng, sample.fatigue, ['mild', 'moderate', 'severe'], 1);
  }
  if (rng() < 0.08) {
    sample.chestPain = maybeNoise(rng, sample.chestPain, ['none', 'mild', 'moderate'], 1);
  }

  return sample;
}

function generateDataset({ samplesPerClass = 900, seed = 42, labelNoise = 0.02 } = {}) {
  const rng = mulberry32(seed);
  const X = [];
  const y = [];

  CLASS_KEYS.forEach((diseaseKey, classIndex) => {
    for (let i = 0; i < samplesPerClass; i += 1) {
      const symptoms = sampleFromProfile(rng, diseaseKey);
      let label = classIndex;
      if (rng() < labelNoise) {
        label = Math.floor(rng() * CLASS_KEYS.length);
      }
      X.push(encodeSymptoms(symptoms));
      y.push(label);
    }
  });

  return { X, y, classKeys: CLASS_KEYS };
}

function trainTestSplit(X, y, { testRatio = 0.2, seed = 7 } = {}) {
  const rng = mulberry32(seed);
  const indices = X.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const splitAt = Math.floor(indices.length * (1 - testRatio));
  const trainIdx = indices.slice(0, splitAt);
  const testIdx = indices.slice(splitAt);

  return {
    XTrain: trainIdx.map((i) => X[i]),
    yTrain: trainIdx.map((i) => y[i]),
    XTest: testIdx.map((i) => X[i]),
    yTest: testIdx.map((i) => y[i]),
  };
}

module.exports = {
  generateDataset,
  trainTestSplit,
  sampleFromProfile,
};
