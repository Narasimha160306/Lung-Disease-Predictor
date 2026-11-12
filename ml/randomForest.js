function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function giniFromCounts(counts, n) {
  if (n === 0) return 0;
  let impurity = 1;
  for (let i = 0; i < counts.length; i += 1) {
    const p = counts[i] / n;
    impurity -= p * p;
  }
  return impurity;
}

function majorityCounts(y, indices, nClasses) {
  const counts = new Array(nClasses).fill(0);
  for (let i = 0; i < indices.length; i += 1) {
    counts[y[indices[i]]] += 1;
  }
  return counts;
}

function shuffledFeatureSubset(nFeatures, mtry, rng) {
  const feats = [];
  for (let i = 0; i < nFeatures; i += 1) feats.push(i);
  for (let i = feats.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [feats[i], feats[j]] = [feats[j], feats[i]];
  }
  return feats.slice(0, mtry);
}

function findBestSplit(X, y, indices, nClasses, nFeatures, rng, minSamplesLeaf) {
  const mtry = Math.max(1, Math.round(Math.sqrt(nFeatures)));
  const features = shuffledFeatureSubset(nFeatures, mtry, rng);
  const parentCounts = majorityCounts(y, indices, nClasses);
  const n = indices.length;
  const parentGini = giniFromCounts(parentCounts, n);

  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const feature of features) {
    const values = indices.map((i) => X[i][feature]);
    let unique = Array.from(new Set(values)).sort((a, b) => a - b);
    if (unique.length < 2) continue;
    if (unique.length > 16) {
      const sampled = [];
      const step = (unique.length - 1) / 15;
      for (let k = 0; k < 16; k += 1) {
        sampled.push(unique[Math.round(k * step)]);
      }
      unique = Array.from(new Set(sampled));
    }

    for (let u = 0; u < unique.length - 1; u += 1) {
      const threshold = (unique[u] + unique[u + 1]) / 2;
      const leftCounts = new Array(nClasses).fill(0);
      const rightCounts = new Array(nClasses).fill(0);
      let nLeft = 0;
      let nRight = 0;

      for (let i = 0; i < indices.length; i += 1) {
        const row = indices[i]
        if (X[row][feature] <= threshold) {
          leftCounts[y[row]] += 1;
          nLeft += 1;
        } else {
          rightCounts[y[row]] += 1;
          nRight += 1;
        }
      }

      if (nLeft < minSamplesLeaf || nRight < minSamplesLeaf) continue;

      const gain =
        parentGini -
        (nLeft / n) * giniFromCounts(leftCounts, nLeft) -
        (nRight / n) * giniFromCounts(rightCounts, nRight);

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feature;
        bestThreshold = threshold;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-8) return null;
  return { feature: bestFeature, threshold: bestThreshold };
}

function buildTree(X, y, indices, options, depth, rng) {
  const { nClasses, nFeatures, maxDepth, minSamplesSplit, minSamplesLeaf } = options;
  const counts = majorityCounts(y, indices, nClasses);
  const pure = counts.filter((c) => c > 0).length === 1;

  if (pure || depth >= maxDepth || indices.length < minSamplesSplit) {
    return { t: 0, c: counts };
  }

  const split = findBestSplit(X, y, indices, nClasses, nFeatures, rng, minSamplesLeaf);
  if (!split) return { t: 0, c: counts };

  const left = [];
  const right = [];
  for (let i = 0; i < indices.length; i += 1) {
    const row = indices[i];
    if (X[row][split.feature] <= split.threshold) left.push(row);
    else right.push(row);
  }

  if (left.length < minSamplesLeaf || right.length < minSamplesLeaf) {
    return { t: 0, c: counts };
  }

  return {
    t: 1,
    f: split.feature,
    th: split.threshold,
    l: buildTree(X, y, left, options, depth + 1, rng),
    r: buildTree(X, y, right, options, depth + 1, rng),
  };
}

function bootstrapIndices(n, rng) {
  const indices = new Array(n);
  for (let i = 0; i < n; i += 1) {
    indices[i] = Math.floor(rng() * n);
  }
  return indices;
}

function trainRandomForest(X, y, {
  nTrees = 60,
  maxDepth = 12,
  minSamplesSplit = 8,
  minSamplesLeaf = 4,
  seed = 21,
  onTree,
} = {}) {
  const nClasses = y.reduce((max, label) => Math.max(max, label + 1), 0);
  const nFeatures = X[0].length;
  const options = { nClasses, nFeatures, maxDepth, minSamplesSplit, minSamplesLeaf };
  const trees = [];

  for (let t = 0; t < nTrees; t += 1) {
    const rng = mulberry32(seed + t * 9973);
    const bag = bootstrapIndices(X.length, rng);
    const tree = buildTree(X, y, bag, options, 0, rng);
    trees.push(tree);
    if (typeof onTree === 'function') onTree(t + 1, nTrees);
  }

  return { trees, nClasses, nFeatures, nTrees, maxDepth };
}

function traverse(node, vector) {
  if (node.t === 0) return node.c;
  if (vector[node.f] <= node.th) return traverse(node.l, vector);
  return traverse(node.r, vector);
}

function predictProba(model, vector) {
  const totals = new Array(model.nClasses).fill(0);
  for (let i = 0; i < model.trees.length; i += 1) {
    const counts = traverse(model.trees[i], vector);
    let sum = 0;
    for (let c = 0; c < counts.length; c += 1) sum += counts[c];
    if (sum === 0) continue;
    for (let c = 0; c < counts.length; c += 1) {
      totals[c] += counts[c] / sum;
    }
  }

  const nTrees = model.trees.length || 1;
  return totals.map((value) => value / nTrees);
}

function predictClass(model, vector) {
  const proba = predictProba(model, vector);
  let best = 0;
  for (let i = 1; i < proba.length; i += 1) {
    if (proba[i] > proba[best]) best = i;
  }
  return { classIndex: best, probability: proba[best], proba };
}

function evaluate(model, X, y) {
  let correct = 0;
  const nClasses = model.nClasses;
  const matrix = Array.from({ length: nClasses }, () => new Array(nClasses).fill(0));

  for (let i = 0; i < X.length; i += 1) {
    const { classIndex } = predictClass(model, X[i]);
    matrix[y[i]][classIndex] += 1;
    if (classIndex === y[i]) correct += 1;
  }

  return {
    accuracy: correct / X.length,
    confusionMatrix: matrix,
  };
}

module.exports = {
  trainRandomForest,
  predictProba,
  predictClass,
  evaluate,
};
