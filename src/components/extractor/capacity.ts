import type { DraftQuestion } from '../../lib/questionParser';
import type { SectionCount } from '../../hooks/useExtractorDestination';

export interface SectionCapacity {
  saved: number;
  queued: number;
  remaining: number;
}

/** How full a test section is: saved questions plus queued ones for that test (not rejected) against its target. */
export function sectionCapacity(
  sectionCounts: SectionCount[],
  queue: DraftQuestion[],
  testId: string,
  part: string,
  section: string,
  target: number
): SectionCapacity {
  const saved = sectionCounts.find((c) => c.part === part && c.section === section)?.count || 0;
  const queued = queue.filter(
    (q) => q.destination?.mode === 'test' && q.destination.testId === testId && q.part === part && q.section === section && q.status !== 'REJECTED'
  ).length;
  return { saved, queued, remaining: Math.max(0, target - saved - queued) };
}
