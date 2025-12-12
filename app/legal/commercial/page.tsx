import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';

export default function CommercialPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto p-6 md:p-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> トップページに戻る
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-slate-600" /> 特定商取引法に基づく表記
          </h1>

          <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">販売事業者名</dt>
              <dd className="text-sm font-bold text-slate-800 md:col-span-2">
                SongList運営事務局（または屋号・法人名）<br/>
                <span className="text-xs text-slate-400 font-normal">※ 請求があった場合、遅滞なく開示します。</span>
              </dd>
            </div>
            
            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">運営責任者</dt>
              <dd className="text-sm font-bold text-slate-800 md:col-span-2">
                （代表者氏名を入力）
              </dd>
            </div>

            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">所在地</dt>
              <dd className="text-sm text-slate-800 md:col-span-2">
                〒000-0000<br/>
                （住所を入力）<br/>
                <span className="text-xs text-slate-400">※ 請求があった場合、遅滞なく開示します。</span>
              </dd>
            </div>

            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">連絡先</dt>
              <dd className="text-sm text-slate-800 md:col-span-2 space-y-1">
                <p>メール: support@example.com</p>
                <p>電話番号: 請求があった場合、遅滞なく開示します。</p>
              </dd>
            </div>

            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">販売価格</dt>
              <dd className="text-sm text-slate-800 md:col-span-2">
                各プランの申し込みページに表示された金額（表示価格は消費税込み）
              </dd>
            </div>

            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">お支払方法</dt>
              <dd className="text-sm text-slate-800 md:col-span-2">
                クレジットカード決済（Stripe / PayPal 等）
              </dd>
            </div>

            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">提供時期</dt>
              <dd className="text-sm text-slate-800 md:col-span-2">
                決済手続き完了後、直ちにご利用いただけます。
              </dd>
            </div>

            <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">返金・キャンセル</dt>
              <dd className="text-sm text-slate-800 md:col-span-2">
                <p className="mb-2">サービスの性質上、決済完了後の返金は原則としてお受けできません。</p>
                <p>解約は設定画面よりいつでも行うことができ、次回更新日の前日までにご解約いただければ次月の請求は発生しません。</p>
              </dd>
            </div>
            
             <div className="py-4 md:grid md:grid-cols-3 md:gap-4">
              <dt className="text-sm font-bold text-slate-500 uppercase py-1">動作環境</dt>
              <dd className="text-sm text-slate-800 md:col-span-2">
                Google Chrome, Safari, Edge, Firefoxの最新版<br/>
                iOS 15以降, Android 10以降
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}