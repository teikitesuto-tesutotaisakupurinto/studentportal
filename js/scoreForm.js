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
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";

let currentUser = null;
let userData = null;
let formData = null;
let existingSubmission = null;

const formId =
  new URLSearchParams(
    location.search
  ).get("id");

const esc =
  value =>
    String(value ?? "").replace(
      /[&<>\"]/g,
      c => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;"
      }[c])
    );

onAuthStateChanged(
  auth,
  async user=>{

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
        "dashboard/admin.html";

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

async function loadForm(){

  if(!formId){
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
    formData.title ||
    "テスト成績入力";

  if(
    formData.targetType &&
    !canView(formData)
  ){

    document.getElementById(
      "scorePage"
    ).innerHTML = `
      <div class="card">
        この成績フォームの対象ではありません。
      </div>
    `;

    return;
  }

  await loadExistingSubmission();

}

function canView(data){

  if(
    !data.targetType ||
    data.targetType === "all"
  ){

    return true;
  }

  if(data.targetType === "block"){

    return (
      data.block ===
      userData.block
    );

  }

  if(
    data.targetType ===
    "block_grade"
  ){

    return (
      data.block ===
      userData.block &&
      data.grade ===
      userData.grade
    );

  }

  if(
    data.targetType ===
    "individual"
  ){

    return (
      data.uid ===
      currentUser.uid
    );

  }

  return false;
}

async function loadExistingSubmission(){

  const snap =
    await getDocs(
      query(
        collection(db,"scores"),
        where(
          "formId",
          "==",
          formId
        ),
        where(
          "uid",
          "==",
          currentUser.uid
        )
      )
    );

  if(snap.empty){

    renderInputForm();

    return;
  }

  const docs = [];

  snap.forEach(item=>{

    docs.push({
      id:item.id,
      ...item.data()
    });

  });

  docs.sort(
    (a,b)=>
      timestampMs(
        b.createdAt
      ) -
      timestampMs(
        a.createdAt
      )
  );

  existingSubmission =
    docs[0];

  if(
    existingSubmission.resubmitAllowed ===
    true
  ){

    renderInputForm(true);

    return;
  }

  renderSubmitted(
    existingSubmission
  );

}

function timestampMs(ts){

  return ts?.toDate
    ? ts.toDate().getTime()
    : 0;

}

function renderInputForm(
  isResubmit=false
){

  const area =
    document.getElementById(
      "subjectArea"
    );

  const status =
    document.getElementById(
      "submissionStatus"
    );

  if(isResubmit){

    status.innerHTML = `

      <div class="status-box warning">

        管理者から再回答が許可されています。
        内容を修正して再提出できます。

      </div>

    `;

  }else{

    status.innerHTML = "";

  }

  area.innerHTML =
    (formData.subjects || [])
      .map(subject=>`

        <div class="card">

          <label>
            ${esc(subject)}

            <input
              type="number"
              min="0"
              max="100"
              class="scoreInput"
              data-subject="${esc(subject)}"
              placeholder="点数"
            >

          </label>

        </div>

      `)
      .join("");

  document.getElementById(
    "submitArea"
  ).style.display =
    "block";

}

function renderSubmitted(data){

  document.getElementById(
    "submissionStatus"
  ).innerHTML = `

    <div class="status-box success">

      <strong>
        提出しました。
      </strong>

      <br>

      管理者が再回答を許可しない限り、
      もう一度解答することはできません。

    </div>

  `;

  const area =
    document.getElementById(
      "subjectArea"
    );

  const subjects =
    data.subjects || {};

  area.innerHTML = `

    <div class="card">

      <h3>
        回答内容の確認
      </h3>

      ${
        Object.entries(subjects)
          .map(
            ([subject,score]) => `
              <p>
                ${esc(subject)}：
                <strong>
                  ${esc(score)}点
                </strong>
              </p>
            `
          )
          .join("")
      }

      <hr>

      <p>
        合計：
        <strong>
          ${esc(data.total)}点
        </strong>
      </p>

      <p>
        平均：
        <strong>
          ${esc(data.average)}点
        </strong>
      </p>

    </div>

  `;

  document.getElementById(
    "submitArea"
  ).style.display =
    "none";

}

window.submitScore =
async function(){

  if(!formData){
    return;
  }

  const subjects = {};
  let total = 0;
  let count = 0;

  document
    .querySelectorAll(
      ".scoreInput"
    )
    .forEach(input=>{

      const raw =
        input.value.trim();

      if(raw === ""){
        return;
      }

      const value =
        Number(raw);

      if(
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      ){

        subjects[
          input.dataset.subject
        ] = value;

        total += value;

        count++;

      }

    });

  if(count === 0){

    alert(
      "点数を入力してください"
    );

    return;
  }

  if(
    count !==
    (formData.subjects || []).length
  ){

    alert(
      "すべての教科の点数を入力してください"
    );

    return;
  }

  try{

    if(
      existingSubmission &&
      existingSubmission.resubmitAllowed === true
    ){

      await updateDoc(
        doc(
          db,
          "scores",
          existingSubmission.id
        ),
        {
          resubmitAllowed:false,
          resubmittedAt:
            serverTimestamp()
        }
      );

    }

    const average =
      Number(
        (
          total / count
        ).toFixed(1)
      );

    await addDoc(
      collection(db,"scores"),
      {

        formId,

        uid:
          currentUser.uid,

        name:
          userData.name || "",

        testName:
          formData.title || "",

        subjects,

        total,

        average,

        resubmitAllowed:false,

        createdAt:
          serverTimestamp()

      }
    );

    existingSubmission = {
      subjects,
      total,
      average,
      resubmitAllowed:false
    };

    renderSubmitted(
      existingSubmission
    );

    alert(
      "提出しました。"
    );

  }catch(error){

    console.error(error);

    alert(
      "提出できませんでした\n" +
      error.message
    );

  }

};
