import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, CheckCircle2, Clock3, ExternalLink,
  FileText, Globe, GraduationCap, Link2, Moon, NotebookPen, Play, Search, Sun, Upload
} from 'lucide-react';
import { DocumentChunk, DocumentItem, SavedStudyResource, StudyMaterialContext, StudyProgress } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type MaterialType = 'Written notes' | 'PDF document' | 'External resource';
interface Section { heading: string; content: string; bullets?: string[]; example?: string; code?: string }
interface Lesson {
  id: string; title: string; subject: string; topic: string; description: string;
  difficulty: Difficulty; minutes: number; sections: Section[];
  glossary: { term: string; definition: string }[]; summary: string[];
}
interface StudyMaterialsPageProps {
  documents: DocumentItem[];
  progressRecords: StudyProgress[];
  savedResources: SavedStudyResource[];
  onProgressUpdated: (progress: StudyProgress) => void;
  onResourceAdded: (resource: SavedStudyResource) => void;
  onRefreshData: () => void;
  onAskTutor: (material: StudyMaterialContext) => void;
  onPracticeMaterial: (material: StudyMaterialContext) => void;
  onOpenUpload: (retryDoc?: DocumentItem | null) => void;
  initialMaterialId?: string;
  onInitialMaterialOpened: () => void;
}

