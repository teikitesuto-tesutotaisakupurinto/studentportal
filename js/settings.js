import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


async function loadSettings(user){

  const snap =
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );


  if(!snap.exists()){
    return;
  }


  const data =
    snap.data();


  const area =
    document.getElementById(
      "userInfo"
    );


  if(!area){
    return;
  }


  area.innerHTML = `

    <p>
      名前：
      ${escapeHtml(data.name || "")}
    </p>

    <p>
      メールアドレス：
      ${escapeHtml(user.email || "")}
    </p>

    <p>
      ブロック：
      ${escapeHtml(data.block || "")}
    </p>

    <p>
      学年：
      ${escapeHtml(data.grade || "")}
    </p>

  `;

}


onAuthStateChanged(
  auth,
  user => {

    if(user){
      loadSettings(user);
    }

  }
);


window.changePassword =
async function(){

  const oldPassword =
    prompt(
      "現在のパスワードを入力してください"
    );


  const newPassword =
    prompt(
      "新しいパスワードを入力してください"
    );


  if(
    !oldPassword ||
    !newPassword
  ){

    return;

  }


  const user =
    auth.currentUser;


  try{

    const credential =
      EmailAuthProvider.credential(
        user.email,
        oldPassword
      );


    await reauthenticateWithCredential(
      user,
      credential
    );


    await updatePassword(
      user,
      newPassword
    );


    alert(
      "パスワードを変更しました"
    );


  }catch(error){

    console.error(error);

    alert(
      "変更できませんでした\n" +
      error.message
    );

  }

};


function escapeHtml(value){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}
