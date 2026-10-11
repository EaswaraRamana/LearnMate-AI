import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createHash, randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, DEMO_USER_ID } from './server/db.ts';
import {
  createSessionToken,
  DUMMY_PASSWORD_HASH,
  hashPassword,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifyPassword
} from './server/auth.ts';
import { extractTextFromPdf, extractTextFromPlainFile, chunkDocumentPages } from './server/pdf.ts';
import { retrieveRelevantChunks, formatCitations } from './server/rag.ts';
import { askTutorWithRag, generateAdaptiveQuiz, transcribeTutorAudio, TutorServiceError } from './server/gemini.ts';
import { createQuotaPracticeQuiz } from './server/quiz-fallback.ts';
import { calculateTopicMastery } from './server/adaptive.ts';
import { DocumentItem, Quiz, QuizAttempt, QuizAttemptResponse, TopicMastery, StudyTask, SavedStudyResource } from './src/types/index.ts';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/data', (_req: Request, res: Response) => {
  res.sendStatus(404);
});

// Set up Multer for handling file uploads (stored in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.txt', '.md', '.markdown'];
    const mimeType = file.mimetype.toLowerCase().split(';')[0];
    const isPdf = ext === '.pdf' && (mimeType === 'application/pdf' || mimeType === 'application/octet-stream');
    const isText = ['.txt', '.md', '.markdown'].includes(ext)
      && (mimeType.startsWith('text/') || mimeType === 'application/octet-stream');
    if (allowed.includes(ext) && (isPdf || isText)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format or content type (${ext || 'unknown'}). Please upload a PDF, TXT, or Markdown document.`));
    }
  }
});

const tutorAudioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const supportedAudioTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/aac'];
    if (supportedAudioTypes.includes(file.mimetype.split(';')[0].toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio recording format. Please use a current version of Chrome or Edge.'));
    }
  }
});

// Middleware to safely catch multer upload errors with JSON responses
const handleUploadFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds the 25 MB limit. Please select a smaller document or chapter.' });
        return;
      }
      res.status(400).json({ error: err.message || 'File upload failed. Please verify format and size.' });
      return;
    }
    next();
  });
};

function getSessionToken(req: Request): string | undefined {
  const cookies = req.headers.cookie?.split(';') || [];
  const sessionCookie = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = sessionCookie?.slice(SESSION_COOKIE_NAME.length + 1);
  return token && /^[a-f0-9]{64}$/i.test(token) ? token : undefined;
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getSessionUserId(req: Request): string | undefined {
  const token = getSessionToken(req);
  return token ? db.getAuthSessionUserId(hashSessionToken(token)) : undefined;
}

// Unauthenticated access remains scoped to the original demo account.
function getUserId(req: Request): string {
  return getSessionUserId(req) || DEMO_USER_ID;
}

function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
  );
}

function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function getPasswordValidationError(password: string): string | undefined {
  if (password.length < 8) return 'Password must contain at least 8 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include an uppercase letter, a lowercase letter, and a number.';
  }
  return undefined;
}

// ----------------- API ROUTES -----------------

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    demoUser: DEMO_USER_ID
  });
});

app.post('/api/tutor/transcribe', (req: Request, res: Response, next: NextFunction) => {
  tutorAudioUpload.single('audio')(req, res, (error: unknown) => {
    if (error) {
      const uploadError = error as Error & { code?: string };
      res.status(400).json({
      error: {
        code: uploadError.code === 'LIMIT_FILE_SIZE' ? 'AUDIO_TOO_LARGE' : 'INVALID_AUDIO',
        message: uploadError.code === 'LIMIT_FILE_SIZE'
          ? 'Voice recording is too large. Please record a shorter question.'
          : uploadError.message || 'Voice recording upload failed.',
        retryable: false
      }
    });
      return;
    }
    next();
  });
}, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'A voice recording is required.' });
    return;
  }

  try {
    const transcript = await transcribeTutorAudio(req.file.buffer, req.file.mimetype.split(';')[0].toLowerCase());
    res.json({ transcript });
  } catch (error) {
    if (error instanceof TutorServiceError) {
      console.error(`Tutor transcription error (${error.code}${error.upstreamStatus ? `, upstream ${error.upstreamStatus}` : ''}).`);
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          upstreamStatus: error.upstreamStatus
        }
      });
      return;
    }
    console.error('Tutor transcription failed due to an unexpected server error.');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Voice transcription failed because of an unexpected server error.', retryable: false }
    });
  }
});

// Authentication
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (name.length < 2 || name.length > 80) {
    res.status(400).json({ error: 'Enter a name between 2 and 80 characters.' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  if (db.findAuthAccountByEmail(email)) {
    res.status(409).json({ error: 'An account with this email already exists. Sign in or use a different email address.' });
    return;
  }

  try {
    const userId = randomUUID();
    const createdAt = new Date().toISOString();
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
    const passwordHash = await hashPassword(password);
    const created = db.createAuthAccount(
      { id: userId, email, name, createdAt },
      passwordHash,
      hashSessionToken(token),
      expiresAt
    );
    if (!created) {
      res.status(409).json({ error: 'An account with this email already exists. Sign in or use a different email address.' });
      return;
    }

    setSessionCookie(res, token);
    res.status(201).json({ user: db.getUser(userId), requiresEmailVerification: false });
  } catch (error) {
    console.error('Account registration failed:', error);
    res.status(500).json({ error: 'We could not create your account right now. Please try again.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isValidEmail(email) || !password || password.length > 128) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }

  const account = db.findAuthAccountByEmail(email);
  try {
    const passwordMatches = await verifyPassword(password, account?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!account || !passwordMatches) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
    db.createAuthSession(account.userId, hashSessionToken(token), expiresAt);
    setSessionCookie(res, token);
    res.json({ user: db.getUser(account.userId), requiresEmailVerification: false });
  } catch (error) {
    console.error('Sign-in failed:', error);
    res.status(500).json({ error: 'We could not sign you in right now. Please try again.' });
  }
});

app.get('/api/auth/session', (req: Request, res: Response) => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'You are not signed in.' });
    return;
  }
  res.json({ user: db.getUser(userId) });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) db.deleteAuthSession(hashSessionToken(token));
  clearSessionCookie(res);
  res.json({ success: true });
});

// User Profile
app.get('/api/profile', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const user = db.getUser(userId);
  res.json({ user, hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

app.post('/api/profile', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { name, learningGoal, targetExamOrCourse } = req.body;
  const updated = db.updateUserProfile(userId, { name, learningGoal, targetExamOrCourse });
  res.json({ user: updated });
});

// Documents: List
app.get('/api/documents', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const docs = db.getDocuments(userId);
  res.json({ documents: docs });
});

// Documents: Inspect single document
app.get('/api/documents/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const doc = db.getDocument(userId, req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  const chunks = db.getDocumentChunks(userId, [doc.id]);
  res.json({ document: doc, chunks });
});

// Documents: Upload & Process
app.post('/api/documents/upload', handleUploadFile, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'No file uploaded. Please select a PDF or text file.' });
    return;
  }

  const existingDocId = (req.body.existingDocId as string) || '';
  const isRetry = !!existingDocId && !!db.getDocument(userId, existingDocId);
  const docId = isRetry ? existingDocId : `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const ext = path.extname(file.originalname).toLowerCase();

  try {
    let extracted;
    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      extracted = await extractTextFromPdf(file.buffer, file.originalname);
    } else {
      const textContent = file.buffer.toString('utf-8');
      extracted = extractTextFromPlainFile(textContent, file.originalname);
    }

    const textChunks = chunkDocumentPages(extracted.pages);

    const docChunks = textChunks.map(tc => ({
      id: `chunk-${docId}-${tc.chunkIndex}`,
      documentId: docId,
      documentTitle: extracted.title,
      chunkIndex: tc.chunkIndex,
      pageNumber: tc.pageNumber,
      content: tc.content,
      characterCount: tc.characterCount
    }));

    const newDoc: DocumentItem = {
      id: docId,
      userId,
      title: extracted.title,
      fileName: file.originalname,
      fileSize: file.size,
      pageCount: extracted.pageCount,
      chunkCount: docChunks.length,
      status: 'ready',
      createdAt: new Date().toISOString(),
      summary: extracted.summary,
      topics: extracted.detectedTopics
    };

    if (isRetry) {
      db.updateDocument(userId, docId, newDoc, docChunks);
    } else {
      db.addDocument(userId, newDoc, docChunks);
    }

    res.status(201).json({
      success: true,
      document: newDoc,
      message: `Document processed successfully: ${extracted.pageCount} pages, ${docChunks.length} indexed chunks.`
    });
  } catch (err: any) {
    console.error('File extraction error:', err);
    // Record failed document so user can retry or see error
    const failedDoc: DocumentItem = {
      id: docId,
      userId,
      title: file.originalname,
      fileName: file.originalname,
      fileSize: file.size,
      pageCount: 0,
      chunkCount: 0,
      status: 'failed',
      errorMessage: err.message || 'Failed to extract text from document',
      createdAt: new Date().toISOString(),
      topics: []
    };

    if (isRetry) {
      db.updateDocument(userId, docId, failedDoc, []);
    } else {
      db.addDocument(userId, failedDoc, []);
    }

    res.status(422).json({
      success: false,
      error: err.message || 'Failed to extract text from document',
      document: failedDoc
    });
  }
});

