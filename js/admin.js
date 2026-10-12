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

loadAnalysis();


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
document.createElement(
"option"
);


option.value =
block;


option.textContent =
block;


select.appendChild(
option
);


});


}









// =====================
// 個別送信用生徒取得
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
document.createElement(
"option"
);


option.value =
item.id;


option.textContent =
data.name;


select.appendChild(
option
);


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

window.createNotice = async function(){


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


targetType:targetType,


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



document.getElementById(
"noticeTitle"
).value="";


document.getElementById(
"noticeBody"
).value="";



alert(
"お知らせを公開しました"
);


};









// =====================
// 配布文書登録 URL方式
// =====================

window.addDocument = async function(){


const title =
document.getElementById(
"documentTitle"
).value;



const body =
document.getElementById(
"documentBody"
).value;



const url =
document.getElementById(
"documentUrl"
).value;





if(!title || !url){

alert(
"タイトルとURLを入力してください"
);

return;

}





await addDoc(
collection(db,"documents"),
{


title:title,


body:body,


url:url,


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


document.getElementById(
"documentUrl"
).value="";



alert(
"配布文書を登録しました"
);


};
// =====================
// カレンダー登録
// =====================

window.addCalendar = async function(){


const title =
document.getElementById(
"calendarTitle"
).value;


const date =
document.getElementById(
"calendarDate"
).value;


const description =
document.getElementById(
"calendarDescription"
).value;




await addDoc(
collection(db,"calendar"),
{

title:title,

date:date,

description:description,

createdAt:
serverTimestamp()

}

);



document.getElementById(
"calendarTitle"
).value="";


document.getElementById(
"calendarDate"
).value="";


document.getElementById(
"calendarDescription"
).value="";



alert(
"予定を登録しました"
);


};









// =====================
// 成績フォーム作成
// =====================

window.createScoreForm = async function(){


const subjects = [];



document
.querySelectorAll(
"#subjectList input[type='checkbox']:checked"
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


subjects:subjects,


startDate:
document.getElementById(
"formStartDate"
).value,


endDate:
document.getElementById(
"formEndDate"
).value,


targetType:
document.getElementById(
"formTargetType"
).value,


published:true,


createdBy:
auth.currentUser.uid,


createdAt:
serverTimestamp()


}

);





document.getElementById(
"formTitle"
).value="";



alert(
"成績フォームを作成しました"
);


};









// =====================
// 連絡管理
// =====================

async function loadMessages(){


const area =
document.getElementById(
"messageList"
);



if(!area){

return;

}



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
送信者：
${data.senderName || ""}
</p>


<p>
メール：
${data.senderEmail || ""}
</p>


<p>
内容：
${data.body || ""}
</p>


<p>
状態：
${data.status || "unread"}
</p>


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



if(!area){

return;

}



const snap =
await getDocs(
collection(db,"users")
);



area.innerHTML="";



let count = 0;



snap.forEach(item=>{


const data =
item.data();



if(data.role==="student"){


count++;



area.innerHTML += `

<div class="card">

<p>
名前：
${data.name || ""}
</p>


<p>
地方：
${data.block || ""}
</p>


<p>
学年：
${data.grade || ""}
</p>


</div>

`;



}


});





const countArea =
document.getElementById(
"studentCount"
);



if(countArea){

countArea.textContent =
count + "人";

}



}









// =====================
// 成績分析
// =====================

async function loadAnalysis(){


const area =
document.getElementById(
"analysisArea"
);



if(!area){

return;

}



const snap =
await getDocs(
collection(db,"scores")
);



let total = 0;

let count = 0;



snap.forEach(item=>{


const data =
item.data();



if(data.total){


total += data.total;

count++;


}



});





area.innerHTML = `

<div class="card">

<p>
提出人数：
${count}人
</p>


<p>
平均点：
${
count
?
(total / count).toFixed(1)
:
0
}
</p>


</div>

`;



}
