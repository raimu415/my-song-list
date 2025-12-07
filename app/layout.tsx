import type { Metadata, Viewport } from "next"; // Viewportを追加
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

// ★追加: スマホでアプリっぽく見せる設定
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // ズーム禁止（アプリっぽくする）
};

export const metadata: Metadata = {
  metadataBase: new URL("https://my-song-list-raimus-projects-bb31c080.vercel.app"), 
  title: {
    default: "SongList SaaS - 歌枠リクエスト管理ツール",
    template: "%s | SongList SaaS",
  },
  description: "歌枠のリクエスト管理を、もっと楽しくスマートに。",
  manifest: "/manifest.json", // ★追加: マニフェストファイルの読み込み
  // ... (OGP設定などはそのまま)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}