// Documents: Retry Processing for an existing failed document
app.post('/api/documents/:id/reprocess', handleUploadFile, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const docId = req.params.id;
  const existingDoc = db.getDocument(userId, docId);

  if (!existingDoc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Please upload a replacement or corrected file for retry.' });
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  try {
    let extracted;
    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      extracted = await extractTextFromPdf(file.buffer, file.originalname);
    } else {
      const textContent = file.buffer.toString('utf-8');
      extracted = extractTextFromPlainFile(textContent, file.originalname);
    }

    const textChunks = chunkDocumentPages(extracted.pages);
    const docChunks = textChunks.map(tc => ({
      id: `chunk-${docId}-${tc.chunkIndex}`,
      documentId: docId,
      documentTitle: extracted.title,
      chunkIndex: tc.chunkIndex,
      pageNumber: tc.pageNumber,
      content: tc.content,
      characterCount: tc.characterCount
    }));

    const updatedDoc: DocumentItem = {
      ...existingDoc,
      title: extracted.title,
      fileName: file.originalname,
      fileSize: file.size,
      pageCount: extracted.pageCount,
      chunkCount: docChunks.length,
      status: 'ready',
      errorMessage: undefined,
      summary: extracted.summary,
      topics: extracted.detectedTopics
    };

    db.updateDocument(userId, docId, updatedDoc, docChunks);

    res.json({
      success: true,
      document: updatedDoc,
      message: `Document re-processed successfully: ${extracted.pageCount} pages, ${docChunks.length} chunks.`
    });
  } catch (err: any) {
    db.updateDocument(userId, docId, {
      status: 'failed',
      errorMessage: err.message || 'Failed to reprocess document'
    });
    res.status(422).json({
      success: false,
      error: err.message || 'Failed to reprocess document'
    });
  }
});

