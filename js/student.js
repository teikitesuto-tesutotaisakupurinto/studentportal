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

let calendarEvents = [];

let calendarDate =
  new Date();

let calendarRangeStart = "";
let calendarRangeEnd = "";


window.showPage = function(page){

  document
    .querySelectorAll(
      ".content > section"
    )
    .forEach(
      section =>
        section.style.display =
          "none"
    );

  const target =
    document.getElementById(page);

  if(target){

    target.style.display =
      "block";
  }

  if(page === "calendar"){

    renderCalendar();
  }
};


onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "index.html";

      return;
    }

    const role =
      await getUserRole(user);

    if(
      role !== "student" &&
      role !== "admin"
    ){

      alert(
        "このアカウントにはポータルサイトの権限がありません。"
      );

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
        "ユーザー情報が登録されていません。"
      );

      return;
    }

    userData =
      snap.data();

    loadUserInfo();

    await Promise.all([
      loadNotices(),
      loadDocuments(),
      loadCalendar(),
      loadScoreForms()
    ]);

  }
);


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


function loadUserInfo(){

  const area =
    document.getElementById(
      "userInfo"
    );

  if(!area) return;

  area.innerHTML = `

    <p>
      名前：${esc(userData.name)}
    </p>

    <p>
      メール：${esc(currentUser.email)}
    </p>

    <p>
      ブロック：${esc(userData.block)}
    </p>

    <p>
      学年：${esc(userData.grade)}
    </p>

  `;
}


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


function isVisibleByPeriod(data){

  const now =
    new Date();

  const start =
    toDate(data.startDate);

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


/*
配信対象

all
→ 全生徒

block
→ ブロック一斉送信

grade
→ 学年一斉送信

block_grade
→ ブロック＋学年

individual
→ 個別送信
*/
function canViewTarget(data){

  const type =
    data.targetType ||
    "all";


  if(type === "all"){

    return true;
  }


  if(type === "block"){

    return (
      data.block ===
      userData.block
    );
  }


  if(type === "grade"){

    return (
      data.grade ===
      userData.grade
    );
  }


  if(type === "block_grade"){

    return (
      data.block ===
      userData.block &&
      data.grade ===
      userData.grade
    );
  }


  if(type === "individual"){

    return (
      data.uid ===
      currentUser.uid
    );
  }


  return false;
}


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

      <div>
        ${tag}
      </div>

      <a
        class="notice-title-link"
        href="notice.html?id=${encodeURIComponent(id)}">

        ${esc(data.title)}

      </a>

      <div class="notice-meta">

        配信者：${esc(
          data.senderName ||
          "定期テスト対策プリント運営事務局"
        )}

        ⇒

        配信範囲：
        ${esc(
          getTargetLabel(data)
        )}

        [${esc(
          formatTimestamp(
            data.createdAt
          )
        )}]

      </div>

    </div>

  `;
}


function getTargetLabel(data){

  const type =
    data.targetType ||
    "all";


  if(type === "all")
    return "全生徒";


  if(type === "block")
    return `ブロック一斉送信（${data.block || ""}）`;


  if(type === "grade")
    return `学年一斉送信（${data.grade || ""}）`;


  if(type === "block_grade")
    return `ブロック＋学年（${data.block || ""}・${data.grade || ""}）`;


  if(type === "individual")
    return "個別送信";


  return "指定なし";
}


function formatTimestamp(value){

  if(!value) return "";

  let date;

  if(
    typeof value.toDate ===
    "function"
  ){

    date =
      value.toDate();

  }else{

    date =
      new Date(value);
  }

  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return "";
  }

  const p =
    n =>
      String(n)
        .padStart(2,"0");

  return (
    `${date.getFullYear()}/` +
    `${p(date.getMonth()+1)}/` +
    `${p(date.getDate())} ` +
    `${p(date.getHours())}:` +
    `${p(date.getMinutes())}:` +
    `${p(date.getSeconds())}`
  );
}


async function loadNotices(){

  const area =
    document.getElementById(
      "noticeList"
    );

  const dashboard =
    document.getElementById(
      "dashboardNotices"
    );


  if(!area && !dashboard)
    return;


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
        isVisibleByPeriod(data) &&
        canViewTarget(data)
      ){

        list.push({
          id:item.id,
          data
        });
      }

    });


    const html =
      list
        .map(
          x =>
            noticeCard(
              x.id,
              x.data
            )
        )
        .join("");


    const empty =
      `<div class="card">
        現在表示できるお知らせはありません。
      </div>`;


    if(area)
      area.innerHTML =
        html || empty;


    if(dashboard)
      dashboard.innerHTML =
        html || empty;


  }catch(error){

    console.error(
      "お知らせ取得エラー:",
      error
    );


    const message =
      `<div class="card error">
        お知らせを読み込めませんでした。
      </div>`;


    if(area)
      area.innerHTML =
        message;


    if(dashboard)
      dashboard.innerHTML =
        message;
  }
}


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
      "内容を入力してください。"
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

        createdAt:
          serverTimestamp()
      }
    );


    input.value = "";


    alert(
      "送信しました。"
    );


  }catch(error){

    console.error(error);

    alert(
      "送信できませんでした。"
    );
  }
};


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
        isVisibleByPeriod(data) &&
        canViewTarget(data)
      ){

        list.push({
          id:item.id,
          data
        });
      }

    });


    area.innerHTML =
      list.length

      ?

      list.map(
        ({id,data}) => `

          <div class="card document-card">

            <div class="document-header">

              <div>

                <h3>
                  ${esc(data.title)}
                </h3>

                <div class="document-body">
                  ${esc(data.body || "")}
                </div>

              </div>

              <a
                class="button-link"
                href="${esc(data.url || "#")}"
                target="_blank"
                rel="noopener noreferrer">

                配布文書を開く

              </a>

            </div>

            <p class="document-period">

              配信者：
              ${esc(
                data.senderName ||
                "定期テスト対策プリント運営事務局"
              )}

              ⇒

              配信範囲：
              ${esc(
                getTargetLabel(data)
              )}

              [${esc(
                formatTimestamp(
                  data.createdAt
                )
              )}]

            </p>

          </div>

        `
      ).join("")

      :

      `<div class="card">
        現在表示できる配布文書はありません。
      </div>`;


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        配布文書を読み込めませんでした。
      </div>`;
  }
}


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


    snap.forEach(item => {

      calendarEvents.push({

        id:item.id,

        ...item.data()

      });

    });


    renderCalendar();


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        カレンダーを読み込めませんでした。
      </div>`;
  }
}


function dateKey(date){

  return (

    date.getFullYear() +

    "-" +

    String(
      date.getMonth()+1
    ).padStart(2,"0") +

    "-" +

    String(
      date.getDate()
    ).padStart(2,"0")

  );
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
          onclick="prevMonth()">

          前月

        </button>

        <h2>
          ${year}年${month+1}月
        </h2>

        <button
          type="button"
          onclick="nextMonth()">

          次月

        </button>

      </div>


      <div class="calendar-range-filter">

        <label>
          開始日
          <input
            id="calendarRangeStart"
            type="date"
            value="${calendarRangeStart}">
        </label>

        <span>〜</span>

        <label>
          終了日
          <input
            id="calendarRangeEnd"
            type="date"
            value="${calendarRangeEnd}">
        </label>

        <button
          type="button"
          onclick="applyCalendarRange()">

          期間を適用

        </button>

        <button
          type="button"
          class="secondary-button"
          onclick="clearCalendarRange()">

          解除

        </button>

      </div>

    </div>


    <div class="calendar-wrap">

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
    let i=0;
    i<first.getDay();
    i++
  ){

    html +=
      `<td class="empty"></td>`;
  }


  for(
    let day=1;
    day<=lastDay;
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


    const visible =
      (
        !calendarRangeStart ||
        key >= calendarRangeStart
      ) &&
      (
        !calendarRangeEnd ||
        key <= calendarRangeEnd
      );


    const events =
      visible

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
        class="calendar-day
        ${key === todayKey ? "today" : ""}">

        <div class="day-number">
          ${day}
        </div>

    `;


    events.forEach(
      event => {

        html += `

          <button
            type="button"
            class="calendar-event"
            onclick="showCalendarEvent('${esc(event.id)}')">

            ${esc(event.title)}

          </button>

        `;
      }
    );


    html +=
      `</td>`;


    if(
      (
        first.getDay()+day
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
      cells % 7
    ) % 7;


  for(
    let i=0;
    i<trailing;
    i++
  ){

    html +=
      `<td class="empty"></td>`;
  }


  html += `

        </tr>

      </tbody>

    </table>

    </div>

    <div
      id="calendarEventDetail"
      class="event-detail">
    </div>
  `;


  area.innerHTML =
    html;
}


