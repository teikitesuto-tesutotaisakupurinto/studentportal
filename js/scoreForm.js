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



let formData = null;

let currentUser = null;

let userData = null;







// URL取得

const params =
new URLSearchParams(
location.search
);


const formId =
params.get("id");








// 認証

onAuthStateChanged(
auth,
async(user)=>{


if(!user){

location.href="index.html";

return;

}



currentUser=user;



const userSnap =
await getDoc(
doc(db,"users",user.uid)
);



userData =
userSnap.data();



loadForm();


});








// フォーム取得

async function loadForm(){


const snap =
await getDoc(
doc(
db,
"scoreForms",
formId
)
);



if(!snap.exists()){


document.getElementById(
"formTitle"
).textContent =
"フォームがありません";


return;


}



formData =
snap.data();





document.getElementById(
"formTitle"
).textContent =
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

type="number"

class="scoreInput"

data-subject="${subject}"

placeholder="点数">


</div>

`;



});


}









// 提出

window.submitScore = async function(){


const subjects = {};

let total = 0;

let count = 0;




document
.querySelectorAll(".scoreInput")
.forEach(input=>{


const score =
Number(
input.value
);



subjects[
input.dataset.subject
]
=
score;



total += score;

count++;


});






const average =
total / count;





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


subjects,


total,


average,


createdAt:

serverTimestamp()


}

);






alert(
"提出しました"
);



location.href =
"student.html";


};
