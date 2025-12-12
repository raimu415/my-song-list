import React from 'react';
import Link from 'next/link';
import { Shield, FileText, AlertTriangle, Building2, Mail, CreditCard } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-12 mt-auto">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* 左側: サービスロゴと説明 */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2">
              SongList SaaS
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              配信者とリスナーをつなぐ、歌枠管理・リクエストツール。<br />
              あなたの歌枠をもっと楽しく、もっと快適に。
            </p>
          </div>

          {/* 中央: 法務・運営リンク */}
          <div>
            <h3 className="font-bold text-slate-700 mb-4">法務・運営</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link href="/legal/operator" className="hover:text-blue-600 flex items-center gap-2 transition">
                  <Building2 className="w-4 h-4" /> 運営者情報
                </Link>
              </li>
              <li>
                <Link href="/legal/commercial" className="hover:text-blue-600 flex items-center gap-2 transition">
                  <CreditCard className="w-4 h-4" /> 特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-blue-600 flex items-center gap-2 transition">
                  <Shield className="w-4 h-4" /> プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/legal/dmca" className="hover:text-blue-600 flex items-center gap-2 transition">
                  <AlertTriangle className="w-4 h-4" /> 権利侵害に関する通報
                </Link>
              </li>
            </ul>
          </div>

          {/* 右側: サポートリンク */}
          <div>
            <h3 className="font-bold text-slate-700 mb-4">サポート</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              {/* 実際のフォームURLやメールアドレスに書き換えてください */}
              <li>
                <a href="https://forms.google.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-center gap-2 transition">
                  <FileText className="w-4 h-4" /> バグ報告・機能提案
                </a>
              </li>
              <li>
                <a href="mailto:support@example.com" className="hover:text-blue-600 flex items-center gap-2 transition">
                  <Mail className="w-4 h-4" /> お問い合わせ
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="border-t border-slate-200 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © {currentYear} SongList SaaS. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">トップページ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}