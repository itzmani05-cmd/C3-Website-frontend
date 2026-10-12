import type { QuestionFormValue } from '../QuestionForm';

export type FixMode = 'curriculum' | 'test';

export interface FixableQuestion extends QuestionFormValue {
  _id: string;
  correctAnswer?: string;
  part?: string;
  section?: string;
  marks?: number;
  /** Unit-wise questions only. */
  status?: 'pending' | 'accepted' | 'rejected';
}

/** Where Question Fix looks: a unit / topic / subtopic, or a test. */
export interface FixTarget {
  mode: FixMode;
  unitId: string;
  topicId: string;
  subtopicId: string;
  testId: string;
}
