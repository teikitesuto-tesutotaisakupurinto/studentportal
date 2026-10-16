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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import { getUserRole } from "./auth.js";


let currentUser = null;

let userData = null;

let calendarEvents = [];

let calendarDate = new Date();

let calendarRangeStart = "";

let calendarRangeEnd = "";


/* =========================
   ページ切り替え
========================= */

window.showPage = function(page){

  document
    .querySelectorAll(".content > section")
    .forEach(section => {

      section.style.display = "none";

    });


  const target =
    document.getElementById(page);


  if(target){

    target.style.display = "block";

  }


  if(page === "calendar"){

    renderCalendar();

  }

};


/* =========================
   認証
========================= */

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href = "index.html";

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


      currentUser = user;


      const snap =
        await getDoc(
          doc(
            db,
            "users",
            user.uid
          )
        );


      if(!snap.exists()){

        alert(
          "ユーザー情報がありません"
        );

        return;

      }


      userData =
        snap.data();


      loadUserInfo();


      await loadNotices();

      await loadDocuments();

      await loadCalendar();

      await loadScoreForms();


    }catch(error){

      console.error(
        "初期読み込みエラー:",
        error
      );

      alert(
        "データの読み込み中にエラーが発生しました。\n" +
        "Firestoreの権限設定を確認してください。"
      );

    }

  }
);


/* =========================
   HTMLエスケープ
========================= */

function esc(value){

  return String(
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

}


/* =========================
   ユーザー情報
========================= */

function loadUserInfo(){

  const area =
    document.getElementById(
      "userInfo"
    );


  if(!area) return;


  area.innerHTML = `

    <p>
      名前：
      ${esc(userData.name)}
    </p>

    <p>
      メール：
      ${esc(currentUser.email)}
    </p>

    <p>
      ブロック：
      ${esc(userData.block)}
    </p>

    <p>
      学年：
      ${esc(userData.grade)}
    </p>

  `;

}


/* =========================
   日付
========================= */

function toDate(
  value,
  endOfDay = false
){

  if(!value) return null;


  const d =
    new Date(value);


  if(
    Number.isNaN(
      d.getTime()
    )
  ){

    return null;

  }


  if(endOfDay){

    d.setHours(
      23,
      59,
      59,
      999
    );

  }


  return d;

}


/* =========================
   公開期間
========================= */

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

    (!start || now >= start)

    &&

    (!end || now <= end)

  );

}


/* =========================
   配信対象
========================= */

function canViewTarget(data){

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
   お知らせカード
========================= */

function noticeCard(
  id,
  data
){

  const tag =
    data.importance ===
    "important"

      ?

      `<span class="important">
        重要
       </span>`

      :

      `<span class="normal-tag">
        通常
       </span>`;


  return `

    <div class="notice-card">

      <a
        href="notice.html?id=${encodeURIComponent(id)}"
      >

        <div>
          ${tag}
        </div>

        <h3>
          ${esc(data.title)}
        </h3>

      </a>


      <p>
        ${esc(
          (data.body || "")
          .replace(/\s+/g," ")
          .slice(0,120)
        )}
      </p>


      <small>

        公開期間：

        ${esc(
          data.startDate || ""
        )}

        ${
          data.endDate
            ?
            "〜 " +
            esc(data.endDate)
            :
            ""
        }

      </small>

    </div>

  `;

}


/* =========================
   お知らせ
========================= */

async function loadNotices(){

  const area =
    document.getElementById(
      "noticeList"
    );


  const dashboard =
    document.getElementById(
      "dashboardNotices"
    );


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


    snap.forEach(item => {

      const data =
        item.data();


      if(
        isVisibleByPeriod(data)
        &&
        canViewTarget(data)
      ){

        list.push({
          id:item.id,
          data
        });

      }

    });


    const html =
      list.length

        ?

        list
          .map(
            x =>
              noticeCard(
                x.id,
                x.data
              )
          )
          .join("")

        :

        `<div class="card">
          現在表示できるお知らせはありません。
         </div>`;


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
      "お知らせ読み込み:",
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


/* =========================
   連絡
========================= */

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

        body:text,

        status:
          "unread",

        createdAt:
          serverTimestamp()

      }
    );


    input.value = "";


    alert(
      "送信しました"
    );


  }catch(error){

    console.error(
      "連絡送信:",
      error
    );


    alert(
      "送信できませんでした。\n" +
      error.message
    );

  }

};