// Documents: Delete
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const deleted = db.deleteDocument(userId, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ success: true, message: 'Document and its indexed chunks removed.' });
});

app.get('/api/study/progress', (req: Request, res: Response) => {
  const userId = getUserId(req);
  res.json({
    progress: db.getStudyProgress(userId),
    resources: db.getStudyResources(userId)
  });
});

app.patch('/api/study/progress/:materialId', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const materialId = req.params.materialId;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!materialId || materialId.length > 256 || !/^(lesson|document|resource):[a-zA-Z0-9._-]+$/.test(materialId)) {
    res.status(400).json({ error: 'The selected study material is invalid.' });
    return;
  }
  if (materialId.startsWith('document:') && !db.getDocument(userId, materialId.slice('document:'.length))) {
    res.status(404).json({ error: 'The selected study document could not be found.' });
    return;
  }
  if (materialId.startsWith('resource:')
    && !db.getStudyResources(userId).some((resource) => resource.id === materialId.slice('resource:'.length))) {
    res.status(404).json({ error: 'The saved learning resource could not be found.' });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.progressPercent !== undefined) {
    if (!Number.isInteger(body.progressPercent) || body.progressPercent < 0 || body.progressPercent > 100) {
      res.status(400).json({ error: 'Reading progress must be a whole number from 0 to 100.' });
      return;
    }
    updates.progressPercent = body.progressPercent;
  }
  if (body.sectionIndex !== undefined) {
    if (!Number.isInteger(body.sectionIndex) || body.sectionIndex < 0 || body.sectionIndex > 1000) {
      res.status(400).json({ error: 'The reading section is invalid.' });
      return;
    }
    updates.sectionIndex = body.sectionIndex;
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') {
      res.status(400).json({ error: 'Completion status must be true or false.' });
      return;
    }
    updates.completed = body.completed;
    if (body.completed) updates.progressPercent = 100;
  }
  if (body.bookmarked !== undefined) {
    if (typeof body.bookmarked !== 'boolean') {
      res.status(400).json({ error: 'Bookmark status must be true or false.' });
      return;
    }
    updates.bookmarked = body.bookmarked;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 10000) {
      res.status(400).json({ error: 'Personal notes must be 10,000 characters or fewer.' });
      return;
    }
    updates.notes = body.notes;
  }
  const progress = db.updateStudyProgress(userId, materialId, updates, body.accessed === true);
  res.json({ progress });
});

