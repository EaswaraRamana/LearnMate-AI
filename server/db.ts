import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  DocumentItem,
  DocumentChunk,
  TutorConversation,
  TutorMessage,
  Quiz,
  QuizAttempt,
  TopicMastery,
  StudyTask,
  RecentActivityItem,
  AnalyticsOverview,
  StudyProgress,
  SavedStudyResource
} from '../src/types/index.ts';

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  authAccounts: Record<string, AuthAccount>;
  authSessions: Record<string, AuthSession>;
  documents: Record<string, DocumentItem>;
  chunks: Record<string, DocumentChunk[]>; // docId -> chunks
  conversations: Record<string, TutorConversation>;
  messages: Record<string, TutorMessage[]>; // convId -> messages
  quizzes: Record<string, Quiz>;
  attempts: QuizAttempt[];
  topicMastery: Record<string, Record<string, TopicMastery>>; // userId -> (topic -> TopicMastery)
  tasks: StudyTask[];
  recentActivity: RecentActivityItem[];
  studyProgress: Record<string, StudyProgress>;
  studyResources: SavedStudyResource[];
}

export interface AuthAccount {
  userId: string;
  normalizedEmail: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthSession {
  userId: string;
  expiresAt: string;
}

const DB_DIR = path.resolve(process.env.LEARNMATE_DATA_DIR || path.resolve(process.cwd(), 'data'));
const DB_FILE = path.join(DB_DIR, 'db.json');

const DEMO_USER_ID = 'demo-user-101';

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    if (Object.keys(this.data.documents).length === 0) {
      this.seedDemoData();
      this.save();
    }
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const loaded = JSON.parse(raw) as Partial<DatabaseSchema>;
        return {
          users: loaded.users || {},
          authAccounts: loaded.authAccounts || {},
          authSessions: loaded.authSessions || {},
          documents: loaded.documents || {},
          chunks: loaded.chunks || {},
          conversations: loaded.conversations || {},
          messages: loaded.messages || {},
          quizzes: loaded.quizzes || {},
          attempts: loaded.attempts || [],
          topicMastery: loaded.topicMastery || {},
          tasks: loaded.tasks || [],
          recentActivity: loaded.recentActivity || [],
          studyProgress: loaded.studyProgress || {},
          studyResources: loaded.studyResources || []
        };
      }
    } catch (e) {
      console.error('Error loading db.json, initializing fresh store:', e);
    }

    return {
      users: {},
      authAccounts: {},
      authSessions: {},
      documents: {},
      chunks: {},
      conversations: {},
      messages: {},
      quizzes: {},
      attempts: [],
      topicMastery: {},
      tasks: [],
      recentActivity: [],
      studyProgress: {},
      studyResources: []
    };
  }

  private save(): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public seedDemoData(): void {
    // 1. Demo User Profile
    const demoUser: UserProfile = {
      id: DEMO_USER_ID,
      email: 'alex.chen@university.edu',
      name: 'Alex Chen',
      learningGoal: 'Master Distributed Systems & Operating System primitives for midterm exams',
      targetExamOrCourse: 'CS 451: Distributed Computing & Cloud Infrastructure',
      createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      isDemoUser: true
    };
    this.data.users[DEMO_USER_ID] = demoUser;

    // 2. Pre-seeded Document 1: Distributed Systems & Consistency Models
    const doc1Id = 'doc-dist-sys-01';
    const doc1: DocumentItem = {
      id: doc1Id,
      userId: DEMO_USER_ID,
      title: 'Distributed Systems & Consistency Models',
      fileName: 'Distributed_Systems_Lecture_Notes_Ch4.pdf',
      fileSize: 428000,
      pageCount: 6,
      chunkCount: 8,
      status: 'ready',
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      summary: 'Comprehensive survey of consistency guarantees, CAP theorem, Linearizability vs Serializability, Raft consensus protocol, and vector clocks.',
      topics: ['CAP Theorem', 'Consensus (Raft/Paxos)', 'Linearizability', 'Vector Clocks', 'Replication']
    };
    this.data.documents[doc1Id] = doc1;

    const doc1Chunks: DocumentChunk[] = [
      {
        id: 'chunk-1-1',
        documentId: doc1Id,
        documentTitle: doc1.title,
        chunkIndex: 0,
        pageNumber: 1,
        content: 'Chapter 4: Consistency Models in Distributed Systems. In distributed computing, consistency models specify the contract between programmer and distributed store regarding the visibility of mutations. Strong consistency guarantees that all replica nodes observe write operations in the exact same chronological order. The CAP Theorem (Brewer, 2000) formally states that a distributed datastore can simultaneously provide at most two of three guarantees: Consistency (every read receives the most recent write or an error), Availability (every non-failing request receives a non-error response without guarantee of recent write), and Partition Tolerance (the system continues to operate despite arbitrary dropped or delayed messages between network nodes).',
        characterCount: 820
      },
      {
        id: 'chunk-1-2',
        documentId: doc1Id,
        documentTitle: doc1.title,
        chunkIndex: 1,
        pageNumber: 2,
        content: 'Linearizability vs. Serializability. Linearizability is a real-time recency guarantee applied to individual operations on single objects. If Client A finishes writing value V at physical timestamp t1, any read starting after t1 must observe value V or a later write. In contrast, Serializability is a multi-operation transactional isolation guarantee: it ensures that concurrent transactions execute such that their net effect is equivalent to some strictly serial, non-overlapping execution, without enforcing physical wall-clock ordering. When a distributed database provides both guarantees simultaneously, it is termed Strict Serializability (or External Consistency), as implemented by Google Spanner using TrueTime GPS-synchronized atomic clocks.',
        characterCount: 875
      },
      {
        id: 'chunk-1-3',
        documentId: doc1Id,
        documentTitle: doc1.title,
        chunkIndex: 2,
        pageNumber: 3,
        content: 'The Raft Consensus Algorithm. Raft decomposes consensus into three independent sub-problems: Leader Election, Log Replication, and Safety. In Raft, cluster nodes exist in one of three states: Follower, Candidate, or Leader. Normal operations are partitioned into terms. If a Follower node fails to receive periodic heartbeat RPCs within its randomized election timeout (typically 150ms-300ms), it increments its current term, transitions to Candidate, and broadcasts RequestVote RPCs. A candidate is elected leader upon receiving affirmative votes from a strict majority (quorum, (N/2)+1) of nodes.',
        characterCount: 680
      },
      {
        id: 'chunk-1-4',
        documentId: doc1Id,
        documentTitle: doc1.title,
        chunkIndex: 3,
        pageNumber: 4,
        content: 'Raft Log Replication Invariants. Once elected, the Leader accepts client commands, appends entries to its local append-only log, and sends AppendEntries RPCs to all Followers. An entry is committed as soon as the Leader successfully replicates it onto a majority of nodes. Crucially, Raft enforces the Log Matching Property: if two entries in different logs have the identical term and index, they store the identical command, and their logs are identical in all preceding entries. Followers reject AppendEntries if their log does not match the Leader\'s prevLogIndex and prevLogTerm.',
        characterCount: 660
      },
      {
        id: 'chunk-1-5',
        documentId: doc1Id,
        documentTitle: doc1.title,
        chunkIndex: 4,
        pageNumber: 5,
        content: 'Logical Time and Vector Clocks. Physical quartz clocks suffer from clock drift, skew, and NTP network jitter. Leslie Lamport proposed logical clocks using a scalar integer where event a happening before b implies L(a) < L(b). However, scalar clocks cannot distinguish between causal dependency and concurrent operations. Colin Fidge and Friedemann Mattern introduced Vector Clocks: an array of N integers representing known event counts across all N processes. An event with vector V1 causally precedes V2 if and only if every component V1[k] <= V2[k] and at least one V1[k] < V2[k]. If neither dominates, the events occurred concurrently (V1 || V2), requiring application-level conflict resolution.',
        characterCount: 810
      },
      {
        id: 'chunk-1-6',
        documentId: doc1Id,
        documentTitle: doc1.title,
        chunkIndex: 5,
        pageNumber: 6,
        content: 'Eventual Consistency and Conflict-Free Replicated Data Types (CRDTs). Under network partitions, AP systems surrender immediate consistency to preserve availability. Eventual consistency guarantees that in the absence of new mutations, all replicas eventually converge to identical state. To eliminate manual reconciliation, CRDTs use mathematically formal semi-lattices equipped with commutative, associative, and idempotent merge functions. State-based CRDTs (CvRDTs) broadcast local state, while Operation-based CRDTs (CmRDTs) broadcast commutative operations across reliable causal broadcast transports.',
        characterCount: 710
      }
    ];
    this.data.chunks[doc1Id] = doc1Chunks;

    // 3. Pre-seeded Document 2: Database Storage Engines & Indexing
    const doc2Id = 'doc-db-internals-02';
    const doc2: DocumentItem = {
      id: doc2Id,
      userId: DEMO_USER_ID,
      title: 'Database Storage Internals: B+ Trees vs LSM Trees',
      fileName: 'Database_Storage_Engines_Notes.pdf',
      fileSize: 312000,
      pageCount: 4,
      chunkCount: 5,
      status: 'ready',
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      summary: 'Comparative analysis of B+ Tree disk-oriented layouts vs Log-Structured Merge (LSM) write-optimized trees, write amplification, and Bloom filter optimizations.',
      topics: ['B+ Tree Indexing', 'LSM Trees & SSTables', 'Write Amplification', 'Bloom Filters']
    };
    this.data.documents[doc2Id] = doc2;

    const doc2Chunks: DocumentChunk[] = [
      {
        id: 'chunk-2-1',
        documentId: doc2Id,
        documentTitle: doc2.title,
        chunkIndex: 0,
        pageNumber: 1,
        content: 'B+ Tree Index Architecture. Traditional relational database storage engines (PostgreSQL, InnoDB) organize data pages into balanced B+ Trees. Internal nodes hold pivot search keys and child page pointers, while leaf nodes store keys alongside record tuples (or row IDs in non-clustered indexes). Leaf nodes form a bi-directional linked list, enabling highly efficient O(log N) point lookups and sequential range scans. Nodes correspond directly to fixed disk pages (typically 8KB or 16KB). Updates require in-place page modification buffered by a write-ahead log (WAL) for durability.',
        characterCount: 650
      },
      {
        id: 'chunk-2-2',
        documentId: doc2Id,
        documentTitle: doc2.title,
        chunkIndex: 1,
        pageNumber: 2,
        content: 'Log-Structured Merge (LSM) Trees. For high-write ingestion workloads (RocksDB, Cassandra), in-place disk overwrites generate severe random I/O overhead. LSM Trees structure writes sequentially: incoming mutations are immediately appended to an in-memory sorted MemTable (typically implemented as a SkipList or red-black tree) and concurrently logged to a WAL. When the MemTable exceeds a configured memory threshold (e.g., 64MB), it is flushed to persistent storage as an immutable Sorted String Table (SSTable) organized into hierarchical levels.',
        characterCount: 630
      },
      {
        id: 'chunk-2-3',
        documentId: doc2Id,
        documentTitle: doc2.title,
        chunkIndex: 2,
        pageNumber: 3,
        content: 'Compaction and Write Amplification. Because SSTables are strictly immutable, updates and deletes (represented by deleted tombstones) accumulate over time. Background compaction threads periodically merge overlapping SSTables across levels to reclaim space, purge duplicate keys, and maintain bounded read latency. Write amplification measures the ratio of bytes written to physical storage compared to logical client write bytes. Leveled compaction maintains strict single-file key non-overlap per level at the cost of higher write amplification (10x-30x).',
        characterCount: 640
      },
      {
        id: 'chunk-2-4',
        documentId: doc2Id,
        documentTitle: doc2.title,
        chunkIndex: 3,
        pageNumber: 4,
        content: 'Bloom Filters in LSM Engines. Point reads for non-existent keys in an LSM tree could potentially require searching every SSTable across multiple levels from L0 down to Lmax. To short-circuit wasteful disk reads, each SSTable maintains an in-memory Bloom filter. A Bloom filter is a space-efficient probabilistic data structure utilizing k independent hash functions over an m-bit array. It guarantees zero false negatives: if the filter reports a key is absent, it is guaranteed not to exist in that SSTable without inspecting disk.',
        characterCount: 610
      }
    ];
    this.data.chunks[doc2Id] = doc2Chunks;

    // 4. Pre-seeded Topic Mastery
    const userMastery: Record<string, TopicMastery> = {
      'CAP Theorem': {
        topic: 'CAP Theorem',
        score: 88,
        level: 'proficient',
        totalAttempts: 5,
        correctCount: 4,
        lastAssessedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        trend: 'improving',
        history: [60, 75, 80, 85, 88]
      },
      'Consensus (Raft/Paxos)': {
        topic: 'Consensus (Raft/Paxos)',
        score: 74,
        level: 'developing',
        totalAttempts: 4,
        correctCount: 3,
        lastAssessedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        trend: 'improving',
        history: [50, 60, 70, 74]
      },
      'Linearizability': {
        topic: 'Linearizability',
        score: 52,
        level: 'needs_attention',
        totalAttempts: 3,
        correctCount: 1,
        lastAssessedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        trend: 'declining',
        history: [70, 60, 52]
      },
      'Vector Clocks': {
        topic: 'Vector Clocks',
        score: 82,
        level: 'proficient',
        totalAttempts: 4,
        correctCount: 4,
        lastAssessedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        trend: 'stable',
        history: [75, 80, 80, 82]
      },
      'B+ Tree Indexing': {
        topic: 'B+ Tree Indexing',
        score: 79,
        level: 'developing',
        totalAttempts: 3,
        correctCount: 2,
        lastAssessedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        trend: 'improving',
        history: [60, 70, 79]
      },
      'LSM Trees & SSTables': {
        topic: 'LSM Trees & SSTables',
        score: 48,
        level: 'needs_attention',
        totalAttempts: 2,
        correctCount: 1,
        lastAssessedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        trend: 'declining',
        history: [60, 48]
      }
    };
    this.data.topicMastery[DEMO_USER_ID] = userMastery;

    // 5. Pre-seeded Quiz & Attempts
    const sampleQuizId = 'quiz-sample-01';
    const sampleQuiz: Quiz = {
      id: sampleQuizId,
      userId: DEMO_USER_ID,
      documentId: doc1Id,
      documentTitle: doc1.title,
      topic: 'Consensus (Raft/Paxos)',
      difficulty: 'medium',
      questionCount: 3,
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      questions: [
        {
          id: 'q-sample-1',
          question: 'In the Raft consensus algorithm, how does a candidate node determine that it has won an election?',
          options: [
            'It receives affirmative votes from a strict majority (quorum) of cluster nodes in that term.',
            'It receives an acknowledgment from the former leader verifying resignation.',
            'Its randomized election timeout is the highest value in the configuration.',
            'It successfully writes a tombstone record to every follower disk.'
          ],
          correctOptionIndex: 0,
          explanation: 'Raft requires a strict majority quorum: (N/2) + 1 affirmative votes from nodes in the current term to win an election.',
          pageNumber: 3,
          topic: 'Consensus (Raft/Paxos)',
          difficulty: 'medium'
        },
        {
          id: 'q-sample-2',
          question: 'What is the key difference between Linearizability and Serializability?',
          options: [
            'Linearizability applies to single-object operations with real-time recency guarantees, while Serializability applies to multi-operation transactions without physical wall-clock ordering.',
            'Serializability requires atomic GPS clocks, whereas Linearizability does not.',
            'Linearizability permits stale reads if the cluster is partitioned.',
            'Serializability operates strictly on distributed file systems, whereas Linearizability is for local memory.'
          ],
          correctOptionIndex: 0,
          explanation: 'Linearizability is a real-time recency guarantee on single operations, while Serializability ensures transactions are equivalent to some serial order regardless of real-time bounds.',
          pageNumber: 2,
          topic: 'Linearizability',
          difficulty: 'medium'
        },
        {
          id: 'q-sample-3',
          question: 'Under what condition are two events E1 and E2 considered concurrent in Vector Clock notation?',
          options: [
            'Neither vector clock dominates the other: neither E1 <= E2 nor E2 <= E1.',
            'Both events possess identical scalar physical timestamps.',
            'The network latency between processes was zero milliseconds.',
            'Both events occurred within the same synchronized NTP round.'
          ],
          correctOptionIndex: 0,
          explanation: 'Vector clocks define concurrency when neither vector is causally prior to the other, requiring application-level reconciliation.',
          pageNumber: 5,
          topic: 'Vector Clocks',
          difficulty: 'medium'
        }
      ]
    };
    this.data.quizzes[sampleQuizId] = sampleQuiz;

    const sampleAttempt: QuizAttempt = {
      id: 'attempt-01',
      quizId: sampleQuizId,
      quizTitle: sampleQuiz.topic,
      userId: DEMO_USER_ID,
      score: 2,
      totalQuestions: 3,
      percentage: 66.7,
      timeSpentSeconds: 110,
      completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      responses: [
        {
          questionId: 'q-sample-1',
          selectedOptionIndex: 0,
          isCorrect: true,
          explanation: 'Correct! Raft requires (N/2)+1 quorum votes.',
          topic: 'Consensus (Raft/Paxos)'
        },
        {
          questionId: 'q-sample-2',
          selectedOptionIndex: 1,
          isCorrect: false,
          explanation: 'Linearizability is single-object real-time recency; Serializability is transactional equivalence without clock constraints.',
          topic: 'Linearizability'
        },
        {
          questionId: 'q-sample-3',
          selectedOptionIndex: 0,
          isCorrect: true,
          explanation: 'Correct! Neither vector dominating signifies concurrent execution.',
          topic: 'Vector Clocks'
        }
      ],
      feedbackNotes: 'Good understanding of consensus quorums and vector clocks. Review Chapter 4 Page 2 on Linearizability vs Serializability.'
    };
    this.data.attempts.push(sampleAttempt);

    // 6. Pre-seeded Conversation & Messages
    const convId = 'conv-sample-01';
    const conv: TutorConversation = {
      id: convId,
      userId: DEMO_USER_ID,
      title: 'Linearizability vs Serializability & Raft Consensus',
      documentIds: [doc1Id],
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      messagesCount: 2
    };
    this.data.conversations[convId] = conv;

    const messages: TutorMessage[] = [
      {
        id: 'msg-01',
        conversationId: convId,
        role: 'user',
        content: 'Can you explain the difference between Linearizability and Serializability based on my uploaded notes?',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'msg-02',
        conversationId: convId,
        role: 'assistant',
        content: `### Linearizability vs. Serializability

Based directly on your uploaded notes in **Distributed Systems & Consistency Models** (Page 2), here is how they differ:

1. **Linearizability (Recency Guarantee)**
   - Applies to **individual operations on single objects** (e.g., registers, keys).
   - Enforces a **real-time contract**: if Client A completes a write operation at wall-clock time $t_1$, any subsequent read starting after $t_1$ is guaranteed to see value $V$ or a newer write.
   - It eliminates stale reads across observers.

2. **Serializability (Isolation Guarantee)**
   - Applies to **multi-operation transactions**.
   - Guarantees that concurrent transactions execute such that the net outcome is identical to *some* serial, non-interleaved sequence.
   - Crucially, it does **not** enforce physical wall-clock ordering. Transaction $T_2$ could commit before $T_1$ in physical time, yet be serialized before $T_1$.

3. **Strict Serializability (Combined Guarantee)**
   - When a system guarantees both Linearizability and Serializability simultaneously, it is termed **Strict Serializability** (or External Consistency), as achieved in Google Spanner using TrueTime synchronized GPS/atomic clocks.`,
        citations: [
          {
            documentId: doc1Id,
            documentTitle: doc1.title,
            pageNumber: 2,
            snippet: 'Linearizability is a real-time recency guarantee applied to individual operations on single objects... Serializability is a multi-operation transactional isolation guarantee...',
            relevanceScore: 18.5
          }
        ],
        suggestedFollowUps: [
          'What happens during network partitions under the CAP theorem?',
          'How does Raft enforce the Log Matching Property on Page 4?',
          'Generate a 5-question quiz testing these two models.'
        ],
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 3000).toISOString()
      }
    ];
    this.data.messages[convId] = messages;

    // 7. Pre-seeded Study Tasks
    this.data.tasks = [
      {
        id: 'task-01',
        userId: DEMO_USER_ID,
        title: 'Revise Linearizability recency bounds and TrueTime proof',
        topic: 'Linearizability',
        dueDate: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
        completed: false,
        priority: 'high',
        documentId: doc1Id,
        isRecommendation: true,
        reason: 'Mastery dropped to 52% following recent quiz attempt. Review Chapter 4 Page 2.'
      },
      {
        id: 'task-02',
        userId: DEMO_USER_ID,
        title: 'Review LSM Tree Compaction and Leveled SSTable strategies',
        topic: 'LSM Trees & SSTables',
        dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        completed: false,
        priority: 'high',
        documentId: doc2Id,
        isRecommendation: true,
        reason: 'Mastery is at 48% (Needs Attention). Review Page 3 notes on write amplification.'
      },
      {
        id: 'task-03',
        userId: DEMO_USER_ID,
        title: 'Complete practice quiz on Raft consensus election timeouts',
        topic: 'Consensus (Raft/Paxos)',
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
        completed: true,
        priority: 'medium',
        documentId: doc1Id,
        isRecommendation: false
      }
    ];

    // 8. Recent Activity
    this.data.recentActivity = [
      {
        id: 'act-01',
        userId: DEMO_USER_ID,
        type: 'quiz_completed',
        title: 'Scored 66.7% on Consensus & Consistency Quiz',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        meta: { score: 66.7, topic: 'Consensus (Raft/Paxos)' }
      },
      {
        id: 'act-02',
        userId: DEMO_USER_ID,
        type: 'document_uploaded',
        title: 'Uploaded "Database Storage Internals: B+ Trees vs LSM Trees"',
        timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'act-03',
        userId: DEMO_USER_ID,
        type: 'topic_practiced',
        title: 'Practiced Vector Clocks & Lamport timestamps with AI Tutor',
        timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'act-04',
        userId: DEMO_USER_ID,
        type: 'document_uploaded',
        title: 'Uploaded "Distributed Systems & Consistency Models"',
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      }
    ];
  }

  // User Profile
  public getUser(userId: string = DEMO_USER_ID): UserProfile {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        id: userId,
        email: 'student@university.edu',
        name: 'Learner',
        learningGoal: 'Master study materials and achieve top grades',
        createdAt: new Date().toISOString()
      };
      this.save();
    }
    return this.data.users[userId];
  }

  public updateUserProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    const current = this.getUser(userId);
    this.data.users[userId] = { ...current, ...updates };
    this.save();
    return this.data.users[userId];
  }

  public findAuthAccountByEmail(email: string): AuthAccount | undefined {
    const normalizedEmail = email.trim().toLocaleLowerCase('en-US');
    return Object.values(this.data.authAccounts).find((account) => account.normalizedEmail === normalizedEmail);
  }

  public createAuthAccount(
    profile: Pick<UserProfile, 'id' | 'email' | 'name' | 'createdAt'>,
    passwordHash: string,
    sessionTokenHash: string,
    sessionExpiresAt: string
  ): boolean {
    const normalizedEmail = profile.email.trim().toLocaleLowerCase('en-US');
    if (this.findAuthAccountByEmail(normalizedEmail)) return false;

    const account: AuthAccount = {
      userId: profile.id,
      normalizedEmail,
      passwordHash,
      createdAt: profile.createdAt
    };
    this.data.authAccounts[profile.id] = account;
    this.data.users[profile.id] = { ...profile, learningGoal: '' };
    this.data.authSessions[sessionTokenHash] = {
      userId: profile.id,
      expiresAt: sessionExpiresAt
    };

    try {
      this.save();
    } catch (error) {
      delete this.data.authAccounts[profile.id];
      delete this.data.users[profile.id];
      delete this.data.authSessions[sessionTokenHash];
      throw error;
    }
    return true;
  }

  public createAuthSession(userId: string, tokenHash: string, expiresAt: string): void {
    this.data.authSessions[tokenHash] = { userId, expiresAt };
    try {
      this.save();
    } catch (error) {
      delete this.data.authSessions[tokenHash];
      throw error;
    }
  }

  public getAuthSessionUserId(tokenHash: string): string | undefined {
    const session = this.data.authSessions[tokenHash];
    if (!session) return undefined;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      delete this.data.authSessions[tokenHash];
      this.save();
      return undefined;
    }
    return this.data.users[session.userId] ? session.userId : undefined;
  }

  public deleteAuthSession(tokenHash: string): void {
    if (this.data.authSessions[tokenHash]) {
      delete this.data.authSessions[tokenHash];
      this.save();
    }
  }

  // Documents
  public getDocuments(userId: string = DEMO_USER_ID): DocumentItem[] {
    return Object.values(this.data.documents)
      .filter(d => d.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getDocument(userId: string, docId: string): DocumentItem | undefined {
    const doc = this.data.documents[docId];
    if (doc && doc.userId === userId) return doc;
    return undefined;
  }

  public addDocument(userId: string, doc: DocumentItem, chunks: DocumentChunk[]): DocumentItem {
    this.data.documents[doc.id] = doc;
    this.data.chunks[doc.id] = chunks;

    this.data.recentActivity.unshift({
      id: `act-${Date.now()}`,
      userId,
      type: 'document_uploaded',
      title: `Uploaded "${doc.title}" (${doc.pageCount} pages)`,
      timestamp: new Date().toISOString()
    });

    this.save();
    return doc;
  }

  public updateDocument(userId: string, docId: string, updates: Partial<DocumentItem>, chunks?: DocumentChunk[]): DocumentItem | null {
    const doc = this.data.documents[docId];
    if (!doc || doc.userId !== userId) return null;

    this.data.documents[docId] = { ...doc, ...updates };
    if (chunks) {
      this.data.chunks[docId] = chunks;
    }
    this.save();
    return this.data.documents[docId];
  }

  public deleteDocument(userId: string, docId: string): boolean {
    const doc = this.data.documents[docId];
    if (!doc || doc.userId !== userId) return false;

    delete this.data.documents[docId];
    delete this.data.chunks[docId];

    // Remove tasks associated with document
    this.data.tasks = this.data.tasks.filter(t => t.documentId !== docId);
    delete this.data.studyProgress[`${userId}:document:${docId}`];

    this.save();
    return true;
  }

  public getDocumentChunks(userId: string, docIds?: string[]): DocumentChunk[] {
    const allowedDocuments = this.getDocuments(userId);
    const selectedIds = docIds?.length
      ? new Set(docIds.filter(id => allowedDocuments.some(doc => doc.id === id)))
      : new Set(allowedDocuments.map(doc => doc.id));
    return Array.from(selectedIds).flatMap(id => this.data.chunks[id] || []);
  }

  public getStudyProgress(userId: string): StudyProgress[] {
    return Object.values(this.data.studyProgress)
      .filter(progress => progress.userId === userId)
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());
  }

  public updateStudyProgress(
    userId: string,
    materialId: string,
    updates: Partial<Pick<StudyProgress, 'progressPercent' | 'sectionIndex' | 'completed' | 'bookmarked' | 'notes'>>,
    accessed = false
  ): StudyProgress {
    const key = `${userId}:${materialId}`;
    const previous = this.data.studyProgress[key];
    const now = new Date().toISOString();
    const progress: StudyProgress = {
      userId,
      materialId,
      progressPercent: previous?.progressPercent ?? 0,
      sectionIndex: previous?.sectionIndex ?? 0,
      completed: previous?.completed ?? false,
      bookmarked: previous?.bookmarked ?? false,
      notes: previous?.notes ?? '',
      lastAccessedAt: previous?.lastAccessedAt ?? now,
      updatedAt: now,
      ...updates,
      ...(accessed ? { lastAccessedAt: now } : {})
    };
    this.data.studyProgress[key] = progress;
    this.save();
    return progress;
  }

  public getStudyResources(userId: string): SavedStudyResource[] {
    return this.data.studyResources
      .filter(resource => resource.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addStudyResource(resource: SavedStudyResource): SavedStudyResource {
    this.data.studyResources.unshift(resource);
    this.save();
    return resource;
  }

  // Tutor Conversations
  public getConversations(userId: string = DEMO_USER_ID): TutorConversation[] {
    return Object.values(this.data.conversations)
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getConversation(userId: string, convId: string): { conversation: TutorConversation; messages: TutorMessage[] } | null {
    const c = this.data.conversations[convId];
    if (!c || c.userId !== userId) return null;
    const msgs = this.data.messages[convId] || [];
    return { conversation: c, messages: msgs };
  }

  public createConversation(userId: string, title: string, documentIds: string[] = []): TutorConversation {
    const id = `conv-${Date.now()}`;
    const conv: TutorConversation = {
      id,
      userId,
      title: title || 'New Study Session',
      documentIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messagesCount: 0
    };
    this.data.conversations[id] = conv;
    this.data.messages[id] = [];
    this.save();
    return conv;
  }

  public deleteConversation(userId: string, convId: string): boolean {
    const c = this.data.conversations[convId];
    if (!c || c.userId !== userId) return false;
    delete this.data.conversations[convId];
    delete this.data.messages[convId];
    this.save();
    return true;
  }

  public addMessage(userId: string, convId: string, message: TutorMessage): TutorMessage {
    const c = this.data.conversations[convId];
    if (!c || c.userId !== userId) {
      throw new Error('Conversation not found');
    }
    if (!this.data.messages[convId]) {
      this.data.messages[convId] = [];
    }
    this.data.messages[convId].push(message);
    c.updatedAt = new Date().toISOString();
    c.messagesCount = this.data.messages[convId].length;
    this.save();
    return message;
  }

  // Quizzes & Scoring
  public saveQuiz(quiz: Quiz): Quiz {
    this.data.quizzes[quiz.id] = quiz;
    this.save();
    return quiz;
  }

  public getQuiz(quizId: string): Quiz | undefined {
    return this.data.quizzes[quizId];
  }

  public saveQuizAttempt(
    attempt: QuizAttempt,
    masteryUpdates: Record<string, TopicMastery>,
    newTasks: StudyTask[] = []
  ): QuizAttempt {
    this.data.attempts.unshift(attempt);

    // Save mastery updates
    if (!this.data.topicMastery[attempt.userId]) {
      this.data.topicMastery[attempt.userId] = {};
    }
    for (const [topic, m] of Object.entries(masteryUpdates)) {
      this.data.topicMastery[attempt.userId][topic] = m;
    }

    // Save study task recommendations
    for (const task of newTasks) {
      this.data.tasks.unshift(task);
    }

    this.data.recentActivity.unshift({
      id: `act-${Date.now()}`,
      userId: attempt.userId,
      type: 'quiz_completed',
      title: `Completed ${attempt.quizTitle} Quiz: ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)`,
      timestamp: new Date().toISOString(),
      meta: { score: attempt.percentage, topic: attempt.quizTitle }
    });

    this.save();
    return attempt;
  }

  public getQuizAttempts(userId: string = DEMO_USER_ID): QuizAttempt[] {
    return this.data.attempts
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  public getTopicMastery(userId: string = DEMO_USER_ID): Record<string, TopicMastery> {
    return this.data.topicMastery[userId] || {};
  }

  // Study Tasks
  public getStudyTasks(userId: string = DEMO_USER_ID): StudyTask[] {
    return this.data.tasks.filter(t => t.userId === userId);
  }

  public addStudyTask(task: StudyTask): StudyTask {
    this.data.tasks.unshift(task);
    this.save();
    return task;
  }

  public updateStudyTask(userId: string, taskId: string, updates: Partial<StudyTask>): StudyTask | null {
    const idx = this.data.tasks.findIndex(t => t.id === taskId && t.userId === userId);
    if (idx === -1) return null;
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };

    if (updates.completed) {
      this.data.recentActivity.unshift({
        id: `act-${Date.now()}`,
        userId,
        type: 'study_task_completed',
        title: `Completed task: "${this.data.tasks[idx].title}"`,
        timestamp: new Date().toISOString()
      });
    }

    this.save();
    return this.data.tasks[idx];
  }

  public deleteStudyTask(userId: string, taskId: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => !(t.id === taskId && t.userId === userId));
    const deleted = this.data.tasks.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  // Analytics Computation from Real Stored Records
  public getAnalytics(userId: string = DEMO_USER_ID): AnalyticsOverview {
    const userDocs = this.getDocuments(userId);
    const userAttempts = this.getQuizAttempts(userId);
    const userMasteryMap = this.getTopicMastery(userId);
    const masteryList = Object.values(userMasteryMap);

    const documentsCount = userDocs.length;
    const studySessionsCount = userAttempts.length + Object.keys(this.data.conversations).filter(k => this.data.conversations[k].userId === userId).length;

    const totalQuestionsAnswered = userAttempts.reduce((acc, a) => acc + a.totalQuestions, 0);
    const avgScore = userAttempts.length > 0
      ? Math.round(userAttempts.reduce((acc, a) => acc + a.percentage, 0) / userAttempts.length)
      : 0;

    const topicsMasteredCount = masteryList.filter(m => m.level === 'proficient').length;

    // Weekly activity computation (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = new Map<string, { date: string; day: string; count: number; minutes: number }>();
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weeklyMap.set(dateStr, {
        date: dateStr,
        day: days[d.getDay()],
        count: 0,
        minutes: 0
      });
    }

    userAttempts.forEach(a => {
      const dateStr = a.completedAt.split('T')[0];
      if (weeklyMap.has(dateStr)) {
        const item = weeklyMap.get(dateStr)!;
        item.count += 1;
        item.minutes += Math.max(5, Math.round(a.timeSpentSeconds / 60));
      }
    });

    const weeklyActivity = Array.from(weeklyMap.values());

    // Score trend across attempts
    const scoreTrend = userAttempts.slice(-10).reverse().map(a => ({
      attemptDate: new Date(a.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      quizTitle: a.quizTitle,
      score: Math.round(a.percentage)
    }));

    return {
      documentsCount,
      studySessionsCount,
      averageQuizScore: avgScore,
      topicsMasteredCount,
      totalQuestionsAnswered,
      weeklyActivity,
      scoreTrend,
      masteryDistribution: masteryList,
      recentActivity: this.data.recentActivity
        .filter(activity => activity.userId === userId || (!activity.userId && userId === DEMO_USER_ID))
        .slice(0, 10)
        .map(activity => ({
          id: activity.id,
          type: activity.type,
          title: activity.title,
          timestamp: activity.timestamp,
          meta: activity.meta
        }))
    };
  }
}

export const db = new Database();
export { DEMO_USER_ID };
