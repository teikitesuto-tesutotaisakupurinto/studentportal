import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let currentUser = null;
let userData = null;


// =====================
// ページ切替
// =====================

window.showPage = function(page){

  document
    .querySelectorAll(".content > section")
    .forEach(section => {
      section.style.display = "none";
    });

  const target = document.getElementById(page);

  if(target){
    target.style.display = "block";
  }

};


// =====================
// 認証
// =====================

onAuthStateChanged(
  auth,
  async(user) => {

    if(!user){
      location.href = "index.html";
      return;
    }

    const role = await getUserRole(user);

    if(role !== "student"){

      alert("アクセス権限がありません");

      location.href = "admin.html";

      return;
    }

    currentUser = user;

    const snap = await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );

    if(!snap.exists()){

      alert("ユーザー情報がありません");

      return;
    }

    userData = snap.data();

    loadUserInfo();
    loadNotices();
    loadDocuments();
    loadScoreForms();

  }
);


// =====================
// ユーザー情報
// =====================

function loadUserInfo(){

  const area =
    document.getElementById("userInfo");

  if(!area){
    return;
  }

  area.innerHTML = `

    <p>
      名前：
      ${escapeHtml(userData.name || "")}
    </p>

    <p>
      メール：
      ${escapeHtml(currentUser.email || "")}
    </p>

    <p>
      ブロック：
      ${escapeHtml(userData.block || "")}
    </p>

    <p>
      学年：
      ${escapeHtml(userData.grade || "")}
    </p>

  `;

}


// =====================
// お知らせ
// =====================

async function loadNotices(){

  const area =
    document.getElementById("noticeList");

  const homeArea =
    document.getElementById("homeNoticeList");

  if(!area){
    return;
  }

  try{

    const snap = await getDocs(
      query(
        collection(db, "notices"),
        orderBy("createdAt", "desc")
      )
    );

    area.innerHTML = "";

    if(homeArea){
      homeArea.innerHTML = "";
    }

    let visibleNotices = [];

    snap.forEach(item => {

      const data = item.data();

      if(!canViewNotice(data)){
        return;
      }

      visibleNotices.push({
        id: item.id,
        ...data
      });

    });


    // 全お知らせ

    if(visibleNotices.length === 0){

      area.innerHTML = `
        <div class="empty-message">
          現在表示できるお知らせはありません。
        </div>
      `;

    }else{

      visibleNotices.forEach(data => {

        area.innerHTML += createNoticeCard(
          data
        );

      });

    }


    // ホーム

    if(homeArea){

      if(visibleNotices.length === 0){

        homeArea.innerHTML = `
          <div class="empty-message">
            現在表示できるお知らせはありません。
          </div>
        `;

      }else{

        visibleNotices
          .slice(0, 5)
          .forEach(data => {

            homeArea.innerHTML +=
              createNoticeCard(data);

          });

      }

    }

  }catch(error){

    console.error(
      "お知らせ取得エラー:",
      error
    );

    area.innerHTML = `
      <div class="error-message">
        お知らせを読み込めませんでした。
      </div>
    `;

  }

}


// =====================
// お知らせカード
// =====================

function createNoticeCard(data){

  const tag =
    data.importance === "important"
      ? `<span class="important">重要</span>`
      : "";

  return `

    <div class="notice-card">

      ${tag}

      <a
        href="notice.html?id=${encodeURIComponent(data.id)}">

        <h3>
          ${escapeHtml(data.title || "")}
        </h3>

      </a>

      <p>
        ${escapeHtml(
          (data.body || "").substring(0, 100)
        )}
      </p>

      <small>
        ${formatDate(data.startDate)}
        ${
          data.endDate
            ? " ～ " + formatDate(data.endDate)
            : ""
        }
      </small>

    </div>

  `;

}


// =====================
// お知らせ配信範囲
// =====================

function canViewNotice(data){

  if(!isWithinPeriod(
    data.startDate,
    data.endDate
  )){
    return false;
  }

  return canViewByTarget(
    data,
    userData,
    currentUser.uid
  );

}


// =====================
// 配布文書
// =====================

async function loadDocuments(){

  const area =
    document.getElementById("documentList");

  if(!area){
    return;
  }

  try{

    const snap = await getDocs(
      query(
        collection(db, "documents"),
        orderBy("createdAt", "desc")
      )
    );

    area.innerHTML = "";

    let count = 0;

    snap.forEach(item => {

      const data = item.data();

      if(!isWithinPeriod(
        data.startDate,
        data.endDate
      )){
        return;
      }

      if(!canViewByTarget(
        data,
        userData,
        currentUser.uid
      )){
        return;
      }

      count++;

      area.innerHTML += `

        <div class="card">

          <h3>

            <a
              href="document.html?id=${encodeURIComponent(item.id)}">

              ${escapeHtml(data.title || "")}

            </a>

          </h3>

          <p>
            ${escapeHtml(data.body || "")}
          </p>

          <p class="muted">

            公開期間：
            ${formatDate(data.startDate)}

            ${
              data.endDate
                ? " ～ " + formatDate(data.endDate)
                : ""
            }

          </p>

        </div>

      `;

    });


    if(count === 0){

      area.innerHTML = `
        <div class="empty-message">
          現在表示できる配布文書はありません。
        </div>
      `;

    }

  }catch(error){

    console.error(
      "配布文書取得エラー:",
      error
    );

    area.innerHTML = `
      <div class="error-message">
        配布文書を読み込めませんでした。
      </div>
    `;

  }

}


