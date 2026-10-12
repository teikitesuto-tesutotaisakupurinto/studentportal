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



// =====================
// ページ切替
// =====================

window.showPage = function(page){


const sections =
document.querySelectorAll(
".content > section"
);



sections.forEach(section=>{

section.style.display="none";

});



const target =
document.getElementById(page);



if(target){

target.style.display="block";

}


};









// =====================
// 認証確認
// =====================

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

loadMessages();


});









// =====================
// ユーザー情報
// =====================

function loadUserInfo(){


const area =
document.getElementById(
"userInfo"
);



if(area){


area.innerHTML = `

<p>
名前：
${userData.name || ""}
</p>

<p>
メール：
${currentUser.email}
</p>

<p>
地方：
${userData.block || ""}
</p>

<p>
学年：
${userData.grade || ""}
</p>

`;

}


}









// =====================
// お知らせ
// =====================

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



if(!list){

return;

}



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
data.importance==="important"
){

tag=`

<span class="important">

重要

</span>

`;

}




const html=`

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


}
else if(count<3){


latest.innerHTML += html;


}



count++;


});


}









function canDisplayNotice(notice){


const today =
new Date();



if(notice.startDate){


if(
today < new Date(notice.startDate)
){

return false;

}

}



if(notice.endDate){


if(
today > new Date(notice.endDate)
){

return false;

}

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









// =====================
// 連絡送信
// =====================

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


senderEmail:

currentUser.email,



body:

text,



status:

"unread",



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









// =====================
// 連絡履歴
// =====================

async function loadMessages(){


const area =
document.getElementById(
"messageHistory"
);



if(!area){

return;

}



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



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">

${data.body}

</div>

`;



});


}









// =====================
// 配布文書
// =====================

async function loadDocuments(){


const area =
document.getElementById(
"documentList"
);



if(!area){

return;

}



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



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">

<a href="${data.fileUrl}" target="_blank">

${data.title}

</a>

</div>

`;



});


}









// =====================
// 成績送信
// =====================

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
