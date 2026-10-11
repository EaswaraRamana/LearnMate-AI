import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Pencil,
  Play,
  Sparkles,
  Target,
  X
} from 'lucide-react';
import { UserProfile, AnalyticsOverview, DocumentItem, QuizAttempt, StudyProgress } from '../types/index.ts';
import { NavTab } from '../components/Sidebar.tsx';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface OverviewPageProps {
  user: UserProfile | null;
  analytics: AnalyticsOverview | null;
  documents: DocumentItem[];
  recentAttempts: QuizAttempt[];
  studyProgress: StudyProgress[];
  onNavigate: (tab: NavTab, topic?: string, documentId?: string) => void;
  onOpenUpload: () => void;
  onRefreshData: () => void;
}

const subjectAccents = [
  { icon: 'bg-[#EEE9FF] text-[#6D4AFF]', progress: 'bg-[#6D4AFF]' },
  { icon: 'bg-[#DCEBFF] text-[#3973C6]', progress: 'bg-[#6599E8]' },
  { icon: 'bg-[#DDF7E8] text-[#278A5B]', progress: 'bg-[#47B881]' },
  { icon: 'bg-[#FBE4F2] text-[#C34C91]', progress: 'bg-[#D779AD]' },
  { icon: 'bg-[#FFF3C4] text-[#A77916]', progress: 'bg-[#D5A83C]' },
  { icon: 'bg-[#EEE9FF] text-[#9254DE]', progress: 'bg-[#9254DE]' }
];

