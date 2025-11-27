
import React from 'react';
import { Prompt } from '../types';
import { Heart, Copy, Edit2, CornerDownRight, Star } from 'lucide-react';
import { NeoButton } from './ui/NeoButton';

interface PromptCardProps {
  prompt: Prompt;
  canEdit: boolean;
  onEdit: (prompt: Prompt) => void;
  onLike: (id: string) => void;
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
    yearsAgo: "年前"
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
    yearsAgo: "years ago"
  }
};

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, canEdit, onEdit, onLike, lang }) => {
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

  return (
    <div className="bg-white border-2 border-black shadow-neo flex flex-col h-full hover:-translate-y-1 transition-transform duration-200">
      
      {/* Header / Meta */}
      <div className="p-3 border-b-2 border-black flex justify-between items-center bg-gray-50 h-12">
        <div className="flex items-center gap-2">
           {/* Date with tooltip */}
           <span 
             className="text-xs font-bold text-gray-600 cursor-help" 
             title={getFullDate(prompt.date)}
           >
             {getRelativeTime(prompt.date)}
           </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Rating Stars */}
          {rating > 0 && (
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={12} 
                  className={i < rating ? "fill-black text-black" : "text-gray-300"} 
                />
              ))}
            </div>
          )}

          {prompt.isOfficial && (
            <span className="bg-banana-yellow text-[10px] px-2 py-0.5 border border-black font-bold rotate-[-2deg]">
              {t.official}
            </span>
          )}
        </div>
      </div>

      {/* Image / Content Area */}
      <div className="p-4 flex-grow flex flex-col gap-4">
        <h3 className="font-bold text-lg leading-tight">{prompt.title}</h3>
        
        {prompt.imageUrl && (
          <div className="aspect-video w-full border-2 border-black overflow-hidden bg-gray-100 relative group">
             <img src={prompt.imageUrl} alt={prompt.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* The Prompt Box */}
        <div className="relative bg-gray-100 border-2 border-black p-3 text-sm font-mono mt-auto">
           <CornerDownRight className="absolute top-2 left-2 w-4 h-4 text-gray-400" />
           <p className="pl-6 pt-1 line-clamp-4 text-gray-700">
             {prompt.content}
           </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t-2 border-black bg-white flex justify-between items-center gap-2">
         <NeoButton variant="dark" size="sm" onClick={handleCopy} className="flex items-center gap-1 flex-1 justify-center">
            {copied ? t.copied : <><Copy size={14} /> {t.copy}</>}
         </NeoButton>
         
         <div className="flex gap-2">
            <button 
                onClick={() => onLike(prompt.id)}
                className="p-2 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-y-[1px] transition-all bg-white flex items-center gap-1 text-xs font-bold active:bg-red-50"
            >
               <Heart size={14} className={prompt.likes > 0 ? "fill-red-500 text-red-500" : "text-black"} />
               {prompt.likes}
            </button>
            
            {canEdit && (
              <button 
                onClick={() => onEdit(prompt)}
                className="p-2 border-2 border-black shadow-neo-sm hover:shadow-neo hover:-translate-y-[1px] transition-all bg-banana-yellow"
              >
                <Edit2 size={14} />
              </button>
            )}
         </div>
      </div>
    </div>
  );
};
