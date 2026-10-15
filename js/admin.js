import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";


let allUsers = [];


// =====================
// ページ切替
// =====================

window.showAdminPage =
function(page){

  document
    .querySelectorAll(".content > section")
    .forEach(section => {

      section.style.display =
        "none";

    });


  const target =
    document.getElementById(page);


  if(target){

    target.style.display =
      "block";

  }

};


// =====================
// 管理者確認
// =====================

onAuthStateChanged(
  auth,
  async(user) => {

    if(!user){

      location.href =
        "index.html";

      return;

    }


    const role =
      await getUserRole(user);


    if(role !== "admin"){

      alert(
        "アクセス権限がありません"
      );

      location.href =
        "student.html";

      return;

    }


    await loadUsersData();

    await loadBlocks();

    await loadStudents();

    await loadMessages();

    await loadCalendarAdmin();

    await loadAnalysis();

    await loadDashboard();

  }
);


// =====================
// ユーザー取得
// =====================

async function loadUsersData(){

  const snap =
    await getDocs(
      collection(db,"users")
    );


  allUsers = [];


  snap.forEach(item => {

    allUsers.push({
      id:item.id,
      ...item.data()
    });

  });

}


// =====================
// ブロック
// =====================

async function loadBlocks(){

  const selects = [

    document.getElementById("block"),

    document.getElementById(
      "documentBlock"
    )

  ];


  const blocks =
    new Set();


  allUsers.forEach(user => {

    if(user.block){

      blocks.add(
        user.block
      );

    }

  });


  selects.forEach(select => {

    if(!select){
      return;
    }


    select.innerHTML = "";


    blocks.forEach(block => {

      const option =
        document.createElement(
          "option"
        );

      option.value = block;

      option.textContent = block;

      select.appendChild(option);

    });

  });

}


// =====================
// 生徒一覧
// =====================

async function loadStudents(){

  const selects = [

    document.getElementById(
      "targetUser"
    ),

    document.getElementById(
      "documentTargetUser"
    )

  ];


  selects.forEach(select => {

    if(!select){
      return;
    }


    select.innerHTML = "";


    allUsers
      .filter(
        user =>
          user.role === "student"
      )
      .forEach(user => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          user.id;

        option.textContent =
          user.name ||
          user.email ||
          user.id;

        select.appendChild(
          option
        );

      });

  });

}


// =====================
// お知らせ配信範囲
// =====================

window.changeTarget =
function(){

  const type =
    document.getElementById(
      "targetType"
    ).value;


  document.getElementById(
    "blockArea"
  ).style.display =
    "none";


  document.getElementById(
    "gradeArea"
  ).style.display =
    "none";


  document.getElementById(
    "userArea"
  ).style.display =
    "none";


  if(type === "block"){

    document.getElementById(
      "blockArea"
    ).style.display =
      "block";

  }


  if(type === "block_grade"){

    document.getElementById(
      "blockArea"
    ).style.display =
      "block";

    document.getElementById(
      "gradeArea"
    ).style.display =
      "block";

  }


  if(type === "individual"){

    document.getElementById(
      "userArea"
    ).style.display =
      "block";

  }

};


// =====================
// お知らせ作成
// =====================

window.createNotice =
async function(){

  const title =
    document.getElementById(
      "noticeTitle"
    ).value.trim();


  const body =
    document.getElementById(
      "noticeBody"
    ).value.trim();


  const targetType =
    document.getElementById(
      "targetType"
    ).value;


  if(!title || !body){

    alert(
      "タイトルと本文を入力してください。"
    );

    return;

  }


  const data = {

    title:title,

    body:body,

    importance:
      document.getElementById(
        "importance"
      ).value,

    startDate:
      document.getElementById(
        "startDate"
      ).value,

    endDate:
      document.getElementById(
        "endDate"
      ).value,

    targetType:
      targetType,

    createdAt:
      serverTimestamp()

  };


  if(
    targetType === "block" ||
    targetType === "block_grade"
  ){

    data.block =
      document.getElementById(
        "block"
      ).value;

  }


  if(
    targetType === "block_grade"
  ){

    data.grade =
      document.getElementById(
        "grade"
      ).value;

  }


  if(
    targetType === "individual"
  ){

    data.uid =
      document.getElementById(
        "targetUser"
      ).value;

  }


  await addDoc(
    collection(
      db,
      "notices"
    ),
    data
  );


  document.getElementById(
    "noticeTitle"
  ).value = "";

  document.getElementById(
    "noticeBody"
  ).value = "";


  alert(
    "お知らせを公開しました。"
  );


  loadDashboard();

};