const lessonCatalog: Lesson[] = [
  {
    id: 'math-linear-equations', title: 'Linear Equations and Their Graphs', subject: 'Mathematics',
    topic: 'Algebra', difficulty: 'Beginner', minutes: 8,
    description: 'Understand slope, intercepts, and how to solve and graph linear equations.',
    sections: [
      { heading: 'What makes an equation linear?', content: 'A linear equation describes a relationship with a constant rate of change. In two variables, its graph is a straight line. A common form is y = mx + b, where m is the slope and b is the y-intercept.', bullets: ['Slope m measures the change in y for each one-unit increase in x.', 'The y-intercept b is the value of y when x = 0.', 'A vertical line x = c is also linear but cannot be written as y = mx + b.'], example: 'For y = 2x + 3, the slope is 2 and the line crosses the y-axis at (0, 3). Increasing x by 1 increases y by 2.' },
      { heading: 'Solve and check an equation', content: 'Keep an equation balanced by applying the same operation to both sides. Isolate the variable, then substitute the result into the original equation to check it.', bullets: ['Undo addition or subtraction first.', 'Undo multiplication or division next.', 'A solution is a value that makes both sides equal.'], example: 'Solve 3x + 5 = 20. Subtract 5: 3x = 15. Divide by 3: x = 5. Check: 3(5) + 5 = 20.' },
      { heading: 'Read a graph as a relationship', content: 'Each point on a line is an ordered pair that satisfies its equation. The slope between two points is the change in y divided by the change in x.', bullets: ['Positive slope rises from left to right; negative slope falls.', 'Zero slope gives a horizontal line.', 'Parallel non-vertical lines have equal slopes.'] }
    ],
    glossary: [
      { term: 'Slope', definition: 'The ratio of vertical change to horizontal change between points on a line.' },
      { term: 'Y-intercept', definition: 'The point where a graph crosses the y-axis.' },
      { term: 'Linear equation', definition: 'An equation whose graph is a straight line.' }
    ],
    summary: ['A linear relationship has a constant rate of change.', 'In y = mx + b, m is slope and b is the y-intercept.', 'Solve equations by preserving equality on both sides, then verify by substitution.']
  },
  {
    id: 'physics-newtons-laws', title: 'Newton’s Laws of Motion', subject: 'Physics',
    topic: 'Classical mechanics', difficulty: 'Intermediate', minutes: 10,
    description: 'Connect forces, mass, acceleration, and motion through three foundational laws.',
    sections: [
      { heading: 'Inertia and net force', content: 'Newton’s first law says an object keeps its state of rest or constant-velocity motion unless a net external force acts on it. Inertia is resistance to changes in motion; more mass means more inertia.', bullets: ['A force is a push or pull measured in newtons (N).', 'Forces are vectors, so direction matters.', 'Balanced forces have a net force of zero.'], example: 'A resting book has gravity pulling down and a support force pushing up. When these forces balance, the book has no vertical acceleration.' },
      { heading: 'Force causes acceleration', content: 'Newton’s second law relates net force, mass, and acceleration: F_net = ma. For a fixed mass, doubling net force doubles acceleration. For a fixed force, doubling mass halves acceleration.', bullets: ['Use the net force, not one force in isolation.', 'Acceleration points in the direction of the net force.', '1 N = 1 kg·m/s².'], example: 'A 2 kg cart experiences a net force of 6 N. Its acceleration is a = F/m = 6/2 = 3 m/s².' },
      { heading: 'Action–reaction pairs', content: 'Newton’s third law says forces come in equal-and-opposite pairs acting on different objects. They do not cancel in a single free-body diagram because they act on separate bodies.', bullets: ['The forces are the same type, equal in magnitude, and opposite in direction.', 'Either object can exert either force; there is no special “first” force.'] }
    ],
    glossary: [
      { term: 'Net force', definition: 'The vector sum of all external forces on an object.' },
      { term: 'Inertia', definition: 'An object’s resistance to a change in its motion.' },
      { term: 'Acceleration', definition: 'The rate of change of velocity over time.' }
    ],
    summary: ['Zero net force means velocity remains constant.', 'Newton’s second law is F_net = ma.', 'Action–reaction forces act on different objects.']
  },
  {
    id: 'cs-data-structures', title: 'Choosing the Right Data Structure', subject: 'Computer Science and Programming',
    topic: 'Data structures', difficulty: 'Intermediate', minutes: 11,
    description: 'Compare arrays, linked lists, hash maps, and trees by access patterns and trade-offs.',
    sections: [
      { heading: 'Start with operations, not labels', content: 'A data structure organizes data so common operations can be performed efficiently. Before choosing one, identify whether the application needs indexed access, insertion, lookup by key, or ordered traversal.', bullets: ['Arrays offer constant-time indexed access when the index is known.', 'Inserting into the middle of an array generally shifts later elements.', 'A linked list supports local insertion when a node reference is known, but finding an arbitrary position requires traversal.'], example: 'A gallery that jumps to item 400 benefits from indexed storage. A queue that adds and removes at its ends has different needs.' },
      { heading: 'Lookup with hash maps', content: 'A hash map converts a key to a position using a hash function. With a suitable function and controlled load factor, lookup, insertion, and removal take expected constant time on average.', bullets: ['Different keys can map to the same position; this is a collision.', 'Collision handling and resizing affect actual cost.', 'A hash map does not usually preserve sorted order.'], code: 'const scores = new Map<string, number>();\\nscores.set(\"Mina\", 92);\\nconst score = scores.get(\"Mina\");' },
      { heading: 'Use trees when order matters', content: 'Search trees organize keys by comparison, enabling ordered traversal. A balanced search tree can support lookup, insertion, and removal in O(log n); an unbalanced tree can degrade toward O(n).', bullets: ['In-order traversal visits binary search tree keys in sorted order.', 'Balancing keeps tree height small.', 'Choose the simplest structure that meets the required operations.'] }
    ],
    glossary: [
      { term: 'Hash function', definition: 'Maps a key to a value used to choose a storage location.' },
      { term: 'Collision', definition: 'When distinct keys map to the same hash-table position.' },
      { term: 'Amortized cost', definition: 'Average cost over a sequence that may include occasional expensive operations.' }
    ],
    summary: ['Choose a structure based on the operations performed most.', 'Hash maps provide expected constant-time lookup, not sorted order.', 'Balanced search trees preserve order with logarithmic operations.']
  },
  {
    id: 'ai-supervised-learning', title: 'The Core Idea of Supervised Learning', subject: 'Artificial Intelligence and Machine Learning',
    topic: 'Machine learning', difficulty: 'Beginner', minutes: 9,
    description: 'Learn how labeled examples train models to make predictions on new data.',
    sections: [
      { heading: 'Learn from labeled examples', content: 'In supervised learning, a model receives examples containing input features and known target answers. During training, it adjusts parameters to reduce the difference between predictions and targets.', bullets: ['Features are information supplied to a model.', 'A label or target is the answer the model is trained to predict.', 'Training examples should represent the problem the model will face.'], example: 'For house-price prediction, floor area and location can be features; the recorded sale price is the target.' },
      { heading: 'Classification and regression', content: 'Classification predicts a category, such as whether an email is spam. Regression predicts a numerical value, such as delivery time. Both learn from labeled examples, but outputs and evaluation measures differ.', bullets: ['Binary classification has two possible classes.', 'Multiclass classification chooses among more than two classes.', 'Regression error can be measured with mean absolute error.'] },
      { heading: 'Generalization matters', content: 'A model should work well on new examples, not merely memorize its training set. A held-out test set estimates performance on unseen data. Leakage occurs when unavailable-at-prediction information influences training or evaluation.', bullets: ['Separate training and evaluation data before fitting preprocessing steps.', 'A high training score alone does not prove useful predictions.', 'Check whether data collection and class balance reflect the real task.'] }
    ],
    glossary: [
      { term: 'Feature', definition: 'An input variable used by a machine-learning model.' },
      { term: 'Label', definition: 'The known target paired with a training example.' },
      { term: 'Generalization', definition: 'A model’s ability to make useful predictions on unseen data.' }
    ],
    summary: ['Supervised learning uses examples paired with known targets.', 'Classification predicts categories; regression predicts numbers.', 'Evaluation on unseen data helps measure generalization.']
  },
  {
    id: 'data-statistics', title: 'Reading Distributions and Summary Statistics', subject: 'Data Science',
    topic: 'Statistics', difficulty: 'Beginner', minutes: 8,
    description: 'Describe data with center, spread, shape, and robust statistics.',
    sections: [
      { heading: 'Describe shape and center', content: 'A distribution shows how values are arranged. The mean is the arithmetic average; the median is the middle value after sorting. In a skewed distribution, the mean is pulled toward the long tail more than the median.', bullets: ['A symmetric distribution has similar left and right sides.', 'A right-skewed distribution has a long tail toward larger values.', 'Consider units and sample size when reporting summaries.'], example: 'For 2, 3, 3, 4, and 18, the mean is 6 and the median is 3. The large value pulls the mean upward.' },
      { heading: 'Measure spread', content: 'The range is maximum minus minimum. The interquartile range (IQR) is Q3 minus Q1 and describes the middle half of observations. Standard deviation measures typical distance from the mean in the original units.', bullets: ['The range is sensitive to extreme values.', 'The IQR is more robust to outliers.', 'Pair a measure of center with a measure of spread.'] },
      { heading: 'Look before summarizing', content: 'A plot can reveal clusters, gaps, outliers, or multiple peaks that a single number hides. Histograms show numerical distributions; box plots summarize quartiles and flag possible outliers for investigation.', bullets: ['An outlier rule flags values; it does not prove an error.', 'Two groups can have the same mean but different shapes.', 'A summary statistic should answer a specific question.'] }
    ],
    glossary: [
      { term: 'Median', definition: 'The middle value in sorted data, or the midpoint of the two middle values.' },
      { term: 'Interquartile range', definition: 'The difference between the third and first quartiles, Q3 − Q1.' },
      { term: 'Outlier', definition: 'An observation unusually distant from much of the data; investigate it rather than automatically removing it.' }
    ],
    summary: ['The median is often more robust than the mean for skewed data.', 'Use spread measures such as IQR alongside center.', 'Visualize a distribution before drawing conclusions from summaries.']
  },
  {
    id: 'geography-coordinates', title: 'Latitude, Longitude, and Map Coordinates', subject: 'Geography',
    topic: 'Map skills', difficulty: 'Beginner', minutes: 7,
    description: 'Read geographic coordinates and understand how the graticule locates places.',
    sections: [
      { heading: 'Latitude measures north and south', content: 'Latitude is the angular distance north or south of the Equator. The Equator is 0° latitude; values increase toward 90° N and 90° S at the poles. Parallels of latitude run east–west.', bullets: ['The Equator divides the Northern and Southern Hemispheres.', 'A degree of latitude spans roughly 111 km, with small variation.', 'Latitude lines do not meet; they remain parallel.'] },
      { heading: 'Longitude measures east and west', content: 'Longitude is angular distance east or west of the Prime Meridian, defined as 0°. Values extend to 180° east or west. Meridians run pole to pole and converge at the poles.', bullets: ['The International Date Line roughly follows 180°, with political deviations.', 'Civil time-zone borders are not straight meridians.', 'A geographic coordinate needs both latitude and longitude.'], example: '40° N, 74° W is north of the Equator and west of the Prime Meridian; the usual order is latitude, then longitude.' },
      { heading: 'Read coordinate pairs carefully', content: 'Coordinates may use degrees, minutes, and seconds or decimal degrees. Hemisphere letters or signs distinguish directions. In decimal degrees, north and east are commonly positive; south and west negative.', bullets: ['Check whether a dataset expects latitude–longitude or longitude–latitude.', 'More decimal places show precision, not necessarily accuracy.', 'A map projection changes how the curved Earth is represented on a flat map.'] }
    ],
    glossary: [
      { term: 'Latitude', definition: 'Angular position north or south of the Equator.' },
      { term: 'Longitude', definition: 'Angular position east or west of the Prime Meridian.' },
      { term: 'Map projection', definition: 'A method for representing Earth locations on a flat map.' }
    ],
    summary: ['Latitude runs from 0° at the Equator toward 90° at either pole.', 'Longitude is measured east or west from the Prime Meridian.', 'Verify coordinate order, units, and direction.']
  },
  {
    id: 'literature-close-reading', title: 'A Practical Method for Close Reading', subject: 'Literature',
    topic: 'Reading and interpretation', difficulty: 'Intermediate', minutes: 8,
    description: 'Build interpretations by noticing textual choices and supporting claims with evidence.',
    sections: [
      { heading: 'Notice before interpreting', content: 'Close reading begins with careful attention to a passage: word choice, repetition, imagery, syntax, point of view, and shifts in tone. Record observations before deciding what they mean.', bullets: ['Ask what is repeated, contrasted, withheld, or emphasized.', 'Notice who speaks and what the speaker may know or misunderstand.', 'A detail becomes evidence when it supports a clear interpretive claim.'] },
      { heading: 'Make a claim and support it', content: 'An interpretation is an argument, not a plot summary. State a focused claim, cite a short and accurate passage, and explain how the language supports your reading. A quotation does not explain itself.', bullets: ['Keep quotations exact and preserve context.', 'Analyze a word or structural choice rather than repeating the quotation.', 'Consider an alternative interpretation and explain your reasoning.'], example: 'If a narrator repeatedly calls a room “bright” but avoids its windows, a reader might argue brightness is controlled appearance rather than openness. The surrounding passage must support that reading.' },
      { heading: 'Separate evidence from inference', content: 'Textual evidence is what a passage explicitly says. An inference is a reasoned conclusion drawn from it. Strong analysis distinguishes the two and avoids claiming that a text proves more than its details support.', bullets: ['Use “suggests” when interpreting ambiguity.', 'Check that evidence actually appears in the text.', 'Context can refine an interpretation but cannot replace close attention.'] }
    ],
    glossary: [
      { term: 'Close reading', definition: 'Detailed analysis of how a text’s language and structure create meaning.' },
      { term: 'Narrator', definition: 'The voice that tells a story; not automatically the author.' },
      { term: 'Inference', definition: 'A reasoned interpretation derived from available evidence.' }
    ],
    summary: ['Start with precise observations about language and structure.', 'Present an interpretive claim and explain its supporting evidence.', 'Distinguish what a text states from what a reader infers.']
  }
];

