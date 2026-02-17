import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, // ⭐ 回歸彈窗模式，最穩定的登入感
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALenSbqcjiXd2-kyfHs3rAZs5VB1FaS68",
  authDomain: "future-flow-1a244.firebaseapp.com",
  projectId: "future-flow-1a244",
  storageBucket: "future-flow-1a244.firebasestorage.app",
  messagingSenderId: "809513821311",
  appId: "1:809513821311:web:8699f83bae91696d3f8b4a"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/**
 * 總裁登入：回歸彈窗模式，直接解決「跳轉後沒反應」的問題
 */
export const loginWithGoogle = async () => {
  try {
    console.log("🚀 啟動 Google 彈窗登入...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("✅ 登入成功:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("❌ 登入失敗：", error.message);
    // 如果報錯是「auth/popup-blocked」，請提醒總裁允許彈窗
    if (error.code === 'auth/popup-blocked') {
      alert("請允許瀏覽器彈出視窗以完成登入");
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

export const onAuthStateChanged = (callback: any) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * 內部函數：清理資料格式
 */
const prepareDataForFirestore = (data: any) => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    value === undefined ? null : value
  ));
};

/**
 * 存檔函數
 */
export const saveUserLedger = async (uid: string, data: any) => {
  if (!data.transactions || data.transactions.length === 0) {
    console.warn("🛡️ 攔截到空資料寫入請求。");
    return; 
  }

  const docRef = doc(db, "userLedgers", uid);
  const cleanData = prepareDataForFirestore({
    ...data,
    updatedAt: Date.now()
  });

  try {
    await setDoc(docRef, cleanData, { merge: true });
    
    // 備份邏輯 (保持在同一個 Collection 以符合 Rule)
    const dateStr = new Date().toISOString().split('T')[0];
    const backupRef = doc(db, "userLedgers", `${uid}_backup_${dateStr}`);
    await setDoc(backupRef, {
      ...cleanData,
      isBackup: true,
      backupTimestamp: serverTimestamp()
    }, { merge: true });

    console.log("💎 總裁，帝國資產已同步。");
  } catch (error: any) {
    console.error("❌ 存檔失敗：", error.message);
  }
};

/**
 * 雲端取檔
 */
export const getUserLedger = async (uid: string) => {
  try {
    const docRef = doc(db, "userLedgers", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error: any) {
    console.error("❌ 讀取失敗：", error.message);
    return null;
  }
};