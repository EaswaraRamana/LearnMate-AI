import * as pdfParseModule from 'pdf-parse';
const PDFParseClass: any = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse || (pdfParseModule as any).default;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  title: string;
  pageCount: number;
  totalCharacters: number;
  pages: ExtractedPage[];
  fullText: string;
  summary: string;
  detectedTopics: string[];
}

export interface TextChunk {
  chunkIndex: number;
  pageNumber: number;
  content: string;
  characterCount: number;
}

/**
 * Extracts page-aware text from PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer, originalFilename: string): Promise<ExtractedDocument> {
  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty (0 bytes). Please upload a valid document.');
  }

  const pages: ExtractedPage[] = [];
  let parser: any = null;
  let result: any = null;

  try {
    if (typeof PDFParseClass === 'function') {
      try {
        // Attempt v2 class instantiation
        parser = new PDFParseClass({ data: buffer });
        if (typeof parser.getText === 'function') {
          result = await parser.getText();
        } else if (typeof parser.load === 'function') {
          await parser.load();
          result = await parser.getText();
        }
      } catch (classErr: any) {
        // Attempt calling as a v1 function fallback
        try {
          result = await (PDFParseClass as any)(buffer);
        } catch {
          throw classErr;
        }
      }
    } else {
      throw new Error('PDF parsing engine could not be initialized on the server.');
    }

    if (result && Array.isArray(result.pages) && result.pages.length > 0) {
      result.pages.forEach((p: any) => {
        const text = typeof p.text === 'string' ? p.text.trim() : '';
        const pageNum = typeof p.num === 'number' ? p.num : pages.length + 1;
        if (text) {
          pages.push({ pageNumber: pageNum, text });
        }
      });
    } else {
      // Resilient fallback: extract from result.text or string result
      const rawText = typeof result === 'string' ? result : (result?.text || '');
      if (rawText && rawText.trim()) {
        const formFeedParts = rawText.split(/\f|\n\s*--\s*\d+\s*of\s*\d+\s*--\s*\n/);
        if (formFeedParts.length > 1) {
          formFeedParts.forEach((part: string, idx: number) => {
            const trimmed = part.trim();
            if (trimmed) {
              pages.push({ pageNumber: idx + 1, text: trimmed });
            }
          });
        } else {
          const pageSize = 2500;
          let pNum = 1;
          for (let i = 0; i < rawText.length; i += pageSize) {
            const slice = rawText.slice(i, i + pageSize).trim();
            if (slice) {
              pages.push({ pageNumber: pNum++, text: slice });
            }
          }
        }
      }
    }

    // Sort pages by page number
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    const fullText = pages.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join('\n\n');
    const totalCharacters = fullText.length;

    if (pages.length === 0 || totalCharacters < 20) {
      throw new Error(
        'No readable digital text found in this PDF. It may be an image-only scanned document that requires OCR.'
      );
    }

    const { summary, topics } = analyzeDocumentOverview(originalFilename, fullText);

    return {
      title: cleanTitleFromFilename(originalFilename),
      pageCount: result?.total || result?.numpages || pages.length || 1,
      totalCharacters,
      pages,
      fullText,
      summary,
      detectedTopics: topics
    };
  } catch (err: any) {
    const errMsg = err?.message || '';
    const errName = err?.name || '';

    if (errName === 'PasswordException' || errMsg.toLowerCase().includes('password')) {
      throw new Error('This PDF is password-protected. Please remove the password protection and try again.');
    }
    if (errName === 'InvalidPDFException' || errName === 'FormatError' || errMsg.includes('Invalid PDF')) {
      if (errMsg.includes('zero bytes')) {
        throw new Error('The PDF file is empty (0 bytes). Please upload a valid document.');
      }
      throw new Error('Invalid or corrupted PDF file. Please ensure the document is a standard PDF.');
    }
    // Re-throw our custom errors directly
    throw err;
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {
        // ignore cleanup error
      }
    }
  }
}

/**
 * Extracts text from plain text or Markdown files
 */
