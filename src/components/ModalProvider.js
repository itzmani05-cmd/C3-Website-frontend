import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';

const ModalContext = createContext(null);

// Kept in sync with Modal's CLOSE_ANIMATION_MS so content isn't cleared
// before the exit transition finishes playing.
const CLOSE_ANIMATION_MS = 220;

const DEFAULT_TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Please Confirm',
  info: 'Notice'
};

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const clearTimerRef = useRef(null);

  const closeModal = useCallback((result) => {
    setIsOpen(false);
    setModalState((prev) => {
      prev?.resolve?.(result);
      return prev;
    });
    clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setModalState(null), CLOSE_ANIMATION_MS);
  }, []);

  const openModal = useCallback((state) => {
    clearTimeout(clearTimerRef.current);
    setModalState(state);
    setIsOpen(true);
  }, []);

  const showAlert = useCallback(
    (message, options = {}) => {
      return new Promise((resolve) => {
        const variant = options.variant || 'info';
        openModal({
          type: 'alert',
          message,
          title: options.title || DEFAULT_TITLES[variant],
          variant,
          confirmText: options.confirmText || 'OK',
          closeValue: undefined,
          resolve
        });
      });
    },
    [openModal]
  );

  const showConfirm = useCallback(
    (message, options = {}) => {
      return new Promise((resolve) => {
        const variant = options.variant || 'warning';
        openModal({
          type: 'confirm',
          message,
          title: options.title || DEFAULT_TITLES[variant] || 'Please Confirm',
          variant,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          closeValue: false,
          resolve
        });
      });
    },
    [openModal]
  );

  const showPrompt = useCallback(
    (message, options = {}) => {
      return new Promise((resolve) => {
        const variant = options.variant || 'info';
        setPromptValue(options.defaultValue || '');
        openModal({
          type: 'prompt',
          message,
          title: options.title || 'Input Required',
          variant,
          placeholder: options.placeholder || '',
          confirmText: options.confirmText || 'OK',
          cancelText: options.cancelText || 'Cancel',
          closeValue: null,
          resolve
        });
      });
    },
    [openModal]
  );

  let actions = null;
  let promptField = null;

  if (modalState) {
    if (modalState.type === 'alert') {
      actions = [
        { label: modalState.confirmText, className: 'btn-primary', autoFocus: true, onClick: () => closeModal(undefined) }
      ];
    } else if (modalState.type === 'confirm') {
      actions = [
        { label: modalState.cancelText, className: 'btn-secondary', onClick: () => closeModal(false) },
        {
          label: modalState.confirmText,
          className: modalState.variant === 'error' ? 'btn-danger' : 'btn-primary',
          autoFocus: true,
          onClick: () => closeModal(true)
        }
      ];
    } else if (modalState.type === 'prompt') {
      actions = [
        { label: modalState.cancelText, className: 'btn-secondary', onClick: () => closeModal(null) },
        { label: modalState.confirmText, className: 'btn-primary', onClick: () => closeModal(promptValue) }
      ];
      promptField = (
        <input
          type="text"
          className="app-modal-input"
          value={promptValue}
          placeholder={modalState.placeholder}
          onChange={(e) => setPromptValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') closeModal(promptValue);
          }}
        />
      );
    }
  }

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      <Modal
        isOpen={isOpen}
        onClose={() => closeModal(modalState?.closeValue)}
        title={modalState?.title}
        message={modalState?.message}
        variant={modalState?.variant}
        actions={actions}
      >
        {promptField}
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return ctx;
}
