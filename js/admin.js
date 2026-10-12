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




// =====================
// ページ切替
// =====================

window.showAdminPage = function(page){


  const sections =
  document.querySelectorAll(
    ".content > section"
  );


  sections.forEach(section=>{

    section.style.display = "none";

  });



  const target =
  document.getElementById(page);



  if(target){

    target.style.display = "block";

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


// 初期読み込み

loadBlocksFromUsers();

loadStudentsForNotice();

loadMessages();

loadScores();

loadUsers();


});








// =====================
// usersからブロック取得
// =====================

async function loadBlocksFromUsers(){


const select =
document.getElementById(
"block"
);



if(!select){

console.log(
"block selectなし"
);

return;

}



try{


const snap =
await getDocs(
collection(db,"users")
);



console.log(
"users件数:",
snap.size
);



const blocks =
new Set();



snap.forEach(item=>{


const data =
item.data();



console.log(
"user:",
data
);



if(data.block){


blocks.add(
data.block
);


}



});



select.innerHTML = "";



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



if(blocks.size === 0){


const option =
document.createElement(
"option"
);


option.textContent =
"ブロック未登録";


select.appendChild(
option
);


}



}catch(error){


console.error(
"ブロック取得エラー:",
error
);



select.innerHTML =
"<option>取得エラー</option>";



}
// =====================
// 個別送信用 生徒取得
// =====================

async function loadStudentsForNotice(){


const select =
document.getElementById(
"targetUser"
);



if(!select){

console.log(
"targetUserなし"
);

return;

}



try{


const snap =
await getDocs(
collection(db,"users")
);



select.innerHTML = "";



snap.forEach(item=>{


const data =
item.data();



if(data.role === "student"){



const option =
document.createElement(
"option"
);



option.value =
item.id;



option.textContent =
data.name || "名前未設定";



select.appendChild(
option
);



}



});



if(select.options.length === 0){


const option =
document.createElement(
"option"
);


option.textContent =
"生徒なし";


select.appendChild(
option
);


}



}catch(error){


console.error(
"生徒取得エラー:",
error
);



}


}









// =====================
// 送信範囲変更
// =====================

window.changeTarget = function(){


const type =
document.getElementById(
"targetType"
).value;



document.getElementById(
"blockArea"
).style.display = "none";


document.getElementById(
"gradeArea"
).style.display = "none";


document.getElementById(
"userArea"
).style.display = "none";





if(type === "block"){


document.getElementById(
"blockArea"
).style.display = "block";


}



if(type === "block_grade"){


document.getElementById(
"blockArea"
).style.display = "block";


document.getElementById(
"gradeArea"
).style.display = "block";


}



if(type === "individual"){


document.getElementById(
"userArea"
).style.display = "block";


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
targetType === "block" ||
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
"targetUser"
).value;


}





await addDoc(
collection(db,"notices"),
notice
);



alert(
"お知らせを公開しました"
);



};









// =====================
// PDFアップロード
// =====================

window.addDocument = async function(){



const file =
document.getElementById(
"documentFile"
).files[0];



const title =
document.getElementById(
"documentTitle"
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
"documents/" + file.name
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


title:title,


fileUrl:url,


fileName:file.name,


createdAt:
serverTimestamp()


}

);



alert(
"アップロードしました"
);



};
  // =====================
// カレンダー登録
// =====================

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
"登録しました"
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



if(!area){

return;

}



try{


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



area.innerHTML = "";



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
${data.body || ""}
</p>


<p>
状態：
${data.status || "unread"}
</p>


</div>

`;



});



}catch(error){


console.error(
"連絡取得エラー:",
error
);



}



}









// =====================
// 成績確認
// =====================

async function loadScores(){


const area =
document.getElementById(
"scoreList"
);



if(!area){

return;

}



try{


const snap =
await getDocs(
collection(db,"scores")
);



area.innerHTML = "";



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">


<p>
${data.name || ""}
</p>


<p>
${data.testName || ""}
</p>


<p>
${data.subject || ""}：
${data.score || ""}点
</p>


</div>

`;



});



}catch(error){


console.error(
"成績取得エラー:",
error
);



}



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



try{


const snap =
await getDocs(
collection(db,"users")
);



area.innerHTML = "";



snap.forEach(item=>{


const data =
item.data();



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


<p>
権限：
${data.role || ""}
</p>


</div>

`;



});



}catch(error){


console.error(
"生徒取得エラー:",
error
);



}



}


}
