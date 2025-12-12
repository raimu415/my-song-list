"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase"; 
import { ref, onValue, remove, push, update, runTransaction, set, get } from "firebase/database";
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation";
import { 
  Music, Plus, X, ExternalLink, Hash, ListMusic, MessageSquare, Settings,
  Heart, Mic2, CheckCircle2, Loader2, Twitter, Save, FileText, Music2, Type, FileUp, QrCode, 
  Link as LinkIcon, ToggleLeft, ToggleRight, ListChecks, Copy, Search, History, Eraser, Youtube, 
  Twitch, CalendarDays, ArrowUp, Clock, Image as ImageIconLucide, Download, Edit, 
  CheckSquare, Ban, Megaphone, LogOut, Pin, Zap, Layers, 
  ChevronDown, ChevronUp, BarChart3, PieChart, Activity, Star, 
  Volume2, Bell, Share2, Palette, Trash2, RotateCcw, ClipboardList, Sparkles, ArrowRight, AlertTriangle,
  Home as HomeIcon, LayoutTemplate, Sliders, Smartphone, ShieldAlert,
  User as UserIcon, Globe, Instagram, Facebook, Tag, Upload, Monitor, Calendar, Lock, FolderHeart
} from 'lucide-react';

/* --- Types --- */
type SongData = {
  id: string;
  title: string;
  artist: string;
  category: string;
  tags?: string[];
  key?: string;
  memo?: string;
  // ★No.5 自分用メモ
  privateMemo?: string;
  reading?: string;
  lyricsUrl?: string;
  youtubeUrl?: string;
  bpm?: string;
  noteRange?: string;
  rating?: number;
  // ★No.1 練習進捗 (0-100)
  practiceRate?: number;
  isSetlist?: boolean;
  setlistOrder?: number;
  isPinned?: boolean;
  lastSungAt?: number;
  sungCount?: number;
  likes?: number;
  createdAt?: number;
};

type RequestData = {
  id: string;
  songId: string;
  songTitle: string;
  requesterName: string;
  requesterUid: string;
  comment: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'hold';
  createdAt: number;
  completedAt?: number;
};

type SetlistLog = {
  id: string;
  date: number;
  songs: { title: string; artist: string; id: string }[];
};

// ★No.4 セトリプリセット型
type SetlistPreset = {
  id: string;
  name: string;
  songIds: string[];
};

type UserProfile = {
  displayName: string;
  bio: string;
  avatarUrl?: string;
  twitter: string;
  youtube?: string;
  twitch?: string;
  tiktok?: string;
  otherUrl?: string;
  customLinks?: { label: string; url: string; id: string }[];
  themeColor: string;
  fontFamily: string;
  backgroundImage: string;
  backgroundOpacity?: number; 
  overlayOpacity?: number;
  // ★No.21 季節テーマ追加
  themeStyle?: 'default' | 'neon' | 'retro' | 'japanese' | 'glitch' | 'sakura' | 'summer' | 'halloween' | 'winter';
  isRequestEnabled: boolean;
  customTags?: string[];
  // ★No.7 タググループ
  tagGroups?: { name: string; tags: string[] }[]; 
  // ★No.2 NGワード
  ngKeywords?: string[];
  // ★No.28 スケジュール
  schedule?: string;
  announcement?: { text: string; active: boolean };
  tagColors?: Record<string, string>;
  ngUsers?: Record<string, { name: string; date: number }>;
  soundEnabled?: boolean;
  isAcceptedKept?: boolean;
  defaultSortType?: 'newest' | 'artist' | 'title' | 'popular';
  isAutoCategoryEnabled?: boolean;
};

const normalize = (text: string) => {
  return text.trim().toLowerCase()
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '');
};

const COLOR_PALETTE: Record<string, string> = {
  gray: "bg-slate-100 text-slate-600 border-slate-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  red: "bg-red-100 text-red-700 border-red-200",
  green: "bg-green-100 text-green-700 border-green-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
};

/* --- Utils --- */
const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Canvas error")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { console.error("Audio play failed", e); }
};

/* --- UI Components --- */
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg z-[60] animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 pointer-events-none">
      <CheckCircle2 className="w-4 h-4 text-green-400" />
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 transition hover:shadow-md h-full">
    <div className={`p-3 rounded-xl ${color} text-white shadow-md`}><Icon className="w-5 h-5" /></div>
    <div className="text-center"><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</p><p className="text-xl font-black text-slate-800">{value}</p></div>
  </div>
);

const BottomNavButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 ${active ? "text-blue-600 scale-105" : "text-slate-400 hover:text-slate-600"}`}>
    <div className="relative"><Icon className={`w-6 h-6 mb-1 ${active ? "fill-current" : ""}`} />{badge > 0 && (<span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">{badge > 99 ? '99+' : badge}</span>)}</div><span className="text-[9px] font-bold">{label}</span>
  </button>
);

const SidebarButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${active ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}><Icon className={`w-5 h-5 ${active ? "fill-blue-600/20" : ""}`} /><span className="flex-1 text-left">{label}</span>{badge > 0 && (<span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>)}</button>
);

const StarRating = ({ rating = 0 }: { rating: number }) => (<div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`w-3 h-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />))}</div>);

const ActivityHeatmap = ({ logs }: { logs: any[] }) => {
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (27 - i));
    return d.toISOString().split('T')[0];
  });
  const counts = days.reduce((acc, day) => { acc[day] = logs.filter(l => new Date(l.date).toISOString().split('T')[0] === day).length; return acc; }, {} as Record<string, number>);
  return (<div className="flex gap-1 justify-center mt-2">{days.map(day => { const c = counts[day] || 0; const color = c === 0 ? "bg-slate-100" : c < 3 ? "bg-green-200" : c < 5 ? "bg-green-400" : "bg-green-600"; return <div key={day} className={`w-3 h-3 rounded-sm ${color}`} title={`${day}: ${c}回`} />; })}</div>);
};

