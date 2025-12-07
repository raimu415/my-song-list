"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db, auth, googleProvider, twitterProvider } from "@/lib/firebase"; 
import { ref, onValue, runTransaction, get, push } from "firebase/database";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  Music, Heart, User as UserIcon, Share2, Twitter, Filter, Loader2, Mic2, 
  X, Send, LogIn, LogOut, Music2, FileText, Dice5, Trophy, AlertTriangle, Sun, Moon,
  Youtube, Twitch, Clock, CalendarDays, RefreshCw, ChevronDown, MessageSquare, Sparkles, Link as LinkIcon,
  Megaphone, ListMusic, UserCircle
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
  lastSungAt?: number;
  likes: number;
  createdAt: number;
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
  isRequestEnabled?: boolean;
  announcement?: { text: string; active: boolean };
  tagColors?: Record<string, string>;
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

const normalizeText = (text: string) => {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[\u3041-\u3096]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60));
};

const COLOR_PALETTE: Record<string, string> = {
  gray: "bg-slate-100 text-slate-500 border-slate-200",
  blue: "bg-blue-100 text-blue-600 border-blue-200",
  red: "bg-red-100 text-red-600 border-red-200",
  green: "bg-green-100 text-green-600 border-green-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  purple: "bg-purple-100 text-purple-600 border-purple-200",
  pink: "bg-pink-100 text-pink-600 border-pink-200",
  orange: "bg-orange-100 text-orange-600 border-orange-200",
};

