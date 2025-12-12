"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, auth, googleProvider, twitterProvider } from "@/lib/firebase"; 
import { ref, onValue, runTransaction, get, push, query, orderByChild, equalTo } from "firebase/database";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  Music, Heart, User as UserIcon, Share2, Twitter, Filter, Loader2, Mic2, 
  X, Send, LogIn, LogOut, Music2, FileText, Dice5, Trophy, AlertTriangle, Sun, Moon,
  Youtube, Twitch, Clock, CalendarDays, RefreshCw, ChevronDown, ChevronUp, MessageSquare, Sparkles, Link as LinkIcon,
  Megaphone, ListMusic, UserCircle, Play, Copy, CheckCircle2, Search, ArrowUp, MoreHorizontal,
  LayoutTemplate, Star, Zap, Monitor, Palette, Coins, Eye, Flame, Calendar, History
} from 'lucide-react';

/* --- 型定義 --- */
type Song = {
  id: string;
  title: string;
  artist: string;
  category: string;
  tags?: string[];
  key?: string;
  memo?: string;
  reading?: string;
  lyricsUrl?: string;
  youtubeUrl?: string;
  // ★No.1 練習進捗
  practiceRate?: number;
  lastSungAt?: number;
  sungCount?: number;
  likes: number;
  createdAt: number;
  isPinned?: boolean;
};

type Profile = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  twitter?: string;
  youtube?: string;
  twitch?: string;
  tiktok?: string;
  otherUrl?: string;
  themeColor?: string;
  fontFamily?: string;
  backgroundImage?: string;
  backgroundOpacity?: number; 
  overlayOpacity?: number;
  // ★No.21 テーマ
  themeStyle?: 'default' | 'neon' | 'retro' | 'japanese' | 'glitch' | 'sakura' | 'summer' | 'halloween' | 'winter';
  isRequestEnabled?: boolean;
  announcement?: { text: string; active: boolean };
  // ★No.28 スケジュール
  schedule?: string;
  tagColors?: Record<string, string>;
  // ★No.7 タググループ
  tagGroups?: { name: string; tags: string[] }[];
  // ★No.2 NGワード
  ngKeywords?: string[];
  ngUsers?: Record<string, { name: string; date: number }>;
};

type RequestData = {
  requesterName: string;
  requesterUid: string;
  songTitle: string;
  comment: string;
  status: string;
  createdAt: number;
};

/* --- Utils --- */
const normalizeText = (text: string) => {
  if (!text) return "";
  return text.trim().toLowerCase().replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).replace(/[\u3041-\u3096]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60));
};

const vibrate = (ms: number = 10) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
};

/* --- Config --- */
const THEME_STYLES = {
  default: { bg: "from-blue-50 via-white to-pink-50", text: "text-slate-800", border: "border-slate-200", glass: "bg-white/80", accent: "text-blue-600" },
  neon: { bg: "from-slate-950 via-slate-900 to-black", text: "text-cyan-400", border: "border-cyan-500/50", glass: "bg-slate-900/80 shadow-[0_0_15px_rgba(34,211,238,0.3)]", accent: "text-cyan-400" },
  retro: { bg: "from-yellow-100 to-orange-100", text: "text-orange-900", border: "border-orange-900 border-2", glass: "bg-yellow-50", accent: "text-orange-600" },
  japanese: { bg: "from-red-50 to-stone-100", text: "text-stone-800", border: "border-red-800/30", glass: "bg-white/90", accent: "text-red-700" },
  glitch: { bg: "from-gray-900 to-black", text: "text-green-500", border: "border-green-500", glass: "bg-black/80", accent: "text-green-500" },
  // ★No.21 季節テーマ追加
  sakura: { bg: "from-pink-100 via-white to-red-50", text: "text-pink-800", border: "border-pink-200", glass: "bg-white/80", accent: "text-pink-500" },
  summer: { bg: "from-cyan-100 via-blue-50 to-white", text: "text-blue-800", border: "border-cyan-200", glass: "bg-white/80", accent: "text-cyan-500" },
  halloween: { bg: "from-purple-900 to-orange-900", text: "text-orange-400", border: "border-orange-500", glass: "bg-purple-950/80", accent: "text-orange-500" },
  winter: { bg: "from-slate-100 to-blue-50", text: "text-slate-600", border: "border-slate-200", glass: "bg-white/90", accent: "text-blue-400" },
};

