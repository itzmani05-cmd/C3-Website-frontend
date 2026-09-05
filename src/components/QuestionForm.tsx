import { Textarea, Select, Input } from './ui/Field';
import ImageUploadField from './ui/ImageUploadField';
import { normalizeCorrectAnswer } from '../lib/helpers';
import type { AnswerType, OptionKey, QuestionOptionImages, QuestionOptions } from '../types/models';

export interface QuestionFormValue {
  question?: string;
  questionImage?: string | null;
  options?: Partial<QuestionOptions>;
  optionImages?: QuestionOptionImages;
  correct_answer?: string | string[];
  answerType?: AnswerType;
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

  const answerType: AnswerType = question.answerType || 'single';

  const handleAnswerTypeChange = (nextType: AnswerType) => {
    let nextAnswer: string | string[];
    if (nextType === 'multiple') {
      nextAnswer = Array.isArray(question.correct_answer)
        ? question.correct_answer
        : question.correct_answer
          ? [question.correct_answer]
          : [];
    } else if (nextType === 'numerical') {
      nextAnswer = typeof question.correct_answer === 'string' ? question.correct_answer : '';
    } else {
      nextAnswer = Array.isArray(question.correct_answer) ? question.correct_answer[0] || 'a' : question.correct_answer || 'a';
    }
    onChange({ ...question, answerType: nextType, correct_answer: nextAnswer });
  };

  const handleMultiAnswerToggle = (opt: OptionKey, checked: boolean) => {
    const current = Array.isArray(question.correct_answer) ? question.correct_answer : [];
    const next = checked ? Array.from(new Set([...current, opt])) : current.filter((k) => k !== opt);
    onChange({ ...question, correct_answer: next });
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

      <div className={isFixer ? 'my-2' : ''}>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Answer Type</label>
        <Select value={answerType} onChange={(e) => handleAnswerTypeChange(e.target.value as AnswerType)} wrapperClassName="w-56">
          <option value="single">Single correct answer</option>
          <option value="multiple">Multiple correct answers</option>
          <option value="numerical">Numerical answer</option>
        </Select>
      </div>

      {answerType !== 'numerical' && (
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
      )}

      <div className={isFixer ? 'my-2' : ''}>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correct Answer</label>
        {answerType === 'single' && (
          <Select
            value={normalizeCorrectAnswer(Array.isArray(question.correct_answer) ? question.correct_answer[0] : question.correct_answer)}
            onChange={(e) => handleFieldChange('correct_answer', e.target.value)}
            wrapperClassName="w-32"
          >
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
            <option value="d">D</option>
          </Select>
        )}
        {answerType === 'multiple' && (
          <div className="flex flex-wrap gap-4">
            {OPTION_KEYS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Array.isArray(question.correct_answer) && question.correct_answer.includes(opt)}
                  onChange={(e) => handleMultiAnswerToggle(opt, e.target.checked)}
                  className="size-4 rounded border-slate-300 accent-brand-600"
                />
                {opt.toUpperCase()}
              </label>
            ))}
          </div>
        )}
        {answerType === 'numerical' && (
          <Input
            value={typeof question.correct_answer === 'string' ? question.correct_answer : ''}
            onChange={(e) => handleFieldChange('correct_answer', e.target.value)}
            placeholder="e.g. 42"
            wrapperClassName="w-40"
          />
        )}
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
