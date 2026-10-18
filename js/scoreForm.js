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
  getUserData
} from "./auth.js";

const formId =
  new URLSearchParams(
    location.search
  ).get("id");

let currentUser = null;
let userData = null;
let formData = null;
let existingSubmission = null;

function esc(value){

  return String(value ?? "")
    .replace(/[&<>"']/g,char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[char]));

}

function canView(data){

  if(
    !data.targetType ||
    data.targetType === "all"
  ){
    return true;
  }

  if(
    data.targetType === "block"
  ){
    return data.block === userData.block;
  }

  if(
    data.targetType === "grade"
  ){
    return data.grade === userData.grade;
  }

  if(
    data.targetType === "block_grade"
  ){
    return (
      data.block === userData.block &&
      data.grade === userData.grade
    );
  }

  if(
    data.targetType === "individual"
  ){
    return data.uid === currentUser.uid;
  }

  return false;

}

function timestampMs(value){

  return value?.toDate
    ? value.toDate().getTime()
    : 0;

}

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
    "テスト成績";

  if(!canView(formData)){

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

async function loadExistingSubmission(){

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "scores"
        ),
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

  const submissions = [];

  snap.forEach(item => {

    submissions.push({
      id:item.id,
      ...item.data()
    });

  });

  submissions.sort(
    (a,b) =>
      timestampMs(b.createdAt) -
      timestampMs(a.createdAt)
  );

  existingSubmission =
    submissions[0];

  if(
    existingSubmission.resubmitAllowed === true
  ){

    renderInputForm(true);

    return;

  }

  renderSubmitted(
    existingSubmission
  );

}

function renderInputForm(
  isResubmit = false
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
      .map(
        subject => `

          <div class="card">

            <div class="form-group">

              <label>
                ${esc(subject)}
              </label>

              <input
                type="number"
                min="0"
                max="100"
                class="score-input"
                data-subject="${esc(subject)}"
                placeholder="点数">

            </div>

          </div>

        `
      )
      .join("");

  document.getElementById(
    "submitArea"
  ).style.display = "block";

}

function renderSubmitted(
  data
){

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

  area.innerHTML = `

    <div class="card">

      <h2>
        回答内容の確認
      </h2>

      ${
        Object.entries(
          data.subjects || {}
        ).map(
          ([subject,score]) => `

            <p>

              ${esc(subject)}：
              <strong>
                ${esc(score)}点
              </strong>

            </p>

          `
        ).join("")
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
  ).style.display = "none";

}

async function submitScore(){

  if(!formData){
    return;
  }

  if(
    existingSubmission &&
    existingSubmission.resubmitAllowed !== true
  ){

    renderSubmitted(
      existingSubmission
    );

    return;

  }

  const subjects = {};
  let total = 0;
  let count = 0;

  document
    .querySelectorAll(
      ".score-input"
    )
    .forEach(input => {

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
      "点数を入力してください。"
    );

    return;

  }

  if(
    count !==
    (formData.subjects || []).length
  ){

    alert(
      "すべての教科の点数を入力してください。"
    );

    return;

  }

  try{

    if(
      existingSubmission?.resubmitAllowed === true
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

    const result = {

      formId,

      uid:
        currentUser.uid,

      name:
        userData.name || "",

      testName:
        formData.title || "",

      subjects,

      total,

      average:
        Number(
          (
            total / count
          ).toFixed(1)
        ),

      resubmitAllowed:false,

      createdAt:
        serverTimestamp()

    };

    const ref =
      await addDoc(
        collection(
          db,
          "scores"
        ),
        result
      );

    existingSubmission = {
      id:ref.id,
      ...result,
      resubmitAllowed:false
    };

    renderSubmitted(
      existingSubmission
    );

  }catch(error){

    console.error(error);

    alert(
      "提出できませんでした。"
    );

  }

}

document
  .getElementById(
    "submitScoreButton"
  )
  ?.addEventListener(
    "click",
    submitScore
  );

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "/studentportal/index.html";

      return;

    }

    currentUser = user;

    userData =
      await getUserData(user);

    if(
      !userData ||
      userData.role !== "student"
    ){

      alert(
        "アクセス権限がありません。"
      );

      return;

    }

    await loadForm();

  }
);