// =====================
// 配布文書配信範囲
// =====================

window.changeDocumentTarget =
function(){

  const type =
    document.getElementById(
      "documentTargetType"
    ).value;


  document.getElementById(
    "documentBlockArea"
  ).style.display =
    "none";


  document.getElementById(
    "documentGradeArea"
  ).style.display =
    "none";


  document.getElementById(
    "documentUserArea"
  ).style.display =
    "none";


  if(type === "block"){

    document.getElementById(
      "documentBlockArea"
    ).style.display =
      "block";

  }


  if(type === "block_grade"){

    document.getElementById(
      "documentBlockArea"
    ).style.display =
      "block";

    document.getElementById(
      "documentGradeArea"
    ).style.display =
      "block";

  }


  if(type === "individual"){

    document.getElementById(
      "documentUserArea"
    ).style.display =
      "block";

  }

};


// =====================
// 配布文書登録
// =====================

window.addDocument =
async function(){

  const title =
    document.getElementById(
      "documentTitle"
    ).value.trim();


  const body =
    document.getElementById(
      "documentBody"
    ).value.trim();


  const url =
    document.getElementById(
      "documentUrl"
    ).value.trim();


  const targetType =
    document.getElementById(
      "documentTargetType"
    ).value;


  if(!title){

    alert(
      "タイトルを入力してください。"
    );

    return;

  }


  const data = {

    title:title,

    body:body,

    url:url,

    startDate:
      document.getElementById(
        "documentStartDate"
      ).value,

    endDate:
      document.getElementById(
        "documentEndDate"
      ).value,

    targetType:
      targetType,

    createdAt:
      serverTimestamp()

  };


  if(
    targetType === "block" ||
    targetType === "block_grade"
  ){

    data.block =
      document.getElementById(
        "documentBlock"
      ).value;

  }


  if(
    targetType === "block_grade"
  ){

    data.grade =
      document.getElementById(
        "documentGrade"
      ).value;

  }


  if(
    targetType === "individual"
  ){

    data.uid =
      document.getElementById(
        "documentTargetUser"
      ).value;

  }


  await addDoc(
    collection(
      db,
      "documents"
    ),
    data
  );


  document.getElementById(
    "documentTitle"
  ).value = "";

  document.getElementById(
    "documentBody"
  ).value = "";

  document.getElementById(
    "documentUrl"
  ).value = "";


  alert(
    "配布文書を登録しました。"
  );


  loadDashboard();

};


// =====================
// カレンダー登録
// =====================

window.addCalendar =
async function(){

  const title =
    document.getElementById(
      "calendarTitle"
    ).value.trim();


  const startDate =
    document.getElementById(
      "calendarStartDate"
    ).value;


  const endDate =
    document.getElementById(
      "calendarEndDate"
    ).value;


  const description =
    document.getElementById(
      "calendarDescription"
    ).value.trim();


  if(!title){

    alert(
      "予定名を入力してください。"
    );

    return;

  }


  if(!startDate){

    alert(
      "開始日を入力してください。"
    );

    return;

  }


  if(
    endDate &&
    endDate < startDate
  ){

    alert(
      "終了日は開始日以降にしてください。"
    );

    return;

  }


  await addDoc(
    collection(
      db,
      "calendar"
    ),
    {

      title:title,

      startDate:startDate,

      endDate:
        endDate || startDate,

      description:
        description,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()

    }
  );


  document.getElementById(
    "calendarTitle"
  ).value = "";

  document.getElementById(
    "calendarStartDate"
  ).value = "";

  document.getElementById(
    "calendarEndDate"
  ).value = "";

  document.getElementById(
    "calendarDescription"
  ).value = "";


  alert(
    "予定を登録しました。"
  );


  loadCalendarAdmin();

};


// =====================
// カレンダー一覧
// =====================

