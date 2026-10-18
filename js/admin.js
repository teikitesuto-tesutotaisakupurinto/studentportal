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
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserData
} from "./auth.js";

let currentUser = null;
let userData = null;
let students = [];

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

function formatDateTime(value){

  if(!value) return "";

  const date =
    value?.toDate
      ? value.toDate()
      : new Date(value);

  if(Number.isNaN(date.getTime())){
    return "";
  }

  const p =
    n => String(n).padStart(2,"0");

  return `${date.getFullYear()}/${p(date.getMonth()+1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;

}

function targetLabel(type){

  switch(type){

    case "individual":
      return "個別送信";

    case "block":
      return "ブロック一斉送信";

    case "block_grade":
      return "ブロック＋学年";

    case "grade":
      return "学年一斉送信";

    default:
      return "全員";

  }

}

function metaText(data){

  const sender =
    data.senderName ||
    userData?.name ||
    "管理者";

  const time =
    formatDateTime(
      data.createdAt
    );

  return `${esc(sender)} ⇒ ${esc(targetLabel(data.targetType))}${time ? ` [${time}]` : ""}`;

}

async function loadStudents(){

  const snap =
    await getDocs(
      collection(
        db,
        "users"
      )
    );

  students = [];

  snap.forEach(item => {

    const data =
      item.data();

    if(data.role === "student"){

      students.push({
        id:item.id,
        ...data
      });

    }

  });

  students.sort(
    (a,b) =>
      String(a.name || "")
        .localeCompare(
          String(b.name || ""),
          "ja"
        )
  );

}

function targetSelectorHTML(
  prefix
){

  return `

    <div class="form-group">

      <label>ブロック</label>

      <select id="${prefix}Block">

        <option value="">
          選択してください
        </option>

        ${[
          ...new Set(
            students
              .map(s => s.block)
              .filter(Boolean)
          )
        ].map(block => `

          <option value="${esc(block)}">
            ${esc(block)}
          </option>

        `).join("")}

      </select>

    </div>

    <div class="form-group">

      <label>学年</label>

      <select id="${prefix}Grade">

        <option value="">
          選択してください
        </option>

        ${[
          "中学1年",
          "中学2年",
          "中学3年"
        ].map(grade => `

          <option value="${grade}">
            ${grade}
          </option>

        `).join("")}

      </select>

    </div>

    <div class="form-group">

      <label>生徒</label>

      <select id="${prefix}User">

        <option value="">
          選択してください
        </option>

        ${students.map(student => `

          <option value="${student.id}">

            ${esc(student.name || "")}
            （${esc(student.grade || "")}・${esc(student.block || "")}）

          </option>

        `).join("")}

      </select>

    </div>

  `;

}

function updateTargetDetail(
  type,
  areaId,
  prefix
){

  const area =
    document.getElementById(
      areaId
    );

  if(!area) return;

  if(type === "all"){

    area.innerHTML =
      `<p>全員に配信します。</p>`;

    return;

  }

  if(type === "block"){

    area.innerHTML = `
      <div class="form-group">

        <label>ブロック</label>

        <select id="${prefix}Block">

          <option value="">
            選択してください
          </option>

          ${[
            ...new Set(
              students
                .map(s => s.block)
                .filter(Boolean)
            )
          ].map(block => `
            <option value="${esc(block)}">
              ${esc(block)}
            </option>
          `).join("")}

        </select>

      </div>
    `;

    return;

  }

  if(type === "grade"){

    area.innerHTML = `
      <div class="form-group">

        <label>学年</label>

        <select id="${prefix}Grade">

          <option value="">
            選択してください
          </option>

          <option value="中学1年">
            中学1年
          </option>

          <option value="中学2年">
            中学2年
          </option>

          <option value="中学3年">
            中学3年
          </option>

        </select>

      </div>
    `;

    return;

  }

  if(type === "block_grade"){

    area.innerHTML =
      targetSelectorHTML(
        prefix
      );

    return;

  }

  if(type === "individual"){

    area.innerHTML = `

      <div class="form-group">

        <label>生徒</label>

        <select id="${prefix}User">

          <option value="">
            選択してください
          </option>

          ${students.map(student => `

            <option value="${student.id}">

              ${esc(student.name || "")}
              （${esc(student.grade || "")}・${esc(student.block || "")}）

            </option>

          `).join("")}

        </select>

      </div>

    `;

  }

}

function readTarget(
  type,
  prefix
){

  const data = {
    targetType:type
  };

  if(type === "block"){

    data.block =
      document.getElementById(
        `${prefix}Block`
      )?.value || "";

  }

  if(type === "grade"){

    data.grade =
      document.getElementById(
        `${prefix}Grade`
      )?.value || "";

  }

  if(type === "block_grade"){

    data.block =
      document.getElementById(
        `${prefix}Block`
      )?.value || "";

    data.grade =
      document.getElementById(
        `${prefix}Grade`
      )?.value || "";

  }

  if(type === "individual"){

    data.uid =
      document.getElementById(
        `${prefix}User`
      )?.value || "";

  }

  return data;

}

function validateTarget(
  target
){

  if(
    target.targetType === "block" &&
    !target.block
  ){

    alert(
      "ブロックを選択してください。"
    );

    return false;

  }

  if(
    target.targetType === "grade" &&
    !target.grade
  ){

    alert(
      "学年を選択してください。"
    );

    return false;

  }

  if(
    target.targetType === "block_grade" &&
    (!target.block || !target.grade)
  ){

    alert(
      "ブロックと学年を選択してください。"
    );

    return false;

  }

  if(
    target.targetType === "individual" &&
    !target.uid
  ){

    alert(
      "生徒を選択してください。"
    );

    return false;

  }

  return true;

}

/* =========================
   お知らせ
========================= */

const targetType =
  document.getElementById(
    "targetType"
  );

if(targetType){

  targetType.addEventListener(
    "change",
    () => {

      updateTargetDetail(
        targetType.value,
        "targetDetail",
        "notice"
      );

    }
  );

  updateTargetDetail(
    targetType.value,
    "targetDetail",
    "notice"
  );

}

const createNoticeButton =
  document.getElementById(
    "createNoticeButton"
  );

if(createNoticeButton){

  createNoticeButton.addEventListener(
    "click",
    async () => {

      const title =
        document.getElementById(
          "noticeTitle"
        )?.value.trim();

      const body =
        document.getElementById(
          "noticeBody"
        )?.value.trim();

      const type =
        document.getElementById(
          "targetType"
        )?.value;

      if(!title){

        alert(
          "タイトルを入力してください。"
        );

        return;

      }

      const target =
        readTarget(
          type,
          "notice"
        );

      if(!validateTarget(target)){
        return;
      }

      try{

        await addDoc(
          collection(
            db,
            "notices"
          ),
          {
            title,
            body,
            importance:
              document.getElementById(
                "importance"
              )?.value || "normal",

            startDate:
              document.getElementById(
                "startDate"
              )?.value || "",

            endDate:
              document.getElementById(
                "endDate"
              )?.value || "",

            senderUid:
              currentUser.uid,

            senderName:
              userData.name || "",

            createdAt:
              serverTimestamp(),

            ...target
          }
        );

        document.getElementById(
          "noticeTitle"
        ).value = "";

        document.getElementById(
          "noticeBody"
        ).value = "";

        document.getElementById(
          "startDate"
        ).value = "";

        document.getElementById(
          "endDate"
        ).value = "";

        document.getElementById(
          "targetType"
        ).value = "all";

        updateTargetDetail(
          "all",
          "targetDetail",
          "notice"
        );

        const status =
          document.getElementById(
            "createStatus"
          );

        if(status){

          status.innerHTML =
            `<div class="status-box success">送信しました。</div>`;

        }else{

          alert(
            "送信しました。"
          );

        }

      }catch(error){

        console.error(error);

        alert(
          "送信できませんでした。\n" +
          "Firebaseの権限設定を確認してください。"
        );

      }

    }
  );

}

/* =========================
   配布文書
========================= */

const documentTargetType =
  document.getElementById(
    "documentTargetType"
  );

if(documentTargetType){

  documentTargetType.addEventListener(
    "change",
    () => {

      updateTargetDetail(
        documentTargetType.value,
        "documentTargetDetail",
        "document"
      );

    }
  );

  updateTargetDetail(
    documentTargetType.value,
    "documentTargetDetail",
    "document"
  );

}

const addDocumentButton =
  document.getElementById(
    "addDocumentButton"
  );

if(addDocumentButton){

  addDocumentButton.addEventListener(
    "click",
    async () => {

      const title =
        document.getElementById(
          "documentTitle"
        )?.value.trim();

      const body =
        document.getElementById(
          "documentBody"
        )?.value.trim();

      const url =
        document.getElementById(
          "documentUrl"
        )?.value.trim();

      const type =
        document.getElementById(
          "documentTargetType"
        )?.value;

      if(!title || !url){

        alert(
          "タイトルと配布文書URLを入力してください。"
        );

        return;

      }

      const target =
        readTarget(
          type,
          "document"
        );

      if(!validateTarget(target)){
        return;
      }

      try{

        await addDoc(
          collection(
            db,
            "documents"
          ),
          {
            title,
            body,
            url,

            startDate:
              document.getElementById(
                "documentStartDate"
              )?.value || "",

            endDate:
              document.getElementById(
                "documentEndDate"
              )?.value || "",

            senderUid:
              currentUser.uid,

            senderName:
              userData.name || "",

            createdAt:
              serverTimestamp(),

            ...target
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

        document.getElementById(
          "documentStartDate"
        ).value = "";

        document.getElementById(
          "documentEndDate"
        ).value = "";

        alert(
          "配布しました。"
        );

      }catch(error){

        console.error(error);

        alert(
          "配布できませんでした。"
        );

      }

    }
  );

}

/* =========================
   カレンダー
========================= */

async function loadCalendarAdmin(){

  const area =
    document.getElementById(
      "calendarArea"
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

  renderAdminCalendar(
    events
  );

}

function renderAdminCalendar(
  events
){

  const area =
    document.getElementById(
      "calendarArea"
    );

  if(!area){
    return;
  }

  let current =
    new Date();

  function draw(){

    const year =
      current.getFullYear();

    const month =
      current.getMonth();

    const first =
      new Date(
        year,
        month,
        1
      );

    const lastDay =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    let html = `

      <div class="calendar-toolbar">

        <button
          class="secondary-button"
          id="adminPrevMonth">

          前月

        </button>

        <h2>
          ${year}年${month+1}月
        </h2>

        <button
          class="secondary-button"
          id="adminNextMonth">

          次月

        </button>

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
        `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

      const dayEvents =
        events.filter(
          event => {

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
        );

      html += `

        <td>

          <div class="day-number">
            ${day}
          </div>

          ${dayEvents.map(event => `

            <button
              class="calendar-event"
              data-event-id="${event.id}">

              ${esc(event.title)}

            </button>

          `).join("")}

        </td>

      `;

      if(
        (first.getDay()+day)%7===0 &&
        day!==lastDay
      ){

        html +=
          `</tr><tr>`;

      }

    }

    const cells =
      first.getDay() +
      lastDay;

    const trailing =
      (7 - cells%7)%7;

    for(
      let i=0;
      i<trailing;
      i++
    ){

      html +=
        `<td class="empty"></td>`;

    }

    html +=
      `</tr></tbody></table></div>`;

    area.innerHTML =
      html;

    document
      .getElementById(
        "adminPrevMonth"
      )
      ?.addEventListener(
        "click",
        () => {

          current.setMonth(
            current.getMonth()-1
          );

          draw();

        }
      );

    document
      .getElementById(
        "adminNextMonth"
      )
      ?.addEventListener(
        "click",
        () => {

          current.setMonth(
            current.getMonth()+1
          );

          draw();

        }
      );

  }

  draw();

}

const addCalendarButton =
  document.getElementById(
    "addCalendarButton"
  );

if(addCalendarButton){

  addCalendarButton.addEventListener(
    "click",
    async () => {

      const title =
        document.getElementById(
          "calendarTitle"
        )?.value.trim();

      const startDate =
        document.getElementById(
          "calendarStartDate"
        )?.value;

      const endDate =
        document.getElementById(
          "calendarEndDate"
        )?.value ||
        startDate;

      const description =
        document.getElementById(
          "calendarDescription"
        )?.value.trim();

      if(!title || !startDate){

        alert(
          "予定の題名と開始日を入力してください。"
        );

        return;

      }

      if(endDate < startDate){

        alert(
          "終了日は開始日以降にしてください。"
        );

        return;

      }

      try{

        await addDoc(
          collection(
            db,
            "calendar"
          ),
          {
            title,
            startDate,
            endDate,
            date:startDate,
            description,
            createdBy:
              currentUser.uid,
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

      }catch(error){

        console.error(error);

        alert(
          "予定を登録できませんでした。"
        );

      }

    }
  );

}

/* =========================
   連絡
========================= */

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

    if(snap.empty){

      area.innerHTML =
        `<div class="card">連絡はありません。</div>`;

      return;

    }

    area.innerHTML = "";

    snap.forEach(item => {

      const data =
        item.data();

      area.innerHTML += `

        <div class="card">

          <h3>
            ${esc(data.senderName || "生徒")}
          </h3>

          <p>
            ${esc(data.body || "")}
          </p>

          <p class="document-period">
            ${formatDateTime(data.createdAt)}
          </p>

        </div>

      `;

    });

  }catch(error){

    console.error(error);

    area.innerHTML =
      `<div class="card error">連絡を読み込めませんでした。</div>`;

  }

}

/* =========================
   生徒
========================= */

async function loadUsers(){

  const area =
    document.getElementById(
      "userList"
    );

  const count =
    document.getElementById(
      "studentCount"
    );

  if(!area && !count){
    return;
  }

  if(count){
    count.textContent =
      `${students.length}人`;
  }

  if(area){

    area.innerHTML =
      students.map(student => `

        <div class="card">

          <h3>
            ${esc(student.name || "")}
          </h3>

          <p>
            ブロック：
            ${esc(student.block || "")}
          </p>

          <p>
            学年：
            ${esc(student.grade || "")}
          </p>

        </div>

      `).join("");

  }

}

/* =========================
   ダッシュボード
========================= */

async function loadDashboard(){

  const count =
    document.getElementById(
      "scoreCount"
    );

  if(!count){
    return;
  }

  try{

    const snap =
      await getDocs(
        collection(
          db,
          "scores"
        )
      );

    count.textContent =
      `${snap.size}件`;

  }catch(error){

    console.error(error);

    count.textContent =
      "取得不可";

  }

}

onAuthStateChanged(
  auth,
  async user => {

    if(!user){

      location.href =
        "/studentportal/index.html";

      return;

    }

    currentUser = user;

    userData =
      await getUserData(user);

    if(!userData){

      alert(
        "ユーザー情報がありません。"
      );

      return;

    }

    if(userData.role !== "admin"){

      location.href =
        "/studentportal/dashboard/student.html";

      return;

    }

    try{

      await loadStudents();
      await loadUsers();
      await loadMessages();
      await loadCalendarAdmin();
      await loadDashboard();

    }catch(error){

      console.error(
        "admin initialization error",
        error
      );

    }

  }
);
