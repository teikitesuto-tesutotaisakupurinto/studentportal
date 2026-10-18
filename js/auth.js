import {
  auth,
  googleProvider,
  db
} from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


export async function getUserRole(user){

  if(!user) return null;

  try{

    const snap =
      await getDoc(
        doc(db,"users",user.uid)
      );

    if(!snap.exists()){
      return null;
    }

    return snap.data().role || null;

  }catch(error){

    console.error(
      "ユーザー権限取得エラー:",
      error
    );

    return null;
  }
}


async function redirectUser(user){

  const role =
    await getUserRole(user);

  if(role === "admin"){

    location.href =
      "dashboard/admin.html";

    return;
  }

  if(role === "student"){

    location.href =
      "student.html";

    return;
  }

  alert(
    "このアカウントにはポータルサイトの権限が設定されていません。\n管理者に確認してください。"
  );
}


window.login = async function(){

  const email =
    document
      .getElementById("email")
      ?.value
      .trim();

  const password =
    document
      .getElementById("password")
      ?.value;

  const errorArea =
    document.getElementById("loginError");

  if(errorArea){
    errorArea.textContent = "";
  }

  if(!email || !password){

    if(errorArea){
      errorArea.textContent =
        "メールアドレスとパスワードを入力してください。";
    }

    return;
  }

  try{

    const result =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    await redirectUser(
      result.user
    );

  }catch(error){

    console.error(error);

    if(errorArea){

      if(
        error.code ===
        "auth/invalid-credential"
      ){

        errorArea.textContent =
          "メールアドレスまたはパスワードが正しくありません。";

      }else{

        errorArea.textContent =
          "ログインできませんでした。";

      }

    }
  }
};


window.googleLogin = async function(){

  const errorArea =
    document.getElementById("loginError");

  if(errorArea){
    errorArea.textContent = "";
  }

  try{

    const result =
      await signInWithPopup(
        auth,
        googleProvider
      );

    await redirectUser(
      result.user
    );

  }catch(error){

    console.error(
      "Googleログインエラー:",
      error
    );

    if(errorArea){

      if(
        error.code ===
        "auth/popup-closed-by-user"
      ){

        errorArea.textContent =
          "Googleログインをキャンセルしました。";

      }else if(
        error.code ===
        "auth/popup-blocked"
      ){

        errorArea.textContent =
          "ポップアップがブロックされています。ブラウザのポップアップを許可してください。";

      }else{

        errorArea.textContent =
          "Googleログインに失敗しました。Firebase AuthenticationのGoogleプロバイダ設定も確認してください。";

      }

    }
  }
};


window.logout = async function(){

  try{

    await signOut(auth);

    location.href =
      getRootPath();

  }catch(error){

    console.error(error);

    alert(
      "ログアウトできませんでした。"
    );
  }
};


function getRootPath(){

  const pathname =
    location.pathname;

  const index =
    pathname.indexOf(
      "/studentportal/"
    );

  if(index >= 0){

    return (
      pathname.substring(
        0,
        index + "/studentportal/".length
      ) +
      "index.html"
    );
  }

  return "../index.html";
}


onAuthStateChanged(
  auth,
  user => {

    if(user){

      console.log(
        "ログイン中:",
        user.email
      );

    }

  }
);
