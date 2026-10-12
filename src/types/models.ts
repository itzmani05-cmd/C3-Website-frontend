export type Role = 'admin' | 'student';

export type UserStatus = 'active' | 'inactive' | 'blocked';

export interface StudentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  examIds: Pick<Exam, '_id' | 'name'>[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Exam {
  _id: string;
  name: string;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestPatternSection {
  key?: string;
  name: string;
  numQuestions: number;
  marksPerQuestion: number;
  negativeMarkFraction: number;
}

export interface TestPatternPart {
  key?: string;
  name: string;
  sections: TestPatternSection[];
}

export interface Test {
  _id: string;
  examId: Pick<Exam, '_id' | 'name'>;
  name: string;
  publishToStudent: boolean;
  pattern?: TestPatternPart[];
  durationMinutes?: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type OptionKey = 'a' | 'b' | 'c' | 'd';

export type QuestionOptions = Record<OptionKey, string>;
export type QuestionOptionImages = Partial<Record<OptionKey, string | null>>;

export type AnswerType = 'single' | 'multiple' | 'numerical';
export type CorrectAnswer = OptionKey | OptionKey[] | string;

export type QuestionType =
  | 'Theory-based MCQ'
  | 'Numerical/Problem-based'
  | 'Assertion-Reason'
  | 'Match the Following'
  | 'Statement type (True/False)'
  | 'Diagram-based';

export type QuestionStatus = 'pending' | 'accepted' | 'rejected';

export interface Question {
  _id: string;
  unitId: string;
  topicId: string;
  subtopicId: string | null;
  type: QuestionType;
  answerType: AnswerType;
  question: string;
  questionImage: string | null;
  options: QuestionOptions;
  optionImages: QuestionOptionImages;
  correct_answer: CorrectAnswer | '';
  explanation: string;
  explanationImage: string | null;
  status: QuestionStatus;
  is_published: boolean;
  timestamp?: string;
}

export interface ExamQuestion {
  _id: string;
  testId: string;
  part?: string;
  section?: string;
  marks?: number;
  negativeMarks?: number;
  type: string;
  answerType: AnswerType;
  question: string;
  questionImage: string | null;
  options: QuestionOptions;
  optionImages: QuestionOptionImages;
  correct_answer: CorrectAnswer | '';
  explanation: string;
  explanationImage: string | null;
  /** Curriculum questions only. */
  status?: 'pending' | 'accepted' | 'rejected';
  /** Curriculum questions only: when the question was created. */
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Admin views get studentEmail/studentName/testName read live from the linked user and test.
export interface StudentExam {
  _id: string;
  userId: string;
  studentEmail: string;
  studentName?: string;
  testId: string;
  testName: string;
  startedAt: string;
  answers: Record<string, string>;
  submitted: boolean;
  submittedAt?: string;
  score: number;
  maxScore?: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  percentage: number;
}

export interface AvailableTest {
  _id: string;
  name: string;
  createdAt: string;
  durationMinutes: number;
  availableFrom: string | null;
  availableUntil: string | null;
  availability: 'upcoming' | 'open' | 'closed';
  questionCount: number;
  totalMarks: number;
  negativeMarkFractions: number[];
  inProgress: boolean;
  submitted: boolean;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  totalQuestions: number | null;
}

export interface TestSummary {
  testId: string;
  testName: string;
  studentsAttempted: number;
  lastSubmittedAt: string | null;
  averagePercentage: number;
}

export interface Subtopic {
  _id: string;
  name: string;
  topicId: string;
  order: number;
}

export interface Topic {
  _id: string;
  name: string;
  unitId: string;
  order: number;
  subtopics: Subtopic[];
}

export interface Unit {
  _id: string;
  examId: string;
  name: string;
  order: number;
  topics: Topic[];
}

export type CurriculumTree = Unit[];

export type DailyChallengeStatus = 'draft' | 'scheduled' | 'published' | 'expired';

export interface DailyChallenge {
  _id: string;
  examId: string;
  dateKey: string;
  title: string;
  description: string;
  questionIds: string[];
  questionCount: number;
  maxAttempts: number;
  availabilityDays: number;
  startAt: string;
  expiresAt: string | null;
  publishedAt: string | null;
  notifiedAt: string | null;
  status: DailyChallengeStatus;
  createdById: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyChallengeDetail extends DailyChallenge {
  questions: Question[];
}

export interface DailyChallengeTodayStats {
  studentsStarted: number;
  studentsCompleted: number;
  averageScore: number;
}

export interface DailyChallengeDashboard {
  today: DailyChallenge | null;
  todayStats: DailyChallengeTodayStats | null;
  upcoming: DailyChallenge[];
  recent: DailyChallenge[];
  draftCount: number;
  stats: {
    totalPublished: number;
    totalParticipantsAllTime: number;
  };
}

export interface DailyChallengeStudentStat {
  studentEmail: string;
  studentName: string;
  attemptsUsed: number;
  bestScore: number;
  bestPercentage: number;
  submitted: boolean;
  lastAttemptAt: string | null;
}

export interface DailyChallengeParticipation {
  eligibleStudents: number;
  attemptedStudents: number;
  completedStudents: number;
  notAttempted: number;
  participationRate: number;
  completionRate: number;
  totalAttempts: number;
  submittedAttempts: number;
  averagePercentage: number;
  averageAttempts: number;
}

export interface DailyChallengeAnalytics {
  challenge: Pick<DailyChallenge, '_id' | 'title' | 'startAt' | 'expiresAt' | 'status'>;
  participation: DailyChallengeParticipation;
  perStudent: DailyChallengeStudentStat[];
  notAttemptedStudents: { studentEmail: string; studentName: string }[];
}

export interface QuestionPaper {
  _id: string;
  examId: Pick<Exam, '_id' | 'name'>;
  title: string;
  year: number | null;
  description: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One page of a server-paged list (list endpoints called with ?page=). */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
