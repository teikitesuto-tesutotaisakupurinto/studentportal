import { auth, db } from "./firebase.js";

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
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let currentUser = null;

let userData = null;

let calendarEvents = [];

let calendarDate = new Date();

let calendarRangeStart = "";

let calendarRangeEnd = "";


/* =====================================================
   HTMLエスケープ
===================================================== */

function esc(value){

  return String(
    value ?? ""
  ).replace(
    /[&<>\"]/g,
    char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;"
    }[char])
  );

}


/* =====================================================
   日付
===================================================== */

function toDate(
  value,
  endOfDay = false
){

  if(!value) return null;

  if(
    value &&
    typeof value.toDate === "function"
  ){

    const date = value.toDate();

    if(endOfDay){

      date.setHours(
        23,
        59,
        59,
        999
      );

    }

    return date;

  }


  const date =
    new Date(value);

  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return null;

  }


  if(endOfDay){

    date.setHours(
      23,
      59,
      59,
      999
    );

  }

  return date;

}


/* =====================================================
   ページ切り替え
===================================================== */

window.showPage = function(page){

  document
    .querySelectorAll(
      ".content > section"
    )
    .forEach(section => {

      section.style.display =
        "none";

    });


  const target =
    document.getElementById(page);


  if(target){

    target.style.display =
      "block";

  }


  if(page === "calendar"){

    renderCalendar();

  }


  if(page === "scores"){

    loadStudentScores();

  }

};


/* =====================================================
   認証
===================================================== */

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


      loadUserInfo();


      await Promise.all([

        loadNotices(),

        loadDocuments(),

        loadCalendar(),

        loadStudentScores()

      ]);


      openInitialPage();


    }catch(error){

      console.error(
        "student initialization error:",
        error
      );

    }

  }
);


/* =====================================================
   初期ページ
===================================================== */

function openInitialPage(){

  const params =
    new URLSearchParams(
      location.search
    );


  const page =
    params.get("page");


  const scoreId =
    params.get("id");


  if(
    page === "settings"
  ){

    showPage(
      "settings"
    );

    return;

  }


  if(
    page === "scores"
  ){

    showPage(
      "scores"
    );


    if(scoreId){

      openScoreDetail(
        scoreId,
        false
      );

    }

    return;

  }


  showPage("home");

}


/* =====================================================
   ユーザー情報
===================================================== */

function loadUserInfo(){

  const area =
    document.getElementById(
      "userInfo"
    );


  if(!area) return;


  area.innerHTML = `

    <div class="user-info-grid">

      <div>
        <span>名前</span>
        <strong>
          ${esc(userData.name)}
        </strong>
      </div>

      <div>
        <span>メールアドレス</span>
        <strong>
          ${esc(currentUser.email)}
        </strong>
      </div>

      <div>
        <span>ブロック</span>
        <strong>
          ${esc(userData.block)}
        </strong>
      </div>

      <div>
        <span>学年</span>
        <strong>
          ${esc(userData.grade)}
        </strong>
      </div>

    </div>

  `;

}


/* =====================================================
   公開期間
===================================================== */

function isVisibleByPeriod(data){

  const now =
    new Date();


  const start =
    toDate(
      data.startDate
    );


  const end =
    toDate(
      data.endDate,
      true
    );


  return (
    (!start || now >= start) &&
    (!end || now <= end)
  );

}


/* =====================================================
   配信対象判定
===================================================== */

function canViewTarget(data){

  const type =
    data.targetType ||
    "all";


  /* 全生徒 */

  if(
    type === "all"
  ){

    return true;

  }


  /* ブロック */

  if(
    type === "block"
  ){

    return (
      data.block ===
      userData.block
    );

  }


  /* ブロック＋学年 */

  if(
    type === "block_grade"
  ){

    return (
      data.block ===
        userData.block &&
      data.grade ===
        userData.grade
    );

  }


  /* 個別 */

  if(
    type === "individual"
  ){

    return (
      data.uid ===
      currentUser.uid
    );

  }


  return false;

}


/* =====================================================
   お知らせ
===================================================== */

