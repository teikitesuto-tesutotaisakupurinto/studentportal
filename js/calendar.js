import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


let currentDate = new Date();

let events = [];


// =====================
// 取得
// =====================

async function loadCalendar(){

  const area =
    document.getElementById("calendarArea");

  if(!area){
    return;
  }

  try{

    const snap =
      await getDocs(
        collection(db, "calendar")
      );

    events = [];

    snap.forEach(item => {

      events.push({
        id:item.id,
        ...item.data()
      });

    });

    renderCalendar();

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="error-message">
        カレンダーを読み込めませんでした。
      </div>
    `;

  }

}


// =====================
// カレンダー表示
// =====================

function renderCalendar(){

  const area =
    document.getElementById("calendarArea");

  if(!area){
    return;
  }

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

  const firstDay =
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

  const firstWeekday =
    firstDay.getDay();


  let html = `

    <div class="calendar-header">

      <button onclick="prevMonth()">
        前月
      </button>

      <h2>
        ${year}年${month + 1}月
      </h2>

      <button onclick="nextMonth()">
        次月
      </button>

    </div>

    <div class="calendar-weekdays">

      <div>日</div>
      <div>月</div>
      <div>火</div>
      <div>水</div>
      <div>木</div>
      <div>金</div>
      <div>土</div>

    </div>

    <div class="calendar-grid">
  `;


  // 空白

  for(
    let i = 0;
    i < firstWeekday;
    i++
  ){

    html += `
      <div class="calendar-cell empty">
      </div>
    `;

  }


  // 日付

  for(
    let day = 1;
    day <= lastDay;
    day++
  ){

    const date =
      `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const dayEvents =
      events.filter(event =>
        eventCoversDate(
          event,
          date
        )
      );


    const today =
      new Date();

    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;


    html += `

      <div
        class="calendar-cell ${isToday ? "today" : ""}">

        <div class="calendar-day">
          ${day}
        </div>

        <div class="calendar-events">

    `;


    dayEvents.forEach(event => {

      html += `

        <div class="calendar-event">

          <strong>
            ${escapeHtml(event.title || "")}
          </strong>

          ${
            event.description
              ? `<small>${escapeHtml(event.description)}</small>`
              : ""
          }

        </div>

      `;

    });


    html += `
        </div>
      </div>
    `;

  }


  html += `
    </div>
  `;

  area.innerHTML = html;

}


// =====================
// 期間判定
// =====================

function eventCoversDate(
  event,
  date
){

  // 新方式
  if(
    event.startDate ||
    event.endDate
  ){

    const start =
      event.startDate ||
      event.endDate;

    const end =
      event.endDate ||
      event.startDate;

    return (
      date >= start &&
      date <= end
    );

  }


  // 旧方式
  if(event.date){

    return event.date === date;

  }

  return false;

}


// =====================
// 前月
// =====================

window.prevMonth = function(){

  currentDate.setMonth(
    currentDate.getMonth() - 1
  );

  renderCalendar();

};


// =====================
// 次月
// =====================

window.nextMonth = function(){

  currentDate.setMonth(
    currentDate.getMonth() + 1
  );

  renderCalendar();

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


loadCalendar();
