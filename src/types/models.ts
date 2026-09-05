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
  createdAt?: string;
  updatedAt?: string;
}

export interface Test {
  _id: string;
  examId: Pick<Exam, '_id' | 'name'>;
  name: string;
  publishToStudent: boolean;
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
  testId: string | null;
  testName: string;
  type: string;
  answerType: AnswerType;
  question: string;
  questionImage: string | null;
  options: QuestionOptions;
  optionImages: QuestionOptionImages;
  correct_answer: CorrectAnswer | '';
  explanation: string;
  explanationImage: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyQuestion {
  _id: string;
  date: string;
  type: string;
  answerType: AnswerType;
  question: string;
  questionImage: string | null;
  options: QuestionOptions;
  optionImages: QuestionOptionImages;
  correct_answer: CorrectAnswer | '';
  explanation: string;
  explanationImage: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentExam {
  _id: string;
  studentEmail: string;
  studentName?: string;
  testId: string | null;
  testName: string;
  startedAt: string;
  answers: Record<string, string>;
  submitted: boolean;
  submittedAt?: string;
  score: number;
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
  submitted: boolean;
  score: number | null;
  percentage: number | null;
  totalQuestions: number | null;
}

export interface TestSummary {
  testId: string | null;
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
  createdByEmail: string;
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

export interface DailyChallengeAttempt {
  _id: string;
  challengeId: string;
  studentEmail: string;
  attemptNumber: number;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  submitted: boolean;
  startedAt: string;
  submittedAt?: string;
}

export interface DailyChallengeQuestionStat {
  questionId: string;
  questionText: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracyPercent: number;
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
  highestScore: number;
}

export interface DailyChallengeAnalytics {
  challenge: Pick<DailyChallenge, '_id' | 'title' | 'startAt' | 'expiresAt' | 'status'>;
  participation: DailyChallengeParticipation;
  perQuestion: DailyChallengeQuestionStat[];
  perStudent: DailyChallengeStudentStat[];
}
