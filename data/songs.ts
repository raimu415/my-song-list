// data/songs.ts
export type Song = {
  id: string;
  title: string;
  artist: string;
  category: "jpop" | "anime" | "vocaloid" | "other" | "ng" | "training" | "acoustic";
  url?: string;
  memo?: string;
};

export const songs: Song[] = [
  { id: "1", title: "新時代", artist: "Ado", category: "anime", url: "https://www.youtube.com/watch?v=1FliVTcX8bQ", memo: "ウタ（ONE PIECE FILM RED）" },
  { id: "2", title: "アイドル", artist: "YOASOBI", category: "anime", url: "https://www.youtube.com/watch?v=ZRtdQ81jPUQ", memo: "【推しの子】OP" },
  { id: "3", title: "千本桜", artist: "黒うさP", category: "vocaloid", memo: "定番" },
  { id: "4", title: "First Love", artist: "宇多田ヒカル", category: "jpop", memo: "バラード" },
  { id: "5", title: "ドライフラワー", artist: "優里", category: "acoustic", memo: "弾き語り" }
];