export function extractTextFromPlainFile(text: string, originalFilename: string): ExtractedDocument {
  const cleaned = text.trim();
  if (cleaned.length < 20) {
    throw new Error('File content is empty or too short to process.');
  }

  // Split into pseudo-pages every ~2500 characters or logical section breaks
  const rawSections = cleaned.split(/\n(?=#{1,2}\s+|\bChapter\s+\d+|\bLecture\s+\d+)/i);
  const pages: ExtractedPage[] = [];

  if (rawSections.length > 1) {
    rawSections.forEach((sec, idx) => {
      pages.push({ pageNumber: idx + 1, text: sec.trim() });
    });
  } else {
    const pageSize = 2500;
    let pageNum = 1;
    for (let i = 0; i < cleaned.length; i += pageSize) {
      pages.push({
        pageNumber: pageNum++,
        text: cleaned.slice(i, i + pageSize).trim()
      });
    }
  }

  const { summary, topics } = analyzeDocumentOverview(originalFilename, cleaned);

  return {
    title: cleanTitleFromFilename(originalFilename),
    pageCount: pages.length,
    totalCharacters: cleaned.length,
    pages,
    fullText: cleaned,
    summary,
    detectedTopics: topics
  };
}

/**
 * Divide extracted pages into overlapping semantic chunks
 */
export function chunkDocumentPages(pages: ExtractedPage[], targetChunkChars = 800, overlapChars = 150): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    // Split page into paragraphs or sentences
    const paragraphs = pageText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    if (paragraphs.length === 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
        content: pageText,
        characterCount: pageText.length
      });
      continue;
    }

    let currentChunk = '';
    for (const paragraph of paragraphs) {
      if ((currentChunk + '\n' + paragraph).length <= targetChunkChars) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push({
            chunkIndex: chunkIndex++,
            pageNumber: page.pageNumber,
            content: currentChunk.trim(),
            characterCount: currentChunk.trim().length
          });
          // Keep overlap from end of current chunk
          const words = currentChunk.split(/\s+/);
          const overlapWords = words.slice(-Math.min(words.length, 25)).join(' ');
          currentChunk = `${overlapWords}\n\n${paragraph}`;
        } else {
          // If a single paragraph is larger than targetChunkChars, split by sentences
          chunks.push({
            chunkIndex: chunkIndex++,
            pageNumber: page.pageNumber,
            content: paragraph.trim(),
            characterCount: paragraph.trim().length
          });
          currentChunk = '';
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
        content: currentChunk.trim(),
        characterCount: currentChunk.trim().length
      });
    }
  }

  return chunks;
}

function cleanTitleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, '');
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function analyzeDocumentOverview(filename: string, text: string): { summary: string; topics: string[] } {
  // Extract key topics by heading matching and frequency
  const headingMatches = text.match(/^(?:#{1,3}|[0-9]+\.[0-9]*|[A-Z][A-Za-z0-9\s]{3,40}:)\s*(.+)$/gm) || [];
  const candidateTopics = new Set<string>();

  for (const match of headingMatches.slice(0, 8)) {
    const cleaned = match.replace(/^[#0-9.:\s]+/, '').trim();
    if (cleaned.length > 3 && cleaned.length < 45 && !cleaned.toLowerCase().includes('page')) {
      candidateTopics.add(cleaned);
    }
  }

  // Also look for academic keywords
  const keywords = [
    'Algorithm', 'Complexity', 'Data Structures', 'Database', 'Operating Systems',
    'Machine Learning', 'Neural Networks', 'Calculus', 'Linear Algebra', 'Genetics',
    'Organic Chemistry', 'Physics', 'Microeconomics', 'Macroeconomics', 'Distributed Systems',
    'Security', 'Software Engineering', 'Thermodynamics', 'Biochemistry', 'Network Protocols'
  ];

  for (const kw of keywords) {
    const reg = new RegExp(`\\b${kw}\\b`, 'i');
    if (reg.test(text) || reg.test(filename)) {
      candidateTopics.add(kw);
    }
  }

  if (candidateTopics.size === 0) {
    const base = cleanTitleFromFilename(filename);
    candidateTopics.add(base);
    candidateTopics.add('Core Concepts');
    candidateTopics.add('Key Principles');
  }

  const topics = Array.from(candidateTopics).slice(0, 5);

  // First 2-3 meaningful sentences as summary
  const cleanSnippet = text
    .replace(/\[Page \d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = cleanSnippet.match(/[^.!?]+[.!?]+/g) || [cleanSnippet.slice(0, 200)];
  const summary = sentences.slice(0, 3).join(' ').slice(0, 280) + '...';

  return { summary, topics };
}
