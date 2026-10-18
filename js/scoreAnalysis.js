import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


let scoreData = [];
let userData = {};


function escapeHtml(value){

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


function average(values){

  if(!values.length)
    return 0;

  return (
    values.reduce(
      (a,b) => a+b,
      0
    ) /
    values.length
  );
}


function median(values){

  if(!values.length)
    return 0;

  const sorted =
    [...values].sort(
      (a,b) => a-b
    );


  const middle =
    Math.floor(
      sorted.length / 2
    );


  if(
    sorted.length % 2
  ){

    return sorted[middle];
  }


  return (
    sorted[middle-1] +
    sorted[middle]
  ) / 2;
}


export async function loadScoreAnalysis(){

  const area =
    document.getElementById(
      "analysisArea"
    );


  if(!area) return;


  try{

    const [
      scoreSnap,
      userSnap
    ] = await Promise.all([

      getDocs(
        collection(
          db,
          "scores"
        )
      ),

      getDocs(
        collection(
          db,
          "users"
        )
      )

    ]);


    scoreData = [];


    scoreSnap.forEach(
      item => {

        scoreData.push({

          id:item.id,

          ...item.data()

        });

      }
    );


    userData = {};


    userSnap.forEach(
      item => {

        userData[item.id] =
          item.data();

      }
    );


    const tests =
      [
        ...new Set(
          scoreData
            .map(
              item =>
                item.testName ||
                item.formId ||
                "名称未設定"
            )
        )
      ];


    area.innerHTML = `

      <div class="card">

        <h2>
          テストを選択
        </h2>

        <select
          id="analysisTestSelect"
          onchange="renderSelectedTestAnalysis()">

          <option value="">
            テストを選択してください
          </option>

          ${
            tests.map(
              test => `

                <option value="${escapeHtml(test)}">

                  ${escapeHtml(test)}

                </option>

              `
            ).join("")
          }

        </select>

      </div>

      <div
        id="selectedTestAnalysis">

        <div class="card">

          テストを選択すると、
          そのテストの成績分析が表示されます。

        </div>

      </div>

    `;


  }catch(error){

    console.error(error);

    area.innerHTML = `

      <div class="card error">

        成績分析を読み込めませんでした。

      </div>

    `;
  }
}


window.renderSelectedTestAnalysis =
function(){

  const select =
    document.getElementById(
      "analysisTestSelect"
    );


  const area =
    document.getElementById(
      "selectedTestAnalysis"
    );


  if(!select || !area)
    return;


  const testName =
    select.value;


  if(!testName){

    area.innerHTML = `

      <div class="card">

        テストを選択してください。

      </div>

    `;

    return;
  }


  const rows =
    scoreData.filter(
      item =>
        (
          item.testName ||
          item.formId ||
          "名称未設定"
        ) === testName
    );


  if(!rows.length){

    area.innerHTML = `

      <div class="card">

        このテストの提出データはありません。

      </div>

    `;

    return;
  }


  const totals =
    rows
      .map(
        row =>
          Number(row.total)
      )
      .filter(
        Number.isFinite
      );


  const subjectMap = {};


  rows.forEach(
    row => {

      Object.entries(
        row.subjects || {}
      ).forEach(
        ([subject,value]) => {

          const number =
            Number(value);


          if(
            !Number.isFinite(
              number
            )
          )
            return;


          if(
            !subjectMap[subject]
          ){

            subjectMap[subject] =
              [];
          }


          subjectMap[subject]
            .push(number);

        }
      );

    }
  );


  const avg =
    average(totals);


  const med =
    median(totals);


  const max =
    Math.max(
      ...totals
    );


  const min =
    Math.min(
      ...totals
    );


  const subjectRows =
    Object.entries(
      subjectMap
    )
    .map(
      ([subject,values]) => {

        return `

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
              ${Math.max(...values)}
            </td>

            <td>
              ${Math.min(...values)}
            </td>

            <td>
              ${values.length}
            </td>

          </tr>

        `;
      }
    )
    .join("");


  const gradeMap = {};


  rows.forEach(
    row => {

      const user =
        userData[row.uid] ||
        {};


      const grade =
        user.grade ||
        "未設定";


      if(!gradeMap[grade]){

        gradeMap[grade] =
          [];
      }


      gradeMap[grade]
        .push(
          Number(row.total)
        );

    }
  );


  const gradeRows =
    Object.entries(
      gradeMap
    )
    .map(
      ([grade,values]) => `

        <tr>

          <td>
            ${escapeHtml(grade)}
          </td>

          <td>
            ${values.length}
          </td>

          <td>
            ${average(values).toFixed(1)}
          </td>

        </tr>

      `
    )
    .join("");


  const blockMap = {};


  rows.forEach(
    row => {

      const user =
        userData[row.uid] ||
        {};


      const block =
        user.block ||
        "未設定";


      if(!blockMap[block]){

        blockMap[block] =
          [];
      }


      blockMap[block]
        .push(
          Number(row.total)
        );

    }
  );


  const blockRows =
    Object.entries(
      blockMap
    )
    .map(
      ([block,values]) => `

        <tr>

          <td>
            ${escapeHtml(block)}
          </td>

          <td>
            ${values.length}
          </td>

          <td>
            ${average(values).toFixed(1)}
          </td>

        </tr>

      `
    )
    .join("");


  area.innerHTML = `

    <div class="analysis-grid">

      <div class="card">

        <h3>
          提出件数
        </h3>

        <strong class="analysis-number">
          ${rows.length}件
        </strong>

      </div>


      <div class="card">

        <h3>
          平均点
        </h3>

        <strong class="analysis-number">
          ${avg.toFixed(1)}点
        </strong>

      </div>


      <div class="card">

        <h3>
          中央値
        </h3>

        <strong class="analysis-number">
          ${med.toFixed(1)}点
        </strong>

      </div>


      <div class="card">

        <h3>
          最高点
        </h3>

        <strong class="analysis-number">
          ${max}点
        </strong>

      </div>


      <div class="card">

        <h3>
          最低点
        </h3>

        <strong class="analysis-number">
          ${min}点
        </strong>

      </div>

    </div>


    <div class="card">

      <h2>
        教科別分析
      </h2>

      <div class="table-wrap">

        <table class="data-table">

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

            ${
              subjectRows ||

              `<tr>
                <td colspan="6">
                  データなし
                </td>
              </tr>`
            }

          </tbody>

        </table>

      </div>

    </div>


    <div class="analysis-grid">

      <div class="card">

        <h2>
          学年別分析
        </h2>

        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>

                <th>学年</th>
                <th>提出数</th>
                <th>平均</th>

              </tr>

            </thead>

            <tbody>

              ${
                gradeRows ||

                `<tr>
                  <td colspan="3">
                    データなし
                  </td>
                </tr>`
              }

            </tbody>

          </table>

        </div>

      </div>


      <div class="card">

        <h2>
          ブロック別分析
        </h2>

        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>

                <th>ブロック</th>
                <th>提出数</th>
                <th>平均</th>

              </tr>

            </thead>

            <tbody>

              ${
                blockRows ||

                `<tr>
                  <td colspan="3">
                    データなし
                  </td>
                </tr>`
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>

  `;

};


window.loadScoreAnalysis =
loadScoreAnalysis;
