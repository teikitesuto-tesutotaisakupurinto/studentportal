import {
  db
} from "./firebase.js";


import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";



let currentDate =
new Date();


let events = [];






// =====================
// カレンダー取得
// =====================

async function loadCalendar(){


const area =
document.getElementById(
"calendarArea"
);



if(!area){

return;

}



const snap =
await getDocs(
query(
collection(db,"calendar"),
orderBy(
"date",
"asc"
)
)
);



events=[];



snap.forEach(item=>{


events.push({

id:item.id,

...item.data()

});


});



renderCalendar();


}









// =====================
// 表示
// =====================

function renderCalendar(){


const area =
document.getElementById(
"calendarArea"
);



if(!area){

return;

}



const year =
currentDate.getFullYear();



const month =
currentDate.getMonth();



const first =
new Date(
year,
month,
1
);



const last =
new Date(
year,
month+1,
0
)
.getDate();





let html = `


<div class="calendar-header">


<button onclick="prevMonth()">

前月

</button>



<h2>

${year}年${month+1}月

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






for(
let i=0;
i<first.getDay();
i++
){

html += "<td></td>";

}






for(
let day=1;
day<=last;
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
(first.getDay()+day)%7===0
){

html += "</tr><tr>";

}


}





html += `

</tr>

</table>

`;



area.innerHTML =
html;


}









// =====================
// 月移動
// =====================

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






loadCalendar();
