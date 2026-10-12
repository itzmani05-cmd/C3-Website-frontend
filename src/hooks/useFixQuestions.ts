import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';
import type { FixableQuestion, FixTarget } from '../components/questionFix/types';
import type { Paged } from '../types/models';

export const FIX_PAGE_SIZE = 10;

export type ServerPageInfo = Omit<Paged<FixableQuestion>, 'items'>;

/**
 * The questions Question Fix shows. Unit-wise questions come from the server a page at a time
 * (a unit can hold thousands); a test's questions load whole, since a test is small and is shown
 * in its pattern order. Changing the target clears the list until it is loaded again.
 */
export default function useFixQuestions(target: FixTarget) {
  const { mode, unitId, topicId, subtopicId, testId } = target;
  const [questions, setQuestions] = useState<FixableQuestion[]>([]);
  const [serverPage, setServerPage] = useState<ServerPageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const currentPage = useRef(1);
  // Only the latest load may fill the list: a slow answer for an old target or page is dropped.
  const latestLoad = useRef(0);

  useEffect(() => {
    latestLoad.current += 1;
    setLoading(false);
    setHasSearched(false);
    setQuestions([]);
    setServerPage(null);
    currentPage.current = 1;
  }, [mode, unitId, topicId, subtopicId, testId]);

  /** Reloads the current page, or `page` when given (unit-wise questions only). */
  const fetchQuestions = useCallback(
    async (page?: number): Promise<void> => {
      const load = ++latestLoad.current;
      setHasSearched(true);
      if (mode === 'test') {
        if (!testId) {
          setQuestions([]);
          return;
        }
        setLoading(true);
        try {
          const response = await api.get<FixableQuestion[]>('/api/questions/exam', { params: { testId } });
          if (load === latestLoad.current) setQuestions(response.data || []);
        } catch (error) {
          console.error('Error fetching exam questions:', error);
          if (load === latestLoad.current) toast.error('Failed to load questions.');
        } finally {
          if (load === latestLoad.current) setLoading(false);
        }
        return;
      }

      if (!unitId) return;
      setLoading(true);
      try {
        const targetPage = page ?? currentPage.current;
        const params: Record<string, string | number> = { unitId, page: targetPage, pageSize: FIX_PAGE_SIZE };
        if (topicId && topicId !== 'all') params.topicId = topicId;
        if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;

        const { data } = await api.get<Paged<FixableQuestion>>('/api/questions', { params });
        if (load !== latestLoad.current) return;
        // Deleting the last question on the last page leaves us past the end.
        if (data.total > 0 && targetPage > data.totalPages) {
          await fetchQuestions(data.totalPages);
          return;
        }
        const { items, ...pageInfo } = data;
        currentPage.current = data.page;
        setQuestions(items);
        setServerPage(pageInfo);
      } catch (error) {
        console.error('Error fetching questions:', error);
        if (load === latestLoad.current) toast.error('Failed to load questions.');
      } finally {
        if (load === latestLoad.current) setLoading(false);
      }
    },
    [mode, unitId, topicId, subtopicId, testId]
  );

  return { questions, serverPage: mode === 'curriculum' ? serverPage : null, loading, setLoading, hasSearched, fetchQuestions };
}
