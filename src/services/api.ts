import {
  UserProfile,
  DocumentItem,
  DocumentChunk,
  TutorConversation,
  TutorMessage,
  Quiz,
  QuizAttempt,
  QuizDifficulty,
  TopicMastery,
  StudyTask,
  AnalyticsOverview,
  StudyProgress,
  SavedStudyResource
} from '../types/index.ts';

const API_BASE = '/api';

async function tutorApiError(response: Response, fallback: string): Promise<Error> {
  let data: { error?: string | { message?: string } } | undefined;
  try {
    data = await response.json();
  } catch {
    // The status-based message below also covers non-JSON server/proxy failures.
  }
  const message = typeof data?.error === 'string'
    ? data.error
    : data?.error && typeof data.error.message === 'string'
      ? data.error.message
      : response.status === 401 || response.status === 403
        ? 'The request was not authorized. Please sign in again.'
        : response.status === 404
          ? 'The requested tutor service was not found. Check the server configuration.'
          : response.status === 429
            ? 'The AI service is busy or its quota is temporarily unavailable. Wait and try again.'
            : response.status === 504
              ? 'The request took too long. Please try again.'
              : response.status >= 500
                ? 'The tutor service is temporarily unavailable. Please try again.'
                : fallback;
  return new Error(message);
}

function tutorNetworkError(error: unknown, operation: string): Error {
  if (error instanceof TypeError) {
    return new Error(`Could not reach the server to ${operation}. Check that LearnMate AI is running and your connection is available.`);
  }
  return error instanceof Error ? error : new Error(`${operation} failed. Please try again.`);
}

