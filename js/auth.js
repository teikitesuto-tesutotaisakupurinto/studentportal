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

export async function getUserData(user){

  const snap = await getDoc(
    doc(db,"users",user.uid)
  );

  if(!snap.exists()){
    return null;
  }

  return {
    id:user.uid,
    ...snap.data()
  };
}

export async function getUserRole(user){

  const data = await getUserData(user);

  return data?.role || null;
}

async function redirectUser(user){

  const data = await getUserData(user);

  if(!data){

    showError("ユーザー情報が登録されていません。");

    await signOut(auth);

    return;
  }

  if(data.role === "admin"){

    location.href =
      "/studentportal/dashboard/admin.html";

    return;
  }

  if(data.role === "student"){

    location.href =
      "/studentportal/dashboard/student.html";

    return;
  }

  showError("権限が設定されていません。");
}

function showError(message){

  const area =
    document.getElementById("loginError");

  if(area){
    area.textContent = message;
  }else{
    alert(message);
  }
}

window.login = async function(){

  const email =
    document.getElementById("email")?.value.trim();

  const password =
    document.getElementById("password")?.value;

  if(!email || !password){

    showError("メールアドレスとパスワードを入力してください。");

    return;
  }

  try{

    const result =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    await redirectUser(result.user);

  }catch(error){

    console.error(error);

    showError(
      "ログインできませんでした。"
    );
  }
};

window.googleLogin = async function(){

  const button =
    document.getElementById("googleLoginButton");

  try{

    if(button){
      button.disabled = true;
    }

    const result =
      await signInWithPopup(
        auth,
        googleProvider
      );

    await redirectUser(result.user);

  }catch(error){

    console.error(error);

    if(error.code === "auth/popup-closed-by-user"){
      showError("Googleログインをキャンセルしました。");
    }else if(error.code === "auth/unauthorized-domain"){
      showError(
        "このサイトのドメインがFirebase Authenticationで承認されていません。"
      );
    }else{
      showError(
        "Googleログインに失敗しました。"
      );
    }

  }finally{

    if(button){
      button.disabled = false;
    }

  }
};

window.logout = async function(){

  try{

    await signOut(auth);

    location.href =
      "/studentportal/index.html";

  }catch(error){

    console.error(error);

    alert("ログアウトできませんでした。");
  }
};

const loginForm =
  document.getElementById("loginForm");

if(loginForm){

  loginForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      window.login();

    }
  );
}

const googleButton =
  document.getElementById("googleLoginButton");

if(googleButton){

  googleButton.addEventListener(
    "click",
    () => window.googleLogin()
  );

}

onAuthStateChanged(auth,user => {

  if(user){

    console.log(
      "ログイン中:",
      user.email
    );

  }

});
