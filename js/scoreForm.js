import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let currentUser=null;
let userData=null;
let formData=null;
let existingSubmission=null;


const params=new URLSearchParams(location.search);
const formId=params.get("id");


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


onAuthStateChanged(
  auth,
  async(user)=>{

    if(!user){

      location.href="index.html";
      return;

    }

    const role=await getUserRole(user);

    if(role!=="student"){

      alert("アクセス権限がありません");
      location.href="admin.html";
      return;

    }

    currentUser=user;

    const userSnap=await getDoc(
      doc(db,"users",user.uid)
    );

    if(!userSnap.exists()){

      alert("ユーザー情報がありません");
      return;

    }

    userData=userSnap.data();

    await loadForm();

  }
);


async function loadForm(){

  if(!formId){

    document.getElementById("formTitle").textContent=
      "フォームが指定されていません";

    return;

  }

  const snap=await getDoc(
    doc(db,"scoreForms",formId)
  );

  if(!snap.exists()){

    document.getElementById("formTitle").textContent=
      "フォームがありません";

    return;

  }

  formData=snap.data();

  document.getElementById("formTitle").textContent=
    formData.title || "成績入力";


  const existingSnap=await getDocs(
    query(
      collection(db,"scores"),
      where("formId","==",formId),
      where("uid","==",currentUser.uid)
    )
  );


  if(!existingSnap.empty){

    existingSubmission={
      id:existingSnap.docs[0].id,
      ...existingSnap.docs[0].data()
    };

  }


  renderForm();

}


function renderForm(){

  const area=document.getElementById("subjectArea");
  const status=document.getElementById("submissionStatus");
  const submitArea=document.getElementById("submitArea");
  const answerView=document.getElementById("answerView");

  area.innerHTML="";
  answerView.innerHTML="";


  if(existingSubmission){

    status.innerHTML=`

      <div class="submission-complete">

        <strong>提出しました。</strong>

        <p>
          この成績はすでに提出されています。
        </p>

        ${
          existingSubmission.allowResubmit===true
            ? `
              <p class="resubmit-message">
                管理者から再回答が許可されています。
              </p>
            `
            : `
              <p>
                管理者が再回答を許可するまで、
                もう一度解答することはできません。
              </p>
            `
        }

      </div>

    `;


    renderAnswer(existingSubmission);

    if(existingSubmission.allowResubmit===true){

      renderInputs();

      submitArea.style.display="block";

    }else{

      submitArea.style.display="none";

    }

    return;

  }


  status.innerHTML="";

  renderInputs();

  submitArea.style.display="block";

}


function renderInputs(){

  const area=document.getElementById("subjectArea");

  area.innerHTML="";

  const subjects=formData.subjects || [];

  subjects.forEach(subject=>{

    area.innerHTML+=`

      <div class="card">

        <label>
          ${escapeHtml(subject)}
        </label>

        <input
          type="number"
          min="0"
          class="scoreInput"
          data-subject="${escapeHtml(subject)}"
          placeholder="点数"
        >

      </div>

    `;

  });

}


function renderAnswer(data){

  const area=document.getElementById("answerView");

  const subjects=data.subjects || {};

  let html=`

    <div class="card">

      <h2>提出内容の確認</h2>

      <table class="score-table">

        <thead>
          <tr>
            <th>教科</th>
            <th>点数</th>
          </tr>
        </thead>

        <tbody>

  `;

  Object.entries(subjects).forEach(
    ([subject,score])=>{

      html+=`

        <tr>

          <td>
            ${escapeHtml(subject)}
          </td>

          <td>
            ${escapeHtml(score)}
          </td>

        </tr>

      `;

    }
  );

  html+=`

        </tbody>

      </table>

      <p>
        合計：
        <strong>${escapeHtml(data.total)}</strong>点
      </p>

      <p>
        平均：
        <strong>${escapeHtml(data.average)}</strong>点
      </p>

      <p>
        提出日時：
        ${
          data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleString("ja-JP")
            : "記録済み"
        }
      </p>

    </div>

  `;

  area.innerHTML=html;

}


window.submitScore=async function(){

  if(
    existingSubmission &&
    existingSubmission.allowResubmit!==true
  ){

    alert(
      "この成績はすでに提出されています。管理者が再回答を許可するまで、もう一度解答することはできません。"
    );

    return;

  }


  const subjects={};

  let total=0;
  let count=0;


  document
    .querySelectorAll(".scoreInput")
    .forEach(input=>{

      const raw=input.value.trim();

      if(raw==="") return;

      const value=Number(raw);

      if(!Number.isFinite(value)) return;

      subjects[input.dataset.subject]=value;

      total+=value;
      count++;

    });


  if(count===0){

    alert("点数を入力してください");
    return;

  }


  const average=Number(
    (total/count).toFixed(1)
  );


  try{

    if(existingSubmission){

      // 再回答の場合も新しい提出記録を作る。
      // allowResubmit を利用して管理者の許可を一度消費する。

      await addDoc(
        collection(db,"scores"),
        {

          formId,
          uid:currentUser.uid,
          name:userData.name || "",
          testName:formData.title || "",
          subjects,
          total,
          average,
          allowResubmit:false,
          resubmission:true,
          previousSubmissionId:existingSubmission.id,
          createdAt:serverTimestamp()

        }
      );

    }else{

      await addDoc(
        collection(db,"scores"),
        {

          formId,
          uid:currentUser.uid,
          name:userData.name || "",
          testName:formData.title || "",
          subjects,
          total,
          average,
          allowResubmit:false,
          resubmission:false,
          createdAt:serverTimestamp()

        }
      );

    }


    alert("成績を提出しました。");

    location.reload();

  }catch(error){

    console.error(error);

    alert(
      "成績を提出できませんでした。\n"+
      error.message
    );

  }

};
