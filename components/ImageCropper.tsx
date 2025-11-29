
import React from 'react';
import { Prompt } from '../types';
import { Heart, Copy, Edit2, CornerDownRight, Star, Clock } from 'lucide-react';
import { NeoButton } from './ui/NeoButton';

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
    <div className={`bg-white border-2 border-black shadow-neo flex flex-col h-full hover:-translate-y-1 transition-transform duration-200 relative group ${isPending ? 'opacity-75 bg-gray-50 border-dashed' : ''}`}>
      
      {/* Header / Meta */}
      <div className="p-2 md:p-3 border-b-2 border-black flex justify-between items-center bg-gray-50 h-10 md:h-16">
        <div className="flex items-center gap-2">
           {/* Date with tooltip */}
           <span 
             className="text-[10px] md:text-xs font-bold text-gray-600 cursor-help" 
             title={getFullDate(prompt.date)}
           >
             {getRelativeTime(prompt.date)}
           </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* Pending Status Badge (Visible if Admin can see it) */}
          {isPending && (
             <span className="bg-yellow-300 text-black text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 border-2 border-black font-bold flex items-center gap-1">
                <Clock size={10} /> {t.pending}
             </span>
          )}

          {/* Rating Sticker - Responsive Size */}
          {rating > 0 && !isPending && (
            <div className="flex items-center gap-0.5 md:gap-1 bg-banana-yellow border-2 border-black px-1 py-0.5 md:px-2 md:py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_rgba(0,0,0,1)] rotate-[-3deg] mr-1 md:mr-2 select-none transform hover:scale-110 transition-transform duration-200 cursor-default">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-2.5 h-2.5 md:w-4 md:h-4 ${i < rating ? "fill-black text-black" : "fill-transparent text-black/20"}`}
                  strokeWidth={2.5}
                />
              ))}
            </div>
          )}

          {prompt.isOfficial && (
            <span className="bg-neo-red text-white text-[8px] md:text-[10px] px-1 md:px-2 py-0.5 border-2 border-black font-bold rotate-[2deg] shadow-[1px_1px_0px_rgba(0,0,0,1)] md:shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none">
              {t.official}
            </span>
          )}
        </div>
      </div>

      {/* Image / Content Area */}
      <div className="p-2 md:p-4 flex-grow flex flex-col gap-2 md:gap-4">
        <h3 className="font-bold text-xs md:text-xl leading-tight line-clamp-2 md:line-clamp-none">{prompt.title}</h3>
        
        {prompt.imageUrl && (
          <div 
            className="aspect-video w-full border-2 border-black overflow-hidden bg-gray-100 relative group cursor-zoom-in shadow-sm"
            onClick={() => onImageClick && onImageClick(prompt.imageUrl!)}
          >
             <img 
               src={prompt.imageUrl} 
               alt={prompt.title} 
               className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
             />
             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
             </div>
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
