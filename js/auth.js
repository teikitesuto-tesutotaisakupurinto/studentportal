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

  const snap=await getDoc(
    doc(db,"users",user.uid)
  );

  if(!snap.exists()){
    return null;
  }

  return snap.data().role;

}


async function redirectUser(user){

  const role=await getUserRole(user);

  if(role==="admin"){

    location.href="admin.html";

  }else if(role==="student"){

    location.href="student.html";

  }else{

    alert("権限が設定されていません");

  }

}


window.login=async function(){

  const email=
    document.getElementById("email").value.trim();

  const password=
    document.getElementById("password").value;

  if(!email || !password){

    alert("メールアドレスとパスワードを入力してください");
    return;

  }

  try{

    const result=
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    await redirectUser(result.user);

  }catch(error){

    console.error(error);

    alert(
      "ログイン失敗\n"+
      error.message
    );

  }

};


window.googleLogin=async function(){

  try{

    const result=
      await signInWithPopup(
        auth,
        googleProvider
      );

    await redirectUser(result.user);

  }catch(error){

    console.error(error);

    alert(
      "Googleログイン失敗\n"+
      error.message
    );

  }

};


window.logout=async function(){

  try{

    await signOut(auth);

    location.href="index.html";

  }catch(error){

    console.error(error);

    alert(
      "ログアウト失敗\n"+
      error.message
    );

  }

};


onAuthStateChanged(
  auth,
  user=>{

    if(user){

      console.log(
        "ログイン中:",
        user.email
      );

    }

  }
);
