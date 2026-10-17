import {
  db,
  requireLogin
} from "./auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


const noticeList = document.getElementById("noticeList");
const noticeEmpty = document.getElementById("noticeEmpty");
const noticeError = document.getElementById("noticeError");


/* HTMLへ安全に表示するためのエスケープ */
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* Firestore Timestamp、Date、日時文字列に対応 */
function toDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}


/* 秒まで表示 */
function formatDate(value) {
  const date = toDate(value);

  if (!date) return "";

  const pad = number => String(number).padStart(2, "0");

  return (
    date.getFullYear() + "/" +
    pad(date.getMonth() + 1) + "/" +
    pad(date.getDate()) + " " +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes()) + ":" +
    pad(date.getSeconds())
  );
}


/* 既存データのフィールド名の違いに対応 */
function getTitle(data) {
  return data.title ?? data.subject ?? "無題のお知らせ";
}


function getSender(data) {
  return (
    data.senderName ??
    data.sender ??
    data.createdByName ??
    data.authorName ??
    "管理者"
  );
}


function getScope(data) {
  const value =
    data.scope ??
    data.distributionScope ??
    data.targetScope ??
    data.target;

  if (Array.isArray(value)) {
    return value.join("・");
  }

  if (value && typeof value === "object") {
    if (Array.isArray(value.groups)) {
      return value.groups.join("・");
    }

    return value.label ?? value.name ?? "全員";
  }

  return value || "全員";
}


function getDateValue(data) {
  return (
    data.publishedAt ??
    data.sentAt ??
    data.createdAt ??
    data.date ??
    null
  );
}


/* お知らせカードを生成 */
function createNoticeCard(documentSnapshot) {
  const id = documentSnapshot.id;
  const data = documentSnapshot.data();

  const card = document.createElement("article");
  card.className = "notice-card";

  const titleLink = document.createElement("a");
  titleLink.className = "notice-title";
  titleLink.href = `./detail.html?id=${encodeURIComponent(id)}`;
  titleLink.textContent = getTitle(data);

  const titleHeading = document.createElement("h2");
  titleHeading.style.margin = "0";
  titleHeading.style.fontSize = "17px";
  titleHeading.appendChild(titleLink);

  const meta = document.createElement("div");
  meta.className = "notice-meta";

  const sender = escapeHTML(getSender(data));
  const scope = escapeHTML(getScope(data));
  const date = formatDate(getDateValue(data));

  meta.innerHTML =
    `${sender} ⇒ ${scope}` +
    (date ? ` [${escapeHTML(date)}]` : "");

  card.appendChild(titleHeading);
  card.appendChild(meta);

  /*
   * 本文は一覧には追加しない。
   * タイトルを押すと detail.html で本文を表示する。
   */

  return card;
}


/* お知らせ一覧の取得 */
async function loadNotices() {
  noticeList.replaceChildren();
  noticeError.style.display = "none";
  noticeEmpty.style.display = "none";

  try {
    const announcementsRef = collection(db, "announcements");

    let snapshot;

    /*
     * createdAt順を試す。
     * インデックス等の都合で失敗した場合は通常取得に切り替える。
     */
    try {
      snapshot = await getDocs(
        query(
          announcementsRef,
          orderBy("createdAt", "desc")
        )
      );
    } catch (firstError) {
      console.warn(
        "並べ替え取得に失敗したため通常取得を試します。",
        firstError
      );

      snapshot = await getDocs(announcementsRef);
    }

    if (snapshot.empty) {
      noticeEmpty.style.display = "block";
      return;
    }

    /*
     * orderByなしの取得結果も日時順に並べ替える。
     */
    const documents = [...snapshot.docs].sort((a, b) => {
      const dateA = toDate(getDateValue(a.data()));
      const dateB = toDate(getDateValue(b.data()));

      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;

      return timeB - timeA;
    });

    const fragment = document.createDocumentFragment();

    for (const documentSnapshot of documents) {
      fragment.appendChild(
        createNoticeCard(documentSnapshot)
      );
    }

    noticeList.appendChild(fragment);

  } catch (error) {
    console.error("お知らせ取得エラー:", error);

    noticeError.textContent =
      error?.code === "permission-denied"
        ? "お知らせを表示する権限がありません。Firestoreの読み取りルールを確認してください。"
        : "お知らせを取得できませんでした。通信状況やFirebaseの設定を確認してください。";

    noticeError.style.display = "block";
  }
}


/* ログイン済みユーザーならお知らせを表示 */
requireLogin(async () => {
  await loadNotices();
});