/* --- Components --- */
const SkeletonLoader = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100"} animate-pulse`}>
        <div className="flex gap-4"><div className={`w-12 h-12 rounded-xl ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} /><div className="flex-1 space-y-2"><div className={`h-4 w-3/4 rounded ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} /><div className={`h-3 w-1/2 rounded ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} /></div></div>
      </div>
    ))}
  </div>
);
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (<div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg text-white px-6 py-3.5 rounded-full shadow-2xl z-[80] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 pointer-events-none border border-white/10 ring-1 ring-white/20"><div className="bg-green-500 rounded-full p-0.5"><CheckCircle2 className="w-4 h-4 text-white" /></div><span className="text-sm font-bold tracking-wide">{message}</span></div>);
};
const ImageWithFallback = ({ src, className, fallback, alt }: { src?: string, className?: string, fallback: React.ReactNode, alt?: string }) => {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [src]);
  if (!src || error) return <>{fallback}</>;
  return <img src={src} className={className} alt={alt || "Image"} onError={() => setError(true)} />;
};
const BottomNavButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button onClick={() => { vibrate(15); onClick(); }} className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative group ${active ? "text-blue-500" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
    <div className={`relative transition-transform duration-300 ${active ? "scale-110 -translate-y-1" : "group-hover:scale-105"}`}><Icon className={`w-6 h-6 mb-1 ${active ? "fill-current" : ""}`} />{badge > 0 && (<span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">{badge > 99 ? '99+' : badge}</span>)}</div><span className={`text-[9px] font-bold tracking-wide transition-opacity duration-300 ${active ? "opacity-100" : "opacity-70"}`}>{label}</span>{active && <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full animate-in zoom-in duration-300" />}
  </button>
);

/* ★修正: style jsx の型エラー回避のため dangerouslySetInnerHTML を使用 */
const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
    {[...Array(20)].map((_, i) => (
      <div key={i} className={`absolute w-2 h-2 rounded-sm animate-confetti-${i % 3}`} 
           style={{ 
             left: `${Math.random() * 100}%`, 
             top: `-10px`,
             backgroundColor: ['#FFD700', '#FF69B4', '#00BFFF', '#32CD32'][i % 4],
             animation: `fall ${2 + Math.random() * 3}s linear infinite, sway ${1 + Math.random() * 2}s ease-in-out infinite alternate`,
             animationDelay: `${Math.random() * 2}s`
           }} 
      />
    ))}
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes fall { to { transform: translateY(100vh) rotate(720deg); } }
      @keyframes sway { from { margin-left: -20px; } to { margin-left: 20px; } }
    `}} />
  </div>
);

const FloatingParticles = ({ theme }: { theme: string }) => {
  const icons = theme === 'sakura' ? ['🌸', '💮', '✨'] : theme === 'summer' ? ['🌊', '🌴', '☀️'] : theme === 'halloween' ? ['🎃', '👻', '🦇'] : theme === 'winter' ? ['❄️', '⛄', '✨'] : ['🎵', '✨', '🎶'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(15)].map((_, i) => (
        <div key={i} className="absolute animate-float opacity-30 text-xl" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: `${10 + Math.random() * 20}s`, animationDelay: `-${Math.random() * 20}s` }}>
          {icons[i % icons.length]}
        </div>
      ))}
      <style jsx>{` @keyframes float { 0% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(10deg); } 100% { transform: translateY(0) rotate(0deg); } } .animate-float { animation: float infinite ease-in-out; } `}</style>
    </div>
  );
};

const RippleEffect = () => {
  const [ripples, setRipples] = useState<{x:number, y:number, id:number}[]>([]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = Date.now();
      setRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {ripples.map(r => (<span key={r.id} className="absolute rounded-full bg-blue-400/30 animate-ripple" style={{ left: r.x, top: r.y, width: 20, height: 20, transform: 'translate(-50%, -50%)' }} />))}
      <style jsx>{` @keyframes ripple { 0% { width: 0px; height: 0px; opacity: 0.5; } 100% { width: 200px; height: 200px; opacity: 0; } } .animate-ripple { animation: ripple 0.6s linear; } `}</style>
    </div>
  );
};

const LikeButtonWithCombo = ({ likes, onClick, isDarkMode, theme }: any) => {
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); onClick(e); setCombo(prev => prev + 1); setShowCombo(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setShowCombo(false); setCombo(0); }, 1000);
  };
  return (
    <div className="relative">
      <button onClick={handleClick} className={`flex flex-col items-center justify-center px-4 rounded-xl border transition-all active:scale-90 ${likes > 0 ? "text-pink-500 bg-pink-50 border-pink-200" : (isDarkMode ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-white text-slate-400 border-slate-200")}`}>
        <Heart className={`w-5 h-5 ${likes > 0 ? 'fill-current drop-shadow-sm' : ''}`} /><span className="text-[10px] font-bold">{likes}</span>
      </button>
      {showCombo && combo > 1 && (<div className="absolute -top-8 left-1/2 -translate-x-1/2 text-pink-500 font-black text-sm animate-bounce whitespace-nowrap drop-shadow-md">{combo} COMBO!</div>)}
    </div>
  );
};

/* --- ログインモーダル --- */
const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  const handleLogin = async (provider: any) => { vibrate(20); try { await signInWithPopup(auth, provider); onClose(); } catch (error) { console.error(error); alert("ログインに失敗しました"); } };
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-sm p-8 text-center relative shadow-2xl animate-zoom">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X className="w-6 h-6" /></button>
        <div className="mb-6 inline-flex p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-4 ring-blue-50 dark:ring-blue-900/10"><LogIn className="w-8 h-8" /></div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">ログインしてリクエスト</h2>
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={() => handleLogin(googleProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-blue-100 text-slate-700 font-bold py-3.5 rounded-2xl transition shadow-sm hover:shadow-md active:scale-95"><img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" /> Googleでログイン</button>
          <button onClick={() => handleLogin(twitterProvider)} className="flex items-center justify-center gap-3 bg-black text-white font-bold py-3.5 rounded-2xl transition shadow-lg active:scale-95"><Twitter className="w-5 h-5" /> X (Twitter)でログイン</button>
        </div>
      </div>
    </div>
  );
};

/* --- リクエストモーダル (型定義追加) --- */
type RequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  pageOwnerId: string;
  viewer: User;
  userRequests: RequestData[];
  profile: Profile;
  showToast: (msg: string) => void;
};

