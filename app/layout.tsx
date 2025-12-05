import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext"; // ★追加: 作ったContextをインポート

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Song List SaaS",
  description: "Share your favorite songs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* ★追加: AuthProviderでchildrenを囲む */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}