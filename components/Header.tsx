"use client";

import { useAuth } from "../context/AuthContext";

export default function Header() {
  // loginWithTwitter を追加で取得
  const { user, loginWithGoogle, loginWithTwitter, logout } = useAuth();

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
      <h1 className="text-xl font-bold text-gray-800">My Song List SaaS</h1>
      
      <div>
        {user ? (
          // ログインしている時の表示
          <div className="flex items-center gap-4">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="User Icon" 
                className="w-8 h-8 rounded-full border"
              />
            )}
            <span className="hidden sm:inline text-sm font-medium text-gray-700">
              {user.displayName} さん
            </span>
            <button 
              onClick={logout}
              className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition"
            >
              ログアウト
            </button>
          </div>
        ) : (
          // ログインしていない時の表示
          <div className="flex items-center gap-3">
            {/* Googleログインボタン */}
            <button 
              onClick={loginWithGoogle}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition shadow-sm"
            >
              Googleでログイン
            </button>

            {/* Twitter (X) ログインボタン（新規追加） */}
            <button 
              onClick={loginWithTwitter}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded hover:bg-gray-800 transition shadow-sm"
            >
              X (Twitter)でログイン
            </button>
          </div>
        )}
      </div>
    </header>
  );
}