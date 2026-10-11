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


let currentUser;
let userData;



// ページ切替

window.showPage = function(page){

  document
  .querySelectorAll(
    "main section"
  )
  .forEach(section=>{

    section.classList.add(
      "hidden"
    );

  });


  document
  .getElementById(page)
  .classList.remove(
    "hidden"
  );

};




// 認証確認

onAuthStateChanged(
auth,
async(user)=>{


if(!user){

location.href="index.html";

return;

}


currentUser=user;



const snap =
await getDoc(
doc(
db,
"users",
user.uid
)
);



if(!snap.exists()){

alert(
"ユーザー情報がありません"
);

return;

}


userData =
snap.data();



loadUserInfo();

loadNotices();

loadDocuments();

loadCalendar();


});






// ユーザー情報

function loadUserInfo(){


const area =
document.getElementById(
"userInfo"
);


if(area){

area.innerHTML = `

名前：${userData.name}<br>

地方：${userData.block}<br>

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


const important =
document.getElementById(
"importantNotice"
);



list.innerHTML="";
latest.innerHTML="";
important.innerHTML="";



let count=0;



snap.forEach(item=>{


const data =
item.data();



if(!canDisplayNotice(data)){

return;

}



let tag="";


if(
data.importance === "important"
){

tag = `
<span class="important">
重要
</span>
`;

}



const html = `

<div class="notice-card">

${tag}

<h3>
${data.title}
</h3>

<p>
${data.body}
</p>

</div>

`;



list.innerHTML += html;



if(
data.importance==="important"
&&
count<3
){

important.innerHTML += html;


}else if(count<3){

latest.innerHTML += html;

}


count++;


});


}







// お知らせ表示判定

function canDisplayNotice(notice){


const today =
new Date();



const start =
notice.startDate
?
new Date(notice.startDate)
:
null;



const end =
notice.endDate
?
new Date(notice.endDate)
:
null;



if(start && today < start){

return false;

}



if(end && today > end){

return false;

}




if(
notice.targetType==="all"
){

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


};








// 配布文書

let documentPage = 1;


const documentLimit = 10;



async function loadDocuments(){


const snap =
await getDocs(
query(
collection(db,"documents"),
orderBy(
"createdAt",
"desc"
)
)
);



const docs=[];


snap.forEach(d=>{

docs.push(d.data());

});



showDocuments(
docs
);


}




function showDocuments(list){


const area =
document.getElementById(
"documentList"
);


if(!area)return;



area.innerHTML="";



const start =
(documentPage-1)
*
documentLimit;



const data =
list.slice(
start,
start + documentLimit
);



data.forEach(item=>{


area.innerHTML += `

<p>

<a href="${item.fileUrl}" target="_blank">

${item.title}

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
"calendarArea"
);



if(!area)return;



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="calendar-event">

<strong>
${data.date}
</strong>

<br>

${data.title}

</div>

`;

});


}







// 成績送信

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
