import {
  auth,
  db
} from "./firebase.js";


import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



let currentUser = null;
let userData = null;



// ページ切替

window.showPage = function(page){


  document
  .querySelectorAll(".page")
  .forEach((item)=>{

    item.classList.add("hidden");

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


currentUser = user;



const userSnap =
await getDoc(
doc(db,"users",user.uid)
);



if(!userSnap.exists()){

alert(
"ユーザー情報がありません"
);

return;

}



userData =
userSnap.data();



loadProfile();

loadNotices();

loadDocuments();

loadCalendar();

loadMessages();



});







// プロフィール表示

function loadProfile(){


const area =
document.getElementById(
"profile"
);



if(area){

area.innerHTML = `

名前：${userData.name}<br>

ブロック：${userData.block}<br>

学年：${userData.grade}

`;

}


}







// お知らせ取得

async function loadNotices(){


const snap =
await getDocs(
query(
collection(db,"notices"),
orderBy(
"createdAt",
"desc"
)
)
);



const list =
document.getElementById(
"noticeList"
);


const latest =
document.getElementById(
"latestNotice"
);



list.innerHTML="";
latest.innerHTML="";



let count = 0;



snap.forEach((doc)=>{


const data =
doc.data();



if(canViewNotice(data)){



const html = `

<div class="notice-card">

<h3>
${data.title}
</h3>

<p>
${data.body}
</p>

</div>

`;



list.innerHTML += html;



if(count < 3){

latest.innerHTML += html;

}


count++;


}



});


}






// 表示対象判定

function canViewNotice(notice){


if(notice.targetType==="all"){

return true;

}



if(
notice.targetType==="block"
){

return (
notice.block === userData.block
);

}



if(
notice.targetType==="block_grade"
){

return (

notice.block === userData.block

&&

notice.grade === userData.grade

);

}



if(
notice.targetType==="individual"
){

return (
notice.uid === currentUser.uid
);

}



return false;


}








// 連絡送信

window.sendMessage = async function(){


const text =
document.getElementById(
"messageText"
).value;



if(!text){

alert(
"内容を入力してください"
);

return;

}



await addDoc(
collection(db,"messages"),
{

senderUid:
currentUser.uid,


senderName:
userData.name,


body:text,


status:"unread",


createdAt:
serverTimestamp()

}

);



alert(
"送信しました"
);



document.getElementById(
"messageText"
).value="";


};








// 連絡履歴

async function loadMessages(){


const snap =
await getDocs(
query(
collection(db,"messages"),
where(
"senderUid",
"==",
currentUser.uid
)
)
);



const area =
document.getElementById(
"messageHistory"
);



if(!area)return;


area.innerHTML="";



snap.forEach((doc)=>{


const data =
doc.data();


area.innerHTML += `

<p>
${data.body}
</p>

`;

});


}








// 配布文書

async function loadDocuments(){


const snap =
await getDocs(
collection(db,"documents")
);



const area =
document.getElementById(
"documentList"
);



if(!area)return;



area.innerHTML="";



snap.forEach((doc)=>{


const data =
doc.data();



area.innerHTML += `

<p>

<a href="${data.fileUrl}" target="_blank">

${data.title}

</a>

</p>

`;

});


}








// カレンダー

async function loadCalendar(){


const snap =
await getDocs(
collection(db,"calendar")
);



const area =
document.getElementById(
"calendarList"
);



if(!area)return;



area.innerHTML="";



snap.forEach((doc)=>{


const data =
doc.data();



area.innerHTML += `

<div>

${data.date}

<br>

${data.title}

</div>

<hr>

`;

});


}








// テスト成績送信

window.sendScore = async function(){


await addDoc(
collection(db,"scores"),
{

uid:
currentUser.uid,


name:
userData.name,


testName:
document.getElementById(
"testName"
).value,


subject:
document.getElementById(
"subject"
).value,


score:
Number(
document.getElementById(
"score"
).value
),


createdAt:
serverTimestamp()

}

);



alert(
"提出しました"
);


};
