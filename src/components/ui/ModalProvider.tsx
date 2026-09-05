import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Input } from './Field';

export type ModalVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertOptions {
  title?: string;
  confirmText?: string;
  variant?: ModalVariant;
}

interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
}

interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
}

interface ModalContextValue {
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  showPrompt: (message: string, options?: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const DEFAULT_TITLES: Record<ModalVariant, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Please Confirm',
  info: 'Notice',
};

const VARIANT_ICON: Record<ModalVariant, ReactNode> = {
  success: <CheckCircle2 className="size-6" />,
  error: <XCircle className="size-6" />,
  warning: <AlertTriangle className="size-6" />,
  info: <Info className="size-6" />,
};

const VARIANT_ICON_WRAP: Record<ModalVariant, string> = {
  success: 'bg-success-soft text-success-600',
  error: 'bg-danger-soft text-danger-600',
  warning: 'bg-warning-soft text-warning-text',
  info: 'bg-blue-50 text-info-600',
};

type ModalState =
  | {
      type: 'confirm';
      message: string;
      title: string;
      variant: ModalVariant;
      confirmText: string;
      cancelText: string;
      resolve: (v: boolean) => void;
    }
  | {
      type: 'prompt';
      message: string;
      title: string;
      variant: ModalVariant;
      confirmText: string;
      cancelText: string;
      placeholder: string;
      resolve: (v: string | null) => void;
    };

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const close = useCallback((result: unknown) => {
    setModalState((prev) => {
      if (prev) (prev.resolve as (v: unknown) => void)(result);
      return null;
    });
  }, []);

  const showConfirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      const variant = options.variant || 'warning';
      setModalState({
        type: 'confirm',
        message,
        title: options.title || DEFAULT_TITLES[variant],
        variant,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        resolve,
      });
    });
  }, []);

  const showPrompt = useCallback((message: string, options: PromptOptions = {}) => {
    return new Promise<string | null>((resolve) => {
      const variant = options.variant || 'info';
      setPromptValue(options.defaultValue || '');
      setModalState({
        type: 'prompt',
        message,
        title: options.title || 'Input Required',
        variant,
        placeholder: options.placeholder || '',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        resolve,
      });
    });
  }, []);

  const contextValue = useMemo(() => ({ showConfirm, showPrompt }), [showConfirm, showPrompt]);

  const closeValue = modalState?.type === 'confirm' ? false : null;

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <Modal open={!!modalState} onClose={() => close(closeValue)} size="sm" showCloseButton={false}>
        {modalState && (
          <div className="flex flex-col items-center text-center">
            <div className={['mb-4 flex size-12 items-center justify-center rounded-full', VARIANT_ICON_WRAP[modalState.variant]].join(' ')}>
              {VARIANT_ICON[modalState.variant]}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{modalState.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-500">{modalState.message}</p>

            {modalState.type === 'prompt' && (
              <Input
                autoFocus
                value={promptValue}
                placeholder={modalState.placeholder}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') close(promptValue);
                }}
                wrapperClassName="mt-4 w-full"
              />
            )}

            <div className="mt-6 flex w-full items-center justify-center gap-3">
              {modalState.type === 'confirm' && (
                <>
                  <Button variant="secondary" className="w-full" onClick={() => close(false)}>
                    {modalState.cancelText}
                  </Button>
                  <Button
                    variant={modalState.variant === 'error' ? 'danger' : 'primary'}
                    className="w-full"
                    autoFocus
                    onClick={() => close(true)}
                  >
                    {modalState.confirmText}
                  </Button>
                </>
              )}
              {modalState.type === 'prompt' && (
                <>
                  <Button variant="secondary" className="w-full" onClick={() => close(null)}>
                    {modalState.cancelText}
                  </Button>
                  <Button variant="primary" className="w-full" onClick={() => close(promptValue)}>
                    {modalState.confirmText}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return ctx;
}