app.post('/api/study/resources', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { title, url, subject, topic = '', description = '' } = body;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) {
    res.status(400).json({ error: 'Enter a resource title of 1 to 160 characters.' });
    return;
  }
  if (typeof url !== 'string' || url.length > 2048) {
    res.status(400).json({ error: 'Enter a valid web address.' });
    return;
  }
  let safeUrl: URL;
  try {
    safeUrl = new URL(url);
  } catch {
    res.status(400).json({ error: 'Enter a valid web address.' });
    return;
  }
  if (!['http:', 'https:'].includes(safeUrl.protocol)) {
    res.status(400).json({ error: 'Only HTTP and HTTPS learning resources can be saved.' });
    return;
  }
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 100
    || typeof topic !== 'string' || topic.length > 100
    || typeof description !== 'string' || description.length > 500) {
    res.status(400).json({ error: 'Please check the resource subject, topic, and description.' });
    return;
  }
  const resource: SavedStudyResource = {
    id: `resource-${randomUUID()}`,
    userId,
    title: title.trim(),
    url: safeUrl.toString(),
    subject: subject.trim(),
    topic: topic.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString()
  };
  db.addStudyResource(resource);
  res.status(201).json({ resource });
});

// Documents: Search
app.get('/api/documents/search', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const q = (req.query.q as string) || '';
  if (!q.trim()) {
    res.json({ results: [] });
    return;
  }
  const allChunks = db.getDocumentChunks(userId);
  const scored = retrieveRelevantChunks(q, allChunks, 8);
  const citations = formatCitations(scored);
  res.json({ results: scored.map(s => ({ chunk: s.chunk, score: s.score })), citations });
});

// AI Tutor: Conversations
app.get('/api/tutor/conversations', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const conversations = db.getConversations(userId);
  res.json({ conversations });
});

app.post('/api/tutor/conversations', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { title, documentIds } = req.body;
  const conv = db.createConversation(userId, title || 'New Study Session', documentIds || []);
  res.status(201).json({ conversation: conv });
});

