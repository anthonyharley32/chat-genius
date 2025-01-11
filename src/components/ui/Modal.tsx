'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/20" 
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
      >
        <div 
          className="bg-white rounded-lg shadow-2xl pointer-events-auto max-h-[80vh] overflow-y-auto w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );

  // Create portal to render modal at the root level
  return createPortal(
    modalContent,
    document.body
  );
} 