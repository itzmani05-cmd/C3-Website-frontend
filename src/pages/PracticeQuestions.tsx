import QuestionBank from './QuestionBank';

export default function PracticeQuestions() {
  return (
    <QuestionBank
      basePath="/api/practice-questions"
      title="Practice Questions"
      description="Topic-wise practice question sets, kept separate from the question bank"
      noun="practice set"
    />
  );
}