/* --- UI Components --- */
const BottomNavButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 ${
      active ? "text-blue-500 scale-105" : "text-slate-400 hover:text-slate-600"
    }`}
  >
    <div className="relative">
      <Icon className={`w-6 h-6 mb-1 ${active ? "fill-current" : ""}`} />
      {badge > 0 && (
        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full border-2 border-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className="text-[9px] font-bold">{label}</span>
  </button>
);

/* --- ログインモーダル --- */
const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  const handleLogin = async (provider: any) => { try { await signInWithPopup(auth, provider); onClose(); } catch (error) { console.error(error); alert("ログインに失敗しました"); } };
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-sm p-8 text-center relative shadow-2xl animate-zoom">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X className="w-6 h-6" /></button>
        <div className="mb-6 inline-flex p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><LogIn className="w-8 h-8" /></div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">ログインしてリクエスト</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">お気に入りの曲をリクエストして、<br/>配信を盛り上げましょう！</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => handleLogin(googleProvider)} className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-blue-100 hover:bg-blue-50 text-slate-700 font-bold py-3.5 rounded-2xl transition-all duration-300 group"><img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 group-hover:scale-110 transition-transform" /> Googleでログイン</button>
          <button onClick={() => handleLogin(twitterProvider)} className="flex items-center justify-center gap-3 bg-black hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-900/20"><Twitter className="w-5 h-5" /> X (Twitter)でログイン</button>
        </div>
      </div>
    </div>
  );
};

/* --- リクエストモーダル --- */
const RequestModal = ({ isOpen, onClose, song, pageOwnerId, viewer, userRequests, profile }: any) => {
  const [name, setName] = useState(viewer.displayName || "");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const pendingCount = userRequests.filter((r:any) => r.requesterUid === viewer.uid && r.status === 'pending').length;
  const isLimitReached = pendingCount >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song) return;
    if (profile.ngUsers && profile.ngUsers[viewer.uid]) return alert("リクエストを送信できませんでした。(配信者設定により制限されています)");
    const currentPending = userRequests.filter((r:any) => r.requesterUid === viewer.uid && r.status === 'pending').length;
    if (currentPending >= 3) return alert("リクエスト上限(3曲)に達しています。消化されるのをお待ちください。");
    setIsSending(true);
    try {
      await push(ref(db, `users/${pageOwnerId}/requests`), {
        songId: song.id, songTitle: song.title, requesterName: isAnonymous ? "匿名希望" : (name || "匿名"), requesterUid: viewer.uid, comment: comment, status: 'pending', createdAt: Date.now()
      });
      alert(`「${song.title}」をリクエストしました！`); onClose();
    } catch (error) { console.error(error); alert("送信に失敗しました"); } finally { setIsSending(false); }
  };

  if (!isOpen || !song) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-green-500/10 rounded-full text-green-400"><Mic2 className="w-6 h-6" /></div><div><h2 className="text-xl font-bold text-white">リクエスト</h2><p className="text-slate-400 text-xs">配信者に歌ってほしい曲を伝えよう</p></div></div>
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-6 flex items-start gap-4"><div className="p-2 bg-slate-700 rounded-lg"><Music2 className="w-5 h-5 text-slate-300" /></div><div><p className="text-xs text-slate-400 mb-1">Song Title</p><p className="font-bold text-white text-lg leading-tight">{song.title}</p><p className="text-sm text-slate-400 mt-1">{song.artist}</p></div></div>
        {isLimitReached ? (<div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-sm mb-4 flex gap-3 items-center"><AlertTriangle className="w-5 h-5 shrink-0 text-red-400" /><div><p className="font-bold text-red-400">上限に達しています</p><p className="text-xs opacity-70 mt-1">一度にリクエストできるのは3曲までです。</p></div></div>) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isAnonymous && (<div><label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">お名前</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-green-500 outline-none text-white transition-colors" placeholder="例: たろう" required /></div>)}
            <div><div className="flex justify-between items-center mb-1.5 ml-1"><label className="block text-xs font-bold text-slate-400 uppercase">コメント <span className="text-slate-600 font-normal normal-case">(任意)</span></label><div className="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="anon" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 accent-green-500" /><label htmlFor="anon" className="text-xs text-slate-400 hover:text-white cursor-pointer select-none">匿名で送る</label></div></div><textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-green-500 outline-none text-white h-24 resize-none transition-colors" placeholder="一言応援メッセージなどをどうぞ！" /></div>
            <button type="submit" disabled={isSending} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">{isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> リクエストを送る</>}</button>
          </form>
        )}
      </div>
    </div>
  );
};

/* --- メインページ --- */
export default function PublicUserPage() {
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
  
  const [requestTarget, setRequestTarget] = useState<Song | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // ★画面切り替え用
  const [activeTab, setActiveTab] = useState<'songs' | 'queue' | 'gacha' | 'profile'>('songs');
  const [gachaResult, setGachaResult] = useState<Song | null>(null); // ガチャ用
  const [gachaAnimating, setGachaAnimating] = useState(false);

  const isRequestEnabled = profile?.isRequestEnabled !== false;

  const themeColors: {[key: string]: string} = {
    blue: "text-blue-500 border-blue-500 bg-blue-500 shadow-blue-500/30",
    pink: "text-pink-500 border-pink-500 bg-pink-500 shadow-pink-500/30",
    green: "text-emerald-500 border-emerald-500 bg-emerald-500 shadow-emerald-500/30",
    purple: "text-purple-500 border-purple-500 bg-purple-500 shadow-purple-500/30",
    orange: "text-orange-500 border-orange-500 bg-orange-500 shadow-orange-500/30",
  };
  const currentTheme = profile?.themeColor || "blue";
  const accentText = themeColors[currentTheme].split(" ")[0];
  const accentBg = themeColors[currentTheme].split(" ")[2];
  const accentShadow = themeColors[currentTheme].split(" ")[3];

  useEffect(() => { if (typeof window !== "undefined") { const pathSegments = window.location.pathname.split('/'); const id = pathSegments[pathSegments.length - 1]; if (id && id !== 'user') setPageOwnerId(id); } const unsubscribe = onAuthStateChanged(auth, (user) => setViewer(user)); return () => unsubscribe(); }, []);
  useEffect(() => {
    if (!pageOwnerId) return;
    get(ref(db, `users/${pageOwnerId}/profile`)).then((snap) => setProfile(snap.val()));
    const songsRef = ref(db, `users/${pageOwnerId}/songs`);
    const unsubSongs = onValue(songsRef, (snapshot) => {
      const data = snapshot.val();
      setSongs(data ? Object.keys(data).map(key => ({ id: key, ...data[key], tags: data[key].tags ? Object.values(data[key].tags) : [] })) : []);
      setLoading(false);
    });
    const catRef = ref(db, `users/${pageOwnerId}/settings/categories`);
    const unsubCat = onValue(catRef, (snap) => setCategories(snap.val() || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"]));
    const reqRef = ref(db, `users/${pageOwnerId}/requests`);
    const unsubReq = onValue(reqRef, (snap) => setUserRequests(snap.val() ? Object.values(snap.val()) : []));
    return () => { unsubSongs(); unsubCat(); unsubReq(); };
  }, [pageOwnerId]);

  const handleLike = (songId: string) => { if (!pageOwnerId) return; runTransaction(ref(db, `users/${pageOwnerId}/songs/${songId}/likes`), (c) => (c || 0) + 1); };

  const filteredSongs = songs.filter((song) => {
    const searchNorm = normalizeText(keyword);
    const tags = song.tags || [];
    const matchText = normalizeText(song.title).includes(searchNorm) || normalizeText(song.artist).includes(searchNorm) || normalizeText(song.category).includes(searchNorm) || (song.reading && normalizeText(song.reading).includes(searchNorm)) || tags.some(t => normalizeText(t).includes(searchNorm));
    let matchCat = true;
    if (selectedCategory === "REQUEST") matchCat = tags.includes("リクエスト");
    else if (selectedCategory === "PRACTICE") matchCat = tags.includes("練習中");
    else if (selectedCategory !== "ALL") matchCat = song.category === selectedCategory;
    if (selectedCategory !== "PRACTICE" && tags.includes("練習中")) return false;
    return matchText && matchCat;
  });

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortBy === 'likes') { if (b.likes !== a.likes) return b.likes - a.likes; return b.createdAt - a.createdAt; }
    return b.createdAt - a.createdAt;
  });

  const drawGacha = () => {
    const targets = selectedCategory === "ALL" ? songs : songs.filter((s:any) => s.category === selectedCategory);
    if (targets.length === 0) return alert("このカテゴリには曲がありません！");
    setGachaResult(null); setGachaAnimating(true);
    setTimeout(() => { const random = targets[Math.floor(Math.random() * targets.length)]; setGachaResult(random); setGachaAnimating(false); }, 1500);
  };

  const getRankIcon = (index: number) => { if (sortBy !== 'likes') return null; if (index === 0) return <span className="absolute -top-3 -left-3 text-3xl drop-shadow-md animate-bounce delay-100">👑</span>; if (index === 1) return <span className="absolute -top-3 -left-3 text-3xl drop-shadow-md">🥈</span>; if (index === 2) return <span className="absolute -top-3 -left-3 text-3xl drop-shadow-md">🥉</span>; return null; };
  const isLongTimeNoSee = (timestamp?: number) => { if (!timestamp) return false; const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000); return timestamp < threeMonthsAgo; };
  const handleRequestClick = (song: Song) => { if (!isRequestEnabled) { alert("現在リクエストの受付は停止中です🙇‍♂️"); return; } if (!viewer) { if (window.confirm("リクエストにはログインが必要です。ログインしますか？")) { setIsLoginModalOpen(true); } return; } setRequestTarget(song); };

  if (!pageOwnerId && !loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>;

  const bgClass = isDarkMode ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800";
  const headerClass = isDarkMode ? "bg-slate-950/90 border-slate-800" : "bg-white/90 border-slate-200";

  return (
    <div className={`min-h-screen font-sans pb-32 transition-colors duration-500 selection:bg-blue-500/30 ${bgClass} ${profile?.fontFamily === 'serif' ? 'font-serif' : profile?.fontFamily === 'rounded' ? 'font-rounded' : ''}`}>
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${isDarkMode ? "opacity-30" : "opacity-60"}`}>{profile?.backgroundImage ? (<div className="absolute inset-0 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${profile.backgroundImage})` }} />) : (<div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? "from-slate-900 via-slate-900 to-slate-950" : "from-blue-50 via-white to-pink-50"}`} />)}<div className={`absolute inset-0 ${isDarkMode ? "bg-black/60" : "bg-white/40"}`} /></div>
      
      {/* Header */}
      <header className={`backdrop-blur-md border-b sticky top-0 z-50 transition-all duration-300 ${headerClass}`}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <Music className={`w-5 h-5 transition-colors ${accentText}`} />
            <h1 className="font-bold hidden xs:block tracking-tight">Song List</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-slate-500/10 transition active:scale-95 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
            {viewer ? (
              <div className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-colors ${isDarkMode ? "bg-slate-800/80 border-slate-700 hover:border-slate-600" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"}`}>
                {viewer.photoURL ? <img src={viewer.photoURL} className="w-6 h-6 rounded-full" /> : <UserIcon className="w-6 h-6 p-1 rounded-full bg-slate-500" />}
                <button onClick={() => signOut(auth)} className="ml-1 text-slate-400 hover:text-red-400 transition"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className={`text-xs font-bold px-4 py-2 rounded-full transition-transform active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-1.5 text-white ${accentBg}`}><LogIn className="w-3 h-3" /> ログイン</button>
            )}
            <Link href="/" className={`text-xs font-bold px-4 py-2 rounded-full transition-colors ${isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-600"}`}>リスト作成</Link>
          </div>
        </div>
      </header>
      
      {profile?.announcement?.active && profile.announcement.text && (
        <div className="bg-yellow-400 text-yellow-900 font-bold text-center py-2 px-4 text-xs md:text-sm animate-in slide-in-from-top-4 relative z-40 shadow-md">
          <Megaphone className="w-3.5 h-3.5 inline-block mr-2" />{profile.announcement.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* --- Tab 1: Songs (Main) --- */}
        {activeTab === 'songs' && (
          <>
            <div className={`p-2 rounded-2xl border shadow-lg backdrop-blur-xl mb-6 sticky top-20 z-40 ${isDarkMode ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-white/50"}`}>
              <div className="relative mb-2"><input type="text" placeholder="曲名、アーティスト、ひらがな検索..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent outline-none font-bold transition-all ${isDarkMode ? "text-white placeholder:text-slate-500 focus:bg-slate-800" : "text-slate-800 placeholder:text-slate-400 focus:bg-slate-50"}`} /><Filter className="absolute left-4 top-3.5 w-5 h-5 opacity-40 pointer-events-none" /></div>
              <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">{[{id: "ALL", label: "すべて", icon: null}, {id: "REQUEST", label: "リクエスト中", icon: <Mic2 className="w-3 h-3" />}, {id: "PRACTICE", label: "練習中", icon: <Loader2 className="w-3 h-3" />}, ...categories.map(c => ({id: c, label: c, icon: null}))].map(cat => (<button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? `${accentBg} text-white shadow-md` : (isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}`}>{cat.icon} {cat.label}</button>))}</div>
            </div>

            <div className="flex justify-between items-end mb-4 px-2"><h3 className={`font-bold text-lg ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Songs <span className="text-xs opacity-60 ml-1">{sortedSongs.length}曲</span></h3><div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg"><button onClick={() => setSortBy('likes')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${sortBy === 'likes' ? (isDarkMode ? "bg-slate-700 text-white shadow" : "bg-white text-slate-800 shadow") : "opacity-50 hover:opacity-100"}`}>人気順</button><button onClick={() => setSortBy('newest')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${sortBy === 'newest' ? (isDarkMode ? "bg-slate-700 text-white shadow" : "bg-white text-slate-800 shadow") : "opacity-50 hover:opacity-100"}`}>新着順</button></div></div>

            <div className="min-h-[50vh]">
              {loading ? <div className="text-center py-20 opacity-50 animate-pulse"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /><p>Loading...</p></div> : sortedSongs.length === 0 ? <div className={`text-center py-16 rounded-3xl border border-dashed ${isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-white/50 border-slate-300"}`}><p className="opacity-50 font-bold">条件に一致する曲がありません 😢</p></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedSongs.map((song, index) => (
                    <div key={song.id} className={`group relative border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDarkMode ? "bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:shadow-blue-900/10" : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-blue-100"}`}>
                      {getRankIcon(index)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className={`text-base font-bold line-clamp-2 leading-snug group-hover:text-blue-500 transition-colors ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{song.title} {song.lyricsUrl && <a href={song.lyricsUrl} target="_blank" className="ml-1 inline-block text-slate-400 hover:text-blue-500 transition-colors" title="歌詞を見る"><FileText className="w-3.5 h-3.5" /></a>}</div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            {song.tags?.includes("リクエスト") && <span className="bg-green-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm shadow-green-500/20">リクエスト中</span>}
                            {song.tags?.includes("練習中") && <span className="bg-yellow-400 text-yellow-900 text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm shadow-yellow-400/20">練習中</span>}
                            {song.lastSungAt && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}><CalendarDays className="w-2.5 h-2.5" />{new Date(song.lastSungAt).toLocaleDateString()}</span>}
                            {isLongTimeNoSee(song.lastSungAt) && <span className="bg-slate-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> お久しぶり</span>}
                          </div>
                        </div>
                        <div className="text-sm opacity-60 mb-3 truncate font-medium flex items-center gap-1"><span className="w-1 h-4 bg-slate-300 rounded-full inline-block"></span>{song.artist}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>{song.category}</span>
                          {song.key && <span className={`text-[10px] px-2.5 py-1 rounded-lg border flex items-center gap-1 font-bold ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}><Music2 className="w-3 h-3" /> {song.key}</span>}
                          {song.tags && song.tags.map(tag => {
                            if (tag === "リクエスト" || tag === "練習中") return null;
                            const colorClass = profile?.tagColors?.[tag] ? COLOR_PALETTE[profile.tagColors[tag]] : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500");
                            return <span key={tag} className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${colorClass}`}>#{tag}</span>
                          })}
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 justify-end pt-3 border-t mt-1 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}><button onClick={() => handleRequestClick(song)} disabled={!isRequestEnabled} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all duration-200 text-xs active:scale-95 ${isRequestEnabled ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500 hover:to-emerald-500 text-green-600 hover:text-white border border-green-500/20 hover:border-transparent hover:shadow-lg hover:shadow-green-500/20" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"}`}>{isRequestEnabled ? <><Mic2 className="w-4 h-4" /> リクエスト</> : "受付停止中"}</button><button onClick={() => handleLike(song.id)} className={`flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] px-2 py-1 rounded-xl transition-colors ${song.likes > 0 ? "text-pink-500 hover:bg-pink-500/10" : "text-slate-300 hover:text-pink-400"}`}><Heart className={`w-6 h-6 transition-all active:scale-125 ${song.likes > 0 ? 'fill-current drop-shadow-sm' : ''}`} /><span className="text-xs font-bold">{song.likes || 0}</span></button></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- Tab 2: Queue --- */}
        {activeTab === 'queue' && (
          <div className={`p-6 rounded-3xl border animate-in fade-in slide-in-from-bottom-2 ${isDarkMode ? "bg-slate-900/60 border-slate-700" : "bg-white/70 border-white"}`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare className="w-6 h-6 text-green-500" /> みんなのリクエスト</h2>
            <div className="space-y-3">
              {userRequests.filter(r => r.status === 'pending').length === 0 ? <p className="text-slate-500 text-center py-10">現在リクエストはありません</p> : 
                userRequests.filter(r => r.status === 'pending').sort((a,b) => b.createdAt - a.createdAt).map((req, i) => (
                  <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-100"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>{i + 1}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm mb-1">{req.songTitle}</p>
                      <p className="text-xs text-slate-500">by {req.requesterName}</p>
                      {req.comment && <div className={`text-xs mt-2 p-2 rounded-lg italic ${isDarkMode ? "bg-slate-900/50 text-slate-400" : "bg-slate-50 text-slate-500"}`}>"{req.comment}"</div>}
                    </div>
                    <span className="text-[10px] text-slate-500 opacity-60">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* --- Tab 3: Gacha (Inline) --- */}
        {activeTab === 'gacha' && (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300">
            <div className={`w-full max-w-sm p-8 rounded-[2rem] text-center relative border shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 pointer-events-none" />
              <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-2"><Dice5 className="w-8 h-8 text-yellow-500 animate-bounce" /> GACHA</h2>
              <p className="text-slate-400 text-xs mb-8">今日の運命の一曲を見つけよう</p>
              
              <div className="min-h-[200px] flex items-center justify-center mb-6">
                {gachaAnimating ? (
                  <div className="text-center"><Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-4" /><p className="font-bold animate-pulse">抽選中...</p></div>
                ) : gachaResult ? (
                  <div className="w-full animate-in zoom-in">
                    <p className="text-sm text-slate-400 mb-2">{gachaResult.artist}</p>
                    <p className="text-2xl font-black mb-6 leading-tight">{gachaResult.title}</p>
                    <button onClick={() => handleRequestClick(gachaResult)} disabled={!isRequestEnabled} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-500 transition">この曲をリクエスト！</button>
                  </div>
                ) : (
                  <div className="opacity-30"><Music className="w-20 h-20 mx-auto" /></div>
                )}
              </div>

              <div className="space-y-3 relative z-10">
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={gachaAnimating} className={`w-full p-3 rounded-xl border text-sm outline-none ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <option value="ALL">✨ すべてのカテゴリー</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={drawGacha} disabled={gachaAnimating} className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform active:scale-95">
                  {gachaResult ? "もう一回引く！" : "ガチャを回す！"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 4: Profile --- */}
        {activeTab === 'profile' && (
          <div className={`text-center mb-12 border rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 ${isDarkMode ? "bg-slate-900/60 border-slate-700/50 backdrop-blur-md" : "bg-white/70 border-white/60 backdrop-blur-md"}`}>
            <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20"></div>
            <div className={`relative inline-block mb-6 rounded-full p-1.5 ring-4 shadow-xl ${isDarkMode ? "bg-slate-800 ring-slate-800" : "bg-white ring-white"}`}>{profile?.avatarUrl ? (<img src={profile.avatarUrl} alt="Icon" className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover" />) : (<div className="w-28 h-28 md:w-32 md:h-32 flex items-center justify-center bg-slate-100 rounded-full"><UserIcon className={`w-12 h-12 ${accentText}`} /></div>)}</div>
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">{profile?.displayName}</h1>
            <p className="text-sm md:text-base max-w-lg mx-auto mb-8 opacity-80 whitespace-pre-wrap leading-relaxed">{profile?.bio}</p>
            <div className="flex justify-center gap-4 mb-8">
              {profile?.twitter && <a href={`https://twitter.com/${profile.twitter}`} target="_blank" className={`p-3 rounded-full transition-all hover:scale-110 ${isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-500"}`}><Twitter className="w-5 h-5" /></a>}
              {profile?.youtube && <a href={`https://youtube.com/${profile.youtube}`} target="_blank" className={`p-3 rounded-full transition-all hover:scale-110 ${isDarkMode ? "bg-slate-800 text-red-400" : "bg-red-50 text-red-500"}`}><Youtube className="w-5 h-5" /></a>}
              {profile?.twitch && <a href={`https://twitch.tv/${profile.twitch}`} target="_blank" className={`p-3 rounded-full transition-all hover:scale-110 ${isDarkMode ? "bg-slate-800 text-purple-400" : "bg-purple-50 text-purple-500"}`}><Twitch className="w-5 h-5" /></a>}
              {profile?.tiktok && <a href={`https://tiktok.com/@${profile.tiktok}`} target="_blank" className={`p-3 rounded-full transition-all hover:scale-110 ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}><Music2 className="w-5 h-5" /></a>}
              {profile?.otherUrl && <a href={profile.otherUrl} target="_blank" className={`p-3 rounded-full transition-all hover:scale-110 ${isDarkMode ? "bg-slate-800 text-green-400" : "bg-green-50 text-green-500"}`}><LinkIcon className="w-5 h-5" /></a>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => navigator.clipboard.writeText(window.location.href)} className={`inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition ${accentBg}`}><Share2 className="w-4 h-4" /> シェアする</button>
            </div>
          </div>
        )}

      </div>

      {/* ★スマホ用ボトムナビゲーション */}
      <div className={`fixed bottom-0 left-0 w-full border-t z-50 px-2 pb-safe-area backdrop-blur-xl ${isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"}`}>
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <BottomNavButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="リスト" />
          <BottomNavButton active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} icon={MessageSquare} label="リクエスト" badge={userRequests.filter(r => r.status === 'pending').length} />
          <BottomNavButton active={activeTab === 'gacha'} onClick={() => setActiveTab('gacha')} icon={Dice5} label="ガチャ" />
          <BottomNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserCircle} label="プロフィール" />
        </div>
      </div>

      {viewer && requestTarget && pageOwnerId && <RequestModal isOpen={!!requestTarget} song={requestTarget} onClose={() => setRequestTarget(null)} pageOwnerId={pageOwnerId} viewer={viewer} userRequests={userRequests} profile={profile} />}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}