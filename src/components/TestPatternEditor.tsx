import { Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import { Input } from './ui/Field';
import type { TestPatternPart } from '../types/models';

export const genKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const buildGatePattern = (): TestPatternPart[] => [
  {
    key: genKey(),
    name: 'Part A - General Aptitude',
    sections: [
      { key: genKey(), name: '1 Mark Questions', numQuestions: 5, marksPerQuestion: 1, negativeMarkFraction: 1 / 3 },
      { key: genKey(), name: '2 Mark Questions', numQuestions: 5, marksPerQuestion: 2, negativeMarkFraction: 2 / 3 },
    ],
  },
  {
    key: genKey(),
    name: 'Part B - Technical',
    sections: [
      { key: genKey(), name: '1 Mark Questions', numQuestions: 25, marksPerQuestion: 1, negativeMarkFraction: 1 / 3 },
      { key: genKey(), name: '2 Mark Questions', numQuestions: 30, marksPerQuestion: 2, negativeMarkFraction: 2 / 3 },
    ],
  },
];

interface TestPatternEditorProps {
  pattern: TestPatternPart[];
  onChange: (pattern: TestPatternPart[]) => void;
}

export default function TestPatternEditor({ pattern, onChange }: TestPatternEditorProps) {
  const totalQuestions = pattern.reduce((sum, p) => sum + p.sections.reduce((s, sec) => s + (sec.numQuestions || 0), 0), 0);
  const totalMarks = pattern.reduce(
    (sum, p) => sum + p.sections.reduce((s, sec) => s + (sec.numQuestions || 0) * (sec.marksPerQuestion || 0), 0),
    0
  );

  const updatePart = (partIdx: number, updater: (part: TestPatternPart) => TestPatternPart) => {
    onChange(pattern.map((p, idx) => (idx === partIdx ? updater(p) : p)));
  };

  const addPart = () => {
    onChange([
      ...pattern,
      {
        key: genKey(),
        name: `Part ${String.fromCharCode(65 + pattern.length)}`,
        sections: [{ key: genKey(), name: '1 Mark Questions', numQuestions: 1, marksPerQuestion: 1, negativeMarkFraction: 0 }],
      },
    ]);
  };

  const removePart = (partIdx: number) => {
    onChange(pattern.filter((_, idx) => idx !== partIdx));
  };

  const addSection = (partIdx: number) => {
    updatePart(partIdx, (part) => ({
      ...part,
      sections: [...part.sections, { key: genKey(), name: '', numQuestions: 1, marksPerQuestion: 1, negativeMarkFraction: 0 }],
    }));
  };

  const removeSection = (partIdx: number, sectionIdx: number) => {
    updatePart(partIdx, (part) => ({ ...part, sections: part.sections.filter((_, idx) => idx !== sectionIdx) }));
  };

  const updateSection = (partIdx: number, sectionIdx: number, field: 'name' | 'numQuestions' | 'marksPerQuestion' | 'negativeMarkFractionPct', value: string) => {
    updatePart(partIdx, (part) => ({
      ...part,
      sections: part.sections.map((sec, idx) => {
        if (idx !== sectionIdx) return sec;
        if (field === 'name') return { ...sec, name: value };
        if (field === 'numQuestions') return { ...sec, numQuestions: Math.max(0, Number(value) || 0) };
        if (field === 'marksPerQuestion') return { ...sec, marksPerQuestion: Math.max(0, Number(value) || 0) };
        return { ...sec, negativeMarkFraction: Math.min(1, Math.max(0, (Number(value) || 0) / 100)) };
      }),
    }));
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parts &amp; sections</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {totalQuestions} questions &middot; {totalMarks} marks
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange(buildGatePattern())}>
            Load GATE pattern
          </Button>
        </div>
      </div>

      {pattern.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          No parts yet. Add one manually or load the GATE preset (Part A: aptitude 5&times;1 + 5&times;2 marks, Part B: technical 25&times;1 + 30&times;2 marks).
        </p>
      )}

      {pattern.map((part, partIdx) => (
        <div key={part.key || partIdx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <Input
              value={part.name}
              onChange={(e) => updatePart(partIdx, (p) => ({ ...p, name: e.target.value }))}
              placeholder="Part name (e.g. Part A - General Aptitude)"
              wrapperClassName="flex-1"
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => removePart(partIdx)} className="text-danger-600 hover:bg-danger-50" aria-label="Remove part">
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {part.sections.map((section, sectionIdx) => (
              <div key={section.key || sectionIdx} className="grid grid-cols-2 gap-2 rounded-lg bg-white p-2.5 sm:grid-cols-5 sm:items-end">
                <Input
                  label="Section name"
                  value={section.name}
                  onChange={(e) => updateSection(partIdx, sectionIdx, 'name', e.target.value)}
                  placeholder="1 Mark Questions"
                  wrapperClassName="col-span-2 sm:col-span-2"
                />
                <Input
                  label="Questions"
                  type="number"
                  min={0}
                  value={section.numQuestions}
                  onChange={(e) => updateSection(partIdx, sectionIdx, 'numQuestions', e.target.value)}
                />
                <Input
                  label="Marks / Q"
                  type="number"
                  min={0}
                  step="0.5"
                  value={section.marksPerQuestion}
                  onChange={(e) => updateSection(partIdx, sectionIdx, 'marksPerQuestion', e.target.value)}
                />
                <div className="flex items-end gap-1.5">
                  <Input
                    label="Negative %"
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(section.negativeMarkFraction * 100)}
                    onChange={(e) => updateSection(partIdx, sectionIdx, 'negativeMarkFractionPct', e.target.value)}
                    wrapperClassName="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSection(partIdx, sectionIdx)}
                    className="text-danger-600 hover:bg-danger-50"
                    aria-label="Remove section"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" size="sm" variant="secondary" className="mt-2.5" onClick={() => addSection(partIdx)} icon={<Plus className="size-3.5" />}>
            Add section
          </Button>
        </div>
      ))}

      <Button type="button" size="sm" variant="secondary" onClick={addPart} icon={<Plus className="size-3.5" />} className="self-start">
        Add part
      </Button>
    </div>
  );
}
