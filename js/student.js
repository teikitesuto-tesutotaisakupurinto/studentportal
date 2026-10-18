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
  getDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserData,
  getUserRole
} from "./auth.js";

let currentUser = null;
let userData = null;

let calendarEvents = [];

let calendarDate =
  new Date();

let rangeStart = "";
let rangeEnd = "";

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

function timestampMs(value){

  if(value?.toDate){
    return value.toDate().getTime();
  }

  if(value instanceof Date){
    return value.getTime();
  }

  return 0;
}

function formatDateTime(value){

  if(!value){
    return "";
  }

  let date;

  if(value?.toDate){
    date = value.toDate();
  }else{
    date = new Date(value);
  }

  if(Number.isNaN(date.getTime())){
    return "";
  }

  const p =
    n => String(n).padStart(2,"0");

  return `${date.getFullYear()}/${p(date.getMonth()+1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;

}

function targetText(data){

  const type =
    data.targetType || "all";

  switch(type){

    case "individual":
      return "個別送信";

    case "block":
      return "ブロック一斉送信";

    case "block_grade":
      return "ブロック＋学年";

    case "grade":
      return "学年一斉送信";

    default:
      return "全員";

  }

}

function metaText(data){

  const sender =
    data.senderName ||
    data.createdByName ||
    "管理者";

  const created =
    formatDateTime(
      data.createdAt
    );

  return `${esc(sender)} ⇒ ${esc(targetText(data))}${created ? ` [${created}]` : ""}`;

}

function toDate(value,endOfDay=false){

  if(!value){
    return null;
  }

  const date =
    new Date(value);

  if(Number.isNaN(date.getTime())){
    return null;
  }

  if(endOfDay){
    date.setHours(
      23,59,59,999
    );
  }

  return date;

}

function visibleByPeriod(data){

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

function createTargetQuery(
  collectionName
){

  const ref =
    collection(db,collectionName);

  const common = [
    where(
      "targetType",
      "==",
      "all"
    )
  ];

  if(!userData){
    return query(ref,...common);
  }

  const conditions = [
    where(
      "targetType",
      "==",
      "all"
    ),
    where(
      "targetType",
      "==",
      "block"
    ),
    where(
      "block",
      "==",
      userData.block
    ),
    where(
      "targetType",
      "==",
      "block_grade"
    ),
    where(
      "block",
      "==",
      userData.block
    ),
    where(
      "grade",
      "==",
      userData.grade
    ),
    where(
      "targetType",
      "==",
      "grade"
    ),
    where(
      "grade",
      "==",
      userData.grade
    ),
    where(
      "targetType",
      "==",
      "individual"
    ),
    where(
      "uid",
      "==",
      currentUser.uid
    )
  ];

  /*
    Firestoreでは複雑なOR条件を
    1本の単純queryにまとめず、
    個別条件ごとに取得して重複を除去します。
  */

  return {
    ref,
    conditions
  };

}

async function loadTargeted(
  collectionName
){

  const result = new Map();

  if(!userData){
    return [];
  }

  const ref =
    collection(
      db,
      collectionName
    );

  const queries = [

    query(
      ref,
      where(
        "targetType",
        "==",
        "all"
      )
    ),

    query(
      ref,
      where(
        "targetType",
        "==",
        "block"
      ),
      where(
        "block",
        "==",
        userData.block
      )
    ),

    query(
      ref,
      where(
        "targetType",
        "==",
        "block_grade"
      ),
      where(
        "block",
        "==",
        userData.block
      ),
      where(
        "grade",
        "==",
        userData.grade
      )
    ),

    query(
      ref,
      where(
        "targetType",
        "==",
        "grade"
      ),
      where(
        "grade",
        "==",
        userData.grade
      )
    ),

    query(
      ref,
      where(
        "targetType",
        "==",
        "individual"
      ),
      where(
        "uid",
        "==",
        currentUser.uid
      )
    )

  ];

  for(const q of queries){

    const snap =
      await getDocs(q);

    snap.forEach(item => {

      result.set(
        item.id,
        {
          id:item.id,
          ...item.data()
        }
      );

    });

  }

  return [...result.values()]
    .filter(visibleByPeriod)
    .sort(
      (a,b) =>
        timestampMs(b.createdAt) -
        timestampMs(a.createdAt)
    );

}

function renderNotice(item){

  const tag =
    item.importance === "important"
      ? `<span class="important">重要</span>`
      : `<span class="normal-tag">通常</span>`;

  return `

    <div class="notice-item">

      <div>

        ${tag}

        <a
          class="notice-title"
          href="/studentportal/information/detail.html?id=${encodeURIComponent(item.id)}">

          ${esc(item.title)}

        </a>

      </div>

      <div class="notice-meta">

        ${metaText(item)}

      </div>

    </div>

  `;

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

  if(!area && !dashboard){
    return;
  }

  try{

    const list =
      await loadTargeted(
        "notices"
      );

    const html =
      list.length
        ? list.map(renderNotice).join("")
        : `<div class="card">現在表示できるお知らせはありません。</div>`;

    if(area){
      area.innerHTML = html;
    }

    if(dashboard){
      dashboard.innerHTML = html;
    }

  }catch(error){

    console.error(
      "notice error",
      error
    );

    const html =
      `<div class="card error">お知らせを読み込めませんでした。</div>`;

    if(area){
      area.innerHTML = html;
    }

    if(dashboard){
      dashboard.innerHTML = html;
    }

  }

}

async function loadDocuments(){

  const area =
    document.getElementById(
      "documentList"
    );

  if(!area){
    return;
  }

  try{

    const list =
      await loadTargeted(
        "documents"
      );

    if(!list.length){

      area.innerHTML =
        `<div class="card">現在表示できる配布文書はありません。</div>`;

      return;
    }

    area.innerHTML =
      list.map(item => `

        <div class="card">

          <div class="document-header">

            <h3>
              ${esc(item.title)}
            </h3>

            <a
              class="document-open"
              href="${esc(item.url || "#")}"
              target="_blank"
              rel="noopener noreferrer">

              <span class="material-symbols-rounded">
                open_in_new
              </span>

              配布文書を開く

            </a>

          </div>

          ${
            item.body
              ? `<div class="document-body">${esc(item.body)}</div>`
              : ""
          }

          <p class="document-period">

            ${metaText(item)}

          </p>

        </div>

      `).join("");

  }catch(error){

    console.error(
      "document error",
      error
    );

    area.innerHTML =
      `<div class="card error">配布文書を読み込めませんでした。</div>`;

  }

}

async function loadCalendar(){

  const area =
    document.getElementById(
      "calendarArea"
    );

  if(!area){
    return;
  }

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

    console.error(
      "calendar error",
      error
    );

    area.innerHTML =
      `<div class="card error">カレンダーを読み込めませんでした。</div>`;

  }

}

function dateKey(date){

  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

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

  if(!area){
    return;
  }

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

  const today =
    dateKey(new Date());

  let html = `

    <div class="calendar-toolbar">

      <button
        class="secondary-button"
        type="button"
        id="prevMonthButton">

        <span class="material-symbols-rounded">
          chevron_left
        </span>

        前月

      </button>

      <h2>
        ${year}年${month+1}月
      </h2>

      <button
        class="secondary-button"
        type="button"
        id="nextMonthButton">

        次月

        <span class="material-symbols-rounded">
          chevron_right
        </span>

      </button>

    </div>

    <div class="calendar-range">

      <div class="form-group">
        <label>表示開始</label>
        <input
          id="calendarRangeStart"
          type="date"
          value="${rangeStart}">
      </div>

      <div class="form-group">
        <label>表示終了</label>
        <input
          id="calendarRangeEnd"
          type="date"
          value="${rangeEnd}">
      </div>

      <button
        class="primary-button"
        type="button"
        id="applyRangeButton">

        期間を適用

      </button>

      <button
        class="secondary-button"
        type="button"
        id="clearRangeButton">

        解除

      </button>

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

    const inRange =
      (!rangeStart ||
        key >= rangeStart) &&
      (!rangeEnd ||
        key <= rangeEnd);

    const events =
      inRange
        ? calendarEvents.filter(
            event =>
              eventCoversDate(
                event,
                key
              )
          )
        : [];

    html += `

      <td class="calendar-day ${
        key === today
          ? "today"
          : ""
      }">

        <div class="day-number">
          ${day}
        </div>

    `;

    events.forEach(event => {

      html += `

        <button
          type="button"
          class="calendar-event"
          data-event-id="${esc(event.id)}">

          ${esc(event.title)}

        </button>

      `;

    });

    html += `</td>`;

    if(
      (first.getDay()+day)%7 === 0 &&
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
    (7 - cells % 7) % 7;

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
  `;

  area.innerHTML = html;

  document
    .getElementById(
      "prevMonthButton"
    )
    ?.addEventListener(
      "click",
      () => {

        calendarDate.setMonth(
          calendarDate.getMonth()-1
        );

        renderCalendar();

      }
    );

  document
    .getElementById(
      "nextMonthButton"
    )
    ?.addEventListener(
      "click",
      () => {

        calendarDate.setMonth(
          calendarDate.getMonth()+1
        );

        renderCalendar();

      }
    );

  document
    .getElementById(
      "applyRangeButton"
    )
    ?.addEventListener(
      "click",
      () => {

        const start =
          document.getElementById(
            "calendarRangeStart"
          )?.value || "";

        const end =
          document.getElementById(
            "calendarRangeEnd"
          )?.value || "";

        if(
          start &&
          end &&
          start > end
        ){

          alert(
            "開始日は終了日以前にしてください。"
          );

          return;
        }

        rangeStart = start;
        rangeEnd = end;

        renderCalendar();

      }
    );

  document
    .getElementById(
      "clearRangeButton"
    )
    ?.addEventListener(
      "click",
      () => {

        rangeStart = "";
        rangeEnd = "";

        renderCalendar();

      }
    );

  document
    .querySelectorAll(
      ".calendar-event"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.eventId;

          const event =
            calendarEvents.find(
              item => item.id === id
            );

          showEventDetail(event);

        }
      );

    });

}

function showEventDetail(event){

  const area =
    document.getElementById(
      "eventDetail"
    );

  if(!area || !event){
    return;
  }

  area.innerHTML = `

    <div class="card">

      <h2>
        ${esc(event.title)}
      </h2>

      <p>
        ${esc(event.startDate || "")}

        ${
          event.endDate &&
          event.endDate !== event.startDate
            ? `〜 ${esc(event.endDate)}`
            : ""
        }

      </p>

      ${
        event.description
          ? `<div class="notice-body">${esc(event.description)}</div>`
          : ""
      }

    </div>

  `;

}

async function loadScoreForms(){

  const area =
    document.getElementById(
      "scoreFormList"
    );

  if(!area){
    return;
  }

  try{

    const list =
      await loadTargeted(
        "scoreForms"
      );

    const now =
      new Date();

    const visible =
      list.filter(
        data => {

          if(
            data.published === false
          ){
            return false;
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

          return (
            (!start || now >= start) &&
            (!end || now <= end)
          );

        }
      );

    area.innerHTML =
      visible.length
        ? visible.map(item => `

            <div class="card">

              <h3>
                ${esc(item.title)}
              </h3>

              <p>
                ${esc(item.testType || "")}
              </p>

              <a
                class="primary-button"
                href="/studentportal/scoreForms/form.html?id=${encodeURIComponent(item.id)}">

                成績を提出・確認

              </a>

            </div>

          `).join("")
        : `<div class="card">現在提出できるテスト成績はありません。</div>`;

  }catch(error){

    console.error(
      "score form error",
      error
    );

    area.innerHTML =
      `<div class="card error">成績フォームを読み込めませんでした。</div>`;

  }

}

async function sendMessage(){

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

        body:text,

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

}

const sendMessageButton =
  document.getElementById(
    "sendMessageButton"
  );

if(sendMessageButton){

  sendMessageButton.addEventListener(
    "click",
    sendMessage
  );

}

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

    if(!userData){

      alert(
        "ユーザー情報がありません。"
      );

      return;
    }

    if(userData.role !== "student"){

      return;

    }

    await Promise.all([
      loadNotices(),
      loadDocuments(),
      loadCalendar(),
      loadScoreForms()
    ]);

  }
);
