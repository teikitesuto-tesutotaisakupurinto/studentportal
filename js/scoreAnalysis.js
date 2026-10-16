import { db } from "./firebase.js";

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
      (a,b) => a + b,
      0
    )
    /
    values.length
  );

}


function median(values){

  if(!values.length){

    return 0;

  }


  const sorted =
    [...values]
      .sort(
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
    sorted[middle-1]
    +
    sorted[middle]
  ) / 2;

}


function standardDeviation(values){

  if(values.length < 2){

    return 0;

  }


  const avg =
    average(values);


  const variance =
    average(
      values.map(
        value =>
          Math.pow(
            value - avg,
            2
          )
      )
    );


  return Math.sqrt(
    variance
  );

}


function createStats(values){

  if(!values.length){

    return {

      count:0,

      average:0,

      median:0,

      max:0,

      min:0,

      sd:0

    };

  }


  return {

    count:
      values.length,

    average:
      average(values),

    median:
      median(values),

    max:
      Math.max(...values),

    min:
      Math.min(...values),

    sd:
      standardDeviation(values)

  };

}


function statsRow(
  name,
  values
){

  const s =
    createStats(values);


  return `

    <tr>

      <td>
        ${escapeHtml(name)}
      </td>

      <td>
        ${s.count}
      </td>

      <td>
        ${s.average.toFixed(1)}
      </td>

      <td>
        ${s.median.toFixed(1)}
      </td>

      <td>
        ${s.max}
      </td>

      <td>
        ${s.min}
      </td>

      <td>
        ${s.sd.toFixed(1)}
      </td>

    </tr>

  `;

}


