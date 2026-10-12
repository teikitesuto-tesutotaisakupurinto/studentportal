import {
  auth,
  db,
  storage
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


import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


import {
  getUserRole
} from "./auth.js";





// =====================
// ページ切替
// =====================

window.showAdminPage = function(page){


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
// 管理者確認
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



if(role !== "admin"){


alert(
"アクセス権限がありません"
);


location.href="student.html";


return;


}



loadBlocks();

loadStudents();

loadMessages();

loadUsers();

loadScores();


});









// =====================
// ブロック取得
// usersから取得
// =====================

async function loadBlocks(){


const select =
document.getElementById(
"block"
);



if(!select){

return;

}



const snap =
await getDocs(
collection(db,"users")
);



const blocks =
new Set();



snap.forEach(item=>{


const data =
item.data();



if(data.block){

blocks.add(
data.block
);

}


});



select.innerHTML="";



blocks.forEach(block=>{


const option =
document.createElement("option");


option.value=block;

option.textContent=block;


select.appendChild(option);


});


}









// =====================
// 個別送信用 生徒取得
// =====================

async function loadStudents(){


const select =
document.getElementById(
"targetUser"
);



if(!select){

return;

}



const snap =
await getDocs(
collection(db,"users")
);



select.innerHTML="";



snap.forEach(item=>{


const data =
item.data();



if(data.role==="student"){


const option =
document.createElement("option");


option.value=item.id;


option.textContent=data.name;


select.appendChild(option);


}



});


}









// =====================
// 送信範囲変更
// =====================

window.changeTarget=function(){


const type =
document.getElementById(
"targetType"
).value;



document.getElementById(
"blockArea"
).style.display="none";


document.getElementById(
"gradeArea"
).style.display="none";


document.getElementById(
"userArea"
).style.display="none";





if(type==="block"){

document.getElementById(
"blockArea"
).style.display="block";

}


if(type==="block_grade"){

document.getElementById(
"blockArea"
).style.display="block";


document.getElementById(
"gradeArea"
).style.display="block";

}


if(type==="individual"){

document.getElementById(
"userArea"
).style.display="block";

}


};









// =====================
// お知らせ作成
// =====================

window.createNotice=async function(){


const targetType =
document.getElementById(
"targetType"
).value;



const data={


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


targetType,


createdAt:
serverTimestamp()


};





if(
targetType==="block" ||
targetType==="block_grade"
){

data.block =
document.getElementById(
"block"
).value;

}



if(
targetType==="block_grade"
){

data.grade =
document.getElementById(
"grade"
).value;

}



if(
targetType==="individual"
){

data.uid =
document.getElementById(
"targetUser"
).value;

}



await addDoc(
collection(db,"notices"),
data
);



document
.getElementById("noticeTitle")
.value="";


document
.getElementById("noticeBody")
.value="";


alert(
"公開しました"
);


};









// =====================
// 配布文書アップロード
// =====================

window.addDocument=async function(){


const file =
document.getElementById(
"documentFile"
).files[0];



const title =
document.getElementById(
"documentTitle"
).value;


const body =
document.getElementById(
"documentBody"
).value;



if(!file){

alert(
"PDFを選択してください"
);

return;

}



const storageRef =
ref(
storage,
"documents/"+file.name
);



await uploadBytes(
storageRef,
file
);



const url =
await getDownloadURL(
storageRef
);



await addDoc(
collection(db,"documents"),
{


title,

body,

fileUrl:url,

fileName:file.name,

createdAt:
serverTimestamp()


}

);



document.getElementById(
"documentTitle"
).value="";


document.getElementById(
"documentBody"
).value="";


alert(
"アップロードしました"
);


};









// =====================
// カレンダー登録
// =====================

window.addCalendar=async function(){


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
"登録しました"
);


};









// =====================
// 成績フォーム作成
// =====================

window.createScoreForm=async function(){


const subjects=[];


document
.querySelectorAll(
"#scoreForms input[type=checkbox]:checked"
)
.forEach(item=>{

subjects.push(
item.value
);

});



await addDoc(
collection(db,"scoreForms"),
{


title:
document.getElementById(
"formTitle"
).value,


testType:
document.getElementById(
"testType"
).value,


subjects,


createdAt:
serverTimestamp()


}

);



alert(
"フォームを作成しました"
);


};









// =====================
// 連絡確認
// =====================

async function loadMessages(){


const area =
document.getElementById(
"messageList"
);



if(!area)return;



const snap =
await getDocs(
collection(db,"messages")
);



area.innerHTML="";



snap.forEach(item=>{


const data=item.data();



area.innerHTML+=`

<div class="card">

${data.senderName}<br>

${data.body}

</div>

`;


});


}









// =====================
// 生徒一覧
// =====================

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


const data=item.data();



area.innerHTML+=`

<div class="card">

${data.name}<br>

${data.block || ""}<br>

${data.grade || ""}

</div>

`;

});


}









// =====================
// 成績確認
// =====================

async function loadScores(){


const area =
document.getElementById(
"analysisArea"
);



if(!area)return;



const snap =
await getDocs(
collection(db,"scores")
);



area.innerHTML =
`提出件数：${snap.size}件`;

}
