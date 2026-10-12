import {
  db
} from "./firebase.js";


import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





async function loadAnalysis(){


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



userSnap.forEach(doc=>{


users[doc.id] =
doc.data();


});






let count = 0;

let totalScore = 0;


const subjects = {};

const grades = {};

const blocks = {};





scoreSnap.forEach(doc=>{


const data =
doc.data();



count++;


totalScore +=
data.total || 0;





// 教科別

if(data.subjects){


Object.entries(
data.subjects
)
.forEach(([name,score])=>{


if(!subjects[name]){

subjects[name]={
total:0,
count:0
};

}



subjects[name].total += score;

subjects[name].count++;



});


}





const user =
users[data.uid];



if(user){



// 学年

if(!grades[user.grade]){


grades[user.grade]={
total:0,
count:0
};


}


grades[user.grade].total +=
data.total;


grades[user.grade].count++;





// ブロック

if(!blocks[user.block]){


blocks[user.block]={
total:0,
count:0
};


}


blocks[user.block].total +=
data.total;


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

${count ? 
(totalScore/count).toFixed(1)
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

${(
data.total/data.count
).toFixed(1)}点

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

${(
data.total/data.count
).toFixed(1)}点

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

${(
data.total/data.count
).toFixed(1)}点

</p>

`;



});



html += "</div>";






area.innerHTML = html;


}





loadAnalysis();