const RequestModal = ({ isOpen, onClose, song, pageOwnerId, viewer, userRequests, profile, showToast }: RequestModalProps) => {
  const [name, setName] = useState(viewer.displayName || "");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const pendingCount = userRequests.filter((r:any) => r.requesterUid === viewer.uid && r.status === 'pending').length;
  const isLimitReached = pendingCount >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    vibrate(30);
    if (!song || isLimitReached) return;

    // ★No.2 NGワードチェック
    if (profile.ngKeywords && profile.ngKeywords.length > 0) {
      const combinedText = `${name} ${comment}`.toLowerCase();
      const hasNg = profile.ngKeywords.some((word: string) => combinedText.includes(word.toLowerCase()));
      if (hasNg) {
        alert("不適切な言葉が含まれているため送信できません。");
        return;
      }
    }

    setIsSending(true);
    try {
      await push(ref(db, `users/${pageOwnerId}/requests`), {
        songId: song.id, songTitle: song.title, requesterName: isAnonymous ? "匿名希望" : (name || "匿名"), requesterUid: viewer.uid, comment: comment, status: 'pending', createdAt: Date.now()
      });
      setIsSuccess(true);
      setTimeout(() => { showToast(`「${song.title}」をリクエストしました！`); onClose(); }, 2000); 
    } catch (error) { console.error(error); alert("送信に失敗しました"); setIsSending(false); }
  };

  if (!isOpen || !song) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl relative transition-all duration-500 overflow-hidden ${isSuccess ? "scale-105" : "animate-zoom"}`}>
        {isSuccess ? (
          <div className="text-center py-10 animate-in zoom-in duration-300">
            <div className="text-6xl mb-4 animate-bounce">🚀</div>
            <h2 className="text-2xl font-black text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">REQUEST SENT!</h2>
            <p className="text-slate-400">リクエストが届きました！</p>
          </div>
        ) : (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 active:scale-90 transition"><X className="w-6 h-6" /></button>
            <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-green-500/10 rounded-full text-green-400"><Mic2 className="w-6 h-6" /></div><div><h2 className="text-xl font-bold text-white">リクエスト</h2><p className="text-slate-400 text-xs">配信者に歌ってほしい曲を伝えよう</p></div></div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-6 flex items-start gap-4"><div className="p-2 bg-slate-700 rounded-lg"><Music2 className="w-5 h-5 text-slate-300" /></div><div><p className="text-xs text-slate-400 mb-1">Song Title</p><p className="font-bold text-white text-lg leading-tight">{song.title}</p><p className="text-sm text-slate-400 mt-1">{song.artist}</p></div></div>
            {isLimitReached ? (<div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-sm mb-4 flex gap-3 items-center animate-pulse"><AlertTriangle className="w-5 h-5 shrink-0 text-red-400" /><div><p className="font-bold text-red-400">上限に達しています</p><p className="text-xs opacity-70 mt-1">一度にリクエストできるのは3曲までです。</p></div></div>) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isAnonymous && (<div><label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">お名前</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-green-500 outline-none text-white transition-colors" placeholder="例: たろう" required /></div>)}
                <div><div className="flex justify-between items-center mb-1.5 ml-1"><label className="block text-xs font-bold text-slate-400 uppercase">コメント <span className="text-slate-600 font-normal normal-case">(任意)</span></label><div className="flex items-center gap-2 cursor-pointer" onClick={() => vibrate()}><input type="checkbox" id="anon" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 accent-green-500" /><label htmlFor="anon" className="text-xs text-slate-400 hover:text-white cursor-pointer select-none">匿名で送る</label></div></div><textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-green-500 outline-none text-white h-24 resize-none transition-colors" placeholder="一言応援メッセージなどをどうぞ！" /></div>
                <button type="submit" disabled={isSending} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 active:scale-95 group overflow-hidden relative">
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> リクエストを送る</>}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* --- ★No.14 履歴タブ --- */
const HistoryTab = ({ requests, viewer, isDarkMode }: any) => {
  const myRequests = requests.filter((r: RequestData) => r.requesterUid === viewer?.uid).sort((a: any, b: any) => b.createdAt - a.createdAt);
  
  if (!viewer) return <div className="text-center py-20 opacity-50"><p className="mb-4">履歴を見るにはログインが必要です</p><button onClick={() => (document.querySelector('header button:has(svg)') as HTMLElement)?.click()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">ログイン</button></div>;

  return (
    <div className={`p-6 rounded-3xl border animate-in fade-in slide-in-from-bottom-2 ${isDarkMode ? "bg-slate-900/60 border-slate-700" : "bg-white/70 border-white"}`}>
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><History className="w-6 h-6 text-purple-500" /> リクエスト履歴</h2>
      <div className="space-y-3">
        {myRequests.length === 0 ? <p className="text-slate-500 text-center py-10">履歴がありません</p> : 
          myRequests.map((req: RequestData) => (
            <div key={req.createdAt} className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-100"}`}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm mb-1 truncate">{req.songTitle}</p>
                <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded font-bold ${req.status === 'completed' ? 'bg-green-100 text-green-600' : req.status === 'accepted' ? 'bg-blue-100 text-blue-600' : req.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {req.status === 'completed' ? '完了' : req.status === 'accepted' ? '承認' : req.status === 'rejected' ? '却下' : '未読'}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  );
};

