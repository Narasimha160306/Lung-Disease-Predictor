const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');

const Prediction = require('./models/Prediction');
const { predictDisease } = require('./utils/predictor');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lung_disease_predictor';

// ---- Symptons will get from client-side form ----
function countSymptoms(s) {
  const nonNoneFields = [
    s.chestPain !== 'none',
    s.cough !== 'none',
    s.breathingDifficulty !== 'none',
    s.fatigue !== 'none',
    s.wheezing !== 'none',
    s.fever !== 'none',
    s.weightLoss !== 'none',
  ];
  const count = nonNoneFields.filter(Boolean).length + (s.smokingHistory !== 'no' ? 1 : 0);
  return count;
}

function summarizeSymptoms(s) {
  const parts = [];
  if (s.smokingHistory !== 'no') parts.push(s.smokingHistory === 'yes' ? 'Smoker' : 'Ex-smoker');
  if (s.chestPain !== 'none') parts.push('Chest ' + s.chestPain);
  if (s.cough !== 'none') parts.push(s.cough === 'persistent' ? 'Persistent cough' : s.cough + ' cough');
  if (s.breathingDifficulty !== 'none') parts.push('Breath ' + s.breathingDifficulty);
  if (s.fatigue !== 'none') parts.push('Fatigue');
  if (s.wheezing !== 'none') parts.push('Wheeze ' + s.wheezing);
  if (s.fever !== 'none') parts.push('Fever');
  if (s.weightLoss !== 'none') parts.push('Weight loss');
  return parts.length ? parts.slice(0, 4).join(', ') + (parts.length > 4 ? '...' : '') : 'All clear';
}

app.locals.countSymptoms = countSymptoms;
app.locals.summarizeSymptoms = summarizeSymptoms;

// ---- View engine ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---- Middleware ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ---- In-memory fallback store (used if MongoDB is unavailable) ----
const memoryStore = [];

// ---- Connect to MongoDB (non-fatal if unavailable) ----
let dbConnected = false;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    dbConnected = true;
    console.log(`[DB] Connected to MongoDB at ${MONGODB_URI}`);
  } catch (err) {
    dbConnected = false;
    console.warn(`[DB] MongoDB connection failed (${err.message}). Falling back to in-memory storage.`);
  }
}

async function savePrediction(prediction) {
  const record = {
    symptoms: prediction.symptoms,
    predictedDisease: prediction.predictedDisease,
    confidence: prediction.confidence,
    riskLevel: prediction.riskLevel,
    createdAt: new Date(),
  };

  if (dbConnected) {
    try {
      await Prediction.create(record);
      return;
    } catch (err) {
      console.warn(`[DB] Failed to persist prediction: ${err.message}. Using in-memory fallback.`);
    }
  }
  memoryStore.push(record);
}

async function getPredictions() {
  if (dbConnected) {
    try {
      return await Prediction.find().sort({ createdAt: -1 }).lean();
    } catch (err) {
      console.warn(`[DB] Failed to read predictions: ${err.message}.`);
    }
  }
  return [...memoryStore].sort((a, b) => b.createdAt - a.createdAt);
}

// ---- Routes ----
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Lung Disease Predictor',
    activePage: 'home',
  });
});

app.get('/predict', (req, res) => {
  res.render('predict', {
    title: 'Predict Lung Disease',
    activePage: 'predict',
  });
});

app.post('/predict', async (req, res) => {
  const symptoms = {
    age: parseInt(req.body.age, 10) || 0,
    gender: req.body.gender || 'male',
    smokingHistory: req.body.smokingHistory || 'no',
    chestPain: req.body.chestPain || 'none',
    cough: req.body.cough || 'none',
    breathingDifficulty: req.body.breathingDifficulty || 'none',
    fatigue: req.body.fatigue || 'none',
    wheezing: req.body.wheezing || 'none',
    fever: req.body.fever || 'none',
    weightLoss: req.body.weightLoss || 'none',
  };

  // Basic validation
  if (!symptoms.age || symptoms.age < 1 || symptoms.age > 120) {
    return res.status(400).render('predict', {
      title: 'Predict Lung Disease',
      activePage: 'predict',
      error: 'Please enter a valid age (1-120).',
      formData: req.body,
    });
  }

  const result = predictDisease(symptoms);

  await savePrediction({
    symptoms,
    predictedDisease: result.disease,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
  });

  res.render('result', {
    title: 'Prediction Result',
    activePage: 'result',
    result,
    symptoms,
  });
});

app.get('/history', async (req, res) => {
  const predictions = await getPredictions();
  res.render('history', {
    title: 'Prediction History',
    activePage: 'history',
    predictions,
  });
});

// ---- 404 ----
app.use((req, res) => {
  res.status(404).render('home', {
    title: 'Page Not Found',
    activePage: 'home',
  });
});

// ---- Start server ----
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[SERVER] Running at http://localhost:${PORT}`);
  });
});

module.exports = app;
