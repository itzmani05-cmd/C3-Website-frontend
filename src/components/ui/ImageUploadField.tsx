import type { ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api';
import { fileToBase64, getImagePreview } from '../../lib/helpers';

const MAX_IMAGE_BYTES = 150 * 1024; // 150KB — keep in sync with backend/routes/questions.js

interface ImageUploadFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  compact?: boolean;
}

export default function ImageUploadField({ label, value, onChange, compact = false }: ImageUploadFieldProps) {
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image is too large (${Math.round(file.size / 1024)}KB). Maximum allowed size is 150KB.`);
      e.target.value = '';
      return;
    }

    try {
      const base64Image = await fileToBase64(file);
      const response = await api.post('/api/questions/upload', { image: base64Image });
      onChange(response.data.imageUrl);
    } catch (error: any) {
      toast.error('Image upload failed: ' + error.message);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600 hover:file:bg-slate-200"
      />
      {value && (
        <div className="relative mt-2 inline-block">
          <img
            src={getImagePreview(value) ?? undefined}
            alt={label}
            className={compact ? 'h-16 w-16 rounded-md border border-slate-200 object-cover' : 'max-h-40 rounded-lg border border-slate-200 object-contain'}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
            className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-danger-600 text-white shadow-sm hover:bg-danger-700"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
