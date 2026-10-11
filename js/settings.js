import {
  auth,
  db
} from "./firebase.js";


import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// プロフィール取得

async function loadSettings(){


const user =
auth.currentUser;



if(!user){

return;

}



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



if(area){


area.innerHTML = `

名前：
${data.name || ""}

<br>

メール：
${user.email || ""}

<br>

地方：
${data.block || ""}

<br>

学年：
${data.grade || ""}

`;

}


}




// パスワード変更

window.changePassword = async function(){



const current =
prompt(
"現在のパスワードを入力してください"
);



const newPassword =
prompt(
"新しいパスワードを入力してください"
);



if(
!current ||
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
current
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



alert(
"変更できませんでした\n"
+
error.message
);



}


};






// 読み込み

auth.onAuthStateChanged(
(user)=>{


if(user){

loadSettings();

}


});