async function loadCalendarAdmin(){

  const area =
    document.getElementById(
      "adminCalendar"
    );


  if(!area){
    return;
  }


  const snap =
    await getDocs(
      collection(
        db,
        "calendar"
      )
    );


  const events = [];


  snap.forEach(item => {

    events.push({
      id:item.id,
      ...item.data()
    });

  });


  events.sort(
    (a,b) =>
      getCalendarStart(a)
        .localeCompare(
          getCalendarStart(b)
        )
  );


  area.innerHTML = "";


  if(events.length === 0){

    area.innerHTML = `
      <div class="empty-message">
        登録されている予定はありません。
      </div>
    `;

    return;

  }


  events.forEach(data => {

    const start =
      getCalendarStart(data);

    const end =
      getCalendarEnd(data);


    area.innerHTML += `

      <div class="card">

        <p>
          <strong>
            ${escapeHtml(
              data.title || ""
            )}
          </strong>
        </p>

        <p>

          ${formatDate(start)}

          ${
            end && end !== start
              ? " ～ " +
                formatDate(end)
              : ""
          }

        </p>

        <p>
          ${escapeHtml(
            data.description || ""
          )}
        </p>

        <button
          onclick="deleteCalendar('${data.id}')">

          削除

        </button>

      </div>

    `;

  });

}


// =====================
// カレンダー削除
// =====================

window.deleteCalendar =
async function(id){

  if(
    !confirm(
      "この予定を削除しますか？"
    )
  ){

    return;

  }


  await deleteDoc(
    doc(
      db,
      "calendar",
      id
    )
  );


  alert(
    "削除しました。"
  );


  loadCalendarAdmin();

};


// =====================
// 連絡一覧
// =====================

