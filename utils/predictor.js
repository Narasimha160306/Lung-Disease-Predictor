const fs = require('fs');
const path = require('path');

const { encodeSymptoms, CLASS_KEYS } = require('../ml/features');
const { predictClass } = require('../ml/randomForest');

const DISEASE_INFO = {
  copd: {
    name: 'Chronic Obstructive Pulmonary Disease (COPD)',
    causes: [
      'Long-term tobacco smoking (primary cause)',
      'Prolonged exposure to air pollution or dust',
      'Occupational exposure to chemical fumes',
      'Alpha-1 antitrypsin deficiency (genetic)',
      'Frequent childhood respiratory infections',
    ],
    precautions: [
      'Quit smoking immediately and avoid second-hand smoke',
      'Use a respiratory inhaler as prescribed',
      'Practice pursed-lip breathing and pulmonary rehab',
      'Stay up-to-date with flu and pneumonia vaccinations',
      'Avoid dust, fumes, and cold dry air when possible',
    ],
    specialist: 'Pulmonologist',
    icon: 'lungs',
  },
  asthma: {
    name: 'Asthma',
    causes: [
      'Genetic predisposition and family history',
      'Allergens such as pollen, dust mites, and mold',
      'Respiratory infections during childhood',
      'Air pollution and tobacco smoke exposure',
      'Cold air, exercise, or stress-triggered airways',
    ],
    precautions: [
      'Identify and avoid your personal triggers',
      'Carry and use a rescue inhaler as directed',
      'Follow your action plan for worsening symptoms',
      'Keep indoor air clean and use allergy covers',
      'Wear a scarf in cold weather to warm inhaled air',
    ],
    specialist: 'Allergist / Pulmonologist',
    icon: 'windsock',
  },
  pneumonia: {
    name: 'Pneumonia',
    causes: [
      'Bacterial infection (Streptococcus pneumoniae)',
      'Viral infections such as influenza or RSV',
      'Fungal infections in immunocompromised people',
      'Aspiration of food or fluids into the lungs',
      'Hospital-acquired infection (nosocomial)',
    ],
    precautions: [
      'Complete the full course of prescribed antibiotics',
      'Rest and stay well-hydrated with warm fluids',
      'Take antipyretics to manage fever',
      'Get vaccinated against flu and pneumococcus',
      'Seek urgent care if breathing becomes labored',
    ],
    specialist: 'Pulmonologist',
    icon: 'thermometer',
  },
  tuberculosis: {
    name: 'Tuberculosis (TB)',
    causes: [
      'Infection with Mycobacterium tuberculosis',
      'Close contact with an active TB case',
      'Weakened immune system (HIV, malnutrition)',
      'Crowded or poorly ventilated living conditions',
      'Lack of BCG vaccination in high-risk regions',
    ],
    precautions: [
      'Complete the full DOTS treatment course',
      'Cover your mouth and wear a mask in public',
      'Ensure good ventilation in living spaces',
      'Maintain a nutritious, high-protein diet',
      'Attend regular sputum and follow-up tests',
    ],
    specialist: 'Infectious Disease Specialist / Pulmonologist',
    icon: 'shield',
  },
  lungCancer: {
    name: 'Lung Cancer',
    causes: [
      'Cigarette smoking (strongest risk factor)',
      'Exposure to radon gas or asbestos',
      'Family history of lung cancer',
      'Chronic inflammation or scarring of the lungs',
      'Exposure to carcinogens in the workplace',
    ],
    precautions: [
      'Schedule a low-dose CT screening if high-risk',
      'Stop smoking and avoid all tobacco exposure',
      'Reduce exposure to radon, asbestos, and fumes',
      'Maintain regular follow-ups with your oncologist',
      'Report any new cough, blood, or weight loss promptly',
    ],
    specialist: 'Oncologist / Thoracic Surgeon',
    icon: 'ribbon',
  },
  bronchitis: {
    name: 'Acute Bronchitis',
    causes: [
      'Viral infection of the bronchial tubes',
      'Bacterial infection (less common)',
      'Smoking and airway irritation',
      'Exposure to cold, damp environments',
      'Repeated inhalation of irritants or allergens',
    ],
    precautions: [
      'Rest and stay hydrated to thin mucus',
      'Use a humidifier or steam inhalation',
      'Avoid smoking and smoky environments',
      'Take over-the-counter cough medicine as needed',
      'See a doctor if symptoms persist beyond 3 weeks',
    ],
    specialist: 'General Physician / Pulmonologist',
    icon: 'activity',
  },
  pulmonaryFibrosis: {
    name: 'Pulmonary Fibrosis',
    causes: [
      'Long-term exposure to silica, asbestos, or coal dust',
      'Autoimmune diseases (e.g., rheumatoid arthritis)',
      'Idiopathic pulmonary fibrosis (unknown cause)',
      'Chronic acid reflux aspiration',
      'Certain medications or radiation therapy',
    ],
    precautions: [
      'Avoid environmental dust and toxic fumes',
      'Use supplemental oxygen if prescribed',
      'Join a pulmonary rehabilitation program',
      'Ask about anti-fibrotic therapies',
      'Monitor oxygen saturation regularly at home',
    ],
    specialist: 'Pulmonologist / Interstitial Lung Disease Specialist',
    icon: 'wind',
  },
  healthy: {
    name: 'No Significant Risk',
    causes: [
      'No notable risk factors detected in your inputs',
      'A healthy respiratory system is indicated',
    ],
    precautions: [
      'Maintain a balanced diet and regular exercise',
      'Avoid smoking and second-hand smoke',
      'Practice good air-quality habits at home',
    ],
    specialist: 'General Physician',
    icon: 'heart',
  },
};

