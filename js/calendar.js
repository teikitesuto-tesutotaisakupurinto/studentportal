import {
  db
} from "./firebase.js";


import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



let currentDate = new Date();

let events = [];




// カレンダー読み込み

async function loadCalendarEvents(){


const snap =
await getDocs(
query(
collection(db,"calendar"),
orderBy("date")
)
);



events = [];


snap.forEach(doc=>{

events.push(
doc.data()
);

});


renderCalendar();


}






// カレンダー表示

function renderCalendar(){


const area =
document.getElementById(
"calendarArea"
);



if(!area)return;



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
);



let html = `

<div class="calendar-header">

<button onclick="prevMonth()">
前月
</button>

<h2>
${year}年 ${month+1}月
</h2>

<button onclick="nextMonth()">
次月
</button>

</div>


<table class="calendar">

<tr>

<th>日</th>
<th>月</th>
<th>火</th>
<th>水</th>
<th>木</th>
<th>金</th>
<th>土</th>

</tr>

<tr>
`;




// 空白

for(
let i=0;
i<firstDay.getDay();
i++
){

html += "<td></td>";

}




// 日付

for(
let day=1;
day<=lastDay.getDate();
day++
){


const date =
`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;



html += `

<td>

<div class="day">

${day}

</div>

`;



// 予定表示

events.forEach(event=>{


if(event.date === date){


html += `

<div class="event">

${event.title}

</div>

`;


}



});



html += "</td>";



if(
(firstDay.getDay()+day)%7===0
){

html += "</tr><tr>";

}


}


html += `

</tr>

</table>

`;



area.innerHTML = html;


}







// 前月

window.prevMonth=function(){

currentDate.setMonth(
currentDate.getMonth()-1
);

renderCalendar();

};






// 次月

window.nextMonth=function(){

currentDate.setMonth(
currentDate.getMonth()+1
);

renderCalendar();

};







loadCalendarEvents();