function noticeCard(
  id,
  data
){

  const tag =
    data.importance === "important"

      ? `<span class="important">重要</span>`

      : `<span class="normal-tag">通常</span>`;


  return `

    <div class="notice-card">

      <a
        href="information/student.html?id=${encodeURIComponent(id)}"
        class="notice-title-link"
      >

        ${tag}

        <h3>
          ${esc(data.title)}
        </h3>

      </a>


      <p class="notice-meta">

        ${esc(data.senderName || "")}

        ${data.targetType
          ? ` ⇒ ${esc(
              targetTypeLabel(
                data.targetType
              )
            )}`
          : ""
        }

        ${formatDateTime(
          data.createdAt
        )}

      </p>

    </div>

  `;

}


/* =====================================================
   配信区分
===================================================== */

function targetTypeLabel(
  type
){

  switch(type){

    case "all":
      return "全生徒";

    case "block":
      return "ブロック一斉送信";

    case "block_grade":
      return "ブロック＋学年";

    case "grade":
      return "学年一斉送信";

    case "individual":
      return "個別送信";

    default:
      return "配信";

  }

}


/* =====================================================
   日時
===================================================== */

function formatDateTime(
  timestamp
){

  if(!timestamp){

    return "";

  }


  let date = null;


  if(
    typeof timestamp.toDate ===
    "function"
  ){

    date =
      timestamp.toDate();

  }else{

    date =
      new Date(timestamp);

  }


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return "";

  }


  const pad =
    n =>
      String(n)
        .padStart(2,"0");


  return `[${date.getFullYear()}/${
    pad(date.getMonth()+1)
  }/${
    pad(date.getDate())
  } ${
    pad(date.getHours())
  }:${
    pad(date.getMinutes())
  }:${
    pad(date.getSeconds())
  }]`;

}


/* =====================================================
   お知らせ読み込み
===================================================== */

async function loadNotices(){

  const area =
    document.getElementById(
      "noticeList"
    );


  const dashboard =
    document.getElementById(
      "dashboardNotices"
    );


  if(
    !area &&
    !dashboard
  ){

    return;

  }


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "notices"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    const list = [];


    snap.forEach(
      item => {

        const data =
          item.data();


        if(
          isVisibleByPeriod(data) &&
          canViewTarget(data)
        ){

          list.push({
            id:item.id,
            data
          });

        }

      }
    );


    const html =
      list.length

        ? list
            .map(
              item =>
                noticeCard(
                  item.id,
                  item.data
                )
            )
            .join("")

        : `
          <div class="card">
            現在表示できるお知らせはありません。
          </div>
        `;


    if(area){

      area.innerHTML =
        html;

    }


    if(dashboard){

      dashboard.innerHTML =
        html;

    }


  }catch(error){

    console.error(
      "notice error:",
      error
    );


    const html = `

      <div class="card error">

        お知らせを読み込めませんでした。

      </div>

    `;


    if(area){

      area.innerHTML =
        html;

    }


    if(dashboard){

      dashboard.innerHTML =
        html;

    }

  }

}


/* =====================================================
   連絡
===================================================== */

window.sendMessage =
async function(){

  const input =
    document.getElementById(
      "messageText"
    );


  const text =
    input?.value.trim();


  if(!text){

    alert(
      "内容を入力してください"
    );

    return;

  }


  try{

    await addDoc(
      collection(
        db,
        "messages"
      ),
      {

        senderUid:
          currentUser.uid,

        senderName:
          userData.name || "",

        senderEmail:
          currentUser.email || "",

        body:
          text,

        status:
          "unread",

        createdAt:
          serverTimestamp()

      }
    );


    input.value =
      "";


    alert(
      "送信しました"
    );


  }catch(error){

    console.error(error);

    alert(
      "送信できませんでした"
    );

  }

};


/* =====================================================
   配布文書
===================================================== */

