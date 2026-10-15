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
  getDocs,
  query
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let currentUser = null;
let userData = null;
let formData = null;
let existingScore = null;


const params =
  new URLSearchParams(
    location.search
  );

const formId =
  params.get("id");


// =====================
// 認証
// =====================

onAuthStateChanged(
  auth,
  async(user) => {

    if(!user){

      location.href =
        "index.html";

      return;

    }


    const role =
      await getUserRole(user);


    if(role !== "student"){

      alert(
        "アクセス権限がありません"
      );

      location.href =
        "admin.html";

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


    if(!userSnap.exists()){

      alert(
        "ユーザー情報がありません"
      );

      return;

    }


    userData =
      userSnap.data();


    await loadForm();

  }
);


// =====================
// フォーム取得
// =====================

async function loadForm(){

  const title =
    document.getElementById(
      "formTitle"
    );

  if(!formId){

    title.textContent =
      "フォームが指定されていません";

    return;

  }


  const snap =
    await getDoc(
      doc(
        db,
        "scoreForms",
        formId
      )
    );


  if(!snap.exists()){

    title.textContent =
      "フォームがありません";

    return;

  }


  formData =
    snap.data();


  title.textContent =
    formData.title || "";


  existingScore =
    await findExistingScore();


  renderForm();

}


// =====================
// 既存提出取得
// =====================

async function findExistingScore(){

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "scores"
        )
      )
    );


  let result = null;


  snap.forEach(item => {

    const data =
      item.data();


    if(
      data.formId === formId &&
      data.uid === currentUser.uid
    ){

      if(!result){

        result = {
          id:item.id,
          ...data
        };

      }

    }

  });


  return result;

}


// =====================
// 表示
// =====================

function renderForm(){

  const area =
    document.getElementById(
      "subjectArea"
    );

  const status =
    document.getElementById(
      "submissionStatus"
    );

  const button =
    document.getElementById(
      "submitButton"
    );


  area.innerHTML = "";


  // 提出済み

  if(existingScore){

    status.innerHTML = `

      <div class="submission-complete">

        <h3>
          提出しました。
        </h3>

        <p>
          このテスト成績はすでに提出されています。
        </p>

        ${
          existingScore.resubmitAllowed === true
            ? `
              <p class="success-text">
                管理者から再提出が許可されています。
              </p>
            `
            : `
              <p>
                管理者が再提出を許可しない限り、
                もう一度解答することはできません。
              </p>
            `
        }

      </div>

    `;


    formData.subjects.forEach(
      subject => {

        const score =
          existingScore.subjects?.[subject];


        area.innerHTML += `

          <div class="card">

            <label>
              ${escapeHtml(subject)}
            </label>

            <input
              type="number"
              value="${
                score !== undefined
                  ? score
                  : ""
              }"
              disabled>

          </div>

        `;

      }
    );


    if(
      existingScore.resubmitAllowed === true
    ){

      button.disabled = false;

      button.textContent =
        "再提出";

      button.onclick =
        window.submitScore;

    }else{

      button.disabled = true;

      button.textContent =
        "提出済み";

    }


    return;

  }


  // 未提出

  status.innerHTML = `

    <div class="submission-info">

      <p>
        まだ提出していません。
      </p>

      <p>
        提出後は、管理者の許可がない限り
        再度解答できません。
      </p>

    </div>

  `;


  formData.subjects.forEach(
    subject => {

      area.innerHTML += `

        <div class="card">

          <label>
            ${escapeHtml(subject)}
          </label>

          <input
            type="number"
            class="scoreInput"
            data-subject="${escapeAttribute(subject)}"
            min="0"
            placeholder="点数">

        </div>

      `;

    }
  );


  button.disabled = false;

}


// =====================
// 提出
// =====================

window.submitScore = async function(){

  const inputs =
    document.querySelectorAll(
      ".scoreInput"
    );


  const subjects = {};

  let total = 0;
  let count = 0;


  inputs.forEach(input => {

    const value =
      Number(input.value);


    if(
      input.value !== "" &&
      !Number.isNaN(value)
    ){

      subjects[
        input.dataset.subject
      ] = value;

      total += value;

      count++;

    }

  });


  if(
    count !==
    (formData.subjects || []).length
  ){

    alert(
      "すべての教科の点数を入力してください。"
    );

    return;

  }


  // 再提出の場合は、管理者許可を確認

  if(existingScore){

    if(
      existingScore.resubmitAllowed !== true
    ){

      alert(
        "このテストはすでに提出されています。管理者の許可がない限り再提出できません。"
      );

      return;

    }

  }


  const average =
    Number(
      (
        total /
        count
      ).toFixed(1)
    );


  try{

    if(existingScore){

      // 再提出時は古いデータを削除せず、
      // 新しい提出として追加する
      await addDoc(
        collection(db,"scores"),
        {

          formId:
            formId,

          uid:
            currentUser.uid,

          name:
            userData.name || "",

          testName:
            formData.title || "",

          subjects:
            subjects,

          total:
            total,

          average:
            average,

          resubmitAllowed:
            false,

          resubmittedFrom:
            existingScore.id,

          createdAt:
            new Date()

        }
      );

    }else{

      await addDoc(
        collection(db,"scores"),
        {

          formId:
            formId,

          uid:
            currentUser.uid,

          name:
            userData.name || "",

          testName:
            formData.title || "",

          subjects:
            subjects,

          total:
            total,

          average:
            average,

          resubmitAllowed:
            false,

          createdAt:
            new Date()

        }
      );

    }


    alert(
      "提出しました。"
    );


    location.href =
      "student.html";

  }catch(error){

    console.error(error);

    alert(
      "提出できませんでした。\n" +
      error.message
    );

  }

};


// =====================
// HTMLエスケープ
// =====================

function escapeHtml(value){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function escapeAttribute(value){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");

}