export const api = {
  // Authentication
  register: async (data: { name: string; email: string; password: string }): Promise<{
    user: UserProfile;
    requiresEmailVerification: boolean;
  }> => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create your account');
    return result;
  },

  login: async (data: { email: string; password: string }): Promise<{
    user: UserProfile;
    requiresEmailVerification: boolean;
  }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to sign in');
    return result;
  },

  logout: async (): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to sign out');
    return result;
  },

  // Profile
  getProfile: async (): Promise<{ user: UserProfile; hasGeminiKey: boolean }> => {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Failed to load user profile');
    return res.json();
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<{ user: UserProfile }> => {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Documents
  getDocuments: async (): Promise<{ documents: DocumentItem[] }> => {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  getDocument: async (id: string): Promise<{ document: DocumentItem; chunks: DocumentChunk[] }> => {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to load document');
    return res.json();
  },

  uploadDocument: async (file: File, existingDocId?: string): Promise<{ success: boolean; document: DocumentItem; message?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (existingDocId) {
      formData.append('existingDocId', existingDocId);
    }
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server response error (${res.status}). Please try again.`);
    }
    if (!res.ok) throw new Error(data.error || 'Failed to upload document');
    return data;
  },

  reprocessDocument: async (docId: string, file: File): Promise<{ success: boolean; document: DocumentItem; message?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/${docId}/reprocess`, {
      method: 'POST',
      body: formData
    });
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server response error (${res.status}). Please try again.`);
    }
    if (!res.ok) throw new Error(data.error || 'Failed to reprocess document');
    return data;
  },

  deleteDocument: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  searchDocuments: async (query: string): Promise<{ results: { chunk: DocumentChunk; score: number }[]; citations: any[] }> => {
    const res = await fetch(`${API_BASE}/documents/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search documents');
    return res.json();
  },

  // Tutor
  getConversations: async (): Promise<{ conversations: TutorConversation[] }> => {
    const res = await fetch(`${API_BASE}/tutor/conversations`);
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  getConversation: async (id: string): Promise<{ conversation: TutorConversation; messages: TutorMessage[] }> => {
    const res = await fetch(`${API_BASE}/tutor/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  },

  createConversation: async (title: string, documentIds: string[] = []): Promise<{ conversation: TutorConversation }> => {
    const res = await fetch(`${API_BASE}/tutor/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, documentIds })
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  deleteConversation: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/tutor/conversations/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  askTutor: async (
    question: string,
    conversationId?: string,
    documentIds: string[] = [],
    level: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
    actionType?: string,
    studyMaterial?: { title: string; content: string }
  ): Promise<{ conversationId: string; message: TutorMessage }> => {
    try {
      const res = await fetch(`${API_BASE}/tutor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversationId, documentIds, level, actionType, studyMaterial })
      });
      if (!res.ok) throw await tutorApiError(res, 'Failed to get tutor response');
      return await res.json();
    } catch (error) {
      throw tutorNetworkError(error, 'send your question');
    }
  },

  transcribeTutorAudio: async (audio: Blob): Promise<{ transcript: string }> => {
    const formData = new FormData();
    formData.append('audio', audio, 'voice-question');
    try {
      const res = await fetch(`${API_BASE}/tutor/transcribe`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw await tutorApiError(res, 'Voice transcription failed');
      return await res.json();
    } catch (error) {
      throw tutorNetworkError(error, 'transcribe your recording');
    }
  },

  // Quizzes
  generateQuiz: async (params: {
    topic: string;
    difficulty: QuizDifficulty;
    questionCount: number;
    documentId?: string;
    studyMaterial?: { title: string; content: string };
  }): Promise<{ quiz: Quiz; notice?: string }> => {
    const res = await fetch(`${API_BASE}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw await tutorApiError(res, 'Failed to generate quiz');
    return res.json();
  },

  submitQuiz: async (
    quizId: string,
    responses: { questionId: string; selectedOptionIndex: number }[],
    timeSpentSeconds: number
  ): Promise<{
    attempt: QuizAttempt;
    masteryUpdates: Record<string, TopicMastery>;
    recommendedTasks: StudyTask[];
  }> => {
    const res = await fetch(`${API_BASE}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, responses, timeSpentSeconds })
    });
    if (!res.ok) throw await tutorApiError(res, 'Failed to submit quiz');
    return res.json();
  },

  getQuizAttempts: async (): Promise<{ attempts: QuizAttempt[] }> => {
    const res = await fetch(`${API_BASE}/quiz/attempts`);
    if (!res.ok) throw new Error('Failed to load quiz history');
    return res.json();
  },

  // Analytics
  getAnalytics: async (): Promise<{ analytics: AnalyticsOverview }> => {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  // Study materials and per-user reading state
  getStudyData: async (): Promise<{ progress: StudyProgress[]; resources: SavedStudyResource[] }> => {
    const res = await fetch(`${API_BASE}/study/progress`);
    if (!res.ok) throw new Error('Failed to load study progress');
    return res.json();
  },

  updateStudyProgress: async (
    materialId: string,
    updates: Partial<Pick<StudyProgress, 'progressPercent' | 'sectionIndex' | 'completed' | 'bookmarked' | 'notes'>> & { accessed?: boolean }
  ): Promise<{ progress: StudyProgress }> => {
    const res = await fetch(`${API_BASE}/study/progress/${encodeURIComponent(materialId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save reading progress');
    return data;
  },

  addStudyResource: async (resource: Pick<SavedStudyResource, 'title' | 'url' | 'subject' | 'topic' | 'description'>): Promise<{ resource: SavedStudyResource }> => {
    const res = await fetch(`${API_BASE}/study/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save learning resource');
    return data;
  },

  // Study Planner
  getTasks: async (): Promise<{ tasks: StudyTask[] }> => {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('Failed to load tasks');
    return res.json();
  },

  createTask: async (task: Partial<StudyTask>): Promise<{ task: StudyTask }> => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create task');
    return data;
  },

  updateTask: async (id: string, updates: Partial<StudyTask>): Promise<{ task: StudyTask }> => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  deleteTask: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  // Demo Reset
  resetDemoData: async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  }
};