app.get('/api/tutor/conversations/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const result = db.getConversation(userId, req.params.id);
  if (!result) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json(result);
});

app.delete('/api/tutor/conversations/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const deleted = db.deleteConversation(userId, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json({ success: true });
});

// AI Tutor: Chat Q&A with RAG
app.post('/api/tutor/chat', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { question, conversationId, documentIds = [], level = 'beginner', actionType, studyMaterial } = body;

  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: { code: 'INVALID_QUESTION', message: 'Question text is required.', retryable: false } });
    return;
  }
  if (question.trim().length > 4000) {
    res.status(400).json({ error: { code: 'QUESTION_TOO_LONG', message: 'Please keep your question under 4,000 characters.', retryable: false } });
    return;
  }
  if (conversationId !== undefined && (typeof conversationId !== 'string' || !conversationId.trim() || conversationId.length > 128)) {
    res.status(400).json({ error: { code: 'INVALID_CONVERSATION_ID', message: 'The conversation identifier is invalid.', retryable: false } });
    return;
  }
  if (!Array.isArray(documentIds) || documentIds.length > 50 || documentIds.some((id: unknown) => typeof id !== 'string' || !id.trim() || id.length > 128)) {
    res.status(400).json({ error: { code: 'INVALID_DOCUMENT_IDS', message: 'Document selections must be a list of valid document identifiers.', retryable: false } });
    return;
  }
  if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
    res.status(400).json({ error: { code: 'INVALID_LEVEL', message: 'Choose a valid tutor teaching level.', retryable: false } });
    return;
  }
  if (actionType !== undefined && (typeof actionType !== 'string' || actionType.length > 64)) {
    res.status(400).json({ error: { code: 'INVALID_ACTION', message: 'The tutor action is invalid.', retryable: false } });
    return;
  }
  if (studyMaterial !== undefined && (
    !studyMaterial || typeof studyMaterial !== 'object'
    || typeof studyMaterial.title !== 'string' || !studyMaterial.title.trim() || studyMaterial.title.length > 160
    || typeof studyMaterial.content !== 'string' || !studyMaterial.content.trim() || studyMaterial.content.length > 12000
  )) {
    res.status(400).json({ error: { code: 'INVALID_STUDY_MATERIAL', message: 'The selected study lesson is invalid or too long.', retryable: false } });
    return;
  }

  // Ensure conversation exists
  let convId = conversationId;
  const createdConversation = !convId;
  if (!convId) {
    const conv = db.createConversation(userId, question.slice(0, 36) + '...', documentIds);
    convId = conv.id;
  }

  // Save User Message
  const userMsg = {
    id: `msg-u-${Date.now()}`,
    conversationId: convId,
    role: 'user' as const,
    content: question.trim(),
    timestamp: new Date().toISOString()
  };

  try {
    // Retrieve relevant chunks from selected documents (or all if none selected)
    const availableChunks = documentIds.length > 0
      ? db.getDocumentChunks(userId, documentIds)
      : studyMaterial
        ? []
        : db.getDocumentChunks(userId);
    const scoredChunks = retrieveRelevantChunks(question, availableChunks, 5);

    // Get selected document titles
    const selectedDocTitles: string[] = [];
    if (documentIds.length > 0) {
      documentIds.forEach((dId: string) => {
        const d = db.getDocument(userId, dId);
        if (d) selectedDocTitles.push(d.title);
      });
    }

    // Previous messages for conversation context
    const currentConv = db.getConversation(userId, convId);
    const history = (currentConv?.messages || [])
      .filter(m => m.id !== userMsg.id)
      .slice(-6)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const tutorResult = await askTutorWithRag(
      question,
      scoredChunks,
      history,
      selectedDocTitles,
      level,
      actionType,
      studyMaterial
    );

    db.addMessage(userId, convId, userMsg);

    // Save Assistant Message
    const assistantMsg = {
      id: `msg-a-${Date.now()}`,
      conversationId: convId,
      role: 'assistant' as const,
      content: tutorResult.answer,
      citations: tutorResult.citations,
      suggestedFollowUps: tutorResult.suggestedFollowUps,
      isGeneralKnowledge: tutorResult.isGeneralKnowledge,
      timestamp: new Date().toISOString()
    };
    db.addMessage(userId, convId, assistantMsg);

    res.json({
      conversationId: convId,
      message: assistantMsg
    });
  } catch (err: unknown) {
    if (createdConversation) {
      db.deleteConversation(userId, convId);
    }
    if (err instanceof TutorServiceError) {
      console.error(`Tutor chat error (${err.code}${err.upstreamStatus ? `, upstream ${err.upstreamStatus}` : ''}).`);
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          retryable: err.retryable,
          upstreamStatus: err.upstreamStatus
        }
      });
      return;
    }
    console.error('Tutor chat failed due to an unexpected server error.');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'The AI tutor could not process this question because of an unexpected server error.', retryable: false }
    });
  }
});

