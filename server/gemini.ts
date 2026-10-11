import { GoogleGenAI, Type } from '@google/genai';
import { Citation, QuizQuestion, QuizDifficulty } from '../src/types/index.ts';
import { ScoredChunk } from './rag.ts';

export interface TutorResponse {
  answer: string;
  citations: Citation[];
  suggestedFollowUps: string[];
  isGeneralKnowledge: boolean;
}

export type TutorLevel = 'beginner' | 'intermediate' | 'advanced';
const GEMINI_MODEL = 'gemini-3.8-flash';
const aiClients = new Map<number, GoogleGenAI>();

type TutorErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'MODEL_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_BAD_REQUEST'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_ERROR'
  | 'EMPTY_RESPONSE'
  | 'INSUFFICIENT_SOURCE';

export class TutorServiceError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code: TutorErrorCode = 'UPSTREAM_ERROR',
    readonly retryable = false,
    readonly upstreamStatus?: number
  ) {
    super(message);
    this.name = 'TutorServiceError';
  }
}

function getTimeout(name: string, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured >= 1000
    ? Math.min(configured, 180000)
    : fallback;
}

function getGeminiClient(timeout: number): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new TutorServiceError(
      'Gemini is not configured. Add GEMINI_API_KEY to the server .env file and restart LearnMate AI to enable the AI tutor and voice transcription.',
      503,
      'NOT_CONFIGURED'
    );
  }

  let aiClient = aiClients.get(timeout);
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout,
        retryOptions: { attempts: 1 },
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    aiClients.set(timeout, aiClient);
  }

  return aiClient;
}

interface GeminiErrorMetadata {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
}

function getErrorRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};
}

function getNumericStatus(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;
}

function redactGeminiErrorMessage(message: string, sensitiveValues: string[] = []): string {
  let safeMessage = message;
  for (const value of sensitiveValues) {
    if (value.length >= 8) safeMessage = safeMessage.replaceAll(value, '[REDACTED_INPUT]');
  }
  return safeMessage
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:authorization|x-goog-api-key)\s*[:=]\s*[^\s,;]+/gi, '[REDACTED_CREDENTIAL]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 600);
}

export function getSafeGeminiErrorMetadata(error: unknown, sensitiveValues: string[] = []): GeminiErrorMetadata {
  const record = getErrorRecord(error);
  const nestedError = getErrorRecord(record.error);
  const response = getErrorRecord(record.response);
  const rawStatus = record.status ?? record.statusCode ?? response.status
    ?? nestedError.status ?? nestedError.statusCode;
  const rawCode = record.code ?? nestedError.code;
  const rawName = record.name ?? nestedError.name;
  const rawMessage = record.message ?? nestedError.message;
  return {
    ...(getNumericStatus(rawStatus) !== undefined ? { status: getNumericStatus(rawStatus) } : {}),
    ...(typeof rawCode === 'string' ? { code: rawCode.slice(0, 100) } : {}),
    ...(typeof rawName === 'string' ? { name: rawName.slice(0, 100) } : {}),
    ...(typeof rawMessage === 'string'
      ? { message: redactGeminiErrorMessage(rawMessage, sensitiveValues) }
      : {})
  };
}

export function getGeminiFailure(error: unknown, operation: string): TutorServiceError {
  const metadata = getSafeGeminiErrorMetadata(error);
  const status = metadata.status;
  const errorName = metadata.name || '';

  if (errorName === 'AbortError' || errorName === 'TimeoutError' || errorName === 'RequestTimeoutError') {
    return new TutorServiceError(
      `${operation} timed out. Check your connection and try again.`,
      504,
      'UPSTREAM_TIMEOUT',
      true,
      status
    );
  }

  if (status === 401 || status === 403) {
    return new TutorServiceError(
      'Gemini rejected the server API key. Replace it with a valid key that has Gemini API access.',
      502,
      'INVALID_API_KEY',
      false,
      status
    );
  }
  if (status === 404) {
    return new TutorServiceError(
      'The configured Gemini model is unavailable for this API key. Check the server model configuration.',
      502,
      'MODEL_UNAVAILABLE',
      false,
      status
    );
  }
  if (status === 429) {
    return new TutorServiceError(
      'The Gemini API rate limit or quota has been reached. Wait before trying again.',
      429,
      'QUOTA_EXCEEDED',
      true,
      status
    );
  }
  if (status === 400) {
    return new TutorServiceError(
      `${operation} was rejected by Gemini. Check the request format and model configuration.`,
      502,
      'UPSTREAM_BAD_REQUEST',
      false,
      status
    );
  }
  if (typeof status === 'number' && status >= 500) {
    return new TutorServiceError(
      'Gemini is temporarily unavailable. Please try again shortly.',
      502,
      'UPSTREAM_UNAVAILABLE',
      true,
      status
    );
  }
  return new TutorServiceError(
    `${operation} failed because of a network or upstream service error. Check your connection and try again.`,
    502,
    'UPSTREAM_ERROR',
    true,
    status
  );
}

