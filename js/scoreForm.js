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

let formId =
  new URLSearchParams(
    location.search
  ).get("id");

let existingSubmission = null;


/* =========================
   認証
========================= */

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "index.html";

      return;

    }


    try{

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


      currentUser =
        user;


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


    }catch(error){

      console.error(error);

      document.getElementById(
        "scorePage"
      ).innerHTML = `

        <div class="card error">

          成績フォームを読み込めませんでした。

        </div>

      `;

    }

  }
);


/* =========================
   escape
========================= */

const esc =
  value =>

    String(
      value ?? ""
    ).replace(
      /[&<>\"]/g,
      c => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;"
      }[c])
    );


/* =========================
   フォーム取得
========================= */

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
    formData.targetType
    &&
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


/* =========================
   対象判定
========================= */

function canView(data){

  if(
    !data.targetType
    ||
    data.targetType === "all"
  ){

    return true;

  }


  if(
    data.targetType === "block"
  ){

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
      userData.block

      &&

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


/* =========================
   既存提出確認
========================= */

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

    existingSubmission =
      null;

    renderInputForm();

    return;

  }


  const docs = [];


  snap.forEach(item => {

    docs.push({

      id:item.id,

      ...item.data()

    });

  });


  docs.sort(
    (a,b) =>
      timestampMs(
        b.createdAt
      )
      -
      timestampMs(
        a.createdAt
      )
  );


  existingSubmission =
    docs[0];


  /*
   * 管理者が再回答を許可した場合だけ
   * 入力画面を再表示
   */

  if(
    existingSubmission
      .resubmitAllowed === true
  ){

    renderInputForm(true);

    return;

  }


  /*
   * それ以外は提出済み画面
   */

  renderSubmitted(
    existingSubmission
  );

}


/* =========================
   timestamp
========================= */

function timestampMs(ts){

  if(
    ts?.toDate
  ){

    return ts
      .toDate()
      .getTime();

  }


  return 0;

}


/* =========================
   入力画面
========================= */

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

        <br>

        回答内容を修正して再提出できます。

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

      `
    )
    .join("");


  document.getElementById(
    "submitArea"
  ).style.display =
    "block";

}


/* =========================
   提出済み表示
========================= */

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

      <br><br>

      回答内容を確認できます。

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

      <h3>
        回答内容の確認
      </h3>


      ${
        Object.entries(
          data.subjects || {}
        )
        .map(
          ([subject,score]) => `

            <div class="score-confirm-row">

              <span>
                ${esc(subject)}
              </span>

              <strong>
                ${esc(score)}点
              </strong>

            </div>

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


/* =========================
   提出
========================= */

window.submitScore =
async function(){

  if(!formData){

    return;

  }


  /*
   * 既存提出があり、
   * 再回答許可がない場合は絶対に拒否
   */

  if(
    existingSubmission
    &&
    existingSubmission
      .resubmitAllowed !== true
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
      ".scoreInput"
    )
    .forEach(input => {

      const raw =
        input.value.trim();


      if(raw !== ""){

        const value =
          Number(raw);


        if(

          Number.isFinite(value)

          &&

          value >= 0

          &&

          value <= 100

        ){

          subjects[
            input.dataset.subject
          ] = value;


          total += value;

          count++;

        }

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

    /*
     * 再回答の場合
     *
     * 元の提出を再回答不可に戻す
     */

    if(
      existingSubmission
      &&
      existingSubmission
        .resubmitAllowed === true
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


    /*
     * 新しい提出を保存
     */

    const newDoc =
      await addDoc(
        collection(
          db,
          "scores"
        ),
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

      id:newDoc.id,

      formId,

      uid:currentUser.uid,

      name:
        userData.name || "",

      testName:
        formData.title || "",

      subjects,

      total,

      average,

      resubmitAllowed:false

    };


    /*
     * ここで必ず
     * 「提出しました。」
     */

    renderSubmitted(
      existingSubmission
    );


  }catch(error){

    console.error(
      "成績提出エラー:",
      error
    );


    alert(
      "提出できませんでした。\n" +
      error.message
    );

  }

};