const ToggleSwitch = ({ checked, onChange, label, description }: { checked: boolean, onChange: (v: boolean) => void, label: string, description?: string }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <span className="font-bold text-sm text-slate-700 block">{label}</span>
      {description && <span className="text-xs text-slate-400 block mt-0.5">{description}</span>}
    </div>
    <button 
      onClick={() => onChange(!checked)} 
      className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

/* --- Home Menu --- */
const HomeMenu = ({ onNavigate, onOpenImport, onOpenSetlist, onAddSong, stats }: any) => {
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <h2 className="text-xl md:text-3xl font-black mb-2">Welcome Back!</h2>
        <p className="opacity-80 text-sm md:text-base">今日も配信を盛り上げましょう。まずは何から始めますか？</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button onClick={() => onNavigate('songs')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all text-left group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ListMusic className="w-24 h-24" /></div>
          <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform"><ListMusic className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">曲リストを見る</h3>
          <p className="text-xs text-slate-500 font-medium">全{stats.totalSongs}曲。検索・編集はこちら</p>
        </button>

        <button onClick={onAddSong} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all text-left group">
          <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform"><Plus className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">曲を1曲追加</h3>
          <p className="text-xs text-slate-500 font-medium">手動で新しい曲を登録します</p>
        </button>

        <button onClick={onOpenImport} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-yellow-200 transition-all text-left group">
          <div className="bg-yellow-50 w-12 h-12 rounded-xl flex items-center justify-center text-yellow-600 mb-4 group-hover:scale-110 transition-transform"><Sparkles className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">一括インポート</h3>
          <p className="text-xs text-slate-500 font-medium">CSVやテキストからまとめて登録</p>
        </button>

        <button onClick={() => onNavigate('requests')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-green-200 transition-all text-left group relative">
          {stats.pendingRequests > 0 && (<span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">{stats.pendingRequests} 件の未読</span>)}
          <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform"><MessageSquare className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">リクエスト管理</h3>
          <p className="text-xs text-slate-500 font-medium">リスナーからのリクエストを承認</p>
        </button>

        <button onClick={onOpenSetlist} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all text-left group">
          <div className="bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform"><ClipboardList className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">本日のセットリスト</h3>
          <p className="text-xs text-slate-500 font-medium">現在選択中の曲を確認・保存</p>
        </button>

        <button onClick={() => onNavigate('history')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-200 transition-all text-left group">
          <div className="bg-purple-50 w-12 h-12 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform"><Activity className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">分析 / ログ</h3>
          <p className="text-xs text-slate-500 font-medium">過去のセトリや統計データ</p>
        </button>

        <button onClick={() => onNavigate('settings')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-300 transition-all text-left group">
          <div className="bg-slate-100 w-12 h-12 rounded-xl flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform"><Settings className="w-6 h-6" /></div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">設定</h3>
          <p className="text-xs text-slate-500 font-medium">プロフィールや配色の変更</p>
        </button>
      </div>
    </div>
  );
};

/* --- Smart Import Modal --- */
const SmartImportModal = ({ isOpen, onClose, userId, categories, songs, showToast, isAutoCategoryEnabled = true }: any) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [inputText, setInputText] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [bulkArtist, setBulkArtist] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");

  if (!isOpen) return null;

  const handleAnalyze = () => {
    const lines = inputText.split(/\r\n|\n|\r/);
    const categoryMap = isAutoCategoryEnabled ? categories.reduce((acc: any, cat: string) => { acc[cat.toLowerCase()] = cat; return acc; }, {}) : {};
    const artistCategoryMap: Record<string, string> = {};
    if (isAutoCategoryEnabled) {
      songs.forEach((song: SongData) => {
        if (song.artist && song.category) artistCategoryMap[normalize(song.artist)] = song.category;
      });
    }

    const parsed: any[] = [];
    lines.forEach((line) => {
      let clean = line.trim().replace(/^[・-]\s*/, '').replace(/^[0-9]+[\.\s]+/, '');
      if (!clean) return;
      const norm = clean.replace(/[，、\t|｜]/g, ',').replace(/\s+[\/／]\s+/g, ',').replace(/[\/／]/g, ',');
      let parts = norm.split(',');
      if (parts.length === 1 && clean.includes(' - ')) parts = clean.split(' - ');

      const title = parts[0]?.trim();
      const artist = parts.length > 1 ? parts[1]?.trim() : "";
      const rawCategory = parts.length > 2 ? parts[2]?.trim() : "";
      
      let targetCategory = categories[0] || "J-POP";
      if (isAutoCategoryEnabled) {
        if (rawCategory) {
          const matched = categoryMap[rawCategory.toLowerCase()];
          if (matched) targetCategory = matched;
        } else if (artist) {
          const learned = artistCategoryMap[normalize(artist)];
          if (learned) targetCategory = learned;
        }
      }

      if (title) parsed.push({ title, artist, category: targetCategory, id: Math.random().toString(36).substr(2, 9) });
    });

    if (parsed.length === 0) return alert("曲データが見つかりませんでした");
    setPreviewData(parsed);
    setStep('preview');
  };

  const applyBulk = (field: 'artist' | 'category', value: string) => {
    if (!value) return;
    setPreviewData(prev => prev.map(item => ({ ...item, [field]: value })));
  };

  const updateItem = (id: string, field: string, value: string) => {
    setPreviewData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setPreviewData(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!confirm(`${previewData.length}曲を追加しますか？`)) return;
    const promises = previewData.map(item => 
       push(ref(db, `users/${userId}/songs`), { 
         title: item.title, artist: item.artist, category: item.category, 
         likes: 0, sungCount: 0, createdAt: Date.now() 
       })
    );
    await Promise.all(promises);
    showToast(`${previewData.length}曲を追加しました！`);
    onClose();
    setStep('input');
    setInputText("");
    setPreviewData([]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" /> 
            {step === 'input' ? 'スマートインポート' : 'プレビュー・編集'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'input' ? 'テキストやCSVから曲を一括解析します。' : '登録前に内容を確認・修正できます。'}
          </p>
        </div>

        <div className="flex-1 overflow-hidden p-6 bg-slate-50">
          {step === 'input' ? (
            <textarea 
              value={inputText} onChange={e => setInputText(e.target.value)} 
              className="w-full h-full p-4 rounded-xl border border-slate-200 outline-none resize-none font-mono text-sm focus:ring-2 focus:ring-blue-200"
              placeholder={"曲名 / 歌手名\n曲名 - 歌手名\n曲名, 歌手名, カテゴリ..."} 
            />
          ) : (
            <div className="flex flex-col h-full gap-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] font-bold text-blue-800 uppercase block mb-1">アーティスト一括設定</label>
                  <div className="flex gap-1">
                    <input type="text" placeholder="例: YOASOBI" value={bulkArtist} onChange={e => setBulkArtist(e.target.value)} className="w-full text-xs p-2 rounded border border-blue-200" />
                    <button onClick={() => applyBulk('artist', bulkArtist)} className="bg-blue-600 text-white text-xs font-bold px-2 rounded hover:bg-blue-700">適用</button>
                  </div>
                </div>
                <div className="flex-1 min-w-[140px]">
                   <label className="text-[10px] font-bold text-blue-800 uppercase block mb-1">カテゴリ一括設定</label>
                   <div className="flex gap-1">
                    <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className="w-full text-xs p-2 rounded border border-blue-200 bg-white">
                      <option value="">選択...</option>
                      {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => applyBulk('category', bulkCategory)} className="bg-blue-600 text-white text-xs font-bold px-2 rounded hover:bg-blue-700">適用</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-500 font-bold text-xs sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3">曲名</th>
                      <th className="p-3">アーティスト</th>
                      <th className="p-3">カテゴリ</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 group">
                        <td className="p-2"><input type="text" value={item.title} onChange={e => updateItem(item.id, 'title', e.target.value)} className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-400 font-bold text-slate-700" /></td>
                        <td className="p-2"><input type="text" value={item.artist} onChange={e => updateItem(item.id, 'artist', e.target.value)} className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-400 text-slate-600" /></td>
                        <td className="p-2">
                          <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-400 text-xs py-1">
                            {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-2 text-center"><button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between bg-white rounded-b-2xl">
          {step === 'input' ? (
             <button onClick={handleAnalyze} disabled={!inputText} className="ml-auto bg-blue-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2">
               解析してプレビュー <ArrowRight className="w-4 h-4" />
             </button>
          ) : (
            <>
              <button onClick={() => setStep('input')} className="text-slate-500 font-bold px-4 py-2 hover:bg-slate-100 rounded-lg">戻る</button>
              <div className="flex items-center gap-4">
                 <span className="text-xs font-bold text-slate-400">{previewData.length}曲を追加予定</span>
                 <button onClick={handleSave} disabled={previewData.length === 0} className="bg-green-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-lg shadow-green-500/20">
                   <Save className="w-4 h-4" /> 確定して追加
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- Song Manager --- */
const SongManager = ({ userId, songs, onEdit, customTags, tagColors = {}, categories, showToast, onOpenImport, defaultSortType = 'newest' }: any) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'public' | 'practice'>('all');
  const [isGroupByCat, setIsGroupByCat] = useState(false);
  const [quickTitle, setQuickTitle] = useState(""); 
  const [quickArtist, setQuickArtist] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, songId: string } | null>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.shiftKey && e.key === 'N') { document.getElementById('quick-title')?.focus(); e.preventDefault(); }
      if (e.shiftKey && e.key === 'F') { document.getElementById('search-input')?.focus(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, songId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, songId });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    await remove(ref(db, `users/${userId}/songs/${id}`));
    showToast("曲を削除しました");
  };

  const toggleSetlist = async (song: SongData) => {
    await update(ref(db, `users/${userId}/songs/${song.id}`), { 
      isSetlist: !song.isSetlist,
      setlistOrder: !song.isSetlist ? Date.now() : null
    });
    if (!song.isSetlist) showToast("セトリに追加しました");
  };

  const togglePin = async (song: SongData) => {
    await update(ref(db, `users/${userId}/songs/${song.id}`), { isPinned: !song.isPinned });
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!quickTitle) return;
    let title = quickTitle;
    let artist = quickArtist;
    if (!artist && (title.includes(" / ") || title.includes(" - "))) {
      const splitChar = title.includes(" / ") ? " / " : " - ";
      const parts = title.split(splitChar);
      title = parts[0].trim();
      artist = parts[1].trim();
    }
    await push(ref(db, `users/${userId}/songs`), { 
      title, artist, category: categories[0] || "J-POP", 
      likes: 0, sungCount: 0, rating: 0, createdAt: Date.now() 
    });
    setQuickTitle(""); setQuickArtist("");
    showToast("曲を追加しました！");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("コピーしました！");
  };

  const openSearch = (title: string, artist: string, type: 'lyrics' | 'video') => {
    const q = type === 'lyrics' ? `${title} ${artist} 歌詞` : `${title} ${artist} 歌ってみた`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
  };

  const exportCsv = () => {
    const header = "曲名,アーティスト,カテゴリー,キー,歌唱回数,タグ,メモ\n";
    const body = songs.map((s: SongData) => {
      const tags = s.tags ? s.tags.join(" ") : "";
      return `"${s.title}","${s.artist}","${s.category}","${s.key || ""}","${s.sungCount || 0}","${tags}","${s.memo || ""}"`;
    }).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `song_list_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast("CSVをダウンロードしました");
  };

  const bulkUpdateTags = async (tag: string, action: 'add' | 'remove') => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}曲にタグ「${tag}」を${action === 'add' ? '追加' : '削除'}しますか？`)) return;
    const updates: any = {};
    selectedIds.forEach(id => {
      const song = songs.find((s:any) => s.id === id);
      if (song) {
        let newTags = song.tags || [];
        if (action === 'add' && !newTags.includes(tag)) newTags = [...newTags, tag];
        else if (action === 'remove') newTags = newTags.filter((t: string) => t !== tag);
        updates[`users/${userId}/songs/${id}/tags`] = newTags;
      }
    });
    await update(ref(db), updates);
    setIsSelectionMode(false); setSelectedIds(new Set());
    showToast("一括更新しました");
  };

  const handleBulkEdit = async (type: 'artist' | 'category', value: string) => {
    if (selectedIds.size === 0 || !value) return;
    if (!confirm(`${selectedIds.size}曲の${type === 'artist' ? 'アーティスト' : 'カテゴリー'}を「${value}」に変更しますか？`)) return;

    const updates: any = {};
    selectedIds.forEach(id => {
      updates[`users/${userId}/songs/${id}/${type}`] = value;
    });

    await update(ref(db), updates);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    showToast(`${selectedIds.size}曲を更新しました`);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const filteredSongs = songs.filter((song: SongData) => {
    const term = normalize(searchTerm);
    const title = normalize(song.title);
    const artist = normalize(song.artist);
    const matchSearch = title.includes(term) || artist.includes(term);
    const isPractice = song.tags?.includes("練習中");
    let matchTab = true;
    if (viewFilter === 'public') matchTab = !isPractice;
    if (viewFilter === 'practice') matchTab = !!isPractice;
    return matchSearch && matchTab;
  }).sort((a: SongData, b: SongData) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (defaultSortType === 'title') return a.title.localeCompare(b.title, "ja");
    if (defaultSortType === 'artist') return a.artist.localeCompare(b.artist, "ja");
    if (defaultSortType === 'popular') return (b.sungCount || 0) - (a.sungCount || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const groupedSongs = isGroupByCat 
    ? categories.reduce((acc: any, cat: string) => { acc[cat] = filteredSongs.filter((s: SongData) => s.category === cat); return acc; }, {})
    : { "All": filteredSongs };

  const uniqueArtists = Array.from(new Set(songs.map((s: any) => s.artist))).sort() as string[];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden flex flex-col h-full relative">
      {contextMenu && (
        <div className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 w-40 animate-in fade-in zoom-in duration-100" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => { const s = songs.find((s:any) => s.id === contextMenu.songId); if(s) onEdit(s); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"><Edit className="w-3 h-3" /> 編集</button>
          <button onClick={() => { const s = songs.find((s:any) => s.id === contextMenu.songId); if(s) handleCopy(`${s.title} / ${s.artist}`); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"><Copy className="w-3 h-3" /> コピー</button>
          <button onClick={() => { const s = songs.find((s:any) => s.id === contextMenu.songId); if(s) togglePin(s); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"><Pin className="w-3 h-3" /> ピン留め</button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button onClick={() => handleDelete(contextMenu.songId)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2"><Eraser className="w-3 h-3" /> 削除</button>
        </div>
      )}

      <div className="sticky top-0 bg-white/95 z-20 backdrop-blur-md shadow-sm">
        <form onSubmit={handleQuickAdd} className="p-3 bg-blue-50/50 flex gap-2 border-b border-blue-100">
          <div className="bg-white p-1.5 rounded-full text-blue-500"><Zap className="w-4 h-4 fill-current" /></div>
          <input id="quick-title" className="flex-1 bg-transparent text-sm outline-none placeholder:text-blue-300 text-blue-900 font-bold" placeholder="曲名 (Shift+N)" value={quickTitle} onChange={e => setQuickTitle(e.target.value)} />
          <input className="w-1/3 bg-transparent text-sm outline-none placeholder:text-blue-300 text-blue-900 border-l border-blue-100 pl-2" placeholder="歌手名" value={quickArtist} onChange={e => setQuickArtist(e.target.value)} list="artists" />
          <datalist id="artists">{Array.from(new Set(songs.map((s:any) => s.artist))).map((a:any) => <option key={a} value={a} />)}</datalist>
          <button type="submit" className="hidden">Submit</button>
        </form>

        <div className="p-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input id="search-input" type="text" placeholder="検索... (Shift+F)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 w-full text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors" />
              {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-2.5 text-slate-400"><X className="w-4 h-4" /></button>}
            </div>
            <button onClick={onOpenImport} className="flex items-center gap-2 px-3 text-sm rounded-lg bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 font-bold transition-all shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">インポート</span>
            </button>
            <button onClick={() => setIsGroupByCat(!isGroupByCat)} className={`px-3 rounded-xl border transition ${isGroupByCat ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-white text-slate-400 border-slate-200"}`} title="カテゴリ分け"><Layers className="w-5 h-5" /></button>
            <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`px-3 rounded-xl border transition ${isSelectionMode ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-white text-slate-400 border-slate-200"}`} title="一括編集"><CheckSquare className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${viewFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>すべて</button>
            <button onClick={() => setViewFilter('public')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${viewFilter === 'public' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>公開中</button>
            <button onClick={() => setViewFilter('practice')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${viewFilter === 'practice' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-500'}`}>練習中</button>
            <button onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-500 flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
          </div>
        </div>
      </div>

      {isSelectionMode && selectedIds.size > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex flex-col gap-4 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center border-b border-blue-200 pb-2">
              <span className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> {selectedIds.size}曲を選択中
              </span>
              <button onClick={() => {setIsSelectionMode(false); setSelectedIds(new Set());}} className="text-xs text-slate-500 hover:text-slate-700 font-bold bg-white px-2 py-1 rounded border border-slate-200">
                選択解除
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">アーティスト一括変更</label>
                <div className="flex gap-2">
                  <input 
                    list="bulk-artists"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="選択または入力..."
                    id="bulk-artist-input"
                  />
                  <datalist id="bulk-artists">
                    {uniqueArtists.map((a) => <option key={a} value={a} />)}
                  </datalist>
                  <button 
                    onClick={() => {
                      const input = document.getElementById('bulk-artist-input') as HTMLInputElement;
                      handleBulkEdit('artist', input.value);
                      input.value = "";
                    }}
                    className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                  >
                    変更
                  </button>
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
                <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">カテゴリー一括変更</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                  onChange={(e) => {
                    if(e.target.value) handleBulkEdit('category', e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>カテゴリーを選択...</option>
                  {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
               <label className="text-[10px] font-bold text-slate-400 block mb-1 ml-1 uppercase">タグ一括操作</label>
               <div className="flex flex-wrap gap-1.5">
                {customTags.map((tag: string) => (
                  <div key={tag} className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button onClick={() => bulkUpdateTags(tag, 'add')} className="px-2 py-1 text-[10px] hover:bg-blue-100 text-blue-600 font-bold transition">+{tag}</button>
                    <div className="w-px bg-slate-200"></div>
                    <button onClick={() => bulkUpdateTags(tag, 'remove')} className="px-2 py-1 text-[10px] hover:bg-red-100 text-red-400 font-bold transition">-</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      <div className="flex-1 overflow-y-auto min-h-[300px] p-2 bg-slate-50/30">
        {filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center"><Music className="w-12 h-12 opacity-20 mb-2" /><p className="text-sm">曲が見つかりません</p></div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSongs).map(([catName, catSongs]: any) => catSongs.length > 0 && (
              <div key={catName}>
                {isGroupByCat && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2 mt-4">{catName} ({catSongs.length})</h3>}
                <div className="space-y-2">
                  {catSongs.map((song: SongData) => (
                    <div 
                      key={song.id} 
                      onContextMenu={(e) => handleContextMenu(e, song.id)}
                      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all ${song.isSetlist ? "ring-2 ring-yellow-400 border-yellow-400 bg-yellow-50/30" : ""} ${selectedIds.has(song.id) ? "bg-blue-50 border-blue-300" : ""}`} 
                      onClick={() => { if(isSelectionMode) toggleSelection(song.id); else setExpandedId(expandedId === song.id ? null : song.id); }}
                    >
                      <div className="p-3 flex items-start gap-3">
                        {isSelectionMode ? (<input type="checkbox" checked={selectedIds.has(song.id)} onChange={() => toggleSelection(song.id)} className="mt-1.5 w-5 h-5 rounded border-slate-300 accent-blue-600" />) : (<button onClick={(e) => { e.stopPropagation(); toggleSetlist(song); }} className={`mt-0.5 p-2 rounded-full transition ${song.isSetlist ? "text-yellow-600 bg-yellow-100" : "text-slate-300 bg-slate-50 hover:bg-slate-100"}`}><ListChecks className="w-5 h-5" /></button>)}
                        <div className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{song.title}{song.createdAt && (Date.now() - song.createdAt) < 7*86400000 && <span className="ml-2 text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold align-middle">NEW</span>}</h4>
                            {song.isPinned && <Pin className="w-3.5 h-3.5 fill-slate-400 text-slate-400 ml-1 shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{song.artist}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {!isGroupByCat && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{song.category}</span>}
                            {song.key && <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 flex items-center gap-0.5"><Music2 className="w-2.5 h-2.5" /> {song.key}</span>}
                            {song.tags && song.tags.map((tag: string) => (<span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${tagColors[tag] ? COLOR_PALETTE[tagColors[tag]] : "bg-slate-100 text-slate-500 border-slate-200"}`}>#{tag}</span>))}
                          </div>
                        </div>
                        {!isSelectionMode && (<button onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === song.id ? null : song.id); }} className="p-2 text-slate-300 hover:text-slate-500">{expandedId === song.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button>)}
                      </div>
                      
                      {expandedId === song.id && !isSelectionMode && (
                        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1">
                          <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              <button onClick={(e) => { e.stopPropagation(); openSearch(song.title, song.artist, 'lyrics'); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600"><Search className="w-3 h-3" /> 歌詞検索</button>
                              <button onClick={(e) => { e.stopPropagation(); openSearch(song.title, song.artist, 'video'); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600"><Youtube className="w-3 h-3" /> 動画検索</button>
                              <button onClick={(e) => { e.stopPropagation(); togglePin(song); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${song.isPinned ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}><Pin className="w-3 h-3" /> ピン留め</button>
                              <button onClick={(e) => onEdit(song)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 ml-auto"><Edit className="w-3 h-3" /> 編集</button>
                            </div>
                            {(song.memo || song.lyricsUrl || song.reading || song.bpm || song.noteRange || song.rating) && (
                              <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 space-y-1">
                                {song.rating && song.rating > 0 && <div className="flex items-center gap-1">習熟度: <StarRating rating={song.rating} /></div>}
                                {song.reading && <div className="text-slate-400 text-[10px]">よみ: {song.reading}</div>}
                                {(song.bpm || song.noteRange) && <div className="flex gap-3 text-slate-500 font-mono"><span>BPM: {song.bpm || "-"}</span><span>Range: {song.noteRange || "-"}</span></div>}
                                {song.memo && <div className="whitespace-pre-wrap"><FileText className="w-3 h-3 inline mr-1 text-slate-400" />{song.memo}</div>}
                                {song.lyricsUrl && <a href={song.lyricsUrl} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1"><LinkIcon className="w-3 h-3" /> 歌詞リンク</a>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- Request Manager --- */
const RequestManager = ({ userId, ngUsers, requests, soundEnabled, showToast, isAcceptedKept = false }: any) => {
  const prevCountRef = useRef(0);

  useEffect(() => {
    const pendingCount = requests.filter((r: RequestData) => r.status === 'pending').length;
    if (pendingCount > prevCountRef.current) {
      if (soundEnabled) playNotificationSound();
      showToast("新しいリクエストが届きました！");
    }
    prevCountRef.current = pendingCount;
  }, [requests, soundEnabled, showToast]);

  const updateStatus = async (req: RequestData, newStatus: RequestData['status']) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') updates.completedAt = Date.now();
      await update(ref(db, `users/${userId}/requests/${req.id}`), updates);
      
      if (newStatus === 'completed' || newStatus === 'rejected') {
        const songRef = ref(db, `users/${userId}/songs/${req.songId}`);
        const TARGET_TAG = "リクエスト";
        await runTransaction(songRef, (song) => {
          if (song) {
            const tags = song.tags || [];
            song.tags = tags.filter((t: string) => t !== TARGET_TAG);
            if (newStatus === 'completed') { 
              song.lastSungAt = Date.now(); 
              song.sungCount = (song.sungCount || 0) + 1; 
            }
          }
          return song;
        });
      } else if (newStatus === 'accepted') {
        const songRef = ref(db, `users/${userId}/songs/${req.songId}`);
        const TARGET_TAG = "リクエスト";
        await runTransaction(songRef, (song) => {
          if (song) {
            const tags = song.tags || [];
            if (!tags.includes(TARGET_TAG)) song.tags = [...tags, TARGET_TAG];
          }
          return song;
        });
      }

      showToast(newStatus === 'accepted' ? "承認しました（歌唱待ち）" : newStatus === 'completed' ? "完了しました！" : "更新しました");
    } catch (e) { console.error(e); }
  };

  const blockUser = async (req: RequestData) => {
    if (!confirm(`ユーザー「${req.requesterName}」をブロックしますか？`)) return;
    await update(ref(db, `users/${userId}/profile/ngUsers/${req.requesterUid}`), { name: req.requesterName, date: Date.now() });
    await updateStatus(req, 'rejected');
    showToast("ブロックしました");
  };

  const activeRequests = requests.filter((r: RequestData) => {
    if (r.status === 'pending' || r.status === 'hold') return true;
    if (r.status === 'accepted') return isAcceptedKept;
    return false;
  });

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-4 md:p-6 mb-24 md:mb-0 min-h-[50vh]">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><MessageSquare className="w-5 h-5 text-green-500" /> リクエスト管理 ({activeRequests.length})</h3>
      {!isAcceptedKept && <p className="text-xs text-slate-400 mb-4 bg-slate-50 p-2 rounded">※ 現在の設定では、承認したリクエストは一覧から消えます（設定で変更可能）</p>}
      
      <div className="space-y-4">
        {activeRequests.length === 0 ? (
          <div className="text-center py-12"><div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8 text-slate-300" /></div><p className="text-slate-400 font-bold">リクエストはありません</p></div>
        ) : (
          activeRequests.sort((a: any, b: any) => {
             return b.createdAt - a.createdAt;
          }).map((req: RequestData) => (
            <div key={req.id} className={`p-5 rounded-2xl border shadow-sm transition ${req.status === 'accepted' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : req.status === 'hold' ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === 'accepted' ? 'bg-blue-100 text-blue-700 border border-blue-200' : req.status === 'hold' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                        {req.status === 'accepted' ? '承認済み (歌唱待ち)' : req.status === 'hold' ? '保留中' : '未読'}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{req.songTitle}</h4>
                    <p className="text-xs text-slate-500 mt-1">by {req.requesterName}</p>
                  </div>
                </div>
                {req.comment && <div className="bg-white/50 p-3 rounded-xl text-sm text-slate-600 italic border border-slate-100">"{req.comment}"</div>}
                
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {req.status === 'accepted' ? (
                    <>
                      <button onClick={() => updateStatus(req, 'completed')} className="col-span-3 flex items-center justify-center gap-2 px-3 py-3 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-200 active:scale-95 transition animate-in zoom-in"><Mic2 className="w-4 h-4" /> 歌唱完了！</button>
                      <button onClick={() => updateStatus(req, 'pending')} className="col-span-1 flex items-center justify-center bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 active:scale-95 transition font-bold text-xs">戻す</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => updateStatus(req, 'accepted')} className="col-span-2 flex items-center justify-center gap-1 px-3 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md active:scale-95 transition"><CheckCircle2 className="w-4 h-4" /> 承認</button>
                      {req.status === 'pending' ? (
                        <button onClick={() => updateStatus(req, 'hold')} className="col-span-1 flex items-center justify-center gap-1 px-3 py-3 bg-orange-100 text-orange-600 text-xs font-bold rounded-xl hover:bg-orange-200 active:scale-95 transition"><Clock className="w-4 h-4" /> 保留</button>
                      ) : (
                        <button onClick={() => updateStatus(req, 'pending')} className="col-span-1 flex items-center justify-center gap-1 px-3 py-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition"><RotateCcw className="w-4 h-4" /> 戻す</button>
                      )}
                      <button onClick={() => updateStatus(req, 'rejected')} className="col-span-1 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 active:scale-95 transition font-bold text-xs"><X className="w-4 h-4" /> 却下</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* --- History & Analytics --- */
const HistoryManager = ({ userId, songs, requests, showToast }: any) => {
  const [activeTab, setActiveTab] = useState<'log' | 'analytics'>('log');
  const [setlists, setSetlists] = useState<SetlistLog[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLog, setPreviewLog] = useState<SetlistLog | null>(null);
  
  useEffect(() => {
    const setlistRef = ref(db, `users/${userId}/setlist_history`);
    onValue(setlistRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSetlists(Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })));
    });
  }, [userId]);

  const completedRequests = useMemo(() => requests.filter((r: RequestData) => r.status === 'completed'), [requests]);
  const genreData = useMemo(() => {
    const counts: Record<string, number> = {};
    songs.forEach((s: SongData) => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]);
  }, [songs]);
  const topSongs = useMemo(() => { return [...songs].sort((a: any, b: any) => (b.sungCount || 0) - (a.sungCount || 0)).slice(0, 5); }, [songs]);

  const openPreview = (log: SetlistLog) => { setPreviewLog(log); setIsPreviewOpen(true); };

  const handleDeleteLog = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!confirm("このセットリスト履歴を削除しますか？\n（曲の歌唱回数は減りません）")) return;
    await remove(ref(db, `users/${userId}/setlist_history/${logId}`));
    showToast("履歴を削除しました");
  };

  const handleResetStats = async () => {
    if (!confirm("【注意】全曲の「歌唱回数」と「最終歌唱日」を0にリセットします。\n分析データが初期化されます。この操作は取り消せません。\n本当によろしいですか？")) return;
    const updates: any = {};
    songs.forEach((s: SongData) => {
      updates[`users/${userId}/songs/${s.id}/sungCount`] = 0;
      updates[`users/${userId}/songs/${s.id}/lastSungAt`] = null;
    });
    await update(ref(db), updates);
    showToast("歌唱データをリセットしました");
  };

  const handleClearHistory = async () => {
    if (!confirm("【注意】過去のセットリスト履歴を全て削除します。\nこの操作は取り消せません。\n本当によろしいですか？")) return;
    await remove(ref(db, `users/${userId}/setlist_history`));
    showToast("履歴ログを全削除しました");
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-4 md:p-6 mb-24 md:mb-0 min-h-[50vh]">
      <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
        <button onClick={() => setActiveTab('log')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'log' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>活動ログ</button>
        <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'analytics' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>分析データ</button>
      </div>

      {activeTab === 'log' ? (
        <>
          <div className="mb-6"><h4 className="text-xs font-bold text-slate-400 mb-2">活動ヒートマップ (直近28日)</h4><ActivityHeatmap logs={setlists} /></div>
          <div className="space-y-4">
             <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-2">最近完了したリクエスト</h4>
                {completedRequests.slice(0, 5).map((req: RequestData) => (<div key={req.id} className="text-sm text-slate-600 border-b border-slate-50 py-1 flex justify-between"><span>{req.songTitle}</span><span className="text-xs text-slate-400">{new Date(req.completedAt || 0).toLocaleDateString()}</span></div>))}
             </div>
             {setlists.length > 0 && <h4 className="font-bold text-slate-700 mt-6 mb-2">過去のセットリスト</h4>}
             {setlists.sort((a,b) => b.date - a.date).map(log => (
              <div key={log.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer group relative" onClick={() => openPreview(log)}>
                <button onClick={(e) => handleDeleteLog(e, log.id)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100" title="履歴を削除"><Trash2 className="w-4 h-4" /></button>
                <div className="flex items-center justify-between mb-3"><h4 className="font-bold text-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" />{new Date(log.date).toLocaleDateString()}</h4><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 mr-6">{log.songs?.length || 0}曲</span></div>
                <div className="space-y-1">{log.songs?.slice(0, 3).map((s, i) => (<div key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-slate-300 w-4 text-right">{i+1}.</span><span className="font-bold truncate">{s.title}</span></div>))}</div>
                {log.songs?.length > 3 && <div className="text-xs text-slate-400 mt-2 text-center">...他 {log.songs.length - 3}曲 (タップで画像生成)</div>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-100"><h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4" /> ジャンル分布</h4><div className="space-y-2">{genreData.map(([cat, count]) => (<div key={cat} className="flex items-center gap-2 text-xs"><span className="w-20 truncate font-bold text-slate-600">{cat}</span><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(count / songs.length) * 100}%` }}></div></div><span className="text-slate-400">{count}曲</span></div>))}</div></div>
          <div className="bg-white p-4 rounded-xl border border-slate-100"><h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> よく歌う曲 TOP5</h4>{topSongs.map((s: any, i: number) => (<div key={s.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-none"><div className="flex items-center gap-3"><span className={`font-bold w-4 ${i<3 ? "text-yellow-500" : "text-slate-300"}`}>{i+1}</span><span className="text-sm text-slate-700 font-medium">{s.title}</span></div><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{s.sungCount || 0}回</span></div>))}</div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mt-8"><h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> データ管理 (Danger Zone)</h4><div className="space-y-3"><div className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100"><div><p className="font-bold text-sm text-slate-700">歌唱データをリセット</p><p className="text-xs text-slate-400">全曲の「歌唱回数」と「最終歌唱日」を0に戻します。</p></div><button onClick={handleResetStats} className="text-xs font-bold bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition">リセット</button></div><div className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100"><div><p className="font-bold text-sm text-slate-700">全セットリスト履歴を削除</p><p className="text-xs text-slate-400">過去のログを全て消去します（復元できません）。</p></div><button onClick={handleClearHistory} className="text-xs font-bold bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition">全削除</button></div></div></div>
        </div>
      )}
      
      {isPreviewOpen && previewLog && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPreviewOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-center">
              <h3 className="font-black text-2xl mb-1">TODAY'S SETLIST</h3>
              <p className="opacity-80 text-sm">{new Date(previewLog.date).toLocaleDateString()}</p>
            </div>
            <div className="p-6 bg-slate-50 max-h-[60vh] overflow-y-auto">
              <ul className="space-y-3">
                {previewLog.songs.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 border-b border-slate-200 pb-2 last:border-none">
                    <span className="font-black text-indigo-400 w-6">{i+1}.</span>
                    <div><div className="font-bold text-sm">{s.title}</div><div className="text-xs text-slate-400">{s.artist}</div></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-white border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 mb-2">この画面をスクショしてシェア！</p>
              <button onClick={() => setIsPreviewOpen(false)} className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* --- Profile Editor (拡張版・修正済み) --- */
/* --- Profile Editor (拡張版・修正済み) --- */
const ProfileEditor = ({ userId, customTags, onTagsUpdate, songs, categories, onCategoriesUpdate, profile, setProfile, showToast }: any) => { 
  const [loading, setLoading] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'profile' | 'links' | 'categories' | 'tags' | 'system' | 'data'>('profile'); 
  
  // State群
  const [editingCategories, setEditingCategories] = useState<string[]>(categories);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("gray");
  const [newLink, setNewLink] = useState({ label: "", url: "" });
  
  // ★No.2 NGワード用
  const [newNgWord, setNewNgWord] = useState("");
  
  // ★No.7 タググループ用
  const [newGroupName, setNewGroupName] = useState("");
  const [editingTagGroups, setEditingTagGroups] = useState<{name: string, tags: string[]}[]>(profile.tagGroups || []);

  useEffect(() => { setEditingCategories(categories); }, [categories]);
  useEffect(() => { setEditingTagGroups(profile.tagGroups || []); }, [profile.tagGroups]);

  // ★安全なタグリスト取得用ヘルパー
  // Firebaseが配列をオブジェクトとして返してきた場合でも、強制的に配列に変換してクラッシュを防ぐ
  const getSafeTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return Object.values(tags) as string[];
  };

  const safeCustomTags = getSafeTags(customTags);

  const handleSave = async () => { 
    setLoading(true); 
    try {
      await set(ref(db, `users/${userId}/settings/categories`), editingCategories);
      
      // タググループを含めたプロフィールデータの準備
      const updatedProfile = { ...profile, tagGroups: editingTagGroups };

      // ★修正: Firebaseは undefined を許容しないため、undefined を null に置換するか削除する
      // JSON.stringify -> JSON.parse を通すことで undefined なプロパティを削除できます
      const safeProfile = JSON.parse(JSON.stringify(updatedProfile));

      await update(ref(db, `users/${userId}/profile`), safeProfile); 
      await set(ref(db, `users/${userId}/settings/customTags`), customTags); 
      
      showToast("設定をすべて保存しました！"); 
    } catch (e) {
      console.error("Save failed:", e);
      alert("保存に失敗しました。入力内容を確認してください。");
    } finally {
      setLoading(false); 
    }
  };

  // バックアップ等の関数群
  const backupData = async () => { const data = { profile, songs, categories, customTags, date: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `backup_${userId}.json`; a.click(); showToast("バックアップを作成しました"); };
  const handleCopyObsUrl = () => { const url = `${window.location.origin}/overlay/${userId}`; navigator.clipboard.writeText(url); showToast("OBS用URLをコピーしました(仮)"); };
  const addDemoData = async () => { if(!confirm("サンプル曲を追加しますか？")) return; const demoSongs = [{ title: "アイドル", artist: "YOASOBI", category: "J-POP" }, { title: "怪獣の花唄", artist: "Vaundy", category: "J-POP" }, { title: "残酷な天使のテーゼ", artist: "高橋洋子", category: "Anime" }]; demoSongs.forEach(async s => { await push(ref(db, `users/${userId}/songs`), { ...s, likes: 0, sungCount: 0, createdAt: Date.now() }); }); showToast("サンプル曲を追加しました"); };
  const handleUnblock = async (uid: string) => { if(!confirm("解除しますか？")) return; const newNg = {...profile.ngUsers}; delete newNg[uid]; setProfile({...profile, ngUsers: newNg}); await remove(ref(db, `users/${userId}/profile/ngUsers/${uid}`)); showToast("解除しました"); };
  const updateTagColor = (tag: string, color: string) => setProfile((prev: any) => ({ ...prev, tagColors: { ...prev.tagColors, [tag]: color } }));
  const addCategory = () => { if(!newCategory || editingCategories.includes(newCategory)) return; setEditingCategories([...editingCategories, newCategory]); setNewCategory(""); };
  const removeCategory = (cat: string) => { if(!confirm(`カテゴリ「${cat}」を削除しますか？`)) return; setEditingCategories(editingCategories.filter(c => c !== cat)); };
  // ★修正: customTags を直接参照せず safeCustomTags を使用
  const addTag = () => { if (!newTag || safeCustomTags.includes(newTag)) return; onTagsUpdate([...safeCustomTags, newTag]); updateTagColor(newTag, newTagColor); setNewTag(""); };
  const removeTag = (tag: string) => { if(!confirm(`タグ「${tag}」を削除しますか？`)) return; onTagsUpdate(safeCustomTags.filter((t: string) => t !== tag)); };
  const addCustomLink = () => { if (!newLink.label || !newLink.url) return; const currentLinks = profile.customLinks || []; setProfile({ ...profile, customLinks: [...currentLinks, { ...newLink, id: Date.now().toString() }] }); setNewLink({ label: "", url: "" }); };
  const removeCustomLink = (id: string) => { setProfile({ ...profile, customLinks: (profile.customLinks || []).filter((l: any) => l.id !== id) }); };
  const addPresetLink = (label: string, urlPrefix: string) => { setNewLink({ label, url: urlPrefix }); };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 変更点1: 上限を 10MB に緩和
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`画像サイズが大きすぎます。${MAX_SIZE_MB}MB以下の画像を選択してください。`);
      return;
    }

    try {
      setLoading(true); // ロード中表示
      
      // 変更点2: 圧縮処理を実行
      // アイコンなら500px、背景なら1200pxを目安にリサイズ
      const maxWidth = field === 'avatarUrl' ? 500 : 1200;
      const compressedBase64 = await compressImage(file, maxWidth, 0.8);

      // 保存
      setProfile({ ...profile, [field]: compressedBase64 });
      showToast("画像を読み込みました");
    } catch (error) {
      console.error("Image processing failed", error);
      alert("画像の処理に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // ★No.2 NGワード追加
  const addNgWord = () => {
    if(!newNgWord) return;
    const current = profile.ngKeywords || [];
    if(!current.includes(newNgWord)) setProfile({...profile, ngKeywords: [...current, newNgWord]});
    setNewNgWord("");
  };
  const removeNgWord = (word: string) => {
    const current = profile.ngKeywords || [];
    setProfile({...profile, ngKeywords: current.filter((w: string) => w !== word)});
  };

  // ★No.7 タググループ操作
  const addTagGroup = () => {
    if(!newGroupName) return;
    setEditingTagGroups([...editingTagGroups, { name: newGroupName, tags: [] }]);
    setNewGroupName("");
  };
  const toggleTagInGroup = (groupIndex: number, tag: string) => {
    const newGroups = [...editingTagGroups];
    const group = newGroups[groupIndex];
    // ★修正: group.tags が undefined の場合（Firebaseで空配列が消えた場合）に空配列を割り当てるガード処理
    const currentTags = group.tags || [];

    if(currentTags.includes(tag)) {
      group.tags = currentTags.filter(t => t !== tag);
    } else {
      group.tags = [...currentTags, tag];
    }
    setEditingTagGroups(newGroups);
  };
  const removeTagGroup = (index: number) => {
    setEditingTagGroups(editingTagGroups.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-1 gap-6 mb-32 pb-20">
      {/* ... ヘッダーとタブ ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Settings className="w-6 h-6 text-slate-400" /> 設定コントロール</h3>
        <button onClick={handleSave} disabled={loading} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} 保存
        </button>
      </div>
      
      <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
        {[{ id: 'profile', label: 'プロフィール', icon: UserIcon }, { id: 'links', label: 'リンク', icon: LinkIcon }, { id: 'categories', label: 'ジャンル', icon: Layers }, { id: 'tags', label: 'タグ・色', icon: Palette }, { id: 'system', label: 'システム', icon: Sliders }, { id: 'data', label: 'データ', icon: ShieldAlert }].map(tab => (
          <button key={tab.id} onClick={() => setActiveConfigTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeConfigTab === tab.id ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeConfigTab === 'profile' && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6 animate-in fade-in">
             {/* ... 既存プロフィール項目 ... */}
             <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><UserIcon className="w-5 h-5" /> 基本プロフィール</h4>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">表示名</label>
                <input type="text" placeholder="配信者名" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-slate-900 bg-white/50 focus:bg-white transition" />
              </div>
              
              {/* 画像設定 (プレビュー & アップロード付き) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">アイコン画像</label>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-inner">
                      {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8 m-4 text-slate-300" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 cursor-pointer hover:bg-blue-100 transition text-xs font-bold">
                        <Upload className="w-4 h-4" /> 写真を選択
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatarUrl')} className="hidden" />
                      </label>
                      <input type="text" placeholder="またはURLを入力..." value={profile.avatarUrl || ""} onChange={e => setProfile({...profile, avatarUrl: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200 text-xs outline-none bg-white/50 focus:bg-white transition" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">背景画像</label>
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-inner relative">
                      {profile.backgroundImage ? <img src={profile.backgroundImage} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">No Image</div>}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 cursor-pointer hover:bg-blue-100 transition text-xs font-bold">
                        <Upload className="w-4 h-4" /> 写真を選択
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} className="hidden" />
                      </label>
                      <input type="text" placeholder="またはURLを入力..." value={profile.backgroundImage || ""} onChange={e => setProfile({...profile, backgroundImage: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200 text-xs outline-none bg-white/50 focus:bg-white transition" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">自己紹介</label>
                <textarea placeholder="リスナーに向けたメッセージ..." value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none h-24 resize-none text-slate-900 bg-white/50 focus:bg-white transition" />
              </div>
             
             {/* ★No.28 スケジュール設定 */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2"><Calendar className="w-3 h-3" /> 次回の配信スケジュール</label>
                <input type="text" placeholder="例: 12/25 21:00〜 クリスマス歌枠！" value={profile.schedule || ""} onChange={e => setProfile({...profile, schedule: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-slate-900 bg-white/50 focus:bg-white transition" />
             </div>
             
             <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-yellow-800 flex items-center gap-2"><Megaphone className="w-4 h-4" /> お知らせバー</label>
                  <ToggleSwitch checked={profile.announcement?.active || false} onChange={v => setProfile({...profile, announcement: { ...profile.announcement, active: v }})} label="" />
                </div>
                <input 
                  type="text" 
                  placeholder="配信中！リクエスト募集中✨" 
                  value={profile.announcement?.text || ""} 
                  onChange={e => setProfile({...profile, announcement: { ...profile.announcement, text: e.target.value }})} 
                  className="w-full p-3 text-sm border border-yellow-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-yellow-400 transition shadow-sm" 
                />
              </div>
          </div>
        )}

        {/* ... (links, categories は省略なしで記述) ... */}
        {activeConfigTab === 'links' && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6 animate-in fade-in">
            {/* ...既存のリンク設定... */}
            <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><LinkIcon className="w-5 h-5" /> リンク設定</h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">プリセットから追加</label>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => addPresetLink("Twitter", "https://twitter.com/")} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-500 text-xs font-bold border border-blue-100 hover:bg-blue-100 transition flex items-center gap-1"><Twitter className="w-3 h-3" /> Twitter</button>
                <button onClick={() => addPresetLink("YouTube", "https://youtube.com/@")} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold border border-red-100 hover:bg-red-100 transition flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube</button>
                <button onClick={() => addPresetLink("Twitch", "https://twitch.tv/")} className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-500 text-xs font-bold border border-purple-100 hover:bg-purple-100 transition flex items-center gap-1"><Twitch className="w-3 h-3" /> Twitch</button>
                <button onClick={() => addPresetLink("REALITY", "https://reality.app/")} className="px-3 py-1.5 rounded-lg bg-pink-50 text-pink-500 text-xs font-bold border border-pink-100 hover:bg-pink-100 transition flex items-center gap-1"><Smartphone className="w-3 h-3" /> REALITY</button>
                <button onClick={() => addPresetLink("その他", "https://")} className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-xs font-bold border border-slate-100 hover:bg-slate-100 transition flex items-center gap-1"><Globe className="w-3 h-3" /> カスタム</button>
              </div>
            </div>
            <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 font-bold mb-1 block">サイト名・ラベル</label>
                <input type="text" placeholder="例: サブ垢" value={newLink.label} onChange={e => setNewLink({...newLink, label: e.target.value})} className="w-full p-2 text-sm rounded-lg border border-slate-200 outline-none" />
              </div>
              <div className="flex-[2]">
                <label className="text-[10px] text-slate-400 font-bold mb-1 block">URL</label>
                <input type="text" placeholder="https://..." value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} className="w-full p-2 text-sm rounded-lg border border-slate-200 outline-none" />
              </div>
              <button onClick={addCustomLink} disabled={!newLink.label || !newLink.url} className="bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition">追加</button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">登録済みのリンク</label>
              {(!profile.customLinks || profile.customLinks.length === 0) && (!profile.twitter && !profile.youtube) && <p className="text-sm text-slate-400 text-center py-4">リンクは登録されていません</p>}
              {profile.twitter && <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl"><div className="flex items-center gap-2 text-blue-500"><Twitter className="w-4 h-4" /><span className="text-sm font-bold">Twitter</span><span className="text-xs text-slate-400">@{profile.twitter}</span></div><button onClick={() => setProfile({...profile, twitter: ""})} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button></div>}
              {profile.youtube && <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl"><div className="flex items-center gap-2 text-red-500"><Youtube className="w-4 h-4" /><span className="text-sm font-bold">YouTube</span><span className="text-xs text-slate-400 truncate max-w-[200px]">{profile.youtube}</span></div><button onClick={() => setProfile({...profile, youtube: ""})} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button></div>}
              {profile.customLinks?.map((link: any) => (
                <div key={link.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><LinkIcon className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{link.label}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{link.url}</p>
                    </div>
                  </div>
                  <button onClick={() => removeCustomLink(link.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeConfigTab === 'categories' && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6 animate-in fade-in">
            {/* ...既存のカテゴリ設定... */}
            <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><Layers className="w-5 h-5" /> ジャンル(カテゴリ)管理</h4>
            <div className="flex gap-2">
              <input type="text" placeholder="新しいジャンル名 (例: K-POP)" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-3 rounded-xl border border-slate-200 text-sm outline-none" />
              <button onClick={addCategory} disabled={!newCategory} className="bg-green-600 disabled:opacity-50 text-white px-6 rounded-xl font-bold hover:bg-green-700 transition">追加</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {editingCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="font-bold text-sm text-slate-700">{cat}</span>
                  <button onClick={() => removeCategory(cat)} className="text-slate-300 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">※ 削除しても、そのジャンルに設定されている曲データは消えませんが、ジャンル分け機能などからは除外されます。</p>
          </div>
        )}

        {activeConfigTab === 'tags' && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6 animate-in fade-in">
            {/* ... 既存タグ設定 ... */}
            <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><Palette className="w-5 h-5" /> タグ設定</h4>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">新しいタグを追加</label>
              <div className="flex gap-2 items-center">
                <input type="text" placeholder="タグ名 (例: しっとり)" value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-1 p-3 rounded-xl border border-slate-200 text-sm outline-none" />
                <select value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="p-3 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                  <option value="gray">灰</option>
                  <option value="blue">青</option>
                  <option value="red">赤</option>
                  <option value="green">緑</option>
                  <option value="yellow">黄</option>
                  <option value="purple">紫</option>
                  <option value="pink">桃</option>
                  <option value="orange">橙</option>
                </select>
                <button onClick={addTag} disabled={!newTag} className="bg-blue-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition">追加</button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">タグ一覧・色変更</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* ★修正: safeCustomTags を使用 */}
                {safeCustomTags.map((tag: string) => (
                  <div key={tag} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                    {/* ★修正箇所: 不正なキーに対するガード処理を追加 */}
                    <div className={`w-3 h-3 rounded-full ${(COLOR_PALETTE[profile.tagColors?.[tag] || "gray"] || COLOR_PALETTE["gray"]).split(" ")[0]}`}></div>
                    <span className="flex-1 text-sm font-bold text-slate-700">#{tag}</span>
                    <select value={profile.tagColors?.[tag] || "gray"} onChange={(e) => updateTagColor(tag, e.target.value)} className="text-xs border-none bg-transparent outline-none cursor-pointer text-slate-500">
                      <option value="gray">灰</option>
                      <option value="blue">青</option>
                      <option value="red">赤</option>
                      <option value="green">緑</option>
                      <option value="yellow">黄</option>
                      <option value="purple">紫</option>
                      <option value="pink">桃</option>
                      <option value="orange">橙</option>
                    </select>
                    <button onClick={() => removeTag(tag)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* ★No.7 タググループ設定 */}
            <div className="border-t border-slate-100 pt-6 mt-6">
              <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><FolderHeart className="w-4 h-4" /> タググループ（ムード検索用）</h5>
              <p className="text-xs text-slate-400 mb-4">公開ページの「ムード検索」で表示されるグループを作れます。</p>
              
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="グループ名 (例: 雰囲気)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="flex-1 p-2 rounded-lg border border-slate-200 text-sm" />
                <button onClick={addTagGroup} disabled={!newGroupName} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs">作成</button>
              </div>

              <div className="space-y-4">
                {editingTagGroups.map((group, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-blue-800">{group.name}</span>
                      <button onClick={() => removeTagGroup(idx)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {/* ★修正: safeCustomTags を使用 */}
                      {safeCustomTags.map((tag: string) => (
                        <button 
                          key={tag} 
                          onClick={() => toggleTagInGroup(idx, tag)}
                          // ★修正: group.tags が undefined の場合のガード処理 (|| []) を追加
                          className={`text-[10px] px-2 py-1 rounded border transition ${(group.tags || []).includes(tag) ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200"}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeConfigTab === 'system' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6">
              <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><Sliders className="w-5 h-5" /> 機能・動作設定</h4>
              
              <div className="divide-y divide-slate-100">
                <ToggleSwitch checked={profile.isRequestEnabled ?? true} onChange={v => setProfile({...profile, isRequestEnabled: v})} label="リクエスト受付" description="OFFにすると、公開ページからのリクエストを停止します。" />
                <ToggleSwitch checked={profile.soundEnabled || false} onChange={v => setProfile({...profile, soundEnabled: v})} label="通知音" description="新しいリクエストが届いた時に音を鳴らします。" />
                <ToggleSwitch checked={profile.isAcceptedKept || false} onChange={v => setProfile({...profile, isAcceptedKept: v})} label="承認済みを表示に残す" description="ON推奨: 承認しても「対応中」としてリストに残します。完了すると消えます。" />
                <ToggleSwitch checked={profile.isAutoCategoryEnabled ?? true} onChange={v => setProfile({...profile, isAutoCategoryEnabled: v})} label="インポート時の自動分類" description="曲追加時にアーティスト名からカテゴリを推測します。" />
              </div>

              {/* ★No.2 NGワード設定 */}
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-2"><Ban className="w-3 h-3" /> リクエストNGワード</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="禁止用語を追加..." value={newNgWord} onChange={e => setNewNgWord(e.target.value)} className="flex-1 p-2 rounded-lg border border-slate-200 text-sm" />
                  <button onClick={addNgWord} className="bg-red-50 text-red-500 px-4 py-2 rounded-lg font-bold text-xs border border-red-100 hover:bg-red-100">追加</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.ngKeywords?.map((word: string) => (
                    <span key={word} className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs flex items-center gap-1">
                      {word} <button onClick={() => removeNgWord(word)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6">
              <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><Monitor className="w-5 h-5" /> 外観テーマ</h4>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">世界観テーマ (Theme)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* ★No.21 季節限定テーマ追加 */}
                  {[
                    { id: 'default', label: '標準 (Modern)', color: 'bg-white border-slate-200' },
                    { id: 'neon', label: 'ネオン (Cyber)', color: 'bg-slate-900 border-blue-500 text-blue-400' },
                    { id: 'retro', label: 'レトロ (Pixel)', color: 'bg-yellow-100 border-orange-400 text-orange-800' },
                    { id: 'japanese', label: '和風 (Japan)', color: 'bg-red-50 border-red-200 text-red-800' },
                    { id: 'glitch', label: 'グリッチ (Glitch)', color: 'bg-black border-green-500 text-green-400' },
                    { id: 'sakura', label: '春・桜 (Sakura)', color: 'bg-pink-50 border-pink-300 text-pink-600' },
                    { id: 'summer', label: '夏・海 (Summer)', color: 'bg-cyan-50 border-cyan-300 text-cyan-600' },
                    { id: 'halloween', label: 'ハロウィン', color: 'bg-purple-900 border-orange-500 text-orange-400' },
                    { id: 'winter', label: '冬・雪 (Winter)', color: 'bg-slate-100 border-slate-300 text-slate-600' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setProfile({...profile, themeStyle: theme.id})}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${profile.themeStyle === theme.id ? "ring-2 ring-blue-500 ring-offset-2 scale-105" : "opacity-70 hover:opacity-100"} ${theme.color}`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">背景画像の不透明度</label>
                    <span className="text-xs font-bold text-slate-700">{Math.round((profile.backgroundOpacity ?? 0.5) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05" 
                    value={profile.backgroundOpacity ?? 0.5} 
                    onChange={e => setProfile({...profile, backgroundOpacity: parseFloat(e.target.value)})}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">数値を上げると背景画像がはっきり見えます。</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">背景フィルターの濃さ</label>
                    <span className="text-xs font-bold text-slate-700">{Math.round((profile.overlayOpacity ?? 0.3) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05" 
                    value={profile.overlayOpacity ?? 0.3} 
                    onChange={e => setProfile({...profile, overlayOpacity: parseFloat(e.target.value)})}
                    className="w-full accent-slate-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">文字を見やすくするための黒（または白）フィルターの濃さです。</p>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">フォント設定</label>
                  <select 
                    value={profile.fontFamily || "sans"} 
                    onChange={e => setProfile({...profile, fontFamily: e.target.value})}
                    className="w-full p-2 border rounded-lg bg-slate-50 text-sm"
                  >
                    <option value="sans">ゴシック (標準)</option>
                    <option value="serif">明朝体 (Serif)</option>
                    <option value="rounded">丸ゴシック (Rounded)</option>
                    <option value="handwritten">手書き風 (Handwritten)</option>
                  </select>
                </div>
            </div>
          </div>
        )}
        
        {/* 6. データ管理 (変更なし) */}
        {activeConfigTab === 'data' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 space-y-6">
              <h4 className="font-bold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3"><ShieldAlert className="w-5 h-5" /> データバックアップ・連携</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={backupData} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition group text-left">
                  <Download className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2" />
                  <span className="font-bold">JSONバックアップ</span>
                  <span className="text-xs text-slate-400">全データをファイルに保存します</span>
                </button>
                <button onClick={handleCopyObsUrl} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-purple-50 hover:border-purple-200 text-slate-600 hover:text-purple-600 transition group">
                  <ImageIconLucide className="w-8 h-8 text-slate-400 group-hover:text-purple-500 mb-2" />
                  <span className="font-bold">OBS用URLコピー</span>
                  <span className="text-xs text-slate-400">配信画面用のURLを取得します</span>
                </button>
              </div>
              <div className="text-center pt-4 border-t border-slate-100">
                <button onClick={addDemoData} className="text-xs text-slate-400 hover:underline hover:text-blue-500">デモデータ（サンプル曲）を追加する</button>
              </div>
            </div>
            {profile.ngUsers && Object.keys(profile.ngUsers).length > 0 && (
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                <label className="block text-sm font-bold text-red-800 mb-2 flex items-center gap-2"><Ban className="w-4 h-4" /> NGユーザー一覧</label>
                <ul className="space-y-2">
                  {Object.entries(profile.ngUsers || {}).map(([uid, info]: any) => (
                    <li key={uid} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-red-100">
                      <span>{info.name}</span>
                      <button onClick={() => handleUnblock(uid)} className="text-red-500 hover:underline bg-red-50 px-3 py-1 rounded-lg font-bold">解除</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- ★No.4 Current Setlist Modal (拡張: プリセット機能) --- */
const CurrentSetlistModal = ({ isOpen, onClose, songs, userId, showToast }: any) => {
  const [presets, setPresets] = useState<SetlistPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [mode, setMode] = useState<'current' | 'presets'>('current');

  useEffect(() => {
    if(isOpen) {
      onValue(ref(db, `users/${userId}/settings/setlistPresets`), (snap) => {
        setPresets(snap.val() ? Object.values(snap.val()) : []);
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;
  const setlistSongs = songs.filter((s: SongData) => s.isSetlist).sort((a: any, b: any) => (a.setlistOrder || 0) - (b.setlistOrder || 0));

  const savePreset = async () => {
    if(!presetName || setlistSongs.length === 0) return;
    const newPreset = { id: Date.now().toString(), name: presetName, songIds: setlistSongs.map((s:SongData) => s.id) };
    await push(ref(db, `users/${userId}/settings/setlistPresets`), newPreset);
    setPresetName("");
    showToast("プリセットを保存しました");
  };

  const loadPreset = async (preset: SetlistPreset) => {
    if(!confirm(`プリセット「${preset.name}」を読み込みますか？\n(現在のセトリは上書きされます)`)) return;
    const updates: any = {};
    // まず全クリア
    songs.forEach((s: SongData) => { if(s.isSetlist) updates[`users/${userId}/songs/${s.id}/isSetlist`] = false; });
    // プリセット適用
    preset.songIds.forEach((id, idx) => {
      updates[`users/${userId}/songs/${id}/isSetlist`] = true;
      updates[`users/${userId}/songs/${id}/setlistOrder`] = Date.now() + idx;
    });
    await update(ref(db), updates);
    showToast("読み込みました");
    setMode('current');
  };

  const deletePreset = async (id: string) => {
    if(!confirm("削除しますか？")) return;
    // Realtime Databaseの検索削除は面倒なので、本来はKeyで管理すべきだが今回はフィルタで対応
    // ※ 簡略化のため、実際の実装ではIDをキーにして保存することを推奨
    // ここでは再取得して上書きする簡易実装
    const newPresets = presets.filter(p => p.id !== id);
    await set(ref(db, `users/${userId}/settings/setlistPresets`), newPresets);
  };

  // ... (copyText, saveLog, clearAll は既存維持) ...
  const copyText = () => { 
    const text = setlistSongs.map((s: SongData) => `・${s.title} / ${s.artist}`).join("\n");
    navigator.clipboard.writeText(text);
    showToast("テキストをコピーしました");
  };
  const saveLog = async () => {
    if (!confirm("履歴に保存し、曲のデータを更新しますか？")) return;
    const historyData = { date: Date.now(), songs: setlistSongs.map((s: SongData) => ({ title: s.title, artist: s.artist, id: s.id })) };
    await push(ref(db, `users/${userId}/setlist_history`), historyData);
    const updates: any = {}; const now = Date.now();
    setlistSongs.forEach((song: SongData) => {
      updates[`users/${userId}/songs/${song.id}/lastSungAt`] = now;
      updates[`users/${userId}/songs/${song.id}/sungCount`] = (song.sungCount || 0) + 1;
      updates[`users/${userId}/songs/${song.id}/isSetlist`] = false;
    });
    await update(ref(db), updates);
    showToast("保存してクリアしました");
    onClose();
  };
  const clearAll = async () => {
    if (!confirm("セトリを空にしますか？")) return;
    const updates: any = {};
    setlistSongs.forEach((song: SongData) => updates[`users/${userId}/songs/${song.id}/isSetlist`] = false);
    await update(ref(db), updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setMode('current')} className={`text-lg font-bold ${mode === 'current' ? 'text-slate-800 border-b-2 border-blue-500' : 'text-slate-400'}`}>現在のセトリ</button>
          <button onClick={() => setMode('presets')} className={`text-lg font-bold ${mode === 'presets' ? 'text-slate-800 border-b-2 border-blue-500' : 'text-slate-400'}`}>プリセット</button>
        </div>
        
        {mode === 'current' ? (
          <>
            <div className="bg-slate-50 rounded-xl p-4 max-h-[40vh] overflow-y-auto mb-4 border border-slate-100">
              {setlistSongs.length === 0 ? <p className="text-slate-400 text-center text-sm">曲がありません</p> : (
                <ul className="space-y-2">
                  {setlistSongs.map((s: SongData, i: number) => (
                    <li key={s.id} className="flex gap-2 text-sm text-slate-700 border-b border-slate-200 pb-2 last:border-none">
                      <span className="font-bold text-blue-400 w-5">{i+1}.</span><span className="font-bold">{s.title}</span><span className="text-slate-400 text-xs self-center">- {s.artist}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="今のリストをプリセット保存..." value={presetName} onChange={e => setPresetName(e.target.value)} className="flex-1 text-xs p-2 border rounded-lg" />
              <button onClick={savePreset} disabled={!presetName || setlistSongs.length===0} className="bg-slate-800 text-white text-xs px-3 rounded-lg font-bold">保存</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={copyText} className="col-span-2 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> テキストコピー</button>
              <button onClick={saveLog} className="py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"><Save className="w-4 h-4" /> 保存して終了</button>
              <button onClick={clearAll} className="py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> クリア</button>
            </div>
          </>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {presets.length === 0 ? <p className="text-center text-slate-400 text-sm py-8">プリセットがありません</p> : presets.map(p => (
              <div key={p.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-700 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.songIds.length}曲</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadPreset(p)} className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-200">読込</button>
                  <button onClick={() => deletePreset(p.id)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- Song Modal (拡張: 練習進捗・重複チェック・自分用メモ) --- */
const SongModal = ({ isOpen, onClose, initialData, userId, customTags = [], categories = [], songs }: any) => { // songsを受け取るように変更
  const [title, setTitle] = useState(initialData?.title || "");
  const [reading, setReading] = useState(initialData?.reading || ""); 
  const [artist, setArtist] = useState(initialData?.artist || "");
  const [category, setCategory] = useState(initialData?.category || categories[0] || "J-POP"); 
  const [key, setKey] = useState(initialData?.key || "");
  const [bpm, setBpm] = useState(initialData?.bpm || ""); 
  const [noteRange, setNoteRange] = useState(initialData?.noteRange || ""); 
  const [rating, setRating] = useState(initialData?.rating || 0); 
  const [memo, setMemo] = useState(initialData?.memo || "");
  const [lyricsUrl, setLyricsUrl] = useState(initialData?.lyricsUrl || ""); 
  const [tagsInput, setTagsInput] = useState<string>(initialData?.tags ? initialData.tags.join(" ") : "");
  
  // ★No.1, 5
  const [practiceRate, setPracticeRate] = useState(initialData?.practiceRate || 0);
  const [privateMemo, setPrivateMemo] = useState(initialData?.privateMemo || "");
  // ★No.8 重複警告
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // ★No.8 重複チェックロジック
  useEffect(() => {
    if (!title || initialData) return; // 編集時はチェックしない
    const normTitle = normalize(title);
    const dup = songs?.find((s: SongData) => normalize(s.title) === normTitle);
    if (dup) setDuplicateWarning(`「${dup.title}」は既に登録されています`);
    else setDuplicateWarning(null);
  }, [title, songs, initialData]);

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    const tags = tagsInput.replace(/　/g, " ").split(" ").filter((t: string) => t.trim() !== ""); 
    const payload = { 
      title, reading, artist, category, tags, key, memo, lyricsUrl, bpm, noteRange, 
      rating: Number(rating), 
      practiceRate: Number(practiceRate), // 追加
      privateMemo // 追加
    }; 
    if (initialData?.id) { await update(ref(db, `users/${userId}/songs/${initialData.id}`), payload); } 
    else { await push(ref(db, `users/${userId}/songs`), { ...payload, likes: 0, sungCount: 0, createdAt: Date.now() }); } 
    onClose(); 
  };

  const addTag = (tag: string) => { if (!tagsInput.includes(tag)) { setTagsInput((prev: string) => (prev + " " + tag).trim()); } };
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Music className="w-6 h-6 text-blue-600" /> {initialData ? "曲を編集" : "新しい曲を追加"}</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">曲名 <span className="text-red-500">*</span></label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 bg-white" placeholder="例: マリーゴールド" />
              {duplicateWarning && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {duplicateWarning}</p>}
            </div>
            {/* ... (artist, reading, category, key は既存維持) ... */}
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Type className="w-3 h-3" /> ふりがな</label><input type="text" value={reading} onChange={e => setReading(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 bg-white" placeholder="例: まりーごーるど" /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">アーティスト <span className="text-red-500">*</span></label><input type="text" required value={artist} onChange={e => setArtist(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="例: あいみょん" /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">カテゴリー</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900">{categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">キー (Key)</label><input type="text" value={key} onChange={e => setKey(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="例: +2, 原キー" /></div>
            
            {/* ★No.1 練習進捗 */}
            <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                <span>練習・習熟度</span>
                <span>{practiceRate}%</span>
              </label>
              <input type="range" min="0" max="100" step="10" value={practiceRate} onChange={e => setPracticeRate(Number(e.target.value))} className="w-full accent-green-500" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>未着手</span><span>暗記中</span><span>歌える</span><span>十八番</span></div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-500">自己評価:</span>
                <div className="flex"><StarRating rating={rating} /></div>
                <input type="range" min="0" max="5" value={rating} onChange={e => setRating(Number(e.target.value))} className="w-20 accent-yellow-400 ml-auto" />
              </div>
            </div>

            {/* ... (BPM, Range, LyricsUrl は既存維持) ... */}
            <div className="col-span-2 flex gap-4"><div className="w-20"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">BPM</label><input type="text" value={bpm} onChange={e => setBpm(e.target.value)} className="w-full p-2 border rounded text-center" placeholder="120" /></div><div className="w-24"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">音域</label><input type="text" value={noteRange} onChange={e => setNoteRange(e.target.value)} className="w-full p-2 border rounded text-center" placeholder="mid1C~hiC" /></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> 歌詞URL</label><input type="text" value={lyricsUrl} onChange={e => setLyricsUrl(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="https://..." /></div></div>

            {/* メモ */}
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">公開メモ (リスナーに見えます)</label><textarea value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none text-sm text-slate-900 bg-white" placeholder="例: Aメロは優しく..." /></div>
            
            {/* ★No.5 自分用メモ */}
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Lock className="w-3 h-3" /> 自分用メモ (非公開)</label><textarea value={privateMemo} onChange={e => setPrivateMemo(e.target.value)} className="w-full p-3 rounded-lg border border-yellow-200 bg-yellow-50 focus:ring-2 focus:ring-yellow-400 outline-none h-16 resize-none text-sm text-slate-800" placeholder="例: 裏声注意、Cメロブレス位置..." /></div>

            {/* タグ */}
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">タグ</label><div className="relative mb-2"><Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full p-3 pl-9 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="初見歓迎 練習中" /></div>{customTags && customTags.length > 0 && (<div className="flex flex-wrap gap-1">{customTags.map((tag: string) => (<button key={tag} type="button" onClick={() => addTag(tag)} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition border border-slate-200">+ {tag}</button>))}</div>)}</div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-900/20 mt-2">保存する</button>
        </form>
      </div>
    </div>
  );
};

/* --- Dashboard Main (propsにsongsを追加してSongModalへ渡す) --- */
export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  // ... (省略なし)
  const router = useRouter(); 
  const [activeTab, setActiveTab] = useState<'home' | 'songs' | 'requests' | 'history' | 'settings'>('home'); 
  const [songs, setSongs] = useState<SongData[]>([]);
  // ... (State定義は既存通り)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongData | undefined>(undefined);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [stats, setStats] = useState({ totalSongs: 0, totalLikes: 0, pendingRequests: 0 });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSetlistOpen, setIsSetlistOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const showToast = (msg: string) => setToastMessage(msg);

  useEffect(() => { if (!loading && !user) router.push("/"); }, [user, loading, router]);
  useEffect(() => {
    if (!user) return;
    const songsRef = ref(db, `users/${user.uid}/songs`);
    const unsubSongs = onValue(songsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedSongs: SongData[] = data ? Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })) : [];
      setSongs(loadedSongs);
      const likes = loadedSongs.reduce((acc, song) => acc + (song.likes || 0), 0);
      setStats(prev => ({ ...prev, totalSongs: loadedSongs.length, totalLikes: likes }));
    });
    // ... (requests, profile, categories, tags のリスナーも既存通り)
    const reqRef = ref(db, `users/${user.uid}/requests`);
    const unsubReq = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reqList = Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v }));
        setRequests(reqList);
        const pending = reqList.filter((r) => r.status === 'pending').length;
        setStats(prev => ({ ...prev, pendingRequests: pending }));
      }
    });
    const profileRef = ref(db, `users/${user.uid}/profile`);
    const unsubProfile = onValue(profileRef, (snap) => {
      if(snap.exists()) setProfile(snap.val());
      else setProfile({ 
        displayName: "", bio: "", avatarUrl: "", twitter: "", youtube: "", twitch: "", tiktok: "", otherUrl: "",
        themeColor: "blue", fontFamily: "sans", backgroundImage: "", isRequestEnabled: true,
        announcement: { text: "", active: false }, tagColors: {}, ngUsers: {}, soundEnabled: false
      });
    });
    const catRef = ref(db, `users/${user.uid}/settings/categories`);
    const unsubCat = onValue(catRef, (snapshot) => { setCategories(snapshot.val() || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"]); });
    const tagRef = ref(db, `users/${user.uid}/settings/customTags`);
    const unsubTag = onValue(tagRef, (snapshot) => { setCustomTags(snapshot.val() || ["初見歓迎", "練習中", "バラード", "盛り上げ", "弾き語り"]); });
    return () => { unsubSongs(); unsubReq(); unsubCat(); unsubTag(); unsubProfile(); };
  }, [user]);

  const openModal = (song?: SongData) => { setEditingSong(song); setIsModalOpen(true); };
  const currentSetlistCount = songs.filter(s => s.isSetlist).length;

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-pink-50 z-0 pointer-events-none opacity-60"></div>
      
      <div className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 left-0 bg-white border-r border-slate-100 p-6 z-30 shadow-sm">
        <div className="flex items-center gap-2 mb-8"><div className="bg-blue-600 p-2 rounded-xl"><Music className="w-6 h-6 text-white" /></div><h1 className="text-xl font-black text-slate-800 tracking-tight">SongList</h1></div>
        <nav className="flex-1 space-y-2">
          <SidebarButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={HomeIcon} label="ホーム" />
          <SidebarButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="曲リスト" />
          <SidebarButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={MessageSquare} label="リクエスト" badge={stats.pendingRequests} />
          <SidebarButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Activity} label="分析 / ログ" />
          <SidebarButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
        </nav>
        <div className="border-t border-slate-100 pt-4 mt-auto">
          <a href={`/user/${user.uid}`} target="_blank" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 mb-4 px-2"><ExternalLink className="w-4 h-4" /> 公開ページ</a>
          <button onClick={() => logout()} className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-500 px-2"><LogOut className="w-4 h-4" /> ログアウト</button>
        </div>
      </div>

      <main className="md:ml-64 p-4 md:p-8 pb-32 md:pb-8 relative z-10 max-w-5xl mx-auto">
        <div className="md:hidden flex justify-between items-center mb-6 sticky top-0 bg-white/80 backdrop-blur-md p-4 -mx-4 z-30 border-b border-slate-100">
          <div className="flex items-center gap-2"><div className="bg-blue-600 p-1.5 rounded-lg"><Music className="w-5 h-5 text-white" /></div><h1 className="font-black text-slate-800">SongList</h1></div>
          <div className="flex gap-3"><Link href={`/user/${user.uid}`} target="_blank" className="p-2 rounded-full bg-slate-100 text-blue-600"><ExternalLink className="w-5 h-5" /></Link><div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden"><img src={user.photoURL || ""} alt="User" /></div></div>
        </div>

        {/* ... (StatCards, HomeMenu等は既存通り) ... */}
        {activeTab !== 'home' && (
          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
            <StatCard icon={ListMusic} label="曲数" value={stats.totalSongs} color="bg-blue-500" />
            <StatCard icon={Heart} label="いいね" value={stats.totalLikes} color="bg-pink-500" />
            <StatCard icon={MessageSquare} label="未読" value={stats.pendingRequests} color="bg-green-500" />
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'home' && (
            <HomeMenu 
              onNavigate={setActiveTab} 
              onOpenImport={() => setIsImportModalOpen(true)}
              onOpenSetlist={() => setIsSetlistOpen(true)}
              onAddSong={() => { setActiveTab('songs'); setTimeout(() => openModal(), 100); }} 
              stats={stats}
            />
          )}
          
          {activeTab === 'songs' && <SongManager userId={user.uid} songs={songs} onEdit={openModal} customTags={customTags} tagColors={profile?.tagColors} categories={categories} showToast={showToast} onOpenImport={() => setIsImportModalOpen(true)} defaultSortType={profile?.defaultSortType} />}
          {activeTab === 'requests' && <RequestManager userId={user.uid} ngUsers={profile?.ngUsers} requests={requests} soundEnabled={profile?.soundEnabled} showToast={showToast} isAcceptedKept={profile?.isAcceptedKept} />}
          {activeTab === 'history' && <HistoryManager userId={user.uid} songs={songs} requests={requests} showToast={showToast} />}
          {activeTab === 'settings' && profile && <ProfileEditor userId={user.uid} customTags={customTags} onTagsUpdate={setCustomTags} songs={songs} categories={categories} onCategoriesUpdate={setCategories} profile={profile} setProfile={setProfile} showToast={showToast} />}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 px-2 pb-safe-area">
        <div className="flex justify-around items-center h-16">
          <BottomNavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={HomeIcon} label="ホーム" />
          <BottomNavButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="曲リスト" />
          <BottomNavButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={MessageSquare} label="リクエスト" badge={stats.pendingRequests} />
          <BottomNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Activity} label="分析" />
          <BottomNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
        </div>
      </div>

      <div className="fixed bottom-24 md:bottom-10 right-6 md:right-10 z-40 flex flex-col gap-3 items-end">
        <button onClick={() => setIsSetlistOpen(true)} className={`flex items-center gap-2 p-4 rounded-full shadow-lg transition-all ${currentSetlistCount > 0 ? "bg-yellow-400 text-yellow-900 hover:scale-110" : "bg-white text-slate-400 hover:bg-slate-50"}`}>
          <ClipboardList className="w-6 h-6" />
          {currentSetlistCount > 0 && <span className="font-black">{currentSetlistCount}</span>}
        </button>
        {activeTab === 'songs' && (
          <button onClick={() => openModal()} className="bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-900/30 hover:bg-slate-800 transition hover:scale-110 flex items-center gap-2 font-bold ring-4 ring-white/50">
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ★SongModalにsongsを渡す (重複チェック用) */}
      {isModalOpen && <SongModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingSong} userId={user.uid} customTags={customTags} categories={categories} songs={songs} />}
      {isSetlistOpen && <CurrentSetlistModal isOpen={isSetlistOpen} onClose={() => setIsSetlistOpen(false)} songs={songs} userId={user.uid} showToast={showToast} />}
      <SmartImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} userId={user.uid} categories={categories} songs={songs} showToast={showToast} isAutoCategoryEnabled={profile?.isAutoCategoryEnabled} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}