async function loadMessages(){

  const area =
    document.getElementById(
      "messageList"
    );


  if(!area){
    return;
  }


  const snap =
    await getDocs(
      query(
        collection(
          db,
          "messages"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      )
    );


  area.innerHTML = "";


  snap.forEach(item => {

    const data =
      item.data();


    area.innerHTML += `

      <div class="card">

        <p>
          送信者：
          ${escapeHtml(
            data.senderName || ""
          )}
        </p>

        <p>
          メール：
          ${escapeHtml(
            data.senderEmail || ""
          )}
        </p>

        <p>
          内容：
          ${escapeHtml(
            data.body || ""
          )}
        </p>

        <p>
          状態：
          ${escapeHtml(
            data.status || "unread"
          )}
        </p>

        ${
          data.status !== "opened"
            ? `

              <button
                onclick="openMessage('${item.id}')">

                開封する

              </button>

            `
            : "確認済み"
        }

      </div>

    `;

  });

}


// =====================
// 連絡開封
// =====================

window.openMessage =
async function(id){

  await updateDoc(
    doc(
      db,
      "messages",
      id
    ),
    {

      status:"opened",

      openedAt:
        serverTimestamp()

    }
  );


  alert(
    "開封しました。"
  );


  loadMessages();

};


// =====================
// 成績フォーム作成
// =====================

window.createScoreForm =
async function(){

  const subjects = [];


  document
    .querySelectorAll(
      "#subjectList input[type='checkbox']:checked"
    )
    .forEach(item => {

      subjects.push(
        item.value
      );

    });


  if(subjects.length === 0){

    alert(
      "少なくとも1教科を選択してください。"
    );

    return;

  }


  await addDoc(
    collection(
      db,
      "scoreForms"
    ),
    {

      title:
        document.getElementById(
          "formTitle"
        ).value,

      testType:
        document.getElementById(
          "testType"
        ).value,

      subjects:
        subjects,

      startDate:
        document.getElementById(
          "formStartDate"
        ).value,

      endDate:
        document.getElementById(
          "formEndDate"
        ).value,

      targetType:
        document.getElementById(
          "formTargetType"
        ).value,

      published:true,

      createdBy:
        auth.currentUser.uid,

      createdAt:
        serverTimestamp()

    }
  );


  document.getElementById(
    "formTitle"
  ).value = "";


  alert(
    "成績フォームを作成しました。"
  );

};


// =====================
// 成績分析
// =====================

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
      collection(
        db,
        "scores"
      )
    );


  const formSnap =
    await getDocs(
      collection(
        db,
        "scoreForms"
      )
    );


  const forms = {};


  formSnap.forEach(item => {

    forms[item.id] = {
      id:item.id,
      ...item.data()
    };

  });


  const users = {};


  allUsers.forEach(user => {

    users[user.id] = user;

  });


  const scores = [];


  scoreSnap.forEach(item => {

    scores.push({
      id:item.id,
      ...item.data()
    });

  });


  if(scores.length === 0){

    area.innerHTML = `
      <div class="card">

        <h2>
          成績分析
        </h2>

        <p>
          まだ成績データがありません。
        </p>

      </div>
    `;

    return;

  }


  // =====================
  // 全体
  // =====================

  const totalScores =
    scores.map(
      score =>
        Number(score.total || 0)
    );


  const overall =
    calculateStatistics(
      totalScores
    );


  // =====================
  // 教科別
  // =====================

  const subjectMap = {};


  scores.forEach(score => {

    if(!score.subjects){
      return;
    }


    Object.entries(
      score.subjects
    ).forEach(
      ([subject,value]) => {

        if(!subjectMap[subject]){

          subjectMap[subject] = [];

        }

        subjectMap[subject].push(
          Number(value)
        );

      }
    );

  });


  // =====================
  // テスト別
  // =====================

  const testMap = {};


  scores.forEach(score => {

    const key =
      score.formId ||
      score.testName ||
      "不明";


    if(!testMap[key]){

      testMap[key] = [];

    }


    testMap[key].push(
      score
    );

  });


  // =====================
  // 学年別
  // =====================

  const gradeMap = {};


  scores.forEach(score => {

    const user =
      users[score.uid];


    const grade =
      user?.grade ||
      "不明";


    if(!gradeMap[grade]){

      gradeMap[grade] = [];

    }


    gradeMap[grade].push(
      Number(score.total || 0)
    );

  });


  // =====================
  // ブロック別
  // =====================

  const blockMap = {};


  scores.forEach(score => {

    const user =
      users[score.uid];


    const block =
      user?.block ||
      "不明";


    if(!blockMap[block]){

      blockMap[block] = [];

    }


    blockMap[block].push(
      Number(score.total || 0)
    );

  });


  let html = "";


  // =====================
  // 全体
  // =====================

  html += `

    <div class="card">

      <h2>
        全体分析
      </h2>

      <div class="analysis-grid">

        <div>
          <span>提出件数</span>
          <strong>
            ${scores.length}件
          </strong>
        </div>

        <div>
          <span>平均点</span>
          <strong>
            ${overall.average}点
          </strong>
        </div>

        <div>
          <span>最高点</span>
          <strong>
            ${overall.max}点
          </strong>
        </div>

        <div>
          <span>最低点</span>
          <strong>
            ${overall.min}点
          </strong>
        </div>

        <div>
          <span>中央値</span>
          <strong>
            ${overall.median}点
          </strong>
        </div>

        <div>
          <span>標準偏差</span>
          <strong>
            ${overall.standardDeviation}
          </strong>
        </div>

      </div>

    </div>

  `;


  // =====================
  // 教科別
  // =====================

  html += `

    <div class="card">

      <h2>
        教科別分析
      </h2>

      <div class="analysis-table">

        <table>

          <thead>

            <tr>

              <th>
                教科
              </th>

              <th>
                提出数
              </th>

              <th>
                平均
              </th>

              <th>
                最高
              </th>

              <th>
                最低
              </th>

              <th>
                中央値
              </th>

              <th>
                標準偏差
              </th>

            </tr>

          </thead>

          <tbody>

  `;


  Object.entries(
    subjectMap
  ).forEach(
    ([subject,values]) => {

      const stat =
        calculateStatistics(
          values
        );


      html += `

        <tr>

          <td>
            ${escapeHtml(subject)}
          </td>

          <td>
            ${values.length}
          </td>

          <td>
            ${stat.average}
          </td>

          <td>
            ${stat.max}
          </td>

          <td>
            ${stat.min}
          </td>

          <td>
            ${stat.median}
          </td>

          <td>
            ${stat.standardDeviation}
          </td>

        </tr>

      `;

    }
  );


  html += `
          </tbody>
        </table>
      </div>

    </div>
  `;


  // =====================
  // テスト別
  // =====================

  html += `

    <div class="card">

      <h2>
        テスト別分析
      </h2>

  `;


  Object.entries(
    testMap
  ).forEach(
    ([key,list]) => {

      const values =
        list.map(
          score =>
            Number(
              score.total || 0
            )
        );


      const stat =
        calculateStatistics(
          values
        );


      const form =
        forms[key];


      const title =
        form?.title ||
        list[0]?.testName ||
        "テスト";


      html += `

        <div class="analysis-subcard">

          <h3>
            ${escapeHtml(title)}
          </h3>

          <p>
            提出数：
            ${list.length}件
          </p>

          <p>
            平均：
            ${stat.average}点
          </p>

          <p>
            最高：
            ${stat.max}点
          </p>

          <p>
            最低：
            ${stat.min}点
          </p>

          <p>
            中央値：
            ${stat.median}点
          </p>

          <p>
            標準偏差：
            ${stat.standardDeviation}
          </p>

        </div>

      `;

    }
  );


  html += `
    </div>
  `;


  // =====================
  // 学年別
  // =====================

  html += createGroupAnalysis(
    "学年別分析",
    gradeMap
  );


  // =====================
  // ブロック別
  // =====================

  html += createGroupAnalysis(
    "ブロック別分析",
    blockMap
  );


  // =====================
  // 個別提出状況
  // =====================

  html += `

    <div class="card">

      <h2>
        提出データ一覧
      </h2>

      <div class="analysis-table">

        <table>

          <thead>

            <tr>

              <th>
                生徒
              </th>

              <th>
                テスト
              </th>

              <th>
                合計
              </th>

              <th>
                平均
              </th>

              <th>
                提出状態
              </th>

              <th>
                操作
              </th>

            </tr>

          </thead>

          <tbody>

  `;


  scores
    .sort(
      (a,b) =>
        getCreatedTime(b) -
        getCreatedTime(a)
    )
    .forEach(score => {

      const user =
        users[score.uid];


      const form =
        forms[score.formId];


      const name =
        score.name ||
        user?.name ||
        "不明";


      const testName =
        score.testName ||
        form?.title ||
        "不明";


      const allowed =
        score.resubmitAllowed === true;


      html += `

        <tr>

          <td>
            ${escapeHtml(name)}
          </td>

          <td>
            ${escapeHtml(testName)}
          </td>

          <td>
            ${score.total || 0}点
          </td>

          <td>
            ${score.average || 0}点
          </td>

          <td>

            ${
              allowed
                ? "再提出許可中"
                : "提出済み"
            }

          </td>

          <td>

            ${
              allowed

                ?

                `

                  <button
                    onclick="setResubmitPermission('${score.id}', false)">

                    再提出許可を解除

                  </button>

                `

                :

                `

                  <button
                    class="secondary-button"
                    onclick="setResubmitPermission('${score.id}', true)">

                    再提出を許可

                  </button>

                `

            }

          </td>

        </tr>

      `;

    });


  html += `

          </tbody>

        </table>

      </div>

    </div>

  `;


  area.innerHTML =
    html;

}