export async function buildScoreAnalysis(){

  const [
    scoreSnap,
    userSnap
  ] =
    await Promise.all([

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


  userSnap.forEach(
    item => {

      users[item.id] =
        item.data();

    }
  );


  const scores = [];


  scoreSnap.forEach(
    item => {

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

    }
  );


  const totals =
    scores.map(
      s => Number(s.total)
    );


  const overall =
    createStats(
      totals
    );


  const subjects = {};

  const grades = {};

  const blocks = {};

  const tests = {};

  const students = {};


  scores.forEach(
    score => {

      const user =
        users[score.uid]
        || {};


      Object.entries(
        score.subjects || {}
      )
      .forEach(
        ([subject,value]) => {

          const number =
            Number(value);


          if(
            !Number.isFinite(
              number
            )
          ){

            return;

          }


          if(
            !subjects[subject]
          ){

            subjects[subject] =
              [];

          }


          subjects[subject]
            .push(number);

        }
      );


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


      if(!blocks[block]){

        blocks[block] = [];

      }


      if(!tests[test]){

        tests[test] = [];

      }


      grades[grade]
        .push(score.total);


      blocks[block]
        .push(score.total);


      tests[test]
        .push(score.total);


      const studentKey =
        score.uid ||
        score.name ||
        score.id;


      if(
        !students[studentKey]
      ){

        students[studentKey] = {

          name:
            score.name ||
            user.name ||
            "未設定",

          scores:[]

        };

      }


      students[studentKey]
        .scores
        .push(score.total);

    }
  );


  const subjectRows =
    Object.entries(
      subjects
    )
    .sort(
      (a,b) =>
        average(b[1])
        -
        average(a[1])
    )
    .map(
      ([name,values]) =>
        statsRow(
          name,
          values
        )
    )
    .join("");


  const gradeRows =
    Object.entries(
      grades
    )
    .map(
      ([name,values]) =>
        statsRow(
          name,
          values
        )
    )
    .join("");


  const blockRows =
    Object.entries(
      blocks
    )
    .map(
      ([name,values]) =>
        statsRow(
          name,
          values
        )
    )
    .join("");


  const testRows =
    Object.entries(
      tests
    )
    .map(
      ([name,values]) =>
        statsRow(
          name,
          values
        )
    )
    .join("");


  const studentRows =
    Object.values(
      students
    )
    .sort(
      (a,b) =>
        average(b.scores)
        -
        average(a.scores)
    )
    .map(
      student => {

        const s =
          createStats(
            student.scores
          );


        return `

          <tr>

            <td>
              ${escapeHtml(
                student.name
              )}
            </td>

            <td>
              ${s.count}
            </td>

            <td>
              ${s.average.toFixed(1)}
            </td>

            <td>
              ${s.median.toFixed(1)}
            </td>

            <td>
              ${s.max}
            </td>

            <td>
              ${s.min}
            </td>

            <td>
              ${s.sd.toFixed(1)}
            </td>

          </tr>

        `;

      }
    )
    .join("");


  /*
   * 得点分布
   */

  const distribution =
    Array(11).fill(0);


  totals.forEach(
    total => {

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

    }
  );


  const distributionHtml =
    distribution
      .map(
        (count,index) => `

          <div
            class="distribution-item"
          >

            <span>

              ${
                index === 10

                  ?

                  "100"

                  :

                  `${index*10}〜${index*10+9}`

              }

            </span>


            <strong>
              ${count}
            </strong>

            <small>
              件
            </small>

          </div>

        `
      )
      .join("");


  return `

    <div class="analysis-grid">


      <div class="card">

        <h3>
          提出件数
        </h3>

        <div class="analysis-number">
          ${overall.count}
        </div>

      </div>


      <div class="card">

        <h3>
          提出者数
        </h3>

        <div class="analysis-number">
          ${
            new Set(
              scores.map(
                s => s.uid
              )
            ).size
          }
        </div>

      </div>


      <div class="card">

        <h3>
          全体平均
        </h3>

        <div class="analysis-number">
          ${overall.average.toFixed(1)}
        </div>

      </div>


      <div class="card">

        <h3>
          中央値
        </h3>

        <div class="analysis-number">
          ${overall.median.toFixed(1)}
        </div>

      </div>


      <div class="card">

        <h3>
          最高点
        </h3>

        <div class="analysis-number">
          ${overall.max}
        </div>

      </div>


      <div class="card">

        <h3>
          最低点
        </h3>

        <div class="analysis-number">
          ${overall.min}
        </div>

      </div>


      <div class="card">

        <h3>
          標準偏差
        </h3>

        <div class="analysis-number">
          ${overall.sd.toFixed(1)}
        </div>

      </div>


    </div>


    <div class="card">

      <h2>
        教科別詳細分析
      </h2>


      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>

              <th>教科</th>

              <th>提出数</th>

              <th>平均</th>

              <th>中央値</th>

              <th>最高</th>

              <th>最低</th>

              <th>標準偏差</th>

            </tr>

          </thead>


          <tbody>

            ${
              subjectRows
              ||

              `<tr>
                <td colspan="7">
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
          学年別
        </h2>


        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>

                <th>学年</th>
                <th>提出数</th>
                <th>平均</th>
                <th>中央値</th>
                <th>最高</th>
                <th>最低</th>
                <th>標準偏差</th>

              </tr>

            </thead>


            <tbody>

              ${
                gradeRows
                ||

                `<tr>
                  <td colspan="7">
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
          ブロック別
        </h2>


        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>

                <th>ブロック</th>
                <th>提出数</th>
                <th>平均</th>
                <th>中央値</th>
                <th>最高</th>
                <th>最低</th>
                <th>標準偏差</th>

              </tr>

            </thead>


            <tbody>

              ${
                blockRows
                ||

                `<tr>
                  <td colspan="7">
                    データなし
                  </td>
                 </tr>`
              }

            </tbody>

          </table>

        </div>

      </div>


    </div>


    <div class="card">

      <h2>
        テスト別分析
      </h2>


      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>

              <th>テスト</th>
              <th>提出数</th>
              <th>平均</th>
              <th>中央値</th>
              <th>最高</th>
              <th>最低</th>
              <th>標準偏差</th>

            </tr>

          </thead>


          <tbody>

            ${
              testRows
              ||

              `<tr>
                <td colspan="7">
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
        生徒別詳細
      </h2>


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
              <th>標準偏差</th>

            </tr>

          </thead>


          <tbody>

            ${
              studentRows
              ||

              `<tr>
                <td colspan="7">
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
        総得点の分布
      </h2>


      <div class="distribution">

        ${distributionHtml}

      </div>

    </div>

  `;

}


window.loadScoreAnalysis =
async function(){

  const area =
    document.getElementById(
      "analysisArea"
    );


  if(!area) return;


  area.innerHTML = `

    <div class="card">

      成績分析を読み込んでいます。

    </div>

  `;


  try{

    area.innerHTML =
      await buildScoreAnalysis();


  }catch(error){

    console.error(
      "成績分析エラー:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        成績分析を読み込めませんでした。

        <br><br>

        ${escapeHtml(
          error.message
        )}

      </div>

    `;

  }

};
