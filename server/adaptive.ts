import { TopicMastery, MasteryLevel, QuizDifficulty, StudyTask } from '../src/types/index.ts';

export interface MasteryUpdateResult {
  topic: string;
  previousScore: number;
  newScore: number;
  level: MasteryLevel;
  trend: 'improving' | 'stable' | 'declining';
  recommendedDifficulty: QuizDifficulty;
  recommendationReason: string;
  recommendedStudyTask?: Omit<StudyTask, 'id' | 'userId'>;
}

/**
 * Mastery Calculation Rules:
 * - Score range: 0 to 100
 * - Thresholds:
 *     Proficient: >= 80%
 *     Developing: 60% to 79.9%
 *     Needs Attention: < 60%
 *
 * Weighting:
 * - Current quiz score: 55%
 * - Historical average: 35%
 * - Consecutive success / error momentum: +/- 10%
 */
export function calculateTopicMastery(
  topic: string,
  quizAccuracyPercentage: number,
  existingMastery?: TopicMastery
): MasteryUpdateResult {
  const currentAttemptScore = Math.max(0, Math.min(100, quizAccuracyPercentage));
  const history = existingMastery ? [...existingMastery.history] : [];
  history.push(currentAttemptScore);
  // keep last 10 scores
  if (history.length > 10) history.shift();

  let newScore = currentAttemptScore;
  let previousScore = existingMastery ? existingMastery.score : 50;

  if (existingMastery && existingMastery.totalAttempts > 0) {
    const historicalAvg = existingMastery.history.reduce((a, b) => a + b, 0) / existingMastery.history.length;
    
    // Momentum calculation: compare recent attempt with previous
    const diff = currentAttemptScore - existingMastery.score;
    const momentum = diff > 15 ? 5 : diff < -15 ? -5 : 0;

    newScore = Math.round((currentAttemptScore * 0.55) + (historicalAvg * 0.35) + momentum + (existingMastery.score * 0.1));
    newScore = Math.max(10, Math.min(100, newScore));
  } else {
    // First assessment
    newScore = Math.round(currentAttemptScore);
  }

  // Determine Level
  let level: MasteryLevel = 'developing';
  if (newScore >= 80) {
    level = 'proficient';
  } else if (newScore < 60) {
    level = 'needs_attention';
  }

  // Determine Trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (newScore > previousScore + 4) {
    trend = 'improving';
  } else if (newScore < previousScore - 4) {
    trend = 'declining';
  }

  // Adaptive recommendation
  let recommendedDifficulty: QuizDifficulty = 'medium';
  let recommendationReason = '';
  let recommendedStudyTask: Omit<StudyTask, 'id' | 'userId'> | undefined;

  if (level === 'needs_attention') {
    recommendedDifficulty = 'easy';
    recommendationReason = `Mastery in "${topic}" is at ${newScore}% (${trend === 'declining' ? 'declining' : 'needs focus'}). We recommend reviewing core lecture notes and attempting foundation practice.`;
    recommendedStudyTask = {
      title: `Revise fundamental concepts in ${topic}`,
      topic,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      completed: false,
      priority: 'high',
      isRecommendation: true,
      reason: `Accuracy on recent quiz was ${currentAttemptScore}%. Reinforce definitions and examples before retrying.`
    };
  } else if (level === 'developing') {
    recommendedDifficulty = 'medium';
    recommendationReason = `Mastery in "${topic}" is at ${newScore}% (developing). Keep practicing medium-difficulty application questions to reach proficiency.`;
    recommendedStudyTask = {
      title: `Targeted practice for ${topic}`,
      topic,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      completed: false,
      priority: 'medium',
      isRecommendation: true,
      reason: `Good progress! Practice 5 more application scenarios to reach 80%+ mastery.`
    };
  } else {
    recommendedDifficulty = 'hard';
    recommendationReason = `Excellent work! Mastery in "${topic}" is at ${newScore}% (proficient). Challenge yourself with synthesis and hard-level exam questions.`;
  }

  return {
    topic,
    previousScore,
    newScore,
    level,
    trend,
    recommendedDifficulty,
    recommendationReason,
    recommendedStudyTask
  };
}
