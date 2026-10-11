import { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronRight,
  Loader2,
  History,
  Target
} from 'lucide-react';
import { DocumentItem, Quiz, QuizAttempt, QuizDifficulty } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface QuizPageProps {
  documents: DocumentItem[];
  onQuizCompleted: () => void;
  preselectedTopic?: string;
  preselectedDocId?: string;
  preselectedStudyMaterial?: { title: string; content: string };
}

export function QuizPage({
  documents,
  onQuizCompleted,
  preselectedTopic = '',
  preselectedDocId = '',
  preselectedStudyMaterial
}: QuizPageProps) {
  const { showToast } = useToast();

  // Mode: 'configure' | 'taking' | 'results' | 'history'
  const [mode, setMode] = useState<'configure' | 'taking' | 'results' | 'history'>('configure');

  // Generator Configuration State
  const [selectedTopic, setSelectedTopic] = useState(preselectedTopic);
  const [selectedDocId, setSelectedDocId] = useState<string>(preselectedDocId);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed Attempt Results State
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load past attempts on mount
  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    setSelectedTopic(preselectedTopic);
    setSelectedDocId(preselectedDocId);
  }, [preselectedTopic, preselectedDocId, preselectedStudyMaterial]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.getQuizAttempts();
      setPastAttempts(res.attempts);
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Timer while taking quiz
  useEffect(() => {
    let interval: any = null;
    if (mode === 'taking') {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode]);

  const handleStartGeneration = async () => {
    const topicToUse = selectedTopic.trim() || (selectedDocId ? documents.find(d => d.id === selectedDocId)?.title || '' : '');

    if (!topicToUse) {
      showToast('error', 'Topic Required', 'Please enter a topic or select a document to test.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.generateQuiz({
        topic: topicToUse,
        difficulty,
        questionCount,
        documentId: selectedDocId || undefined,
        studyMaterial: selectedDocId ? undefined : preselectedStudyMaterial
      });

      setActiveQuiz(res.quiz);
      setCurrentQuestionIdx(0);
      setUserAnswers({});
      setTimerSeconds(0);
      setMode('taking');
      if (res.quiz.generationMode === 'uploaded-notes') {
        showToast('info', 'Practice Mode', res.notice || 'AI-generated quizzes are temporarily unavailable. Questions are based on exact excerpts from your uploaded notes.');
      } else if (res.quiz.generationMode === 'sample-practice') {
        showToast('info', 'Sample Practice Mode', res.notice || 'AI-generated quizzes are temporarily unavailable. Verified local sample questions are being used and may not match your selected topic exactly.');
      } else {
        showToast('success', 'Quiz Generated', `Ready with ${res.quiz.questions.length} ${difficulty} questions.`);
      }
    } catch (err: any) {
      showToast('error', 'Generation Error', err.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    // Check if any unanswered
    const unansweredCount = activeQuiz.questions.filter((q) => userAnswers[q.id] === undefined).length;
    if (unansweredCount > 0) {
      const proceed = confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`);
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const formattedResponses = activeQuiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionIndex: userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1
      }));

      const res = await api.submitQuiz(activeQuiz.id, formattedResponses, timerSeconds);
      setLatestAttempt(res.attempt);
      setMode('results');
      showToast('success', 'Assessment Scored', `Scored ${res.attempt.score}/${res.attempt.totalQuestions} (${res.attempt.percentage}%)`);
      onQuizCompleted();
      loadHistory();
    } catch (err: any) {
      showToast('error', 'Submission Error', err.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preset topic pills from documents
  const allSuggestedTopics = Array.from(
    new Set(documents.flatMap((d) => d.topics || []))
  ).slice(0, 8);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation Mode Toggle */}
      <div className="flex items-center justify-between border-b border-[#E8E5F0] pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#6D4AFF]">Practice & Quizzes</h2>
          <p className="text-xs text-stone-500">
            Source-grounded adaptive assessments with server-verified scoring & topic mastery updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('configure')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              mode === 'configure' || mode === 'taking'
                ? 'bg-[#6D4AFF] text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            Create Quiz
          </button>
          <button
            onClick={() => {
              setMode('history');
              loadHistory();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              mode === 'history'
                ? 'bg-[#6D4AFF] text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Attempt History ({pastAttempts.length})</span>
          </button>
        </div>
      </div>

      {/* ---------------- MODE: CONFIGURE & GENERATE ---------------- */}
      {mode === 'configure' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#6D4AFF] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900">
                  Configure Adaptive Assessment
                </h3>
                <p className="text-xs text-stone-500">
                  Questions are generated directly from your uploaded materials and evaluated on the server.
                </p>
              </div>
            </div>

            {/* Document Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">
                1. Select Document (Optional)
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  const doc = documents.find((d) => d.id === e.target.value);
                  if (doc && doc.topics.length > 0) {
                    setSelectedTopic(doc.topics[0]);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
              >
                <option value="">All Documents in Library</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.pageCount} pgs)
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Specification */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700">
                2. Specify Topic or Concept
              </label>
              <input
                type="text"
                placeholder="e.g. Consensus (Raft/Paxos), Linearizability, B+ Trees..."
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
              />

              {allSuggestedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-400 self-center">From your notes:</span>
                  {allSuggestedTopics.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedTopic(t)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        selectedTopic === t
                          ? 'bg-[#6D4AFF] text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">
                3. Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                      difficulty === d
                        ? 'border-[#6D4AFF] bg-emerald-50 text-[#6D4AFF]'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">
                4. Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      questionCount === count
                        ? 'border-[#6D4AFF] bg-emerald-50 text-[#6D4AFF]'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Action */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleStartGeneration}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6D4AFF] hover:bg-[#0E2C22] text-white text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Extracting context & generating questions...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-300" />
                    <span>Generate & Begin Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODE: TAKING QUIZ ---------------- */}
      {mode === 'taking' && activeQuiz && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Quiz Status Header */}
          <div className="p-4 rounded-xl bg-white border border-[#E8E5F0] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#6D4AFF] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {activeQuiz.topic}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {activeQuiz.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500 font-mono">
              <span>Time: {formatTime(timerSeconds)}</span>
              <span>•</span>
              <span className="font-semibold text-stone-800">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </span>
            </div>
          </div>
          {activeQuiz.generationMode === 'uploaded-notes' && (
            <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
              AI-generated quizzes are temporarily unavailable. Practice mode is using exact excerpts from your uploaded study notes.
            </div>
          )}
          {activeQuiz.generationMode === 'sample-practice' && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              AI-generated quizzes are temporarily unavailable. This is a local sample practice quiz with verified answers and may not match your selected topic exactly.
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-[#6D4AFF] transition-all duration-300"
              style={{
                width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`
              }}
            />
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = activeQuiz.questions[currentQuestionIdx];
            const selectedOpt = userAnswers[currentQ.id];

            return (
              <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-sm space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Question #{currentQuestionIdx + 1}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 mt-1 leading-snug">
                    {currentQ.question}
                  </h3>
                  {currentQ.pageNumber && (
                    <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      <span>Topic referenced in study material (Page {currentQ.pageNumber})</span>
                    </p>
                  )}
                </div>

                {/* 4 Options */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(currentQ.id, optIdx)}
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-[#6D4AFF] bg-emerald-50/70 text-[#6D4AFF] shadow-2xs'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/70 text-stone-800'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#6D4AFF] text-white'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="mt-0.5 leading-relaxed">{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Nav buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    Previous
                  </button>

                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#0E2C22] text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitQuiz}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-2xs"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Scoring on Server...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit & Score Assessment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ---------------- MODE: RESULTS REVIEW ---------------- */}
      {mode === 'results' && latestAttempt && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Score Summary Banner */}
          <div
            className={`p-6 sm:p-8 rounded-2xl border text-center space-y-3 ${
              latestAttempt.percentage >= 80
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : latestAttempt.percentage >= 60
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-white/80 shadow-2xs">
              <Award className="w-6 h-6 text-[#6D4AFF]" />
            </div>
            <div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                Final Score: {latestAttempt.score} / {latestAttempt.totalQuestions} ({latestAttempt.percentage}%)
              </h3>
              <p className="text-xs sm:text-sm mt-1 max-w-lg mx-auto opacity-90 leading-relaxed">
                {latestAttempt.feedbackNotes}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs pt-2">
              <span className="font-mono">Time: {formatTime(latestAttempt.timeSpentSeconds)}</span>
              <span>•</span>
              <span className="font-semibold">Topic: {latestAttempt.quizTitle}</span>
              <span>•</span>
              <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70">
                Server Verified
              </span>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setMode('configure')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#0E2C22] text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
                <span>Practice Another Topic</span>
              </button>
            </div>
          </div>

          {activeQuiz?.generationMode === 'uploaded-notes' && (
            <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
              AI-generated quizzes were temporarily unavailable. This assessment used exact excerpts from your uploaded study notes.
            </div>
          )}
          {activeQuiz?.generationMode === 'sample-practice' && (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              AI-generated quizzes were temporarily unavailable. This was a local sample practice quiz with verified answers and may not match your selected topic exactly.
            </div>
          )}

          {/* Question-by-Question Review with Explanations */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-bold text-stone-900">
              Detailed Question Analysis & Explanations
            </h4>

            {activeQuiz?.questions.map((q, qIdx) => {
              const resp = latestAttempt.responses.find((r) => r.questionId === q.id);
              const isCorrect = resp?.isCorrect ?? false;
              const selectedIdx = resp?.selectedOptionIndex ?? -1;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl bg-white border transition-all ${
                    isCorrect ? 'border-emerald-200' : 'border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-stone-400">
                      Question #{qIdx + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <XCircle className="w-3 h-3 text-rose-700" />}
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <p className="font-serif text-base font-bold text-stone-900 mb-3">
                    {q.question}
                  </p>

                  {/* Options with markers */}
                  <div className="space-y-1.5 mb-3">
                    {q.options.map((opt, oIdx) => {
                      const isUserSelected = selectedIdx === oIdx;
                      const isActualCorrect = q.correctOptionIndex === oIdx;

                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                            isActualCorrect
                              ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-medium'
                              : isUserSelected
                              ? 'bg-rose-100/70 border border-rose-300 text-rose-950 font-medium'
                              : 'bg-stone-50 border border-stone-200 text-stone-600 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-white/80 font-bold flex items-center justify-center text-[10px]">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isActualCorrect && (
                            <span className="text-[10px] font-bold uppercase text-emerald-800">
                              Correct Answer
                            </span>
                          )}
                          {!isActualCorrect && isUserSelected && (
                            <span className="text-[10px] font-bold uppercase text-rose-800">
                              Your Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
                    <p className="font-bold text-stone-800 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                      <span>Pedagogical Explanation</span>
                    </p>
                    <p className="leading-relaxed">{q.explanation}</p>
                    {q.pageNumber && (
                      <p className="text-[10px] text-stone-400 mt-1 font-mono">
                        Referenced from Page {q.pageNumber} in study notes.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- MODE: HISTORY LIST ---------------- */}
      {mode === 'history' && (
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            Recorded Assessment History
          </h3>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#6D4AFF]" />
            </div>
          ) : pastAttempts.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white border border-[#E8E5F0] p-6">
              <Target className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">No attempts logged yet</p>
              <button
                onClick={() => setMode('configure')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#6D4AFF] text-white text-xs font-semibold cursor-pointer"
              >
                Generate First Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pastAttempts.map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-xl bg-white border border-[#E8E5F0] flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-stone-800">{att.quizTitle}</span>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      {new Date(att.completedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-serif font-bold ${
                        att.percentage >= 80
                          ? 'text-emerald-700'
                          : att.percentage >= 60
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {att.score}/{att.totalQuestions} ({att.percentage}%)
                    </span>
                    <p className="text-[10px] text-stone-400 font-mono">
                      {Math.round(att.timeSpentSeconds)}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
