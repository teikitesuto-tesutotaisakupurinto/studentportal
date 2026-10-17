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
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";

const esc =
  value =>
    String(value ?? "").replace(
      /[&<>\"]/g,
      c => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;"
      }[c])
    );

let students = [];

let adminCalendarEvents = [];
let adminCalendarDate = new Date();

let adminCalendarRangeStart = "";
let adminCalendarRangeEnd = "";

onAuthStateChanged(
  auth,
  async user=>{

    if(!user){

      location.href =
        "../index.html";

      return;
    }

    const role =
      await getUserRole(user);

    if(role !== "admin"){

      alert(
        "アクセス権限がありません"
      );

      location.href =
        "../home/index.html";

      return;
    }

    await loadStudents();
    await loadBlocks();
    await loadMessages();
    await loadUsers();
    await loadCalendarAdmin();
    await loadDashboard();
    await loadScoreSubmissionList();

  }
);

async function loadStudents(){

  const snap =
    await getDocs(
      collection(db,"users")
    );

  students = [];

  snap.forEach(item=>{

    const data =
      item.data();

    if(data.role === "student"){

      students.push({
        id:item.id,
        ...data
      });

    }

  });

  populateUserSelect(
    "targetUser"
  );

  populateUserSelect(
    "documentUser"
  );

  populateUserSelect(
    "formUser"
  );

}

function populateUserSelect(id){

  const select =
    document.getElementById(id);

  if(!select){
    return;
  }

  select.innerHTML = "";

  students
    .sort(
      (a,b)=>
        String(a.name)
        .localeCompare(
          String(b.name),
          "ja"
        )
    )
    .forEach(student=>{

      const option =
        document.createElement(
          "option"
        );

      option.value =
        student.id;

      option.textContent =
        `${student.name || ""}（${student.grade || ""}・${student.block || ""}）`;

      select.appendChild(
        option
      );

    });

}

async function loadBlocks(){

  const blocks =
    [
      ...new Set(
        students
          .map(
            student =>
              student.block
          )
          .filter(Boolean)
      )
    ];

  [
    "block",
    "documentBlock",
    "formBlock"
  ].forEach(id=>{

    const select =
      document.getElementById(id);

    if(!select){
      return;
    }

    select.innerHTML = "";

    blocks.forEach(block=>{

      const option =
        document.createElement(
          "option"
        );

      option.value = block;
      option.textContent = block;

      select.appendChild(
        option
      );

    });

  });

}

window.changeTarget = function(){

  toggleTarget(
    "targetType",
    "blockArea",
    "gradeArea",
    "userArea"
  );

};

window.changeDocumentTarget = function(){

  toggleTarget(
    "documentTargetType",
    "documentBlockArea",
    "documentGradeArea",
    "documentUserArea"
  );

};

window.changeFormTarget = function(){

  toggleTarget(
    "formTargetType",
    "formBlockArea",
    "formGradeArea",
    "formUserArea"
  );

};

function toggleTarget(
  selectId,
  blockId,
  gradeId,
  userId
){

  const type =
    document.getElementById(
      selectId
    )?.value;

  [
    blockId,
    gradeId,
    userId
  ].forEach(id=>{

    const element =
      document.getElementById(id);

    if(element){
      element.style.display =
        "none";
    }

  });

  if(type === "block"){

    document.getElementById(
      blockId
    ).style.display =
      "block";

  }

  if(type === "block_grade"){

    document.getElementById(
      blockId
    ).style.display =
      "block";

    document.getElementById(
      gradeId
    ).style.display =
      "block";

  }

  if(type === "individual"){

    document.getElementById(
      userId
    ).style.display =
      "block";

  }

}

function targetData(
  type,
  blockId,
  gradeId,
  userId
){

  const data = {
    targetType:type
  };

  if(
    type === "block" ||
    type === "block_grade"
  ){

    data.block =
      document.getElementById(
        blockId
      ).value;

  }

  if(type === "block_grade"){

    data.grade =
      document.getElementById(
        gradeId
      ).value;

  }

  if(type === "individual"){

    data.uid =
      document.getElementById(
        userId
      ).value;

  }

  return data;
}

/* お知らせ */

