const fs = require('fs');
const path = require('path');

const { FEATURE_NAMES, CLASS_KEYS } = require('./features');
const { generateDataset, trainTestSplit } = require('./dataset');
const { trainRandomForest, evaluate } = require('./randomForest');

const MODEL_PATH = path.join(__dirname, 'model.json');

function formatPct(value) {
  return (value * 100).toFixed(2) + '%';
}

function printConfusion(matrix) {
  const header = ['true\\pred', ...CLASS_KEYS.map((k) => k.slice(0, 8).padStart(8))].join(' ');
  console.log(header);
  matrix.forEach((row, i) => {
    const cells = row.map((n) => String(n).padStart(8)).join(' ');
    console.log(CLASS_KEYS[i].slice(0, 9).padEnd(9), cells);
  });
}

function main() {
  console.log('[ML] Generating clinically patterned training data...');
  const { X, y } = generateDataset({ samplesPerClass: 900, seed: 42, labelNoise: 0.008 });
  const split = trainTestSplit(X, y, { testRatio: 0.2, seed: 11 });

  console.log(`[ML] Samples: ${X.length} (train ${split.XTrain.length}, test ${split.XTest.length})`);
  console.log('[ML] Training Random Forest (70 trees)...');

  const started = Date.now();
  const forest = trainRandomForest(split.XTrain, split.yTrain, {
    nTrees: 70,
    maxDepth: 12,
    minSamplesSplit: 10,
    minSamplesLeaf: 4,
    seed: 21,
    onTree(done, total) {
      if (done === 1 || done === total || done % 5 === 0) {
        console.log(`[ML]   tree ${done}/${total}`);
      }
    },
  });

  const trainMetrics = evaluate(forest, split.XTrain, split.yTrain);
  const testMetrics = evaluate(forest, split.XTest, split.yTest);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`[ML] Training finished in ${elapsed}s`);
  console.log(`[ML] Train accuracy: ${formatPct(trainMetrics.accuracy)}`);
  console.log(`[ML] Test accuracy:  ${formatPct(testMetrics.accuracy)}`);
  console.log('[ML] Test confusion matrix:');
  printConfusion(testMetrics.confusionMatrix);

  const payload = {
    algorithm: 'RandomForestClassifier',
    version: '1.0.0',
    trainedAt: new Date().toISOString(),
    features: FEATURE_NAMES,
    classes: CLASS_KEYS,
    nTrees: forest.nTrees,
    nClasses: forest.nClasses,
    nFeatures: forest.nFeatures,
    maxDepth: forest.maxDepth,
    nTrainSamples: split.XTrain.length,
    nTestSamples: split.XTest.length,
    metrics: {
      trainAccuracy: Number(trainMetrics.accuracy.toFixed(4)),
      testAccuracy: Number(testMetrics.accuracy.toFixed(4)),
      confusionMatrix: testMetrics.confusionMatrix,
    },
    trees: forest.trees,
  };

  fs.writeFileSync(MODEL_PATH, JSON.stringify(payload));
  console.log(`[ML] Saved model to ${MODEL_PATH}`);
}

main();
