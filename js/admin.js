import {
  auth,
  db
} from "./firebase.js";


import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



// 管理画面切り替え
window.showAdminPage = function(page){

  const pages =
    document.querySelectorAll(".admin-page");


  pages.forEach((p)=>{

    p.classList.add("hidden");

  });


  document
    .getElementById(page)
    .classList.remove("hidden");

};




// 管理者確認
onAuthStateChanged(
auth,
async(user)=>{


if(!user){

 location.href="index.html";

 return;

}



const userDoc =
await getDoc(
 doc(db,"users",user.uid)
);



if(!userDoc.exists()){

 alert("ユーザー情報がありません");

 location.href="index.html";

 return;

}



const data =
userDoc.data();



if(data.role !== "admin"){

 alert("管理者権限がありません");

 location.href="student.html";

}


});




// 送信範囲変更
window.changeTarget = function(){


const type =
document.getElementById(
"targetType"
).value;



document
.getElementById("blockArea")
.classList.add("hidden");


document
.getElementById("gradeArea")
.classList.add("hidden");


document
.getElementById("userArea")
.classList.add("hidden");



if(type === "block"){

document
.getElementById("blockArea")
.classList.remove("hidden");

}



if(type === "block_grade"){

document
.getElementById("blockArea")
.classList.remove("hidden");


document
.getElementById("gradeArea")
.classList.remove("hidden");

}



if(type === "individual"){

document
.getElementById("userArea")
.classList.remove("hidden");

}


};




// お知らせ作成
window.createNotice = async function(){


const title =
document.getElementById(
"noticeTitle"
).value;


const body =
document.getElementById(
"noticeBody"
).value;



const targetType =
document.getElementById(
"targetType"
).value;



const data = {

title:title,

body:body,

targetType:targetType,

createdAt:
serverTimestamp(),

published:true

};



// ブロック追加
if(
targetType === "block" ||
targetType === "block_grade"
){

data.block =
document.getElementById(
"block"
).value;

}



// 学年追加
if(
targetType === "block_grade"
){

data.grade =
document.getElementById(
"grade"
).value;

}



// 個別追加
if(
targetType === "individual"
){

data.uid =
document.getElementById(
"targetUid"
).value;

}



try{


await addDoc(
collection(db,"notices"),
data
);



alert(
"お知らせを公開しました"
);



}catch(error){


alert(
"保存に失敗しました\n"
+
error.message
);


}


};
