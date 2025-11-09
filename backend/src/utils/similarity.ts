/**
 * Calculate Jaccard similarity between two tag arrays
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 && tagsB.length === 0) return 1;
  if (tagsA.length === 0 || tagsB.length === 0) return 0;

  const setA = new Set(tagsA.map(t => t.toLowerCase()));
  const setB = new Set(tagsB.map(t => t.toLowerCase()));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Count how many tags match between two arrays
 */
export function countTagMatches(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA.map(t => t.toLowerCase()));
  const setB = new Set(tagsB.map(t => t.toLowerCase()));

  return [...setA].filter(x => setB.has(x)).length;
}

/**
 * Check if arrays have any overlapping tags
 */
export function hasTagOverlap(tagsA: string[], tagsB: string[]): boolean {
  const setA = new Set(tagsA.map(t => t.toLowerCase()));
  const setB = new Set(tagsB.map(t => t.toLowerCase()));

  return [...setA].some(x => setB.has(x));
}

/**
 * Calculate cosine similarity using tag frequency vectors
 */
export function cosineSimilarity(
  vectorA: Record<string, number>,
  vectorB: Record<string, number>
): number {
  const allTags = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const tag of allTags) {
    const a = vectorA[tag] || 0;
    const b = vectorB[tag] || 0;

    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
