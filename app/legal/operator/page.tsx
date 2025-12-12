import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function OperatorPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto p-6 md:p-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> トップページに戻る
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-slate-600" /> 運営者情報
          </h1>

          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-blue-900 font-bold mb-2">SongList SaaS 運営事務局</h3>
              <p className="text-sm text-blue-800/80 mb-4">
                配信者とリスナーをつなぐ、最高の歌枠体験を提供するために運営しています。
              </p>
              <div className="flex gap-2">
                 {/* リンク先はご自身のX(Twitter)などに変更してください */}
                <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg font-bold border border-blue-200 hover:bg-blue-100 transition">
                  公式Twitter
                </a>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 mt-8">
              <h3 className="font-bold text-sm text-slate-700 mb-2">有料プランをご利用の方へ</h3>
              <p className="text-xs text-slate-500 mb-2">
                有料サブスクリプションに関する事業者の詳細情報（住所・電話番号等）は、特定商取引法に基づく表記をご確認ください。
              </p>
              <Link href="/legal/commercial" className="text-sm font-bold text-blue-600 hover:underline">
                特定商取引法に基づく表記を見る &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}