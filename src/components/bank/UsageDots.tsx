import type { BankQuestionSummary } from '../../lib/bank';

interface UsageProps {
  usedInTest?: BankQuestionSummary['usedInTest'];
  usedInChallenge?: BankQuestionSummary['usedInChallenge'];
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Two small round dots (violet = used in a test, red = used in a Daily Challenge); hovering one names where it was used. */
export function UsageDots({ usedInTest, usedInChallenge }: UsageProps) {
  if (!usedInTest && !usedInChallenge) return null;
  const testLabel = usedInTest ? `Used in test: ${usedInTest.testName}${usedInTest.count > 1 ? ` (+${usedInTest.count - 1} more)` : ''}` : '';
  const challengeLabel = usedInChallenge
    ? `Used in Daily Challenge: ${usedInChallenge.title} · ${formatDate(usedInChallenge.startAt)}${usedInChallenge.count > 1 ? ` (+${usedInChallenge.count - 1} more)` : ''}`
    : '';
  return (
    <span className="inline-flex items-center gap-1">
      {usedInTest && <span role="img" title={testLabel} aria-label={testLabel} className="inline-block size-2.5 cursor-help rounded-full bg-accent-500 ring-2 ring-accent-500/25" />}
      {usedInChallenge && <span role="img" title={challengeLabel} aria-label={challengeLabel} className="inline-block size-2.5 cursor-help rounded-full bg-danger-500 ring-2 ring-danger-500/25" />}
    </span>
  );
}
