import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  auth
} from "./firebase.js";

function esc(value){

  return String(value ?? "")
    .replace(/[&<>"']/g,char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[char]));

}

let scores = [];
let users = {};
let tests = [];

async function loadData(){

  const [
    scoreSnap,
    userSnap
  ] = await Promise.all([

    getDocs(
      query(
        collection(
          db,
          "scores"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      )
    ),

    getDocs(
      collection(
        db,
        "users"
      )
    )

  ]);

  scores = [];

  scoreSnap.forEach(item => {

    scores.push({
      id:item.id,
      ...item.data()
    });

  });

  users = {};

  userSnap.forEach(item => {

    users[item.id] =
      item.data();

  });

  const testMap =
    new Map();

  scores.forEach(score => {

    const key =
      score.formId ||
      score.testName ||
      score.id;

    if(!testMap.has(key)){

      testMap.set(
        key,
        {
          id:key,
          name:
            score.testName ||
            key
        }
      );

    }

  });

  tests =
    [...testMap.values()];

  renderTestSelector();

}

function renderTestSelector(){

  const select =
    document.getElementById(
      "testSelector"
    );

  if(!select){
    return;
  }

  select.innerHTML = `

    <option value="">
      テストを選択してください
    </option>

    ${tests.map(test => `

      <option value="${esc(test.id)}">

        ${esc(test.name)}

      </option>

    `).join("")}

  `;

}

function average(values){

  if(!values.length){
    return 0;
  }

  return values.reduce(
    (sum,value) =>
      sum + value,
    0
  ) / values.length;

}

function median(values){

  if(!values.length){
    return 0;
  }

  const sorted =
    [...values].sort(
      (a,b) => a-b
    );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if(sorted.length % 2){

    return sorted[middle];

  }

  return (
    sorted[middle-1] +
    sorted[middle]
  ) / 2;

}

function renderAnalysis(testId){

  const area =
    document.getElementById(
      "analysisArea"
    );

  if(!area){
    return;
  }

  if(!testId){

    area.innerHTML = "";

    return;

  }

  const targetScores =
    scores.filter(score => {

      const key =
        score.formId ||
        score.testName ||
        score.id;

      return key === testId;

    });

  if(!targetScores.length){

    area.innerHTML = `
      <div class="card">
        このテストの提出データはありません。
      </div>
    `;

    return;

  }

  const totals =
    targetScores
      .map(score =>
        Number(score.total)
      )
      .filter(Number.isFinite);

  const subjects = {};

  targetScores.forEach(
    score => {

      Object.entries(
        score.subjects || {}
      ).forEach(
        ([name,value]) => {

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

    }
  );

  const subjectRows =
    Object.entries(
      subjects
    ).map(
      ([name,values]) => `

        <tr>

          <td>
            ${esc(name)}
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

      `
    ).join("");

  const distribution =
    Array(11).fill(0);

  totals.forEach(total => {

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

  const gradeMap = {};
  const blockMap = {};

  targetScores.forEach(score => {

    const user =
      users[score.uid] || {};

    const grade =
      user.grade || "未設定";

    const block =
      user.block || "未設定";

    if(!gradeMap[grade]){
      gradeMap[grade] = [];
    }

    if(!blockMap[block]){
      blockMap[block] = [];
    }

    gradeMap[grade].push(
      Number(score.total) || 0
    );

    blockMap[block].push(
      Number(score.total) || 0
    );

  });

  const groupRows =
    map => Object.entries(map)
      .map(
        ([name,values]) => `

          <tr>

            <td>
              ${esc(name)}
            </td>

            <td>
              ${values.length}
            </td>

            <td>
              ${average(values).toFixed(1)}
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

  area.innerHTML = `

    <div class="analysis-grid">

      <div class="card">

        <h3>提出件数</h3>

        <strong>
          ${targetScores.length}件
        </strong>

      </div>

      <div class="card">

        <h3>提出者数</h3>

        <strong>
          ${new Set(
            targetScores.map(
              score => score.uid
            )
          ).size}人
        </strong>

      </div>

      <div class="card">

        <h3>平均点</h3>

        <strong>
          ${average(totals).toFixed(1)}点
        </strong>

      </div>

      <div class="card">

        <h3>中央値</h3>

        <strong>
          ${median(totals).toFixed(1)}点
        </strong>

      </div>

      <div class="card">

        <h3>最高点</h3>

        <strong>
          ${Math.max(...totals)}点
        </strong>

      </div>

      <div class="card">

        <h3>最低点</h3>

        <strong>
          ${Math.min(...totals)}点
        </strong>

      </div>

    </div>

    <div class="card">

      <h2>教科別詳細</h2>

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

            ${subjectRows ||
              `<tr>
                <td colspan="6">
                  データなし
                </td>
              </tr>`}

          </tbody>

        </table>

      </div>

    </div>

    <div class="analysis-grid">

      <div class="card">

        <h2>学年別</h2>

        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>
                <th>学年</th>
                <th>人数</th>
                <th>平均</th>
                <th>最高</th>
                <th>最低</th>
              </tr>

            </thead>

            <tbody>

              ${groupRows(gradeMap) ||
                `<tr>
                  <td colspan="5">
                    データなし
                  </td>
                </tr>`}

            </tbody>

          </table>

        </div>

      </div>

      <div class="card">

        <h2>ブロック別</h2>

        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>
                <th>ブロック</th>
                <th>人数</th>
                <th>平均</th>
                <th>最高</th>
                <th>最低</th>
              </tr>

            </thead>

            <tbody>

              ${groupRows(blockMap) ||
                `<tr>
                  <td colspan="5">
                    データなし
                  </td>
                </tr>`}

            </tbody>

          </table>

        </div>

      </div>

    </div>

    <div class="card">

      <h2>総得点の分布</h2>

      <div class="distribution">

        ${distribution.map(
          (count,index) => `

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
        ).join("")}

      </div>

    </div>

  `;

}

async function loadSubmissionManagement(){

  const area =
    document.getElementById(
      "scoreSubmissionList"
    );

  if(!area){
    return;
  }

  const sorted =
    [...scores].sort(
      (a,b) =>
        (b.createdAt?.toMillis?.() || 0) -
        (a.createdAt?.toMillis?.() || 0)
    );

  if(!sorted.length){

    area.innerHTML =
      `<p>提出データはありません。</p>`;

    return;

  }

  area.innerHTML =
    sorted.map(score => `

      <div class="card">

        <h3>
          ${esc(score.name || "生徒")}
        </h3>

        <p>
          ${esc(score.testName || "")}
        </p>

        <p>
          合計：
          ${esc(score.total)}点
        </p>

        <p>

          ${
            score.resubmitAllowed === true
              ? "再回答を許可中"
              : "再回答不可"
          }

        </p>

        ${
          score.resubmitAllowed === true

            ? `

              <button
                class="secondary-button"
                data-deny="${score.id}">

                再回答を禁止

              </button>

            `

            : `

              <button
                class="primary-button"
                data-allow="${score.id}">

                再回答を許可

              </button>

            `
        }

      </div>

    `).join("");

  area
    .querySelectorAll(
      "[data-allow]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          setResubmit(
            button.dataset.allow,
            true
          )
      );

    });

  area
    .querySelectorAll(
      "[data-deny]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          setResubmit(
            button.dataset.deny,
            false
          )
      );

    });

}

async function setResubmit(
  scoreId,
  allowed
){

  try{

    await updateDoc(
      doc(
        db,
        "scores",
        scoreId
      ),
      {
        resubmitAllowed:
          allowed,

        resubmitAllowedAt:
          serverTimestamp(),

        resubmitAllowedBy:
          auth.currentUser.uid
      }
    );

    await loadData();

    await loadSubmissionManagement();

  }catch(error){

    console.error(error);

    alert(
      "変更できませんでした。"
    );

  }

}

document
  .getElementById(
    "testSelector"
  )
  ?.addEventListener(
    "change",
    event => {

      renderAnalysis(
        event.target.value
      );

    }
  );

async function init(){

  try{

    await loadData();

    await loadSubmissionManagement();

  }catch(error){

    console.error(error);

    const area =
      document.getElementById(
        "analysisArea"
      );

    if(area){

      area.innerHTML =
        `<div class="card error">
          成績分析データを取得できませんでした。
        </div>`;

    }

  }

}

init();
