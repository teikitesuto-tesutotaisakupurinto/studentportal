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
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
  getUserRole
} from "./auth.js";



let currentUser = null;

let userData = null;

let formData = null;





// URL取得

const params =
new URLSearchParams(
location.search
);


const formId =
params.get("id");









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



currentUser = user;



const userSnap =
await getDoc(
doc(
db,
"users",
user.uid
)
);



userData =
userSnap.data();



loadForm();


});









// =====================
// フォーム取得
// =====================

async function loadForm(){


const snap =
await getDoc(
doc(
db,
"scoreForms",
formId
)
);



const title =
document.getElementById(
"formTitle"
);



if(!snap.exists()){


title.textContent =
"フォームがありません";


return;


}



formData =
snap.data();



title.textContent =
formData.title;





const area =
document.getElementById(
"subjectArea"
);



area.innerHTML="";





formData.subjects.forEach(subject=>{


area.innerHTML += `

<div class="card">


<label>

${subject}

</label>


<input

class="scoreInput"

type="number"

data-subject="${subject}"

placeholder="点数">


</div>

`;



});


}









// =====================
// 提出
// =====================

window.submitScore = async function(){


const subjects = {};

let total = 0;

let count = 0;





document
.querySelectorAll(
".scoreInput"
)
.forEach(input=>{


const score =
Number(
input.value
);



if(
!isNaN(score)
){

subjects[
input.dataset.subject
]
=
score;



total += score;


count++;


}



});







if(count === 0){


alert(
"点数を入力してください"
);


return;


}





const average =
Number(
(
total / count
)
.toFixed(1)
);







await addDoc(
collection(db,"scores"),
{


formId:
formId,


uid:
currentUser.uid,


name:
userData.name,


testName:
formData.title,


subjects:subjects,


total:total,


average:average,


createdAt:
serverTimestamp()


}

);








// 入力クリア

document
.querySelectorAll(
".scoreInput"
)
.forEach(input=>{


input.value="";


});





alert(
"成績を提出しました"
);



};
