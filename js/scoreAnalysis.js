import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function average(values){

  if(!values.length) return 0;

  return values.reduce(
    (a,b)=>a+b,
    0
  ) / values.length;

}


function median(values){

  if(!values.length) return 0;

  const sorted=[...values].sort(
    (a,b)=>a-b
  );

  const middle=Math.floor(
    sorted.length/2
  );

  if(sorted.length%2){

    return sorted[middle];

  }

  return (
    sorted[middle-1]+sorted[middle]
  )/2;

}


function max(values){

  return values.length
    ? Math.max(...values)
    : 0;

}


function min(values){

  return values.length
    ? Math.min(...values)
    : 0;

}


async function loadScoreAnalysis(){

  const area=document.getElementById("analysisArea");

  if(!area) return;


  const scoreSnap=await getDocs(
    collection(db,"scores")
  );

  const userSnap=await getDocs(
    collection(db,"users")
  );


  const users={};

  userSnap.forEach(item=>{

    users[item.id]=item.data();

  });


  const allScores=[];

  const subjects={};

  const grades={};

  const blocks={};

  const tests={};

  const students={};


  scoreSnap.forEach(item=>{

    const data=item.data();

    if(typeof data.total!=="number"){
      return;
    }

    const user=users[data.uid] || {};

    const record={

      id:item.id,

      ...data,

      user

    };

    allScores.push(record);


    // 教科別

    Object.entries(data.subjects || {})
      .forEach(([subject,score])=>{

        if(!subjects[subject]){

          subjects[subject]=[];

        }

        if(typeof score==="number"){

          subjects[subject].push(score);

        }

      });


    // 学年別

    const grade=user.grade || "未設定";

    if(!grades[grade]){

      grades[grade]=[];

    }

    grades[grade].push(data.total);


    // ブロック別

    const block=user.block || "未設定";

    if(!blocks[block]){

      blocks[block]=[];

    }

    blocks[block].push(data.total);


    // テスト別

    const test=data.testName || "テスト名未設定";

    if(!tests[test]){

      tests[test]=[];

    }

    tests[test].push(data.total);


    // 生徒別

    const uid=data.uid || item.id;

    if(!students[uid]){

      students[uid]={

        name:user.name || data.name || "名前未設定",

        scores:[]

      };

    }

    students[uid].scores.push(data.total);

  });


  const totals=allScores.map(
    item=>item.total
  );


  const overallAverage=average(totals);

  const overallMedian=median(totals);

  const overallMax=max(totals);

  const overallMin=min(totals);


  let html="";


  html+=`

    <div class="stats-grid">

      <div class="card">

        <h3>提出件数</h3>

        <strong>
          ${allScores.length}件
        </strong>

      </div>


      <div class="card">

        <h3>平均点</h3>

        <strong>
          ${overallAverage.toFixed(1)}点
        </strong>

      </div>


      <div class="card">

        <h3>中央値</h3>

        <strong>
          ${overallMedian.toFixed(1)}点
        </strong>

      </div>


      <div class="card">

        <h3>最高点</h3>

        <strong>
          ${overallMax}点
        </strong>

      </div>


      <div class="card">

        <h3>最低点</h3>

        <strong>
          ${overallMin}点
        </strong>

      </div>

    </div>

  `;


  // 教科別

  html+=`

    <div class="card">

      <h2>教科別詳細分析</h2>

      <table class="analysis-table">

        <thead>

          <tr>

            <th>教科</th>
            <th>平均</th>
            <th>中央値</th>
            <th>最高</th>
            <th>最低</th>
            <th>提出数</th>

          </tr>

        </thead>

        <tbody>

  `;


  Object.entries(subjects).forEach(
    ([subject,values])=>{

      html+=`

        <tr>

          <td>
            ${escapeHtml(subject)}
          </td>

          <td>
            ${average(values).toFixed(1)}
          </td>

          <td>
            ${median(values).toFixed(1)}
          </td>

          <td>
            ${max(values)}
          </td>

          <td>
            ${min(values)}
          </td>

          <td>
            ${values.length}
          </td>

        </tr>

      `;

    }
  );


  html+=`

        </tbody>

      </table>

    </div>

  `;


  // 学年別

  html+=`

    <div class="card">

      <h2>学年別分析</h2>

      <table class="analysis-table">

        <thead>

          <tr>
            <th>学年</th>
            <th>平均</th>
            <th>中央値</th>
            <th>最高</th>
            <th>最低</th>
            <th>件数</th>
          </tr>

        </thead>

        <tbody>

  `;


  Object.entries(grades).forEach(
    ([grade,values])=>{

      html+=`

        <tr>

          <td>${escapeHtml(grade)}</td>
          <td>${average(values).toFixed(1)}</td>
          <td>${median(values).toFixed(1)}</td>
          <td>${max(values)}</td>
          <td>${min(values)}</td>
          <td>${values.length}</td>

        </tr>

      `;

    }
  );


  html+=`

        </tbody>

      </table>

    </div>

  `;


  // ブロック別

  html+=`

    <div class="card">

      <h2>ブロック別分析</h2>

      <table class="analysis-table">

        <thead>

          <tr>
            <th>ブロック</th>
            <th>平均</th>
            <th>中央値</th>
            <th>最高</th>
            <th>最低</th>
            <th>件数</th>
          </tr>

        </thead>

        <tbody>

  `;


  Object.entries(blocks).forEach(
    ([block,values])=>{

      html+=`

        <tr>

          <td>${escapeHtml(block)}</td>
          <td>${average(values).toFixed(1)}</td>
          <td>${median(values).toFixed(1)}</td>
          <td>${max(values)}</td>
          <td>${min(values)}</td>
          <td>${values.length}</td>

        </tr>

      `;

    }
  );


  html+=`

        </tbody>

      </table>

    </div>

  `;


  // テスト別

  html+=`

    <div class="card">

      <h2>テスト別分析</h2>

      <table class="analysis-table">

        <thead>

          <tr>

            <th>テスト</th>
            <th>平均</th>
            <th>中央値</th>
            <th>最高</th>
            <th>最低</th>
            <th>提出数</th>

          </tr>

        </thead>

        <tbody>

  `;


  Object.entries(tests).forEach(
    ([test,values])=>{

      html+=`

        <tr>

          <td>${escapeHtml(test)}</td>
          <td>${average(values).toFixed(1)}</td>
          <td>${median(values).toFixed(1)}</td>
          <td>${max(values)}</td>
          <td>${min(values)}</td>
          <td>${values.length}</td>

        </tr>

      `;

    }
  );


  html+=`

        </tbody>

      </table>

    </div>

  `;


  // 得点分布

  const distribution={

    "0～19":0,
    "20～39":0,
    "40～59":0,
    "60～79":0,
    "80～99":0,
    "100以上":0

  };


  totals.forEach(score=>{

    if(score<20){

      distribution["0～19"]++;

    }else if(score<40){

      distribution["20～39"]++;

    }else if(score<60){

      distribution["40～59"]++;

    }else if(score<80){

      distribution["60～79"]++;

    }else if(score<100){

      distribution["80～99"]++;

    }else{

      distribution["100以上"]++;

    }

  });


  html+=`

    <div class="card">

      <h2>得点分布</h2>

      <table class="analysis-table">

        <thead>

          <tr>
            <th>得点帯</th>
            <th>人数</th>
          </tr>

        </thead>

        <tbody>

  `;


  Object.entries(distribution).forEach(
    ([range,count])=>{

      html+=`

        <tr>

          <td>${range}</td>
          <td>${count}人</td>

        </tr>

      `;

    }
  );


  html+=`

        </tbody>

      </table>

    </div>

  `;


  // 生徒別

  html+=`

    <div class="card">

      <h2>生徒別成績</h2>

      <table class="analysis-table">

        <thead>

          <tr>

            <th>生徒</th>
            <th>提出数</th>
            <th>平均</th>
            <th>最高</th>
            <th>最低</th>

          </tr>

        </thead>

        <tbody>

  `;


  Object.values(students)
    .sort(
      (a,b)=>
        average(b.scores)-average(a.scores)
    )
    .forEach(student=>{

      html+=`

        <tr>

          <td>
            ${escapeHtml(student.name)}
          </td>

          <td>
            ${student.scores.length}
          </td>

          <td>
            ${average(student.scores).toFixed(1)}
          </td>

          <td>
            ${max(student.scores)}
          </td>

          <td>
            ${min(student.scores)}
          </td>

        </tr>

      `;

    });


  html+=`

        </tbody>

      </table>

    </div>

  `;


  area.innerHTML=html;

}


loadScoreAnalysis();
