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



loadBlocksFromUsers();

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
// 送信範囲変更
// =====================

window.changeTarget = function(){


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
targetType==="block" ||
targetType==="block_grade"
){


notice.block =
document.getElementById(
"block"
).value;


}





if(
targetType==="block_grade"
){


notice.grade =
document.getElementById(
"grade"
).value;


}





if(
targetType==="individual"
){


notice.uid =
document.getElementById(
"targetUid"
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

${data.name}<br>

${data.testName}<br>

${data.subject}：
${data.score}点

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



snap.forEach(item=>{


const data =
item.data();



area.innerHTML += `

<div class="card">

${data.name || ""}

<br>

${data.block || ""}

<br>

${data.grade || ""}

</div>

`;



});


}
