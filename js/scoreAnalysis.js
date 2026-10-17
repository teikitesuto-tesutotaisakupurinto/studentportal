import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase.js";

/*
 * 成績分析
 * テスト選択 → 選択したテストの分析結果
 *
 * Firestore:
 * scores
 *
 * 注意:
 * 既存のデータ構造を想定した互換処理を含みます。
 * Firestoreのアクセス権限は変更しません。
 */

let allScores = [];
let selectedTestId = "";
let testList = [];
let loading = false;

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#
