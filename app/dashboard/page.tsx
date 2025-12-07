"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase"; 
import { ref, onValue, remove, push, update, get, runTransaction, set } from "firebase/database";
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation";
import { 
  Music, User as UserIcon, Plus, X, 
  ExternalLink, Hash, ListMusic, MessageSquare, Settings,
  Heart, Mic2, CheckCircle2, Loader2, Twitter, Save,
  FileText, Music2, Type, FileUp, QrCode, Link as LinkIcon,
  ToggleLeft, ToggleRight, ListChecks, Copy, Search, History,
  Eraser, Youtube, Twitch, CalendarDays, ImageIcon, ArrowUp,
  Clock, Image as ImageIconLucide, Download, Edit, CheckSquare,
  Ban, Megaphone, MoreVertical, LogOut, LayoutDashboard
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
  reading?: string;
  lyricsUrl?: string;
  isSetlist?: boolean;
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
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  createdAt: number;
  completedAt?: number;
};

type SetlistLog = {
  id: string;
  date: number;
  songs: { title: string; artist: string; id: string }[];
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
  themeColor: string;
  fontFamily: string;
  backgroundImage: string;
  isRequestEnabled: boolean;
  customTags?: string[];
  announcement?: { text: string; active: boolean };
  tagColors?: Record<string, string>;
  ngUsers?: Record<string, { name: string; date: number }>;
};

const normalize = (text: string) => {
  return text.trim().toLowerCase()
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '');
};

const COLOR_PALETTE: Record<string, string> = {
  gray: "bg-slate-100 text-slate-600",
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
  orange: "bg-orange-100 text-orange-700",
};

/* --- UI Components --- */
const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 transition hover:shadow-md h-full">
    <div className={`p-3 rounded-xl ${color} text-white shadow-md`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-center">
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);