// Quizzes: Generate Adaptive Quiz
app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { topic, difficulty = 'medium', questionCount = 5, documentId, studyMaterial } = body;

  if (typeof topic !== 'string' || !topic.trim() || topic.trim().length > 200) {
    res.status(400).json({ error: { code: 'INVALID_TOPIC', message: 'Enter a topic of 1 to 200 characters to generate a quiz.' } });
    return;
  }
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    res.status(400).json({ error: { code: 'INVALID_DIFFICULTY', message: 'Choose an easy, medium, or hard quiz.' } });
    return;
  }
  if (!Number.isInteger(questionCount) || questionCount < 3 || questionCount > 15) {
    res.status(400).json({ error: { code: 'INVALID_QUESTION_COUNT', message: 'Choose between 3 and 15 quiz questions.' } });
    return;
  }
  if (documentId !== undefined && (typeof documentId !== 'string' || !documentId.trim())) {
    res.status(400).json({ error: { code: 'INVALID_DOCUMENT', message: 'The selected study document is invalid.' } });
    return;
  }
  if (documentId && !db.getDocument(userId, documentId)) {
    res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'The selected study document could not be found.' } });
    return;
  }
  if (studyMaterial !== undefined && (
    !studyMaterial || typeof studyMaterial !== 'object'
    || typeof studyMaterial.title !== 'string' || !studyMaterial.title.trim() || studyMaterial.title.length > 160
    || typeof studyMaterial.content !== 'string' || !studyMaterial.content.trim() || studyMaterial.content.length > 25000
  )) {
    res.status(400).json({ error: { code: 'INVALID_STUDY_MATERIAL', message: 'The selected study lesson is invalid or too long.' } });
    return;
  }
  if (documentId && studyMaterial) {
    res.status(400).json({ error: { code: 'AMBIGUOUS_SOURCE', message: 'Choose an uploaded document or a built-in lesson, not both.' } });
    return;
  }

  try {
    // Get relevant chunks for context
    const chunks = studyMaterial
      ? []
      : documentId
        ? db.getDocumentChunks(userId, [documentId])
        : db.getDocumentChunks(userId);

    const scored = retrieveRelevantChunks(topic, chunks, 6);
    let docTitle: string | undefined;
    if (documentId) {
      const d = db.getDocument(userId, documentId);
      if (d) docTitle = d.title;
    }

    const normalizedTopic = topic.trim();
    let questions;
    let generationMode: Quiz['generationMode'] = 'gemini';
    try {
      questions = await generateAdaptiveQuiz(normalizedTopic, difficulty, questionCount, scored, docTitle, studyMaterial);
    } catch (error) {
      if (!(error instanceof TutorServiceError) || error.code !== 'QUOTA_EXCEEDED') throw error;

      const fallbackChunks = studyMaterial
        ? [{
            id: 'selected-study-lesson',
            documentId: 'selected-study-lesson',
            documentTitle: studyMaterial.title,
            chunkIndex: 0,
            pageNumber: 0,
            content: studyMaterial.content,
            characterCount: studyMaterial.content.length
          }].map((chunk) => ({ chunk, score: 1, highlightedSnippet: chunk.content.slice(0, 200) }))
        : scored;
      const practiceQuiz = createQuotaPracticeQuiz(normalizedTopic, difficulty, questionCount, fallbackChunks, studyMaterial);
      questions = practiceQuiz.questions;
      generationMode = practiceQuiz.mode;
      if (studyMaterial && questions.length < Math.min(3, questionCount)) {
        throw new TutorServiceError(
          'AI quiz generation is unavailable, and this lesson does not contain enough text for a source-based fallback quiz.',
          503,
          'INSUFFICIENT_SOURCE',
          false
        );
      }
      console.info(`Quiz practice fallback activated (${generationMode}) after Gemini quota response.`);
    }

    const quizId = `quiz-${Date.now()}`;
    const quiz: Quiz = {
      id: quizId,
      userId,
      generationMode,
      documentId,
      documentTitle: docTitle,
      topic: normalizedTopic,
      difficulty,
      questionCount,
      createdAt: new Date().toISOString(),
      questions
    };

    db.saveQuiz(quiz);

    // Send quiz to client (with full metadata for interactive study)
    res.status(201).json({
      quiz,
      notice: generationMode === 'uploaded-notes'
        ? 'AI-generated quizzes are temporarily unavailable, so practice questions were made only from exact text in your uploaded study notes.'
        : generationMode === 'sample-practice'
          ? 'AI-generated quizzes are temporarily unavailable. Verified local sample questions are being used; they may not match your selected topic exactly.'
          : undefined
    });
  } catch (err: unknown) {
    if (err instanceof TutorServiceError) {
      console.error(`Quiz generation error (${err.code}${err.upstreamStatus ? `, upstream ${err.upstreamStatus}` : ''}).`);
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          retryable: err.retryable,
          upstreamStatus: err.upstreamStatus
        }
      });
      return;
    }
    console.error('Quiz generation failed because of an unexpected server error.');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Quiz generation failed because of an unexpected server error.', retryable: false }
    });
  }
});

