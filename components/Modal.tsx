import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// 退出动画时长，需与 index.css 中 --dur-fast 保持一致
const EXIT_MS = 140;

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // 关闭时先播放退出动画再卸载，避免“啪”地消失；重新打开可随时打断退出
  const [mounted, setMounted] = useState(isOpen);
  useEffect(() => {
    if (isOpen) { setMounted(true); return; }
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  if (!mounted) return null;
  const state = isOpen ? 'open' : 'closed';

  // 去掉 backdrop-blur：全屏模糊开销大，低端机/大屏易掉帧
  // 不做“点遮罩关闭”，避免编辑表单误触丢失内容
  return (
    <div
      data-state={state}
      className="motion-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-state={state}
        className="motion-panel relative w-full max-w-lg bg-white border-2 border-black shadow-neo"
      >
        <div className="relative flex items-center justify-center border-b-2 border-black p-4 bg-banana-yellow">
          <h2 className="text-xl font-bold uppercase tracking-wider">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 p-1 hover:bg-black hover:text-white transition-colors duration-150 border-2 border-transparent hover:border-black rounded-none"
          >
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