const subjectOptions = ['All subjects', 'Mathematics', 'Physics', 'Computer Science and Programming', 'Artificial Intelligence and Machine Learning', 'Data Science', 'Geography', 'Literature'];
const progressFor = (records: StudyProgress[], id: string) => records.find((record) => record.materialId === id);
const classifyDocument = (document: DocumentItem): string => {
  const text = [document.title, ...(document.topics || []), document.summary || ''].join(' ').toLocaleLowerCase();
  if (/\b(physics|quantum|gravity|force|motion|mechanics)\b/.test(text)) return 'Physics';
  if (/\b(math|algebra|geometry|calculus|equation|fraction)\b/.test(text)) return 'Mathematics';
  if (/\b(machine learning|artificial intelligence|neural network|ai model)\b/.test(text)) return 'Artificial Intelligence and Machine Learning';
  if (/\b(statistics|data science|dataset|regression|distribution)\b/.test(text)) return 'Data Science';
  if (/\b(geography|latitude|longitude|map|climate)\b/.test(text)) return 'Geography';
  if (/\b(literature|poetry|novel|close reading|narrative)\b/.test(text)) return 'Literature';
  if (/\b(computer science|programming|database|distributed system|algorithm|software|code)\b/.test(text)) return 'Computer Science and Programming';
  return 'Uploaded notes';
};