// =====================
// 再提出許可
// =====================

window.setResubmitPermission =
async function(
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

        resubmitPermissionUpdatedAt:
          serverTimestamp(),

        resubmitPermissionUpdatedBy:
          auth.currentUser.uid

      }
    );


    alert(
      allowed
        ? "再提出を許可しました。"
        : "再提出許可を解除しました。"
    );


    loadAnalysis();

  }catch(error){

    console.error(error);

    alert(
      "変更できませんでした。\n" +
      error.message
    );

  }

};


// =====================
// グループ分析
// =====================

function createGroupAnalysis(
  title,
  map
){

  let html = `

    <div class="card">

      <h2>
        ${title}
      </h2>

  `;


  Object.entries(
    map
  ).forEach(
    ([name,values]) => {

      const stat =
        calculateStatistics(
          values
        );


      html += `

        <div class="analysis-subcard">

          <h3>
            ${escapeHtml(name)}
          </h3>

          <p>
            件数：
            ${values.length}
          </p>

          <p>
            平均：
            ${stat.average}点
          </p>

          <p>
            最高：
            ${stat.max}点
          </p>

          <p>
            最低：
            ${stat.min}点
          </p>

          <p>
            中央値：
            ${stat.median}点
          </p>

          <p>
            標準偏差：
            ${stat.standardDeviation}
          </p>

        </div>

      `;

    }
  );


  html += `
    </div>
  `;


  return html;

}


