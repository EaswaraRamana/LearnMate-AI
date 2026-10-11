import { AnalyticsOverview } from '../types/index.ts';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface AnalyticsPageProps {
  analytics: AnalyticsOverview | null;
  onRefresh: () => void;
}

export function AnalyticsPage({ analytics }: AnalyticsPageProps) {
  if (!analytics) {
    return (
      <div className="py-20 text-center text-stone-400">
        <p className="text-sm">Loading learning analytics records...</p>
      </div>
    );
  }

  const {
    averageQuizScore,
    totalQuestionsAnswered,
    weeklyActivity,
    scoreTrend,
    masteryDistribution
  } = analytics;

  const needsAttentionList = masteryDistribution.filter((m) => m.level === 'needs_attention');
  const proficientList = masteryDistribution.filter((m) => m.level === 'proficient');

  // Max score for SVG scale
  const maxWeeklyMinutes = Math.max(...weeklyActivity.map((w) => w.minutes), 20);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#6D4AFF]">Learning Analytics</h2>
        <p className="text-xs text-stone-500">
          Continuous performance tracking and Bayesian rule-based mastery progression
        </p>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Accuracy</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-serif text-3xl font-bold text-[#6D4AFF]">
            {averageQuizScore ? `${averageQuizScore}%` : '—'}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            {totalQuestionsAnswered} total questions answered
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Proficient</span>
            <Award className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-serif text-3xl font-bold text-emerald-800">
            {proficientList.length}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Mastery &ge; 80%</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Needs Attention</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <p className="font-serif text-3xl font-bold text-rose-700">
            {needsAttentionList.length}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Mastery &lt; 60%</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Study Sessions</span>
            <Clock className="w-4 h-4 text-[#6D4AFF]" />
          </div>
          <p className="font-serif text-3xl font-bold text-[#6D4AFF]">
            {analytics.studySessionsCount}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Completed across library</p>
        </div>
      </div>

      {/* Charts Section: Weekly Activity & Score Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-bold text-[#6D4AFF]">
                Weekly Study Activity
              </h3>
              <p className="text-xs text-stone-500">Minutes spent on quizzes and tutoring</p>
            </div>
            <Calendar className="w-4 h-4 text-stone-400" />
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-stone-100">
            {weeklyActivity.map((w, idx) => {
              const heightPercent = Math.min(100, Math.max(12, (w.minutes / maxWeeklyMinutes) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="relative w-full flex justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-bold bg-[#6D4AFF] text-white px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                      {w.minutes}m ({w.count} acts)
                    </span>
                  </div>
                  <div
                    className="w-full max-w-[36px] rounded-t-lg bg-emerald-800/80 group-hover:bg-[#6D4AFF] transition-all"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[11px] font-bold text-stone-500">{w.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score Progression Trend */}
        <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-bold text-[#6D4AFF]">
                Recent Quiz Accuracy Trend
              </h3>
              <p className="text-xs text-stone-500">Chronological score trajectory across assessments</p>
            </div>
            <TrendingUp className="w-4 h-4 text-stone-400" />
          </div>

          {scoreTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-stone-400">
              Complete your first quiz to observe score progression.
            </div>
          ) : (
            <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-stone-100">
              {scoreTrend.map((st, idx) => {
                const heightPercent = Math.min(100, Math.max(10, st.score));
                const isHigh = st.score >= 80;
                const isLow = st.score < 60;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="relative w-full flex justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-bold bg-[#6D4AFF] text-white px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                        {st.score}% • {st.quizTitle}
                      </span>
                    </div>
                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                        isHigh ? 'bg-emerald-600' : isLow ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] font-mono text-stone-400 truncate max-w-[40px]">
                      {st.attemptDate}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Topic Mastery Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#6D4AFF]">
              Topic-Level Mastery Details
            </h3>
            <p className="text-xs text-stone-500">
              Calculated using weighted combination of recent quiz performance and historical trends
            </p>
          </div>
        </div>

        {masteryDistribution.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">
            No topic performance logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-3">Subject / Topic</th>
                  <th className="py-3 px-3">Mastery Rating</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Attempts</th>
                  <th className="py-3 px-3">Recent Trend</th>
                  <th className="py-3 px-3">Adaptive Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {masteryDistribution.map((m) => {
                  const isProficient = m.level === 'proficient';
                  const isNeedsAttention = m.level === 'needs_attention';

                  return (
                    <tr key={m.topic} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-stone-800">
                        {m.topic}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">
                        {m.score}%
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isProficient
                              ? 'bg-emerald-100 text-emerald-900'
                              : isNeedsAttention
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isProficient && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                          {isNeedsAttention && <AlertTriangle className="w-3 h-3 text-rose-700" />}
                          {m.level.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {m.totalAttempts} ({m.correctCount} correct)
                      </td>
                      <td className="py-3 px-3 font-medium capitalize text-stone-700">
                        {m.trend === 'improving' ? '📈 Improving' : m.trend === 'declining' ? '📉 Declining' : '➡️ Stable'}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-stone-500">
                        {isNeedsAttention
                          ? 'Review foundational concepts & simple practice'
                          : isProficient
                          ? 'Synthesis questions & hard assessments'
                          : 'Application questions to reach proficiency'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
