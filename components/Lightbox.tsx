import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface LightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

// 退出动画时长，需与 index.css 中 --dur-fast 保持一致
const EXIT_MS = 140;

export const Lightbox: React.FC<LightboxProps> = ({ imageUrl, onClose }) => {
  // 关闭时保留最后一张图播放退出动画，再卸载
  const [shownUrl, setShownUrl] = useState<string | null>(imageUrl);
  const [loaded, setLoaded] = useState(false);
  const isOpen = !!imageUrl;

  useEffect(() => {
    if (imageUrl) {
      if (imageUrl !== shownUrl) setLoaded(false);
      setShownUrl(imageUrl);
      return;
    }
    const t = window.setTimeout(() => setShownUrl(null), EXIT_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    // 锁定背景滚动；关闭时恢复原值（而不是强写 auto）
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!shownUrl) return null;
  const state = isOpen ? 'open' : 'closed';

  // 去掉 backdrop-blur：底色已 95% 不透明，模糊看不出来却很耗性能
  return (
    <div
      data-state={state}
      className="motion-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 z-10 text-white p-2 hover:bg-white/20 transition-colors duration-150 border-2 border-transparent hover:border-white rounded-none"
      >
        <X size={32} />
      </button>

      <div
        data-state={state}
        className="motion-panel relative max-w-[95vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图片解码完成前透明，避免逐行刷出的闪烁 */}
        <img
          src={shownUrl}
          alt="Fullscreen Preview"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity var(--dur-base) var(--ease-out)' }}
          className="max-w-full max-h-[90vh] object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-white/10"
        />
      </div>
    </div>
  );
};