// Quizzes: Submit Attempt (Server-Side Scoring!)
app.post('/api/quiz/submit', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { quizId, responses, timeSpentSeconds = 0 } = body;

  if (typeof quizId !== 'string' || !quizId.trim() || !Array.isArray(responses)) {
    res.status(400).json({ error: { code: 'INVALID_SUBMISSION', message: 'Quiz ID and question responses are required.' } });
    return;
  }

  const quiz = db.getQuiz(quizId);
  if (!quiz || quiz.userId !== userId) {
    res.status(404).json({ error: { code: 'QUIZ_NOT_FOUND', message: 'Quiz not found.' } });
    return;
  }
  if (
    !Number.isInteger(timeSpentSeconds) || timeSpentSeconds < 0 || timeSpentSeconds > 86400 ||
    responses.length !== quiz.questions.length ||
    responses.some((response: any) =>
      !response || typeof response.questionId !== 'string' ||
      !Number.isInteger(response.selectedOptionIndex) ||
      response.selectedOptionIndex < -1 || response.selectedOptionIndex > 3
    ) ||
    new Set(responses.map((response: any) => response.questionId)).size !== responses.length ||
    quiz.questions.some(question => !responses.some((response: any) => response.questionId === question.id))
  ) {
    res.status(400).json({ error: { code: 'INVALID_SUBMISSION', message: 'Answers must include each quiz question once, with an option from A–D or unanswered.' } });
    return;
  }

  // Server-side scoring against verified correct answers
  let correctCount = 0;
  const scoredResponses: QuizAttemptResponse[] = [];
  const topicStats: Record<string, { total: number; correct: number }> = {};

  quiz.questions.forEach(q => {
    const studentResp = responses.find((r: { questionId: string }) => r.questionId === q.id);
    const selected = studentResp ? studentResp.selectedOptionIndex : -1;
    const isCorrect = selected === q.correctOptionIndex;

    if (isCorrect) correctCount++;

    scoredResponses.push({
      questionId: q.id,
      selectedOptionIndex: selected,
      isCorrect,
      explanation: q.explanation,
      topic: q.topic || quiz.topic
    });

    const t = q.topic || quiz.topic;
    if (!topicStats[t]) topicStats[t] = { total: 0, correct: 0 };
    topicStats[t].total++;
    if (isCorrect) topicStats[t].correct++;
  });

  const totalQuestions = quiz.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  // Update Topic Mastery and build Adaptive Recommendations
  const currentMasteryMap = db.getTopicMastery(userId);
  const masteryUpdates: Record<string, TopicMastery> = {};
  const newTasks: StudyTask[] = [];

  for (const [topic, stats] of Object.entries(topicStats)) {
    const topicAccuracy = Math.round((stats.correct / stats.total) * 100);
    const existing = currentMasteryMap[topic];
    const update = calculateTopicMastery(topic, topicAccuracy, existing);

    masteryUpdates[topic] = {
      topic,
      score: update.newScore,
      level: update.level,
      totalAttempts: (existing?.totalAttempts || 0) + 1,
      correctCount: (existing?.correctCount || 0) + stats.correct,
      lastAssessedAt: new Date().toISOString(),
      trend: update.trend,
      history: [...(existing?.history || []), update.newScore].slice(-10)
    };

    if (update.recommendedStudyTask) {
      newTasks.push({
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        ...update.recommendedStudyTask
      });
    }
  }

  const feedbackNotes = percentage >= 80
    ? `Outstanding performance! You demonstrated proficient mastery of ${quiz.topic}.`
    : percentage >= 60
    ? `Solid effort! You have developing understanding of ${quiz.topic}. Focus on the missed concepts.`
    : `Attention recommended: ${quiz.topic} needs revision. We've added a recommended study task to your planner.`;

  const attempt: QuizAttempt = {
    id: `attempt-${Date.now()}`,
    quizId,
    quizTitle: quiz.topic,
    userId,
    score: correctCount,
    totalQuestions,
    percentage,
    timeSpentSeconds,
    completedAt: new Date().toISOString(),
    responses: scoredResponses,
    feedbackNotes
  };

  db.saveQuizAttempt(attempt, masteryUpdates, newTasks);

  res.status(201).json({
    attempt,
    masteryUpdates,
    recommendedTasks: newTasks
  });
});

// Quizzes: History
app.get('/api/quiz/attempts', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const attempts = db.getQuizAttempts(userId);
  res.json({ attempts });
});

// Analytics Overview
app.get('/api/analytics', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const analytics = db.getAnalytics(userId);
  res.json({ analytics });
});

// Study Planner: Tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const tasks = db.getStudyTasks(userId);
  res.json({ tasks });
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { title, topic, dueDate, priority = 'medium', documentId } = req.body;
  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Task title is required' });
    return;
  }
  const task: StudyTask = {
    id: `task-${Date.now()}`,
    userId,
    title: title.trim(),
    topic: topic || 'General Study',
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    completed: false,
    priority,
    documentId,
    isRecommendation: false
  };
  db.addStudyTask(task);
  res.status(201).json({ task });
});

app.patch('/api/tasks/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const updated = db.updateStudyTask(userId, req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task: updated });
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const deleted = db.deleteStudyTask(userId, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ success: true });
});

// Demo: Reset Store
app.post('/api/demo/reset', (_req: Request, res: Response) => {
  db.seedDemoData();
  res.json({ success: true, message: 'Demo data has been reset to pristine initial state.' });
});

// Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LearnMate AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting LearnMate server:', err);
  process.exit(1);
});