const HEALTHY_OUTCOME = {
  disease: DISEASE_INFO.healthy.name,
  diseaseKey: 'healthy',
  description:
    'Based on the symptoms entered, no strong indicators of a major lung disease were found. Continue maintaining a healthy lifestyle. If symptoms develop or persist, consult a doctor.',
};

const DESCRIPTIONS = {
  healthy: HEALTHY_OUTCOME.description,
  copd: 'Your symptom profile suggests Chronic Obstructive Pulmonary Disease (COPD). This condition involves progressive airflow obstruction, often linked to smoking or long-term irritant exposure. Persistent breathlessness, cough, and wheezing are common.',
  asthma: 'Your symptom profile indicates asthma, a chronic inflammatory airway condition. Reversible airflow obstruction leads to wheezing, chest tightness, breathlessness, and coughing — often triggered by allergens, exercise, or cold air.',
  pneumonia: 'Your symptom profile suggests pneumonia, an inflammatory lung infection. Alveoli fill with fluid or pus, causing fever, productive cough, chest pain, and difficulty breathing. This requires prompt medical attention.',
  tuberculosis: 'Your symptom profile points toward tuberculosis (TB), a bacterial lung infection. A prolonged cough, low-grade fever, night sweats, and weight loss are hallmark signs. TB is treatable with a full course of antibiotics.',
  lungCancer: 'Your symptom profile raises concern for lung cancer. Persistent cough, blood-streaked sputum, unexplained weight loss, and chest discomfort require urgent investigation. Early screening significantly improves outcomes.',
  bronchitis: 'Your symptom profile matches acute bronchitis, a viral infection of the airways. A wet or dry cough, mild fever, wheezing, and chest discomfort typically resolve within a few weeks with rest and fluids.',
  pulmonaryFibrosis: 'Your symptom profile suggests interstitial lung disease / pulmonary fibrosis. Progressive scarring of lung tissue causes breathlessness, dry cough, and fatigue. This warrants specialist evaluation.',
};

const MODEL_PATH = path.join(__dirname, '..', 'ml', 'model.json');
let cachedModel = null;

function loadModel() {
  if (cachedModel) return cachedModel;
  if (!fs.existsSync(MODEL_PATH)) return null;
  cachedModel = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
  return cachedModel;
}

function riskLevelFor(confidence) {
  if (confidence >= 85) return 'very-high';
  if (confidence >= 70) return 'high';
  if (confidence >= 50) return 'moderate';
  return 'low';
}

function diseaseName(key) {
  return DISEASE_INFO[key] ? DISEASE_INFO[key].name : key;
}

function buildResult(diseaseKey, confidence, extras = {}) {
  const info = DISEASE_INFO[diseaseKey] || DISEASE_INFO.healthy;
  const safeConfidence = Math.max(1, Math.min(99, Math.round(confidence)));
  const isHealthy = diseaseKey === 'healthy';

  return {
    disease: info.name,
    diseaseKey,
    confidence: safeConfidence,
    riskLevel: isHealthy ? 'low' : riskLevelFor(safeConfidence),
    description: DESCRIPTIONS[diseaseKey] || DESCRIPTIONS.healthy,
    causes: info.causes,
    precautions: info.precautions,
    specialist: info.specialist,
    icon: info.icon,
    engine: extras.engine || 'random-forest',
    modelMetrics: extras.modelMetrics || null,
    alternatives: extras.alternatives || [],
  };
}

function symptomBurden(symptoms) {
  const fields = [
    symptoms.chestPain,
    symptoms.cough,
    symptoms.breathingDifficulty,
    symptoms.fatigue,
    symptoms.wheezing,
    symptoms.fever,
    symptoms.weightLoss,
  ];
  return fields.filter((value) => value && value !== 'none').length;
}

function predictWithModel(symptoms) {
  const model = loadModel();
  if (!model) return null;

  const vector = encodeSymptoms(symptoms);
  const { classIndex, proba } = predictClass(model, vector);
  const ranked = proba
    .map((probability, index) => ({
      key: model.classes[index] || CLASS_KEYS[index],
      probability,
    }))
    .sort((a, b) => b.probability - a.probability);

  let best = ranked[0];
  if (symptomBurden(symptoms) === 0 && symptoms.smokingHistory === 'no') {
    best = ranked.find((item) => item.key === 'healthy') || best;
  }

  const alternatives = ranked
    .filter((item) => item.key !== best.key)
    .slice(0, 3)
    .map((item) => ({
      key: item.key,
      name: diseaseName(item.key),
      probability: Math.round(item.probability * 100),
    }));

  return buildResult(best.key, best.probability * 100, {
    engine: 'random-forest',
    alternatives,
    modelMetrics: {
      algorithm: model.algorithm,
      testAccuracy: model.metrics && model.metrics.testAccuracy,
      nTrees: model.nTrees,
      nTrainSamples: model.nTrainSamples,
    },
  });
}

function predictDisease(symptoms) {
  const mlResult = predictWithModel(symptoms);
  if (mlResult) return mlResult;

  // Fallback if the trained model file is missing.
  if (symptomBurden(symptoms) === 0) {
    return buildResult('healthy', 92, { engine: 'fallback' });
  }
  return buildResult('bronchitis', 55, { engine: 'fallback' });
}

module.exports = { predictDisease, DISEASE_INFO, loadModel };
