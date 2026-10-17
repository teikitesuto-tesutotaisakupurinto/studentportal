import {
  auth,
  db
} from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


let allScores = [];

let allUsers = [];

let allForms = [];

let testList = [];

let selectedTestId = "";


/* =====================================================
   共通
===================================================== */

function escapeHtml(value){

  return String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[c])
  );

}


function numberValue(value){

  if(
    typeof value === "number" &&
    Number.isFinite(value)
  ){

    return value;

  }


  if(
    typeof value === "string" &&
    value.trim() !== ""
  ){

    const n = Number(value);

    if(Number.isFinite(n)){
      return n;
    }

  }


  return null;

}


function average(values){

  if(!values.length){
    return 0;
  }

  return values.reduce(
    (sum,value) => sum + value,
    0
  ) / values.length;

}


function median(values){

  if(!values.length){
    return 0;
  }


  const sorted =
    [...values].sort(
      (a,b) => a - b
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
    sorted[middle - 1] +
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
    values.reduce(
      (sum,value) =>
        sum +
        Math.pow(
          value - avg,
          2
        ),
      0
    ) / values.length;


  return Math.sqrt(
    variance
  );

}


function formatNumber(value){

  if(
    !Number.isFinite(value)
  ){

    return "-";

  }


  return Number(
    value.toFixed(1)
  ).toLocaleString("ja-JP");

}


/* =====================================================
   ユーザー
===================================================== */

function getUser(score){

  return allUsers.find(
    user =>
      user.id === score.uid
  ) || {};

}


/* =====================================================
   テスト名
===================================================== */

function getTestName(score){

  return String(
    score.testName ||
    score.formId ||
    "名称未設定"
  );

}


function getTestKey(score){

  if(score.formId){

    return "form:" +
      String(score.formId);

  }


  return "name:" +
    getTestName(score);

}


/* =====================================================
   テスト一覧
===================================================== */

function createTestList(){

  const map =
    new Map();


  /*
   * scoreFormsから登録
   */

  allForms.forEach(
    form => {

      map.set(
        "form:" + form.id,
        {
          id:
            "form:" + form.id,

          formId:
            form.id,

          name:
            form.title ||
            "名称未設定",

          count:0
        }
      );

    }
  );


  /*
   * scoresからも登録
   */

  allScores.forEach(
    score => {

      const key =
        getTestKey(score);


      if(!map.has(key)){

        map.set(
          key,
          {

            id:key,

            formId:
              score.formId || "",

            name:
              getTestName(score),

            count:0

          }
        );

      }


      map.get(key).count++;

    }
  );


  testList =
    Array.from(
      map.values()
    ).sort(
      (a,b) =>
        a.name.localeCompare(
          b.name,
          "ja"
        )
    );

}


/* =====================================================
   セレクト
===================================================== */

function renderTestSelect(){

  const select =
    document.getElementById(
      "testSelect"
    );


  if(!select){
    return;
  }


  select.innerHTML = `

    <option value="">
      テストを選択してください
    </option>

    ${
      testList.map(
        test => `

          <option
            value="${escapeHtml(test.id)}"
          >

            ${escapeHtml(test.name)}

            （${test.count}件提出）

          </option>

        `
      ).join("")
    }

  `;


  if(
    selectedTestId
  ){

    select.value =
      selectedTestId;

  }

}


/* =====================================================
   選択テストの成績
===================================================== */

function getSelectedScores(){

  if(!selectedTestId){
    return [];
  }


  const test =
    testList.find(
      item =>
        item.id ===
        selectedTestId
    );


  if(!test){
    return [];
  }


  return allScores.filter(
    score => {

      if(test.formId){

        return String(
          score.formId || ""
        ) === String(
          test.formId
        );

      }


      return (
        !score.formId &&
        getTestName(score) ===
          test.name
      );

    }
  );

}


/* =====================================================
   全体
===================================================== */

function renderOverview(scores){

  const values =
    scores
      .map(
        score =>
          numberValue(score.total)
      )
      .filter(
        value =>
          value !== null
      );


  const studentCount =
    new Set(
      scores
        .map(
          score =>
            score.uid
        )
        .filter(Boolean)
    ).size;


  const avg =
    average(values);


  const med =
    median(values);


  const max =
    values.length
      ? Math.max(...values)
      : 0;


  const min =
    values.length
      ? Math.min(...values)
      : 0;


  const sd =
    standardDeviation(values);


  return `

    <div class="card">

      <h2>
        全体分析
      </h2>


      <div class="analysis-grid">


        <div class="card">

          <h3>
            提出件数
          </h3>

          <strong>
            ${scores.length}件
          </strong>

        </div>


        <div class="card">

          <h3>
            提出者数
          </h3>

          <strong>
            ${studentCount}人
          </strong>

        </div>


        <div class="card">

          <h3>
            平均点
          </h3>

          <strong>
            ${formatNumber(avg)}点
          </strong>

        </div>


        <div class="card">

          <h3>
            中央値
          </h3>

          <strong>
            ${formatNumber(med)}点
          </strong>

        </div>


        <div class="card">

          <h3>
            最高点
          </h3>

          <strong>
            ${formatNumber(max)}点
          </strong>

        </div>


        <div class="card">

          <h3>
            最低点
          </h3>

          <strong>
            ${formatNumber(min)}点
          </strong>

        </div>


        <div class="card">

          <h3>
            標準偏差
          </h3>

          <strong>
            ${formatNumber(sd)}
          </strong>

        </div>


      </div>

    </div>

  `;

}


/* =====================================================
   教科別
===================================================== */

function renderSubjectAnalysis(scores){

  const subjectMap = {};


  scores.forEach(
    score => {

      Object.entries(
        score.subjects || {}
      ).forEach(
        ([subject,value]) => {

          const n =
            numberValue(value);


          if(n === null){
            return;
          }


          if(
            !subjectMap[subject]
          ){

            subjectMap[subject] =
              [];

          }


          subjectMap[subject].push(n);

        }
      );

    }
  );


  const rows =
    Object.entries(
      subjectMap
    )
    .sort(
      (a,b) =>
        average(b[1]) -
        average(a[1])
    )
    .map(
      ([subject,values]) => `

        <tr>

          <td>
            ${escapeHtml(subject)}
          </td>

          <td>
            ${formatNumber(
              average(values)
            )}
          </td>

          <td>
            ${formatNumber(
              median(values)
            )}
          </td>

          <td>
            ${Math.max(...values)}
          </td>

          <td>
            ${Math.min(...values)}
          </td>

          <td>
            ${formatNumber(
              standardDeviation(values)
            )}
          </td>

          <td>
            ${values.length}
          </td>

        </tr>

      `
    )
    .join("");


  return `

    <div class="card">

      <h2>
        教科別詳細分析
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

              <th>標準偏差</th>

              <th>提出数</th>

            </tr>

          </thead>


          <tbody>

            ${
              rows ||

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

  `;

}


/* =====================================================
   学年
===================================================== */

function renderGradeAnalysis(scores){

  const groups = {};


  scores.forEach(
    score => {

      const user =
        getUser(score);


      const grade =
        user.grade ||
        score.grade ||
        "未設定";


      const total =
        numberValue(score.total);


      if(total === null){
        return;
      }


      if(!groups[grade]){
        groups[grade] = [];
      }


      groups[grade].push(
        total
      );

    }
  );


  const rows =
    Object.entries(groups)
      .sort(
        (a,b) =>
          average(b[1]) -
          average(a[1])
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
              ${formatNumber(
                average(values)
              )}
            </td>

            <td>
              ${formatNumber(
                median(values)
              )}
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


  return `

    <div class="card">

      <h2>
        学年別詳細
      </h2>


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
              rows ||

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

  `;

}


/* =====================================================
   ブロック
===================================================== */

function renderBlockAnalysis(scores){

  const groups = {};


  scores.forEach(
    score => {

      const user =
        getUser(score);


      const block =
        user.block ||
        score.block ||
        "未設定";


      const total =
        numberValue(score.total);


      if(total === null){
        return;
      }


      if(!groups[block]){
        groups[block] = [];
      }


      groups[block].push(
        total
      );

    }
  );


  const rows =
    Object.entries(groups)
      .sort(
        (a,b) =>
          average(b[1]) -
          average(a[1])
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
              ${formatNumber(
                average(values)
              )}
            </td>

            <td>
              ${formatNumber(
                median(values)
              )}
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


  return `

    <div class="card">

      <h2>
        ブロック別詳細
      </h2>


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
              rows ||

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

  `;

}


/* =====================================================
   生徒別
===================================================== */

function renderStudentAnalysis(scores){

  const groups = {};


  scores.forEach(
    score => {

      const user =
        getUser(score);


      const key =
        score.uid ||
        score.name ||
        score.id;


      if(!groups[key]){

        groups[key] = {

          name:
            score.name ||
            user.name ||
            "氏名未登録",

          grade:
            user.grade ||
            score.grade ||
            "未設定",

          block:
            user.block ||
            score.block ||
            "未設定",

          scores:[]

        };

      }


      const total =
        numberValue(
          score.total
        );


      if(total !== null){

        groups[key]
          .scores
          .push(total);

      }

    }
  );


  const rows =
    Object.values(groups)
      .sort(
        (a,b) =>
          average(b.scores) -
          average(a.scores)
      )
      .map(
        (student,index) => `

          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHtml(
                student.name
              )}
            </td>

            <td>
              ${escapeHtml(
                student.grade
              )}
            </td>

            <td>
              ${escapeHtml(
                student.block
              )}
            </td>

            <td>
              ${student.scores.length}
            </td>

            <td>
              ${formatNumber(
                average(
                  student.scores
                )
              )}
            </td>

            <td>
              ${formatNumber(
                median(
                  student.scores
                )
              )}
            </td>

            <td>
              ${Math.max(
                ...student.scores
              )}
            </td>

            <td>
              ${Math.min(
                ...student.scores
              )}
            </td>

            <td>
              ${formatNumber(
                standardDeviation(
                  student.scores
                )
              )}
            </td>

          </tr>

        `
      )
      .join("");


  return `

    <div class="card">

      <h2>
        生徒別詳細
      </h2>


      <div class="table-wrap">

        <table class="data-table">

          <thead>

            <tr>

              <th>順位</th>
              <th>生徒</th>
              <th>学年</th>
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
              rows ||

              `
                <tr>
                  <td colspan="10">
                    データなし
                  </td>
                </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>

  `;

}


/* =====================================================
   得点分布
===================================================== */

function renderDistribution(scores){

  const values =
    scores
      .map(
        score =>
          numberValue(score.total)
      )
      .filter(
        value =>
          value !== null
      );


  if(!values.length){

    return `

      <div class="card">

        <h2>
          総得点の分布
        </h2>

        <p>
          データなし
        </p>

      </div>

    `;

  }


  const ranges = [];


  /*
   * 100点以下なら10点刻み
   */

  if(
    Math.max(...values) <= 100
  ){

    for(
      let start = 0;
      start < 100;
      start += 10
    ){

      ranges.push({

        min:start,

        max:start + 10,

        label:
          `${start}～${start + 9}`

      });

    }


    ranges.push({

      min:100,

      max:Infinity,

      label:"100"

    });

  }else{

    const step =
      Math.ceil(
        Math.max(...values) / 10
      );


    for(
      let start = 0;
      start <= Math.max(...values);
      start += step
    ){

      ranges.push({

        min:start,

        max:start + step,

        label:
          `${start}～${start + step - 1}`

      });

    }

  }


  return `

    <div class="card">

      <h2>
        総得点の分布
      </h2>


      <div class="distribution">

        ${
          ranges.map(
            range => {

              const count =
                values.filter(
                  value =>
                    value >= range.min &&
                    value < range.max
                ).length;


              return `

                <div>

                  <span>
                    ${range.label}
                  </span>

                  <strong>
                    ${count}
                  </strong>

                </div>

              `;

            }
          ).join("")
        }

      </div>

    </div>

  `;

}


/* =====================================================
   提出・再回答
===================================================== */

function renderSubmissionManagement(
  scores
){

  const area =
    document.getElementById(
      "scoreSubmissionList"
    );


  if(!area){
    return;
  }


  if(!selectedTestId){

    area.innerHTML = `

      テストを選択すると、
      そのテストの提出状況が表示されます。

    `;

    return;

  }


  if(!scores.length){

    area.innerHTML = `

      <p>
        このテストの提出はありません。
      </p>

    `;

    return;

  }


  area.innerHTML = `

    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>

            <th>生徒</th>
            <th>合計</th>
            <th>平均</th>
            <th>提出日時</th>
            <th>状態</th>
            <th>操作</th>

          </tr>

        </thead>


        <tbody>

          ${
            scores.map(
              score => {

                const user =
                  getUser(score);


                const name =
                  score.name ||
                  user.name ||
                  "氏名未登録";


                const date =
                  score.createdAt?.toDate
                    ? score.createdAt
                        .toDate()
                        .toLocaleString(
                          "ja-JP"
                        )
                    : "-";


                const allowed =
                  score.resubmitAllowed === true;


                return `

                  <tr>

                    <td>
                      ${escapeHtml(name)}
                    </td>

                    <td>
                      ${escapeHtml(
                        score.total ?? "-"
                      )}点
                    </td>

                    <td>
                      ${escapeHtml(
                        score.average ?? "-"
                      )}点
                    </td>

                    <td>
                      ${escapeHtml(date)}
                    </td>

                    <td>

                      ${
                        allowed
                          ? "再回答許可中"
                          : "再回答不可"
                      }

                    </td>

                    <td>

                      ${
                        allowed

                        ? `

                          <button
                            type="button"
                            onclick="denyScoreResubmit('${score.id}')"
                          >
                            再回答を禁止
                          </button>

                        `

                        : `

                          <button
                            type="button"
                            onclick="allowScoreResubmit('${score.id}')"
                          >
                            再回答を許可
                          </button>

                        `

                      }

                    </td>

                  </tr>

                `;

              }
            ).join("")
          }

        </tbody>

      </table>

    </div>

  `;

}


/* =====================================================
   選択テスト表示
===================================================== */

function renderSelectedTest(){

  const area =
    document.getElementById(
      "analysisArea"
    );


  const selectedArea =
    document.getElementById(
      "selectedTestArea"
    );


  if(!selectedTestId){

    if(selectedArea){

      selectedArea.innerHTML = "";

    }


    if(area){

      area.innerHTML = `

        <div class="card">

          <p>
            分析するテストを選択してください。
          </p>

        </div>

      `;

    }


    renderSubmissionManagement([]);

    return;

  }


  const test =
    testList.find(
      item =>
        item.id === selectedTestId
    );


  if(!test){

    return;

  }


  const scores =
    getSelectedScores();


  if(selectedArea){

    selectedArea.innerHTML = `

      <div class="card">

        <h2>
          ${escapeHtml(test.name)}
        </h2>

        <p>
          このテストだけの成績を
          表示しています。
        </p>

      </div>

    `;

  }


  if(!scores.length){

    if(area){

      area.innerHTML = `

        <div class="card">

          <h2>
            ${escapeHtml(test.name)}
          </h2>

          <p>
            このテストの提出データは
            まだありません。
          </p>

        </div>

      `;

    }


    renderSubmissionManagement([]);

    return;

  }


  if(area){

    area.innerHTML = [

      renderOverview(scores),

      renderSubjectAnalysis(scores),

      renderDistribution(scores),

      renderGradeAnalysis(scores),

      renderBlockAnalysis(scores),

      renderStudentAnalysis(scores)

    ].join("");

  }


  renderSubmissionManagement(
    scores
  );

}


/* =====================================================
   テスト変更
===================================================== */

async function changeAnalysisTest(
  testId
){

  selectedTestId =
    String(testId || "");


  renderSelectedTest();

}


export {
  changeAnalysisTest
};


/* =====================================================
   再回答許可
===================================================== */

window.allowScoreResubmit =
  async function(scoreId){

    try{

      await updateDoc(
        doc(
          db,
          "scores",
          scoreId
        ),
        {

          resubmitAllowed:true,

          resubmitAllowedAt:
            serverTimestamp(),

          resubmitAllowedBy:
            auth.currentUser?.uid || ""

        }
      );


      await refreshSelectedTest();


    }catch(error){

      console.error(error);

      alert(
        "再回答を許可できませんでした。\n" +
        error.message
      );

    }

  };


/* =====================================================
   再回答禁止
===================================================== */

window.denyScoreResubmit =
  async function(scoreId){

    try{

      await updateDoc(
        doc(
          db,
          "scores",
          scoreId
        ),
        {
          resubmitAllowed:false
        }
      );


      await refreshSelectedTest();


    }catch(error){

      console.error(error);

      alert(
        "再回答を禁止できませんでした。\n" +
        error.message
      );

    }

  };


/* =====================================================
   再読み込み
===================================================== */

async function refreshSelectedTest(){

  const snap =
    await getDocs(
      collection(
        db,
        "scores"
      )
    );


  allScores = [];


  snap.forEach(
    item => {

      allScores.push({

        id:item.id,

        ...item.data()

      });

    }
  );


  createTestList();

  renderTestSelect();

  renderSelectedTest();

}


/* =====================================================
   初期読み込み
===================================================== */

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

    /*
     * 成績
     */

    const scoreSnap =
      await getDocs(
        collection(
          db,
          "scores"
        )
      );


    allScores = [];


    scoreSnap.forEach(
      item => {

        allScores.push({

          id:item.id,

          ...item.data()

        });

      }
    );


    /*
     * ユーザー
     */

    const userSnap =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    allUsers = [];


    userSnap.forEach(
      item => {

        allUsers.push({

          id:item.id,

          ...item.data()

        });

      }
    );


    /*
     * 成績フォーム
     */

    try{

      const formSnap =
        await getDocs(
          collection(
            db,
            "scoreForms"
          )
        );


      allForms = [];


      formSnap.forEach(
        item => {

          allForms.push({

            id:item.id,

            ...item.data()

          });

        }
      );


    }catch(error){

      console.warn(
        "scoreForms取得をスキップ:",
        error
      );

      allForms = [];

    }


    /*
     * テスト一覧
     */

    createTestList();

    renderTestSelect();


    const select =
      document.getElementById(
        "testSelect"
      );


    if(select){

      select.addEventListener(
        "change",
        event => {

          changeAnalysisTest(
            event.target.value
          );

        }
      );

    }


    selectedTestId = "";

    renderSelectedTest();


  }catch(error){

    console.error(
      "成績分析読み込みエラー:",
      error
    );


    area.innerHTML = `

      <div class="card error">

        <h2>
          成績分析を読み込めませんでした。
        </h2>

        <p>
          Firestoreから成績データを
          取得できませんでした。
        </p>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>

    `;

  }

}


window.loadScoreAnalysis =
  loadScoreAnalysis;


window.changeAnalysisTest =
  changeAnalysisTest;
