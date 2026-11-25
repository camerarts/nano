import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Upload, X, Move, ZoomIn, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
  label: string;
  onImageChange?: (hasImage: boolean) => void;
  isActive?: boolean;
  onClick?: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
  aspectClass?: string;
  /** true = 显示框和导出都跟随上传图片的自然比例，不裁切不拉伸 */
  preserveAspect?: boolean;
  /** 保留比例时，显示框允许的最大高度（px）；超出则等比缩小显示，不影响导出比例 */
  maxPreviewHeight?: number;
}

export interface ImageCropperRef {
  /** format: jpeg(默认，高质量 0.95) / png(无损，用于再合成时避免二次损失) */
  getResult: (format?: 'jpeg' | 'png') => Promise<string | null>;
  setImage: (dataUrl: string) => void;
}

export const ImageCropper = forwardRef<ImageCropperRef, ImageCropperProps>(({ 
  label, 
  onImageChange, 
  isActive, 
  onClick,
  canvasWidth = 640,
  canvasHeight = 720,
  aspectClass = "aspect-[8/9]",
  preserveAspect = false,
  maxPreviewHeight
}, ref) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render for layout
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepth = useRef(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出尺寸：保留原图比例时按原图分辨率导出（不缩放）；否则沿用固定画布尺寸
  const getExportSize = () => {
    if (preserveAspect && naturalSize && naturalSize.w > 0 && naturalSize.h > 0) {
      // 原图多大就导出多大，只做极端尺寸保护（长边超过 4096 时等比缩小，避免超出浏览器画布上限）
      const MAX_EDGE = 4096;
      const longest = Math.max(naturalSize.w, naturalSize.h);
      const k = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
      return {
        width: Math.max(1, Math.round(naturalSize.w * k)),
        height: Math.max(1, Math.round(naturalSize.h * k)),
      };
    }
    return { width: canvasWidth, height: canvasHeight };
  };

  useImperativeHandle(ref, () => ({
    getResult: async (format: 'jpeg' | 'png' = 'jpeg') => {
      if (!imageSrc || !imgRef.current) return null;
      
      const { width: outW, height: outH } = getExportSize();
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fill background
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, outW, outH);

      const img = imgRef.current;
      
      // Calculate draw dimensions
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = outW / outH;
      
      try {
          ctx.save();
          // Move to center of canvas
          ctx.translate(outW / 2, outH / 2);
          // Apply user transform
          ctx.translate(position.x, position.y);
          ctx.scale(scale, scale);
          
          let baseW, baseH;
          if (imgRatio > canvasRatio) {
            // Image is wider, fit height
            baseH = outH;
            baseW = baseH * imgRatio;
          } else {
            // Image is taller, fit width
            baseW = outW;
            baseH = baseW / imgRatio;
          }
          
          ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
          ctx.restore();

          // PNG 无损（中间产物再合成用），JPEG 用 0.95 高质量，尽量不损失细节
          return format === 'png'
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL('image/jpeg', 0.95);
      } catch (e) {
          console.warn("Canvas tainted, cannot crop/export image (CORS). Returning null.", e);
          return null;
      }
    },
    setImage: (dataUrl: string) => {
        handleNewImage(dataUrl);
    }
  }));

  const handleNewImage = (src: string) => {
      setImageSrc(src);
      setNaturalSize(null); // 等 onLoad 拿到新图的自然宽高
      setScale(1);
      setPosition({ x: 0, y: 0 });
      if (onImageChange) onImageChange(true);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => handleNewImage(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Drag & Drop ---
  // 只接管「拖文件 / 拖图片链接」，拖动纯文本时不亮起上传提示
  const hasDraggedPayload = (e: React.DragEvent) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    const list = Array.from(types as unknown as string[]);
    return list.includes('Files') || list.includes('text/uri-list');
  };

  const isImageLikeUrl = (raw: string) => {
    const url = raw.trim().split('\n')[0];
    if (!url) return null;
    const isImageUrl = /^data:image\//i.test(url) || /^https?:\/\/\S+\.(png|jpe?g|webp|gif|bmp|svg)(\?\S*)?$/i.test(url);
    return isImageUrl ? url : null;
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hasDraggedPayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasDraggedPayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!hasDraggedPayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragOver(false);
    if (onClick) onClick();

    const dt = e.dataTransfer;
    if (!dt) return;

    // 1) 本地图片文件（最常见）
    const files: File[] = dt.files ? Array.from(dt.files) : [];
    const file = files.find(f => f.type.startsWith('image/'));
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => handleNewImage(evt.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    // 2) 从别的网页拖过来的图片：data URL 或图片地址
    const raw = dt.getData('text/uri-list') || dt.getData('text/plain');
    const url = raw ? isImageLikeUrl(raw) : null;
    if (url) handleNewImage(url);
  };

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (onClick) onClick(); // Activate on interaction
    if (!imageSrc) return;
    setIsDragging(true);
    // Calculate drag start based on current position
    // We store the cursor position relative to the current image position
    // e.clientX is global, position.x is translate offset
    // This part is a bit tricky with React state, simplified logic:
    // Store where the mouse IS
    // On Move, calculate Delta
    (containerRef.current as any).lastMouseX = e.clientX;
    (containerRef.current as any).lastMouseY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    
    const lastX = (containerRef.current as any).lastMouseX || e.clientX;
    const lastY = (containerRef.current as any).lastMouseY || e.clientY;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    
    (containerRef.current as any).lastMouseX = e.clientX;
    (containerRef.current as any).lastMouseY = e.clientY;

    // Scale factor: export canvas size / rendered box size
    // If the box is 300px wide but represents 1280px canvas, 1px mouse move = 4.2px canvas move
    const { width: outW, height: outH } = getExportSize();
    const ratioX = outW / bounds.width;
    const ratioY = outH / bounds.height;
    
    setPosition(prev => ({
        x: prev.x + (dx * ratioX),
        y: prev.y + (dy * ratioY)
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // 双击已上传图片：还原到原始缩放与位置
  const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!imageSrc) return;
      setScale(1);
      setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    e.stopPropagation();
    
    const zoomSpeed = 0.001;
    const newScale = Math.min(Math.max(0.5, scale - e.deltaY * zoomSpeed), 5);
    setScale(newScale);
  };

  const getRenderStyle = () => {
      if (!containerRef.current) return { display: 'none' };
      const bounds = containerRef.current.getBoundingClientRect();
      
      // If bounds are 0 (hidden/animating), hide image to prevent jumping
      if (!bounds.width || !bounds.height) return { opacity: 0 };
      
      const { width: outW, height: outH } = getExportSize();
      const ratioX = bounds.width / outW;
      const ratioY = bounds.height / outH;
      
      return {
          transform: `translate(-50%, -50%) translate(${position.x * ratioX}px, ${position.y * ratioY}px) scale(${scale})`,
          left: '50%',
          top: '50%',
          position: 'absolute' as 'absolute',
          width: '100%',
          height: '100%',
          // 保留原图比例时容器比例已与图片一致，contain 保证不裁切；固定画布模式仍用 cover
          objectFit: preserveAspect ? 'contain' as 'contain' : 'cover' as 'cover',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none' as 'none',
          opacity: 1
      };
  };

  // ResizeObserver to handle modal animations showing the container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
        setRenderTrigger(prev => prev + 1);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 显示框尺寸：保留原图比例时按图片自然宽高比；高度超过上限则等比缩小并居中（导出仍按原比例）
  const getBoxStyle = (): React.CSSProperties | undefined => {
      if (!preserveAspect || !naturalSize) return undefined;
      const ratio = naturalSize.w / naturalSize.h;
      const base: React.CSSProperties = { aspectRatio: `${naturalSize.w} / ${naturalSize.h}` };
      if (!maxPreviewHeight) return base;

      // 用父容器的宽度算可用空间，避免被自己缩小后的宽度影响导致来回抖动
      const parentW = containerRef.current?.parentElement?.getBoundingClientRect().width || 0;
      if (parentW > 0 && parentW / ratio > maxPreviewHeight) {
          const h = maxPreviewHeight;
          return {
              ...base,
              width: Math.max(1, Math.round(h * ratio)),
              height: h,
              marginLeft: 'auto',
              marginRight: 'auto',
          };
      }
      return base;
  };

  return (
    <div className="flex flex-col gap-1 w-full group/cropper">
        <div 
            className={`flex justify-between items-center px-2 py-1 cursor-pointer transition-colors select-none ${isActive ? 'bg-green-400 text-black shadow-neo-sm' : 'hover:bg-gray-100'}`}
            onClick={(e) => { e.stopPropagation(); if(onClick) onClick(); }}
        >
            <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-black' : 'text-gray-500'}`}>{label}</span>
            {imageSrc && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setImageSrc(null); setNaturalSize(null); if (onImageChange) onImageChange(false); }}
                  className="text-xs flex items-center gap-1 text-red-500 hover:text-white hover:bg-red-500 px-1 rounded"
                >
                    <X size={12}/>
                </button>
            )}
        </div>

        <div 
            ref={containerRef}
            tabIndex={0}
            className={`w-full ${preserveAspect && naturalSize ? '' : aspectClass} border-2 border-dashed relative overflow-hidden outline-none transition-[border-color,background-color] duration-150 ${isDragOver ? 'border-solid border-blue-500 bg-blue-50 ring-2 ring-blue-300' : isActive ? 'border-green-500 ring-2 ring-green-200 bg-gray-50' : 'border-black bg-gray-50 focus:border-banana-yellow'} ${!imageSrc && !isDragOver ? 'cursor-pointer hover:bg-yellow-50' : ''}`}
            style={getBoxStyle()}
            onClick={(e) => { 
                if(onClick) onClick();
                if(!imageSrc) fileInputRef.current?.click();
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleUpload} 
                className="hidden" 
            />

            {!imageSrc ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                    <Upload size={24} className={`mb-2 ${isActive ? 'text-green-500' : ''}`}/>
                    <span className={`text-xs font-bold ${isActive ? 'text-green-600' : ''}`}>Click to Upload</span>
                    <span className="text-[10px]">or Paste (Ctrl+V)</span>
                    <span className="text-[10px]">or Drop image here</span>
                </div>
            ) : (
                <>
                    <img 
                        ref={imgRef}
                        src={imageSrc} 
                        alt="Crop Preview" 
                        draggable={false}
                        // Removed crossOrigin to fix preview visibility. 
                        // Note: This may taint canvas if saving without CORS, handled in getResult
                        style={getRenderStyle()}
                        onDoubleClick={handleDoubleClick}
                        onLoad={(e) => {
                            const loaded = e.currentTarget;
                            if (preserveAspect && loaded.naturalWidth && loaded.naturalHeight) {
                                setNaturalSize({ w: loaded.naturalWidth, h: loaded.naturalHeight });
                            }
                            setRenderTrigger(prev => prev + 1);
                        }}
                    />
                    
                    {/* Overlay Hints */}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded hover-reveal opacity-0 group-hover/cropper:opacity-100 transition-opacity duration-200 pointer-events-none flex gap-2">
                         <span className="flex items-center gap-1"><Move size={10}/> Drag</span>
                         <span className="flex items-center gap-1"><ZoomIn size={10}/> Scroll</span>
                         <span className="flex items-center gap-1"><RotateCcw size={10}/> 双击还原</span>
                    </div>
                </>
            )}

            {/* 拖拽悬停提示：松手即替换当前图片 */}
            {isDragOver && (
                <div className="absolute inset-0 z-20 bg-blue-500/85 text-white flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <Upload size={22} />
                    <span className="text-xs font-bold">松手即上传</span>
                    <span className="text-[10px] opacity-80">Drop to upload</span>
                </div>
            )}
        </div>
    </div>
  );
});
