"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase"; 
import { ref, onValue, remove, push, update, get, runTransaction, set } from "firebase/database";
// Storage関連のインポートを削除
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation";
import { 
  Music, User as UserIcon, Plus, X, 
  ExternalLink, Hash, ListMusic, MessageSquare, Settings,
  Heart, Mic2, CheckCircle2, Loader2, Twitter, Save,
  FileText, Music2, Type, FileUp, QrCode, Link as LinkIcon,
  ToggleLeft, ToggleRight, ListChecks, Copy, Search, History,
  Eraser, Youtube, Twitch, CalendarDays, ImageIcon, ArrowUp,
  Clock, Image as ImageIconLucide
} from 'lucide-react';

/* --- Types (省略なし) --- */
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
  themeColor: string;
  fontFamily: string;
  backgroundImage: string;
  isRequestEnabled: boolean;
  customTags?: string[];
};

const normalize = (text: string) => {
  return text.trim().toLowerCase()
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '');
};

/* --- UI Components --- */
const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition hover:shadow-md">
    <div className={`p-3 md:p-4 rounded-xl ${color} text-white shadow-md shrink-0`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6" />
    </div>
    <div>
      <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl md:text-2xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b-2 transition-colors font-bold text-xs md:text-sm whitespace-nowrap ${
      active 
        ? "border-blue-600 text-blue-600 bg-blue-50/50" 
        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`}
  >
    <Icon className="w-4 h-4 shrink-0" />
    {label}
  </button>
);

/* --- Sub-Features --- */

// --- 1. Song Manager ---
const SongManager = ({ userId, songs, onEdit }: { userId: string, songs: SongData[], onEdit: (s: SongData) => void }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    await remove(ref(db, `users/${userId}/songs/${id}`));
  };

  const toggleSetlist = async (song: SongData) => {
    await update(ref(db, `users/${userId}/songs/${song.id}`), { isSetlist: !song.isSetlist });
  };

  const clearSetlist = async () => {
    if (!confirm("現在選択中のセトリを全て解除しますか？")) return;
    const updates: any = {};
    songs.forEach(song => {
      if (song.isSetlist) {
        updates[`users/${userId}/songs/${song.id}/isSetlist`] = false;
      }
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  };

  const getSearchUrl = (title: string, artist: string) => {
    const query = encodeURIComponent(`${title} ${artist} 歌詞`);
    return `https://www.google.com/search?q=${query}`;
  };

  const filteredSongs = songs.filter(song => {
    const term = normalize(searchTerm);
    const title = normalize(song.title);
    const artist = normalize(song.artist);
    const reading = song.reading ? normalize(song.reading) : "";
    return title.includes(term) || artist.includes(term) || reading.includes(term);
  });

  return (
    <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <Search className="w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="曲名、アーティスト名で検索..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
        />
        {searchTerm && <button onClick={() => setSearchTerm("")}><X className="w-4 h-4 text-slate-400" /></button>}
      </div>

      {songs.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Music className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>まだ曲が登録されていません</p>
          <p className="text-sm mt-2">右下のボタンから最初の曲を追加しよう！</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
           <p>検索結果が見つかりません</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px] md:min-w-0">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase font-bold tracking-wider whitespace-nowrap">
              <tr>
                <th className="p-4 pl-6 w-[5%] text-center">
                  <button onClick={clearSetlist} className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition" title="セトリ選択を全解除">
                    <Eraser className="w-4 h-4" />
                  </button>
                </th>
                <th className="p-4 w-[35%]">曲名 / アーティスト</th>
                <th className="p-4 w-[15%]">情報</th>
                <th className="p-4 w-[15%]">カテゴリー</th>
                <th className="p-4 w-[15%]">履歴</th>
                <th className="p-4 text-right w-[15%]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSongs.map((song) => (
                <tr key={song.id} className={`hover:bg-slate-50/80 transition group ${song.isSetlist ? "bg-yellow-50/50" : ""}`}>
                  <td className="p-4 pl-6 align-top text-center">
                    <button onClick={() => toggleSetlist(song)} className={`p-2 rounded-full transition ${song.isSetlist ? "text-yellow-500 bg-yellow-100" : "text-slate-300 hover:text-slate-400"}`} title="今日のセトリに追加">
                      <ListChecks className="w-5 h-5" />
                    </button>
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2 flex-wrap">
                      {song.title}
                      <a href={getSearchUrl(song.title, song.artist)} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition"><Search className="w-3.5 h-3.5" /></a>
                      {song.lyricsUrl && <a href={song.lyricsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600"><LinkIcon className="w-3.5 h-3.5" /></a>}
                    </div>
                    {song.reading && <div className="text-[10px] text-slate-400 -mt-0.5">{song.reading}</div>}
                    <div className="text-xs text-slate-500 font-medium mt-1 mb-1">{song.artist}</div>
                    
                    {song.memo && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-slate-600">
                        <FileText className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{song.memo}</span>
                      </div>
                    )}
                    {song.tags && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {song.tags.map(tag => <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#{tag}</span>)}
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    {song.key ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${
                        song.key.includes("-") ? "bg-blue-50 text-blue-700 border-blue-100" :
                        song.key.includes("+") ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        <Music2 className="w-3 h-3 mr-1 opacity-50" /> {song.key}
                      </span>
                    ) : <span className="text-xs text-slate-300">-</span>}
                  </td>
                  <td className="p-4 align-top">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 whitespace-nowrap">{song.category}</span>
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-pink-500 text-sm font-bold"><Heart className="w-4 h-4 fill-pink-500" /> {song.likes || 0}</div>
                      {song.lastSungAt && (
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                          <span className="block text-[9px] uppercase tracking-wide opacity-70">Last Sung</span>
                          {new Date(song.lastSungAt).toLocaleDateString()}
                        </div>
                      )}
                      {song.sungCount && song.sungCount > 0 && (
                        <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded inline-block text-slate-500">
                          <span className="font-bold">{song.sungCount}</span>回 歌唱
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right align-top whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEdit(song)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">編集</button>
                      <button onClick={() => handleDelete(song.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- 2. Request & History Manager ---
const HistoryManager = ({ userId }: { userId: string }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'setlists'>('requests');
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [setlists, setSetlists] = useState<SetlistLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // リクエスト履歴
    const reqRef = ref(db, `users/${userId}/requests`);
    const unsubReq = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([k, v]: [string, any]) => ({ id: k, ...v }))
          .filter((r: RequestData) => r.status === 'completed');
        setRequests(list);
      } else {
        setRequests([]);
      }
    });

    // セトリ履歴
    const setlistRef = ref(db, `users/${userId}/setlist_history`);
    const unsubSetlist = onValue(setlistRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([k, v]: [string, any]) => ({ id: k, ...v }));
        setSetlists(list);
      } else {
        setSetlists([]);
      }
      setLoading(false);
    });

    return () => { unsubReq(); unsubSetlist(); };
  }, [userId]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
        <button onClick={() => setActiveTab('requests')} className={`text-sm font-bold flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'requests' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
          <History className="w-4 h-4" /> リクエスト履歴 ({requests.length})
        </button>
        <button onClick={() => setActiveTab('setlists')} className={`text-sm font-bold flex items-center gap-2 px-3 py-2 rounded-lg transition ${activeTab === 'setlists' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
          <ListChecks className="w-4 h-4" /> セトリログ ({setlists.length})
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase font-bold whitespace-nowrap">
              <tr>
                <th className="p-3">完了日</th>
                <th className="p-3">曲名</th>
                <th className="p-3">リクエスト者</th>
                <th className="p-3">コメント</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.sort((a,b) => (b.completedAt || 0) - (a.completedAt || 0)).map(req => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500 whitespace-nowrap">{req.completedAt ? new Date(req.completedAt).toLocaleDateString() : "-"}</td>
                  <td className="p-3 font-bold text-slate-700">{req.songTitle}</td>
                  <td className="p-3 text-slate-600">{req.requesterName}</td>
                  <td className="p-3 text-slate-400 text-xs italic truncate max-w-[200px]">{req.comment}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">履歴はありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {setlists.length === 0 ? (
            <p className="text-center text-slate-400 py-8">保存されたセトリはありません</p>
          ) : (
            setlists.sort((a,b) => b.date - a.date).map(log => (
              <div key={log.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {new Date(log.date).toLocaleDateString()} のセトリ
                  </h4>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{log.songs?.length || 0}曲</span>
                </div>
                <div className="space-y-1">
                  {log.songs?.map((s, i) => (
                    <div key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-slate-300 w-4 text-right">{i+1}.</span>
                      <span className="font-bold">{s.title}</span>
                      <span className="text-slate-400">- {s.artist}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// --- 3. Settings & Profile Editor ---
const ProfileEditor = ({ userId, customTags, onTagsUpdate, songs, categories, onCategoriesUpdate }: { 
  userId: string, 
  customTags: string[], 
  onTagsUpdate: (tags: string[]) => void, 
  songs: SongData[],
  categories: string[],
  onCategoriesUpdate: (cats: string[]) => void
}) => {
  const [profile, setProfile] = useState<UserProfile>({ 
    displayName: "", bio: "", avatarUrl: "", twitter: "", youtube: "", twitch: "", tiktok: "",
    themeColor: "blue", fontFamily: "sans", backgroundImage: "", isRequestEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [categoriesText, setCategoriesText] = useState(""); 
  const [csvText, setCsvText] = useState("");
  const [setlistText, setSetlistText] = useState("");
  const [setlistSongs, setSetlistSongs] = useState<SongData[]>([]);

  useEffect(() => {
    get(ref(db, `users/${userId}/profile`)).then((snap) => {
      if (snap.exists()) setProfile({ ...profile, ...snap.val() });
    });
    
    get(ref(db, `users/${userId}/settings/customTags`)).then((snap) => {
      const tags = snap.val() || ["初見歓迎", "練習中", "バラード", "盛り上げ", "弾き語り"];
      setTagsText(tags.join(", "));
      onTagsUpdate(tags);
    });

    get(ref(db, `users/${userId}/settings/categories`)).then((snap) => {
      const cats = snap.val() || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"];
      setCategoriesText(cats.join(", "));
      onCategoriesUpdate(cats);
    });
  }, [userId]);

  useEffect(() => {
    const list = songs.filter(s => s.isSetlist);
    setSetlistSongs(list);
    setSetlistText(list.map(s => `・${s.title} / ${s.artist}`).join("\n") || "セトリ登録なし");
  }, [songs]);

  const handleSave = async () => {
    setLoading(true);
    await update(ref(db, `users/${userId}/profile`), profile);
    
    const newTags = tagsText.split(/,|、/).map(t => t.trim()).filter(Boolean);
    await set(ref(db, `users/${userId}/settings/customTags`), newTags);
    onTagsUpdate(newTags);

    const newCategories = categoriesText.split(/,|、/).map(t => t.trim()).filter(Boolean);
    if(newCategories.length > 0) {
      await set(ref(db, `users/${userId}/settings/categories`), newCategories);
      onCategoriesUpdate(newCategories);
    }

    setLoading(false);
    alert("設定を保存しました！");
  };

  const handleCsvImport = async () => {
    if (!csvText) return;
    setImporting(true); 
    
    const lines = csvText.split(/\r\n|\n|\r/);
    let addedCount = 0;
    let updatedCount = 0;

    for (const line of lines) {
      let cleanLine = line.trim().replace(/^[・-]\s*/, '').replace(/^[0-9]+[\.\s]+/, ''); 
      if (!cleanLine) continue; 

      const normalizedLine = cleanLine.replace(/[，、\t|｜]/g, ',').replace(/\s+[\/／]\s+/g, ',').replace(/[\/／]/g, ',');          
      let parts = normalizedLine.split(',');
      if (parts.length === 1 && cleanLine.includes(' - ')) {
        parts = cleanLine.split(' - ');
      }

      const title = parts[0]?.trim();
      const artist = parts.length > 1 ? parts[1]?.trim() : "";

      if (title) {
        const existingSong = songs.find(s => normalize(s.title) === normalize(title) && (!artist || normalize(s.artist) === normalize(artist)));

        if (existingSong) {
          await update(ref(db, `users/${userId}/songs/${existingSong.id}`), {
            sungCount: (existingSong.sungCount || 0) + 1,
            lastSungAt: Date.now()
          });
          updatedCount++;
        } else {
          await push(ref(db, `users/${userId}/songs`), { 
            title, artist, category: categories[0] || "J-POP", 
            likes: 0, sungCount: 1, lastSungAt: Date.now(), createdAt: Date.now() 
          });
          addedCount++;
        }
      }
    }
    setImporting(false);
    alert(`完了しました！\n新規追加: ${addedCount}曲\n更新（回数+1）: ${updatedCount}曲`);
    setCsvText("");
  };

  const copySetlist = async () => {
    if (setlistSongs.length === 0) return alert("セトリが空です");
    navigator.clipboard.writeText(setlistText);
    alert("コピーしました！");
  };

  const saveSetlistLog = async () => {
    if (setlistSongs.length === 0) return alert("セトリが空です");
    if (confirm("セトリを「活動記録」に保存し、曲のデータを更新しますか？\n（回数+1、最終歌唱日更新）")) {
      setLoading(true);
      const historyData = { date: Date.now(), songs: setlistSongs.map(s => ({ title: s.title, artist: s.artist, id: s.id })) };
      await push(ref(db, `users/${userId}/setlist_history`), historyData);
      const updates: any = {};
      const now = Date.now();
      setlistSongs.forEach(song => {
        updates[`users/${userId}/songs/${song.id}/lastSungAt`] = now;
        updates[`users/${userId}/songs/${song.id}/sungCount`] = (song.sungCount || 0) + 1;
        updates[`users/${userId}/songs/${song.id}/isSetlist`] = false;
      });
      try {
        await update(ref(db), updates);
        alert("保存完了！\n本日のセトリをクリアしました。");
      } catch (e) {
        console.error(e);
        alert("保存に失敗しました");
      }
      setLoading(false);
    }
  };

  const qrUrl = typeof window !== 'undefined' 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/user/${userId}`
    : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            基本設定 & デザイン
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">リクエスト受付</label>
              <button 
                onClick={() => setProfile({...profile, isRequestEnabled: !profile.isRequestEnabled})}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition w-full md:w-auto justify-center ${
                  profile.isRequestEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {profile.isRequestEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                {profile.isRequestEnabled ? "受付中" : "停止中"}
              </button>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">表示名</label>
              <input type="text" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-slate-900 bg-white" />
            </div>
            
            {/* ★修正: ファイル選択を削除し、URL入力のみにする */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">アイコン画像 (URL)</label>
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <ImageIconLucide className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="https://..." value={profile.avatarUrl || ""} onChange={e => setProfile({...profile, avatarUrl: e.target.value})} className="w-full pl-9 p-3 rounded-xl border border-slate-200 outline-none text-sm text-slate-900 bg-white" />
                </div>
                {profile.avatarUrl && <img src={profile.avatarUrl} className="w-10 h-10 rounded-full border border-slate-200 object-cover" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">※立ち絵などの画像URLを直接入力してください</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">自己紹介</label>
              <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none h-24 resize-none text-slate-900 bg-white" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">SNSリンク (ID入力)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative"><Twitter className="absolute left-3 top-3 w-4 h-4 text-blue-400" /><input type="text" placeholder="Twitter ID" value={profile.twitter} onChange={e => setProfile({...profile, twitter: e.target.value})} className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white" /></div>
                <div className="relative"><Youtube className="absolute left-3 top-3 w-4 h-4 text-red-500" /><input type="text" placeholder="YouTube ID" value={profile.youtube || ""} onChange={e => setProfile({...profile, youtube: e.target.value})} className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white" /></div>
                <div className="relative"><Twitch className="absolute left-3 top-3 w-4 h-4 text-purple-500" /><input type="text" placeholder="Twitch ID" value={profile.twitch || ""} onChange={e => setProfile({...profile, twitch: e.target.value})} className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white" /></div>
                <div className="relative"><Music2 className="absolute left-3 top-3 w-4 h-4 text-black" /><input type="text" placeholder="TikTok ID" value={profile.tiktok || ""} onChange={e => setProfile({...profile, tiktok: e.target.value})} className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">テーマカラー</label>
                <select value={profile.themeColor} onChange={e => setProfile({...profile, themeColor: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-slate-900 bg-white">
                  <option value="blue">ブルー (標準)</option>
                  <option value="pink">ピンク</option>
                  <option value="green">グリーン</option>
                  <option value="purple">パープル</option>
                  <option value="orange">オレンジ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">フォント</label>
                <select value={profile.fontFamily} onChange={e => setProfile({...profile, fontFamily: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-slate-900 bg-white">
                  <option value="sans">ゴシック (標準)</option>
                  <option value="serif">明朝体</option>
                  <option value="rounded">丸文字風</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">カテゴリー管理</label>
              <input type="text" value={categoriesText} onChange={e => setCategoriesText(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm text-slate-900 bg-white" placeholder="J-POP, Rock, Anime, K-POP, Vocaloid, Other" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">カスタムタグ設定</label>
              <input type="text" value={tagsText} onChange={e => setTagsText(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm text-slate-900 bg-white" placeholder="初見歓迎, 練習中, バラード..." />
            </div>

            <button onClick={handleSave} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition">
              {loading ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />} 設定を保存
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileUp className="w-5 h-5 text-slate-400" /> 一括登録 (CSV)</h3>
          <p className="text-xs text-slate-500 mb-2">※すでに登録済みの曲は、追加されずに「歌った回数」が+1され、日付が更新されます。</p>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 outline-none h-32 resize-none text-sm font-mono text-slate-900 bg-white" placeholder={"マリーゴールド, あいみょん\n怪獣の花唄, Vaundy"} />
          <button onClick={handleCsvImport} disabled={importing} className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-sm transition flex items-center justify-center gap-2">
            {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> 追加中...</> : "追加する"}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ListChecks className="w-5 h-5 text-slate-400" /> 本日のセトリ</h3>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2 overflow-x-auto"><pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">{setlistText}</pre></div>
          <div className="flex gap-2">
            <button onClick={copySetlist} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-sm transition"><Copy className="w-4 h-4" /> コピー</button>
            <button onClick={saveSetlistLog} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 rounded-lg text-sm transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 記録して保存
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col items-center text-center">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><QrCode className="w-5 h-5 text-slate-400" /> 公開ページQR</h3>
          <div className="bg-white p-2 border border-slate-100 rounded-xl mb-2"><img src={qrUrl} alt="QR Code" width={150} height={150} /></div>
        </div>
      </div>
    </div>
  );
};

/* --- Dashboard Main --- */
export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter(); 
  
  const [activeTab, setActiveTab] = useState<'songs' | 'requests' | 'history' | 'settings'>('songs');
  const [songs, setSongs] = useState<SongData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongData | undefined>(undefined);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  
  const [stats, setStats] = useState({ totalSongs: 0, totalLikes: 0, pendingRequests: 0 });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

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

    const catRef = ref(db, `users/${user.uid}/settings/categories`);
    const unsubCat = onValue(catRef, (snapshot) => {
      const data = snapshot.val();
      setCategories(data || ["J-POP", "Rock", "Anime", "K-POP", "Vocaloid", "Other"]);
    });

    return () => { unsubSongs(); unsubReq(); unsubCat(); };
  }, [user]);

  const openModal = (song?: SongData) => {
    setEditingSong(song);
    setIsModalOpen(true);
  };

  const RequestManager = ({ userId }: { userId: string }) => {
    const activeRequests = requests.filter(r => r.status !== 'completed' && r.status !== 'rejected');
    
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
            if (newStatus === 'accepted') {
              if (!tags.includes(TARGET_TAG)) song.tags = [...tags, TARGET_TAG];
            } else if (newStatus === 'completed' || newStatus === 'rejected') {
              song.tags = tags.filter((t: string) => t !== TARGET_TAG);
              if (newStatus === 'completed') {
                song.lastSungAt = Date.now();
                song.sungCount = (song.sungCount || 0) + 1;
              }
            }
          }
          return song;
        });
        if (newStatus === 'accepted') alert("承認しました！");
        if (newStatus === 'completed') alert("完了！歌った回数と日付を更新しました。");
      } catch (e) {
        console.error(e);
        alert("更新に失敗しました。");
      }
    };

    return (
      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-4 md:p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-500" />
          届いたリクエスト ({activeRequests.length})
        </h3>
        <div className="space-y-4">
          {activeRequests.length === 0 ? (
            <p className="text-slate-400 text-center py-8">現在進行中のリクエストはありません</p>
          ) : (
            activeRequests.sort((a,b) => b.createdAt - a.createdAt).map(req => (
              <div key={req.id} className={`p-4 rounded-xl border ${req.status === 'accepted' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.status}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg">
                      {req.songTitle}
                      <span className="text-sm font-normal text-slate-500 ml-2">by {req.requesterName}</span>
                    </h4>
                    {req.comment && (
                      <div className="mt-2 bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100">
                        "{req.comment}"
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                    {req.status === 'pending' && (
                      <button onClick={() => updateStatus(req, 'accepted')} className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" /> 承認
                      </button>
                    )}
                    {req.status === 'accepted' && (
                      <button onClick={() => updateStatus(req, 'completed')} className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 whitespace-nowrap">
                        <Mic2 className="w-3 h-3" /> 完了
                      </button>
                    )}
                    <button onClick={() => updateStatus(req, 'rejected')} className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200 whitespace-nowrap">
                      <X className="w-3 h-3" /> 却下
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" id="top">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition">
              <div className="bg-blue-600 p-1.5 rounded-lg"><Music className="w-5 h-5 text-white" /></div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight hidden md:block">SongList SaaS</h1>
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-black text-slate-800 tracking-tight">管理画面</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/user/${user.uid}`} target="_blank" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition"><ExternalLink className="w-3 h-3" /> 公開ページ</Link>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200"><img src={user.photoURL || ""} alt="User" /></div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 md:mb-6">こんにちは、{user.displayName}さん 👋</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={ListMusic} label="登録曲数" value={stats.totalSongs} color="bg-blue-500" />
            <StatCard icon={Heart} label="総いいね数" value={stats.totalLikes} color="bg-pink-500" />
            <StatCard icon={MessageSquare} label="未読リクエスト" value={stats.pendingRequests} color="bg-green-500" />
          </div>
        </div>

        <div className="flex items-end mb-0 overflow-x-auto pb-1 scrollbar-hide">
          <TabButton active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} icon={ListMusic} label="曲リスト" />
          <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={MessageSquare} label={<span className="flex items-center gap-2">リクエスト {stats.pendingRequests > 0 && (<span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{stats.pendingRequests}</span>)}</span>} />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="履歴" />
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="設定" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'songs' && <SongManager userId={user.uid} songs={songs} onEdit={openModal} />}
          {activeTab === 'requests' && <RequestManager userId={user.uid} />}
          {activeTab === 'history' && <HistoryManager userId={user.uid} />}
          {activeTab === 'settings' && <ProfileEditor userId={user.uid} customTags={customTags} onTagsUpdate={setCustomTags} songs={songs} categories={categories} onCategoriesUpdate={setCategories} />}
        </div>
      </main>

      {activeTab === 'songs' && (
        <button onClick={() => openModal()} className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-full shadow-xl hover:bg-slate-800 transition hover:scale-110 z-50 flex items-center gap-2 font-bold ring-4 ring-white"><Plus className="w-6 h-6" /><span className="hidden md:inline pr-2">曲を追加</span></button>
      )}

      {/* ★トップへ戻るボタン */}
      <a href="#top" className="fixed bottom-24 right-6 bg-white text-slate-500 p-3 rounded-full shadow-lg hover:bg-slate-100 transition z-40 border border-slate-200"><ArrowUp className="w-5 h-5" /></a>

      {isModalOpen && <SongModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingSong} userId={user.uid} customTags={customTags} categories={categories} />}
    </div>
  );
}

/* --- Song Modal Component --- */
const SongModal = ({ isOpen, onClose, initialData, userId, customTags = [], categories = [] }: any) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [reading, setReading] = useState(initialData?.reading || ""); 
  const [artist, setArtist] = useState(initialData?.artist || "");
  const [category, setCategory] = useState(initialData?.category || categories[0] || "J-POP"); 
  const [key, setKey] = useState(initialData?.key || "");
  const [memo, setMemo] = useState(initialData?.memo || "");
  const [lyricsUrl, setLyricsUrl] = useState(initialData?.lyricsUrl || ""); 
  const [tagsInput, setTagsInput] = useState<string>(initialData?.tags ? initialData.tags.join(" ") : "");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.replace(/　/g, " ").split(" ").filter((t: string) => t.trim() !== "");
    const payload = { title, reading, artist, category, tags, key, memo, lyricsUrl };

    if (initialData?.id) {
      await update(ref(db, `users/${userId}/songs/${initialData.id}`), payload);
    } else {
      await push(ref(db, `users/${userId}/songs`), { ...payload, likes: 0, sungCount: 0, createdAt: Date.now() });
    }
    onClose();
  };

  const addTag = (tag: string) => {
    if (!tagsInput.includes(tag)) {
      setTagsInput((prev: string) => (prev + " " + tag).trim());
    }
  };

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
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Type className="w-3 h-3" /> ふりがな</label>
              <input type="text" value={reading} onChange={e => setReading(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 bg-white" placeholder="例: まりーごーるど" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">アーティスト <span className="text-red-500">*</span></label>
              <input type="text" required value={artist} onChange={e => setArtist(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="例: あいみょん" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">カテゴリー</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900">
                {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">キー (Key)</label>
              <input type="text" value={key} onChange={e => setKey(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="例: +2, 原キー" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> 歌詞URL</label>
              <input type="text" value={lyricsUrl} onChange={e => setLyricsUrl(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 bg-white" placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">歌い方メモ</label>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm text-slate-900 bg-white" placeholder="例: Aメロは優しく..." />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">タグ (スペース区切り)</label>
              <div className="relative mb-2">
                <Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full p-3 pl-9 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white" placeholder="初見歓迎 練習中" />
              </div>
              {customTags && customTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customTags.map((tag: string) => (
                    <button key={tag} type="button" onClick={() => addTag(tag)} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition border border-slate-200">
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-900/20 mt-2">保存する</button>
        </form>
      </div>
    </div>
  );
};