// =====================
// 成績フォーム
// =====================

async function loadScoreForms(){

  const area =
    document.getElementById("scoreFormList");

  if(!area){
    return;
  }

  try{

    const snap =
      await getDocs(
        collection(db, "scoreForms")
      );

    area.innerHTML = "";

    let count = 0;

    for(const item of snap.docs){

      const data = item.data();

      if(data.published === false){
        continue;
      }

      if(!isWithinPeriod(
        data.startDate,
        data.endDate
      )){
        continue;
      }

      if(!canViewByTarget(
        data,
        userData,
        currentUser.uid
      )){
        continue;
      }

      count++;

      const scoreState =
        await getSubmissionState(
          item.id,
          currentUser.uid
        );

      let actionHtml = "";

      if(scoreState.submitted){

        actionHtml = `

          <div class="submission-complete">

            <strong>
              提出しました。
            </strong>

            <p>
              ${
                scoreState.resubmitAllowed
                  ? "管理者から再提出が許可されています。"
                  : "管理者の許可がない限り、再度の解答はできません。"
              }
            </p>

            <a
              href="scoreForm.html?id=${encodeURIComponent(item.id)}">

              <button class="secondary-button">

                ${
                  scoreState.resubmitAllowed
                    ? "再提出・内容確認"
                    : "提出内容を確認"
                }

              </button>

            </a>

          </div>

        `;

      }else{

        actionHtml = `

          <a
            href="scoreForm.html?id=${encodeURIComponent(item.id)}">

            <button>
              入力する
            </button>

          </a>

        `;

      }

      area.innerHTML += `

        <div class="card">

          <h3>
            ${escapeHtml(data.title || "")}
          </h3>

          <p>
            ${
              escapeHtml(data.testType || "")
            }
          </p>

          <p>
            教科：
            ${
              escapeHtml(
                (data.subjects || []).join("・")
              )
            }
          </p>

          ${actionHtml}

        </div>

      `;

    }


    if(count === 0){

      area.innerHTML = `
        <div class="empty-message">
          現在提出できるテスト成績はありません。
        </div>
      `;

    }

  }catch(error){

    console.error(
      "成績フォーム取得エラー:",
      error
    );

    area.innerHTML = `
      <div class="error-message">
        成績フォームを読み込めませんでした。
      </div>
    `;

  }

}


// =====================
// 提出状態
// =====================

async function getSubmissionState(
  formId,
  uid
){

  const snap =
    await getDocs(
      query(
        collection(db, "scores")
      )
    );

  let found = null;

  snap.forEach(item => {

    const data = item.data();

    if(
      data.formId === formId &&
      data.uid === uid
    ){

      if(!found){
        found = {
          id: item.id,
          ...data
        };
      }

    }

  });


  if(!found){

    return {
      submitted: false,
      resubmitAllowed: false
    };

  }


  return {
    submitted: true,
    resubmitAllowed:
      found.resubmitAllowed === true
  };

}


// =====================
// 連絡
// =====================

window.sendMessage = async function(){

  const input =
    document.getElementById("messageText");

  const text =
    input.value.trim();

  if(!text){

    alert("内容を入力してください");

    return;
  }

  try{

    await addDoc(
      collection(db, "messages"),
      {

        senderUid:
          currentUser.uid,

        senderName:
          userData.name || "",

        senderEmail:
          currentUser.email || "",

        body:text,

        status:"unread",

        createdAt:
          serverTimestamp()

      }
    );

    input.value = "";

    alert("送信しました");

  }catch(error){

    console.error(error);

    alert(
      "送信できませんでした。\n" +
      error.message
    );

  }

};


// =====================
// 共通：配信対象
// =====================

function canViewByTarget(
  data,
  user,
  uid
){

  const targetType =
    data.targetType || "all";

  if(targetType === "all"){
    return true;
  }

  if(targetType === "block"){

    return (
      data.block === user.block
    );

  }

  if(targetType === "block_grade"){

    return (
      data.block === user.block &&
      data.grade === user.grade
    );

  }

  if(targetType === "individual"){

    return data.uid === uid;

  }

  return false;

}


// =====================
// 公開期間
// =====================

function isWithinPeriod(
  startDate,
  endDate
){

  const today =
    new Date();

  today.setHours(
    0,0,0,0
  );


  if(startDate){

    const start =
      new Date(startDate);

    start.setHours(
      0,0,0,0
    );

    if(today < start){
      return false;
    }

  }


  if(endDate){

    const end =
      new Date(endDate);

    end.setHours(
      23,59,59,999
    );

    if(today > end){
      return false;
    }

  }

  return true;

}


// =====================
// 日付表示
// =====================

function formatDate(value){

  if(!value){
    return "";
  }

  return value
    .replaceAll("-", "/");

}


// =====================
// XSS対策
// =====================

function escapeHtml(value){

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
