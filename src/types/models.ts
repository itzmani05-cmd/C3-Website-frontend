export type Role = 'admin' | 'student';

export type UserStatus = 'active' | 'inactive' | 'blocked';

export interface StudentUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Test {
  _id: string;
  name: string;
  publishToStudent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type OptionKey = 'a' | 'b' | 'c' | 'd';

export type QuestionOptions = Record<OptionKey, string>;
export type QuestionOptionImages = Partial<Record<OptionKey, string | null>>;

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
  question: string;
  questionImage: string | null;
  options: QuestionOptions;
  optionImages: QuestionOptionImages;
  correct_answer: OptionKey | '';
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
  question: string;
  questionImage: string | null;
  options: QuestionOptions;
  optionImages: QuestionOptionImages;
  correct_answer: OptionKey | '';
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
  name: string;
  order: number;
  topics: Topic[];
}

export type CurriculumTree = Unit[];
