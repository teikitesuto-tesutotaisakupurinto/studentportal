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




// ユーザー振り分け

async function redirectUser(user){

  const userRef =
  doc(
    db,
    "users",
    user.uid
  );


  const userSnap =
  await getDoc(userRef);



  if(!userSnap.exists()){

    alert(
      "ユーザー情報が登録されていません"
    );

    return;

  }



  const data =
  userSnap.data();



  if(data.role === "admin"){

    window.location.href =
    "admin.html";

  }else{


    window.location.href =
    "student.html";


  }


}







// メールログイン

window.login = async function(){


  const email =
  document
  .getElementById("email")
  .value;



  const password =
  document
  .getElementById("password")
  .value;



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
      "ログインに失敗しました\n"
      +
      error.message
    );


  }


};








// Googleログイン

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
"Googleログインに失敗しました\n"
+
error.message
);


}


};









// ログアウト

window.logout = async function(){


try{


await signOut(auth);



window.location.replace(
"index.html"
);



}catch(error){


alert(
"ログアウトに失敗しました\n"
+
error.message
);


}


};









// 認証状態確認

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
