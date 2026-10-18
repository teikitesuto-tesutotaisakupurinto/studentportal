*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
  min-height:100%;
  font-family:"Noto Sans JP","Yu Gothic",sans-serif;
  background:#f5f6f8;
  color:#1f2937;
}

body{
  min-height:100vh;
}

button,
input,
textarea,
select{
  font:inherit;
}

button{
  cursor:pointer;
}

a{
  color:inherit;
}

.material-symbols-rounded{
  font-family:"Material Symbols Rounded";
  font-weight:normal;
  font-style:normal;
  font-size:22px;
  line-height:1;
  letter-spacing:normal;
  text-transform:none;
  display:inline-block;
  white-space:nowrap;
  word-wrap:normal;
  direction:ltr;
  -webkit-font-feature-settings:"liga";
  -webkit-font-smoothing:antialiased;
}

/* =========================
   共通
========================= */

.site-title{
  font-size:18px;
  font-weight:700;
  margin:0;
}

.page-title{
  font-size:28px;
  line-height:1.3;
  margin:0 0 24px;
}

.card{
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:20px;
  margin-bottom:18px;
  box-shadow:0 2px 8px rgba(0,0,0,.04);
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:18px;
}

.primary-button,
.secondary-button,
.danger-button{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border:0;
  border-radius:8px;
  padding:11px 17px;
  font-weight:600;
}

.primary-button{
  background:#2563eb;
  color:#fff;
}

.secondary-button{
  background:#eef2f7;
  color:#374151;
}

.danger-button{
  background:#dc2626;
  color:#fff;
}

.primary-button:hover,
.secondary-button:hover,
.danger-button:hover{
  opacity:.9;
}

.error{
  color:#b91c1c;
}

.success{
  color:#047857;
}

.status-box{
  padding:14px 16px;
  border-radius:8px;
  margin-bottom:18px;
}

.status-box.success{
  background:#ecfdf5;
  border:1px solid #a7f3d0;
  color:#065f46;
}

.status-box.warning{
  background:#fffbeb;
  border:1px solid #fde68a;
  color:#92400e;
}

/* =========================
   ログイン
========================= */

.login-container{
  min-height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  padding:24px;
}

.login-box{
  width:420px;
  max-width:100%;
  background:#fff;
  padding:36px;
  border-radius:14px;
  border:1px solid #e5e7eb;
  box-shadow:0 10px 35px rgba(0,0,0,.09);
}

.login-box h1{
  font-size:23px;
  line-height:1.45;
  text-align:center;
  margin:0 0 8px;
}

.login-box > p{
  text-align:center;
  color:#6b7280;
  margin:0 0 28px;
}

.login-box label{
  display:block;
  font-weight:600;
  margin:0 0 7px;
}

.login-box input{
  width:100%;
  height:46px;
  padding:10px 12px;
  margin:0 0 18px;
  border:1px solid #d1d5db;
  border-radius:8px;
  outline:none;
}

.login-box input:focus{
  border-color:#2563eb;
  box-shadow:0 0 0 3px rgba(37,99,235,.1);
}

.login-box .primary-button{
  width:100%;
  height:46px;
}

.separator{
  display:flex;
  align-items:center;
  gap:12px;
  margin:22px 0;
  color:#9ca3af;
}

.separator::before,
.separator::after{
  content:"";
  height:1px;
  flex:1;
  background:#e5e7eb;
}

.google-btn{
  width:100%;
  height:46px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  border:1px solid #d1d5db;
  border-radius:8px;
  background:#fff;
  color:#374151;
  font-weight:600;
}

.google-btn:hover{
  background:#f9fafb;
}

.google-mark{
  font-weight:800;
  font-size:20px;
  color:#4285f4;
}

.login-error{
  min-height:20px;
  margin:14px 0 0;
  text-align:center;
}

/* =========================
   レイアウト
========================= */

.layout{
  min-height:100vh;
}

.sidebar{
  position:fixed;
  left:0;
  top:0;
  bottom:0;
  width:250px;
  background:#fff;
  border-right:1px solid #e5e7eb;
  z-index:1000;
  transition:width .2s ease;
  overflow:hidden;
}

.sidebar.collapsed{
  width:72px;
}