export function StudyMaterialsPage({
  documents, progressRecords, savedResources, onProgressUpdated, onResourceAdded,
  onRefreshData,
  onAskTutor,
  onPracticeMaterial,
  onOpenUpload,
  initialMaterialId,
  onInitialMaterialOpened
}: StudyMaterialsPageProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All subjects');
  const [difficultyFilter, setDifficultyFilter] = useState('All difficulties');
  const [typeFilter, setTypeFilter] = useState('All types');
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [documentChunks, setDocumentChunks] = useState<DocumentChunk[]>([]);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [readerError, setReaderError] = useState('');
  const [isDarkReader, setIsDarkReader] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceSubject, setResourceSubject] = useState('Mathematics');
  const [resourceTopic, setResourceTopic] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [isSavingResource, setIsSavingResource] = useState(false);

  const cards = useMemo(() => [
    ...lessonCatalog.map((lesson) => ({
      id: `lesson:${lesson.id}`, title: lesson.title, subject: lesson.subject, topic: lesson.topic,
      description: lesson.description, difficulty: lesson.difficulty, minutes: lesson.minutes,
      type: 'Written notes' as MaterialType, sample: true
    })),
    ...documents.filter((document) => document.status === 'ready').map((document) => ({
      id: `document:${document.id}`, title: document.title,
      subject: classifyDocument(document), topic: document.topics?.[0] || 'Personal study material',
      description: document.summary || `${document.pageCount} page text-based document from your library.`,
      difficulty: 'Intermediate' as Difficulty, minutes: Math.max(1, Math.ceil(document.pageCount * 2)),
      type: 'PDF document' as MaterialType, sample: false
    })),
    ...savedResources.map((resource) => ({
      id: `resource:${resource.id}`, title: resource.title, subject: resource.subject, topic: resource.topic || resource.subject,
      description: resource.description || 'External learning resource. Check its destination before opening.',
      difficulty: 'Beginner' as Difficulty, minutes: 0, type: 'External resource' as MaterialType, sample: false
    }))
  ], [documents, savedResources]);

  const filteredCards = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return cards.filter((card) => {
      const saved = progressFor(progressRecords, card.id);
      const matches = !needle || `${card.title} ${card.subject} ${card.topic} ${card.description}`.toLocaleLowerCase().includes(needle);
      const matchesSubject = subjectFilter === 'All subjects' || card.subject === subjectFilter || card.subject.toLocaleLowerCase().includes(subjectFilter.toLocaleLowerCase());
      return matches && matchesSubject
        && (difficultyFilter === 'All difficulties' || card.difficulty === difficultyFilter)
        && (typeFilter === 'All types' || card.type === typeFilter)
        && (!bookmarksOnly || saved?.bookmarked);
    });
  }, [bookmarksOnly, cards, difficultyFilter, progressRecords, query, subjectFilter, typeFilter]);

  const lesson = lessonCatalog.find((item) => `lesson:${item.id}` === selectedId);
  const selectedDocument = documents.find((item) => `document:${item.id}` === selectedId);
  const resource = savedResources.find((item) => `resource:${item.id}` === selectedId);
  const savedProgress = selectedId ? progressFor(progressRecords, selectedId) : undefined;
  const sections: Section[] = lesson?.sections || documentChunks.map((chunk) => ({
    heading: chunk.pageNumber > 0 ? `Page ${chunk.pageNumber}` : `Section ${chunk.chunkIndex + 1}`,
    content: chunk.content
  }));
  const sectionIndex = sections.length ? Math.min(savedProgress?.sectionIndex || 0, sections.length - 1) : 0;
  const currentSection = sections[sectionIndex];
  const title = lesson?.title || selectedDocument?.title || resource?.title || '';
  const subject = lesson?.subject || (selectedDocument ? classifyDocument(selectedDocument) : undefined) || resource?.subject || '';
  const topic = lesson?.topic || selectedDocument?.topics?.[0] || resource?.topic || subject;

  const saveProgress = async (updates: Partial<Pick<StudyProgress, 'progressPercent' | 'sectionIndex' | 'completed' | 'bookmarked' | 'notes'>> & { accessed?: boolean }) => {
    if (!selectedId) return undefined;
    try {
      const result = await api.updateStudyProgress(selectedId, updates);
      onProgressUpdated(result.progress);
      return result.progress;
    } catch (error) {
      showToast('error', 'Progress Not Saved', error instanceof Error ? error.message : 'Could not save this change.');
      return undefined;
    }
  };

  const openMaterial = async (id: string) => {
    setSelectedId(id);
    setReaderError('');
    setDocumentChunks([]);
    const previous = progressFor(progressRecords, id);
    try {
      const result = await api.updateStudyProgress(id, {
        accessed: true,
        sectionIndex: previous?.sectionIndex || 0,
        progressPercent: previous?.progressPercent || 0
      });
      onProgressUpdated(result.progress);
    } catch (error) {
      showToast('error', 'Progress Not Saved', error instanceof Error ? error.message : 'Could not save reading progress.');
    }
    if (!id.startsWith('document:')) return;
    setIsLoadingDocument(true);
    try {
      const result = await api.getDocument(id.slice('document:'.length));
      const readable = result.chunks.filter((chunk) => chunk.content.trim());
      if (!readable.length) {
        setReaderError('No readable text was extracted. This may be a scanned PDF; scanned pages require OCR before they can be read here. Try a text-based PDF or TXT/Markdown file.');
      } else {
        setDocumentChunks(readable);
      }
    } catch (error) {
      setReaderError(error instanceof Error ? error.message : 'Could not load this study document.');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  useEffect(() => {
    if (!initialMaterialId) return;
    void openMaterial(initialMaterialId);
    onInitialMaterialOpened();
  }, [initialMaterialId]);

  const moveToSection = async (index: number) => {
    if (index < 0 || index >= sections.length) return;
    await saveProgress({
      sectionIndex: index,
      progressPercent: Math.min(99, Math.round(index / sections.length * 100)),
      completed: false
    });
  };

  const handleResourceSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingResource(true);
    try {
      const result = await api.addStudyResource({
        title: resourceTitle, url: resourceUrl, subject: resourceSubject,
        topic: resourceTopic, description: resourceDescription
      });
      onResourceAdded(result.resource);
      setResourceTitle(''); setResourceUrl(''); setResourceTopic(''); setResourceDescription('');
      setResourceFormOpen(false);
      showToast('success', 'Resource Saved', 'Your external learning link is saved to Study Materials.');
    } catch (error) {
      showToast('error', 'Could Not Save Link', error instanceof Error ? error.message : 'Check the title and HTTP(S) link.');
    } finally {
      setIsSavingResource(false);
    }
  };

  if (selectedId) {
    const isExternal = Boolean(resource);
    const lessonContent = lesson?.sections.map((part) => [
      part.heading, part.content, ...(part.bullets || []), part.example || '', part.code || ''
    ].join('\n')).join('\n\n') || '';
    const materialContext: StudyMaterialContext = lesson
      ? { title: lesson.title, topic: lesson.topic, content: lessonContent.slice(0, 12000) }
      : selectedDocument
        ? { title: selectedDocument.title, topic, documentId: selectedDocument.id }
        : { title: resource?.title || '', topic };

    return (
      <div className="mx-auto max-w-6xl animate-in fade-in duration-300">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setSelectedId(undefined)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#6D4AFF] hover:bg-[#EEE9FF]"><ArrowLeft className="h-4 w-4" /> All study materials</button>
          <div className="flex gap-2">
            <button onClick={async () => {
              const bookmarked = !savedProgress?.bookmarked;
              if (await saveProgress({ bookmarked })) showToast('success', bookmarked ? 'Saved for Later' : 'Bookmark Removed', bookmarked ? 'This material is bookmarked.' : 'This bookmark was removed.');
            }} aria-pressed={Boolean(savedProgress?.bookmarked)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${savedProgress?.bookmarked ? 'border-[#DCD4FF] bg-[#EEE9FF] text-[#6D4AFF]' : 'border-[#E8E5F0] bg-white text-[#77758A]'}`}><Bookmark className="h-4 w-4" />{savedProgress?.bookmarked ? 'Bookmarked' : 'Save for later'}</button>
            {!isExternal && <button onClick={() => setIsDarkReader((dark) => !dark)} aria-label={isDarkReader ? 'Switch to light reading mode' : 'Switch to dark reading mode'} className="rounded-xl border border-[#E8E5F0] bg-white p-2 text-[#77758A]">{isDarkReader ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>}
          </div>
        </div>
        <article className={`overflow-hidden rounded-3xl border shadow-sm ${isDarkReader ? 'border-[#363447] bg-[#242338] text-[#EEE9FF]' : 'border-[#E8E5F0] bg-white text-[#242338]'}`}>
          <header className={`border-b px-5 py-6 sm:px-8 ${isDarkReader ? 'border-[#363447] bg-[#2C2A40]' : 'border-[#E8E5F0] bg-[#F7F5FF]'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#6D4AFF]">
                  <span>{subject}</span><span>·</span><span>{topic}</span>
                  {lesson && <span className="rounded-full bg-[#FFF3C4] px-2 py-0.5 text-[#8B6413]">Sample lesson</span>}
                  {selectedDocument && <span className="rounded-full bg-[#DCEBFF] px-2 py-0.5 text-[#3973C6]">Your uploaded notes</span>}
                </p>
                <h2 className={`font-serif text-2xl font-bold sm:text-3xl ${isDarkReader ? 'text-white' : 'text-[#242338]'}`}>{title}</h2>
                {selectedDocument && <p className="mt-2 text-xs text-[#77758A]">{selectedDocument.fileName} · {selectedDocument.pageCount} pages</p>}
                {lesson && <p className="mt-2 text-xs text-[#77758A]">Demonstration content · {lesson.difficulty} · {lesson.minutes} min read</p>}
              </div>
              <div className="w-full max-w-xs">
                <div className="mb-1 flex justify-between text-[11px] text-[#77758A]"><span>Reading progress</span><span>{savedProgress?.completed ? 100 : savedProgress?.progressPercent || 0}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[#E8E5F0]"><div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${savedProgress?.completed ? 100 : savedProgress?.progressPercent || 0}%` }} /></div>
              </div>
            </div>
          </header>
          {isExternal ? (
            <section className="mx-auto max-w-3xl px-5 py-10 text-center">
              <Globe className="mx-auto h-10 w-10 text-[#6D4AFF]" />
              <h3 className="mt-4 text-lg font-bold">External learning resource</h3>
              <p className="mt-2 text-sm text-[#77758A]">{resource?.description || 'This link leads to an external website. Review its destination and content before continuing.'}</p>
              <p className="mt-2 break-all text-xs text-[#6D4AFF]">{resource?.url}</p>
              <a href={resource?.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6D4AFF] px-4 py-2.5 text-sm font-semibold text-white">Open resource <ExternalLink className="h-4 w-4" /></a>
            </section>
          ) : isLoadingDocument ? (
            <p className="px-6 py-16 text-center text-sm text-[#77758A]">Extracted study text is loading…</p>
          ) : readerError ? (
            <div role="alert" className="m-5 rounded-2xl border border-[#F3B6AE] bg-[#FEF3F2] p-5 text-sm leading-6 text-[#B42318]"><strong className="block">This document could not be displayed</strong>{readerError}</div>
          ) : currentSection ? (
            <>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_15rem]">
                <section className="min-w-0 px-5 py-7 sm:px-8 sm:py-9">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6D4AFF]">{selectedDocument && currentSection.heading.startsWith('Page ') ? currentSection.heading : `Section ${sectionIndex + 1} of ${sections.length}`}</p>
                  <h3 className={`mb-5 font-serif text-2xl font-bold ${isDarkReader ? 'text-white' : 'text-[#242338]'}`}>{currentSection.heading}</h3>
                  <p className="mb-4 whitespace-pre-wrap text-[15px] leading-7">{currentSection.content}</p>
                  {currentSection.bullets && <ul className="mb-5 list-disc space-y-2 pl-6 text-[15px] leading-7">{currentSection.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
                  {currentSection.example && <aside className={`my-6 rounded-2xl border-l-4 border-[#6D4AFF] p-4 ${isDarkReader ? 'bg-[#302D47]' : 'bg-[#F7F5FF]'}`}><p className="mb-1 text-xs font-bold text-[#6D4AFF]">Worked example</p><p className="text-sm leading-6">{currentSection.example}</p></aside>}
                  {currentSection.code && <pre className="my-5 overflow-x-auto rounded-xl bg-[#242338] p-4 text-xs leading-6 text-[#EEE9FF]"><code>{currentSection.code}</code></pre>}
                  {lesson && sectionIndex === sections.length - 1 && <section className={`mt-8 rounded-2xl p-5 ${isDarkReader ? 'bg-[#302D47]' : 'bg-[#F7F5FF]'}`}>
                    <h4 className="font-serif text-lg font-bold">Revision summary</h4>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{lesson.summary.map((item) => <li key={item}>{item}</li>)}</ul>
                    <h4 className="mt-6 font-serif text-lg font-bold">Glossary</h4>
                    <dl className="mt-3 space-y-3">{lesson.glossary.map((entry) => <div key={entry.term}><dt className="text-sm font-bold text-[#6D4AFF]">{entry.term}</dt><dd className="mt-0.5 text-sm leading-6">{entry.definition}</dd></div>)}</dl>
                  </section>}
                  <div className="mt-8 flex items-center justify-between gap-2 border-t border-[#E8E5F0] pt-5">
                    <button disabled={!sectionIndex} onClick={() => void moveToSection(sectionIndex - 1)} className="inline-flex items-center gap-2 rounded-xl border border-[#E8E5F0] px-3 py-2 text-xs font-semibold disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
                    <span className="text-[11px] text-[#77758A]">{selectedDocument && currentSection.heading.startsWith('Page ') ? currentSection.heading : `${sectionIndex + 1} / ${sections.length}`}</span>
                    <button disabled={sectionIndex >= sections.length - 1} onClick={() => void moveToSection(sectionIndex + 1)} className="inline-flex items-center gap-2 rounded-xl bg-[#6D4AFF] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Next <ArrowRight className="h-4 w-4" /></button>
                  </div>
                </section>
                <aside className={`border-t px-5 py-6 lg:border-l lg:border-t-0 ${isDarkReader ? 'border-[#363447]' : 'border-[#E8E5F0]'}`}>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#77758A]"><BookOpen className="h-4 w-4" /> Contents</h4>
                  <ol className="space-y-1">{sections.map((part, index) => <li key={`${index}-${part.heading}`}><button onClick={() => void moveToSection(index)} aria-current={index === sectionIndex ? 'location' : undefined} className={`w-full rounded-lg px-2.5 py-2 text-left text-xs leading-5 ${index === sectionIndex ? 'bg-[#EEE9FF] font-semibold text-[#6D4AFF]' : 'text-[#77758A] hover:bg-[#F7F5FF]'}`}>{part.heading}</button></li>)}</ol>
                  <div className="mt-6 space-y-2">
                    <button onClick={() => onAskTutor(materialContext)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCD4FF] bg-[#F7F5FF] px-3 py-2.5 text-xs font-semibold text-[#6D4AFF]"><GraduationCap className="h-4 w-4" /> Ask AI Tutor</button>
                    <button onClick={() => onPracticeMaterial(materialContext)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-3 py-2.5 text-xs font-semibold text-white"><Play className="h-4 w-4" /> Practice this material</button>
                  </div>
                </aside>
              </div>
              <section className={`border-t px-5 py-6 sm:px-8 ${isDarkReader ? 'border-[#363447] bg-[#2C2A40]' : 'border-[#E8E5F0] bg-[#FAF9FC]'}`}>
                <label htmlFor="study-personal-notes" className="flex items-center gap-2 text-sm font-bold"><NotebookPen className="h-4 w-4 text-[#6D4AFF]" /> My notes</label>
                <p className="mt-1 text-xs text-[#77758A]">Private notes saved with this material in your account.</p>
                <textarea id="study-personal-notes" key={selectedId} defaultValue={savedProgress?.notes || ''} maxLength={10000} rows={3} placeholder="Write a reminder or question…" className="mt-3 w-full rounded-xl border border-[#E8E5F0] bg-white px-3 py-2.5 text-sm leading-6 text-[#242338] focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-[#77758A]">Source text and personal notes are kept separate.</p><button disabled={isSavingNotes} onClick={async () => {
                  setIsSavingNotes(true);
                  const notes = (globalThis.document.getElementById('study-personal-notes') as HTMLTextAreaElement | null)?.value ?? '';
                  const result = await saveProgress({ notes });
                  if (result) showToast('success', 'Notes Saved', 'Your notes are saved with this material.');
                  setIsSavingNotes(false);
                }} className="rounded-xl border border-[#E8E5F0] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{isSavingNotes ? 'Saving…' : 'Save notes'}</button></div>
              </section>
            </>
          ) : null}
          {!isLoadingDocument && !readerError && <footer className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-8 ${isDarkReader ? 'border-[#363447]' : 'border-[#E8E5F0]'}`}>
            <span className="text-xs text-[#77758A]">{savedProgress?.completed ? 'Completed' : isExternal ? 'Open the external page safely in a new tab; mark it reviewed when you are done.' : 'Progress saves as you move through sections.'}</span>
            <button disabled={savedProgress?.completed} onClick={async () => {
              const result = await saveProgress({
                completed: true,
                progressPercent: 100,
                ...(!isExternal ? { sectionIndex: Math.max(0, sections.length - 1) } : {})
              });
              if (result) showToast('success', 'Material Completed', 'Your reading progress has been saved.');
            }} className="inline-flex items-center gap-2 rounded-xl bg-[#1B6A43] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-70"><CheckCircle2 className="h-4 w-4" />{savedProgress?.completed ? 'Completed' : isExternal ? 'Mark as reviewed' : 'Mark as completed'}</button>
          </footer>}
        </article>
      </div>
    );
  }

  const completedCount = progressRecords.filter((record) => record.completed).length;
  const inProgress = progressRecords.filter((record) => !record.completed && record.progressPercent > 0);
  const continueCard = inProgress.map((record) => cards.find((card) => card.id === record.materialId)).find(Boolean);
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="rounded-3xl border border-[#E8E5F0] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD4FF] bg-[#EEE9FF] px-3 py-1 text-[10px] font-bold uppercase text-[#6D4AFF]"><BookOpen className="h-3.5 w-3.5" /> Your learning library</div>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#242338] sm:text-3xl">Study first. Practice with confidence.</h2>
            <p className="mt-2 text-sm leading-6 text-[#77758A]">Browse clearly labeled sample lessons, read your uploaded notes, and save your progress between visits.</p>
          </div>
          <button onClick={() => onOpenUpload()} className="inline-flex items-center gap-2 rounded-xl bg-[#6D4AFF] px-4 py-2.5 text-xs font-semibold text-white"><Upload className="h-4 w-4" /> Upload notes</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          ['Available materials', cards.length], ['Completed', completedCount], ['In progress', inProgress.length], ['Bookmarked', progressRecords.filter((record) => record.bookmarked).length]
        ].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#F7F5FF] px-4 py-3"><p className="text-[10px] font-semibold text-[#77758A]">{label}</p><p className="mt-1 font-serif text-2xl font-bold text-[#6D4AFF]">{value}</p></div>)}</div>
      </section>
      {continueCard && <section aria-label="Continue learning" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCD4FF] bg-[#EEE9FF]/60 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#6D4AFF]"><Play className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase text-[#6D4AFF]">Continue learning</p><h3 className="truncate text-sm font-bold text-[#242338]">{continueCard.title}</h3><p className="text-xs text-[#77758A]">{progressFor(progressRecords, continueCard.id)?.progressPercent || 0}% complete</p></div></div>
        <button onClick={() => void openMaterial(continueCard.id)} className="inline-flex items-center gap-2 rounded-xl bg-[#6D4AFF] px-4 py-2.5 text-xs font-semibold text-white">Continue <ArrowRight className="h-4 w-4" /></button>
      </section>}
      <section className="rounded-2xl border border-[#E8E5F0] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(0,12rem))_auto]">
          <label className="relative"><span className="sr-only">Search materials</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77758A]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, subject, topic…" className="w-full rounded-xl border border-[#E8E5F0] py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]" /></label>
          <label className="sr-only" htmlFor="study-subject">Filter by subject</label><select id="study-subject" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="rounded-xl border border-[#E8E5F0] bg-white px-3 py-2.5 text-xs">{subjectOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="study-difficulty">Filter by difficulty</label><select id="study-difficulty" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} className="rounded-xl border border-[#E8E5F0] bg-white px-3 py-2.5 text-xs">{['All difficulties', 'Beginner', 'Intermediate', 'Advanced'].map((item) => <option key={item}>{item}</option>)}</select>
          <label className="sr-only" htmlFor="study-type">Filter by material type</label><select id="study-type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-[#E8E5F0] bg-white px-3 py-2.5 text-xs">{['All types', 'Written notes', 'PDF document', 'External resource'].map((item) => <option key={item}>{item}</option>)}</select>
          <button onClick={() => setBookmarksOnly((value) => !value)} aria-pressed={bookmarksOnly} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${bookmarksOnly ? 'border-[#DCD4FF] bg-[#EEE9FF] text-[#6D4AFF]' : 'border-[#E8E5F0] text-[#77758A]'}`}><Bookmark className="h-3.5 w-3.5" /> Bookmarks</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EEF5] pt-3"><p className="text-xs text-[#77758A]">{filteredCards.length} materials · Sample lessons are labeled</p><button onClick={() => setResourceFormOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#6D4AFF]"><Link2 className="h-3.5 w-3.5" /> Save an external resource</button></div>
        {resourceFormOpen && <form onSubmit={(event) => void handleResourceSave(event)} className="mt-4 grid gap-3 rounded-2xl border border-[#E8E5F0] bg-[#FAF9FC] p-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Resource title<input required maxLength={160} value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E8E5F0] bg-white px-3 py-2" /></label>
          <label className="text-xs font-semibold">HTTP(S) destination<input required type="url" maxLength={2048} value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-[#E8E5F0] bg-white px-3 py-2" /></label>
          <label className="text-xs font-semibold">Subject<select value={resourceSubject} onChange={(event) => setResourceSubject(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E8E5F0] bg-white px-3 py-2">{subjectOptions.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs font-semibold">Topic (optional)<input maxLength={100} value={resourceTopic} onChange={(event) => setResourceTopic(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E8E5F0] bg-white px-3 py-2" /></label>
          <label className="text-xs font-semibold sm:col-span-2">Short description (optional)<input maxLength={500} value={resourceDescription} onChange={(event) => setResourceDescription(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E8E5F0] bg-white px-3 py-2" /></label>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2"><p className="text-[10px] text-[#77758A]">Saved only to your account. External websites are not executed or loaded inside LearnMate.</p><div className="flex gap-2"><button type="button" onClick={() => setResourceFormOpen(false)} className="rounded-lg px-3 py-2 text-xs font-semibold">Cancel</button><button disabled={isSavingResource} className="rounded-lg bg-[#6D4AFF] px-3 py-2 text-xs font-semibold text-white">{isSavingResource ? 'Saving…' : 'Save link'}</button></div></div>
        </form>}
      </section>
      {filteredCards.length ? <section aria-label="Available study materials" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCards.map((card) => {
          const saved = progressFor(progressRecords, card.id);
          const percent = saved?.completed ? 100 : saved?.progressPercent || 0;
          const Icon = card.type === 'PDF document' ? FileText : card.type === 'External resource' ? Globe : BookOpen;
          return <article key={card.id} className="flex min-h-64 flex-col rounded-2xl border border-[#E8E5F0] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C9BCFF] hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEE9FF] text-[#6D4AFF]"><Icon className="h-5 w-5" /></span><div className="flex flex-wrap justify-end gap-1.5"><span className="rounded-full bg-[#F7F5FF] px-2 py-1 text-[10px] font-semibold text-[#6D4AFF]">{card.type}</span>{card.sample && <span className="rounded-full bg-[#FFF3C4] px-2 py-1 text-[10px] font-semibold text-[#8B6413]">Sample</span>}{saved?.bookmarked && <Bookmark aria-label="Bookmarked" className="h-5 w-5 fill-current text-[#6D4AFF]" />}</div></div>
            <div className="mt-4 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-[#77758A]">{card.subject} · {card.topic}</p><h3 className="mt-1.5 font-serif text-lg font-bold leading-snug text-[#242338]">{card.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#77758A]">{card.description}</p></div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-medium text-[#77758A]"><span>{card.difficulty}</span>{card.minutes > 0 && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{card.minutes} min</span>}{saved?.completed && <span className="inline-flex items-center gap-1 text-[#1B6A43]"><Check className="h-3 w-3" />Completed</span>}</div>
            <div className="mt-3"><div className="mb-1 flex justify-between text-[10px] text-[#77758A]"><span>Reading progress</span><span>{percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#F0EEF5]"><div className="h-full rounded-full bg-[#6D4AFF]" style={{ width: `${percent}%` }} /></div></div>
            {card.type === 'External resource' ? <button onClick={() => void openMaterial(card.id)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCD4FF] bg-[#F7F5FF] px-4 py-2.5 text-xs font-semibold text-[#6D4AFF]">View resource <ExternalLink className="h-3.5 w-3.5" /></button> : <button onClick={() => void openMaterial(card.id)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] px-4 py-2.5 text-xs font-semibold text-white">{percent > 0 && !saved?.completed ? 'Continue Learning' : saved?.completed ? 'Review Material' : 'Start Studying'} <ArrowRight className="h-3.5 w-3.5" /></button>}
          </article>;
        })}
      </section> : <div className="rounded-2xl border border-dashed border-[#DCD4FF] bg-white px-5 py-12 text-center"><Search className="mx-auto h-8 w-8 text-[#A7A4B5]" /><h3 className="mt-3 font-serif text-lg font-bold text-[#242338]">No matching study materials</h3><p className="mt-1 text-sm text-[#77758A]">Try another search or change the filters.</p><button onClick={() => { setQuery(''); setSubjectFilter('All subjects'); setDifficultyFilter('All difficulties'); setTypeFilter('All types'); setBookmarksOnly(false); }} className="mt-4 rounded-xl border border-[#DCD4FF] px-4 py-2 text-xs font-semibold text-[#6D4AFF]">Clear filters</button></div>}
      <section aria-label="Uploaded notes" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8E5F0] bg-white p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCEBFF] text-[#3973C6]"><FileText className="h-5 w-5" /></span><div><h3 className="text-sm font-bold text-[#242338]">Your uploaded notes</h3><p className="text-xs text-[#77758A]">Text-based PDFs, TXT, and Markdown · up to 25 MB</p></div></div><div className="flex gap-2"><button onClick={onRefreshData} className="rounded-xl border border-[#E8E5F0] px-3 py-2 text-xs font-semibold text-[#77758A]">Refresh library</button><button onClick={() => onOpenUpload()} className="inline-flex items-center gap-2 rounded-xl border border-[#DCD4FF] px-3 py-2 text-xs font-semibold text-[#6D4AFF]"><Upload className="h-3.5 w-3.5" /> Upload PDF or notes</button></div></section>
      {documents.some((item) => item.status === 'failed' || item.status === 'processing' || item.status === 'uploading') && (
        <section aria-label="Uploads needing attention" className="space-y-2">
          {documents.filter((item) => item.status === 'failed' || item.status === 'processing' || item.status === 'uploading').map((item) => (
            <div key={item.id} role={item.status === 'failed' ? 'alert' : undefined} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${item.status === 'failed' ? 'border-[#F3B6AE] bg-[#FEF3F2] text-[#B42318]' : 'border-[#E8E5F0] bg-white text-[#77758A]'}`}>
              <div className="min-w-0"><p className="truncate font-semibold">{item.title} · {item.status}</p>{item.errorMessage && <p className="mt-1">{item.errorMessage}</p>}</div>
              {item.status === 'failed' && <button onClick={() => onOpenUpload(item)} className="shrink-0 rounded-lg border border-current px-3 py-1.5 font-semibold">Retry with another file</button>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}