// スマホ用ボトムナビボタン（デザイン統一）
const BottomNavButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 ${
      active ? "text-blue-600 scale-105" : "text-slate-400 hover:text-slate-600"
    }`}
  >
    <div className="relative">
      <Icon className={`w-6 h-6 mb-1 ${active ? "fill-current" : ""}`} />
      {badge > 0 && (
        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className="text-[9px] font-bold">{label}</span>
  </button>
);

// PC用サイドメニューボタン
const SidebarButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${
      active 
        ? "bg-blue-50 text-blue-600 shadow-sm" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? "fill-blue-600/20" : ""}`} />
    <span className="flex-1 text-left">{label}</span>
    {badge > 0 && (
      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

/* --- Sub-Features --- */

// --- 1. Song Manager ---
const SongManager = ({ userId, songs, onEdit, customTags, tagColors = {} }: { userId: string, songs: SongData[], onEdit: (s: SongData) => void, customTags: string[], tagColors?: Record<string, string> }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'public' | 'practice'>('all');

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    await remove(ref(db, `users/${userId}/songs/${id}`));
  };

  const toggleSetlist = async (song: SongData) => {
    await update(ref(db, `users/${userId}/songs/${song.id}`), { isSetlist: !song.isSetlist });
  };

  const exportCsv = () => {
    const header = "曲名,アーティスト,カテゴリー,キー,歌唱回数,タグ,メモ\n";
    const body = songs.map(s => {
      const tags = s.tags ? s.tags.join(" ") : "";
      return `"${s.title}","${s.artist}","${s.category}","${s.key || ""}","${s.sungCount || 0}","${tags}","${s.memo || ""}"`;
    }).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `song_list_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const bulkUpdateTags = async (tag: string, action: 'add' | 'remove') => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}曲にタグ「${tag}」を${action === 'add' ? '追加' : '削除'}しますか？`)) return;
    const updates: any = {};
    selectedIds.forEach(id => {
      const song = songs.find(s => s.id === id);
      if (song) {
        let newTags = song.tags || [];
        if (action === 'add' && !newTags.includes(tag)) newTags = [...newTags, tag];
        else if (action === 'remove') newTags = newTags.filter(t => t !== tag);
        updates[`users/${userId}/songs/${id}/tags`] = newTags;
      }
    });
    await update(ref(db), updates);
    alert("更新しました！");
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const getSearchUrl = (title: string, artist: string) => {
    const query = encodeURIComponent(`${title} ${artist} 歌詞`);
    return `https://www.google.com/search?q=${query}`;
  };

  const filteredSongs = songs.filter(song => {
    const term = normalize(searchTerm);
    const title = normalize(song.title);
    const artist = normalize(song.artist);
    const matchSearch = title.includes(term) || artist.includes(term);
    const isPractice = song.tags?.includes("練習中");
    let matchTab = true;
    if (viewFilter === 'public') matchTab = !isPractice;
    if (viewFilter === 'practice') matchTab = !!isPractice;
    return matchSearch && matchTab;
  });

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden flex flex-col h-full">
      {/* 検索・操作バー */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-4 sticky top-0 bg-white/90 z-20 backdrop-blur-md">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button onClick={() => setViewFilter('all')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${viewFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>すべて</button>
          <button onClick={() => setViewFilter('public')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${viewFilter === 'public' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}>公開中</button>
          <button onClick={() => setViewFilter('practice')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${viewFilter === 'practice' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-500'}`}>練習中</button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 w-full text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors" />
          </div>
          <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`px-3 rounded-xl border transition ${isSelectionMode ? "bg-blue-100 text-blue-600 border-blue-200" : "bg-white text-slate-400 border-slate-200"}`}><CheckSquare className="w-5 h-5" /></button>
          <button onClick={exportCsv} className="px-3 rounded-xl bg-white text-slate-400 border border-slate-200 hover:text-slate-600 transition"><Download className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 一括編集バー */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex flex-col gap-2 animate-in slide-in-from-top-2">
          <span className="text-sm font-bold text-blue-800">{selectedIds.size}曲を選択中</span>
          <div className="flex flex-wrap gap-2">
            {customTags.map((tag: string) => (
              <div key={tag} className="flex border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <button onClick={() => bulkUpdateTags(tag, 'add')} className="px-3 py-1.5 text-xs hover:bg-blue-50 text-blue-600 font-bold transition">+{tag}</button>
                <div className="w-px bg-slate-100"></div>
                <button onClick={() => bulkUpdateTags(tag, 'remove')} className="px-3 py-1.5 text-xs hover:bg-red-50 text-red-400 font-bold transition">-</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* リスト表示 */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
             <Music className="w-12 h-12 opacity-20 mb-2" />
             <p className="text-sm">曲が見つかりません</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSongs.map((song) => (
              <div key={song.id} className={`p-4 transition active:bg-slate-50 flex items-start gap-3 ${song.isSetlist ? "bg-yellow-50/50" : ""} ${selectedIds.has(song.id) ? "bg-blue-50" : ""}`}>
                {isSelectionMode ? (
                  <input type="checkbox" checked={selectedIds.has(song.id)} onChange={() => toggleSelection(song.id)} className="mt-1.5 w-5 h-5 rounded border-slate-300 accent-blue-600" />
                ) : (
                  <button onClick={() => toggleSetlist(song)} className={`mt-1 p-2 rounded-full transition shadow-sm ${song.isSetlist ? "text-yellow-600 bg-yellow-100 ring-2 ring-yellow-200" : "text-slate-300 bg-slate-100"}`}><ListChecks className="w-4 h-4" /></button>
                )}
                
                <div className="flex-1 min-w-0" onClick={() => !isSelectionMode && onEdit(song)}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{song.title}</h4>
                    {song.key && <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 whitespace-nowrap ml-2">{song.key}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mb-2 truncate">{song.artist}</p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{song.category}</span>
                    {song.tags && song.tags.map((tag: string) => {
                      const colorClass = tagColors[tag] ? COLOR_PALETTE[tagColors[tag]] : "bg-slate-100 text-slate-500";
                      return <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded border border-transparent ${colorClass}`}>#{tag}</span>;
                    })}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-pink-400 font-bold"><Heart className="w-3 h-3 fill-current" /> {song.likes || 0}</span>
                    {song.sungCount && song.sungCount > 0 && <span className="bg-blue-50 text-blue-600 px-1.5 rounded font-bold">{song.sungCount}回 歌唱</span>}
                    {song.lastSungAt && <span>{new Date(song.lastSungAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                {!isSelectionMode && <button onClick={() => onEdit(song)} className="p-2 text-slate-300 hover:text-blue-500"><Edit className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 2. Request Manager ---
const RequestManager = ({ userId }: { userId: string }) => {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reqRef = ref(db, `users/${userId}/requests`);
    return onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) { setRequests(Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v }))); } else { setRequests([]); }
      setLoading(false);
    });
  }, [userId]);

  const updateStatus = async (req: RequestData, newStatus: RequestData['status']) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') updates.completedAt = Date.now();
      await update(ref(db, `users/${userId}/requests/${req.id}`), updates);
      const songRef = ref(db, `users/${userId}/songs/${req.songId}`);
      const TARGET_TAG = "リクエスト";
      await runTransaction(songRef, (song) => {
        if (song) {
          const tags = song.tags || [];
          if (newStatus === 'accepted') { if (!tags.includes(TARGET_TAG)) song.tags = [...tags, TARGET_TAG]; }
          else if (newStatus === 'completed' || newStatus === 'rejected') {
            song.tags = tags.filter((t: string) => t !== TARGET_TAG);
            if (newStatus === 'completed') { song.lastSungAt = Date.now(); song.sungCount = (song.sungCount || 0) + 1; }
          }
        }
        return song;
      });
      if (newStatus === 'accepted') alert("承認しました！");
      if (newStatus === 'completed') alert("完了！回数を更新しました。");
    } catch (e) { console.error(e); alert("エラーが発生しました"); }
  };

  const blockUser = async (req: RequestData) => {
    if (!confirm(`ユーザー「${req.requesterName}」をブロックしますか？`)) return;
    await update(ref(db, `users/${userId}/profile/ngUsers/${req.requesterUid}`), { name: req.requesterName, date: Date.now() });
    await updateStatus(req, 'rejected');
    alert("ブロックしました");
  };

  const activeRequests = requests.filter(r => r.status !== 'completed' && r.status !== 'rejected');

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-4 md:p-6 mb-24 md:mb-0 min-h-[50vh]">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><MessageSquare className="w-5 h-5 text-green-500" /> 届いたリクエスト ({activeRequests.length})</h3>
      <div className="space-y-4">
        {activeRequests.length === 0 ? (
          <div className="text-center py-12"><div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8 text-slate-300" /></div><p className="text-slate-400 font-bold">現在リクエストはありません</p></div>
        ) : (
          activeRequests.sort((a,b) => b.createdAt - a.createdAt).map(req => (
            <div key={req.id} className={`p-5 rounded-2xl border shadow-sm transition ${req.status === 'accepted' ? 'bg-blue-50/80 border-blue-200' : 'bg-white border-slate-100'}`}>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{req.status}</span>
                      <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{req.songTitle}</h4>
                    <p className="text-xs text-slate-500 mt-1">by {req.requesterName}</p>
                  </div>
                </div>
                {req.comment && <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 italic border border-slate-100">"{req.comment}"</div>}
                
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {req.status === 'pending' ? (
                    <button onClick={() => updateStatus(req, 'accepted')} className="col-span-2 flex items-center justify-center gap-1 px-3 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition"><CheckCircle2 className="w-4 h-4" /> 承認</button>
                  ) : (
                    <button onClick={() => updateStatus(req, 'completed')} className="col-span-2 flex items-center justify-center gap-1 px-3 py-3 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 shadow-md shadow-green-500/20 active:scale-95 transition"><Mic2 className="w-4 h-4" /> 完了</button>
                  )}
                  <button onClick={() => updateStatus(req, 'rejected')} className="col-span-1 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 active:scale-95 transition font-bold text-xs"><X className="w-4 h-4 mr-1" />却下</button>
                  <button onClick={() => blockUser(req)} className="col-span-1 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-100 active:scale-95 transition font-bold text-xs"><Ban className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- History & Settings (UI調整) ---
const HistoryManager = ({ userId }: { userId: string }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'setlists'>('requests');
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [setlists, setSetlists] = useState<SetlistLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reqRef = ref(db, `users/${userId}/requests`);
    const unsubReq = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })).filter((r: RequestData) => r.status === 'completed');
        setRequests(list);
      } else { setRequests([]); }
    });
    const setlistRef = ref(db, `users/${userId}/setlist_history`);
    const unsubSetlist = onValue(setlistRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v }));
        setSetlists(list);
      } else { setSetlists([]); }
      setLoading(false);
    });
    return () => { unsubReq(); unsubSetlist(); };
  }, [userId]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-4 md:p-6 mb-24 md:mb-0 min-h-[50vh]">
      <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
        <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>履歴</button>
        <button onClick={() => setActiveTab('setlists')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'setlists' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>セトリログ</button>
      </div>
      {activeTab === 'requests' ? (
        <div className="space-y-3">
          {requests.length === 0 ? <p className="text-center text-slate-400 py-8">履歴はありません</p> : requests.sort((a,b) => (b.completedAt || 0) - (a.completedAt || 0)).map(req => (
            <div key={req.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{req.completedAt ? new Date(req.completedAt).toLocaleDateString() : "-"}</span><span>by {req.requesterName}</span></div>
              <div className="font-bold text-slate-700">{req.songTitle}</div>
              {req.comment && <div className="text-xs text-slate-500 mt-1 truncate">"{req.comment}"</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {setlists.length === 0 ? <p className="text-center text-slate-400 py-8">保存されたセトリはありません</p> : setlists.sort((a,b) => b.date - a.date).map(log => (
            <div key={log.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3"><h4 className="font-bold text-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" />{new Date(log.date).toLocaleDateString()}</h4><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{log.songs?.length || 0}曲</span></div>
              <div className="space-y-1">{log.songs?.map((s, i) => (<div key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-slate-300 w-4 text-right">{i+1}.</span><span className="font-bold truncate">{s.title}</span></div>))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Profile Editor (省略なし) ---
const ProfileEditor = ({ userId, customTags, onTagsUpdate, songs, categories, onCategoriesUpdate }: any) => {
  const [profile, setProfile] = useState<UserProfile>({ 
    displayName: "", bio: "", avatarUrl: "", twitter: "", youtube: "", twitch: "", tiktok: "", otherUrl: "",
    themeColor: "blue", fontFamily: "sans", backgroundImage: "", isRequestEnabled: true,
    announcement: { text: "", active: false }, tagColors: {}, ngUsers: {}
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [categoriesText, setCategoriesText] = useState(""); 
  const [csvText, setCsvText] = useState("");
  const [setlistText, setSetlistText] = useState("");
  const [setlistSongs, setSetlistSongs] = useState<SongData[]>([]);

  useEffect(() => {
    get(ref(db, `users/${userId}/profile`)).then((snap) => { if (snap.exists()) setProfile({ ...profile, ...snap.val() }); });
    get(ref(db, `users/${userId}/settings/customTags`)).then((snap) => { const tags = snap.val() || ["初見歓迎", "練習中", "バラード", "盛り上げ", "弾き語り"]; setTagsText(tags.join(", ")); onTagsUpdate(tags); });
    get(ref(db, `users/${userId}/settings/categories`)).then((snap) => { const cats = snap.val() || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"]; setCategoriesText(cats.join(", ")); onCategoriesUpdate(cats); });
  }, [userId]);

  useEffect(() => {
    const list = songs.filter((s:any) => s.isSetlist);
    setSetlistSongs(list);
    setSetlistText(list.map((s:any) => `・${s.title} / ${s.artist}`).join("\n") || "セトリ登録なし");
  }, [songs]);

  const handleSave = async () => {
    setLoading(true);
    await update(ref(db, `users/${userId}/profile`), profile);
    const newTags = tagsText.split(/,|、/).map(t => t.trim()).filter(Boolean);
    await set(ref(db, `users/${userId}/settings/customTags`), newTags);
    onTagsUpdate(newTags);
    const newCategories = categoriesText.split(/,|、/).map(t => t.trim()).filter(Boolean);
    if(newCategories.length > 0) { await set(ref(db, `users/${userId}/settings/categories`), newCategories); onCategoriesUpdate(newCategories); }
    setLoading(false); alert("設定を保存しました！");
  };

  const handleUnblock = async (uid: string) => {
    if(!confirm("ブロックを解除しますか？")) return;
    const newNg = { ...profile.ngUsers };
    delete newNg[uid];
    setProfile({ ...profile, ngUsers: newNg });
    await remove(ref(db, `users/${userId}/profile/ngUsers/${uid}`));
  };

  const updateTagColor = (tag: string, color: string) => {
    setProfile(prev => ({ ...prev, tagColors: { ...prev.tagColors, [tag]: color } }));
  };

  const handleCsvImport = async () => {
    if (!csvText) return;
    setImporting(true);
    const lines = csvText.split(/\r\n|\n|\r/);
    let addedCount = 0; let updatedCount = 0;
    for (const line of lines) {
      let cleanLine = line.trim().replace(/^[・-]\s*/, '').replace(/^[0-9]+[\.\s]+/, ''); if (!cleanLine) continue; 
      const normalizedLine = cleanLine.replace(/[，、\t|｜]/g, ',').replace(/\s+[\/／]\s+/g, ',').replace(/[\/／]/g, ',');          
      let parts = normalizedLine.split(','); if (parts.length === 1 && cleanLine.includes(' - ')) parts = cleanLine.split(' - ');
      const title = parts[0]?.trim(); const artist = parts.length > 1 ? parts[1]?.trim() : "";
      if (title) {
        const existingSong = songs.find((s:any) => normalize(s.title) === normalize(title) && (!artist || normalize(s.artist) === normalize(artist)));
        if (existingSong) { await update(ref(db, `users/${userId}/songs/${existingSong.id}`), { sungCount: (existingSong.sungCount || 0) + 1, lastSungAt: Date.now() }); updatedCount++; } 
        else { await push(ref(db, `users/${userId}/songs`), { title, artist, category: categories[0] || "J-POP", likes: 0, sungCount: 1, lastSungAt: Date.now(), createdAt: Date.now() }); addedCount++; }
      }
    }
    setImporting(false); alert(`完了！新規: ${addedCount}曲 / 更新: ${updatedCount}曲`); setCsvText("");
  };
  const copySetlist = () => { if (setlistSongs.length === 0) return alert("セトリが空です"); navigator.clipboard.writeText(setlistText); alert("コピーしました！"); };
  const saveSetlistLog = async () => {
    if (setlistSongs.length === 0) return alert("セトリが空です");
    if (confirm("セトリを保存し、回数を更新しますか？")) {
      setLoading(true);
      await push(ref(db, `users/${userId}/setlist_history`), { date: Date.now(), songs: setlistSongs.map(s => ({ title: s.title, artist: s.artist, id: s.id })) });
      const updates: any = {}; const now = Date.now();
      setlistSongs.forEach(song => { updates[`users/${userId}/songs/${song.id}/lastSungAt`] = now; updates[`users/${userId}/songs/${song.id}/sungCount`] = (song.sungCount || 0) + 1; updates[`users/${userId}/songs/${song.id}/isSetlist`] = false; });
      await update(ref(db), updates); alert("保存完了！"); setLoading(false);
    }
  };
  const qrUrl = typeof window !== 'undefined' ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/user/${userId}` : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24 md:mb-0">
      <div className="space-y-8">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><Settings className="w-5 h-5 text-slate-400" /> 基本設定</h3>
          <div className="space-y-5">
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-yellow-800 flex items-center gap-2"><Megaphone className="w-4 h-4" /> お知らせバー</label>
                <div className="flex items-center gap-2"><span className="text-xs text-slate-500">{profile.announcement?.active ? "表示中" : "非表示"}</span><input type="checkbox" checked={profile.announcement?.active || false} onChange={e => setProfile({...profile, announcement: { ...profile.announcement, active: e.target.checked } as any})} className="w-4 h-4 accent-yellow-500" /></div>
              </div>
              <input type="text" placeholder="例: 10/20はアニソン縛り歌枠です！" value={profile.announcement?.text || ""} onChange={e => setProfile({...profile, announcement: { ...profile.announcement, text: e.target.value } as any})} className="w-full p-2 text-sm border border-yellow-200 rounded-lg" />
            </div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">表示名</label><input type="text" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-slate-900 bg-white/50" /></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">アイコン画像 (URL)</label><div className="relative"><ImageIconLucide className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="https://..." value={profile.avatarUrl || ""} onChange={e => setProfile({...profile, avatarUrl: e.target.value})} className="w-full pl-9 p-3 rounded-xl border border-slate-200 outline-none text-sm text-slate-900 bg-white/50" /></div></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">自己紹介</label><textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none h-24 resize-none text-slate-900 bg-white/50" /></div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">タグのカラー設定</label>
              <div className="flex flex-wrap gap-2">
                {customTags.map((tag: string) => (
                  <div key={tag} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                    <span className="text-xs font-bold text-slate-600">#{tag}</span>
                    <select value={profile.tagColors?.[tag] || "gray"} onChange={(e) => updateTagColor(tag, e.target.value)} className="text-xs border-none bg-transparent outline-none cursor-pointer"><option value="gray">灰</option><option value="blue">青</option><option value="red">赤</option><option value="green">緑</option><option value="yellow">黄</option><option value="purple">紫</option><option value="pink">桃</option></select>
                    <div className={`w-3 h-3 rounded-full ${COLOR_PALETTE[profile.tagColors?.[tag] || "gray"].split(" ")[0]}`}></div>
                  </div>
                ))}
              </div>
            </div>
            {profile.ngUsers && Object.keys(profile.ngUsers).length > 0 && (<div className="bg-red-50 p-4 rounded-xl border border-red-100"><label className="block text-sm font-bold text-red-800 mb-2 flex items-center gap-2"><Ban className="w-4 h-4" /> NGユーザー一覧</label><ul className="space-y-2">{Object.entries(profile.ngUsers).map(([uid, info]) => (<li key={uid} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-red-100"><span>{info.name} <span className="opacity-50">({new Date(info.date).toLocaleDateString()})</span></span><button onClick={() => handleUnblock(uid)} className="text-red-500 hover:underline">解除</button></li>))}</ul></div>)}
            <button onClick={handleSave} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition">{loading ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />} 設定を保存</button>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileUp className="w-5 h-5 text-slate-400" /> 一括登録 (CSV)</h3><p className="text-xs text-slate-500 mb-2">※すでに登録済みの曲は、追加されずに「歌った回数」が+1され、日付が更新されます。</p><textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none h-32 resize-none text-sm font-mono text-slate-900 bg-white/50" placeholder={"マリーゴールド, あいみょん\n怪獣の花唄, Vaundy"} /><button onClick={handleCsvImport} disabled={importing} className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-sm transition flex items-center justify-center gap-2">{importing ? <><Loader2 className="w-4 h-4 animate-spin" /> 追加中...</> : "追加する"}</button></div>
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ListChecks className="w-5 h-5 text-slate-400" /> 本日のセトリ</h3><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2 overflow-x-auto"><pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">{setlistText}</pre></div><div className="flex gap-2"><button onClick={copySetlist} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-sm transition"><Copy className="w-4 h-4" /> コピー</button><button onClick={saveSetlistLog} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 rounded-lg text-sm transition">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 記録して保存</button></div></div>
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 p-6 flex flex-col items-center text-center"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><QrCode className="w-5 h-5 text-slate-400" /> 公開ページQR</h3><div className="bg-white p-2 border border-slate-100 rounded-xl mb-2"><img src={qrUrl} alt="QR Code" width={150} height={150} /></div></div>
      </div>
    </div>
  );
};

/* --- Dashboard Main --- */
export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter(); 
  const [activeTab, setActiveTab] = useState<'songs' | 'requests' | 'history' | 'settings'>('songs');
  const [songs, setSongs] = useState<SongData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongData | undefined>(undefined);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [stats, setStats] = useState({ totalSongs: 0, totalLikes: 0, pendingRequests: 0 });
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
    const unsubProfile = onValue(profileRef, (snap) => setProfile(snap.val()));
    const catRef = ref(db, `users/${user.uid}/settings/categories`);
    const unsubCat = onValue(catRef, (snapshot) => { setCategories(snapshot.val() || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"]); });
    const tagRef = ref(db, `users/${user.uid}/settings/customTags`);
    const unsubTag = onValue(tagRef, (snapshot) => { setCustomTags(snapshot.val() || ["初見歓迎", "練習中", "バラード", "盛り上げ", "弾き語り"]); });
    return () => { unsubSongs(); unsubReq(); unsubCat(); unsubTag(); unsubProfile(); };
  }, [user]);

  const openModal = (song?: SongData) => { setEditingSong(song); setIsModalOpen(true); };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-pink-50 z-0 pointer-events-none opacity-60"></div>
      
      {/* PC: Sidebar, SP: None */}
      <div className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 left-0 bg-white border-r border-slate-100 p-6 z-30 shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-blue-600 p-2 rounded-xl"><Music className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">SongList</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="曲リスト" />
          <SidebarButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={MessageSquare} label="リクエスト" badge={stats.pendingRequests} />
          <SidebarButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="履歴 / ログ" />
          <SidebarButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
        </nav>
        <div className="border-t border-slate-100 pt-4 mt-auto">
          <a href={`/user/${user.uid}`} target="_blank" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 mb-4 px-2"><ExternalLink className="w-4 h-4" /> 公開ページ</a>
          <button onClick={() => logout()} className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-500 px-2"><LogOut className="w-4 h-4" /> ログアウト</button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="md:ml-64 p-4 md:p-8 pb-32 md:pb-8 relative z-10 max-w-5xl mx-auto">
        {/* SP Header */}
        <div className="md:hidden flex justify-between items-center mb-6 sticky top-0 bg-white/80 backdrop-blur-md p-4 -mx-4 z-30 border-b border-slate-100">
          <div className="flex items-center gap-2"><div className="bg-blue-600 p-1.5 rounded-lg"><Music className="w-5 h-5 text-white" /></div><h1 className="font-black text-slate-800">SongList</h1></div>
          <div className="flex gap-3"><Link href={`/user/${user.uid}`} target="_blank" className="p-2 rounded-full bg-slate-100 text-blue-600"><ExternalLink className="w-5 h-5" /></Link><div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden"><img src={user.photoURL || ""} alt="User" /></div></div>
        </div>

        {/* Header Title (PC) */}
        <div className="hidden md:flex justify-between items-center mb-8">
          <div><h2 className="text-2xl font-black text-slate-800 mb-1">ダッシュボード</h2><p className="text-slate-500 text-sm">ようこそ、{user.displayName}さん</p></div>
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden"><img src={user.photoURL || ""} alt="User" /></div></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
          <StatCard icon={ListMusic} label="曲数" value={stats.totalSongs} color="bg-blue-500" />
          <StatCard icon={Heart} label="いいね" value={stats.totalLikes} color="bg-pink-500" />
          <StatCard icon={MessageSquare} label="未読" value={stats.pendingRequests} color="bg-green-500" />
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'songs' && <SongManager userId={user.uid} songs={songs} onEdit={openModal} customTags={customTags} tagColors={profile?.tagColors} />}
          {activeTab === 'requests' && <RequestManager userId={user.uid} />}
          {activeTab === 'history' && <HistoryManager userId={user.uid} />}
          {activeTab === 'settings' && <ProfileEditor userId={user.uid} customTags={customTags} onTagsUpdate={setCustomTags} songs={songs} categories={categories} onCategoriesUpdate={setCategories} />}
        </div>
      </main>

      {/* SP Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 px-2 pb-safe-area">
        <div className="flex justify-around items-center h-16">
          <BottomNavButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="曲リスト" />
          <BottomNavButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={MessageSquare} label="リクエスト" badge={stats.pendingRequests} />
          <BottomNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="履歴" />
          <BottomNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
        </div>
      </div>

      {activeTab === 'songs' && <button onClick={() => openModal()} className="fixed bottom-24 md:bottom-10 right-6 md:right-10 bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-900/30 hover:bg-slate-800 transition hover:scale-110 z-40 flex items-center gap-2 font-bold ring-4 ring-white/50"><Plus className="w-6 h-6" /><span className="hidden md:inline pr-2">曲を追加</span></button>}
      {isModalOpen && <SongModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingSong} userId={user.uid} customTags={customTags} categories={categories} />}
    </div>
  );
}

// --- Song Modal (変更なし) ---
const SongModal = ({ isOpen, onClose, initialData, userId, customTags = [], categories = [] }: any) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [reading, setReading] = useState(initialData?.reading || ""); 
  const [artist, setArtist] = useState(initialData?.artist || "");
  const [category, setCategory] = useState(initialData?.category || categories[0] || "J-POP"); 
  const [key, setKey] = useState(initialData?.key || "");
  const [memo, setMemo] = useState(initialData?.memo || "");
  const [lyricsUrl, setLyricsUrl] = useState(initialData?.lyricsUrl || ""); 
  const [tagsInput, setTagsInput] = useState<string>(initialData?.tags ? initialData.tags.join(" ") : "");
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); const tags = tagsInput.replace(/　/g, " ").split(" ").filter((t: string) => t.trim() !== ""); const payload = { title, reading, artist, category, tags, key, memo, lyricsUrl }; if (initialData?.id) { await update(ref(db, `users/${userId}/songs/${initialData.id}`), payload); } else { await push(ref(db, `users/${userId}/songs`), { ...payload, likes: 0, sungCount: 0, createdAt: Date.now() }); } onClose(); };
  const addTag = (tag: string) => { if (!tagsInput.includes(tag)) { setTagsInput((prev: string) => (prev + " " + tag).trim()); } };
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Music className="w-6 h-6 text-blue-600" /> {initialData ? "曲を編集" : "新しい曲を追加"}</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">曲名 <span className="text-red-500">*</span></label><input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 bg-white" placeholder="例: マリーゴールド" /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Type className="w-3 h-3" /> ふりがな</label><input type="text" value={reading} onChange={e => setReading(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 bg-white" placeholder="例: まりーごーるど" /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">アーティスト <span className="text-red-500">*</span></label><input type="text" required value={artist} onChange={e => setArtist(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="例: あいみょん" /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">カテゴリー</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900">{categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">キー (Key)</label><input type="text" value={key} onChange={e => setKey(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="例: +2, 原キー" /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> 歌詞URL</label><input type="text" value={lyricsUrl} onChange={e => setLyricsUrl(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 bg-white" placeholder="https://..." /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">歌い方メモ</label><textarea value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm text-slate-900 bg-white" placeholder="例: Aメロは優しく..." /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">タグ (スペース区切り)</label><div className="relative mb-2"><Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full p-3 pl-9 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="初見歓迎 練習中" /></div>{customTags && customTags.length > 0 && (<div className="flex flex-wrap gap-1">{customTags.map((tag: string) => (<button key={tag} type="button" onClick={() => addTag(tag)} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition border border-slate-200">+ {tag}</button>))}</div>)}</div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-900/20 mt-2">保存する</button>
        </form>
      </div>
    </div>
  );
};