export function OverviewPage({
  user,
  analytics,
  documents,
  recentAttempts,
  studyProgress,
  onNavigate,
  onOpenUpload,
  onRefreshData
}: OverviewPageProps) {
  const { showToast } = useToast();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalText, setGoalText] = useState(user?.learningGoal || '');

  const handleSaveGoal = async () => {
    try {
      await api.updateProfile({ learningGoal: goalText });
      setIsEditingGoal(false);
      showToast('success', 'Goal Updated', 'Your primary study goal has been updated.');
      onRefreshData();
    } catch {
      showToast('error', 'Error', 'Failed to update study goal');
    }
  };

  const subjects = useMemo(() => {
    const masteryByTopic = new Map(
      (analytics?.masteryDistribution || []).map((item) => [item.topic.toLocaleLowerCase(), item])
    );
    const subjectMap = new Map<string, { name: string; document?: DocumentItem }>();

    documents.filter((document) => document.status === 'ready').forEach((document) => {
      const topics = document.topics?.length ? document.topics : [document.title];
      topics.forEach((topic) => {
        const key = topic.trim().toLocaleLowerCase();
        if (key && !subjectMap.has(key)) {
          subjectMap.set(key, { name: topic.trim(), document });
        }
      });
    });

    (analytics?.masteryDistribution || []).forEach((item) => {
      const key = item.topic.trim().toLocaleLowerCase();
      if (key && !subjectMap.has(key)) subjectMap.set(key, { name: item.topic });
    });

    return Array.from(subjectMap.values()).map((subject) => ({
      ...subject,
      mastery: masteryByTopic.get(subject.name.toLocaleLowerCase())
    }));
  }, [analytics?.masteryDistribution, documents]);

  const trackedMinutes = Math.round(
    recentAttempts.reduce((total, attempt) => total + Math.max(0, attempt.timeSpentSeconds), 0) / 60
  );
  const trackedTime = trackedMinutes >= 60
    ? `${Math.floor(trackedMinutes / 60)}h ${trackedMinutes % 60}m`
    : `${trackedMinutes}m`;
  const completedMaterials = studyProgress.filter((record) => record.completed).length;
  const recentStudyRecords = [...studyProgress]
    .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
    .slice(0, 4);
  const materialTitles: Record<string, string> = {
    'lesson:math-linear-equations': 'Linear Equations and Their Graphs',
    'lesson:physics-newtons-laws': 'Newton’s Laws of Motion',
    'lesson:cs-data-structures': 'Choosing the Right Data Structure',
    'lesson:ai-supervised-learning': 'The Core Idea of Supervised Learning',
    'lesson:data-statistics': 'Reading Distributions and Summary Statistics',
    'lesson:geography-coordinates': 'Latitude, Longitude, and Map Coordinates',
    'lesson:literature-close-reading': 'A Practical Method for Close Reading'
  };

  const features = [
    {
      title: 'AI-Powered Tutoring',
      description: 'Get clear, personalized explanations grounded in your own study materials.',
      icon: Brain,
      colors: 'bg-[#EEE9FF] text-[#6D4AFF]',
      action: () => onNavigate('tutor')
    },
    {
      title: 'Adaptive Quizzes',
      description: 'Practice with questions and difficulty tailored to your learning progress.',
      icon: Target,
      colors: 'bg-[#DCEBFF] text-[#3973C6]',
      action: () => onNavigate('quizzes')
    },
    {
      title: 'Progress Tracking',
      description: 'Review your strengths, topics to revisit, and improvement over time.',
      icon: Award,
      colors: 'bg-[#DDF7E8] text-[#278A5B]',
      action: () => onNavigate('analytics')
    }
  ];

  const stats = [
    {
      label: 'Learning Sessions',
      value: analytics?.studySessionsCount ?? 0,
      detail: 'Tutor chats and completed quizzes',
      icon: BookOpen,
      iconStyle: 'bg-[#EEE9FF] text-[#6D4AFF]'
    },
    {
      label: 'Total Study Time',
      value: trackedTime,
      detail: 'Time tracked in completed quizzes',
      icon: Clock3,
      iconStyle: 'bg-[#DCEBFF] text-[#3973C6]'
    },
    {
      label: 'Average Score',
      value: recentAttempts.length ? `${analytics?.averageQuizScore ?? 0}%` : '0%',
      detail: recentAttempts.length ? `Across ${recentAttempts.length} completed quizzes` : 'Complete a quiz to build your score',
      icon: Target,
      iconStyle: 'bg-[#FBE4F2] text-[#C34C91]'
    },
    {
      label: 'Achievements',
      value: analytics?.topicsMasteredCount ?? 0,
      detail: 'Topics mastered at 80% or higher',
      icon: Award,
      iconStyle: 'bg-[#FFF3C4] text-[#A77916]'
    },
    {
      label: 'Materials Completed',
      value: completedMaterials,
      detail: 'Study lessons and notes marked complete',
      icon: CheckCircle2,
      iconStyle: 'bg-[#DDF7E8] text-[#278A5B]'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="mx-auto max-w-3xl py-3 text-center sm:py-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD4FF] bg-[#EEE9FF] px-3.5 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[#6D4AFF] sm:text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          AI-POWERED PERSONAL LEARNING
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-[#6D4AFF] sm:text-4xl md:text-5xl">
          Your Personal AI Learning Platform
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#77758A] sm:text-base">
          Learn at your own pace with personalized tutoring, interactive quizzes, and intelligent progress tracking.
        </p>
        {user && (user.learningGoal || isEditingGoal) ? (
          <div className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-[#E8E5F0] bg-white px-4 py-2.5 text-left shadow-sm">
            {isEditingGoal ? (
              <>
                <input
                  value={goalText}
                  onChange={(event) => setGoalText(event.target.value)}
                  aria-label="Learning goal"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#242338] outline-none"
                />
                <button onClick={handleSaveGoal} aria-label="Save learning goal" className="text-[#6D4AFF]"><Check className="h-4 w-4" /></button>
                <button onClick={() => { setIsEditingGoal(false); setGoalText(user.learningGoal); }} aria-label="Cancel editing goal" className="text-[#77758A]"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-xs text-[#77758A]"><strong className="text-[#242338]">Your goal:</strong> {user.learningGoal}</span>
                <button onClick={() => { setGoalText(user.learningGoal); setIsEditingGoal(true); }} aria-label="Edit learning goal" className="text-[#77758A] hover:text-[#6D4AFF]"><Pencil className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        ) : user ? (
          <button
            onClick={() => { setGoalText(''); setIsEditingGoal(true); }}
            className="mt-5 rounded-xl border border-[#E8E5F0] bg-white px-4 py-2.5 text-xs font-medium text-[#77758A] shadow-sm transition-colors hover:border-[#C9BCFF] hover:text-[#6745EA]"
          >
            Set your learning goal
          </button>
        ) : null}
      </section>

      <section aria-label="Learning statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-2xl border border-[#E8E5F0] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#77758A] sm:text-sm">{stat.label}</p>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconStyle}`}><Icon className="h-4.5 w-4.5" /></span>
              </div>
              <p className="mt-3 font-serif text-2xl font-bold text-[#242338] sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-[10px] leading-4 text-[#77758A] sm:text-xs">{stat.detail}</p>
            </article>
          );
        })}
      </section>

      <section aria-label="Study materials progress" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-[#E8E5F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#242338]">Continue learning</h2>
              <p className="mt-1 text-xs text-[#77758A]">Pick up where you last left off.</p>
            </div>
            <button onClick={() => onNavigate('materials')} className="text-xs font-semibold text-[#6D4AFF] hover:underline">All materials</button>
          </div>
          {recentStudyRecords.filter((record) => !record.completed).length ? (
            <ul className="mt-4 space-y-2">
              {recentStudyRecords.filter((record) => !record.completed).slice(0, 3).map((record) => {
                const docId = record.materialId.startsWith('document:') ? record.materialId.slice('document:'.length) : '';
                const docTitle = documents.find((document) => document.id === docId)?.title;
                const title = materialTitles[record.materialId] || docTitle || 'Study material';
                return (
                  <li key={record.materialId}>
                    <button onClick={() => onNavigate('materials', undefined, record.materialId)} className="w-full rounded-xl border border-[#F0EEF5] p-3 text-left transition-colors hover:bg-[#F7F5FF]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-semibold text-[#4C4A5D]">{title}</span>
                        <span className="shrink-0 text-[10px] font-bold text-[#6D4AFF]">{record.progressPercent}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0EEF5]">
                        <div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${Math.min(100, record.progressPercent)}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <button onClick={() => onNavigate('materials')} className="mt-4 w-full rounded-xl border border-dashed border-[#DCD4FF] px-4 py-6 text-center text-xs text-[#77758A] hover:bg-[#F7F5FF]">
              No reading in progress yet. Browse Study Materials to get started.
            </button>
          )}
        </article>
        <article className="min-w-0 rounded-2xl border border-[#E8E5F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#242338]">Recently studied</h2>
              <p className="mt-1 text-xs text-[#77758A]">Your most recently opened material.</p>
            </div>
            <button onClick={() => onNavigate('materials')} className="text-xs font-semibold text-[#6D4AFF] hover:underline">Study Materials</button>
          </div>
          {recentStudyRecords.length ? (
            <ul className="mt-4 space-y-2">
              {recentStudyRecords.slice(0, 3).map((record) => {
                const docId = record.materialId.startsWith('document:') ? record.materialId.slice('document:'.length) : '';
                const docTitle = documents.find((document) => document.id === docId)?.title;
                return (
                  <li key={record.materialId} className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF9FC] px-3 py-2.5">
                    <span className="truncate text-xs font-medium text-[#4C4A5D]">{materialTitles[record.materialId] || docTitle || 'Study material'}</span>
                    <span className="shrink-0 text-[10px] text-[#77758A]">{record.completed ? 'Completed' : `${record.progressPercent}%`}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-[#FAF9FC] px-4 py-6 text-center text-xs text-[#77758A]">Your reading activity will appear here.</p>
          )}
          {documents.length > 0 && <p className="mt-3 text-[10px] text-[#77758A]">{documents.filter((document) => document.status === 'ready').length} uploaded study document(s) ready to read.</p>}
          {documents.length > 0 && <ul className="mt-3 space-y-1.5">
            {documents.slice(0, 2).map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-2 text-[10px] text-[#77758A]">
                <span className="truncate">{document.title}</span>
                <span className="shrink-0">{document.status === 'ready' ? 'Ready to study' : document.status}</span>
              </li>
            ))}
          </ul>}
        </article>
      </section>

      <section aria-labelledby="subjects-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="subjects-title" className="font-serif text-2xl font-bold text-[#242338]">Choose Your Subject</h2>
            <p className="mt-1 text-sm text-[#77758A]">Explore topics from your learning materials and assessments.</p>
          </div>
          <button onClick={() => onNavigate('library')} className="hidden items-center gap-1 text-xs font-semibold text-[#6D4AFF] hover:text-[#5638D5] sm:flex">
            My library <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DCD4FF] bg-white px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEE9FF] text-[#6D4AFF]"><FileText className="h-6 w-6" /></span>
            <h3 className="mt-3 font-semibold text-[#242338]">Your subjects will appear here</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#77758A]">Upload study material or complete a quiz to see your saved subjects and topic mastery.</p>
            <button onClick={onOpenUpload} className="mt-4 rounded-xl bg-[#6D4AFF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5638D5] focus:outline-none focus:ring-2 focus:ring-[#9254DE] focus:ring-offset-2">Upload study material</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject, index) => {
              const accent = subjectAccents[index % subjectAccents.length];
              const Icon = index % 3 === 0 ? BookOpen : index % 3 === 1 ? GraduationCap : Sparkles;
              const score = subject.mastery?.score;
              return (
                <button
                  key={subject.name}
                  onClick={() => onNavigate('quizzes', subject.name, subject.document?.id)}
                  className="group rounded-2xl border border-[#E8E5F0] bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9BCFF] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#9254DE] focus:ring-offset-2"
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.icon}`}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-[#242338] group-hover:text-[#6D4AFF]">{subject.name}</h3>
                      <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-[#77758A]">
                        {subject.mastery
                          ? `${subject.mastery.totalAttempts} completed assessment${subject.mastery.totalAttempts === 1 ? '' : 's'} recorded`
                          : subject.document
                          ? `Study topic from ${subject.document.title}`
                          : 'Saved learning topic'}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#A7A4B5] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6D4AFF]" />
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#77758A]">Progress</span>
                    <span className={`font-semibold ${score === undefined ? 'text-[#77758A]' : 'text-[#242338]'}`}>
                      {score === undefined ? 'Not started' : `${score}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0EEF5]">
                    <div className={`h-full rounded-full transition-all ${accent.progress}`} style={{ width: `${Math.min(100, Math.max(0, score ?? 0))}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="features-title" className="pb-3">
        <div className="mb-4">
          <h2 id="features-title" className="font-serif text-2xl font-bold text-[#242338]">Your Learning Toolkit</h2>
          <p className="mt-1 text-sm text-[#77758A]">Everything you need to make steady progress.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button key={feature.title} onClick={feature.action} className="group flex items-start gap-4 rounded-2xl border border-[#E8E5F0] bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9BCFF] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#9254DE] focus:ring-offset-2">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${feature.colors}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold text-[#242338] group-hover:text-[#6D4AFF]">{feature.title}<ArrowRight className="h-3.5 w-3.5" /></span>
                  <span className="mt-1 block text-xs leading-5 text-[#77758A]">{feature.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#E8E5F0] pt-5 text-xs text-[#77758A]">
        <button onClick={() => onNavigate('planner')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-[#EEE9FF] hover:text-[#6D4AFF]"><Play className="h-3.5 w-3.5" /> Open study planner</button>
        <span aria-hidden="true">·</span>
        <button onClick={() => onNavigate('analytics')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-[#EEE9FF] hover:text-[#6D4AFF]"><Award className="h-3.5 w-3.5" /> View learning analytics</button>
      </div>
    </div>
  );
}
