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
  Youtube, Twitch, Clock, CalendarDays, RefreshCw, ChevronDown, MessageSquare
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
  themeColor?: string;
  fontFamily?: string;
  backgroundImage?: string;
  isRequestEnabled?: boolean;
};

type RequestData = {
  id?: string;
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

/* --- ログインモーダル --- */
const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  const handleLogin = async (provider: any) => {
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (error) {
      console.error(error);
      alert("ログインに失敗しました");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <h2 className="text-lg font-bold text-slate-800 mb-6">ログインしてリクエスト</h2>
        <div className="flex flex-col gap-3">
          <button onClick={() => handleLogin(googleProvider)} className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition shadow-sm">
             Googleでログイン
          </button>
          <button onClick={() => handleLogin(twitterProvider)} className="flex items-center justify-center gap-2 bg-black hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition shadow-lg">
             <Twitter className="w-5 h-5" /> X (Twitter)でログイン
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- ガチャモーダル (強化版) --- */
const GachaModal = ({ isOpen, onClose, songs, categories }: { isOpen: boolean, onClose: () => void, songs: Song[], categories: string[] }) => {
  const [result, setResult] = useState<Song | null>(null);
  const [animating, setAnimating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const drawGacha = () => {
    const targets = selectedCategory === "ALL" ? songs : songs.filter(s => s.category === selectedCategory);
    if (targets.length === 0) return alert("このカテゴリには曲がありません！");
    setResult(null);
    setAnimating(true);
    setTimeout(() => {
      const random = targets[Math.floor(Math.random() * targets.length)];
      setResult(random);
      setAnimating(false);
    }, 1500);
  };

  useEffect(() => {
    if (!isOpen) { setResult(null); setAnimating(false); setSelectedCategory("ALL"); }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-8 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2"><Dice5 className="w-6 h-6 text-yellow-400" /> 今日のラッキー曲</h2>
        <div className="min-h-[200px] flex items-center justify-center">
          {animating ? (
            <div className="py-10"><Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" /><p className="mt-4 text-slate-300 font-bold animate-pulse">選曲中...</p></div>
          ) : result ? (
            <div className="animate-in zoom-in duration-300 w-full">
              <p className="text-sm text-slate-400 mb-2">{result.artist}</p>
              <p className="text-2xl font-black text-white mb-6 leading-tight">{result.title}</p>
              <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 mb-6">この曲をリクエストしてみる？</div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm"><p className="mb-4">カテゴリーを選んでガチャを回そう！</p><Music className="w-12 h-12 mx-auto opacity-20" /></div>
          )}
        </div>
        <div className="space-y-3 mt-4">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={animating} className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none">
            <option value="ALL">すべてのカテゴリー</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={drawGacha} disabled={animating} className={`w-full font-bold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 ${result ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-yellow-500 text-white hover:bg-yellow-400"}`}>
            {result ? <><RefreshCw className="w-4 h-4" /> もう一回引く</> : "ガチャを回す！"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RequestModal = ({ isOpen, onClose, song, pageOwnerId, viewer, userRequests }: any) => {
  const [name, setName] = useState(viewer.displayName || "");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const pendingCount = userRequests.filter((r:any) => r.requesterUid === viewer.uid && r.status === 'pending').length;
  const isLimitReached = pendingCount >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song) return;
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
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Mic2 className="w-5 h-5 text-green-500" /> リクエスト</h2>
        <p className="text-slate-400 text-sm mb-6"><span className="font-bold text-green-400">{song.title}</span></p>
        {isLimitReached ? (
          <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-red-200 text-sm mb-4 flex gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" /><div><p className="font-bold">リクエスト上限に達しています</p><p className="text-xs opacity-70 mt-1">一度にリクエストできるのは3曲までです。</p></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 mb-4 flex items-center gap-3">
               {viewer.photoURL && !isAnonymous && <img src={viewer.photoURL} className="w-8 h-8 rounded-full" alt="icon" />}
               <div className="text-sm"><p className="text-slate-400 text-xs">送信アカウント:</p><p className="font-bold text-slate-200">{isAnonymous ? "匿名希望" : viewer.displayName}</p></div>
            </div>
            {!isAnonymous && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">お名前</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 focus:border-green-500 outline-none text-white" placeholder="例: たろう" required />
              </div>
            )}
            <div className="flex items-center gap-2"><input type="checkbox" id="anon" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded bg-slate-800 border-slate-600" /><label htmlFor="anon" className="text-sm text-slate-300">匿名で送る</label></div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">コメント</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 focus:border-green-500 outline-none text-white h-20 resize-none" placeholder="一言どうぞ！" />
            </div>
            <button type="submit" disabled={isSending} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">{isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> 送信する</>}</button>
          </form>
        )}
      </div>
    </div>
  );
};

/* --- みんなのリクエストコンポーネント --- */
const RequestQueue = ({ requests, isDarkMode }: { requests: RequestData[], isDarkMode: boolean }) => {
  const pendingRequests = requests.filter(r => r.status === 'pending').sort((a,b) => a.createdAt - b.createdAt);
  
  if (pendingRequests.length === 0) return null;

  return (
    <div className={`mt-8 mb-8 p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
        <MessageSquare className="w-5 h-5 text-blue-500" />
        みんなのリクエスト ({pendingRequests.length}件)
      </h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
        {pendingRequests.map((req, i) => (
          <div key={i} className={`p-3 rounded-xl flex items-center gap-3 ${isDarkMode ? "bg-slate-800" : "bg-slate-50"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-white text-slate-500 border border-slate-200"}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{req.songTitle}</div>
              <div className="text-xs text-slate-500 truncate">by {req.requesterName}</div>
            </div>
            {req.comment && <div className="text-xs text-slate-500 bg-slate-500/10 px-2 py-1 rounded max-w-[100px] truncate">💬 {req.comment}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [isGachaOpen, setIsGachaOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const isRequestEnabled = profile?.isRequestEnabled !== false;

  const themeColors: {[key: string]: string} = {
    blue: "text-blue-500 border-blue-500 bg-blue-500",
    pink: "text-pink-500 border-pink-500 bg-pink-500",
    green: "text-emerald-500 border-emerald-500 bg-emerald-500",
    purple: "text-purple-500 border-purple-500 bg-purple-500",
    orange: "text-orange-500 border-orange-500 bg-orange-500",
  };
  const currentTheme = profile?.themeColor || "blue";
  const accentText = themeColors[currentTheme].split(" ")[0];
  const accentBg = themeColors[currentTheme].split(" ")[2];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathSegments = window.location.pathname.split('/');
      const id = pathSegments[pathSegments.length - 1];
      if (id && id !== 'user') setPageOwnerId(id);
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => setViewer(user));
    return () => unsubscribe();
  }, []);

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

  const handleLike = (songId: string) => {
    if (!pageOwnerId) return;
    runTransaction(ref(db, `users/${pageOwnerId}/songs/${songId}/likes`), (c) => (c || 0) + 1);
  };

  const filteredSongs = songs.filter((song) => {
    const searchNorm = normalizeText(keyword);
    const tags = song.tags || [];
    const matchText = normalizeText(song.title).includes(searchNorm) || normalizeText(song.artist).includes(searchNorm) || normalizeText(song.category).includes(searchNorm) || (song.reading && normalizeText(song.reading).includes(searchNorm)) || tags.some(t => normalizeText(t).includes(searchNorm));
    
    let matchCat = true;
    if (selectedCategory === "REQUEST") matchCat = tags.includes("リクエスト");
    else if (selectedCategory === "PRACTICE") matchCat = tags.includes("練習中");
    else if (selectedCategory !== "ALL") matchCat = song.category === selectedCategory;

    return matchText && matchCat;
  });

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortBy === 'likes') {
      if (b.likes !== a.likes) return b.likes - a.likes;
      return b.createdAt - a.createdAt;
    }
    return b.createdAt - a.createdAt;
  });

  const getRankIcon = (index: number) => {
    if (sortBy !== 'likes') return null;
    if (index === 0) return <span className="absolute -top-3 -left-3 text-2xl drop-shadow-md">👑</span>;
    if (index === 1) return <span className="absolute -top-3 -left-3 text-2xl drop-shadow-md">🥈</span>;
    if (index === 2) return <span className="absolute -top-3 -left-3 text-2xl drop-shadow-md">🥉</span>;
    return null;
  };

  const isLongTimeNoSee = (timestamp?: number) => {
    if (!timestamp) return false;
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    return timestamp < threeMonthsAgo;
  };

  const handleRequestClick = (song: Song) => {
    if (!isRequestEnabled) { alert("現在リクエストの受付は停止中です🙇‍♂️"); return; }
    if (!viewer) { 
      if (window.confirm("リクエストにはログインが必要です。ログインしますか？")) {
        setIsLoginModalOpen(true);
      }
      return; 
    }
    setRequestTarget(song);
  };

  if (!pageOwnerId && !loading) return <div className="p-10 text-center">ユーザーが見つかりません</div>;

  const bgClass = isDarkMode ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800";
  const cardBgClass = isDarkMode ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm";
  const headerClass = isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white/80 border-slate-200";

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${bgClass} ${profile?.fontFamily === 'serif' ? 'font-serif' : profile?.fontFamily === 'rounded' ? 'font-rounded' : ''}`}>
      {profile?.backgroundImage && <div className="fixed inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${profile.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}

      <header className={`backdrop-blur-md border-b sticky top-0 z-50 ${headerClass}`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Music className={`w-5 h-5 ${accentText}`} /><h1 className="font-bold hidden xs:block">Song List</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-slate-500/10 transition">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
            {viewer ? (
              <div className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"}`}>
                {viewer.photoURL ? <img src={viewer.photoURL} className="w-6 h-6 rounded-full" /> : <UserIcon className="w-6 h-6 p-1 rounded-full bg-slate-500" />}
                <button onClick={() => signOut(auth)} className="ml-1 text-slate-400 hover:text-red-400"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className={`text-xs font-bold px-3 py-1.5 rounded-full transition flex items-center gap-1 text-white ${accentBg}`}><LogIn className="w-3 h-3" /> ログイン</button>
            )}
            <Link href="/" className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${isDarkMode ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-600"}`}>リスト作成</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-10 relative z-10">
        <div className={`text-center mb-10 border rounded-3xl p-8 shadow-xl ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white/80 border-slate-200"}`}>
          <div className={`inline-block mb-4 rounded-full p-1 ring-2 shadow-lg overflow-hidden ${isDarkMode ? "bg-slate-800 ring-slate-700" : "bg-slate-100 ring-slate-200"}`}>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Icon" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center"><UserIcon className={`w-12 h-12 ${accentText}`} /></div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">{profile?.displayName || "配信者の歌リスト"} <span className={accentText}>🎤</span></h1>
          <p className="text-sm md:text-base max-w-lg mx-auto mb-6 opacity-80 whitespace-pre-wrap">{profile?.bio || "リクエスト募集中！"}</p>
          
          <div className="flex justify-center gap-4 mb-6">
            {profile?.twitter && <a href={`https://twitter.com/${profile.twitter}`} target="_blank" className="p-2 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"><Twitter className="w-5 h-5" /></a>}
            {profile?.youtube && <a href={`https://youtube.com/${profile.youtube}`} target="_blank" className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"><Youtube className="w-5 h-5" /></a>}
            {profile?.twitch && <a href={`https://twitch.tv/${profile.twitch}`} target="_blank" className="p-2 rounded-full bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition"><Twitch className="w-5 h-5" /></a>}
            {profile?.tiktok && <a href={`https://tiktok.com/@${profile.tiktok}`} target="_blank" className="p-2 rounded-full bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition"><Music2 className="w-5 h-5" /></a>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className={`inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full font-bold text-sm transition shadow-lg ${accentBg}`}><Share2 className="w-4 h-4" /> シェア</button>
            <button onClick={() => setIsGachaOpen(true)} className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white px-5 py-2.5 rounded-full font-bold text-sm transition shadow-lg"><Dice5 className="w-4 h-4" /> ガチャ</button>
          </div>
        </div>

        {/* ★追加: みんなのリクエスト表示 */}
        <RequestQueue requests={userRequests} isDarkMode={isDarkMode} />

        <div className="mb-6 space-y-4">
          <div className="relative">
            <input type="text" placeholder="曲名、アーティスト、ひらがな検索..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition ${isDarkMode ? "bg-slate-900 border-slate-800 focus:ring-blue-500" : "bg-white border-slate-200 focus:ring-blue-400"}`} />
            <Filter className="absolute left-4 top-3.5 w-5 h-5 opacity-50" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[{id: "ALL", label: "すべて", icon: null}, {id: "REQUEST", label: "リクエスト中", icon: <Mic2 className="w-3 h-3" />}, {id: "PRACTICE", label: "練習中", icon: <Loader2 className="w-3 h-3" />}, ...categories.map(c => ({id: c, label: c, icon: null}))].map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition flex items-center gap-1 ${selectedCategory === cat.id ? (isDarkMode ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-white") : (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200")}`}>{cat.icon} {cat.label}</button>
            ))}
          </div>
        </div>

        <div className="flex justify-end mb-4 gap-2">
           <button onClick={() => setSortBy('likes')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${sortBy === 'likes' ? (isDarkMode ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800") : "opacity-50"}`}><Trophy className="w-3 h-3 text-yellow-500" /> 人気順</button>
          <button onClick={() => setSortBy('newest')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${sortBy === 'newest' ? (isDarkMode ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800") : "opacity-50"}`}>新着順</button>
        </div>

        <div className="mt-6">
          {loading ? <div className="text-center py-20 opacity-50"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /><p>読み込み中...</p></div> : sortedSongs.length === 0 ? <div className={`text-center py-10 rounded-xl border ${isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-slate-50 border-slate-200"}`}><p className="opacity-50 text-sm">条件に一致する曲がありません</p></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedSongs.map((song, index) => (
                <div key={song.id} className={`relative border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all active:scale-[0.99] h-full ${cardBgClass} ${song.tags?.includes("リクエスト") ? (isDarkMode ? "border-l-4 border-l-green-500 bg-green-900/10" : "border-l-4 border-l-green-500 bg-green-50") : ""}`}>
                  {getRankIcon(index)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={`text-base font-bold line-clamp-2 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{song.title} {song.lyricsUrl && <a href={song.lyricsUrl} target="_blank" className="ml-2 inline-block text-blue-400 hover:text-blue-500"><FileText className="w-3 h-3" /></a>}</div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {song.tags?.includes("リクエスト") && <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">リクエスト中</span>}
                        {song.tags?.includes("練習中") && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">練習中</span>}
                        {song.lastSungAt && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                            <CalendarDays className="w-2.5 h-2.5" />
                            {new Date(song.lastSungAt).toLocaleDateString()}
                          </span>
                        )}
                        {isLongTimeNoSee(song.lastSungAt) && <span className="bg-slate-600 text-slate-200 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> お久しぶり</span>}
                      </div>
                    </div>
                    <div className="text-sm opacity-60 mb-2 truncate">{song.artist}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"}`}>{song.category}</span>
                      {song.key && <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"}`}><Music2 className="w-2.5 h-2.5" /> {song.key}</span>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 justify-end pt-2 border-t mt-1 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <button onClick={() => handleRequestClick(song)} disabled={!isRequestEnabled} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold transition text-xs border ${isRequestEnabled ? "bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white border-green-600/30" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"}`}>{isRequestEnabled ? <><Mic2 className="w-4 h-4" /> リクエスト</> : "停止中"}</button>
                    <button onClick={() => handleLike(song.id)} className="flex flex-col items-center justify-center gap-0.5 min-w-[3rem] text-pink-500 hover:text-pink-400 transition"><Heart className={`w-5 h-5 ${song.likes > 0 ? 'fill-current' : ''}`} /><span className="text-xs font-bold">{song.likes || 0}</span></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <GachaModal isOpen={isGachaOpen} onClose={() => setIsGachaOpen(false)} songs={songs} categories={categories} />
      {viewer && requestTarget && pageOwnerId && <RequestModal isOpen={!!requestTarget} song={requestTarget} onClose={() => setRequestTarget(null)} pageOwnerId={pageOwnerId} viewer={viewer} userRequests={userRequests} />}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}