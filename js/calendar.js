import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


let currentDate=new Date();

let events=[];

let filterStart="";
let filterEnd="";


function pad(value){

  return String(value).padStart(2,"0");

}


function formatDate(year,month,day){

  return `${year}-${pad(month+1)}-${pad(day)}`;

}


function eventOverlapsDate(event,date){

  const start=event.startDate || event.date;
  const end=event.endDate || start;

  return date>=start && date<=end;

}


async function loadCalendar(){

  const area=document.getElementById("calendarArea");

  if(!area) return;

  try{

    const snap=await getDocs(
      query(
        collection(db,"calendar"),
        orderBy("startDate","asc")
      )
    );

    events=[];

    snap.forEach(item=>{

      const data=item.data();

      const start=data.startDate || data.date;

      if(!start) return;

      events.push({
        id:item.id,
        ...data,
        startDate:start,
        endDate:data.endDate || start
      });

    });

    renderCalendar();

  }catch(error){

    console.error(error);

    area.innerHTML=
      "<p>カレンダーを読み込めませんでした。</p>";

  }

}


function renderCalendar(){

  const area=document.getElementById("calendarArea");

  if(!area) return;

  const year=currentDate.getFullYear();
  const month=currentDate.getMonth();

  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);

  let html=`

    <div class="calendar-header">

      <button onclick="prevMonth()">前月</button>

      <h2>
        ${year}年${month+1}月
      </h2>

      <button onclick="nextMonth()">次月</button>

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

  `;

  let dayOfWeek=first.getDay();

  let day=1;

  html+="<tr>";

  for(let i=0;i<dayOfWeek;i++){

    html+="<td class='empty-day'></td>";

  }

  while(day<=last.getDate()){

    const date=formatDate(year,month,day);

    if((dayOfWeek+day-1)%7===0 && day!==1){

      html+="</tr><tr>";

    }

    const dayEvents=events.filter(event=>{

      if(filterStart && event.endDate < filterStart){
        return false;
      }

      if(filterEnd && event.startDate > filterEnd){
        return false;
      }

      return eventOverlapsDate(event,date);

    });

    html+=`

      <td>

        <div class="calendar-day-number">
          ${day}
        </div>

        <div class="calendar-events">

    `;

    dayEvents.forEach(event=>{

      html+=`

        <div class="event">

          <strong>
            ${escapeHtml(event.title)}
          </strong>

          ${
            event.description
              ? `<div>${escapeHtml(event.description)}</div>`
              : ""
          }

        </div>

      `;

    });

    html+=`

        </div>

      </td>

    `;

    day++;

  }

  const remaining=(7-(dayOfWeek+last.getDate())%7)%7;

  for(let i=0;i<remaining;i++){

    html+="<td class='empty-day'></td>";

  }

  html+=`

      </tr>

      </tbody>

    </table>

  `;

  area.innerHTML=html;

}


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


window.prevMonth=function(){

  currentDate.setMonth(
    currentDate.getMonth()-1
  );

  renderCalendar();

};


window.nextMonth=function(){

  currentDate.setMonth(
    currentDate.getMonth()+1
  );

  renderCalendar();

};


window.applyCalendarFilter=function(){

  filterStart=
    document.getElementById(
      "calendarFilterStart"
    ).value;

  filterEnd=
    document.getElementById(
      "calendarFilterEnd"
    ).value;

  if(filterStart && filterEnd && filterStart>filterEnd){

    alert("開始日は終了日以前にしてください");
    return;

  }

  renderCalendar();

};


window.clearCalendarFilter=function(){

  filterStart="";
  filterEnd="";

  document.getElementById(
    "calendarFilterStart"
  ).value="";

  document.getElementById(
    "calendarFilterEnd"
  ).value="";

  renderCalendar();

};


loadCalendar();
