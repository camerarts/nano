
import React from 'react';
import { Prompt } from '../types';
import { Heart, Copy, Edit2, CornerDownRight, Star, Clock, Download } from 'lucide-react';
import { NeoButton } from './ui/NeoButton';
import { downloadImage, getImageExtension } from '../services/downloadImage';

interface PromptCardProps {
  prompt: Prompt;
  canEdit: boolean;
  onEdit: (prompt: Prompt) => void;
  onLike: (id: string) => void;
  onImageClick?: (url: string) => void;
  lang: 'zh' | 'en';
}

const LABELS = {
  zh: {
    official: "官方",
    copy: "复制",
    copied: "已复制!",
    download: "下载图片",
    justNow: "刚刚",
    minsAgo: "分钟前",
    hoursAgo: "小时前",
    daysAgo: "天前",
    monthsAgo: "个月前",
    yearsAgo: "年前",
    pending: "待审核",
  },
  en: {
    official: "OFFICIAL",
    copy: "COPY",
    copied: "COPIED!",
    download: "Download image",
    justNow: "Just now",
    minsAgo: "mins ago",
    hoursAgo: "hours ago",
    daysAgo: "days ago",
    monthsAgo: "months ago",
    yearsAgo: "years ago",
    pending: "PENDING",
  }
};

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, canEdit, onEdit, onLike, onImageClick, lang }) => {
  const [copied, setCopied] = React.useState(false);
  const t = LABELS[lang];

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format full date for tooltip
  const getFullDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
    } catch {
      return dateStr;
    }
  };

  // Helper for relative time
  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);

      if (diffSec < 60) return t.justNow;
      if (diffMin < 60) return `${diffMin} ${t.minsAgo}`;
      if (diffHour < 24) return `${diffHour} ${t.hoursAgo}`;
      if (diffDay < 30) return `${diffDay} ${t.daysAgo}`;
      if (diffMonth < 12) return `${diffMonth} ${t.monthsAgo}`;
      return `${diffYear} ${t.yearsAgo}`;
    } catch (e) {
      return dateStr;
    }
  };

  const rating = prompt.rating || 0;
  const isPending = prompt.status === 'pending';

  return (
    <div className={`bg-white border-2 border-black shadow-neo flex flex-col hover:-translate-y-1 transition-transform duration-200 relative group ${isPending ? 'opacity-75 bg-gray-50 border-dashed' : ''}`}>
      
      {/* 标题行：名称在左，时间紧邻评级左侧，评级固定在最右侧 */}
      <div className="p-2 md:p-3 border-b-2 border-black flex items-center justify-between gap-2 bg-gray-50 min-h-[44px] md:min-h-[60px]">
        <h3 className="font-bold text-xs md:text-xl leading-tight line-clamp-2 md:line-clamp-none flex-1 min-w-0">{prompt.title}</h3>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* 待审核 / 官方标记放在时间与评级之前，保证评级始终最靠右 */}
          {isPending && (
             <span className="bg-yellow-300 text-black text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 border-2 border-black font-bold flex items-center gap-1">
                <Clock size={10} /> {t.pending}
             </span>
          )}
          {prompt.isOfficial && (
            <span className="bg-neo-red text-white text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 border-2 border-black font-bold rotate-[2deg] shadow-[1px_1px_0px_rgba(0,0,0,1)] md:shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none">
              {t.official}
            </span>
          )}
          {/* 更新时间（原本在左上角）移到评级左侧 */}
          <span
            className="text-[10px] md:text-xs font-bold text-gray-600 cursor-help whitespace-nowrap"
            title={getFullDate(prompt.date)}
          >
            {getRelativeTime(prompt.date)}
          </span>

          {/* Rating Sticker - Responsive Size */}
          {rating > 0 && !isPending && (
            <div className="flex items-center gap-0.5 md:gap-1 bg-banana-yellow border-2 border-black px-1 py-0.5 md:px-2 md:py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_rgba(0,0,0,1)] rotate-[-3deg] select-none transform hover:scale-110 transition-transform duration-200 cursor-default">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-2.5 h-2.5 md:w-4 md:h-4 ${i < rating ? "fill-black text-black" : "fill-transparent text-black/20"}`}
                  strokeWidth={2.5}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image / Content Area */}
      <div className="p-2 md:p-4 flex-grow flex flex-col gap-2 md:gap-4">
        
        {prompt.imageUrl && (
          <div 
            className="w-full border-2 border-black overflow-hidden bg-gray-100 relative group cursor-zoom-in shadow-sm"
            onClick={() => onImageClick && onImageClick(prompt.imageUrl!)}
          >
             {/* 宽度撑满、高度按图片原始比例自适应：完整显示，无裁切、无留白 */}
             <img 
               src={prompt.imageUrl} 
               alt={prompt.title} 
               loading="lazy"
               className="block w-full h-auto" 
             />
             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
             </div>
             {/* 鼠标移到图片上时右下角浮出下载按钮；阻止冒泡，避免同时打开灯箱 */}
             <button
               type="button"
               title={t.download}
               aria-label={t.download}
               onClick={(e) => {
                 e.stopPropagation();
                 void downloadImage(prompt.imageUrl!, `${prompt.title}.${getImageExtension(prompt.imageUrl!)}`);
               }}
               className="absolute bottom-2 right-2 z-10 p-1.5 bg-banana-yellow border-2 border-black shadow-neo-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-100"
             >
               <Download size={14} strokeWidth={3} />
             </button>
          </div>
        )}

        {/* The Prompt Box */}
        <div className="relative bg-gray-100 border-2 border-black p-2 md:p-3 text-xs md:text-sm font-mono mt-auto shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
           <CornerDownRight className="absolute top-1.5 left-1.5 w-3 h-3 md:top-2 md:left-2 md:w-4 md:h-4 text-gray-400" />
           <p className="pl-4 md:pl-6 pt-0.5 line-clamp-1 md:line-clamp-4 text-gray-700">
             {prompt.content}
           </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-2 md:p-3 border-t-2 border-black bg-white flex justify-between items-center gap-2">
         <NeoButton variant="dark" size="sm" onClick={handleCopy} className="flex items-center gap-1 flex-1 justify-center text-[10px] md:text-sm px-1 py-1 h-8 md:h-auto">
            {copied ? t.copied : <><Copy className="w-3 h-3 md:w-4 md:h-4" /> {t.copy}</>}
         </NeoButton>
         
         <div className="flex gap-2">
            <button 
                onClick={() => onLike(prompt.id)}
                className="p-1 md:p-2 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-y-[1px] transition-all bg-white flex items-center gap-1 text-[10px] md:text-xs font-bold active:bg-red-50 group h-8 md:h-auto min-w-[36px] md:min-w-[44px] justify-center"
            >
               <Heart className={`w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:scale-110 ${prompt.likes > 0 ? "fill-red-500 text-red-500" : "text-black"}`} />
               {prompt.likes}
            </button>
            
            {canEdit && (
              <button 
                onClick={() => onEdit(prompt)}
                className="p-1 md:p-2 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-y-[1px] transition-all bg-banana-yellow h-8 md:h-auto min-w-[30px] md:min-w-[40px] flex items-center justify-center"
              >
                <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            )}
         </div>
      </div>
    </div>
  );
};