async function loadDocuments(){

  const area =
    document.getElementById(
      "documentList"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "documents"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    const list = [];


    snap.forEach(
      item => {

        const data =
          item.data();


        if(
          isVisibleByPeriod(data) &&
          canViewTarget(data)
        ){

          list.push({
            id:item.id,
            data
          });

        }

      }
    );


    area.innerHTML =
      list.length

        ? list.map(
            ({
              id,
              data
            }) => `

              <div class="card">

                <div class="document-header">

                  <div>

                    <h3>
                      ${esc(data.title)}
                    </h3>

                    <p>
                      ${esc(
                        data.body || ""
                      )}
                    </p>

                    <p class="document-period">
                      ${esc(
                        data.startDate || ""
                      )}

                      ${
                        data.endDate
                          ? `〜 ${esc(
                              data.endDate
                            )}`
                          : ""
                      }
                    </p>

                  </div>


                  <a
                    class="button-link"
                    href="${esc(
                      data.url || "#"
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    配布文書を開く
                  </a>

                </div>

              </div>

            `
          ).join("")

        : `

          <div class="card">

            現在表示できる配布文書はありません。

          </div>

        `;


  }catch(error){

    console.error(
      "document error:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        配布文書を読み込めませんでした。

      </div>

    `;

  }

}


/* =====================================================
   カレンダー
===================================================== */

async function loadCalendar(){

  const area =
    document.getElementById(
      "calendarArea"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        collection(
          db,
          "calendar"
        )
      );


    calendarEvents = [];


    snap.forEach(
      item => {

        calendarEvents.push({
          id:item.id,
          ...item.data()
        });

      }
    );


    renderCalendar();


  }catch(error){

    console.error(error);


    area.innerHTML = `

      <div class="card error">

        カレンダーを読み込めませんでした。

      </div>

    `;

  }

}


function dateKey(date){

  return `${
    date.getFullYear()
  }-${
    String(
      date.getMonth()+1
    ).padStart(2,"0")
  }-${
    String(
      date.getDate()
    ).padStart(2,"0")
  }`;

}


function eventCoversDate(
  event,
  key
){

  const start =
    event.startDate ||
    event.date;


  const end =
    event.endDate ||
    event.date ||
    start;


  return (
    start &&
    end &&
    key >= start &&
    key <= end
  );

}


function renderCalendar(){

  const area =
    document.getElementById(
      "calendarArea"
    );


  if(!area) return;


  const year =
    calendarDate.getFullYear();


  const month =
    calendarDate.getMonth();


  const first =
    new Date(
      year,
      month,
      1
    );


  const lastDay =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const todayKey =
    dateKey(
      new Date()
    );


  let html = `

    <div class="calendar-tools">

      <div class="calendar-header">

        <button
          type="button"
          onclick="prevMonth()"
        >
          前月
        </button>

        <h2>
          ${year}年${month+1}月
        </h2>

        <button
          type="button"
          onclick="nextMonth()"
        >
          次月
        </button>

      </div>


      <div class="calendar-range-filter">

        <label>
          表示期間

          <input
            id="calendarRangeStart"
            type="date"
            value="${calendarRangeStart}"
          >

        </label>

        <span>
          〜
        </span>

        <input
          id="calendarRangeEnd"
          type="date"
          value="${calendarRangeEnd}"
        >

        <button
          type="button"
          onclick="applyCalendarRange()"
        >
          期間を適用
        </button>

        <button
          type="button"
          onclick="clearCalendarRange()"
        >
          解除
        </button>

      </div>

    </div>


    <table class="calendar">

      <thead>

        <tr>

          <th>日</th>
          <th>月</th>
          <th>火</th>
          <th>水</th>
          <th>木</th>
          <th>金</th>
          <th>土</th>

        </tr>

      </thead>

      <tbody>

        <tr>

  `;


  for(
    let i = 0;
    i < first.getDay();
    i++
  ){

    html +=
      `<td class="empty"></td>`;

  }


  for(
    let day = 1;
    day <= lastDay;
    day++
  ){

    const key =
      dateKey(
        new Date(
          year,
          month,
          day
        )
      );


    const visibleByRange =
      (
        !calendarRangeStart ||
        key >= calendarRangeStart
      ) &&
      (
        !calendarRangeEnd ||
        key <= calendarRangeEnd
      );


    const dayEvents =
      visibleByRange

        ? calendarEvents.filter(
            event =>
              eventCoversDate(
                event,
                key
              )
          )

        : [];


    html += `

      <td
        class="
          calendar-day
          ${key === todayKey
            ? "today"
            : ""}
        "
      >

        <div class="day-number">
          ${day}
        </div>

    `;


    dayEvents.forEach(
      event => {

        html += `

          <div
            class="calendar-event"
            title="${esc(
              event.description
            )}"
          >

            <strong>
              ${esc(
                event.title
              )}
            </strong>

          </div>

        `;

      }
    );


    html +=
      `</td>`;


    if(
      (
        first.getDay() +
        day
      ) % 7 === 0 &&
      day !== lastDay
    ){

      html +=
        `</tr><tr>`;

    }

  }


  const cells =
    first.getDay() +
    lastDay;


  const trailing =
    (
      7 -
      (
        cells % 7
      )
    ) % 7;


  for(
    let i = 0;
    i < trailing;
    i++
  ){

    html +=
      `<td class="empty"></td>`;

  }


  html += `

        </tr>

      </tbody>

    </table>

  `;


  area.innerHTML =
    html;

}


window.prevMonth =
function(){

  calendarDate.setMonth(
    calendarDate.getMonth() - 1
  );

  renderCalendar();

};


window.nextMonth =
function(){

  calendarDate.setMonth(
    calendarDate.getMonth() + 1
  );

  renderCalendar();

};


window.applyCalendarRange =
function(){

  calendarRangeStart =
    document.getElementById(
      "calendarRangeStart"
    )?.value || "";


  calendarRangeEnd =
    document.getElementById(
      "calendarRangeEnd"
    )?.value || "";


  if(
    calendarRangeStart &&
    calendarRangeEnd &&
    calendarRangeStart >
      calendarRangeEnd
  ){

    alert(
      "開始日は終了日以前にしてください"
    );

    return;

  }


  renderCalendar();

};


window.clearCalendarRange =
function(){

  calendarRangeStart =
    "";

  calendarRangeEnd =
    "";

  renderCalendar();

};


/* =====================================================
   テスト成績
===================================================== */

async function loadStudentScores(){

  const activeArea =
    document.getElementById(
      "activeScoreForms"
    );


  const historyArea =
    document.getElementById(
      "scoreHistoryList"
    );


  if(
    !activeArea &&
    !historyArea
  ){

    return;

  }


  try{

    /*
      scoreForms
      ↓
      管理者が作成したフォーム
    */

    const formSnap =
      await getDocs(
        collection(
          db,
          "scoreForms"
        )
      );


    const forms = [];


    formSnap.forEach(
      item => {

        const data =
          item.data();


        if(
          data.published === false
        ){

          return;

        }


        if(
          !isVisibleByPeriod(data)
        ){

          return;

        }


        if(
          !canViewTarget(data)
        ){

          return;

        }


        forms.push({
          id:item.id,
          ...data
        });

      }
    );


    forms.sort(
      (a,b) =>
        timestampMs(
          b.createdAt
        ) -
        timestampMs(
          a.createdAt
        )
    );


    /*
      回答対象フォーム
    */

    const activeForms =
      [];


    /*
      過去・提出済みテスト
    */

    const historyForms =
      [];


    /*
      各フォームの提出状況を確認
    */

    for(
      const form of forms
    ){

      const submission =
        await getLatestSubmission(
          form.id
        );


      form.submission =
        submission;


      /*
        回答すべきフォーム

        未提出
        または
        管理者から再回答許可
      */

      if(
        !submission ||
        submission.resubmitAllowed === true
      ){

        activeForms.push(
          form
        );

      }


      /*
        一度でも提出済みなら
        成績履歴にも表示
      */

      if(submission){

        historyForms.push(
          form
        );

      }

    }


    /*
      回答フォーム表示
    */

    renderActiveScoreForms(
      activeArea,
      activeForms
    );


    /*
      成績履歴

      フォームがなくても
      scoresから過去成績を拾う
    */

    await renderScoreHistory(
      historyArea,
      historyForms
    );


    /*
      URLにIDがある場合
      そのテストを開く
    */

    const params =
      new URLSearchParams(
        location.search
      );


    const id =
      params.get("id");


    if(id){

      const found =
        forms.find(
          form =>
            form.id === id
        );


      if(found){

        await openScoreDetail(
          id,
          false
        );

      }

    }

  }catch(error){

    console.error(
      "score load error:",
      error
    );


    if(activeArea){

      activeArea.innerHTML = `

        <div class="card error">

          テスト成績フォームを
          読み込めませんでした。

        </div>

      `;

    }


    if(historyArea){

      historyArea.innerHTML = `

        <div class="card error">

          成績一覧を
          読み込めませんでした。

        </div>

      `;

    }

  }

}


/* =====================================================
   Timestamp
===================================================== */

function timestampMs(
  timestamp
){

  if(
    timestamp &&
    typeof timestamp.toDate ===
      "function"
  ){

    return timestamp
      .toDate()
      .getTime();

  }


  if(timestamp){

    const date =
      new Date(timestamp);


    if(
      !Number.isNaN(
        date.getTime()
      )
    ){

      return date.getTime();

    }

  }


  return 0;

}


/* =====================================================
   最新提出取得
===================================================== */

async function getLatestSubmission(
  formId
){

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

    return null;

  }


  const docs = [];


  snap.forEach(
    item => {

      docs.push({
        id:item.id,
        ...item.data()
      });

    }
  );


  docs.sort(
    (a,b) =>
      timestampMs(
        b.createdAt
      ) -
      timestampMs(
        a.createdAt
      )
  );


  return docs[0] || null;

}


/* =====================================================
   回答フォーム
===================================================== */

function renderActiveScoreForms(
  area,
  forms
){

  if(!area) return;


  if(!forms.length){

    area.innerHTML = `

      <div class="empty-score-card">

        <span class="material-symbols-outlined">
          task_alt
        </span>

        <div>

          <strong>
            現在、回答が必要な
            テスト成績フォームはありません。
          </strong>

          <p>
            管理者から新しい成績フォームが
            配信されると、ここに表示されます。
          </p>

        </div>

      </div>

    `;

    return;

  }


  area.innerHTML =
    forms.map(
      form => {

        const resubmit =
          form.submission &&
          form.submission.resubmitAllowed === true;


        return `

          <div class="active-score-card">

            <div class="active-score-icon">

              <span class="material-symbols-outlined">
                assignment
              </span>

            </div>


            <div class="active-score-main">

              <div class="active-score-label">

                ${
                  resubmit
                    ? "再回答可能"
                    : "回答してください"
                }

              </div>


              <h3>
                ${esc(form.title)}
              </h3>


              ${
                form.testType
                  ? `<p>
                      ${esc(
                        form.testType
                      )}
                    </p>`
                  : ""
              }


              <p class="score-form-meta">

                科目：
                ${esc(
                  (
                    form.subjects || []
                  ).join("・")
                )}

              </p>

            </div>


            <div>

              <button
                type="button"
                class="primary-button"
                onclick="openScoreForm('${esc(form.id)}')"
              >

                ${
                  resubmit
                    ? "再回答する"
                    : "成績を入力する"
                }

              </button>

            </div>

          </div>

        `;

      }
    ).join("");

}


/* =====================================================
   成績フォームを同じ画面で開く
===================================================== */

window.openScoreForm =
async function(formId){

  await openScoreDetail(
    formId,
    true,
    true
  );

};


/* =====================================================
   成績履歴
===================================================== */

async function renderScoreHistory(
  area,
  forms
){

  if(!area) return;


  /*
    フォームから取得できる成績
  */

  const records = [];


  for(
    const form of forms
  ){

    if(!form.submission){

      continue;

    }


    records.push({
      id:form.id,
      title:
        form.title ||
        form.testName ||
        "テスト",
      testType:
        form.testType || "",
      submission:
        form.submission,
      createdAt:
        form.submission.createdAt
    });

  }


  /*
    フォーム側にない過去成績も
    scoresから取得
  */

  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "scores"
          ),

          where(
            "uid",
            "==",
            currentUser.uid
          )
        )
      );


    const known =
      new Set(
        records.map(
          record => record.id
        )
      );


    snap.forEach(
      item => {

        const data =
          item.data();


        if(
          data.formId &&
          known.has(
            data.formId
          )
        ){

          return;

        }


        records.push({

          id:
            data.formId ||
            item.id,

          scoreId:
            item.id,

          title:
            data.testName ||
            "テスト成績",

          testType:
            data.testType ||
            "",

          submission:{
            id:item.id,
            ...data
          },

          createdAt:
            data.createdAt

        });

      }
    );


  }catch(error){

    console.error(
      "history scores error:",
      error
    );

  }


  /*
    日付順
  */

  records.sort(
    (a,b) =>
      timestampMs(
        b.createdAt
      ) -
      timestampMs(
        a.createdAt
      )
  );


  if(!records.length){

    area.innerHTML = `

      <div class="card">

        まだ確認できる
        テスト成績はありません。

      </div>

    `;

    return;

  }


  area.innerHTML =
    records.map(
      record => {

        const submission =
          record.submission;


        const total =
          submission.total;


        const average =
          submission.average;


        return `

          <div class="score-history-card">

            <div class="score-history-main">

              <div class="score-history-date">

                ${formatDateTime(
                  record.createdAt
                )}

              </div>


              <h3>
                ${esc(
                  record.title
                )}
              </h3>


              ${
                record.testType
                  ? `<p>
                      ${esc(
                        record.testType
                      )}
                    </p>`
                  : ""
              }

            </div>


            <div class="score-history-summary">

              <div>

                <span>
                  合計
                </span>

                <strong>
                  ${esc(total ?? "-")}点
                </strong>

              </div>


              <div>

                <span>
                  平均
                </span>

                <strong>
                  ${esc(average ?? "-")}点
                </strong>

              </div>

            </div>


            <button
              type="button"
              class="secondary-button"
              onclick="openScoreDetail('${esc(record.id)}', true)"
            >

              成績を見る

            </button>

          </div>

        `;

      }
    ).join("");

}


/* =====================================================
   テスト詳細
===================================================== */

window.openScoreDetail =
async function(
  id,
  updateUrl = true,
  isForm = false
){

  if(!id) return;


  const area =
    document.getElementById(
      "selectedScoreArea"
    );


  const content =
    document.getElementById(
      "selectedScoreContent"
    );


  const history =
    document.getElementById(
      "scoreHistoryArea"
    );


  const active =
    document.querySelector(
      "#activeScoreForms"
    );


  if(
    !area ||
    !content
  ){

    return;

  }


  try{

    /*
      まずフォームを取得
    */

    const formSnap =
      await getDoc(
        doc(
          db,
          "scoreForms",
          id
        )
      );


    if(
      formSnap.exists()
    ){

      const form =
        formSnap.data();


      if(
        !canViewTarget(form)
      ){

        content.innerHTML = `

          <div class="card error">

            このテスト成績フォームの
            対象ではありません。

          </div>

        `;

        area.style.display =
          "block";

        if(history)
          history.style.display =
            "none";

        if(active)
          active.style.display =
            "none";

        return;

      }


      const submission =
        await getLatestSubmission(
          id
        );


      area.style.display =
        "block";


      if(history)
        history.style.display =
          "none";


      if(active)
        active.style.display =
          "none";


      content.innerHTML =
        buildScoreFormDetail(
          id,
          form,
          submission,
          isForm
        );


      if(updateUrl){

        historyPushScoreId(
          id
        );

      }


      return;

    }


    /*
      scoreFormsに存在しない場合
      scoresから探す
    */

    const scoreSnap =
      await getDocs(
        query(
          collection(
            db,
            "scores"
          ),

          where(
            "uid",
            "==",
            currentUser.uid
          ),

          where(
            "formId",
            "==",
            id
          )
        )
      );


    if(scoreSnap.empty){

      content.innerHTML = `

        <div class="card">

          テスト成績が見つかりません。

        </div>

      `;

      area.style.display =
        "block";

      return;

    }


    const docs = [];


    scoreSnap.forEach(
      item => {

        docs.push({
          id:item.id,
          ...item.data()
        });

      }
    );


    docs.sort(
      (a,b) =>
        timestampMs(
          b.createdAt
        ) -
        timestampMs(
          a.createdAt
        )
    );


    const submission =
      docs[0];


    area.style.display =
      "block";


    if(history)
      history.style.display =
        "none";


    if(active)
      active.style.display =
        "none";


    content.innerHTML =
      buildScoreOnlyDetail(
        submission
      );


    if(updateUrl){

      historyPushScoreId(
        id
      );

    }


  }catch(error){

    console.error(
      "score detail error:",
      error
    );


    content.innerHTML = `

      <div class="card error">

        成績を読み込めませんでした。

        <br><br>

        ${esc(
          error.message
        )}

      </div>

    `;

    area.style.display =
      "block";

  }

};


/* =====================================================
   URL
===================================================== */

function historyPushScoreId(
  id
){

  const url =
    new URL(
      location.href
    );


  url.searchParams.set(
    "page",
    "scores"
  );


  url.searchParams.set(
    "id",
    id
  );


  history.pushState(
    {
      scoreId:id
    },
    "",
    url
  );

}


/* =====================================================
   フォーム詳細
===================================================== */

function buildScoreFormDetail(
  formId,
  form,
  submission,
  isForm
){

  const subjects =
    Array.isArray(
      form.subjects
    )
      ? form.subjects
      : [];


  /*
    未提出
  */

  if(!submission){

    return `

      <div class="score-detail-card">

        <div class="detail-kicker">
          成績入力
        </div>


        <h2>
          ${esc(
            form.title ||
            "テスト成績"
          )}
        </h2>


        ${
          form.testType
            ? `<p class="detail-subtitle">
                ${esc(
                  form.testType
                )}
              </p>`
            : ""
        }


        <div class="score-input-grid">

          ${
            subjects.length

              ? subjects.map(
                  subject => `

                    <label
                      class="score-input-card"
                    >

                      <span>
                        ${esc(
                          subject
                        )}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        class="scoreInput"
                        data-subject="${esc(
                          subject
                        )}"
                        placeholder="点数"
                      >

                    </label>

                  `
                ).join("")

              : `

                <div class="card">

                  このフォームには
                  科目が設定されていません。

                </div>

              `
          }

        </div>


        <div class="score-submit-box">

          <p>
            入力内容を確認してから
            提出してください。
          </p>


          <button
            type="button"
            class="primary-button"
            onclick="submitInlineScore('${esc(formId)}')"
          >

            成績を提出

          </button>

        </div>

      </div>

    `;

  }


  /*
    再回答許可
  */

  if(
    submission.resubmitAllowed === true
  ){

    return `

      <div class="score-detail-card">

        <div class="status-box warning">

          管理者から再回答が許可されています。

          <br>

          内容を確認して再提出できます。

        </div>


        <h2>
          ${esc(
            form.title ||
            "テスト成績"
          )}
        </h2>


        <div class="score-input-grid">

          ${
            subjects.map(
              subject => `

                <label
                  class="score-input-card"
                >

                  <span>
                    ${esc(
                      subject
                    )}
                  </span>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    class="scoreInput"
                    data-subject="${esc(
                      subject
                    )}"
                    value="${esc(
                      submission.subjects?.[subject] ?? ""
                    )}"
                  >

                </label>

              `
            ).join("")
          }

        </div>


        <div class="score-submit-box">

          <button
            type="button"
            class="primary-button"
            onclick="submitInlineScore('${esc(formId)}')"
          >

            再提出する

          </button>

        </div>

      </div>

    `;

  }


  /*
    提出済み
  */

  return buildSubmittedDetail(
    form,
    submission
  );

}


/* =====================================================
   提出済み詳細
===================================================== */

function buildSubmittedDetail(
  form,
  submission
){

  const subjects =
    submission.subjects ||
    {};


  const rows =
    Object.entries(
      subjects
    ).map(
      ([name,score]) => `

        <tr>

          <th>
            ${esc(name)}
          </th>

          <td>
            ${esc(score)}点
          </td>

        </tr>

      `
    ).join("");


  return `

    <div class="score-detail-card">

      <div class="status-box success">

        <strong>
          提出しました。
        </strong>

        <br>

        管理者が再回答を許可しない限り、
        もう一度解答することはできません。

      </div>


      <div class="detail-kicker">
        成績結果
      </div>


      <h2>
        ${esc(
          form.title ||
          submission.testName ||
          "テスト成績"
        )}
      </h2>


      ${
        form.testType
          ? `<p class="detail-subtitle">
              ${esc(
                form.testType
              )}
            </p>`
          : ""
      }


      <div class="score-result-summary">

        <div>

          <span>
            合計
          </span>

          <strong>
            ${esc(
              submission.total ?? "-"
            )}
          </strong>

          <small>
            点
          </small>

        </div>


        <div>

          <span>
            平均
          </span>

          <strong>
            ${esc(
              submission.average ?? "-"
            )}
          </strong>

          <small>
            点
          </small>

        </div>

      </div>


      <div class="table-wrap">

        <table class="data-table score-result-table">

          <thead>

            <tr>

              <th>
                科目
              </th>

              <th>
                得点
              </th>

            </tr>

          </thead>


          <tbody>

            ${rows}

          </tbody>

        </table>

      </div>


      <div
        id="scoreComparisonArea"
        class="score-comparison-area"
      >

        <!-- 前回比較をここに表示 -->

      </div>

    </div>

  `;

}


/* =====================================================
   scoreだけの詳細
===================================================== */

function buildScoreOnlyDetail(
  submission
){

  const subjects =
    submission.subjects ||
    {};


  const rows =
    Object.entries(
      subjects
    ).map(
      ([name,score]) => `

        <tr>

          <th>
            ${esc(name)}
          </th>

          <td>
            ${esc(score)}点
          </td>

        </tr>

      `
    ).join("");


  return `

    <div class="score-detail-card">

      <div class="detail-kicker">
        成績結果
      </div>


      <h2>
        ${esc(
          submission.testName ||
          "テスト成績"
        )}
      </h2>


      <div class="score-result-summary">

        <div>

          <span>
            合計
          </span>

          <strong>
            ${esc(
              submission.total ?? "-"
            )}
          </strong>

          <small>
            点
          </small>

        </div>


        <div>

          <span>
            平均
          </span>

          <strong>
            ${esc(
              submission.average ?? "-"
            )}
          </strong>

          <small>
            点
          </small>

        </div>

      </div>


      <div class="table-wrap">

        <table class="data-table score-result-table">

          <thead>

            <tr>

              <th>
                科目
              </th>

              <th>
                得点
              </th>

            </tr>

          </thead>

          <tbody>

            ${rows}

          </tbody>

        </table>

      </div>

    </div>

  `;

}


/* =====================================================
   インライン提出
===================================================== */

window.submitInlineScore =
async function(formId){

  try{

    const formSnap =
      await getDoc(
        doc(
          db,
          "scoreForms",
          formId
        )
      );


    if(
      !formSnap.exists()
    ){

      alert(
        "成績フォームが存在しません。"
      );

      return;

    }


    const form =
      formSnap.data();


    if(
      !canViewTarget(form)
    ){

      alert(
        "このフォームの対象ではありません。"
      );

      return;

    }


    const existing =
      await getLatestSubmission(
        formId
      );


    /*
      既に提出済みで
      再回答許可されていない
    */

    if(
      existing &&
      existing.resubmitAllowed !== true
    ){

      alert(
        "すでに提出済みです。管理者が再回答を許可した場合のみ、もう一度回答できます。"
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
      .forEach(
        input => {

          const raw =
            input.value.trim();


          if(
            raw === ""
          ){

            return;

          }


          const value =
            Number(raw);


          if(
            !Number.isFinite(value) ||
            value < 0 ||
            value > 100
          ){

            return;

          }


          subjects[
            input.dataset.subject
          ] = value;


          total += value;

          count++;

        }
      );


    const subjectCount =
      Array.isArray(
        form.subjects
      )
        ? form.subjects.length
        : 0;


    if(
      count === 0
    ){

      alert(
        "点数を入力してください。"
      );

      return;

    }


    if(
      count !== subjectCount
    ){

      alert(
        "すべての教科の点数を入力してください。"
      );

      return;

    }


    const average =
      Number(
        (
          total /
          count
        ).toFixed(1)
      );


    /*
      再回答の場合
      既存提出の再回答許可を解除
    */

    if(
      existing &&
      existing.resubmitAllowed === true
    ){

      /*
        Firestoreの既存レコードを
        更新して再回答済みにする。

        新しい回答履歴も保存する。
      */

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
            form.title || "",

          testType:
            form.testType || "",

          subjects,

          total,

          average,

          resubmitAllowed:
            false,

          previousScoreId:
            existing.id,

          createdAt:
            serverTimestamp()

        }
      );

    }else{

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
            form.title || "",

          testType:
            form.testType || "",

          subjects,

          total,

          average,

          resubmitAllowed:
            false,

          createdAt:
            serverTimestamp()

        }
      );

    }


    /*
      提出後にURLを維持して
      同じテストの結果を表示
    */

    await openScoreDetail(
      formId,
      false
    );


    history.replaceState(
      {
        scoreId:formId
      },
      "",
      `student.html?page=scores&id=${encodeURIComponent(formId)}`
    );


    alert(
      "提出しました。"
    );


  }catch(error){

    console.error(
      "submit score error:",
      error
    );


    alert(
      "提出できませんでした。\n" +
      error.message
    );

  }

};


/* =====================================================
   詳細を閉じる
===================================================== */

window.closeScoreDetail =
function(){

  const area =
    document.getElementById(
      "selectedScoreArea"
    );


  const historyArea =
    document.getElementById(
      "scoreHistoryArea"
    );


  const activeArea =
    document.getElementById(
      "activeScoreForms"
    );


  if(area){

    area.style.display =
      "none";

  }


  if(historyArea){

    historyArea.style.display =
      "block";

  }


  if(activeArea){

    activeArea.style.display =
      "block";

  }


  const url =
    new URL(
      location.href
    );


  url.searchParams.delete(
    "id"
  );


  url.searchParams.set(
    "page",
    "scores"
  );


  history.pushState(
    {},
    "",
    url
  );

};


/* =====================================================
   ブラウザ戻る・進む
===================================================== */

window.addEventListener(
  "popstate",
  async () => {

    const params =
      new URLSearchParams(
        location.search
      );


    const id =
      params.get("id");


    if(id){

      await openScoreDetail(
        id,
        false
      );

    }else{

      closeScoreDetail();

    }

  }
);
