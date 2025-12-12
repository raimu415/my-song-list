import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Cookie, Globe, Server } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
      <div className="max-w-4xl mx-auto p-6 md:p-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> トップページに戻る
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" /> プライバシーポリシー
          </h1>
          <p className="text-sm text-slate-400 mb-8">最終更新日: 2025年12月12日</p>

          <div className="space-y-10">
            {/* 1. 基本方針 */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3">1. 個人情報の取り扱いについて</h2>
              <p className="text-sm leading-relaxed mb-4">
                当サービス「SongList SaaS」（以下、「本サービス」）は、ユーザーの個人情報の保護を重要な責務と認識し、個人情報保護法および関連法令を遵守します。
              </p>
            </section>

            {/* 2. 取得する情報 */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3">2. 取得する情報と利用目的</h2>
              <p className="text-sm leading-relaxed mb-4">本サービスでは、以下の情報を取得・利用します。</p>
              <ul className="list-disc list-inside text-sm space-y-2 ml-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <li><span className="font-bold">アカウント情報:</span> Google/X(Twitter)等のアカウントID、表示名、アイコン画像（ログイン認証のため）</li>
                <li><span className="font-bold">利用データ:</span> 登録した曲データ、リクエスト履歴、設定内容（サービス提供のため）</li>
                <li><span className="font-bold">アクセス解析:</span> IPアドレス、ブラウザ情報、Cookie（サービス改善・不正防止のため）</li>
              </ul>
            </section>

            {/* 3. Cookieポリシー */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                <Cookie className="w-5 h-5 text-orange-500" /> 3. Cookieポリシー
              </h2>
              <p className="text-sm leading-relaxed mb-4">
                本サービスでは、ログイン状態の保持、広告配信、およびトラフィック分析のためにCookie（クッキー）を使用しています。
                ブラウザの設定によりCookieを無効にすることも可能ですが、その場合、本サービスの一部機能が利用できなくなる可能性があります。
              </p>
            </section>

            {/* 4. 外部送信規律（電気通信事業法対応） */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-green-600" /> 4. 外部送信規律に基づく表示
              </h2>
              <p className="text-sm leading-relaxed mb-4">
                電気通信事業法の外部送信規律に基づき、本サービスにおいてユーザーの情報を送信している外部サービス（第三者提供）の内容を以下に公表します。
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse rounded-xl overflow-hidden shadow-sm">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                    <tr>
                      <th className="p-4 border-b border-slate-200">サービス名 / 提供者</th>
                      <th className="p-4 border-b border-slate-200">送信される情報</th>
                      <th className="p-4 border-b border-slate-200">利用目的</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="p-4">
                        <div className="font-bold">Google Analytics</div>
                        <div className="text-xs text-slate-400">Google LLC</div>
                      </td>
                      <td className="p-4">閲覧ページ、滞在時間、端末情報、IPアドレス</td>
                      <td className="p-4">利用状況の分析、サイトのパフォーマンス改善のため</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-bold">Firebase Authentication</div>
                        <div className="text-xs text-slate-400">Google LLC</div>
                      </td>
                      <td className="p-4">認証ID、メールアドレス、プロフィール画像</td>
                      <td className="p-4">ユーザー認証、アカウント管理、セキュリティ維持のため</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-4">
                        <div className="font-bold">Google AdSense</div>
                        <div className="text-xs text-slate-400">Google LLC</div>
                      </td>
                      <td className="p-4">Cookie、広告識別子、閲覧履歴</td>
                      <td className="p-4">パーソナライズされた広告の配信、広告効果の測定のため</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-bold">YouTube Data API</div>
                        <div className="text-xs text-slate-400">Google LLC</div>
                      </td>
                      <td className="p-4">検索クエリ、動画ID</td>
                      <td className="p-4">動画検索機能、サムネイル表示機能の提供のため</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Google/YouTube規約関連 */}
            <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h2 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5" /> Google社のサービス利用に関する特記事項
              </h2>
              <div className="text-sm text-slate-600 space-y-3">
                <p>
                  本サービスは、YouTube Data APIを利用しています。ユーザーは本サービスを利用することで、
                  <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800">YouTube利用規約</a>
                  に同意したものとみなされます。
                </p>
                <p>
                  Google社のプライバシーポリシーについては、以下をご参照ください。<br/>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Google プライバシーポリシー</a>
                </p>
                <p>
                  ユーザーは、以下のGoogleセキュリティ設定ページから、本サービスによるアクセス権限を取り消すことができます。<br/>
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Google セキュリティ設定（アクセス権限の管理）</a>
                </p>
              </div>
            </section>

            {/* 6. 問い合わせ */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3">6. お問い合わせ</h2>
              <p className="text-sm leading-relaxed">
                本ポリシーに関するお問い合わせは、サイト内の「お問い合わせフォーム」または下記連絡先までお願いいたします。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}