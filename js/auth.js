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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// =====================
// 権限取得
// =====================

export async function getUserRole(user){


const snap =
await getDoc(
doc(
db,
"users",
user.uid
)
);



if(!snap.exists()){

return null;

}



return snap.data().role;


}






// =====================
// ログイン後振り分け
// =====================

async function redirectUser(user){


const role =
await getUserRole(user);



if(role === "admin"){


location.href =
"admin.html";


}
else if(role === "student"){


location.href =
"student.html";


}
else{


alert(
"権限が設定されていません"
);


}



}









// =====================
// メールログイン
// =====================

window.login = async function(){



const email =
document.getElementById(
"email"
).value;



const password =
document.getElementById(
"password"
).value;




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



alert(
"ログインできませんでした\n"
+
error.message
);



}



};









// =====================
// Googleログイン
// =====================

window.googleLogin = async function(){



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



alert(
"Googleログインできませんでした\n"
+
error.message
);



}



};









// =====================
// ログアウト
// =====================

window.logout = async function(){


try{


await signOut(auth);



location.href =
"index.html";



}catch(error){


alert(
"ログアウトできませんでした"
);



}



};









// =====================
// ログイン状態確認
// =====================

onAuthStateChanged(
auth,
(user)=>{


if(user){


console.log(
"ログイン中:",
user.email
);



}


});
