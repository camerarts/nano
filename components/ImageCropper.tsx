
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Upload, X, Move, ZoomIn } from 'lucide-react';

interface ImageCropperProps {
  label: string;
  onImageChange?: (hasImage: boolean) => void;
}

export interface ImageCropperRef {
  getResult: () => Promise<string | null>;
  setImage: (dataUrl: string) => void;
}

export const ImageCropper = forwardRef<ImageCropperRef, ImageCropperProps>(({ label, onImageChange }, ref) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Internal canvas resolution (16:9)
  const CANVAS_WIDTH = 1280;
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
      // The displayed image transform is: translate(x, y) scale(scale)
      // We need to replicate this on the canvas
      
      const drawWidth = CANVAS_WIDTH * scale;
      const drawHeight = (CANVAS_WIDTH / (img.naturalWidth / img.naturalHeight)) * scale;
      
      // Center based on image aspect ratio first (CSS object-fit: cover equivalent logic)
      // But here we rely on the user's manual positioning from the start (which we initialize to center)
      
      // Since we track position manually from the get-go, we just draw at position
      // However, we need to know the 'base' dimensions if scale was 1.
      // Our logic below initializes 'cover' fit.
      
      // Let's rely on the helper function that draws strictly based on current visual state
      // We map the container's center to canvas center
      
      ctx.save();
      // Move to center of canvas
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      // Apply user transform
      ctx.translate(position.x, position.y);
      ctx.scale(scale, scale);
      
      // Draw image centered at origin
      // We need to calculate the base size that 'covers' the canvas at scale 1
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => handleNewImage(evt.target?.result as string);
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    // Map screen pixels to canvas pixels roughly
    // The container width is responsive, so we need a multiplier
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    
    // Scale factor: 1280 / renderedWidth
    const ratio = CANVAS_WIDTH / bounds.width;
    
    // We update position directly in "Canvas Units" to make drawing easy later
    // But the movement on screen needs to feel 1:1.
    // So deltaScreen * ratio = deltaCanvas
    
    // SIMPLIFIED: Just track movement delta.
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

  // Render Logic
  // We need to project the internal state (Canvas Units) to CSS (Display Units)
  const getRenderStyle = () => {
      if (!containerRef.current) return {};
      // Assume initial render might be null, but useEffect will catch up?
      // Just use 1 for first render, it's fine.
      const bounds = containerRef.current.getBoundingClientRect();
      const ratio = bounds.width / CANVAS_WIDTH; // e.g. 0.25 if container is 320px
      
      // Image Base Size (Covering)
      // This is handled by CSS object-fit usually, but we are doing manual transform.
      // Let's just set the image width/height to "Cover" the container naturally,
      // then apply our transform (which is delta from center).
      
      return {
          transform: `translate(-50%, -50%) translate(${position.x * ratio}px, ${position.y * ratio}px) scale(${scale})`,
          // We center the image first using absolute positioning + translate(-50%,-50%)
          // Then apply our offset and scale.
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
      // Force re-render on resize to fix ratio calculations
      const handleResize = () => setRenderTrigger(prev => prev + 1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold uppercase text-gray-500">{label}</span>
            {imageSrc && (
                <button 
                  onClick={() => { setImageSrc(null); if (onImageChange) onImageChange(false); }}
                  className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600"
                >
                    <X size={12}/> Clear
                </button>
            )}
        </div>

        <div 
            ref={containerRef}
            tabIndex={0}
            onPaste={handlePaste}
            className={`w-full aspect-video border-2 border-black border-dashed relative overflow-hidden bg-gray-50 outline-none focus:border-banana-yellow transition-colors group ${!imageSrc ? 'cursor-pointer hover:bg-yellow-50' : ''}`}
            onClick={() => !imageSrc && fileInputRef.current?.click()}
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
                    <Upload size={24} className="mb-2"/>
                    <span className="text-xs font-bold">Click to Upload</span>
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
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex gap-2">
                         <span className="flex items-center gap-1"><Move size={10}/> Drag</span>
                         <span className="flex items-center gap-1"><ZoomIn size={10}/> Scroll</span>
                    </div>
                </>
            )}
        </div>
    </div>
  );
});
