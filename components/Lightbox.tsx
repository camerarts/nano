import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface LightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (imageUrl) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scrolling when lightbox is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-white p-2 hover:bg-white/20 transition-colors border-2 border-transparent hover:border-white rounded-none"
      >
        <X size={32} />
      </button>
      
      <div 
        className="relative max-w-[95vw] max-h-[90vh]" 
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Fullscreen Preview" 
          className="max-w-full max-h-[90vh] object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-white/10"
        />
      </div>
    </div>
  );
};