window.showCalendarEvent =
function(id){

  const event =
    calendarEvents.find(
      x => x.id === id
    );

  if(!event) return;


  const area =
    document.getElementById(
      "calendarEventDetail"
    );


  if(!area) return;


  area.innerHTML = `

    <div class="card">

      <h3>
        ${esc(event.title)}
      </h3>

      <p>
        ${esc(event.startDate || event.date || "")}

        ${
          event.endDate &&
          event.endDate !==
          (event.startDate || event.date)

          ?

          "〜 " +
          esc(event.endDate)

          :

          ""
        }

      </p>

      <div class="event-description">

        ${esc(
          event.description || ""
        ).replace(
          /\n/g,
          "<br>"
        )}

      </div>

    </div>

  `;
};


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
      "開始日は終了日以前にしてください。"
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
      )
        return;


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
      )
        return;


      if(
        end &&
        today > end
      )
        return;


      if(
        !canViewTarget(data)
      )
        return;


      cards.push(`

        <div class="card">

          <h3>
            ${esc(data.title)}
          </h3>

          <p>
            ${esc(data.testType || "")}
          </p>

          <a
            class="button-link"
            href="scoreForm.html?id=${encodeURIComponent(item.id)}">

            成績を提出・確認

          </a>

        </div>

      `);

    });


    area.innerHTML =
      cards.join("") ||

      `<div class="card">
        現在提出できるテスト成績はありません。
      </div>`;


  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">
        テスト成績を読み込めませんでした。
      </div>`;
  }
}
