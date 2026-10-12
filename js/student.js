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


import {
  getUserRole
} from "./auth.js";



let currentUser = null;

let userData = null;







// =====================
// ページ切替
// =====================

window.showPage = function(page){


document
.querySelectorAll(".content > section")
.forEach(section=>{


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



const role =
await getUserRole(user);



if(role !== "student"){


alert(
"アクセス権限がありません"
);



location.href="admin.html";

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



userData =
snap.data();



loadUserInfo();

loadNotices();

loadDocuments();

loadCalendar();

loadScoreForms();


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


const area =
document.getElementById(
"noticeList"
);



if(!area){

return;

}



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



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="notice-card">


<a href="notice.html?id=${item.id}">


<h3>

${data.title}

</h3>


</a>


<p>

${data.body.substring(0,50)}

</p>


</div>

`;



});


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


body:text,


status:"unread",


createdAt:
serverTimestamp()


}

);



document.getElementById(
"messageText"
).value="";



alert(
"送信しました"
);


};









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


<a href="document.html?id=${item.id}">


<h3>

${data.title}

</h3>


</a>


<p>

${data.body || ""}

</p>


</div>

`;



});


}









// =====================
// カレンダー
// =====================

async function loadCalendar(){


const area =
document.getElementById(
"calendarArea"
);



if(!area){

return;

}



const snap =
await getDocs(
collection(db,"calendar")
);



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">

${data.date}

<br>

${data.title}

</div>

`;



});


}









// =====================
// 成績フォーム取得
// =====================

async function loadScoreForms(){


const area =
document.getElementById(
"scoreFormList"
);



if(!area){

return;

}



const snap =
await getDocs(
collection(db,"scoreForms")
);



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">


<h3>

${data.title}

</h3>


<button>

入力する

</button>


</div>

`;



});


}
