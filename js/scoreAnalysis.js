import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

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

  if(!values.length){
    return 0;
  }

  return (
    values.reduce(
      (a,b)=>a+b,
      0
    ) /
    values.length
  );

}

function median(values){

  if(!values.length){
    return 0;
  }

  const sorted =
    [...values].sort(
      (a,b)=>a-b
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

function standardDeviation(values){

  if(!values.length){
    return 0;
  }

  const avg =
    average(values);

  const variance =
    average(
      values.map(
        value =>
          Math.pow(
            value-avg,
            2
          )
      )
    );

  return Math.sqrt(
    variance
  );

}

export async function buildScoreAnalysis(){

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

  const users = {};

  userSnap.forEach(item=>{

    users[item.id] =
      item.data();

  });

  const scores = [];

  scoreSnap.forEach(item=>{

    const data =
      item.data();

    if(
      typeof data.total ===
      "number"
    ){

      scores.push({
        id:item.id,
        ...data
      });

    }

  });

  if(!scores.length){

    return `
      <div class="card">
        成績データがありません。
      </div>
    `;

  }

  const totals =
    scores.map(
      score =>
        Number(score.total) || 0
    );

  const overallAverage =
    average(totals);

  const overallMedian =
    median(totals);

  const overallMax =
    Math.max(...totals);

  const overallMin =
    Math.min(...totals);

  const overallSD =
    standardDeviation(
      totals
    );

  /* 教科 */

  const subjects = {};

  scores.forEach(score=>{

    Object.entries(
      score.subjects || {}
    ).forEach(
      ([name,value])=>{

        const n =
          Number(value);

        if(!Number.isFinite(n)){
          return;
        }

        if(!subjects[name]){

          subjects[name] = [];

        }

        subjects[name].push(n);

      }
    );

  });

  const subjectRows =
    Object.entries(subjects)
      .sort(
        (a,b)=>
          average(b[1]) -
          average(a[1])
      )
      .map(
        ([name,values])=>{

          const avg =
            average(values);

          return `

            <tr>

              <td>
                ${escapeHtml(name)}
              </td>

              <td>
                ${avg.toFixed(1)}
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
                ${standardDeviation(values).toFixed(1)}
              </td>

              <td>
                ${values.length}
              </td>

            </tr>

          `;

        }
      )
      .join("");

  /* 学年 */

  const grades = {};

  /* ブロック */

  const blocks = {};

  /* テスト */

  const tests = {};

  /* 生徒 */

  const students = {};

  scores.forEach(score=>{

    const user =
      users[score.uid] || {};

    const total =
      Number(score.total) || 0;

    const grade =
      user.grade ||
      "未設定";

    const block =
      user.block ||
      "未設定";

    const test =
      score.testName ||
      score.formId ||
      "未設定";

    if(!grades[grade]){
      grades[grade] = [];
    }

    grades[grade].push(total);

    if(!blocks[block]){
      blocks[block] = [];
    }

    blocks[block].push(total);

    if(!tests[test]){
      tests[test] = [];
    }

    tests[test].push(total);

    const studentId =
      score.uid ||
      score.name ||
      score.id;

    if(!students[studentId]){

      students[studentId] = {

        name:
          score.name ||
          user.name ||
          "未設定",

        scores:[]

      };

    }

    students[
      studentId
    ].scores.push(total);

  });

  function groupRows(group){

    return Object.entries(group)
      .sort(
        (a,b)=>
          average(b[1]) -
          average(a[1])
      )
      .map(
        ([name,values])=>`

          <tr>

            <td>
              ${escapeHtml(name)}
            </td>

            <td>
              ${values.length}
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

          </tr>

        `
      )
      .join("");

  }

  const studentRows =
    Object.values(students)
      .sort(
        (a,b)=>
          average(b.scores) -
          average(a.scores)
      )
      .map(
        student=>`

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
              ${median(student.scores).toFixed(1)}
            </td>

            <td>
              ${Math.max(...student.scores)}
            </td>

            <td>
              ${Math.min(...student.scores)}
            </td>

            <td>
              ${standardDeviation(student.scores).toFixed(1)}
            </td>

          </tr>

        `
      )
      .join("");

  /* 得点分布 */

  const distribution =
    Array(11).fill(0);

  totals.forEach(total=>{

    const index =
      Math.max(
        0,
        Math.min(
          10,
          Math.floor(
            total / 10
          )
        )
      );

    distribution[index]++;

  });

  return `

    <div class="analysis-grid">

      <div class="card">

        <h3>全体分析</h3>

        <p>
          提出件数：
          <strong>
            ${scores.length}件
          </strong>
        </p>

        <p>
          平均：
          <strong>
            ${overallAverage.toFixed(1)}点
          </strong>
        </p>

        <p>
          中央値：
          <strong>
            ${overallMedian.toFixed(1)}点
          </strong>
        </p>

        <p>
          最高：
          <strong>
            ${overallMax}点
          </strong>
        </p>

        <p>
          最低：
          <strong>
            ${overallMin}点
          </strong>
        </p>

        <p>
          標準偏差：
          <strong>
            ${overallSD.toFixed(1)}
          </strong>
        </p>

        <p>
          提出者数：
          <strong>
            ${new Set(
              scores.map(
                score=>score.uid
              )
            ).size}人
          </strong>
        </p>

      </div>

      <div class="card">

        <h3>最高・最低差</h3>

        <p>
          ${overallMax - overallMin}点
        </p>

      </div>

    </div>

    <div class="card">

      <h3>
        教科別詳細分析
      </h3>

      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>
              <th>教科</th>
              <th>平均</th>
              <th>中央値</th>
              <th>最高</th>
              <th>最低</th>
              <th>標準偏差</th>
              <th>提出数</th>
            </tr>

          </thead>

          <tbody>

            ${
              subjectRows ||
              `
                <tr>
                  <td colspan="7">
                    データなし
                  </td>
                </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>

    <div class="card">

      <h3>
        学年別詳細
      </h3>

      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>
              <th>学年</th>
              <th>件数</th>
              <th>平均</th>
              <th>中央値</th>
              <th>最高</th>
              <th>最低</th>
            </tr>

          </thead>

          <tbody>

            ${
              groupRows(grades) ||
              `
                <tr>
                  <td colspan="6">
                    データなし
                  </td>
                </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>

    <div class="card">

      <h3>
        ブロック別詳細
      </h3>

      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>
              <th>ブロック</th>
              <th>件数</th>
              <th>平均</th>
              <th>中央値</th>
              <th>最高</th>
              <th>最低</th>
            </tr>

          </thead>

          <tbody>

            ${
              groupRows(blocks) ||
              `
                <tr>
                  <td colspan="6">
                    データなし
                  </td>
                </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>

    <div class="card">

      <h3>
        テスト別詳細
      </h3>

      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>
              <th>テスト</th>
              <th>件数</th>
              <th>平均</th>
              <th>中央値</th>
              <th>最高</th>
              <th>最低</th>
            </tr>

          </thead>

          <tbody>

            ${
              groupRows(tests) ||
              `
                <tr>
                  <td colspan="6">
                    データなし
                  </td>
                </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>

    <div class="card">

      <h3>
        生徒別詳細
      </h3>

      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>
              <th>生徒</th>
              <th>提出数</th>
              <th>平均</th>
              <th>中央値</th>
              <th>最高</th>
              <th>最低</th>
              <th>ばらつき</th>
            </tr>

          </thead>

          <tbody>

            ${
              studentRows ||
              `
                <tr>
                  <td colspan="7">
                    データなし
                  </td>
                </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>

    <div class="card">

      <h3>
        総得点の分布
      </h3>

      <div class="distribution">

        ${
          distribution
            .map(
              (count,index)=>`

                <div>

                  <span>
                    ${
                      index === 10
                        ? "100"
                        : `${index*10}〜${index*10+9}`
                    }
                  </span>

                  <strong>
                    ${count}
                  </strong>

                </div>

              `
            )
            .join("")
        }

      </div>

    </div>

  `;

}

export async function loadScoreAnalysis(){

  const area =
    document.getElementById(
      "analysisArea"
    );

  if(!area){
    return;
  }

  area.innerHTML = `
    <div class="card">
      成績分析を読み込んでいます。
    </div>
  `;

  try{

    area.innerHTML =
      await buildScoreAnalysis();

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="card error">
        成績分析を読み込めませんでした。
      </div>
    `;

  }

}

window.loadScoreAnalysis =
  loadScoreAnalysis;
