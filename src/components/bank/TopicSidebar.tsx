import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree } from 'lucide-react';
import type { CurriculumTree } from '../../types/models';

interface TopicSidebarProps {
  curriculum: CurriculumTree;
  counts: Record<string, number>;
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
}

export default function TopicSidebar({ curriculum, counts, selectedTopicId, onSelectTopic }: TopicSidebarProps) {
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

  const toggle = (unitId: string) => setOpen((prev) => (prev.has(unitId) ? new Set() : new Set([unitId])));

  return (
    <nav aria-label="Units and topics" className="flex flex-col gap-0">
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
                onClick={() => toggle(unit._id)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => toggle(unit._id)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 pr-2 text-left text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 pr-2 text-left text-xs font-semibold text-slate-700 hover:text-slate-900">{unit.name}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{total}</span>
              </button>
            </div>
            {isOpen && (
              <ul className="ml-4 border-l border-slate-200 pl-2">
                {unit.topics.map((topic) => {
                  const active = topic._id === selectedTopicId;
                  return (
                    <li key={topic._id}>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => onSelectTopic(topic._id)}
                        className={[
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-left text-[13px] transition-colors',
                          active ? 'bg-brand-600 font-semibold text-white shadow-soft-sm' : 'text-slate-600 hover:bg-slate-100',
                        ].join(' ')}
                      >
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-left text-xs transition-colors">
                          {topic.name}
                        </span>
                        <span
                          className={[
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                            active ? 'bg-white/20 text-white' : (counts[topic._id] ?? 0) === 0 ? 'text-slate-300' : 'bg-slate-100 text-slate-500',
                          ].join(' ')}
                        >
                          {counts[topic._id] ?? 0}
                        </span>
                      </button>
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
