import { QuizDifficulty, QuizQuestion } from '../src/types/index.ts';
import { ScoredChunk } from './rag.ts';

interface SampleQuestion {
  categories: string[];
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

const VERIFIED_SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    categories: ['physics', 'gravity', 'force'],
    question: 'What does gravity do to objects with mass?',
    options: ['It attracts them toward one another.', 'It changes their chemical elements.', 'It removes their inertia.', 'It prevents them from moving.'],
    correctOptionIndex: 0,
    explanation: 'Gravity is the attractive interaction between objects that have mass.'
  },
  {
    categories: ['physics', 'gravity', 'earth'],
    question: 'Near Earth’s surface, what is the approximate acceleration due to gravity?',
    options: ['9.8 m/s² downward', '9.8 km/s upward', '1 m/s² sideways', '0 m/s² everywhere'],
    correctOptionIndex: 0,
    explanation: 'Near Earth’s surface, gravitational acceleration is approximately 9.8 m/s² downward, with small local variations.'
  },
  {
    categories: ['physics', 'gravity', 'force'],
    question: 'In Newton’s law of universal gravitation, what happens to gravitational force if the distance between two masses doubles?',
    options: ['It becomes one quarter as large.', 'It doubles.', 'It becomes four times as large.', 'It stays exactly the same.'],
    correctOptionIndex: 0,
    explanation: 'The force follows an inverse-square relationship with distance, so doubling distance divides the force by four.'
  },
  {
    categories: ['quantum', 'physics'],
    question: 'For a photon, how is energy related to frequency?',
    options: ['Higher frequency means higher energy.', 'Higher frequency means lower energy.', 'Frequency has no relationship to energy.', 'Every frequency has zero energy.'],
    correctOptionIndex: 0,
    explanation: 'Photon energy is proportional to frequency: E = hf, where h is Planck’s constant.'
  },
  {
    categories: ['quantum', 'physics'],
    question: 'What does the uncertainty principle limit for a quantum particle?',
    options: ['How precisely position and momentum can both be known at once.', 'Whether energy can exist.', 'The speed of light in a vacuum.', 'The number of dimensions in space.'],
    correctOptionIndex: 0,
    explanation: 'The Heisenberg uncertainty principle places a fundamental limit on simultaneous precision of position and momentum.'
  },
  {
    categories: ['quantum', 'physics'],
    question: 'What is quantum superposition?',
    options: ['A state represented as a combination of possible states.', 'A rule that particles cannot interact.', 'A method for measuring temperature.', 'A claim that all outcomes happen macroscopically.'],
    correctOptionIndex: 0,
    explanation: 'A quantum system can be described by a superposition of possible states until an interaction or measurement changes that description.'
  },
  {
    categories: ['math', 'geometry'],
    question: 'What is the sum of the interior angles of a triangle in ordinary Euclidean geometry?',
    options: ['180 degrees', '90 degrees', '270 degrees', '360 degrees'],
    correctOptionIndex: 0,
    explanation: 'In Euclidean geometry, the three interior angles of a triangle sum to 180 degrees.'
  },
  {
    categories: ['math', 'arithmetic'],
    question: 'What is 25% of 80?',
    options: ['20', '15', '25', '40'],
    correctOptionIndex: 0,
    explanation: '25% is one quarter, and one quarter of 80 is 20.'
  },
  {
    categories: ['math', 'fractions'],
    question: 'Which decimal is equal to the fraction 3/4?',
    options: ['0.75', '0.34', '1.25', '0.25'],
    correctOptionIndex: 0,
    explanation: 'Dividing 3 by 4 gives 0.75.'
  },
  {
    categories: ['geography', 'earth'],
    question: 'Which is the largest ocean on Earth?',
    options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    correctOptionIndex: 0,
    explanation: 'The Pacific Ocean is the largest ocean by area.'
  },
  {
    categories: ['geography', 'earth'],
    question: 'What latitude is the Equator?',
    options: ['0 degrees latitude', '90 degrees north', '180 degrees latitude', '23.5 degrees south'],
    correctOptionIndex: 0,
    explanation: 'The Equator is defined as 0 degrees latitude.'
  },
  {
    categories: ['programming', 'javascript', 'web'],
    question: 'What is HTML primarily used for on a web page?',
    options: ['Structuring page content', 'Encrypting network traffic', 'Managing database backups', 'Compiling operating-system kernels'],
    correctOptionIndex: 0,
    explanation: 'HTML describes the structure and meaning of content on a web page.'
  },
  {
    categories: ['programming', 'javascript'],
    question: 'In JavaScript, what does a const declaration prevent?',
    options: ['Reassigning the declared binding', 'Reading the variable', 'Using the value in an expression', 'Declaring any other variables'],
    correctOptionIndex: 0,
    explanation: 'A const binding cannot be reassigned; for objects, the binding is fixed but the object’s contents may still be mutable.'
  },
  {
    categories: ['biology', 'science'],
    question: 'What is the main role of photosynthesis in plants?',
    options: ['Use light energy to make sugars from carbon dioxide and water.', 'Turn oxygen into rocks.', 'Create light from soil.', 'Convert sugars directly into nitrogen.'],
    correctOptionIndex: 0,
    explanation: 'Photosynthesis uses light energy to convert carbon dioxide and water into sugars, releasing oxygen as a by-product.'
  },
  {
    categories: ['chemistry', 'science'],
    question: 'What is the chemical formula for water?',
    options: ['H₂O', 'CO₂', 'O₂', 'NaCl'],
    correctOptionIndex: 0,
    explanation: 'A water molecule contains two hydrogen atoms and one oxygen atom, so its formula is H₂O.'
  }
];

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'along', 'among', 'because', 'before',
  'being', 'between', 'could', 'does', 'during', 'every', 'from', 'have', 'into', 'more',
  'most', 'other', 'should', 'their', 'there', 'these', 'they', 'this', 'those', 'through',
  'under', 'using', 'which', 'while', 'where', 'when', 'with', 'within', 'would'
]);

