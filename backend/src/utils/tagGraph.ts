// Static adjacency graph for tag exploration
export const ADJACENT_TAGS: Record<string, string[]> = {
  salesforce: ['crm', 'revops', 'support', 'integration', 'admin', 'configuration'],
  ai: ['mlops', 'genai', 'analytics', 'nlp', 'llm', 'research', 'tensorflow', 'python'],
  fintech: ['payments', 'risk', 'fraud', 'lending', 'compliance', 'regulation'],
  product: ['pm', 'ux', 'experimentation', 'strategy', 'analytics', 'research'],
  support: ['customer-success', 'troubleshooting', 'relationship-management', 'salesforce'],
  ops: ['operations', 'process-improvement', 'analytics', 'revops'],
  data: ['analytics', 'sql', 'visualization', 'infrastructure', 'engineering'],
  crm: ['salesforce', 'integration', 'support', 'revops'],
  mlops: ['ai', 'devops', 'kubernetes', 'infrastructure'],
  genai: ['ai', 'llm', 'nlp', 'research'],
  payments: ['fintech', 'infrastructure', 'architecture'],
  pm: ['product', 'strategy', 'experimentation'],
  startup: ['product', 'ops', 'analytics'],
  scaleup: ['operations', 'infrastructure', 'engineering'],
  analytics: ['data', 'sql', 'product', 'ai'],
  architecture: ['infrastructure', 'engineering', 'design'],
  engineering: ['infrastructure', 'architecture', 'devops'],
  leadership: ['management', 'strategy', 'pm'],
};

/**
 * Get adjacent/related tags for exploration
 */
export function getAdjacentTags(tags: string[]): string[] {
  const adjacent = new Set<string>();

  for (const tag of tags) {
    const relatedTags = ADJACENT_TAGS[tag.toLowerCase()];
    if (relatedTags) {
      relatedTags.forEach(t => adjacent.add(t));
    }
  }

  // Remove original tags from adjacent set
  tags.forEach(t => adjacent.delete(t.toLowerCase()));

  return Array.from(adjacent);
}

/**
 * Get exploration tags - mix of user interests and adjacent tags
 */
export function getExplorationTags(userTags: string[], explorationRatio: number = 0.2): string[] {
  const adjacent = getAdjacentTags(userTags);
  const explorationCount = Math.ceil(adjacent.length * explorationRatio);

  // Shuffle and take subset
  const shuffled = adjacent.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, explorationCount);
}
