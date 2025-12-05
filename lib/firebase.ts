import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, TwitterAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ★ここを書き換えました：環境変数を使わず、直接キーを書き込んでいます
const firebaseConfig = {
  apiKey: "AIzaSyD8ZxrKXhL3hXMx6yXiFEAd91kzB5YX_lw",
  authDomain: "raimu-song-list-79b52.firebaseapp.com",
  databaseURL: "https://raimu-song-list-79b52-default-rtdb.firebaseio.com",
  projectId: "raimu-song-list-79b52",
  storageBucket: "raimu-song-list-79b52.firebasestorage.app",
  messagingSenderId: "242038202194",
  appId: "1:242038202194:web:81cd18eb19e8c91084648b"
};

// アプリの初期化（二重初期化を防ぐ）
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 各機能の初期化
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
const twitterProvider = new TwitterAuthProvider();

export { app, auth, db, googleProvider, twitterProvider };