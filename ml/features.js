const FEATURE_NAMES = [
  'age',
  'gender',
  'smokingHistory',
  'chestPain',
  'cough',
  'breathingDifficulty',
  'fatigue',
  'wheezing',
  'fever',
  'weightLoss',
];

const CLASS_KEYS = [
  'healthy',
  'copd',
  'asthma',
  'pneumonia',
  'tuberculosis',
  'lungCancer',
  'bronchitis',
  'pulmonaryFibrosis',
];

const ENCODERS = {
  gender: { male: 0, female: 1 },
  smokingHistory: { no: 0, 'ex-smoker': 1, yes: 2 },
  chestPain: { none: 0, mild: 1, moderate: 2, severe: 3 },
  cough: { none: 0, dry: 1, wet: 2, persistent: 3 },
  breathingDifficulty: { none: 0, mild: 1, moderate: 2, severe: 3 },
  fatigue: { none: 0, mild: 1, moderate: 2, severe: 3 },
  wheezing: { none: 0, mild: 1, moderate: 2, severe: 3 },
  fever: { none: 0, low: 1, high: 2 },
  weightLoss: { none: 0, mild: 1, severe: 2 },
};

function encodeSymptoms(symptoms) {
  return [
    Number(symptoms.age) || 0,
    ENCODERS.gender[symptoms.gender] ?? 0,
    ENCODERS.smokingHistory[symptoms.smokingHistory] ?? 0,
    ENCODERS.chestPain[symptoms.chestPain] ?? 0,
    ENCODERS.cough[symptoms.cough] ?? 0,
    ENCODERS.breathingDifficulty[symptoms.breathingDifficulty] ?? 0,
    ENCODERS.fatigue[symptoms.fatigue] ?? 0,
    ENCODERS.wheezing[symptoms.wheezing] ?? 0,
    ENCODERS.fever[symptoms.fever] ?? 0,
    ENCODERS.weightLoss[symptoms.weightLoss] ?? 0,
  ];
}

function decodeVector(vector) {
  const invert = (map, value) => {
    const match = Object.entries(map).find(([, encoded]) => encoded === value);
    return match ? match[0] : Object.keys(map)[0];
  };

  return {
    age: vector[0],
    gender: invert(ENCODERS.gender, vector[1]),
    smokingHistory: invert(ENCODERS.smokingHistory, vector[2]),
    chestPain: invert(ENCODERS.chestPain, vector[3]),
    cough: invert(ENCODERS.cough, vector[4]),
    breathingDifficulty: invert(ENCODERS.breathingDifficulty, vector[5]),
    fatigue: invert(ENCODERS.fatigue, vector[6]),
    wheezing: invert(ENCODERS.wheezing, vector[7]),
    fever: invert(ENCODERS.fever, vector[8]),
    weightLoss: invert(ENCODERS.weightLoss, vector[9]),
  };
}

module.exports = {
  FEATURE_NAMES,
  CLASS_KEYS,
  ENCODERS,
  encodeSymptoms,
  decodeVector,
};
