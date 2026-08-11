import { Textarea } from './ui/Field';
import { Select } from './ui/Field';
import ImageUploadField from './ui/ImageUploadField';
import { normalizeCorrectAnswer } from '../lib/helpers';
import type { OptionKey, QuestionOptionImages, QuestionOptions } from '../types/models';

export interface QuestionFormValue {
  question?: string;
  questionImage?: string | null;
  options?: Partial<QuestionOptions>;
  optionImages?: QuestionOptionImages;
  correct_answer?: string;
  explanation?: string;
  explanationImage?: string | null;
}

interface QuestionFormProps<T extends QuestionFormValue> {
  question: T;
  onChange: (question: T) => void;
  variant?: 'extractor' | 'fixer';
}

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

export default function QuestionForm<T extends QuestionFormValue>({ question, onChange, variant = 'extractor' }: QuestionFormProps<T>) {
  const handleFieldChange = (field: keyof QuestionFormValue, value: unknown) => {
    onChange({ ...question, [field]: value });
  };

  const handleOptionChange = (opt: OptionKey, value: string) => {
    onChange({ ...question, options: { ...question.options, [opt]: value } });
  };

  const isFixer = variant === 'fixer';
  const sectionClassName = isFixer ? 'rounded-2xl border border-slate-200 bg-slate-50/60 p-5' : 'rounded-2xl border border-slate-100 bg-white p-5';

  return (
    <div className={isFixer ? 'flex flex-col gap-5' : 'flex flex-col gap-5 border-t border-slate-100 pt-5'}>
      <div className={sectionClassName}>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Question</h4>
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Question Text</label>
          <Textarea value={question.question || ''} onChange={(e) => handleFieldChange('question', e.target.value)} rows={3} />
        </div>
        <ImageUploadField
          label="Question Image (Optional)"
          value={question.questionImage}
          onChange={(url) => handleFieldChange('questionImage', url)}
        />
      </div>

      <div className={sectionClassName}>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Options</h4>
        <div className="flex flex-col gap-4">
          {OPTION_KEYS.map((opt) => (
            <div key={opt} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Option {opt.toUpperCase()}</label>
                <input
                  value={question.options?.[opt] || ''}
                  onChange={(e) => handleOptionChange(opt, e.target.value)}
                  placeholder={isFixer ? `Option ${opt.toUpperCase()} text` : undefined}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <ImageUploadField
                label="Image"
                compact
                value={question.optionImages?.[opt]}
                onChange={(url) =>
                  onChange({ ...question, optionImages: { ...question.optionImages, [opt]: url } })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className={isFixer ? 'my-2' : ''}>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correct Answer</label>
        <Select
          value={normalizeCorrectAnswer(question.correct_answer)}
          onChange={(e) => handleFieldChange('correct_answer', e.target.value)}
          wrapperClassName="w-32"
        >
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
          <option value="d">D</option>
        </Select>
      </div>

      <div className={sectionClassName}>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Explanation</h4>
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Explanation Text</label>
          <Textarea
            value={question.explanation || ''}
            onChange={(e) => handleFieldChange('explanation', e.target.value)}
            rows={isFixer ? 3 : 4}
            placeholder={isFixer ? 'Explanation...' : 'Enter detailed explanation here...'}
          />
        </div>
        <ImageUploadField
          label="Explanation Image (Optional)"
          value={question.explanationImage}
          onChange={(url) => handleFieldChange('explanationImage', url)}
        />
      </div>
    </div>
  );
}