window.createNotice = async function(){

  const title =
    document
      .getElementById("noticeTitle")
      .value
      .trim();

  const body =
    document
      .getElementById("noticeBody")
      .value
      .trim();

  if(!title || !body){

    alert(
      "タイトルと本文を入力してください"
    );

    return;
  }

  try{

    const type =
      document.getElementById(
        "targetType"
      ).value;

    await addDoc(
      collection(db,"notices"),
      {
        title,
        body,

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

        createdAt:
          serverTimestamp(),

        ...targetData(
          type,
          "block",
          "grade",
          "targetUser"
        )
      }
    );

    document.getElementById(
      "noticeTitle"
    ).value = "";

    document.getElementById(
      "noticeBody"
    ).value = "";

    document.getElementById(
      "importance"
    ).value = "normal";

    document.getElementById(
      "startDate"
    ).value = "";

    document.getElementById(
      "endDate"
    ).value = "";

    document.getElementById(
      "targetType"
    ).value = "all";

    changeTarget();

    alert("送信しました");

  }catch(error){

    console.error(error);

    alert(
      "送信できませんでした\n" +
      error.message
    );

  }

};

/* 配布文書 */

window.addDocument = async function(){

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

  if(!title || !url){

    alert(
      "タイトルと配布文書URLを入力してください"
    );

    return;
  }

  try{

    const type =
      document.getElementById(
        "documentTargetType"
      ).value;

    await addDoc(
      collection(db,"documents"),
      {

        title,
        body,
        url,

        startDate:
          document.getElementById(
            "documentStartDate"
          ).value,

        endDate:
          document.getElementById(
            "documentEndDate"
          ).value,

        createdAt:
          serverTimestamp(),

        ...targetData(
          type,
          "documentBlock",
          "documentGrade",
          "documentUser"
        )

      }
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

    alert("登録しました");

  }catch(error){

    console.error(error);

    alert(
      "登録できませんでした\n" +
      error.message
    );

  }

};

/* カレンダー */

window.addCalendar = async function(){

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
    ).value ||
    startDate;

  const description =
    document.getElementById(
      "calendarDescription"
    ).value.trim();

  if(!title || !startDate){

    alert(
      "予定名と開始日を入力してください"
    );

    return;
  }

  if(endDate < startDate){

    alert(
      "終了日は開始日以降にしてください"
    );

    return;
  }

  try{

    await addDoc(
      collection(db,"calendar"),
      {
        title,
        startDate,
        endDate,
        date:startDate,
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

    alert("予定を登録しました");

    await loadCalendarAdmin();

  }catch(error){

    console.error(error);

    alert(
      "予定を登録できませんでした\n" +
      error.message
    );

  }

};

async function loadCalendarAdmin(){

  const area =
    document.getElementById(
      "adminCalendar"
    );

  if(!area){
    return;
  }

  try{

    const snap =
      await getDocs(
        query(
          collection(db,"calendar"),
          orderBy("startDate","asc")
        )
      );

    adminCalendarEvents = [];

    snap.forEach(item=>{

      adminCalendarEvents.push({
        id:item.id,
        ...item.data()
      });

    });

    renderAdminCalendar();

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="card error">
        カレンダーを読み込めませんでした。
      </div>
    `;

  }

}

function adminDateKey(date){

  return (
    date.getFullYear() +
    "-" +
    String(
      date.getMonth()+1
    ).padStart(2,"0") +
    "-" +
    String(
      date.getDate()
    ).padStart(2,"0")
  );

}

function adminEventCoversDate(
  event,
  key
){

  const start =
    event.startDate ||
    event.date;

  const end =
    event.endDate ||
    event.date ||
    start;

  return (
    start &&
    end &&
    key >= start &&
    key <= end
  );

}

function renderAdminCalendar(){

  const area =
    document.getElementById(
      "adminCalendar"
    );

  if(!area){
    return;
  }

  const year =
    adminCalendarDate.getFullYear();

  const month =
    adminCalendarDate.getMonth();

  const first =
    new Date(
      year,
      month,
      1
    );

  const lastDay =
    new Date(
      year,
      month+1,
      0
    ).getDate();

  const today =
    adminDateKey(
      new Date()
    );

  let html = `

    <div class="calendar-tools">

      <div class="calendar-header">

        <button
          type="button"
          onclick="adminPrevMonth()"
        >
          前月
        </button>

        <h2>
          ${year}年${month+1}月
        </h2>

        <button
          type="button"
          onclick="adminNextMonth()"
        >
          次月
        </button>

      </div>

      <div class="calendar-range-filter">

        <label>
          表示開始
          <input
            id="adminCalendarRangeStart"
            type="date"
            value="${adminCalendarRangeStart}"
          >
        </label>

        <span>〜</span>

        <label>
          表示終了
          <input
            id="adminCalendarRangeEnd"
            type="date"
            value="${adminCalendarRangeEnd}"
          >
        </label>

        <button
          onclick="applyAdminCalendarRange()"
        >
          期間を適用
        </button>

        <button
          onclick="clearAdminCalendarRange()"
        >
          解除
        </button>

      </div>

    </div>

    <div class="calendar-wrap">

    <table class="calendar">

    <thead>
      <tr>
        <th>日</th>
        <th>月</th>
        <th>火</th>
        <th>水</th>
        <th>木</th>
        <th>金</th>
        <th>土</th>
      </tr>
    </thead>

    <tbody>
    <tr>
  `;

  for(
    let i=0;
    i<first.getDay();
    i++
  ){

    html +=
      `<td class="empty"></td>`;

  }

  for(
    let day=1;
    day<=lastDay;
    day++
  ){

    const key =
      adminDateKey(
        new Date(
          year,
          month,
          day
        )
      );

    const visible =
      (
        !adminCalendarRangeStart ||
        key >= adminCalendarRangeStart
      ) &&
      (
        !adminCalendarRangeEnd ||
        key <= adminCalendarRangeEnd
      );

    const events =
      visible
        ? adminCalendarEvents.filter(
            event =>
              adminEventCoversDate(
                event,
                key
              )
          )
        : [];

    html += `

      <td
        class="calendar-day ${
          key === today
            ? "today"
            : ""
        }"
      >

      <div class="day-number">
        ${day}
      </div>
    `;

    events.forEach(event=>{

      html += `

        <button
          class="calendar-event"
          onclick="showAdminEvent('${event.id}')"
        >
          ${esc(event.title)}
        </button>

      `;

    });

    html += `</td>`;

    if(
      (
        first.getDay()+day
      ) % 7 === 0 &&
      day !== lastDay
    ){

      html +=
        "</tr><tr>";

    }

  }

  const cells =
    first.getDay()+lastDay;

  const trailing =
    (
      7 -
      cells % 7
    ) % 7;

  for(
    let i=0;
    i<trailing;
    i++
  ){

    html +=
      `<td class="empty"></td>`;

  }

  html += `
    </tr>
    </tbody>
    </table>

    </div>
  `;

  area.innerHTML = html;

}

window.adminPrevMonth = function(){

  adminCalendarDate.setMonth(
    adminCalendarDate.getMonth()-1
  );

  renderAdminCalendar();

};

window.adminNextMonth = function(){

  adminCalendarDate.setMonth(
    adminCalendarDate.getMonth()+1
  );

  renderAdminCalendar();

};

window.applyAdminCalendarRange = function(){

  const start =
    document.getElementById(
      "adminCalendarRangeStart"
    )?.value || "";

  const end =
    document.getElementById(
      "adminCalendarRangeEnd"
    )?.value || "";

  if(
    start &&
    end &&
    start > end
  ){

    alert(
      "開始日は終了日以前にしてください"
    );

    return;
  }

  adminCalendarRangeStart = start;
  adminCalendarRangeEnd = end;

  renderAdminCalendar();

};

window.clearAdminCalendarRange = function(){

  adminCalendarRangeStart = "";
  adminCalendarRangeEnd = "";

  renderAdminCalendar();

};

window.showAdminEvent = function(id){

  const event =
    adminCalendarEvents.find(
      item => item.id === id
    );

  if(!event){
    return;
  }

  const start =
    event.startDate ||
    event.date;

  const end =
    event.endDate ||
    event.date ||
    start;

  alert(
    event.title +
    "\n\n" +
    start +
    (
      end !== start
        ? " 〜 " + end
        : ""
    ) +
    (
      event.description
        ? "\n\n" +
          event.description
        : ""
    )
  );

};

window.deleteCalendar = async function(id){

  if(
    !confirm(
      "この予定を削除しますか？"
    )
  ){
    return;
  }

  try{

    await deleteDoc(
      doc(
        db,
        "calendar",
        id
      )
    );

    alert("削除しました");

    await loadCalendarAdmin();

  }catch(error){

    console.error(error);

    alert(
      "削除できませんでした\n" +
      error.message
    );

  }

};

/* 連絡 */

async function loadMessages(){

  const area =
    document.getElementById(
      "messageList"
    );

  if(!area){
    return;
  }

  try{

    const snap =
      await getDocs(
        query(
          collection(db,"messages"),
          orderBy("createdAt","desc")
        )
      );

    if(snap.empty){

      area.innerHTML = `
        <div class="card">
          連絡はありません。
        </div>
      `;

      return;
    }

    area.innerHTML = "";

    snap.forEach(item=>{

      const data =
        item.data();

      area.innerHTML += `

        <div class="card">

          <p>
            <strong>
              送信者：
            </strong>
            ${esc(data.senderName)}
          </p>

          <p>
            <strong>
              メール：
            </strong>
            ${esc(data.senderEmail)}
          </p>

          <div class="document-body">
            ${esc(data.body)}
          </div>

        </div>

      `;

    });

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="card error">
        連絡を読み込めませんでした。
      </div>
    `;

  }

};

/* 生徒 */

async function loadUsers(){

  const area =
    document.getElementById(
      "userList"
    );

  if(!area){
    return;
  }

  area.innerHTML = "";

  students.forEach(student=>{

    area.innerHTML += `

      <div class="card">

        <p>
          名前：
          ${esc(student.name)}
        </p>

        <p>
          地方：
          ${esc(student.block)}
        </p>

        <p>
          学年：
          ${esc(student.grade)}
        </p>

      </div>

    `;

  });

}

/* ダッシュボード */

async function loadDashboard(){

  const scoreSnap =
    await getDocs(
      collection(db,"scores")
    );

  const studentCount =
    document.getElementById(
      "studentCount"
    );

  const scoreCount =
    document.getElementById(
      "scoreCount"
    );

  if(studentCount){

    studentCount.textContent =
      `${students.length}人`;

  }

  if(scoreCount){

    scoreCount.textContent =
      `${scoreSnap.size}件`;

  }

}

/* 成績フォーム */

window.createScoreForm =
async function(){

  const subjects =
    [
      ...document.querySelectorAll(
        "#subjectList input:checked"
      )
    ].map(
      input => input.value
    );

  if(!subjects.length){

    alert(
      "科目を1つ以上選択してください"
    );

    return;
  }

  const title =
    document.getElementById(
      "formTitle"
    ).value.trim();

  if(!title){

    alert(
      "フォーム名を入力してください"
    );

    return;
  }

  const type =
    document.getElementById(
      "formTargetType"
    ).value;

  try{

    await addDoc(
      collection(db,"scoreForms"),
      {

        title,

        testType:
          document.getElementById(
            "testType"
          ).value,

        subjects,

        startDate:
          document.getElementById(
            "formStartDate"
          ).value,

        endDate:
          document.getElementById(
            "formEndDate"
          ).value,

        published:true,

        createdBy:
          auth.currentUser.uid,

        createdAt:
          serverTimestamp(),

        ...targetData(
          type,
          "formBlock",
          "formGrade",
          "formUser"
        )

      }
    );

    document.getElementById(
      "formTitle"
    ).value = "";

    alert(
      "成績フォームを作成しました"
    );

  }catch(error){

    console.error(error);

    alert(
      "作成できませんでした\n" +
      error.message
    );

  }

};

/* 再回答許可 */

window.allowResubmit =
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
          auth.currentUser.uid
      }
    );

    alert(
      "再回答を許可しました"
    );

    await loadScoreSubmissionList();

  }catch(error){

    console.error(error);

    alert(
      "再回答の許可に失敗しました\n" +
      error.message
    );

  }

};

