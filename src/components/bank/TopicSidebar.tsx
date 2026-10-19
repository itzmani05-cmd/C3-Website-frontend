import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree } from 'lucide-react';
import type { CurriculumTree } from '../../types/models';

interface TopicSidebarProps {
  curriculum: CurriculumTree;
  counts: Record<string, number>;
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  /** Hide the per-topic question counts (for pages that don't load them). */
  hideCounts?: boolean;
  /** When given, each topic's subtopics are listed beneath it and can be picked individually. */
  onSelectSubtopic?: (topicId: string, subtopicId: string) => void;
  selectedSubtopicId?: string;
}

/** The sidebar card that scrolls on its own (never the page's <main>, which pages scroll deliberately). */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node && node.tagName !== 'MAIN'; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

export default function TopicSidebar({ curriculum, counts, selectedTopicId, onSelectTopic, hideCounts = false, onSelectSubtopic, selectedSubtopicId = '' }: TopicSidebarProps) {
  const unitOfSelected = useMemo(
    () => curriculum.find((u) => u.topics.some((t) => t._id === selectedTopicId))?._id,
    [curriculum, selectedTopicId]
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set(unitOfSelected ? [unitOfSelected] : []));

  // One unit open at a time keeps the tree short enough to fit the screen. Selecting a topic (including via
  // next/previous topic or the URL) opens its unit and closes the others.
  useEffect(() => {
    if (unitOfSelected) setOpen(new Set([unitOfSelected]));
  }, [unitOfSelected]);

  // Opening a unit closes the others and picking a topic reloads the list beside the tree. Either one changes the
  // tree's height, which would otherwise throw its scroll position back to the top: keep the clicked row where it was.
  const navRef = useRef<HTMLElement>(null);
  const anchor = useRef<{ el: HTMLElement; top: number } | null>(null);
  const holdPosition = (el: HTMLElement) => {
    anchor.current = { el, top: el.getBoundingClientRect().top };
  };
  useLayoutEffect(() => {
    const held = anchor.current;
    const parent = scrollParent(navRef.current);
    if (!held || !parent) return;
    const apply = () => {
      if (held.el.isConnected) parent.scrollTop += held.el.getBoundingClientRect().top - held.top;
    };
    apply();
    // The page lays out again when the new questions arrive; hold the position through that too.
    const frame = requestAnimationFrame(apply);
    const timer = setTimeout(() => {
      apply();
      anchor.current = null;
    }, 400);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open, selectedTopicId, selectedSubtopicId]);

  const toggle = (unitId: string, el: HTMLElement) => {
    holdPosition(el);
    setOpen((prev) => (prev.has(unitId) ? new Set() : new Set([unitId])));
  };

  return (
    <nav ref={navRef} aria-label="Units and topics" className="flex flex-col gap-0">
      {curriculum.map((unit) => {
        const total = unit.topics.reduce((sum, t) => sum + (counts[t._id] ?? 0), 0);
        const isOpen = open.has(unit._id);
        return (
          <div key={unit._id}>
            <div className="flex items-center rounded-lg">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${unit.name}`}
                onClick={(e) => toggle(unit._id, e.currentTarget)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <button
                type="button"
                onClick={(e) => toggle(unit._id, e.currentTarget)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 pr-2 text-left text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 pr-2 text-left text-xs font-semibold text-slate-700 hover:text-slate-900">{unit.name}</span>
                {!hideCounts && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{total}</span>}
              </button>
            </div>
            {isOpen && (
              <ul className="ml-4 border-l border-slate-200 pl-2">
                {unit.topics.map((topic) => {
                  const subtopics = onSelectSubtopic ? topic.subtopics ?? [] : [];
                  const topicSelected = topic._id === selectedTopicId;
                  const active = topicSelected && (subtopics.length === 0 || !selectedSubtopicId);
                  return (
                    <li key={topic._id}>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={(e) => {
                          holdPosition(e.currentTarget);
                          onSelectTopic(topic._id);
                        }}
                        className={[
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-left text-[13px] transition-colors',
                          active ? 'bg-brand-600 font-semibold text-white shadow-soft-sm' : 'text-slate-600 hover:bg-slate-100',
                        ].join(' ')}
                      >
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-left text-xs transition-colors">
                          {topic.name}
                        </span>
                        {!hideCounts && <span
                          className={[
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                            active ? 'bg-white/20 text-white' : (counts[topic._id] ?? 0) === 0 ? 'text-slate-300' : 'bg-slate-100 text-slate-500',
                          ].join(' ')}
                        >
                          {counts[topic._id] ?? 0}
                        </span>}
                      </button>
                      {subtopics.length > 0 && (
                        <ul className="mb-1 ml-3 border-l border-slate-200 pl-2">
                          {subtopics.map((sub) => {
                            const subActive = topicSelected && selectedSubtopicId === sub._id;
                            return (
                              <li key={sub._id}>
                                <button
                                  type="button"
                                  aria-current={subActive ? 'true' : undefined}
                                  onClick={(e) => {
                                    holdPosition(e.currentTarget);
                                    onSelectSubtopic?.(topic._id, sub._id);
                                  }}
                                  className={[
                                    'w-full rounded-lg px-2.5 py-1 text-left text-xs transition-colors',
                                    subActive ? 'bg-brand-600 font-semibold text-white shadow-soft-sm' : 'text-slate-500 hover:bg-slate-100',
                                  ].join(' ')}
                                >
                                  {sub.name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {unit.topics.length === 0 && <li className="px-2.5 py-1.5 text-xs text-slate-400">No topics</li>}
              </ul>
            )}
          </div>
        );
      })}
      {curriculum.length === 0 && (
        <p className="flex items-center gap-2 px-2 py-3 text-sm text-slate-400">
          <FolderTree className="size-4" /> No units yet
        </p>
      )}
    </nav>
  );
}