/* =========================
   配布文書
========================= */

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


    snap.forEach(item => {

      const data =
        item.data();


      if(
        isVisibleByPeriod(data)
        &&
        canViewTarget(data)
      ){

        list.push({
          id:item.id,
          data
        });

      }

    });


    if(!list.length){

      area.innerHTML = `

        <div class="card">

          現在表示できる配布文書はありません。

        </div>

      `;

      return;

    }


    area.innerHTML =
      list
      .map(
        ({id,data}) => `

          <div class="card">

            <h3>
              ${esc(data.title)}
            </h3>


            <p>
              ${esc(data.body)}
            </p>


            <p class="document-period">

              公開期間：

              ${esc(
                data.startDate || ""
              )}

              ${
                data.endDate
                  ?
                  "〜 " +
                  esc(data.endDate)
                  :
                  ""
              }

            </p>


            <a
              class="button-link"
              href="${esc(data.url || "#")}"
              target="_blank"
              rel="noopener noreferrer"
            >
              配布文書を開く
            </a>


            <a
              class="secondary-link"
              href="document.html?id=${encodeURIComponent(id)}"
            >
              文書詳細を見る
            </a>

          </div>

        `
      )
      .join("");


  }catch(error){

    console.error(
      "配布文書読み込み:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        配布文書を読み込めませんでした。

      </div>

    `;

  }

}


/* =========================
   カレンダー
========================= */

async function loadCalendar(){

  const area =
    document.getElementById(
      "calendarArea"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "calendar"
          ),
          orderBy(
            "startDate",
            "asc"
          )
        )
      );


    calendarEvents = [];


    snap.forEach(item => {

      calendarEvents.push({

        id:item.id,

        ...item.data()

      });

    });


    renderCalendar();


  }catch(error){

    console.error(
      "カレンダー読み込み:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        カレンダーを読み込めませんでした。

      </div>

    `;

  }

}


/* =========================
   日付キー
========================= */

function dateKey(date){

  return (

    date.getFullYear()

    + "-"

    +

    String(
      date.getMonth()+1
    ).padStart(2,"0")

    + "-"

    +

    String(
      date.getDate()
    ).padStart(2,"0")

  );

}


/* =========================
   予定がその日に存在するか
========================= */

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


  if(!start) return false;


  return (
    key >= start
    &&
    key <= end
  );

}


/* =========================
   カレンダー描画
========================= */

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

        <strong>
          表示期間
        </strong>


        <input
          id="calendarRangeStart"
          type="date"
          value="${calendarRangeStart}"
        >


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
          class="secondary-button"
          onclick="clearCalendarRange()"
        >
          解除
        </button>

      </div>

    </div>


    <div class="calendar-wrapper">

    <table class="calendar">

      <thead>

        <tr>

          <th class="sun">
            日
          </th>

          <th>
            月
          </th>

          <th>
            火
          </th>

          <th>
            水
          </th>

          <th>
            木
          </th>

          <th>
            金
          </th>

          <th class="sat">
            土
          </th>

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

    html += `
      <td class="empty"></td>
    `;

  }


  for(
    let day = 1;
    day <= lastDay;
    day++
  ){

    const date =
      new Date(
        year,
        month,
        day
      );


    const key =
      dateKey(date);


    const visibleByRange =

      (
        !calendarRangeStart
        ||
        key >= calendarRangeStart
      )

      &&

      (
        !calendarRangeEnd
        ||
        key <= calendarRangeEnd
      );


    const dayEvents =
      visibleByRange

        ?

        calendarEvents.filter(
          event =>
            eventCoversDate(
              event,
              key
            )
        )

        :

        [];


    html += `

      <td
        class="
          calendar-day
          ${key === todayKey ? "today" : ""}
        "
      >

        <div class="day-number">

          ${day}

        </div>

    `;


    dayEvents.forEach(event => {

      html += `

        <div class="calendar-event">

          <strong>
            ${esc(event.title)}
          </strong>

          ${
            event.description

              ?

              `<span>
                ${esc(
                  event.description
                )}
               </span>`

              :

              ""
          }

        </div>

      `;

    });


    html += `
      </td>
    `;


    if(
      (
        first.getDay() + day
      ) % 7 === 0

      &&

      day !== lastDay
    ){

      html += `
        </tr>
        <tr>
      `;

    }

  }


  const cells =
    first.getDay() +
    lastDay;


  const trailing =
    (
      7 -
      (cells % 7)
    ) % 7;


  for(
    let i = 0;
    i < trailing;
    i++
  ){

    html += `
      <td class="empty"></td>
    `;

  }


  html += `

        </tr>

      </tbody>

    </table>

    </div>

  `;


  area.innerHTML =
    html;

}


/* =========================
   カレンダー操作
========================= */

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
    calendarRangeStart
    &&
    calendarRangeEnd
    &&
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

  calendarRangeStart = "";

  calendarRangeEnd = "";

  renderCalendar();

};


/* =========================
   成績フォーム
========================= */

async function loadScoreForms(){

  const area =
    document.getElementById(
      "scoreFormList"
    );


  if(!area) return;


  try{

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "scoreForms"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );


    const today =
      new Date();


    const cards = [];


    snap.forEach(item => {

      const data =
        item.data();


      if(
        data.published === false
      ){

        return;

      }


      const start =
        toDate(
          data.startDate
        );


      const end =
        toDate(
          data.endDate,
          true
        );


      if(
        start &&
        today < start
      ){

        return;

      }


      if(
        end &&
        today > end
      ){

        return;

      }


      if(
        !canViewScoreForm(data)
      ){

        return;

      }


      cards.push(`

        <div class="card">

          <h3>
            ${esc(data.title)}
          </h3>

          <p>
            ${esc(data.testType)}
          </p>


          <a
            class="button-link"
            href="scoreForm.html?id=${encodeURIComponent(item.id)}"
          >
            成績を提出・確認
          </a>

        </div>

      `);

    });


    area.innerHTML =
      cards.join("")

      ||

      `<div class="card">
        現在提出できるテスト成績はありません。
       </div>`;


  }catch(error){

    console.error(
      "成績フォーム:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        テスト成績を読み込めませんでした。

      </div>

    `;

  }

}


function canViewScoreForm(data){

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
