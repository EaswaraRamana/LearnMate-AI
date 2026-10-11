import { DocumentChunk, Citation } from '../src/types/index.ts';

export interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
  highlightedSnippet: string;
}

/**
 * Stopwords to filter during tokenization
 */
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing',
  'describe', 'definition', 'down', 'during', 'each', 'easy', 'easier', 'example', 'explain',
  'few', 'for', 'from', 'further', 'give', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'know', 'language',
  'let\'s', 'like', 'me', 'mean', 'means', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'please',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'tell',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
  'simple', 'simply', 'terms'
]);

/**
 * Tokenize and normalize query or document text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Retrieve the top-K relevant chunks across provided documents
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  topK = 5,
  minScoreThreshold = 0.5
): ScoredChunk[] {
  if (!chunks || chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  const normalizedQuery = query.toLowerCase().trim();

  // If query is very short or all stopwords, use raw words
  const effectiveTokens = queryTokens.length > 0 ? queryTokens : query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored: ScoredChunk[] = [];

  for (const chunk of chunks) {
    const chunkText = chunk.content.toLowerCase();
    let score = 0;

    // 1. Exact phrase match bonus
    if (chunkText.includes(normalizedQuery)) {
      score += 15.0;
    }

    // 2. Token frequency & term weighting
    for (const token of effectiveTokens) {
      if (chunkText.includes(token)) {
        // Count occurrences
        const regex = new RegExp(`\\b${token}\\b`, 'g');
        const matches = chunkText.match(regex);
        const count = matches ? matches.length : 1;
        score += count * 2.5;
      }
    }

    // 3. Document title relevance
    const titleLower = chunk.documentTitle.toLowerCase();
    for (const token of effectiveTokens) {
      if (titleLower.includes(token)) {
        score += 3.0;
      }
    }

    // Only keep if there is some textual correspondence
    if (score > 0) {
      // Find best matching snippet window (150-200 chars)
      const snippet = extractBestSnippet(chunk.content, effectiveTokens);

      scored.push({
        chunk,
        score,
        highlightedSnippet: snippet
      });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const filtered = scored.filter(s => s.score >= minScoreThreshold);
  return filtered.slice(0, topK);
}

/**
 * Extract a concise, relevant snippet containing query keywords
 */
function extractBestSnippet(content: string, tokens: string[]): string {
  const sentences = content.split(/(?<=[.?!])\s+/);
  let bestSentence = sentences[0] || content.slice(0, 180);
  let maxMatches = 0;

  for (const s of sentences) {
    const sLower = s.toLowerCase();
    let matches = 0;
    for (const t of tokens) {
      if (sLower.includes(t)) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestSentence = s;
    }
  }

  const cleaned = bestSentence.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 220) {
    return cleaned.slice(0, 217) + '...';
  }
  return cleaned;
}

/**
 * Format scored chunks into clean citation objects
 */
export function formatCitations(scoredChunks: ScoredChunk[]): Citation[] {
  // Deduplicate by document + page
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const item of scoredChunks) {
    const key = `${item.chunk.documentId}-${item.chunk.pageNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      citations.push({
        documentId: item.chunk.documentId,
        documentTitle: item.chunk.documentTitle,
        pageNumber: item.chunk.pageNumber,
        snippet: item.highlightedSnippet,
        relevanceScore: Math.round(item.score * 10) / 10
      });
    }
    if (citations.length >= 4) break;
  }

  return citations;
}
