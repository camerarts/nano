
import React, { useState, useEffect, useMemo } from 'react';
import { User as UserIcon, LogOut, Search, Plus, Sparkles, Star, Languages, Upload, Image as ImageIcon, ClipboardPaste, Loader2, ArrowUpDown, Eye } from 'lucide-react';
import { Prompt, User, ModalType } from './types';
import { NeoButton } from './components/ui/NeoButton';
import { PromptCard } from './components/PromptCard';
import { Modal } from './components/Modal';
import { Lightbox } from './components/Lightbox';

// --- MOCK USER (Auth handled simply) ---
const MOCK_USER: User = {
  username: 'AdminUser',
  avatar: 'https://picsum.photos/100/100',
  isAdmin: true
};

const SESSION_KEY = 'nano_admin_session';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

const DEFAULT_CONTENT = {
  zh: "在此处输入提示词...",
  en: "Enter prompt here..."
};

const TEXT = {
  zh: {
    subtitle: "提示词库",
    login: "登陆",
    heroTitle: "提示词精选网站",
    quality: "高质量",
    curated: "精选",
    ver: "V 1.0",
    public: "公开",
    newPrompt: "新增提示词",
    latest: "最新提示词",
    sortRating: "提示词排序",
    total: "总计",
    adminTitle: "管理员登陆",
    adminDesc: "请输入管理员密码以编辑内容。",
    passPlaceholder: "请输入密码",
    passError: "密码错误",
    confirm: "确认登陆",
    editTitle: "编辑提示词",
    lblTitle: "标题",
    lblImg: "图片链接",
    lblUpload: "或上传图片 (自动裁剪16:9)",
    lblContent: "提示词文本",
    lblDate: "上传日期 (精确到小时)",
    lblRating: "评级",
    cancel: "取消",
    save: "保存修改",
    preview: "预览",
    langName: "EN",
    paste: "粘贴",
    loading: "加载数据中...",
    saving: "正在保存...",
    visitPrefix: "您是本网站第",
    visitSuffix: "位访客",
  },
  en: {
    subtitle: "PROMPT LIBRARY",
    login: "Login",
    heroTitle: "Curated Prompts",
    quality: "High Quality",
    curated: "Curated",
    ver: "V 1.0",
    public: "PUBLIC",
    newPrompt: "New Prompt",
    latest: "Latest Prompts",
    sortRating: "Sort by Rating",
    total: "Total",
    adminTitle: "Admin Login",
    adminDesc: "Enter admin password to edit content.",
    passPlaceholder: "Enter password",
    passError: "Incorrect password",
    confirm: "Login",
    editTitle: "Edit Prompt",
    lblTitle: "Title",
    lblImg: "Image URL",
    lblUpload: "Or Upload Image (Auto-crop 16:9)",
    lblContent: "Prompt Content",
    lblDate: "Date (Hour precision)",
    lblRating: "Rating",
    cancel: "Cancel",
    save: "Save Changes",
    preview: "PREVIEW",
    langName: "中",
    paste: "Paste",
    loading: "Loading data...",
    saving: "Saving...",
    visitPrefix: "You are visitor #",
    visitSuffix: "",
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  
  const t = TEXT[lang];

  // Login State
  const [loginPassword, setLoginPassword] = useState('');
  const [sessionPassword, setSessionPassword] = useState(''); // Store verified password for API calls
  const [loginError, setLoginError] = useState('');

  // Edit Modal State
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormContent, setEditFormContent] = useState('');
  const [editFormImage, setEditFormImage] = useState('');
  const [editFormDate, setEditFormDate] = useState('');
  const [editFormRating, setEditFormRating] = useState(0);

  // Restore Session on Mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const { password, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < SESSION_DURATION) {
          // Session is valid
          setUser(MOCK_USER);
          setSessionPassword(password);
        } else {
          // Session expired
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // Record Visit and Fetch Count
  useEffect(() => {
    const recordVisit = async () => {
      try {
        const res = await fetch('/api/visit');
        if (res.ok) {
          const data = await res.json();
          setVisitorCount(data.count);
        }
      } catch (e) {
        console.error("Failed to record visit", e);
      }
    };
    // We only want to run this once on mount
    recordVisit();
  }, []);

  // Fetch Prompts from Cloudflare API
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const res = await fetch('/api/prompts');
        if (res.ok) {
          const data = await res.json();
          setPrompts(data);
        }
      } catch (error) {
        console.error("Failed to fetch prompts", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  // Memoized Sorted Prompts
  const sortedPrompts = useMemo(() => {
    const p = [...prompts];
    if (sortBy === 'rating') {
      // Sort by Rating Desc, then Likes Desc, then Date Desc
      return p.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const likeDiff = b.likes - a.likes;
        if (likeDiff !== 0) return likeDiff;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } else {
      // Sort by Date Desc (Default)
      return p.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [prompts, sortBy]);

  const handleLogin = async () => {
    if (!loginPassword.trim()) return;
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      // Verify password with backend
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword.trim() })
      });

      if (res.ok) {
        const pass = loginPassword.trim();
        setUser(MOCK_USER);
        setSessionPassword(pass);
        
        // Save Session
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          password: pass,
          timestamp: Date.now()
        }));

        setModalType(null);
        setLoginPassword('');
      } else {
        setLoginError(t.passError);
      }
    } catch (error) {
      setLoginError("Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSessionPassword('');
    localStorage.removeItem(SESSION_KEY);
  };

  const handleLike = async (id: string) => {
    // Determine unique key for user/day tracking
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `nano_banana_likes_${today}`;
    
    let dailyLikesMap: Record<string, number> = {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        dailyLikesMap = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Local storage error", e);
    }

    // Check if user has already liked this specific prompt 5 times today
    const currentLikesForThisPrompt = dailyLikesMap[id] || 0;

    if (currentLikesForThisPrompt >= 5) {
      return;
    }

    // Optimistic Update (Update UI immediately)
    setPrompts(prevPrompts => 
      prevPrompts.map(p => 
        p.id === id ? { ...p, likes: p.likes + 1 } : p
      )
    );

    // Call API
    try {
      await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      // Update local storage on success
      dailyLikesMap[id] = currentLikesForThisPrompt + 1;
      localStorage.setItem(storageKey, JSON.stringify(dailyLikesMap));
    } catch (error) {
      console.error("Failed to like", error);
    }
  };

  const openEditModal = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setEditFormTitle(prompt.title);
    setEditFormContent(prompt.content);
    setEditFormImage(prompt.imageUrl || '');
    setEditFormRating(prompt.rating || 0);
    const formattedDate = prompt.date.length > 16 ? prompt.date.substring(0, 16) : prompt.date;
    setEditFormDate(formattedDate);
    setModalType('EDIT');
  };

  const handleSaveEdit = async () => {
    if (!editingPrompt) return;
    setIsSaving(true);

    const updatedPromptData = {
      ...editingPrompt,
      title: editFormTitle,
      content: editFormContent,
      imageUrl: editFormImage,
      date: editFormDate,
      rating: editFormRating,
      authPassword: sessionPassword // Send the verified session password
    };

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPromptData)
      });

      if (res.ok) {
        const savedData = await res.json();
        
        // Update local state with the returned data (which might have a new R2 URL)
        setPrompts(prev => {
          const exists = prev.find(p => p.id === savedData.id);
          if (exists) {
            return prev.map(p => p.id === savedData.id ? savedData : p);
          } else {
            return [savedData, ...prev];
          }
        });
        
        // Refresh session timestamp on activity
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          password: sessionPassword,
          timestamp: Date.now()
        }));

        setModalType(null);
        setEditingPrompt(null);
      } else {
        if (res.status === 401) {
            alert("Session expired. Please login again.");
            handleLogout();
        } else {
            alert("Failed to save.");
        }
      }
    } catch (error) {
      console.error("Save failed", error);
      alert("Error saving data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    const now = new Date();
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    const newPrompt: Prompt = {
        id: Date.now().toString(),
        title: lang === 'zh' ? "新提示词" : "New Prompt",
        content: lang === 'zh' ? DEFAULT_CONTENT.zh : DEFAULT_CONTENT.en,
        author: user?.username || "Admin",
        date: localIso,
        tags: ["New"],
        likes: 0,
        imageUrl: '', // Empty by default
        rating: 5
    };
    
    // Just open modal, don't save to API yet
    openEditModal(newPrompt);
  };

  // Reusable Image Processing Logic (Crop to 16:9)
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetRatio = 16 / 9;
        let drawWidth = img.width;
        let drawHeight = img.width / targetRatio;

        // Ensure we don't crop out empty space, center crop strategy
        if (drawHeight > img.height) {
          // If calculated height is larger than actual, we are width-limited
          drawHeight = img.height;
          drawWidth = img.height * targetRatio;
        }

        const MAX_WIDTH = 1280;
        const scale = Math.min(1, MAX_WIDTH / drawWidth);
        canvas.width = drawWidth * scale;
        canvas.height = drawHeight * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Center the crop
        const sx = (img.width - drawWidth) / 2;
        const sy = (img.height - drawHeight) / 2;
        
        ctx.drawImage(img, sx, sy, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
        setEditFormImage(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  // Check if text is one of the default placeholders
  const isDefaultContent = (text: string) => {
    return text === DEFAULT_CONTENT.zh || text === DEFAULT_CONTENT.en;
  };

  const handleClipboardPasteButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setEditFormContent(prev => {
        if (isDefaultContent(prev)) return text;
        return prev + text;
      });
    } catch (error) {
      console.error('Failed to read clipboard', error);
    }
  };

  // Global Paste Handler for Modal
  const handleModalPaste = (e: React.ClipboardEvent) => {
    // 1. Check for Image in clipboard
    const items = e.clipboardData.items;
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (file) processImageFile(file);
            hasImage = true;
            return; // Stop processing if image found
        }
    }

    // 2. Handle Text if not focused on inputs
    if (!hasImage) {
        const activeEl = document.activeElement;
        const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
        
        // If user is just pasting into the modal without specific focus, assume content text
        if (!isInputFocused) {
            const text = e.clipboardData.getData('text');
            if (text) {
                e.preventDefault();
                setEditFormContent(prev => {
                    if (isDefaultContent(prev)) return text;
                    return prev + (prev ? '\n' : '') + text;
                });
            }
        }
        // Otherwise let default behavior happen (pasting into Title or Content inputs)
    }
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      {/* --- HEADER --- */}
      <header className="bg-neo-red border-b-4 border-black sticky top-0 z-40">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div 
             className="flex flex-col select-none group cursor-pointer"
             onClick={() => window.location.reload()}
             title="Refresh Page"
          >
             <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] tracking-tighter italic group-hover:-translate-y-1 transition-transform">
               NANO BANANA PRO
             </h1>
             <span className="bg-black text-white text-xs px-2 py-0.5 w-fit font-mono -mt-1 transform -rotate-1 ml-4 border border-white">
               {t.subtitle}
             </span>
          </div>

          <div className="flex items-center gap-4">
            {/* New Prompt Button - Moved here */}
            {user && (
                 <NeoButton variant="primary" onClick={handleCreateNew} className="flex items-center gap-2 animate-bounce hover:animate-none md:mr-2">
                    <Plus size={20} /> <span className="hidden sm:inline">{t.newPrompt}</span>
                 </NeoButton>
            )}

            <NeoButton 
                variant="white" 
                size="sm" 
                onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} 
                className="!px-3 !shadow-neo-sm font-bold flex items-center gap-2"
            >
                <Languages size={18} /> {t.langName}
            </NeoButton>

            {user ? (
              <div className="flex items-center gap-3 bg-white px-3 py-1 border-2 border-black shadow-neo">
                 <span className="font-bold hidden md:block">@{user.username}</span>
                 <NeoButton variant="white" size="sm" onClick={handleLogout} className="!px-2 !shadow-none border-none hover:!bg-gray-200">
                    <LogOut size={18} />
                 </NeoButton>
              </div>
            ) : (
              <NeoButton variant="white" onClick={() => setModalType('LOGIN')} className="hidden md:flex items-center gap-2">
                 <UserIcon size={18} /> {t.login}
              </NeoButton>
            )}
            <NeoButton variant="white" onClick={() => setModalType('LOGIN')} className="md:hidden !px-2">
                 <UserIcon size={18} />
            </NeoButton>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="bg-neo-red px-4 pt-10 pb-20 border-b-4 border-black relative overflow-hidden">
        <div className="absolute top-10 left-10 w-24 h-24 border-4 border-black bg-banana-yellow rounded-full opacity-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -z-0"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-black bg-blue-400 rotate-12 opacity-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -z-0 flex items-center justify-center">
            <Star size={64} className="text-white fill-current" />
        </div>
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-black rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-8 h-8 border-2 border-black bg-white transform rotate-45"></div>

        <div className="container mx-auto max-w-6xl relative z-10">
           {/* REDUCED PADDING AND HEIGHT */}
           <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-14 relative overflow-hidden group hover:translate-x-1 hover:translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-2 bg-black"></div>
              <div className="absolute bottom-0 left-0 w-full h-2 bg-black"></div>
              <div className="absolute top-0 left-0 h-full w-2 bg-black"></div>
              <div className="absolute top-0 right-0 h-full w-2 bg-black"></div>
              <Sparkles className="absolute top-6 right-6 text-banana-yellow w-12 h-12 animate-pulse" />
              <Sparkles className="absolute bottom-6 left-6 text-neo-red w-8 h-8 animate-pulse delay-75" />

              <div className="flex flex-col items-center justify-center text-center">
                 <h1 className="text-5xl md:text-8xl lg:text-9xl font-black italic text-black tracking-tighter leading-none mb-4 drop-shadow-[5px_5px_0px_rgba(255,255,255,1)] select-none scale-y-105">
                   {t.heroTitle}
                 </h1>
                 <div className="flex gap-4 items-center flex-wrap justify-center mb-0">
                    <span className="bg-black text-white px-4 py-1 font-bold text-lg rotate-2 shadow-[2px_2px_0px_#fff]">{t.quality}</span>
                    <span className="bg-banana-yellow border-2 border-black px-4 py-1 font-bold text-lg -rotate-2 shadow-[2px_2px_0px_#000]">{t.curated}</span>
                 </div>
              </div>
           </div>

           {/* Hero Footer Info Row - Responsive Single Line */}
           <div className="mt-6 md:mt-8 relative flex flex-row items-center justify-between w-full">
              <div className="flex gap-2 text-white font-bold text-shadow-sm z-10 md:w-auto shrink-0">
                 <span className="bg-black border-2 border-white px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-base shadow-neo-sm">{t.ver}</span>
                 <span className="bg-black border-2 border-white px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-base shadow-neo-sm">{t.public}</span>
              </div>
              
              {/* VISITOR COUNTER - Right aligned on mobile, Centered on desktop */}
              {visitorCount !== null && (
                <div className="flex items-center justify-end gap-1 md:gap-2 z-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 select-none shrink-0">
                    <span className="text-white font-black italic tracking-wider drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[8px] sm:text-[10px] md:text-base lg:text-lg">
                        {t.visitPrefix}
                    </span>
                    <span className="bg-black text-banana-yellow px-1.5 py-0.5 md:px-3 border md:border-2 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.4)] md:shadow-[3px_3px_0px_rgba(0,0,0,0.4)] font-black text-xs md:text-2xl -rotate-2 mx-0.5 md:mx-2 inline-block font-mono">
                        {visitorCount}
                    </span>
                    <span className="text-white font-black italic tracking-wider drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] text-[8px] sm:text-[10px] md:text-base lg:text-lg">
                        {t.visitSuffix}
                    </span>
                </div>
              )}
           </div>
        </div>
      </section>

      {/* --- CONTENT GRID --- */}
      <main className="container mx-auto px-2 md:px-4 -mt-10 relative z-20">
        
        {/* Search Bar / Status */}
        <div className="flex justify-between items-center mb-8 bg-banana-bg flex-wrap gap-4">
           <div className="flex items-center gap-2 md:gap-4">
              {/* Latest (Date) Sort */}
              <button 
                onClick={() => setSortBy('date')}
                className={`text-sm md:text-2xl font-black border-2 border-black px-2 md:px-4 py-2 flex items-center gap-1 md:gap-2 transition-all duration-200
                  ${sortBy === 'date' 
                    ? 'bg-white shadow-neo scale-100 z-10' 
                    : 'bg-gray-200 text-gray-500 shadow-none hover:bg-gray-100'}
                `}
              >
                 <Search className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} /> {t.latest}
              </button>

              {/* Rating Sort */}
              <button 
                onClick={() => setSortBy('rating')}
                className={`text-sm md:text-2xl font-black border-2 border-black px-2 md:px-4 py-2 flex items-center gap-1 md:gap-2 transition-all duration-200
                  ${sortBy === 'rating' 
                    ? 'bg-white shadow-neo scale-100 z-10' 
                    : 'bg-gray-200 text-gray-500 shadow-none hover:bg-gray-100'}
                `}
              >
                 <ArrowUpDown className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} /> {t.sortRating}
              </button>
           </div>
           
           <div className="bg-banana-yellow border-2 border-black px-2 md:px-4 py-2 font-bold shadow-neo text-sm md:text-base">
              {t.total}: {isLoading ? '...' : sortedPrompts.length}
           </div>
        </div>

        {/* Loading State */}
        {isLoading && !user && !loginError ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 font-bold">
             <Loader2 size={48} className="animate-spin mb-4 text-black" />
             {t.loading}
          </div>
        ) : null}

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
            {sortedPrompts.map((prompt) => (
              <PromptCard 
                  key={prompt.id} 
                  prompt={prompt} 
                  canEdit={!!user} 
                  onEdit={openEditModal}
                  onLike={handleLike}
                  onImageClick={setLightboxUrl}
                  lang={lang}
              />
            ))}
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Lightbox */}
      <Lightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      
      {/* Login Modal */}
      <Modal 
        isOpen={modalType === 'LOGIN'} 
        onClose={() => { setModalType(null); setLoginError(''); setLoginPassword(''); }}
        title={t.adminTitle}
      >
         <div className="flex flex-col gap-4">
            <p className="font-mono text-sm text-gray-600 mb-2">{t.adminDesc}</p>
            <input 
              type="password" 
              placeholder={t.passPlaceholder}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full border-2 border-black p-3 outline-none focus:bg-yellow-50 font-bold text-lg" 
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={isLoading}
            />
            {loginError && <div className="text-red-600 font-bold text-sm bg-red-100 p-2 border border-red-500">{loginError}</div>}
            
            <NeoButton variant="dark" className="w-full mt-2" onClick={handleLogin} disabled={isLoading}>
               {isLoading ? <Loader2 className="animate-spin mx-auto"/> : t.confirm}
            </NeoButton>
         </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={modalType === 'EDIT'}
        onClose={() => !isSaving && setModalType(null)}
        title={t.editTitle}
      >
         {/* Added onPaste handler to the container */}
         <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-2 relative" onPaste={handleModalPaste}>
            {isSaving && (
               <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center font-black text-xl">
                  <Loader2 className="animate-spin mr-2"/> {t.saving}
               </div>
            )}
         
            <div>
               <label className="block text-xs font-bold uppercase mb-1 bg-black text-white w-fit px-1">{t.lblTitle}</label>
               <input 
                  type="text" 
                  value={editFormTitle} 
                  onChange={(e) => setEditFormTitle(e.target.value)}
                  className="w-full border-2 border-black p-2 outline-none font-bold text-lg focus:shadow-neo-sm transition-shadow" 
               />
            </div>

            <div>
               <label className="block text-xs font-bold uppercase mb-1 bg-black text-white w-fit px-1">{t.lblRating}</label>
               <div className="flex gap-1 border-2 border-black w-fit p-1 bg-white">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setEditFormRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                       <Star 
                         size={24} 
                         className={star <= editFormRating ? "fill-banana-yellow text-black" : "text-gray-300"} 
                       />
                    </button>
                  ))}
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold uppercase mb-1 bg-black text-white w-fit px-1">{t.lblImg}</label>
               
               <div className="flex flex-col gap-2">
                   <div className="flex gap-2">
                      <label className="flex-1 border-2 border-black border-dashed bg-gray-50 p-2 flex items-center justify-center gap-2 cursor-pointer hover:bg-yellow-50 transition-colors">
                          <Upload size={16} />
                          <span className="text-xs font-bold">{t.lblUpload}</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                   </div>
                   
                   <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="https://..."
                        value={editFormImage} 
                        onChange={(e) => setEditFormImage(e.target.value)}
                        className="flex-1 border-b-2 border-gray-200 focus:border-black p-1 outline-none font-mono text-sm text-gray-600" 
                      />
                   </div>
               </div>

               {editFormImage ? (
                 <div className="mt-2 w-full aspect-video border-2 border-black bg-gray-100 overflow-hidden relative">
                    <img src={editFormImage} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black text-white text-xs px-1">{t.preview}</span>
                 </div>
               ) : (
                 <div className="mt-2 w-full aspect-video border-2 border-black border-dashed bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                    No Image
                 </div>
               )}
            </div>

            <div>
               <div className="flex justify-between items-end mb-1">
                  <label className="block text-xs font-bold uppercase bg-black text-white w-fit px-1">{t.lblContent}</label>
                  <button onClick={handleClipboardPasteButton} className="text-xs flex items-center gap-1 font-bold hover:bg-gray-200 px-2 py-0.5 rounded border border-gray-300">
                     <ClipboardPaste size={12} /> {t.paste}
                  </button>
               </div>
               <textarea 
                  value={editFormContent} 
                  onChange={(e) => setEditFormContent(e.target.value)}
                  onFocus={() => {
                     if (isDefaultContent(editFormContent)) {
                        setEditFormContent('');
                     }
                  }}
                  className="w-full border-2 border-black p-2 h-32 resize-none outline-none font-mono text-sm leading-relaxed focus:shadow-neo-sm transition-shadow" 
               />
            </div>

            <div>
               <label className="block text-xs font-bold uppercase mb-1 bg-black text-white w-fit px-1">{t.lblDate}</label>
               <input 
                  type="datetime-local" 
                  value={editFormDate} 
                  onChange={(e) => setEditFormDate(e.target.value)}
                  className="w-full border-2 border-black p-2 outline-none font-mono font-bold focus:shadow-neo-sm transition-shadow" 
               />
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t-2 border-black border-dashed">
               <NeoButton variant="white" onClick={() => setModalType(null)} disabled={isSaving}>{t.cancel}</NeoButton>
               <NeoButton variant="primary" onClick={handleSaveEdit} disabled={isSaving}>{t.save}</NeoButton>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default App;
