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
  query,
  orderBy,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
  getUserRole
} from "./auth.js";

let currentUser = null;
let userData = null;

let calendarEvents = [];
let calendarDate = new Date();

let calendarRangeStart = "";
let calendarRangeEnd = "";

const esc = value =>
  String(value ?? "").replace(
    /[&<>"]/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c])
  );

function toDate(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  }

  return d;
}

function isVisibleByPeriod(data) {
  const now = new Date();

  const start = toDate(data.startDate);
  const end = toDate(data.endDate, true);

  return (
    (!start || now >= start) &&
    (!end || now <= end)
  );
}

function canViewTarget(data) {
  if (
    !data.targetType ||
    data.targetType === "all"
  ) {
    return true;
  }

  if (data.targetType === "block") {
    return data.block === userData.block;
  }

  if (data.targetType === "block_grade") {
    return (
      data.block === userData.block &&
      data.grade === userData.grade
    );
  }

  if (data.targetType === "individual") {
    return data.uid === currentUser.uid;
  }

  return false;
}

function noticeCard(id, data) {
  const tag =
    data.importance === "important"
      ? `<span class="important">重要</span>`
      : `<span class="normal-tag">通常</span>`;

  return `
    <div class="notice-card">
      <a href="../notice.html?id=${encodeURIComponent(id)}">
        ${tag}
        <h3>${esc(data.title)}</h3>
      </a>

      <p>
        ${esc(
          (data.body || "")
            .replace(/\s+/g, " ")
            .slice(0, 100)
        )}
      </p>

      <small>
        ${esc(data.startDate || "")}
        ${
          data.endDate
            ? " 〜 " + esc(data.endDate)
            : ""
        }
      </small>
    </div>
  `;
}

async function loadNotices() {
  const area = document.getElementById("noticeList");
  const dashboard = document.getElementById("dashboardNotices");

  if (!area && !dashboard) {
    return;
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "notices"),
        orderBy("createdAt", "desc")
      )
    );

    const list = [];

    snap.forEach(item => {
      const data = item.data();

      if (
        isVisibleByPeriod(data) &&
        canViewTarget(data)
      ) {
        list.push({
          id: item.id,
          data
        });
      }
    });

    const html = list.length
      ? list
          .map(x => noticeCard(x.id, x.data))
          .join("")
      : `
        <div class="card">
          現在表示できるお知らせはありません。
        </div>
      `;

    if (area) {
      area.innerHTML = html;
    }

    if (dashboard) {
      dashboard.innerHTML = html;
    }
  } catch (error) {
    console.error(error);

    const html = `
      <div class="card error">
        お知らせを読み込めませんでした。
      </div>
    `;

    if (area) {
      area.innerHTML = html;
    }

    if (dashboard) {
      dashboard.innerHTML = html;
    }
  }
}

/* 連絡 */

window.sendMessage = async function () {
  const input = document.getElementById("messageText");
  const text = input?.value.trim();

  if (!text) {
    alert("内容を入力してください");
    return;
  }

  try {
    await addDoc(
      collection(db, "messages"),
      {
        senderUid: currentUser.uid,
        senderName: userData.name || "",
        senderEmail: currentUser.email || "",
        body: text,
        createdAt: serverTimestamp()
      }
    );

    input.value = "";

    alert("送信しました");
  } catch (error) {
    console.error(error);
    alert("送信できませんでした");
  }
};

/* 配布文書 */

async function loadDocuments() {
  const area = document.getElementById("documentList");

  if (!area) {
    return;
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "documents"),
        orderBy("createdAt", "desc")
      )
    );

    const list = [];

    snap.forEach(item => {
      const data = item.data();

      if (
        isVisibleByPeriod(data) &&
        canViewTarget(data)
      ) {
        list.push({
          id: item.id,
          data
        });
      }
    });

    area.innerHTML = list.length
      ? list
          .map(({ data }) => `
            <div class="card">
              <div class="document-header">
                <h3>${esc(data.title)}</h3>

                <a
                  class="document-open"
                  href="${esc(data.url || "#")}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  配布文書を開く
                </a>
              </div>

              <div class="document-body">
                ${esc(data.body || "")}
              </div>

              <p class="document-period">
                ${esc(data.startDate || "")}
                ${
                  data.endDate
                    ? " 〜 " + esc(data.endDate)
                    : ""
                }
              </p>
            </div>
          `)
          .join("")
      : `
        <div class="card">
          現在表示できる配布文書はありません。
        </div>
      `;
  } catch (error) {
    console.error(error);

    area.innerHTML = `
      <div class="card error">
        配布文書を読み込めませんでした。
      </div>
    `;
  }
}

/* カレンダー */

