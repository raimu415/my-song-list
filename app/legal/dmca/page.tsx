import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Mail } from 'lucide-react';

export default function DmcaPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto p-6 md:p-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> トップページに戻る
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-red-500" /> 権利侵害に関する通報窓口
          </h1>

          <p className="text-sm leading-relaxed mb-6">
            本サービス上で、著作権、商標権、肖像権などの権利侵害が発生している場合、または不適切なコンテンツを発見された場合は、以下の窓口までご連絡ください。
            運営チームにて内容を確認し、利用規約および関連法令に基づき、削除等の適切な対応を行います。
          </p>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8">
            <h3 className="text-red-800 font-bold mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" /> 通報時の記載事項
            </h3>
            <ul className="list-disc list-inside text-sm text-red-900/80 space-y-2">
              <li>権利を侵害されているコンテンツのURL</li>
              <li>侵害されている権利の種類（著作権、肖像権など）</li>
              <li>権利者であることを証明する情報（または権利者の代理人であることの証明）</li>
              <li>具体的な侵害の内容</li>
              <li>ご連絡先（メールアドレス）</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">ご連絡先</h3>
            <div className="p-4 bg-slate-100 rounded-xl text-sm font-mono text-slate-600 select-all">
              support+dmca@example.com
            </div>
            <p className="text-xs text-slate-400">
              ※ お問い合わせの内容によっては、回答にお時間をいただく場合や、対応いたしかねる場合がございます。
              ※ 虚偽の通報が行われた場合、法的な責任を問われる可能性があります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}