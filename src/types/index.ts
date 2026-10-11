export type ProcessingStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type TutorLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  learningGoal: string;
  targetExamOrCourse?: string;
  avatarUrl?: string;
  createdAt: string;
  isDemoUser?: boolean;
}

export interface DocumentItem {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  chunkCount: number;
  status: ProcessingStatus;
  errorMessage?: string;
  createdAt: string;
  summary?: string;
  topics: string[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  pageNumber: number;
  content: string;
  characterCount: number;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  snippet: string;
  relevanceScore?: number;
}

export interface TutorMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: string;
  suggestedFollowUps?: string[];
  isGeneralKnowledge?: boolean;
}

export interface TutorConversation {
  id: string;
  userId: string;
  title: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
  messagesCount?: number;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  pageNumber?: number;
  topic: string;
  difficulty: QuizDifficulty;
}

export interface Quiz {
  id: string;
  userId: string;
  generationMode?: 'gemini' | 'uploaded-notes' | 'sample-practice';
  documentId?: string;
  documentTitle?: string;
  topic: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  createdAt: string;
  questions: QuizQuestion[];
}

export interface QuizAttemptResponse {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  responses: QuizAttemptResponse[];
  feedbackNotes?: string;
}

export type MasteryLevel = 'needs_attention' | 'developing' | 'proficient';

export interface TopicMastery {
  topic: string;
  score: number; // 0 - 100
  level: MasteryLevel;
  totalAttempts: number;
  correctCount: number;
  lastAssessedAt: string;
  trend: 'improving' | 'stable' | 'declining';
  history: number[]; // recent scores
}

export interface StudyTask {
  id: string;
  userId: string;
  title: string;
  topic: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  documentId?: string;
  isRecommendation?: boolean;
  reason?: string;
}

export interface RecentActivityItem {
  id: string;
  userId?: string;
  type: 'document_uploaded' | 'quiz_completed' | 'topic_practiced' | 'goal_updated' | 'study_task_completed' | 'study_material_completed';
  title: string;
  timestamp: string;
  meta?: Record<string, string | number>;
}

export interface StudyProgress {
  userId: string;
  materialId: string;
  progressPercent: number;
  sectionIndex: number;
  completed: boolean;
  bookmarked: boolean;
  notes: string;
  lastAccessedAt: string;
  updatedAt: string;
}

export interface SavedStudyResource {
  id: string;
  userId: string;
  title: string;
  url: string;
  subject: string;
  topic: string;
  description: string;
  createdAt: string;
}

export interface StudyMaterialContext {
  title: string;
  topic: string;
  documentId?: string;
  content?: string;
}

export interface AnalyticsOverview {
  documentsCount: number;
  studySessionsCount: number;
  averageQuizScore: number;
  topicsMasteredCount: number;
  totalQuestionsAnswered: number;
  weeklyActivity: { date: string; day: string; count: number; minutes: number }[];
  scoreTrend: { attemptDate: string; quizTitle: string; score: number }[];
  masteryDistribution: TopicMastery[];
  recentActivity: RecentActivityItem[];
}