.sidebar-top{
  height:70px;
  display:flex;
  align-items:center;
  padding:0 14px;
  border-bottom:1px solid #e5e7eb;
}

.menu-toggle{
  width:44px;
  height:44px;
  flex:0 0 44px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:8px;
  background:#fff;
  color:#374151;
  padding:0;
}

.menu-toggle:hover{
  background:#eef2ff;
}

.sidebar-brand{
  margin-left:12px;
  font-size:14px;
  font-weight:700;
  line-height:1.35;
  white-space:nowrap;
  overflow:hidden;
}

.sidebar nav{
  display:flex;
  flex-direction:column;
  gap:4px;
  padding:14px 10px;
}

.menu-item{
  width:100%;
  min-height:46px;
  display:flex;
  align-items:center;
  gap:12px;
  padding:0 12px;
  border:0;
  border-radius:8px;
  background:#fff;
  color:#374151;
  text-decoration:none;
  font-size:14px;
  font-weight:600;
  text-align:left;
  white-space:nowrap;
  overflow:hidden;
}

.menu-item:hover{
  background:#eef2ff;
  color:#1d4ed8;
}

.menu-item.active{
  background:#dbeafe;
  color:#1d4ed8;
}

.menu-item .material-symbols-rounded{
  flex:0 0 22px;
}

.menu-label{
  overflow:hidden;
  text-overflow:ellipsis;
}

.sidebar.collapsed .sidebar-brand,
.sidebar.collapsed .menu-label{
  display:none;
}

.sidebar.collapsed .sidebar-top{
  justify-content:center;
  padding:0;
}

.sidebar.collapsed nav{
  padding:14px 10px;
}

.sidebar.collapsed .menu-item{
  justify-content:center;
  padding:0;
}

.sidebar-divider{
  height:1px;
  border:0;
  background:#e5e7eb;
  margin:10px 0;
}

.content{
  margin-left:250px;
  width:calc(100% - 250px);
  min-height:100vh;
  padding:30px;
  transition:margin-left .2s ease,width .2s ease;
}

.sidebar.collapsed ~ .content{
  margin-left:72px;
  width:calc(100% - 72px);
}

.content-inner{
  max-width:1200px;
  margin:0 auto;
}

/* =========================
   お知らせ
========================= */

.notice-list{
  display:flex;
  flex-direction:column;
}

.notice-item{
  padding:17px 0;
  border-bottom:1px solid #e5e7eb;
}

.notice-item:first-child{
  padding-top:0;
}

.notice-title{
  display:inline;
  color:#2563eb;
  text-decoration:underline;
  font-weight:700;
  font-size:17px;
  cursor:pointer;
}

.notice-title:hover{
  color:#1d4ed8;
}

.notice-meta{
  margin-top:7px;
  color:#6b7280;
  font-size:13px;
}

.notice-body{
  white-space:pre-wrap;
  line-height:1.9;
}

.important,
.normal-tag{
  display:inline-block;
  padding:3px 8px;
  border-radius:5px;
  font-size:12px;
  margin-right:7px;
}

.important{
  background:#fee2e2;
  color:#b91c1c;
}

.normal-tag{
  background:#e5e7eb;
  color:#374151;
}

/* =========================
   文書
========================= */

.document-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:15px;
}

.document-open{
  flex:0 0 auto;
  display:inline-flex;
  align-items:center;
  gap:7px;
  padding:9px 14px;
  border:0;
  border-radius:8px;
  background:#2563eb;
  color:#fff;
  text-decoration:none;
  font-weight:600;
  font-size:13px;
}

.document-open:hover{
  background:#1d4ed8;
}

.document-body{
  white-space:pre-wrap;
  line-height:1.8;
}

.document-period{
  color:#6b7280;
  font-size:13px;
}

/* =========================
   フォーム
========================= */

.form-group{
  margin-bottom:18px;
}

.form-group label{
  display:block;
  font-weight:600;
  margin-bottom:7px;
}

input,
textarea,
select{
  width:100%;
  padding:11px 12px;
  border:1px solid #d1d5db;
  border-radius:8px;
  background:#fff;
}

textarea{
  min-height:130px;
  resize:vertical;
}

input:focus,
textarea:focus,
select:focus{
  outline:none;
  border-color:#2563eb;
  box-shadow:0 0 0 3px rgba(37,99,235,.1);
}

