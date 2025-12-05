import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, TwitterAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
// Storage関連のインポートを削除しました

const firebaseConfig = {
  apiKey: "AIzaSyD8ZxrKXhL3hXMx6yXiFEAd91kzB5YX_lw", 
  authDomain: "raimu-song-list-79b52.firebaseapp.com",
  databaseURL: "https://raimu-song-list-79b52-default-rtdb.firebaseio.com",
  projectId: "raimu-song-list-79b52",
  storageBucket: "raimu-song-list-79b52.firebasestorage.app", 
  messagingSenderId: "242038202194",
  appId: "1:242038202194:web:81cd18eb19e8c91084648b"
};

// アプリの初期化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 各機能の初期化
const auth = getAuth(app);
const db = getDatabase(app);
// const storage = getStorage(app); // ★削除: Storageは使いません
const googleProvider = new GoogleAuthProvider();
const twitterProvider = new TwitterAuthProvider();

export { app, auth, db, googleProvider, twitterProvider };