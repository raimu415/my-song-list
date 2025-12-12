import type { Metadata, Viewport } from "next"; // Viewportを追加
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Footer from "../components/Footer"; // ★修正: 相対パスに変更して読み込みを確実に

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
      {/* ★変更: flex flex-col min-h-screen を追加してフッターを最下部に固定する準備 */}
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <AuthProvider>
          {/* ★変更: メインコンテンツを伸長させ、フッターを押し下げる */}
          <main className="flex-grow">
            {children}
          </main>
        </AuthProvider>
        {/* ★追加: 共通フッター */}
        <Footer />
      </body>
    </html>
  );
}