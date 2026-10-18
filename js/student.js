import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, query, where,
  addDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getUserData } from "./auth.js";

let currentUser = null, userData = null;
let forms = [], scores = [], selectedForm = null, submitting = false;

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const dateMs = value => {
  if (value?.toDate) return value.toDate().getTime();
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
};
const dateText = value => {
  const ms = dateMs(value); if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
};
const isBeforeStart = f => !!f.startDate && dateMs(f.startDate) > Date.now();
const isAfterEnd = f => !!f.endDate && dateMs(f.endDate) < Date.now();

function targetMatches(f) {
  const type = f.targetType || "all";
  if (type === "all") return true;
  if (type === "block") return !!userData.block && f.block === userData.block;
  if (type === "grade") return !!userData.grade && String(f.grade) === String(userData.grade);
  if (type === "block_grade") return !!userData.block && !!userData.grade &&
    f.block === userData.block && String(f.grade) === String(userData.grade);
  if (type === "individual") {
    const ids = [f.uid, f.targetUid, ...(Array.isArray(f.uids) ? f.uids : []),
      ...(Array.isArray(f.targetUids) ? f.targetUids : [])].filter(Boolean);
    return ids.includes(currentUser.uid);
  }
  return false;
}
function isPublished(f) {
  // Existing records use published=true. Never expose an unpublished form.
  return f.published === true && targetMatches(f) && !isBeforeStart(f) && !isAfterEnd(f);
}
function createdSort(a,b) { return dateMs(b.createdAt)-dateMs(a.createdAt); }
function latestScoreForForm(formId) {
  return scores.filter(s => s.formId === formId).sort(createdSort)[0] || null;
}
function formStatus(form) {
  const score = latestScoreForForm(form.id);
  if (!score) return {label:"未提出", canAnswer:true, score:null};
  if (score.resubmitAllowed === true) return {label:"再回答許可中", canAnswer:true, score};
  return {label:"提出済み", canAnswer:false, score};
}
function setMessage(message, type="") {
  $("pageMessage").innerHTML = message ? `<div class="status-box ${type}">${esc(message)}</div>` : "";
}
function renderForms() {
  const area = $("scoreFormList");
  if (!forms.length) {
    area.innerHTML = '<div class="card">現在、回答対象のフォームはありません。</div>';
    return;
  }
  area.innerHTML = forms.map(f => {
    const st = formStatus(f);
    const subjects = Array.isArray(f.subjects) ? f.subjects.join("・") : "";
    return `<article class="card score-item">
      <h3>${esc(f.title || "名称未設定のテスト")}</h3>
      <p>対象教科：${esc(subjects || "未設定")}</p>
      <p>回答状況：<strong>${esc(st.label)}</strong></p>
      <p>提出期限：${esc(dateText(f.endDate))}</p>
      <button type="button" class="primary-button" data-open-form="${esc(f.id)}">${st.canAnswer ? "フォームを開いて回答" : "提出内容を確認"}</button>
      <div id="form-area-${esc(f.id)}"></div>
    </article>`;
  }).join("");
  area.querySelectorAll("[data-open-form]").forEach(btn => btn.addEventListener("click", () => {
    const f = forms.find(x => x.id === btn.dataset.openForm);
    if (f) openForm(f);
  }));
}
function renderHistory() {
  const area = $("scoreHistoryList");
  if (!scores.length) {
    area.innerHTML = '<div class="card">保存されている成績はまだありません。</div>';
    return;
  }
  const byTest = new Map();
  for (const s of [...scores].sort(createdSort)) {
    const key = s.formId || s.id;
    if (!byTest.has(key)) byTest.set(key, s);
  }
  area.innerHTML = [...byTest.entries()].map(([key,s]) => {
    const title = s.testName || s.title || "テスト成績";
    return `<article class="card score-item">
      <h3>${esc(title)}</h3>
      <p>合計点：<strong>${Number.isFinite(Number(s.total)) ? esc(s.total) : "—"}点</strong>
      ／ 平均点：${Number.isFinite(Number(s.average)) ? esc(s.average) : "—"}点</p>
      <p>提出日：${esc(dateText(s.createdAt))}</p>
      <button type="button" class="secondary-button" data-open-score="${esc(key)}">このテストの成績を開く</button>
    </article>`;
  }).join("");
  area.querySelectorAll("[data-open-score]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.openScore;
    const item = scores.find(s => (s.formId || s.id) === id) || scores.find(s => s.id === id);
    if (!item) return;
    history.pushState({scoreId:id}, "", `${location.pathname}?id=${encodeURIComponent(id)}`);
    renderDetail(item);
  }));
}
function scoreSubjects(score) {
  if (score.subjects && !Array.isArray(score.subjects) && typeof score.subjects === "object") return score.subjects;
  return {};
}
function renderDetail(score) {
  $("scoreDetail").hidden = false;
  $("detailHeading").textContent = score.testName || score.title || "成績詳細";
  const subjectScores = scoreSubjects(score);
  const keys = Object.keys(subjectScores);
  const rows = keys.map(k => `<tr><th>${esc(k)}</th><td>${esc(subjectScores[k])}点</td><td>${esc(previousDifference(score,k,subjectScores[k]))}</td></tr>`).join("");
  const previous = getPreviousScore(score);
  const totalDiff = previous && Number.isFinite(Number(score.total)) && Number.isFinite(Number(previous.total))
    ? signed(Number(score.total)-Number(previous.total))+"点" : "比較できる前回の成績はありません";
  $("scoreDetailContent").innerHTML = `<div class="card">
    <p>合計点：<strong>${Number.isFinite(Number(score.total)) ? esc(score.total)+"点" : "—"}</strong></p>
    <p>前回との差：${esc(totalDiff)}</p>
    <p>平均点：${Number.isFinite(Number(score.average)) ? esc(score.average)+"点" : "保存データから計算できません"}</p>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>教科</th><th>点数</th><th>前回との差</th></tr></thead><tbody>${rows || '<tr><td colspan="3">教科別の点数データがありません。</td></tr>'}</tbody></table></div>
    <p><button type="button" class="secondary-button" id="closeDetail">詳細を閉じる</button></p>
  </div>`;
  $("closeDetail").addEventListener("click", () => {
    history.pushState({}, "", location.pathname);
    $("scoreDetail").hidden = true;
  });
  $("scoreDetail").scrollIntoView({behavior:"smooth",block:"start"});
}
function getPreviousScore(score) {
  const own = scores.filter(s => s.id !== score.id && s.uid === currentUser.uid)
    .sort((a,b)=>dateMs(b.createdAt)-dateMs(a.createdAt));
  const currentTime = dateMs(score.createdAt);
  return own.find(s => dateMs(s.createdAt) < currentTime) || null;
}
function signed(n) { return `${n > 0 ? "+" : ""}${n}`; }
function previousDifference(score, subject, value) {
  const prev = getPreviousScore(score);
  const p = prev && scoreSubjects(prev)[subject];
  return p !== undefined && Number.isFinite(Number(value)) && Number.isFinite(Number(p))
    ? signed(Number(value)-Number(p))+"点" : "—";
}
function openForm(form) {
  selectedForm = form;
  const host = $(`form-area-${form.id}`);
  const status = formStatus(form);
  if (!status.canAnswer) {
    host.innerHTML = `<div class="status-box success">提出しました。<br>管理者が再回答を許可していないため、再提出できません。</div>`;
    if (status.score) renderDetail(status.score);
    return;
  }
  const subjects = Array.isArray(form.subjects) ? form.subjects : [];
  if (!subjects.length) {
    host.innerHTML = '<div class="status-box warning">このフォームには教科が設定されていません。管理者に確認してください。</div>';
    return;
  }
  host.innerHTML = `<div class="card"><h4>${esc(form.title || "成績入力")}</h4>
    ${status.score ? '<div class="status-box warning">管理者から再回答が許可されています。入力内容を確認して再提出してください。</div>' : ""}
    <form id="scoreEntryForm">
      ${subjects.map((subject,i)=>`<div class="form-group"><label for="subject-${i}">${esc(subject)}（0〜100点）</label><input id="subject-${i}" name="subject-${i}" type="number" min="0" max="100" step="1" required data-subject="${esc(subject)}" value="${status.score && scoreSubjects(status.score)[subject] !== undefined ? esc(scoreSubjects(status.score)[subject]) : ""}"></div>`).join("")}
      <button class="primary-button" type="submit">入力内容を確認して提出</button>
      <button class="secondary-button" type="button" id="cancelEntry">閉じる</button>
    </form><div id="confirmArea"></div></div>`;
  $("cancelEntry").addEventListener("click",()=>{host.innerHTML="";selectedForm=null;});
  $("scoreEntryForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    const inputs = [...ev.currentTarget.querySelectorAll("input[data-subject]")];
    const subjectsObj = {};
    for (const input of inputs) {
      const n = Number(input.value);
      if (input.value.trim()==="" || !Number.isInteger(n) || n<0 || n>100) {
        input.focus(); setMessage("すべての教科に0〜100の整数を入力してください。","warning"); return;
      }
      subjectsObj[input.dataset.subject]=n;
    }
    const vals=Object.values(subjectsObj), total=vals.reduce((a,b)=>a+b,0);
    const average=Number((total/vals.length).toFixed(1));
    $("confirmArea").innerHTML = `<div class="status-box warning"><h4>提出前の確認</h4>${Object.entries(subjectsObj).map(([k,v])=>`<p>${esc(k)}：${esc(v)}点</p>`).join("")}<p>合計：${total}点 ／ 平均：${average}点</p><button type="button" class="primary-button" id="confirmSubmit">この内容で提出</button></div>`;
    $("confirmSubmit").addEventListener("click",()=>saveSubmission(form, status.score, subjectsObj,total,average));
  });
}
async function saveSubmission(form, existing, subjects,total,average) {
  if (submitting) return;
  submitting=true;
  const btn=$("confirmSubmit"); if(btn) btn.disabled=true;
  try {
    // Re-read immediately before write to reduce accidental duplicate submissions.
    const latestSnap=await getDocs(query(collection(db,"scores"),where("formId","==",form.id),where("uid","==",currentUser.uid)));
    const latest=latestSnap.docs.map(d=>({id:d.id,...d.data()})).sort(createdSort)[0] || null;
    if (latest && latest.resubmitAllowed !== true) {
      setMessage("すでに提出済みです。管理者の再回答許可が必要です。","warning");
      await loadData(); return;
    }
    const payload={formId:form.id,uid:currentUser.uid,name:userData.name||"",testName:form.title||"",subjects,total,average,resubmitAllowed:false,createdAt:serverTimestamp()};
    if (latest && latest.resubmitAllowed === true) {
      await updateDoc(doc(db,"scores",latest.id),{...payload,resubmittedAt:serverTimestamp()});
    } else {
      await addDoc(collection(db,"scores"),payload);
    }
    setMessage("提出しました。","success");
    await loadData();
    const fresh=latestScoreForForm(form.id);
    if (fresh) renderDetail(fresh);
  } catch (e) {
    console.error("成績提出エラー",e);
    setMessage(e?.code==="permission-denied" ? "提出権限がありません。Firestore Security Rulesを確認してください。" : "提出できませんでした。通信状態と権限を確認して、もう一度お試しください。","warning");
  } finally { submitting=false; }
}
async function loadData() {
  setMessage("");
  const [formSnap,scoreSnap] = await Promise.all([
    getDocs(collection(db,"scoreForms")),
    getDocs(query(collection(db,"scores"),where("uid","==",currentUser.uid)))
  ]);
  forms=formSnap.docs.map(d=>({id:d.id,...d.data()})).filter(isPublished).sort((a,b)=>dateMs(b.createdAt)-dateMs(a.createdAt));
  scores=scoreSnap.docs.map(d=>({id:d.id,...d.data()})).sort(createdSort);
  renderForms(); renderHistory();
}
function handleUrl() {
  const id=new URLSearchParams(location.search).get("id");
  if (!id) { $("scoreDetail").hidden=true; return; }
  const item=scores.find(s=>s.id===id || s.formId===id);
  if (item) renderDetail(item);
  else {
    $("scoreDetail").hidden=false;
    $("detailHeading").textContent="成績詳細";
    $("scoreDetailContent").innerHTML='<div class="status-box warning">指定された成績が見つからないか、まだ提出されていません。</div>';
  }
}
if ($("scoreFormList")) {
window.addEventListener("popstate",handleUrl);
onAuthStateChanged(auth,async user=>{
  if (!user) { location.href="../index.html"; return; }
  currentUser=user;
  try {
    userData=await getUserData(user);
    if (!userData || userData.role!=="student") {
      setMessage("生徒アカウントでログインしてください。","warning"); return;
    }
    await loadData();
    handleUrl();
  } catch(e) {
    console.error("成績読み込みエラー",e);
    setMessage(e?.code==="permission-denied" ? "成績を読み込む権限がありません。Firestore Security Rulesを確認してください。" : "データの読み込みに失敗しました。時間をおいて再読み込みしてください。","warning");
    $("scoreFormList").innerHTML='<div class="card">フォームを読み込めませんでした。</div>';
    $("scoreHistoryList").innerHTML='<div class="card">成績を読み込めませんでした。</div>';
  }
});
}
