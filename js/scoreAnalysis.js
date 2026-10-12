import {
  db
} from "./firebase.js";


import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




// =====================
// 成績分析
// =====================

async function loadScoreAnalysis(){


const area =
document.getElementById(
"analysisArea"
);



if(!area){

return;

}



const scoreSnap =
await getDocs(
collection(db,"scores")
);



const userSnap =
await getDocs(
collection(db,"users")
);





const users = {};



userSnap.forEach(item=>{


users[item.id] =
item.data();


});







let totalScore = 0;

let count = 0;



const subjects = {};

const grades = {};

const blocks = {};







scoreSnap.forEach(item=>{


const data =
item.data();



if(
typeof data.total === "number"
){


totalScore += data.total;


count++;


}






// 教科別

if(data.subjects){


Object.entries(
data.subjects
)
.forEach(([subject,score])=>{


if(!subjects[subject]){


subjects[subject]={

total:0,

count:0

};


}



subjects[subject].total += score;


subjects[subject].count++;



});


}







// 学年・ブロック

const user =
users[data.uid];



if(user){



if(!grades[user.grade]){


grades[user.grade]={

total:0,

count:0

};


}



grades[user.grade].total +=
data.total || 0;


grades[user.grade].count++;







if(!blocks[user.block]){


blocks[user.block]={

total:0,

count:0

};


}



blocks[user.block].total +=
data.total || 0;


blocks[user.block].count++;



}


});









let html = `


<div class="card">


<h2>
全体分析
</h2>


<p>
提出人数：
${count}人
</p>


<p>
平均点：
${
count
?
(totalScore / count).toFixed(1)
:
0
}
</p>


</div>


`;









html += `

<div class="card">

<h2>
教科別平均
</h2>

`;



Object.entries(subjects)
.forEach(([name,data])=>{


html += `

<p>

${name}：

${
(
data.total /
data.count
)
.toFixed(1)
}点

</p>

`;



});



html += "</div>";









html += `

<div class="card">

<h2>
学年別分析
</h2>

`;



Object.entries(grades)
.forEach(([name,data])=>{


html += `

<p>

${name}：

${
(
data.total /
data.count
)
.toFixed(1)
}点

</p>

`;



});



html += "</div>";









html += `

<div class="card">

<h2>
ブロック別分析
</h2>

`;



Object.entries(blocks)
.forEach(([name,data])=>{


html += `

<p>

${name}：

${
(
data.total /
data.count
)
.toFixed(1)
}点

</p>

`;



});



html += "</div>";







area.innerHTML =
html;


}





loadScoreAnalysis();
