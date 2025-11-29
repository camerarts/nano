import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Upload, X, Move, ZoomIn } from 'lucide-react';

interface ImageCropperProps {
  label: string;
  onImageChange?: (hasImage: boolean) => void;
  isActive?: boolean;
  onClick?: () => void;
}

export interface ImageCropperRef {
  getResult: () => Promise<string | null>;
  setImage: (dataUrl: string) => void;
}

export const ImageCropper = forwardRef<ImageCropperRef, ImageCropperProps>(({ label, onImageChange, isActive, onClick }, ref) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Internal canvas resolution (8:9 vertical for split view)
  const CANVAS_WIDTH = 640;
  const CANVAS_HEIGHT = 720;

  useImperativeHandle(ref, () => ({
    getResult: async () => {
      if (!imageSrc || !imgRef.current) return null;
      
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fill background
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const img = imgRef.current;
      
      // Calculate draw dimensions
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      
      ctx.save();
      // Move to center of canvas
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      // Apply user transform
      ctx.translate(position.x, position.y);
      ctx.scale(scale, scale);
      
      let baseW, baseH;
      if (imgRatio > canvasRatio) {
        // Image is wider, fit height
        baseH = CANVAS_HEIGHT;
        baseW = baseH * imgRatio;
      } else {
        // Image is taller, fit width
        baseW = CANVAS_WIDTH;
        baseH = baseW / imgRatio;
      }
      
      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();

      return canvas.toDataURL('image/jpeg', 0.9);
    },
    setImage: (dataUrl: string) => {
        handleNewImage(dataUrl);
    }
  }));

  const handleNewImage = (src: string) => {
      setImageSrc(src);
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

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (onClick) onClick(); // Activate on interaction
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    
    // Scale factor: canvasWidth / renderedWidth
    const ratio = CANVAS_WIDTH / bounds.width;
    
    const dx = e.movementX;
    const dy = e.movementY;
    
    setPosition(prev => ({
        x: prev.x + (dx * ratio),
        y: prev.y + (dy * ratio)
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    e.stopPropagation();
    
    const zoomSpeed = 0.001;
    const newScale = Math.min(Math.max(0.5, scale - e.deltaY * zoomSpeed), 5);
    setScale(newScale);
  };

  const getRenderStyle = () => {
      if (!containerRef.current) return {};
      const bounds = containerRef.current.getBoundingClientRect();
      const ratio = bounds.width / CANVAS_WIDTH; 
      
      return {
          transform: `translate(-50%, -50%) translate(${position.x * ratio}px, ${position.y * ratio}px) scale(${scale})`,
          left: '50%',
          top: '50%',
          position: 'absolute' as 'absolute',
          minWidth: '100%',
          minHeight: '100%',
          objectFit: 'cover' as 'cover',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none' as 'none',
      };
  };

  const [renderTrigger, setRenderTrigger] = useState(0);
  useEffect(() => {
      const handleResize = () => setRenderTrigger(prev => prev + 1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col gap-1 w-full group/cropper">
        <div 
            className={`flex justify-between items-center px-2 py-1 cursor-pointer transition-colors select-none ${isActive ? 'bg-green-400 text-black shadow-neo-sm' : 'hover:bg-gray-100'}`}
            onClick={(e) => { e.stopPropagation(); if(onClick) onClick(); }}
        >
            <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-black' : 'text-gray-500'}`}>{label}</span>
            {imageSrc && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setImageSrc(null); if (onImageChange) onImageChange(false); }}
                  className="text-xs flex items-center gap-1 text-red-500 hover:text-white hover:bg-red-500 px-1 rounded"
                >
                    <X size={12}/>
                </button>
            )}
        </div>

        <div 
            ref={containerRef}
            tabIndex={0}
            className={`w-full aspect-[8/9] border-2 border-black border-dashed relative overflow-hidden bg-gray-50 outline-none transition-all ${isActive ? 'border-green-500 ring-2 ring-green-200' : 'focus:border-banana-yellow'} ${!imageSrc ? 'cursor-pointer hover:bg-yellow-50' : ''}`}
            onClick={(e) => { 
                if(onClick) onClick();
                if(!imageSrc) fileInputRef.current?.click();
            }}
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
                </div>
            ) : (
                <>
                    <img 
                        ref={imgRef}
                        src={imageSrc} 
                        alt="Crop Preview" 
                        draggable={false}
                        style={getRenderStyle()}
                    />
                    
                    {/* Overlay Hints */}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/cropper:opacity-100 transition-opacity pointer-events-none flex gap-2">
                         <span className="flex items-center gap-1"><Move size={10}/> Drag</span>
                         <span className="flex items-center gap-1"><ZoomIn size={10}/> Scroll</span>
                    </div>
                </>
            )}
        </div>
    </div>
  );
});