async function loadCalendar() {
  const area = document.getElementById("calendarArea");

  if (!area) {
    return;
  }

  try {
    const snap = await getDocs(
      collection(db, "calendar")
    );

    calendarEvents = [];

    snap.forEach(item => {
      calendarEvents.push({
        id: item.id,
        ...item.data()
      });
    });

    renderCalendar();
  } catch (error) {
    console.error(error);

    area.innerHTML = `
      <div class="card error">
        カレンダーを読み込めませんでした。
      </div>
    `;
  }
}

function dateKey(date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function eventCoversDate(event, key) {
  const start = event.startDate || event.date;
  const end = event.endDate || event.date || start;

  return (
    start &&
    end &&
    key >= start &&
    key <= end
  );
}

function eventRangeVisible(event) {
  const start = event.startDate || event.date;
  const end = event.endDate || event.date || start;

  if (
    calendarRangeStart &&
    end < calendarRangeStart
  ) {
    return false;
  }

  if (
    calendarRangeEnd &&
    start > calendarRangeEnd
  ) {
    return false;
  }

  return true;
}

function showEventDetail(event) {
  const existing = document.querySelector(".event-detail");

  if (existing) {
    existing.remove();
  }

  const area = document.getElementById("calendarArea");
  const detail = document.createElement("div");

  detail.className = "card event-detail";

  detail.innerHTML = `
    <h2>${esc(event.title)}</h2>

    <p>
      ${esc(event.startDate || event.date || "")}
      ${
        event.endDate &&
        event.endDate !== (event.startDate || event.date)
          ? " 〜 " + esc(event.endDate)
          : ""
      }
    </p>

    ${
      event.description
        ? `<p class="document-body">${esc(event.description)}</p>`
        : ""
    }

    <button type="button" id="closeEventDetail">
      閉じる
    </button>
  `;

  area.appendChild(detail);

  document
    .getElementById("closeEventDetail")
    ?.addEventListener("click", () => detail.remove());

  detail.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function renderCalendar() {
  const area = document.getElementById("calendarArea");

  if (!area) {
    return;
  }

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const first = new Date(year, month, 1);

  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const today = dateKey(new Date());

  let html = `
    <div class="calendar-tools">
      <div class="calendar-header">
        <button type="button" onclick="prevMonth()">
          前月
        </button>

        <h2>${year}年${month + 1}月</h2>

        <button type="button" onclick="nextMonth()">
          次月
        </button>
      </div>

      <div class="calendar-range-filter">
        <label>
          表示開始
          <input
            id="calendarRangeStart"
            type="date"
            value="${calendarRangeStart}"
          >
        </label>

        <span>〜</span>

        <label>
          表示終了
          <input
            id="calendarRangeEnd"
            type="date"
            value="${calendarRangeEnd}"
          >
        </label>

        <button
          type="button"
          onclick="applyCalendarRange()"
        >
          期間を適用
        </button>

        <button
          type="button"
          onclick="clearCalendarRange()"
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

  for (let i = 0; i < first.getDay(); i++) {
    html += `<td class="empty"></td>`;
  }

  for (let day = 1; day <= lastDay; day++) {
    const key = dateKey(
      new Date(year, month, day)
    );

    const visible =
      (!calendarRangeStart || key >= calendarRangeStart) &&
      (!calendarRangeEnd || key <= calendarRangeEnd);

    const events = visible
      ? calendarEvents.filter(
          event =>
            eventCoversDate(event, key) &&
            eventRangeVisible(event)
        )
      : [];

    html += `
      <td class="calendar-day ${key === today ? "today" : ""}">
        <div class="day-number">${day}</div>
    `;

    events.forEach(event => {
      html += `
        <button
          type="button"
          class="calendar-event"
          data-event-id="${esc(event.id)}"
        >
          ${esc(event.title)}
        </button>
      `;
    });

    html += `</td>`;

    if (
      (first.getDay() + day) % 7 === 0 &&
      day !== lastDay
    ) {
      html += `</tr><tr>`;
    }
  }

  const cells = first.getDay() + lastDay;
  const trailing = (7 - (cells % 7)) % 7;

  for (let i = 0; i < trailing; i++) {
    html += `<td class="empty"></td>`;
  }

  html += `
          </tr>
        </tbody>
      </table>
    </div>
  `;

  area.innerHTML = html;

  area
    .querySelectorAll(".calendar-event")
    .forEach(button => {
      button.addEventListener("click", () => {
        const event = calendarEvents.find(
          x => x.id === button.dataset.eventId
        );

        if (event) {
          showEventDetail(event);
        }
      });
    });
}

window.prevMonth = function () {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
};

window.nextMonth = function () {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
};

window.applyCalendarRange = function () {
  const start =
    document.getElementById("calendarRangeStart")?.value || "";

  const end =
    document.getElementById("calendarRangeEnd")?.value || "";

  if (start && end && start > end) {
    alert("開始日は終了日以前にしてください");
    return;
  }

  calendarRangeStart = start;
  calendarRangeEnd = end;

  renderCalendar();
};

window.clearCalendarRange = function () {
  calendarRangeStart = "";
  calendarRangeEnd = "";

  renderCalendar();
};

/* 成績フォーム：テストごとに分類 */

async function loadScoreForms() {
  const area = document.getElementById("scoreFormList");

  if (!area) {
    return;
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "scoreForms"),
        orderBy("createdAt", "desc")
      )
    );

    const today = new Date();

    /*
     * テストの種類ごとにフォームをまとめる。
     *
     * 例：
     * 中間テスト
     *   ├─ 国語
     *   └─ 数学
     *
     * 期末テスト
     *   └─ 期末テスト成績フォーム
     */

    const groupedForms = new Map();

    snap.forEach(item => {
      const data = item.data();

      // 非公開フォームは表示しない
      if (data.published === false) {
        return;
      }

      // 公開期間を確認
      const start = toDate(data.startDate);
      const end = toDate(data.endDate, true);

      if (start && today < start) {
        return;
      }

      if (end && today > end) {
        return;
      }

      // 閲覧対象を確認
      if (!canViewScoreForm(data)) {
        return;
      }

      /*
       * testType をグループ名に使用。
       * testType が空の場合は「その他のテスト」。
       */
      const testType =
        String(data.testType || "").trim() ||
        "その他のテスト";

      if (!groupedForms.has(testType)) {
        groupedForms.set(testType, []);
      }

      groupedForms.get(testType).push({
        id: item.id,
        data
      });
    });

    /*
     * グループごとにHTMLを生成。
     * グループ内のフォームが1件でも複数件でも表示する。
     */
    const groupsHtml = [...groupedForms.entries()]
      .map(([testType, forms]) => {
        const formsHtml = forms
          .map(({ id, data }) => `
            <article class="card score-form-card">
              <h3>
                ${esc(data.title || "テスト成績フォーム")}
              </h3>

              ${
                data.description
                  ? `
                    <p>
                      ${esc(data.description)}
                    </p>
                  `
                  : ""
              }

              <p class="document-period">
                ${
                  data.startDate
                    ? `提出開始：${esc(data.startDate)}`
                    : ""
                }

                ${
                  data.endDate
                    ? `<br>提出期限：${esc(data.endDate)}`
                    : ""
                }
              </p>

              <a
                class="document-open"
                href="../scoreForm.html?id=${encodeURIComponent(id)}"
              >
                成績を提出・確認
              </a>
            </article>
          `)
          .join("");

        return `
          <section class="score-test-group">
            <div class="card score-test-heading">
              <h2>${esc(testType)}</h2>

              <p>
                フォーム数：${forms.length}件
              </p>
            </div>

            <div class="score-test-list">
              ${formsHtml}
            </div>
          </section>
        `;
      })
      .join("");

    area.innerHTML = groupsHtml || `
      <div class="card">
        <p>
          現在提出できるテスト成績はありません。
        </p>
      </div>
    `;
  } catch (error) {
    console.error(error);

    area.innerHTML = `
      <div class="card error">
        テスト成績を読み込めませんでした。
      </div>
    `;
  }
}

function canViewScoreForm(data) {
  if (
    !data.targetType ||
    data.targetType === "all"
  ) {
    return true;
  }

  if (data.targetType === "block") {
    return data.block === userData.block;
  }

  if (data.targetType === "block_grade") {
    return (
      data.block === userData.block &&
      data.grade === userData.grade
    );
  }

  if (data.targetType === "individual") {
    return data.uid === currentUser.uid;
  }

  return false;
}

/* 初期化 */

onAuthStateChanged(
  auth,
  async user => {
    if (!user) {
      location.href = "../index.html";
      return;
    }

    try {
      const role = await getUserRole(user);

      if (role !== "student") {
        alert("アクセス権限がありません");

        location.href = "../dashboard/admin.html";
        return;
      }

      currentUser = user;

      const snap = await getDoc(
        doc(db, "users", user.uid)
      );

      if (!snap.exists()) {
        alert("ユーザー情報がありません");
        return;
      }

      userData = snap.data();

      await Promise.all([
        loadNotices(),
        loadDocuments(),
        loadCalendar(),
        loadScoreForms()
      ]);
    } catch (error) {
      console.error("初期化エラー:", error);
      alert("ページの読み込みに失敗しました。");
    }
  }
);