function logGeminiFailure(
  error: unknown,
  failure: TutorServiceError,
  operation: string,
  sensitiveValues: string[] = []
): void {
  const metadata = getSafeGeminiErrorMetadata(error, sensitiveValues);
  console.error('Gemini request failed:', JSON.stringify({
    operation,
    code: failure.code,
    upstreamStatus: metadata.status ?? failure.upstreamStatus,
    upstreamCode: metadata.code,
    upstreamMessage: metadata.message
  }));
}

export async function transcribeTutorAudio(audio: Buffer, mimeType: string): Promise<string> {
  if (audio.length === 0) {
    throw new TutorServiceError('The recording is empty. Please record your question again.', 400, 'UPSTREAM_BAD_REQUEST');
  }
  const timeout = getTimeout('GEMINI_TRANSCRIPTION_TIMEOUT_MS', 120000);
  const client = getGeminiClient(timeout);

  try {
    const interaction = await client.interactions.create({
        model: GEMINI_MODEL,
        input: [
          {
            type: 'text',
            text: 'Transcribe the spoken words in this audio exactly as heard. Return only the transcription, without labels, commentary, or translation. If there is no intelligible speech, return an empty response.'
          },
          {
            type: 'audio',
            data: audio.toString('base64'),
            mime_type: mimeType
          }
        ],
        store: false
      });

    const transcript = (interaction.output_text || '').trim().replace(/^["']|["']$/g, '');
    if (!transcript) {
      throw new TutorServiceError('No speech was detected. Please speak clearly and try again.', 422, 'EMPTY_RESPONSE');
    }
    return transcript;
  } catch (error) {
    if (error instanceof TutorServiceError) throw error;
    const failure = getGeminiFailure(error, 'Voice transcription');
    logGeminiFailure(error, failure, 'speech transcription', [audio.toString('base64')]);
    throw failure;
  }
}

/**
 * Generate a friendly, pedagogical, source-grounded response for the student
 */
export async function askTutorWithRag(
  question: string,
  retrievedChunks: ScoredChunk[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  selectedDocTitles: string[] = [],
  level: TutorLevel = 'beginner',
  actionType?: string,
  studyMaterial?: { title: string; content: string }
): Promise<TutorResponse> {
  const hasRetrievedEvidence = retrievedChunks.length > 0 || Boolean(studyMaterial?.content);
  // Build context block
  let contextBlock = '';
  const citations: Citation[] = [];
  const seenPages = new Set<string>();

  if (hasRetrievedEvidence) {
    contextBlock = retrievedChunks
      .map((sc, idx) => {
        const c = sc.chunk;
        const pageKey = `${c.documentTitle}-p${c.pageNumber}`;
        if (!seenPages.has(pageKey)) {
          seenPages.add(pageKey);
          citations.push({
            documentId: c.documentId,
            documentTitle: c.documentTitle,
            pageNumber: c.pageNumber,
            snippet: sc.highlightedSnippet,
            relevanceScore: Math.round(sc.score * 10) / 10
          });
        }
        return `[Source Excerpt #${idx + 1} | Document: "${c.documentTitle}" | Page ${c.pageNumber}]\n${c.content}`;
      })
      .join('\n\n---\n\n');
  }

  const systemInstruction = `You are LearnMate AI, a friendly, patient, encouraging, and highly skilled college teacher. You explain complex concepts with crystal clarity, as if talking to a curious student during welcoming office hours who is learning the topic for the first time.

TEACHING PHILOSOPHY & TONE:
1. Speak warmly, encouragingly, and pedagogically. Celebrate curiosity and effort.
2. Tone: Clear, accessible, engaging, and patient. Avoid dense walls of text, unexplained acronyms, or copied textbook jargon.
3. Teaching Level: ${level.toUpperCase()}.
   - BEGINNER (default): Use simple everyday language, clear intuitive definitions, and familiar metaphors.
   - INTERMEDIATE: Introduce standard academic terms with solid intuition and real practical applications.
   - ADVANCED: Dive into deeper architectural reasoning, trade-offs, formal bounds, and nuanced edge cases.

TEACHING METHOD FOR CONCEPTUAL QUESTIONS:
Unless the student asks for a very quick factual lookup, a specific calculation, or a summary, structure your explanation with these 6 clear sections:

1. SIMPLE EXPLANATION
   Start with a friendly intro like "Let's understand it simply:" and explain the concept in plain, everyday words that a beginner can immediately grasp.

2. REAL-LIFE EXAMPLE
   Connect the concept to a familiar real-world situation (e.g., a college cafeteria, a post office, traffic lights, a library shelf). Explicitly clarify that this is an intuitive illustration.

3. STEP-BY-STEP BREAKDOWN
   Explain how it actually works, one step at a time (Step 1, Step 2, Step 3...), in logical sequence.

4. IMPORTANT POINTS
   Summarize 3-4 essential takeaways using short, digestible bullet points.

5. CHECK YOUR UNDERSTANDING
   Ask exactly ONE friendly, short question to check whether the student understood the concept.

6. NEXT STEP
   Suggest 2-3 natural follow-ups (e.g., trying another example, looking at a diagram idea, or practicing a short quiz).

INTERACTIVE ACTION MODES:
${actionType ? `The student triggered the action: "${actionType}". Give full priority to fulfilling this specific action in your warm teaching voice.` : ''}
- If the student's question is answering a previous "Check Your Understanding" question, evaluate their answer with positive encouragement, gently correct any misconceptions with clear reasoning, and confirm what they got right.
- If requested to "Explain more simply", strip down any remaining technical barriers and use an even friendlier intuitive analogy.
- If requested to "Give another example", offer a completely fresh, vivid real-world comparison.
- If requested to "Summarize in five points", provide exactly five concise bullet points.
- If requested to "Create a short quiz" or "Ask me a practice question", present a question with options or a scenario, and invite the student to reply.

DOCUMENT GROUNDING & INTEGRITY:
- Treat the current question as the priority. Use earlier conversation only when the question clearly refers to it.
- A matching keyword alone does not make an excerpt relevant. Use and cite excerpts only when they directly support the answer; otherwise explain from general knowledge and do not cite them.
- When an excerpt directly supports the answer, cite it inline exactly as [Document Title, Page X].
- Translate complex passages into simpler, understandable language without distorting their true academic meaning.
- If the selected study documents do NOT contain the answer, say so honestly: "Based on your selected study notes, this specific topic is not covered in detail." Then provide a friendly general-knowledge explanation labeled "--- General Knowledge Explanation ---".
- A provided STUDY LESSON has no page references. When using it, identify the lesson title if helpful, but never invent a page number or present an invented quotation as source text.
- Never invent quotations, page numbers, or citations.`;

  let userPrompt = '';
  try {
    const historyPrompt = conversationHistory.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const conciseDefinitionRequest = /\b(in simple(?:r)?(?: language| terms)?|simply|simple explanation|easy words)\b/i.test(question);
    const responseStyle = conciseDefinitionRequest
      ? 'Answer the current question directly in 2-4 beginner-friendly sentences and include one short everyday example. Do not use the six-section format.'
      : 'Provide a warm, encouraging, student-friendly explanation following your 6-part teaching method.';

    userPrompt = `${historyPrompt ? `Recent conversation context (use only if the current question refers to it):\n${historyPrompt}\n\n` : ''}${
      hasRetrievedEvidence
        ? `POSSIBLY RELEVANT STUDY MATERIAL EXCERPTS (verify that each excerpt actually supports the question before using or citing it):\n${contextBlock}${studyMaterial ? `\n\nSTUDY LESSON (provided lesson content; it has no page references):\nTitle: ${studyMaterial.title}\n${studyMaterial.content}` : ''}\n\n`
        : selectedDocTitles.length > 0
        ? `Note: The student selected documents [${selectedDocTitles.join(', ')}], but no matching excerpts were found for this query in the library.\n\n`
        : `Note: No specific documents were selected.\n\n`
    }CURRENT STUDENT QUESTION: "${question}"

${responseStyle}`;

    const timeout = getTimeout('GEMINI_TUTOR_TIMEOUT_MS', 90000);
    const response = await getGeminiClient(timeout).models.generateContent({
          model: GEMINI_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction
          },
        });

    const rawText = response.text || '';
    if (!rawText.trim()) {
      throw new TutorServiceError(
        'Gemini returned an empty answer. Please try asking the question again.',
        502,
        'EMPTY_RESPONSE',
        true
      );
    }
    const { answer, suggestedFollowUps, isGeneralKnowledge } = parseTutorText(rawText, !hasRetrievedEvidence);
    const citedSources = citations.filter((citation) =>
      rawText.includes(`[${citation.documentTitle}, Page ${citation.pageNumber}]`)
    );

    return {
      answer,
      citations: citedSources,
      suggestedFollowUps,
      isGeneralKnowledge: isGeneralKnowledge || citedSources.length === 0
    };
  } catch (err) {
    if (err instanceof TutorServiceError) throw err;
    const failure = getGeminiFailure(err, 'The AI tutor');
    logGeminiFailure(err, failure, 'tutor', [userPrompt, systemInstruction]);
    throw failure;
  }
}

/**
 * Parse follow-up questions from model output
 */
function parseTutorText(fullText: string, fallbackGeneral: boolean): { answer: string; suggestedFollowUps: string[]; isGeneralKnowledge: boolean } {
  let text = fullText;
  const followUpMatch = text.match(/(?:Suggested Next Steps|Suggested Follow-ups|Follow-up Questions):?\s*([\s\S]*)$/i);
  let followUps: string[] = [];

  if (followUpMatch && followUpMatch[1]) {
    const rawList = followUpMatch[1].trim();
    followUps = rawList
      .split('\n')
      .map(line => line.replace(/^[-*0-9.)\s]+/, '').trim())
      .filter(line => line.length > 8 && line.endsWith('?'))
      .slice(0, 3);
    text = text.substring(0, followUpMatch.index).trim();
  }

  if (followUps.length === 0) {
    followUps = [
      'Can you explain this with a real-world example?',
      'What are common misconceptions or exam traps for this topic?',
      'How does this relate to the previous lecture section?'
    ];
  }

  const isGeneralKnowledge = fallbackGeneral || text.includes('General Knowledge Explanation');

  return {
    answer: text,
    suggestedFollowUps: followUps,
    isGeneralKnowledge
  };
}

/**
 * Fallback tutor engine when Gemini API is unavailable or quota is exceeded
 */
function fallbackTutorEngine(
  question: string,
  chunks: ScoredChunk[],
  docTitles: string[],
  citations: Citation[],
  level: TutorLevel = 'beginner',
  actionType?: string
): TutorResponse {
  if (chunks.length === 0) {
    return {
      answer: `Let's understand it simply:

I searched your study materials${docTitles.length > 0 ? ` (${docTitles.join(', ')})` : ''}, but could not find a direct section that covers **"${question}"**.

--- General Knowledge Explanation ---

### 1. Simple Explanation
Every subject has foundational building blocks. When a concept isn't explicitly defined in your current notes, we can connect it to broader principles from your course syllabus.

### 2. Real-Life Example
Think of your library like a toolbox (illustration): you might have wrenches and screwdrivers, but need a specialized meter for this specific measurement. Adding a supplementary handout will complete the kit!

### 3. Step-by-Step Breakdown
1. **Identify the Core Keyword**: Pinpoint the exact term or formula you need.
2. **Expand Your Library**: Upload the corresponding lecture slide deck or textbook chapter.
3. **Connect to Known Topics**: Ask how this concept links to the notes you've already indexed.

### 4. Important Points
* Concepts build incrementally; verify adjoining syllabus topics.
* Re-phrasing with sub-terms can help locate related passages in your existing notes.

### 5. Check Your Understanding
Quick check: Would you like to upload the specific lecture slides or chapter for this topic, or explore how it relates to your existing library?`,
      citations: [],
      suggestedFollowUps: [
        'Can you summarize the main themes of my uploaded notes?',
        'What practice questions can I generate from my current library?',
        'Explain how this concept connects to my other notes.'
      ],
      isGeneralKnowledge: true
    };
  }

  const top = chunks[0];
  const pageRef = top.chunk.pageNumber;
  const docRef = top.chunk.documentTitle;
  const snippet = top.highlightedSnippet.replace(/\s+/g, ' ').trim();

  let answer = '';

  if (actionType === 'explain_simply') {
    answer = `Let's make this even simpler and clearer!

### 1. Simple Explanation
Think of **${top.chunk.documentTitle}** (Page ${pageRef}) as setting a clear rule for how the system stays reliable and consistent. Rather than guessing, the system checks verified state before moving forward.

### 2. Real-Life Example
Imagine a shared classroom whiteboard (illustration to build intuition): if two students write in the same corner simultaneously without looking at each other, the notes become messy. A protocol ensures only one student writes at a time so everyone reads clean notes!

### 3. Step-by-Step Breakdown
1. **Request**: A new piece of data or update arrives.
2. **Coordination**: The system checks Page ${pageRef} rules to verify authority.
3. **Confirmation**: All watchers receive the identical, accurate update.

### 4. Important Points
* Core definition grounded in **${docRef}** (Page ${pageRef}).
* Simplicity prevents state confusion and duplicate updates.

### 5. Check Your Understanding
Quick check: In our whiteboard analogy, what happens if two people update the state without checking the rules?`;
  } else if (actionType === 'summarize_5') {
    answer = `Here is your clean 5-point summary of this topic from **${docRef}** (Page ${pageRef}):

1. **Foundational Concept**: Grounded in ${docRef} (Page ${pageRef}), this rule establishes deterministic order under standard execution.
2. **Why It Matters**: Prevents inconsistency, split-brain scenarios, and stale read operations across participants.
3. **Key Trade-off**: Balances strict correctness against response latency during partial failures or network delays.
4. **Implementation Rule**: Requires adherence to invariants cited on Page ${pageRef}: "${snippet.slice(0, 90)}..."
5. **Practical Application**: Always verify the underlying assumptions and boundary conditions when designing or taking exams on this topic.

### Check Your Understanding
Quick check: Which of these five points represents the primary trade-off when implementing this in real systems?`;
  } else {
    answer = `Let's understand it simply:

According to your study material in **${docRef}** (Page ${pageRef}):

> "${snippet}"

### 1. Simple Explanation
At its heart, this concept establishes a predictable, dependable contract. In everyday terms: whenever a system or process performs an action, it guarantees that anyone checking the outcome will observe a logical, coherent result without confusing contradictions.

### 2. Real-Life Example
Imagine a bank branch with an ATM and a teller counter (illustration to build intuition): if you deposit $100 with the teller at 2:00 PM, you naturally expect the ATM outside to reflect that deposit immediately when you check at 2:01 PM. This concept ensures that real-world expectation holds true across computers!

### 3. Step-by-Step Breakdown
1. **Initial State**: A component or client submits a request under the conditions detailed on Page ${pageRef}.
2. **Rule Enforcement**: The system applies the core invariant: "${top.chunk.content.slice(0, 120).replace(/\s+/g, ' ').trim()}..."
3. **Verified Outcome**: Once committed, all observers see the identical updated state without rollbacks.

### 4. Important Points
* **Source Reference**: Grounded in **${docRef}** (Page ${pageRef}).
* **Key Guarantee**: Eliminates anomalous behavior and unpredictable divergence.
* **Exam Tip**: When answering questions on this, clearly state the operational guarantees and assumptions defined in your notes.

### 5. Check Your Understanding
Quick check: Why is real-time ordering so critical in our bank account example, and what could go wrong without it?`;
  }

  return {
    answer,
    citations,
    suggestedFollowUps: [
      'Explain more simply with another example',
      'Summarize in five points',
      'Create a short practice quiz on this section'
    ],
    isGeneralKnowledge: false
  };
}

/**
 * Generate adaptive multiple-choice quiz questions from study materials
 */
export async function generateAdaptiveQuiz(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  chunks: ScoredChunk[],
  docTitle?: string,
  studyMaterial?: { title: string; content: string }
): Promise<QuizQuestion[]> {
  const contextText = chunks
    .slice(0, 6)
    .map(c => `[Page ${c.chunk.pageNumber}]: ${c.chunk.content}`)
    .join('\n\n');
  const timeout = getTimeout('GEMINI_QUIZ_TIMEOUT_MS', 90000);
  const prompt = `You are an expert exam designer. Generate a high-quality ${difficulty}-difficulty multiple-choice quiz with exactly ${count} questions testing the student's mastery of "${topic}".

Base the questions on the provided study material whenever possible:
${studyMaterial ? `STUDY LESSON "${studyMaterial.title}" (lesson content; do not invent page references):\n${studyMaterial.content}\n\n` : contextText ? `STUDY MATERIAL${docTitle ? ` from "${docTitle}"` : ''}:\n${contextText}\n\n` : 'No study excerpts were provided; use accurate general knowledge about the requested topic.\n\n'}

Rules:
1. Each question must have exactly 4 plausible, distinct options.
2. Only 1 option must be correct.
3. Include correctOptionIndex (0, 1, 2, or 3).
4. Provide a thorough, pedagogical explanation of why the correct option is right and why others are wrong.
5. If grounded in paginated uploaded notes, include the pageNumber. Do not include pageNumber for a lesson without page references.
6. The difficulty must be "${difficulty}".
7. Return strictly a JSON array matching the schema.`;

  try {
    const response = await getGeminiClient(timeout).models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of multiple-choice quiz questions',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Four answer choices'
                },
                correctOptionIndex: { type: Type.INTEGER, description: 'Index 0, 1, 2, or 3' },
                explanation: { type: Type.STRING },
                pageNumber: { type: Type.INTEGER },
                topic: { type: Type.STRING },
                difficulty: { type: Type.STRING }
              },
              required: ['question', 'options', 'correctOptionIndex', 'explanation', 'topic', 'difficulty']
            }
          }
        }
      });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text || '');
    } catch {
      throw new TutorServiceError(
        'The AI returned an invalid quiz format. Please try generating the quiz again.',
        502,
        'UPSTREAM_BAD_REQUEST',
        true
      );
    }

    if (!Array.isArray(parsed) || parsed.length !== count) {
      throw new TutorServiceError(
        `The AI returned ${Array.isArray(parsed) ? parsed.length : 0} questions instead of the requested ${count}. Please try again.`,
        502,
        'UPSTREAM_BAD_REQUEST',
        true
      );
    }

    return parsed.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new TutorServiceError('The AI returned an invalid quiz question. Please try again.', 502, 'UPSTREAM_BAD_REQUEST', true);
      }
      const question = item as Record<string, unknown>;
      const options = question.options;
      const correctOptionIndex = question.correctOptionIndex;
      if (
        typeof question.question !== 'string' || !question.question.trim() ||
        typeof question.explanation !== 'string' || !question.explanation.trim() ||
        !Array.isArray(options) || options.length !== 4 ||
        options.some(option => typeof option !== 'string' || !option.trim()) ||
        new Set(options.map(option => (option as string).trim().toLocaleLowerCase())).size !== 4 ||
        typeof correctOptionIndex !== 'number' || !Number.isInteger(correctOptionIndex) ||
        correctOptionIndex < 0 || correctOptionIndex > 3
      ) {
        throw new TutorServiceError('The AI returned an invalid quiz question. Please try generating the quiz again.', 502, 'UPSTREAM_BAD_REQUEST', true);
      }

      const pageNumber = typeof question.pageNumber === 'number' && Number.isInteger(question.pageNumber) && question.pageNumber > 0
        ? question.pageNumber
        : undefined;
      return {
        id: `q-${Date.now()}-${index}`,
        question: question.question.trim(),
        options: options.map(option => (option as string).trim()),
        correctOptionIndex,
        explanation: question.explanation.trim(),
        ...(pageNumber ? { pageNumber } : {}),
        topic: typeof question.topic === 'string' && question.topic.trim() ? question.topic.trim() : topic,
        difficulty
      };
    });
  } catch (error) {
    if (error instanceof TutorServiceError) throw error;
    const failure = getGeminiFailure(error, 'Quiz generation');
    logGeminiFailure(error, failure, 'quiz generation', [prompt]);
    throw failure;
  }
}