// =====================
// 統計計算
// =====================

function calculateStatistics(
  values
){

  if(!values.length){

    return {
      average:0,
      max:0,
      min:0,
      median:0,
      standardDeviation:0
    };

  }


  const sorted =
    [...values]
      .sort(
        (a,b) => a-b
      );


  const total =
    sorted.reduce(
      (sum,value) =>
        sum + value,
      0
    );


  const average =
    total /
    sorted.length;


  let median;


  if(
    sorted.length % 2 === 0
  ){

    const middle =
      sorted.length / 2;

    median =
      (
        sorted[middle - 1] +
        sorted[middle]
      ) / 2;

  }else{

    median =
      sorted[
        Math.floor(
          sorted.length / 2
        )
      ];

  }


  const variance =
    sorted.reduce(
      (sum,value) =>
        sum +
        Math.pow(
          value - average,
          2
        ),
      0
    ) /
    sorted.length;


  return {

    average:
      average.toFixed(1),

    max:
      Math.max(...sorted),

    min:
      Math.min(...sorted),

    median:
      Number(
        median.toFixed(1)
      ),

    standardDeviation:
      Math.sqrt(
        variance
      ).toFixed(1)

  };

}


// =====================
// ダッシュボード
// =====================

async function loadDashboard(){

  const studentCount =
    document.getElementById(
      "studentCount"
    );

  const scoreCount =
    document.getElementById(
      "scoreCount"
    );

  const noticeCount =
    document.getElementById(
      "noticeCount"
    );

  const documentCount =
    document.getElementById(
      "documentCount"
    );


  const students =
    allUsers.filter(
      user =>
        user.role === "student"
    );


  if(studentCount){

    studentCount.textContent =
      students.length + "人";

  }


  const scoreSnap =
    await getDocs(
      collection(
        db,
        "scores"
      )
    );


  if(scoreCount){

    scoreCount.textContent =
      scoreSnap.size + "件";

  }


  const noticeSnap =
    await getDocs(
      collection(
        db,
        "notices"
      )
    );


  let notices = 0;


  noticeSnap.forEach(item => {

    const data =
      item.data();


    if(
      isWithinPeriod(
        data.startDate,
        data.endDate
      )
    ){

      notices++;

    }

  });


  if(noticeCount){

    noticeCount.textContent =
      notices + "件";

  }


  const documentSnap =
    await getDocs(
      collection(
        db,
        "documents"
      )
    );


  let documents = 0;


  documentSnap.forEach(item => {

    const data =
      item.data();


    if(
      isWithinPeriod(
        data.startDate,
        data.endDate
      )
    ){

      documents++;

    }

  });


  if(documentCount){

    documentCount.textContent =
      documents + "件";

  }

}


// =====================
// 日付
// =====================

function isWithinPeriod(
  startDate,
  endDate
){

  const today =
    new Date();


  today.setHours(
    0,0,0,0
  );


  if(startDate){

    const start =
      new Date(startDate);

    start.setHours(
      0,0,0,0
    );


    if(today < start){
      return false;
    }

  }


  if(endDate){

    const end =
      new Date(endDate);

    end.setHours(
      23,59,59,999
    );


    if(today > end){
      return false;
    }

  }


  return true;

}


// =====================
// カレンダー日付
// =====================

function getCalendarStart(data){

  return (
    data.startDate ||
    data.date ||
    ""
  );

}


function getCalendarEnd(data){

  return (
    data.endDate ||
    data.startDate ||
    data.date ||
    ""
  );

}


// =====================
// 日付表示
// =====================

function formatDate(value){

  if(!value){
    return "";
  }

  return value.replaceAll(
    "-",
    "/"
  );

}


// =====================
// 時刻
// =====================

function getCreatedTime(data){

  if(
    data.createdAt &&
    typeof data.createdAt.toMillis === "function"
  ){

    return data.createdAt.toMillis();

  }


  if(
    data.createdAt instanceof Date
  ){

    return data.createdAt.getTime();

  }


  return 0;

}


// =====================
// HTMLエスケープ
// =====================

function escapeHtml(value){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}
