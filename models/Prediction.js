const mongoose = require('mongoose');

const symptomFieldSchema = new mongoose.Schema(
  {
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    smokingHistory: { type: String, enum: ['no', 'yes', 'ex-smoker'], default: 'no' },
    chestPain: { type: String, enum: ['none', 'mild', 'moderate', 'severe'], default: 'none' },
    cough: { type: String, enum: ['none', 'dry', 'wet', 'persistent'], default: 'none' },
    breathingDifficulty: { type: String, enum: ['none', 'mild', 'moderate', 'severe'], default: 'none' },
    fatigue: { type: String, enum: ['none', 'mild', 'moderate', 'severe'], default: 'none' },
    wheezing: { type: String, enum: ['none', 'mild', 'moderate', 'severe'], default: 'none' },
    fever: { type: String, enum: ['none', 'low', 'high'], default: 'none' },
    weightLoss: { type: String, enum: ['none', 'mild', 'severe'], default: 'none' },
  },
  { _id: false }
);

const predictionSchema = new mongoose.Schema(
  {
    symptoms: { type: symptomFieldSchema, required: true },
    predictedDisease: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'very-high'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

predictionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
