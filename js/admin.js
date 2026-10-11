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
  doc,
  getDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// ページ切替

window.showAdminPage = function(page){


document
.querySelectorAll("main section")
.forEach(section=>{

section.classList.add("hidden");

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



const snap =
await getDoc(
doc(
db,
"users",
user.uid
)
);



if(!snap.exists()){

location.href="index.html";

return;

}



const data =
snap.data();



if(data.role !== "admin"){


alert(
"管理者権限がありません"
);


location.href="student.html";


return;


}



loadMessages();

loadScores();

loadUsers();


});









// 送信対象変更

window.changeTarget = function(){


const type =
document.getElementById(
"targetType"
).value;



document
.getElementById(
"blockArea"
)
.classList.add(
"hidden"
);



document
.getElementById(
"gradeArea"
)
.classList.add(
"hidden"
);



document
.getElementById(
"userArea"
)
.classList.add(
"hidden"
);





if(
type === "block"
){

document
.getElementById(
"blockArea"
)
.classList.remove(
"hidden"
);

}



if(
type === "block_grade"
){


document
.getElementById(
"blockArea"
)
.classList.remove(
"hidden"
);



document
.getElementById(
"gradeArea"
)
.classList.remove(
"hidden"
);


}



if(
type === "individual"
){


document
.getElementById(
"userArea"
)
.classList.remove(
"hidden"
);


}


};









// お知らせ作成

window.createNotice = async function(){


const targetType =
document.getElementById(
"targetType"
).value;



const notice = {


title:
document.getElementById(
"noticeTitle"
).value,


body:
document.getElementById(
"noticeBody"
).value,


importance:
document.getElementById(
"importance"
).value,


startDate:
document.getElementById(
"startDate"
).value,


endDate:
document.getElementById(
"endDate"
).value,


targetType:
targetType,


createdAt:
serverTimestamp()


};





if(
targetType === "block"
||
targetType === "block_grade"
){


notice.block =
document.getElementById(
"block"
).value;


}





if(
targetType === "block_grade"
){


notice.grade =
document.getElementById(
"grade"
).value;


}




if(
targetType === "individual"
){


notice.uid =
document.getElementById(
"targetUid"
).value;


}





await addDoc(
collection(
db,
"notices"
),
notice
);



alert(
"お知らせを公開しました"
);



};









// 連絡確認

async function loadMessages(){


const area =
document.getElementById(
"messageList"
);



if(!area)return;



const snap =
await getDocs(
query(
collection(db,"messages"),
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

<p>
${data.senderName || ""}
</p>

<p>
${data.body}
</p>

</div>

`;



});


}









// 配布文書登録

window.addDocument = async function(){


await addDoc(
collection(db,"documents"),
{


title:
document.getElementById(
"documentTitle"
).value,


fileUrl:
document.getElementById(
"documentUrl"
).value,


createdAt:
serverTimestamp()


}

);



alert(
"登録しました"
);


};









// カレンダー登録

window.addCalendar = async function(){


await addDoc(
collection(db,"calendar"),
{


title:
document.getElementById(
"calendarTitle"
).value,


date:
document.getElementById(
"calendarDate"
).value,


description:
document.getElementById(
"calendarDescription"
).value,


createdAt:
serverTimestamp()


}

);



alert(
"予定を登録しました"
);


};









// 成績一覧

async function loadScores(){


const area =
document.getElementById(
"scoreList"
);



if(!area)return;



const snap =
await getDocs(
collection(db,"scores")
);



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">

<p>
${data.name}
</p>

<p>
${data.testName}
</p>

<p>
${data.subject}
：
${data.score}点
</p>

</div>

`;



});


}









// 生徒一覧

async function loadUsers(){


const area =
document.getElementById(
"userList"
);



if(!area)return;



const snap =
await getDocs(
collection(db,"users")
);



area.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">

${data.name}

<br>

${data.block}

<br>

${data.grade}

</div>

`;



});


}
