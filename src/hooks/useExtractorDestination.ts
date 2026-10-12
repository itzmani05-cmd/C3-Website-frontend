import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';
import useExamCatalog from './useExamCatalog';
import type { TestPatternPart } from '../types/models';

export type ExtractorMode = 'curriculum' | 'test';

export interface SectionCount {
  part: string;
  section: string;
  count: number;
}

/**
 * Where extracted questions are saved: a unit / topic / subtopic, or a test (and, for a test with
 * a pattern, one part and section). Keeps the choices valid as the catalog changes, and loads how
 * many questions the destination already has.
 */
export default function useExtractorDestination() {
  const [mode, setMode] = useState<ExtractorMode>('curriculum');
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [testId, setTestId] = useState('');
  const [partName, setPartName] = useState('');
  const [sectionName, setSectionName] = useState('');

  const catalog = useExamCatalog((tree, examTests) => {
    const firstTopic = tree[0]?.topics?.[0];
    setUnitId(tree[0]?._id || '');
    setTopicId(firstTopic?._id || '');
    setSubtopicId(firstTopic?.subtopics?.[0]?._id || '');
    setTestId(examTests[0]?._id || '');
  });
  const { curriculum, tests, examId } = catalog;

  const test = tests.find((t) => t._id === testId);
  const pattern: TestPatternPart[] | undefined = test?.pattern;
  const part = pattern?.find((p) => p.name === partName);
  const section = part?.sections.find((s) => s.name === sectionName);

  const unit = curriculum.find((u) => u._id === unitId);
  const topics = unit?.topics ?? [];
  const topic = topics.find((t) => t._id === topicId);
  const subtopics = topic?.subtopics ?? [];

  // Keep the part and section valid for the chosen test.
  useEffect(() => {
    if (!pattern || pattern.length === 0) {
      setPartName('');
      setSectionName('');
    } else if (!pattern.some((p) => p.name === partName)) {
      setPartName(pattern[0].name);
    }
  }, [pattern, partName]);

  useEffect(() => {
    if (part && !part.sections.some((s) => s.name === sectionName)) setSectionName(part.sections[0]?.name || '');
  }, [part, sectionName]);

  // Keep the topic and subtopic valid for the chosen unit / topic.
  useEffect(() => {
    if (!unitId || curriculum.length === 0) return;
    const current = unit || curriculum[0];
    const firstTopic = current.topics?.[0];
    if (firstTopic && !current.topics.some((t) => t._id === topicId)) setTopicId(firstTopic._id);
  }, [unitId, unit, curriculum, topicId]);

  useEffect(() => {
    if (!topicId || curriculum.length === 0) return;
    const current = (unit || curriculum[0]).topics?.find((t) => t._id === topicId);
    if (current && !current.subtopics.some((st) => st._id === subtopicId)) setSubtopicId(current.subtopics?.[0]?._id || '');
  }, [topicId, curriculum, subtopicId, unit]);

  // Questions already saved in the destination (per section for a patterned test).
  const [savedCount, setSavedCount] = useState(0);
  const [sectionCounts, setSectionCounts] = useState<SectionCount[]>([]);
  const [countLoading, setCountLoading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  // True once the counts shown belong to the current destination.
  const [countsReady, setCountsReady] = useState(false);
  const latestRequest = useRef(0);

  // Loads the counts of the current destination. A newer call (or a destination change) discards older answers.
  const loadCounts = useCallback(async () => {
    const request = ++latestRequest.current;
    const isLatest = () => request === latestRequest.current;
    const destinationMissing = mode === 'test' ? !test : !topicId;
    if (destinationMissing) {
      setSavedCount(0);
      setSectionCounts([]);
      setCountsReady(false);
      setCountLoading(false);
      return;
    }

    setCountLoading(true);
    try {
      if (mode === 'test') {
        const testId = test!._id;
        const response = await api.get('/api/questions/exam/count', { params: { testId } });
        const sections = pattern && pattern.length > 0 ? (await api.get('/api/questions/exam/section-counts', { params: { testId } })).data || [] : [];
        if (!isLatest()) return;
        setSavedCount(response.data.count || 0);
        setSectionCounts(sections);
      } else {
        const response = await api.get('/api/questions/stats/count', { params: { topicId, ...(subtopicId ? { subtopicId } : {}) } });
        if (!isLatest()) return;
        setSavedCount(response.data.count || 0);
        setSectionCounts([]);
      }
      setCountsReady(true);
    } catch (error) {
      console.error('Error fetching question counts:', error);
      if (!isLatest()) return;
      setCountsReady(false);
      toast.error('Could not load how many questions are already saved. Press Continue to try again.');
    } finally {
      if (isLatest()) setCountLoading(false);
    }
  }, [mode, test, pattern, topicId, subtopicId]);

  // A new destination starts with empty counts, then loads its own.
  useEffect(() => {
    setShowProgress(false);
    setSavedCount(0);
    setSectionCounts([]);
    setCountsReady(false);
    loadCounts();
  }, [loadCounts, examId]);

  const refreshCounts = useCallback(async () => {
    setShowProgress(true);
    await loadCounts();
  }, [loadCounts]);

  return {
    catalog,
    mode,
    setMode,
    unitId,
    setUnitId,
    topicId,
    setTopicId,
    subtopicId,
    setSubtopicId,
    testId,
    setTestId,
    partName,
    setPartName,
    sectionName,
    setSectionName,
    test,
    pattern,
    part,
    section,
    topics,
    topic,
    subtopics,
    savedCount,
    sectionCounts,
    countLoading,
    countsReady,
    showProgress,
    refreshCounts,
  };
}

export type ExtractorDestination = ReturnType<typeof useExtractorDestination>;