window.denyResubmit =
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

    alert(
      "再回答を禁止しました"
    );

    await loadScoreSubmissionList();

  }catch(error){

    console.error(error);

    alert(
      "変更できませんでした\n" +
      error.message
    );

  }

};

async function loadScoreSubmissionList(){

  const area =
    document.getElementById(
      "scoreSubmissionList"
    );

  if(!area){
    return;
  }

  try{

    const snap =
      await getDocs(
        query(
          collection(db,"scores"),
          orderBy(
            "createdAt",
            "desc"
          )
        )
      );

    if(snap.empty){

      area.innerHTML = `
        <p>
          提出された成績はありません。
        </p>
      `;

      return;
    }

    area.innerHTML = "";

    snap.forEach(item=>{

      const data =
        item.data();

      area.innerHTML += `

        <div class="card">

          <h3>
            ${esc(data.name || "")}
          </h3>

          <p>
            ${esc(data.testName || "")}
          </p>

          <p>
            合計：
            ${esc(data.total)}
            点
          </p>

          <p>
            ${
              data.resubmitAllowed === true
                ? "再回答を許可しています"
                : "再回答不可"
            }
          </p>

          ${
            data.resubmitAllowed === true

            ? `
              <button
                onclick="denyResubmit('${item.id}')"
              >
                再回答を禁止
              </button>
            `

            : `
              <button
                onclick="allowResubmit('${item.id}')"
              >
                再回答を許可
              </button>
            `
          }

        </div>

      `;

    });

  }catch(error){

    console.error(error);

    area.innerHTML = `
      <div class="card error">
        成績提出状況を読み込めませんでした。
      </div>
    `;

  }

}
