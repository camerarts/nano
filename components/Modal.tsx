import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white border-2 border-black shadow-neo animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b-2 border-black p-4 bg-banana-yellow">
          <h2 className="text-xl font-bold uppercase tracking-wider">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black rounded-none">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};