"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { 
  Music, User as UserIcon, Twitter, LogIn, ArrowRight, LayoutDashboard,
  CheckCircle2, ListMusic, Mic2, Star
} from 'lucide-react';

export default function Home() {
  const { user, loginWithGoogle, loginWithTwitter } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* --- Header --- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Music className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-black tracking-tight">SongList SaaS</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard" className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition">
                <LayoutDashboard className="w-4 h-4" /> 管理画面へ
              </Link>
            ) : (
              <button onClick={loginWithGoogle} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition">ログイン</button>
            )}
            <Link href={user ? "/dashboard" : "#login"} className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
              {user ? "ダッシュボードを開く" : "無料で始める"}
            </Link>
          </div>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section className="pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-blue-100">
            <Star className="w-3 h-3 fill-current" /> 配信者向けの決定版ツール
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            歌枠のリクエスト管理を<br/>これひとつで完結。
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            リスナーからのリクエスト整理、持ち歌リストの検索機能、<br className="hidden md:block"/>
            そして「ガチャ機能」まで。面倒な作業を自動化して、歌うことにもっと集中できます。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link href="/dashboard" className="w-full sm:w-auto h-14 px-8 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/30">
                管理画面へ移動 <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto" id="login">
                <button onClick={loginWithGoogle} className="h-14 px-8 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-50 transition shadow-sm">
                  <UserIcon className="w-5 h-5 text-blue-500" /> Googleで登録
                </button>
                <button onClick={loginWithTwitter} className="h-14 px-8 flex items-center justify-center gap-2 bg-black text-white rounded-full font-bold hover:bg-slate-800 transition shadow-xl">
                  <Twitter className="w-5 h-5" /> X (Twitter)で登録
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- Features --- */}
      <section className="bg-white py-24 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={ListMusic} 
              title="持ち歌リスト公開" 
              desc="CSVで一括登録も可能。強力な検索機能やカテゴリ分けで、リスナーが見やすいリストを自動で生成します。"
              color="bg-blue-500"
            />
            <FeatureCard 
              icon={Mic2} 
              title="リクエスト管理" 
              desc="届いたリクエストを承認・完了・却下でカンタン管理。重複チェックや連続投稿の制限機能も標準搭載。"
              color="bg-green-500"
            />
            <FeatureCard 
              icon={CheckCircle2} 
              title="活動の記録" 
              desc="歌った回数や最終歌唱日を自動記録。「これ前いつ歌ったっけ？」が一目で分かります。セトリ保存もワンクリック。"
              color="bg-pink-500"
            />
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-10 text-center text-slate-400 text-sm">
        <p>&copy; 2024 SongList SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon: Icon, title, desc, color }: any) => (
  <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white mb-6 shadow-lg`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{desc}</p>
  </div>
);