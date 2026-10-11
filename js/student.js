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
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ページ切り替え
window.showPage = function(page){

  const pages =
    document.querySelectorAll(".page");


  pages.forEach((p)=>{

    p.classList.add("hidden");

  });


  document
    .getElementById(page)
    .classList.remove("hidden");

};



// ログイン確認
onAuthStateChanged(
auth,
async(user)=>{


if(!user){

 location.href="index.html";

 return;

}


// ユーザー情報取得
const userDoc =
await getDoc(
 doc(db,"users",user.uid)
);


if(!userDoc.exists()){

 alert("ユーザー情報がありません");

 return;

}


const userData =
userDoc.data();


// お知らせ取得
loadNotices(userData);


});




// お知らせ読み込み
async function loadNotices(userData){


const noticeQuery =
query(
 collection(db,"notices"),
 orderBy(
  "createdAt",
  "desc"
 )
);


const snapshot =
await getDocs(noticeQuery);



const noticeList =
document.getElementById(
"noticeList"
);


const latest =
document.getElementById(
"latestNotice"
);



let count = 0;



snapshot.forEach((doc)=>{


const data =
doc.data();



if(
 canViewNotice(
 data,
 userData
 )
){


const item =
document.createElement("div");


item.className =
"notice-card";


item.innerHTML =
`
<h3>${data.title}</h3>
<p>${data.body}</p>
`;



noticeList.appendChild(item);



if(count < 3){

const latestItem =
item.cloneNode(true);

latest.appendChild(latestItem);

}


count++;


}


});


}



// 表示対象判定
function canViewNotice(
notice,
user
){


if(
notice.targetType
===
"all"
){

return true;

}



if(
notice.targetType
===
"block"
){

return (
notice.block
===
user.block
);

}



if(
notice.targetType
===
"block_grade"
){

return (
notice.block === user.block
&&
notice.grade === user.grade
);

}



if(
notice.targetType
===
"individual"
){

return (
notice.uid === user.uid
);

}



return false;


}