/* --- メインページ --- */
export default function PublicUserPage() {
  const router = useRouter();
  const [pageOwnerId, setPageOwnerId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<User | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRequests, setUserRequests] = useState<RequestData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'likes'>('likes'); 
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  
  // ★No.9 ムード検索 (タググループ)
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const [requestTarget, setRequestTarget] = useState<Song | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0); 
  
  // ★No.14 履歴タブを追加
  const [activeTab, setActiveTab] = useState<'songs' | 'queue' | 'gacha' | 'profile' | 'history'>('profile');
  
  const [gachaResults, setGachaResults] = useState<Song[]>([]); 
  const [gachaAnimating, setGachaAnimating] = useState(false);
  const [gachaPhase, setGachaPhase] = useState<'idle' | 'rolling' | 'capsule' | 'result'>('idle');
  const [showConfetti, setShowConfetti] = useState(false);

  const isRequestEnabled = profile?.isRequestEnabled !== false;
  const themeStyle = profile?.themeStyle || 'default'; 

  const showToast = (msg: string) => { setToastMessage(msg); vibrate(50); };
  const accentColor = themeStyle === 'neon' ? 'text-cyan-400' : themeStyle === 'retro' ? 'text-orange-600' : themeStyle === 'japanese' ? 'text-red-700' : themeStyle === 'glitch' ? 'text-green-500' : themeStyle === 'sakura' ? 'text-pink-500' : themeStyle === 'summer' ? 'text-cyan-500' : themeStyle === 'halloween' ? 'text-orange-500' : 'text-blue-500';

  /* ★修正: useCallback でラップし、RequestModalへ渡す際の再生成を抑制 */
  const handleRequestComplete = useCallback(() => {
    setRequestTarget(null);
  }, []);

  useEffect(() => { 
    if (typeof window !== "undefined") { 
      const pathSegments = window.location.pathname.split('/'); const id = pathSegments[pathSegments.length - 1]; if (id && id !== 'user') setPageOwnerId(id); 
      window.addEventListener("scroll", () => setScrollY(window.scrollY));
    } 
    const unsubscribe = onAuthStateChanged(auth, (user) => setViewer(user)); 
    return () => unsubscribe(); 
  }, []);

  useEffect(() => {
    if (!pageOwnerId) return;
    get(ref(db, `users/${pageOwnerId}/profile`)).then((snap) => {
      setProfile(snap.val());
      if (snap.val()?.themeStyle === 'neon' || snap.val()?.themeStyle === 'glitch' || snap.val()?.themeStyle === 'halloween') setIsDarkMode(true);
    });
    onValue(ref(db, `users/${pageOwnerId}/songs`), (snapshot) => {
      const data = snapshot.val();
      setSongs(data ? Object.keys(data).map(key => ({ id: key, ...data[key], tags: data[key].tags ? Object.values(data[key].tags) : [] })) : []);
      setLoading(false);
    });
    onValue(ref(db, `users/${pageOwnerId}/settings/categories`), (snap) => setCategories(snap.val() || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"]));
    onValue(ref(db, `users/${pageOwnerId}/requests`), (snap) => setUserRequests(snap.val() ? Object.values(snap.val()) : []));
  }, [pageOwnerId]);

  const handleLike = (songId: string, e: React.MouseEvent) => { 
    if (!pageOwnerId) return; 
    runTransaction(ref(db, `users/${pageOwnerId}/songs/${songId}/likes`), (c) => (c || 0) + 1);
  };

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const searchNorm = normalizeText(keyword);
      const tags = song.tags || [];
      const matchText = normalizeText(song.title).includes(searchNorm) || normalizeText(song.artist).includes(searchNorm) || normalizeText(song.category).includes(searchNorm) || (song.reading && normalizeText(song.reading).includes(searchNorm)) || tags.some(t => normalizeText(t).includes(searchNorm));
      
      let matchCat = true;
      if (selectedCategory === "REQUEST") matchCat = tags.includes("リクエスト");
      else if (selectedCategory === "PRACTICE") matchCat = tags.includes("練習中");
      else if (selectedCategory !== "ALL") matchCat = song.category === selectedCategory;
      if (selectedCategory !== "PRACTICE" && tags.includes("練習中")) return false;

      // ★No.9 ムード検索フィルタ
      let matchMood = true;
      if (selectedMood) {
        // 選択されたムード（タググループ名）に属するタグを持っているか
        const group = profile?.tagGroups?.find(g => g.name === selectedMood);
        if (group) matchMood = tags.some(t => group.tags.includes(t));
      }

      return matchText && matchCat && matchMood;
    });
  }, [songs, keyword, selectedCategory, selectedMood, profile?.tagGroups]);

  const sortedSongs = useMemo(() => {
    return [...filteredSongs].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; 
      if (sortBy === 'likes') { if (b.likes !== a.likes) return b.likes - a.likes; return b.createdAt - a.createdAt; }
      return b.createdAt - a.createdAt;
    });
  }, [filteredSongs, sortBy]);

  const drawGacha = (count: number = 1) => {
    const targets = selectedCategory === "ALL" ? songs : songs.filter((s:any) => s.category === selectedCategory);
    if (targets.length === 0) return alert("このカテゴリには曲がありません！");
    vibrate(20); setGachaResults([]); setGachaAnimating(true); setGachaPhase('rolling');
    setTimeout(() => {
      setGachaPhase('capsule');
      setTimeout(() => {
        const results = []; for(let i=0; i<count; i++) results.push(targets[Math.floor(Math.random() * targets.length)]);
        setGachaResults(results); setGachaPhase('result'); setGachaAnimating(false); vibrate(50);
      }, 1500);
    }, 1000);
  };

  const getRankIcon = (index: number) => { if (sortBy !== 'likes') return null; if (index === 0) return <span className="absolute -top-3 -left-3 text-3xl drop-shadow-md animate-bounce delay-100">👑</span>; if (index === 1) return <span className="absolute -top-3 -left-3 text-3xl drop-shadow-md">🥈</span>; if (index === 2) return <span className="absolute -top-3 -left-3 text-3xl drop-shadow-md">🥉</span>; return null; };
  const isLongTimeNoSee = (timestamp?: number) => { if (!timestamp) return false; const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000); return timestamp < threeMonthsAgo; };
  const handleRequestClick = (song: Song) => { vibrate(10); if (!isRequestEnabled) { alert("現在リクエストの受付は停止中です🙇‍♂️"); return; } if (!viewer) { if (window.confirm("リクエストにはログインが必要です。ログインしますか？")) { setIsLoginModalOpen(true); } return; } setRequestTarget(song); };
  const handleCopyText = (text: string) => { navigator.clipboard.writeText(text); showToast("コピーしました！"); };
  const handleShare = async () => { if (navigator.share) { try { await navigator.share({ title: profile?.displayName || "SongList", text: "歌枠のリクエストはこちらから！", url: window.location.href }); } catch (e) { console.error(e); } } else { navigator.clipboard.writeText(window.location.href); showToast("URLをコピーしました！"); } };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollPercentage = typeof window !== 'undefined' ? Math.min(scrollY / (document.body.scrollHeight - window.innerHeight) * 100, 100) : 0;

  if (!pageOwnerId && !loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>;

  const currentTheme = THEME_STYLES[themeStyle] || THEME_STYLES.default;
  const bgClass = isDarkMode ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800";
  const headerClass = isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-white/80 border-slate-200";
  const fontFamilyClass = profile?.fontFamily === 'serif' ? 'font-serif' : profile?.fontFamily === 'rounded' ? 'font-rounded' : profile?.fontFamily === 'handwritten' ? 'font-[cursive]' : '';

  return (
    <div className={`min-h-screen pb-32 transition-colors duration-500 selection:bg-blue-500/30 ${bgClass} ${fontFamilyClass}`}>
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000`} style={{ opacity: profile?.backgroundOpacity ?? (isDarkMode ? 0.5 : 0.9) }}>
        {profile?.backgroundImage ? (<div className="absolute inset-0 bg-cover bg-center blur-sm scale-110" style={{ backgroundImage: `url(${profile.backgroundImage})` }} />) : (<div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.bg}`} />)}
        <div className={`absolute inset-0 ${isDarkMode ? "bg-black" : "bg-white"}`} style={{ opacity: profile?.overlayOpacity ?? (isDarkMode ? 0.3 : 0.1) }} />
      </div>
      
      <FloatingParticles theme={themeStyle} /> 
      <RippleEffect /> 
      <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 z-[60] transition-all duration-100 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${scrollPercentage}%` }}></div>

      <header className={`backdrop-blur-xl border-b sticky top-0 z-50 transition-all duration-300 ${headerClass} ${scrollY > 50 ? "shadow-lg py-0" : "py-1"}`}>
        <div className="max-w-5xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={scrollToTop}>
            <Music className={`w-5 h-5 transition-colors ${accentColor}`} />
            <h1 className="font-bold hidden xs:block tracking-tight">Song List</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* ★No.28 スケジュール表示 */}
            {profile?.schedule && <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border animate-pulse ${isDarkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}><Calendar className="w-3 h-3" /> {profile.schedule}</div>}
            
            <button onClick={() => { vibrate(); setIsDarkMode(!isDarkMode); }} className="p-2 rounded-full hover:bg-slate-500/10 transition active:scale-90 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
            {viewer ? (
              <div className="flex items-center gap-2">
                {pageOwnerId && viewer.uid === pageOwnerId && (
                  <button onClick={() => router.push('/dashboard')} className={`text-xs font-bold px-4 py-2 rounded-full transition-transform active:scale-95 shadow-lg flex items-center gap-1.5 ${isDarkMode ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                    <LayoutTemplate className="w-3 h-3" /> <span className="hidden sm:inline">管理</span>
                  </button>
                )}
                <div className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-colors ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                  {viewer.photoURL ? <img src={viewer.photoURL} className="w-6 h-6 rounded-full" /> : <UserIcon className="w-6 h-6 p-1 rounded-full bg-slate-500" />}
                  <button onClick={() => signOut(auth)} className="ml-1 text-slate-400 hover:text-red-400 transition active:scale-90"><LogOut className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className={`text-xs font-bold px-4 py-2 rounded-full transition-transform active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-500`}><LogIn className="w-3 h-3" /> ログイン</button>
            )}
            {(!viewer || (pageOwnerId && viewer.uid !== pageOwnerId)) && (<Link href="/" className={`text-xs font-bold px-3 py-2 rounded-full transition-colors active:scale-95 ${isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-600"}`}>作成</Link>)}
          </div>
        </div>
      </header>

      {profile?.announcement?.active && profile.announcement.text && (
        <div className="bg-yellow-400 text-yellow-900 font-bold text-center py-2 px-4 text-xs md:text-sm animate-in slide-in-from-top-4 relative z-40 shadow-md flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <Megaphone className="w-3.5 h-3.5 inline-block" />{profile.announcement.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {activeTab === 'profile' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in slide-in-from-bottom-4">
            <div className={`w-full max-w-lg text-center mb-8 border rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl ${isDarkMode ? "bg-slate-900/60 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
              <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20"></div>
              <div className={`relative inline-block mb-6 rounded-full p-2 ring-4 shadow-xl ${isDarkMode ? "bg-slate-800 ring-slate-800" : "bg-white ring-white"}`} onClick={() => { if(profile?.avatarUrl) window.open(profile.avatarUrl, '_blank') }}>
                <ImageWithFallback src={profile?.avatarUrl} alt="Icon" className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover transition-transform hover:scale-105 cursor-zoom-in" fallback={<div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center bg-slate-100 rounded-full"><UserIcon className={`w-16 h-16 ${accentColor}`} /></div>} />
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight drop-shadow-sm">{profile?.displayName}</h1>
              <p className="text-sm md:text-base max-w-sm mx-auto mb-8 opacity-80 whitespace-pre-wrap leading-relaxed">{profile?.bio}</p>
              
              <div className="flex justify-center gap-4 mb-10 flex-wrap">
                {profile?.twitter && <a href={`https://twitter.com/${profile.twitter}`} target="_blank" className={`p-3.5 rounded-full transition-all hover:scale-110 active:scale-90 shadow-sm ${isDarkMode ? "bg-slate-800 text-blue-400 hover:bg-slate-700" : "bg-white text-blue-500 hover:bg-blue-50"}`}><Twitter className="w-6 h-6" /></a>}
                {profile?.youtube && <a href={`https://youtube.com/${profile.youtube}`} target="_blank" className={`p-3.5 rounded-full transition-all hover:scale-110 active:scale-90 shadow-sm ${isDarkMode ? "bg-slate-800 text-red-400 hover:bg-slate-700" : "bg-white text-red-500 hover:bg-red-50"}`}><Youtube className="w-6 h-6" /></a>}
                {profile?.twitch && <a href={`https://twitch.tv/${profile.twitch}`} target="_blank" className={`p-3.5 rounded-full transition-all hover:scale-110 active:scale-90 shadow-sm ${isDarkMode ? "bg-slate-800 text-purple-400 hover:bg-slate-700" : "bg-white text-purple-500 hover:bg-purple-50"}`}><Twitch className="w-6 h-6" /></a>}
                {profile?.tiktok && <a href={`https://tiktok.com/@${profile.tiktok}`} target="_blank" className={`p-3.5 rounded-full transition-all hover:scale-110 active:scale-90 shadow-sm ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-50"}`}><Music2 className="w-6 h-6" /></a>}
                {profile?.otherUrl && <a href={profile.otherUrl} target="_blank" className={`p-3.5 rounded-full transition-all hover:scale-110 active:scale-90 shadow-sm ${isDarkMode ? "bg-slate-800 text-green-400 hover:bg-slate-700" : "bg-white text-green-500 hover:bg-green-50"}`}><LinkIcon className="w-6 h-6" /></a>}
              </div>

              <div className="flex flex-col gap-4">
                <button onClick={() => { setActiveTab('songs'); vibrate(20); }} className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30`}>
                  <ListMusic className="w-6 h-6" /> 曲リストを見る
                </button>
                <div className="flex gap-3">
                  <button onClick={() => { setActiveTab('gacha'); vibrate(); }} className={`flex-1 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-white hover:bg-slate-50 text-slate-600"}`}>
                    <Dice5 className="w-5 h-5 text-yellow-500" /> ガチャを回す
                  </button>
                  <button onClick={handleShare} className={`flex-1 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-white hover:bg-slate-50 text-slate-600"}`}>
                    <Share2 className="w-5 h-5 text-green-500" /> シェアする
                  </button>
                </div>
              </div>
              <div className="mt-8 text-[10px] text-slate-500 opacity-50 font-medium">Powered by SongList SaaS</div>
            </div>
          </div>
        )}
        
        {activeTab === 'songs' && (
          <>
            <div className={`p-2 rounded-2xl border shadow-lg backdrop-blur-xl mb-6 sticky top-16 md:top-20 z-40 transition-all ${isDarkMode ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-white/50"}`}>
              <div className="relative mb-2">
                <input type="text" placeholder="曲名、アーティスト、ひらがな検索..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full pl-12 pr-10 py-3 md:py-3.5 rounded-xl bg-transparent outline-none font-bold transition-all ${isDarkMode ? "text-white placeholder:text-slate-500 focus:bg-slate-800" : "text-slate-800 placeholder:text-slate-400 focus:bg-slate-50"}`} />
                <Filter className="absolute left-4 top-3.5 w-5 h-5 opacity-40 pointer-events-none" />
                {keyword && <button onClick={() => { setKeyword(""); vibrate(); }} className="absolute right-3 top-3 p-1 rounded-full bg-slate-500/20 text-slate-400 hover:text-slate-600 hover:bg-slate-500/40"><X className="w-4 h-4" /></button>}
              </div>
              
              {/* ★No.7, No.9 ムード検索UI */}
              {profile?.tagGroups && profile.tagGroups.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 px-1 mb-2 scrollbar-hide border-b border-dashed border-slate-200/20">
                  <span className="text-[10px] font-bold opacity-50 self-center whitespace-nowrap">Mood:</span>
                  <button onClick={() => setSelectedMood(null)} className={`text-xs px-3 py-1 rounded-full border transition ${!selectedMood ? "bg-blue-500 text-white border-blue-500" : "opacity-50"}`}>All</button>
                  {profile.tagGroups.map(g => (
                    <button key={g.name} onClick={() => setSelectedMood(g.name === selectedMood ? null : g.name)} className={`text-xs px-3 py-1 rounded-full border transition whitespace-nowrap ${g.name === selectedMood ? "bg-purple-500 text-white border-purple-500" : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")}`}>
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
                {[{id: "ALL", label: "すべて", icon: <ListMusic className="w-3 h-3" />}, {id: "REQUEST", label: "リクエスト中", icon: <Mic2 className="w-3 h-3" />}, {id: "PRACTICE", label: "練習中", icon: <Loader2 className="w-3 h-3" />}, ...categories.map(c => ({id: c, label: c, icon: <Music2 className="w-3 h-3" />}))].map(cat => (
                  <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); vibrate(5); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${selectedCategory === cat.id ? `bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-105` : (isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}`}>{cat.icon} {cat.label}</button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-end mb-4 px-2">
              <h3 className={`font-bold text-lg ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Songs <span className="text-xs opacity-60 ml-1">{sortedSongs.length}曲</span></h3>
              <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg">
                  <button onClick={() => setSortBy('likes')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${sortBy === 'likes' ? (isDarkMode ? "bg-slate-700 text-white shadow" : "bg-white text-slate-800 shadow") : "opacity-50 hover:opacity-100"}`}>人気順</button>
                  <button onClick={() => setSortBy('newest')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${sortBy === 'newest' ? (isDarkMode ? "bg-slate-700 text-white shadow" : "bg-white text-slate-800 shadow") : "opacity-50 hover:opacity-100"}`}>新着順</button>
              </div>
            </div>

            <div className="min-h-[50vh]">
              {loading ? ( <SkeletonLoader isDarkMode={isDarkMode} /> ) : sortedSongs.length === 0 ? <div className={`text-center py-16 rounded-3xl border border-dashed ${isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-white/50 border-slate-300"}`}><p className="opacity-50 font-bold">条件に一致する曲がありません 😢</p></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {sortedSongs.map((song, index) => {
                    const isExpanded = expandedSongId === song.id;
                    return (
                      <div key={song.id} className={`group relative border rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards ${isExpanded ? "ring-2 ring-blue-500 shadow-xl scale-[1.01] z-10" : "hover:-translate-y-1 hover:shadow-lg"} ${isDarkMode ? "bg-slate-900/80 border-slate-800 hover:border-slate-600" : "bg-white border-slate-100 hover:border-blue-200"}`} style={{ animationDelay: `${index * 50}ms` }} onClick={() => { vibrate(5); setExpandedSongId(isExpanded ? null : song.id); }}>
                        {getRankIcon(index)}
                        {index < 5 && song.createdAt > Date.now() - 7*86400000 && <span className="absolute top-2 right-2 text-xs animate-pulse">🔥</span>}
                        <div className="p-5 flex flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                {song.isPinned && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200 shadow-sm">固定</span>}
                                {song.tags?.includes("リクエスト") && <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 shadow-sm animate-pulse">募集中</span>}
                              </div>
                              <div className={`text-lg font-bold line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>{song.title}</div>
                              <div className="text-sm opacity-70 truncate font-medium mt-1">{song.artist}</div>
                              
                              {/* ★No.1 練習進捗バー (練習中の場合のみ表示) */}
                              {song.tags?.includes("練習中") && song.practiceRate !== undefined && (
                                <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${song.practiceRate}%` }}></div>
                                </div>
                              )}
                            </div>
                            <div className={`p-2.5 rounded-full transition-all duration-300 ${isExpanded ? "bg-blue-500 text-white rotate-180 shadow-md" : (isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400")}`}><ChevronDown className="w-5 h-5" /></div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                             <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold tracking-wide border ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>{song.category}</span>
                             {song.key && <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold border flex items-center gap-1 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}><Music2 className="w-3 h-3" /> {song.key}</span>}
                          </div>
                        </div>

                        <div className={`px-5 bg-slate-50/50 dark:bg-black/20 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"} overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96 py-5 opacity-100" : "max-h-0 py-0 opacity-0"}`}>
                          <div className="flex flex-col gap-4">
                            <div className="flex gap-3">
                              <button onClick={(e) => { e.stopPropagation(); handleRequestClick(song); }} disabled={!isRequestEnabled} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold transition-all text-sm shadow-md active:scale-95 ${isRequestEnabled ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:brightness-110 shadow-green-500/20" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}>{isRequestEnabled ? <><Mic2 className="w-4 h-4" /> リクエストする</> : "受付停止中"}</button>
                              <LikeButtonWithCombo likes={song.likes} onClick={(e: any) => handleLike(song.id, e)} isDarkMode={isDarkMode} theme={themeStyle} />
                            </div>
                            {(song.memo || song.reading) && (<div className={`p-4 rounded-xl text-sm leading-relaxed ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600 border border-slate-100"}`}>{song.reading && <div className="text-slate-400 text-xs mb-1.5 font-bold">よみ: {song.reading}</div>}{song.memo && <div className="flex gap-2"><FileText className="w-4 h-4 mt-0.5 shrink-0 opacity-50" /> <span>{song.memo}</span></div>}</div>)}
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              <button onClick={(e) => { e.stopPropagation(); handleCopyText(`${song.title} / ${song.artist}`); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:opacity-80 active:scale-95 transition whitespace-nowrap"><Copy className="w-3.5 h-3.5" /> コピー</button>
                              {song.lyricsUrl && <a href={song.lyricsUrl} target="_blank" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-300 hover:opacity-80 active:scale-95 transition whitespace-nowrap"><LinkIcon className="w-3.5 h-3.5" /> 歌詞</a>}
                              {song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-xs font-bold text-red-600 dark:text-red-300 hover:opacity-80 active:scale-95 transition whitespace-nowrap"><Youtube className="w-3.5 h-3.5" /> 動画</a>}
                            </div>
                            <div className="text-[10px] text-slate-400 text-right">{song.lastSungAt && <span>前回: {new Date(song.lastSungAt).toLocaleDateString()} / </span>}{isLongTimeNoSee(song.lastSungAt) && <span className="text-orange-400 font-bold">お久しぶり！</span>}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'queue' && (
          <div className={`p-6 rounded-3xl border animate-in fade-in slide-in-from-bottom-2 ${isDarkMode ? "bg-slate-900/60 border-slate-700" : "bg-white/70 border-white"}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare className="w-6 h-6 text-green-500" /> みんなのリクエスト</h2>
            <div className="space-y-3">
              {userRequests.filter(r => r.status === 'pending').length === 0 ? <p className="text-slate-500 text-center py-10">現在リクエストはありません</p> : 
                userRequests.filter(r => r.status === 'pending').sort((a,b) => b.createdAt - a.createdAt).map((req, i) => (
                  <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-100"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-sm mb-1 truncate">{req.songTitle}</p><p className="text-xs text-slate-500 truncate">by {req.requesterName}</p>{req.comment && <div className={`text-xs mt-2 p-2 rounded-lg italic truncate ${isDarkMode ? "bg-slate-900/50 text-slate-400" : "bg-slate-50 text-slate-500"}`}>"{req.comment}"</div>}</div>
                    <span className="text-[10px] text-slate-500 opacity-60 shrink-0">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ★No.14 履歴タブ */}
        {activeTab === 'history' && <HistoryTab requests={userRequests} viewer={viewer} isDarkMode={isDarkMode} />}

        {activeTab === 'gacha' && (
          <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in duration-300">
            <div className={`w-full max-w-sm p-8 rounded-[2.5rem] text-center relative border shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10 pointer-events-none" />
              <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-2"><Dice5 className="w-8 h-8 text-yellow-500 animate-bounce" /> GACHA</h2>
              <p className="text-slate-400 text-xs mb-8">今日の運命の一曲を見つけよう</p>
              
              <div className="min-h-[220px] flex items-center justify-center mb-6 relative">
                {gachaPhase === 'idle' && <div className="opacity-30"><Music className="w-24 h-24 mx-auto" /></div>}
                {gachaPhase === 'rolling' && <div className="text-center"><Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-4" /><p className="font-bold animate-pulse">抽選中...</p></div>}
                {gachaPhase === 'capsule' && <div className="text-6xl animate-bounce">💊</div>}
                {gachaPhase === 'result' && (
                  <div className="w-full animate-in zoom-in">
                    {gachaResults.length === 1 ? (
                      <>
                        <div className="mb-2 text-xs font-bold text-yellow-400 uppercase tracking-wider border border-yellow-400/30 rounded-full px-3 py-1 inline-block bg-yellow-400/10 animate-pulse">Result</div>
                        <p className="text-sm text-slate-400 mb-2">{gachaResults[0].artist}</p>
                        <p className="text-2xl font-black mb-6 leading-tight drop-shadow-md">{gachaResults[0].title}</p>
                        <button onClick={() => handleRequestClick(gachaResults[0])} disabled={!isRequestEnabled} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-500 transition active:scale-95 flex items-center justify-center gap-2"><Mic2 className="w-4 h-4" /> この曲をリクエスト！</button>
                      </>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {gachaResults.map((res, i) => (
                          <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-left">
                            <span className="text-xs font-bold text-white truncate flex-1">{res.title}</span>
                            <button onClick={() => handleRequestClick(res)} className="text-[10px] bg-blue-600 px-2 py-1 rounded text-white ml-2">Req</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {gachaPhase === 'result' && <Confetti />} 
              </div>

              <div className="space-y-3 relative z-10">
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={gachaAnimating} className={`w-full p-3.5 rounded-xl border text-sm outline-none cursor-pointer ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <option value="ALL">✨ すべてのカテゴリー</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => drawGacha(1)} disabled={gachaAnimating} className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${gachaResults.length > 0 ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-orange-500/30 hover:brightness-110"}`}>1回引く</button>
                  <button onClick={() => drawGacha(10)} disabled={gachaAnimating} className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/30 hover:brightness-110`}>10連!</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`fixed bottom-20 right-4 z-40 transition-all duration-500 ${scrollY > 100 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
         <button onClick={scrollToTop} className={`p-3 rounded-full shadow-lg transition active:scale-90 ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500"}`}><ArrowUp className="w-5 h-5" /></button>
      </div>

      <div className={`fixed bottom-0 left-0 w-full border-t z-50 px-2 pb-safe-area backdrop-blur-xl transition-colors duration-300 ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"}`}>
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <BottomNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserCircle} label="プロフィール" />
          <BottomNavButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="リスト" />
          <BottomNavButton active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} icon={MessageSquare} label="リクエスト" badge={userRequests.filter(r => r.status === 'pending').length} />
          {/* ★No.14 履歴タブボタン追加 */}
          <BottomNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="履歴" />
          <BottomNavButton active={activeTab === 'gacha'} onClick={() => setActiveTab('gacha')} icon={Dice5} label="ガチャ" />
        </div>
      </div>

      {viewer && requestTarget && pageOwnerId && profile && <RequestModal isOpen={!!requestTarget} song={requestTarget} onClose={handleRequestComplete} pageOwnerId={pageOwnerId} viewer={viewer} userRequests={userRequests} profile={profile} showToast={showToast} />}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}