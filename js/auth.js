import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*
=========================================
Firebase設定
=========================================
現在使っているFirebase Console
プロジェクト設定 > マイアプリ > Firebase SDK snippet
の設定値を入れてください。
*/

const firebaseConfig = {
  apiKey: "AIzaSyDmXjXpibfIfejGsUCMyHK9UzklG4WhEmw",
  authDomain: "aitera-83486.firebaseapp.com",
  projectId: "aitera-83486",
  storageBucket: "aitera-83486.firebasestorage.app",
  messagingSenderId: "79405334766",
  appId: "1:79405334766:web:694c02a7abb407b50c73ff"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt:"select_account"
});

/* =====================================
   ログイン
===================================== */

export async function loginEmail(email,password){

  return await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}

/* =====================================
   Googleログイン
===================================== */

export async function loginGoogle(){

  try{

    const result =
      await signInWithPopup(
        auth,
        provider
      );

    return result;

  }catch(error){

    console.error(
      "Googleログインエラー:",
      error
    );

    throw error;
  }
}

/* =====================================
   ログアウト
===================================== */

export async function logout(){

  try{

    await signOut(auth);

    location.href =
      getRootPath() + "index.html";

  }catch(error){

    console.error(
      "ログアウトエラー:",
      error
    );

    alert(
      "ログアウトに失敗しました。"
    );
  }
}

window.logout = logout;

/* =====================================
   認証状態
===================================== */

export function requireLogin(
  callback
){

  onAuthStateChanged(
    auth,
    async user => {

      if(!user){

        location.href =
          getRootPath() + "index.html";

        return;
      }

      if(callback){

        await callback(user);
      }

    }
  );
}

/* =====================================
   管理者確認
===================================== */

export async function getUserRole(
  user
){

  try{

    const ref =
      doc(
        db,
        "users",
        user.uid
      );

    const snap =
      await getDoc(ref);

    if(!snap.exists()){

      return null;
    }

    return snap.data().role || null;

  }catch(error){

    console.error(
      "権限確認エラー:",
      error
    );

    return null;
  }
}

export async function requireAdmin(
  callback
){

  onAuthStateChanged(
    auth,
    async user => {

      if(!user){

        location.href =
          getRootPath() + "index.html";

        return;
      }

      const role =
        await getUserRole(user);

      if(
        role !== "admin" &&
        role !== "administrator"
      ){

        alert(
          "管理者権限が必要です。"
        );

        location.href =
          getRootPath() + "dashboard/admin.html";

        return;
      }

      if(callback){

        await callback(user);
      }

    }
  );
}

/* =====================================
   パス
===================================== */

function getRootPath(){

  return "/studentportal/";
}