.target-options{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
  gap:10px;
}

.target-options label{
  display:flex;
  align-items:center;
  gap:8px;
  padding:12px;
  border:1px solid #e5e7eb;
  border-radius:8px;
  cursor:pointer;
}

.target-options input{
  width:auto;
  margin:0;
}

.target-detail{
  padding:15px;
  margin-top:12px;
  background:#f8fafc;
  border-radius:8px;
}

/* =========================
   カレンダー
========================= */

.calendar-toolbar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:15px;
}

.calendar-toolbar h2{
  margin:0;
  font-size:22px;
}

.calendar-actions{
  display:flex;
  gap:7px;
}

.calendar-range{
  display:flex;
  flex-wrap:wrap;
  align-items:end;
  gap:10px;
  padding:14px;
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:10px;
  margin-bottom:15px;
}

.calendar-range .form-group{
  margin:0;
  flex:1 1 180px;
}

.calendar-wrap{
  overflow-x:auto;
}

.calendar{
  width:100%;
  min-width:820px;
  table-layout:fixed;
  border-collapse:collapse;
  background:#fff;
}

.calendar th{
  height:42px;
  background:#f3f4f6;
  border:1px solid #e5e7eb;
}

.calendar td{
  height:125px;
  padding:6px;
  vertical-align:top;
  border:1px solid #e5e7eb;
}

.calendar td.empty{
  background:#fafafa;
}

.calendar-day.today{
  background:#eff6ff;
}

.day-number{
  font-weight:700;
  margin-bottom:6px;
}

.calendar-event{
  display:block;
  width:100%;
  padding:5px 7px;
  margin:3px 0;
  border:0;
  border-left:3px solid #2563eb;
  border-radius:4px;
  background:#e8f0fe;
  color:#1f2937;
  text-align:left;
  font-size:12px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  cursor:pointer;
}

.calendar-event:hover{
  background:#dbeafe;
}

.event-detail{
  margin-top:18px;
}

/* =========================
   成績
========================= */

.analysis-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:16px;
}

.table-wrap{
  width:100%;
  overflow-x:auto;
}

.data-table{
  width:100%;
  border-collapse:collapse;
}

.data-table th,
.data-table td{
  border:1px solid #e5e7eb;
  padding:9px;
  text-align:left;
  white-space:nowrap;
}

.data-table th{
  background:#f3f4f6;
}

.distribution{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:8px;
}

.distribution > div{
  padding:10px;
  text-align:center;
  border:1px solid #e5e7eb;
  background:#fafafa;
  border-radius:6px;
}

.distribution strong{
  display:block;
  font-size:20px;
  margin-top:5px;
}

/* =========================
   スマホ
========================= */

@media(max-width:768px){

  .sidebar{
    width:72px;
  }

  .sidebar-brand,
  .menu-label{
    display:none;
  }

  .sidebar-top{
    justify-content:center;
    padding:0;
  }

  .menu-item{
    justify-content:center;
    padding:0;
  }

  .content,
  .sidebar.collapsed ~ .content{
    margin-left:72px;
    width:calc(100% - 72px);
    padding:18px;
  }

  .content{
    min-width:0;
  }

  .page-title{
    font-size:24px;
  }

  .distribution{
    grid-template-columns:repeat(3,1fr);
  }

  .calendar-toolbar{
    align-items:flex-start;
    flex-direction:column;
  }

}

@media(max-width:480px){

  .login-box{
    padding:26px 20px;
  }

  .login-box h1{
    font-size:20px;
  }

  .content{
    padding:12px;
  }

}


/* 成績確認画面：レスポンシブ */
.score-item h3{margin:0 0 12px;font-size:19px;overflow-wrap:anywhere}
.score-item p{line-height:1.7;overflow-wrap:anywhere}
.score-item button{max-width:100%;white-space:normal}
#scoreDetail{margin-top:28px}
#scoreDetail[hidden]{display:none}
#scoreFormList,#scoreHistoryList{min-width:0}
#scoreEntryForm .form-group{max-width:480px}
#scoreEntryForm input{width:100%;min-height:44px}
#confirmArea{margin-top:16px}
button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:768px){
  .score-item{padding:15px}
  .score-item button{width:100%;margin:4px 0}
  .table-wrap .data-table{min-width:480px}
}