function makeDocumentQuestions(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  chunks: ScoredChunk[]
): QuizQuestion[] {
  const rankedChunks = [...chunks].sort((a, b) => b.score - a.score);
  const sourceWords = Array.from(new Set(
    rankedChunks.flatMap(({ chunk }) =>
      (chunk.content.match(/\b[A-Za-z][A-Za-z'-]{4,}\b/g) || [])
        .filter(word => !STOPWORDS.has(word.toLowerCase()))
        .map(word => word.toLowerCase())
    )
  ));
  if (sourceWords.length < 4) return [];

  const questions: QuizQuestion[] = [];
  const usedSentences = new Set<string>();
  for (const { chunk } of rankedChunks) {
    const sentences = chunk.content.match(/[^.!?\r\n]+(?:[.!?]+|$)/g) || [];
    for (const rawSentence of sentences) {
      const sentence = rawSentence.trim();
      const normalized = sentence.toLowerCase();
      if (sentence.length < 45 || sentence.length > 280 || usedSentences.has(normalized)) continue;
      const words = Array.from(sentence.matchAll(/\b[A-Za-z][A-Za-z'-]{4,}\b/g));
      const target = words.find(match => !STOPWORDS.has(match[0].toLowerCase()));
      if (!target || target.index === undefined) continue;

      const answer = target[0];
      const distractors = sourceWords.filter(word => word !== answer.toLowerCase()).slice(0, 3);
      if (distractors.length < 3) continue;
      usedSentences.add(normalized);

      const options = [...distractors, answer];
      const rotation = questions.length % options.length;
      const rotatedOptions = options.map((_, index) => options[(index + rotation) % options.length]);
      const correctOptionIndex = rotatedOptions.findIndex(option => option.toLowerCase() === answer.toLowerCase());
      const displaySentence = `${sentence.slice(0, target.index)}_____${sentence.slice(target.index + answer.length)}`;
      const title = chunk.documentTitle || 'your uploaded notes';

      questions.push({
        id: `q-note-${Date.now()}-${questions.length}`,
        question: `Complete this exact excerpt from "${title}"${chunk.pageNumber > 0 ? ` (page ${chunk.pageNumber})` : ''}: “${displaySentence}”`,
        options: rotatedOptions,
        correctOptionIndex,
        explanation: `The exact word in the saved study text is “${answer}”. This excerpt comes from "${title}"${chunk.pageNumber > 0 ? `, page ${chunk.pageNumber}` : ''}.`,
        ...(chunk.pageNumber > 0 ? { pageNumber: chunk.pageNumber } : {}),
        topic,
        difficulty
      });
      if (questions.length >= count) return questions;
    }
  }
  return questions;
}

export function createQuotaPracticeQuiz(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  chunks: ScoredChunk[],
  studyMaterial?: { title: string; content: string }
): { questions: QuizQuestion[]; mode: 'uploaded-notes' | 'sample-practice' } {
  const documentQuestions = makeDocumentQuestions(topic, difficulty, count, chunks);
  if (documentQuestions.length >= Math.min(3, count)) {
    return { questions: documentQuestions, mode: 'uploaded-notes' };
  }
  if (studyMaterial) return { questions: documentQuestions, mode: 'uploaded-notes' };

  const topicWords = topic.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
  const matchingSamples = VERIFIED_SAMPLE_QUESTIONS.filter(sample =>
    sample.categories.some(category =>
      topicWords.some(word => category.includes(word) || word.includes(category))
    )
  );
  const selectedSamples = matchingSamples.length >= 3
    ? [...matchingSamples, ...VERIFIED_SAMPLE_QUESTIONS.filter(sample => !matchingSamples.includes(sample))]
    : VERIFIED_SAMPLE_QUESTIONS;
  const questions = selectedSamples.slice(0, count).map((sample, index) => ({
    id: `q-sample-${Date.now()}-${index}`,
    question: sample.question,
    options: sample.options,
    correctOptionIndex: sample.correctOptionIndex,
    explanation: sample.explanation,
    topic,
    difficulty
  }));

  return { questions, mode: 'sample-practice' };
}
