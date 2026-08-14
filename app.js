'use strict';
// ================================================================
//  CampusConnect — app.js
//  Single-file SPA: router + state + all pages + all features
// ================================================================

// ── CONSTANTS ────────────────────────────────────────────────────
const DOMAIN       = '@sakec.ac.in';
const POLL_CHAT    = 5000;
const POLL_NOTIF   = 10000;
const MAX_FILE     = 5 * 1024 * 1024; // 5 MB

const AV_COLORS = [
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#22d3ee,#0891b2)',
  'linear-gradient(135deg,#f43f5e,#be123c)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#a78bfa,#7c3aed)',
  'linear-gradient(135deg,#fb7185,#e11d48)',
  'linear-gradient(135deg,#34d399,#10b981)',
];
const BANNERS = [
  'linear-gradient(135deg,#3730a3,#6d28d9,#7c3aed)',
  'linear-gradient(135deg,#0c4a6e,#0891b2,#22d3ee)',
  'linear-gradient(135deg,#7f1d1d,#be123c,#f43f5e)',
  'linear-gradient(135deg,#14532d,#059669,#10b981)',
  'linear-gradient(135deg,#451a03,#d97706,#f59e0b)',
  'linear-gradient(135deg,#1e1b4b,#4338ca,#818cf8)',
  'linear-gradient(135deg,#0f172a,#1e40af,#3b82f6)',
  'linear-gradient(135deg,#2d1b69,#7c3aed,#a78bfa)',
];

function avColor(s){ let h=0; for(let c of String(s)) h=c.charCodeAt(0)+((h<<5)-h); return AV_COLORS[Math.abs(h)%AV_COLORS.length]; }
function banner(s){ let h=0; for(let c of String(s)) h=c.charCodeAt(0)+((h<<5)-h); return BANNERS[Math.abs(h)%BANNERS.length]; }
function initials(n){ return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
const uid = ()=> Math.random().toString(36).slice(2)+Date.now().toString(36);

// ── STORAGE (localStorage DB) ─────────────────────────────────────
const DB = {
  get:(k,d=null)=>{ try{ const v=localStorage.getItem('cc_'+k); return v?JSON.parse(v):d; }catch{ return d; } },
  set:(k,v)=>{ try{ localStorage.setItem('cc_'+k,JSON.stringify(v)); }catch(e){ console.error(e); } },

  // Users
  users:()=>DB.get('users',[]),
  saveUser(u){ const a=DB.users(); const i=a.findIndex(x=>x.id===u.id); if(i>=0)a[i]=u; else a.push(u); DB.set('users',a); },
  userById:(id)=>DB.users().find(u=>u.id===id),
  userByEmail:(e)=>DB.users().find(u=>u.email===e.toLowerCase()),

  // Classes
  classes:()=>DB.get('classes',[]),
  saveClass(c){ const a=DB.classes(); const i=a.findIndex(x=>x.id===c.id); if(i>=0)a[i]=c; else a.push(c); DB.set('classes',a); },
  classById:(id)=>DB.classes().find(c=>c.id===id),

  // Enrollments
  enrollments:()=>DB.get('enrollments',[]),
  enroll(e){ const a=DB.enrollments(); if(!a.find(x=>x.userId===e.userId&&x.classId===e.classId)){ a.push(e); DB.set('enrollments',a); } },
  classesForUser:(uid)=>DB.enrollments().filter(e=>e.userId===uid).map(e=>DB.classById(e.classId)).filter(Boolean),
  membersOf:(cid)=>DB.enrollments().filter(e=>e.classId===cid).map(e=>({...DB.userById(e.userId),roleInClass:e.role})).filter(x=>x.id),
  isEnrolled:(uid,cid)=>DB.enrollments().some(e=>e.userId===uid&&e.classId===cid),
  unenroll:(uid,cid)=>{ const a=DB.enrollments().filter(e=>!(e.userId===uid&&e.classId===cid)); DB.set('enrollments',a); },

  // Announcements
  announcements:(cid)=>DB.get('announcements',[]).filter(a=>a.classId===cid).sort((a,b)=>b.createdAt-a.createdAt),
  addAnnouncement(a){ const arr=DB.get('announcements',[]); arr.push(a); DB.set('announcements',arr); },

  // Assignments
  assignments:(cid)=>DB.get('assignments',[]).filter(a=>a.classId===cid).sort((a,b)=>a.dueAt-b.dueAt),
  allAssignments:()=>DB.get('assignments',[]),
  saveAssignment(a){ const arr=DB.get('assignments',[]); const i=arr.findIndex(x=>x.id===a.id); if(i>=0)arr[i]=a; else arr.push(a); DB.set('assignments',arr); },
  assignmentById:(id)=>DB.get('assignments',[]).find(a=>a.id===id),

  // Submissions
  submissions:(aid)=>DB.get('submissions',[]).filter(s=>s.assignmentId===aid),
  submissionBy:(aid,sid)=>DB.get('submissions',[]).find(s=>s.assignmentId===aid&&s.studentId===sid),
  saveSubmission(s){ const arr=DB.get('submissions',[]); const i=arr.findIndex(x=>x.id===s.id); if(i>=0)arr[i]=s; else arr.push(s); DB.set('submissions',arr); },

  // Resources
  resources:(cid)=>DB.get('resources',[]).filter(r=>r.classId===cid).sort((a,b)=>b.createdAt-a.createdAt),
  addResource(r){ const arr=DB.get('resources',[]); arr.push(r); DB.set('resources',arr); },
  deleteResource(id){ DB.set('resources', DB.get('resources',[]).filter(r=>r.id!==id)); },

  // Messages
  messages:(cid)=>DB.get('messages',[]).filter(m=>m.classId===cid).sort((a,b)=>a.createdAt-b.createdAt),
  addMessage(m){ const arr=DB.get('messages',[]); arr.push(m); DB.set('messages',arr); },
  pinMsg(id,v){ const arr=DB.get('messages',[]); const m=arr.find(x=>x.id===id); if(m){m.pinned=v; DB.set('messages',arr);} },

  // Notifications
  notifs:(uid)=>DB.get('notifs',[]).filter(n=>n.userId===uid).sort((a,b)=>b.createdAt-a.createdAt),
  addNotif(n){ const arr=DB.get('notifs',[]); arr.push(n); DB.set('notifs',arr); },
  markRead(id){ const arr=DB.get('notifs',[]); const n=arr.find(x=>x.id===id); if(n){n.readAt=Date.now(); DB.set('notifs',arr);} },
  markAllRead(uid){ const arr=DB.get('notifs',[]); arr.filter(n=>n.userId===uid&&!n.readAt).forEach(n=>n.readAt=Date.now()); DB.set('notifs',arr); },
  unreadCount:(uid)=>DB.notifs(uid).filter(n=>!n.readAt).length,

  // Reads (announcement read state)
  markAnnouncementRead:(uid,aid)=>{ const r=DB.get('reads',{}); r[uid+'_'+aid]=true; DB.set('reads',r); },
  isRead:(uid,aid)=>!!DB.get('reads',{})[uid+'_'+aid],

  // Drafts
  getDraft:(aid)=>DB.get('draft_'+aid,''),
  saveDraft:(aid,t)=>DB.set('draft_'+aid,t),
  clearDraft:(aid)=>localStorage.removeItem('cc_draft_'+aid),

  // Session
  session:()=>DB.get('session',null),
  setSession:(uid)=>DB.set('session',{userId:uid,loginAt:Date.now()}),
  clearSession:()=>localStorage.removeItem('cc_session'),
};

function notify(userIds, type, msg, payload={}){
  userIds.filter(Boolean).forEach(uid=>{
    DB.addNotif({id:uid_fn(), userId:uid, type, message:msg, payload, createdAt:Date.now(), readAt:null});
  });
}
function uid_fn(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }

// ── SEED DATA ─────────────────────────────────────────────────────
function seed(){
  if(DB.get('seeded2')) return;

  const now = Date.now();
  const d = 86400000;

  const users = [
    {id:'admin001',name:'Admin (Test)',email:'admin@sakec.ac.in',ph:btoa('Admin@123'),role:'admin',createdAt:now-30*d},
    {id:'tea001',name:'Dr. Priya Sharma',email:'priya.sharma@sakec.ac.in',ph:btoa('Teacher@123'),role:'teacher',createdAt:now-20*d},
    {id:'tea002',name:'Prof. Rahul Mehta',email:'rahul.mehta@sakec.ac.in',ph:btoa('Teacher@123'),role:'teacher',createdAt:now-18*d},
    {id:'stu001',name:'Aisha Khan',email:'aisha.khan@sakec.ac.in',ph:btoa('Student@123'),role:'student',createdAt:now-10*d},
    {id:'stu002',name:'Rohan Verma',email:'rohan.verma@sakec.ac.in',ph:btoa('Student@123'),role:'student',createdAt:now-8*d},
    {id:'stu003',name:'Sneha Patel',email:'sneha.patel@sakec.ac.in',ph:btoa('Student@123'),role:'student',createdAt:now-6*d},
  ];
  users.forEach(u=>DB.saveUser(u));

  const classes = [
    {id:'cls001',name:'Data Structures & Algorithms',subject:'Computer Science',createdBy:'tea001',code:'CS-DSA-2024',semester:3,createdAt:now-18*d},
    {id:'cls002',name:'Database Management Systems',subject:'Computer Science',createdBy:'tea002',code:'CS-DBMS-2024',semester:3,createdAt:now-16*d},
    {id:'cls003',name:'Engineering Mathematics III',subject:'Mathematics',createdBy:'tea001',code:'MATH-3-2024',semester:3,createdAt:now-14*d},
  ];
  classes.forEach(c=>DB.saveClass(c));

  [
    {userId:'tea001',classId:'cls001',role:'teacher'},
    {userId:'tea002',classId:'cls002',role:'teacher'},
    {userId:'tea001',classId:'cls003',role:'teacher'},
    {userId:'stu001',classId:'cls001',role:'student'},
    {userId:'stu001',classId:'cls002',role:'student'},
    {userId:'stu001',classId:'cls003',role:'student'},
    {userId:'stu002',classId:'cls001',role:'student'},
    {userId:'stu002',classId:'cls002',role:'student'},
    {userId:'stu003',classId:'cls001',role:'student'},
    {userId:'stu003',classId:'cls003',role:'student'},
  ].forEach(e=>DB.enroll(e));

  [
    {classId:'cls001',authorId:'tea001',body:'📚 Welcome to DSA! Please review the syllabus in Resources. First assessment is in Week 3.',createdAt:now-5*d},
    {classId:'cls001',authorId:'tea001',body:'⚠️ Reminder: Assignment 1 (Linked List) is due this Friday at 11:59 PM. No late submissions without prior approval.',createdAt:now-2*d},
    {classId:'cls002',authorId:'tea002',body:'🗃️ Notes for Unit 2 (Normalization) have been uploaded to Resources. Please read before Thursday.',createdAt:now-3*d},
    {classId:'cls003',authorId:'tea001',body:'📐 Mathematics quiz on Laplace Transforms — next Monday. Practice Ch. 4 problems.',createdAt:now-d},
  ].forEach(a=>DB.addAnnouncement({id:uid(),...a}));

  const asgns = [
    {id:'asgn001',classId:'cls001',title:'Linked List Implementation',instructions:'Implement a doubly linked list with:\n1. Node class (data, prev, next)\n2. Insert at beginning, end, position n\n3. Delete by value and position\n4. Search and display functions\n\nSubmit your code + a brief explanation (≤ 300 words).',dueAt:now+3*d,createdBy:'tea001',createdAt:now-5*d},
    {id:'asgn002',classId:'cls001',title:'Binary Search Tree Operations',instructions:'Implement a BST with:\n1. Insert, Delete, Search\n2. Inorder, Preorder, Postorder traversal\n3. Height calculation\n4. Time complexity analysis for each operation.',dueAt:now+10*d,createdBy:'tea001',createdAt:now-2*d},
    {id:'asgn003',classId:'cls002',title:'ER Diagram Design',instructions:'Design an ER diagram for a Hospital Management System:\n1. Entities: Patient, Doctor, Nurse, Department\n2. Relationships with cardinality\n3. Primary and foreign keys\n4. Convert to relational schema\n\nSubmit as PDF or image.',dueAt:now+5*d,createdBy:'tea002',createdAt:now-3*d},
    {id:'asgn004',classId:'cls003',title:'Laplace Transform Problems',instructions:'Solve from Chapter 4:\n- Problems 1–10 from Exercise 4.2\n- Problems 3, 5, 7 from Exercise 4.4\n\nShow all steps. Answers without working will not be graded.',dueAt:now-d,createdBy:'tea001',createdAt:now-7*d},
  ];
  asgns.forEach(a=>DB.saveAssignment(a));

  [
    {id:uid(),assignmentId:'asgn001',studentId:'stu002',textBody:'Implemented doubly linked list in Python. Node class with data, prev and next. All required operations implemented.',fileName:'doubly_ll.py',submittedAt:now-d,grade:88,feedback:'Excellent work! Clean code. Minor edge-case issue in delete-by-position.'},
    {id:uid(),assignmentId:'asgn004',studentId:'stu001',textBody:'Solutions to all required Chapter 4 problems attached.',fileName:'laplace_solutions.pdf',submittedAt:now-2*d,grade:null,feedback:null},
    {id:uid(),assignmentId:'asgn004',studentId:'stu003',textBody:'Completed all 13 problems. Used partial fractions for problems 5 and 7.',fileName:null,submittedAt:now-1.5*d,grade:91,feedback:'Great work! Valid alternative approach for problem 7.'},
  ].forEach(s=>DB.saveSubmission(s));

  [
    {classId:'cls001',uploadedBy:'tea001',title:'DSA Syllabus 2024-25',description:'Complete course syllabus, topics, and grading policy.',fileName:'DSA_Syllabus.pdf',fileType:'pdf',fileSize:245000,createdAt:now-17*d},
    {classId:'cls001',uploadedBy:'tea001',title:'Linked Lists — Lecture Slides',description:'Week 2 slides: singly and doubly linked lists.',fileName:'LinkedLists_W2.pptx',fileType:'pptx',fileSize:1240000,createdAt:now-8*d},
    {classId:'cls002',uploadedBy:'tea002',title:'DBMS Unit 2 — Normalization',description:'1NF, 2NF, 3NF, BCNF with examples.',fileName:'Normalization_Notes.pdf',fileType:'pdf',fileSize:890000,createdAt:now-3*d},
    {classId:'cls003',uploadedBy:'tea001',title:'Laplace Transform Reference',description:'Quick reference for transform pairs and theorems.',fileName:'Laplace_Ref.pdf',fileType:'pdf',fileSize:320000,createdAt:now-6*d},
  ].forEach(r=>DB.addResource({id:uid(),...r}));

  [
    {classId:'cls001',authorId:'stu001',body:'Hi everyone! Has anyone started on the Linked List assignment?',pinned:false,createdAt:now-1.5*d*1000/1000},
    {classId:'cls001',authorId:'stu002',body:'Yes! Python. The delete-by-position part was tricky.',pinned:false,createdAt:now-1.4*d},
    {classId:'cls001',authorId:'tea001',body:'📌 Submit via the Assignments tab. Make sure your code has proper comments!',pinned:true,createdAt:now-1.2*d},
    {classId:'cls001',authorId:'stu003',body:'Professor, can we use C++?',pinned:false,createdAt:now-0.8*d},
    {classId:'cls001',authorId:'tea001',body:'Yes, any language is fine — just explain your logic clearly.',pinned:false,createdAt:now-0.6*d},
  ].forEach(m=>DB.addMessage({id:uid(),...m}));

  notify(['stu001','stu002','stu003'],'announcement','📢 New announcement in Data Structures & Algorithms',{classId:'cls001'});
  notify(['stu002'],'grade','🎯 Your Linked List assignment was graded: 88/100',{assignmentId:'asgn001'});
  notify(['stu003'],'grade','🎯 Your Laplace Transform submission was graded: 91/100',{assignmentId:'asgn004'});
  notify(['stu001','stu002','stu003'],'assignment','📝 New assignment: "Binary Search Tree Operations" in DSA',{assignmentId:'asgn002'});

  DB.set('seeded2',true);
}

// ── AUTH ──────────────────────────────────────────────────────────
const Auth = {
  user: null,
  init(){ const s=DB.session(); if(s) this.user=DB.userById(s.userId); },
  login(email, pass){
    email=email.toLowerCase().trim();
    if(!email.endsWith(DOMAIN)) return {ok:false,err:`Only ${DOMAIN} emails allowed.`};
    const u=DB.userByEmail(email);
    if(!u) return {ok:false,err:'No account found with this email.'};
    if(u.ph!==btoa(pass)) return {ok:false,err:'Incorrect password.'};
    this.user=u; DB.setSession(u.id); return {ok:true,user:u};
  },
  register(name,email,pass,role){
    email=email.toLowerCase().trim();
    if(!email.endsWith(DOMAIN)) return {ok:false,err:`Only ${DOMAIN} emails allowed.`};
    if(!name.trim()||name.trim().length<2) return {ok:false,err:'Enter your full name.'};
    if(!pass||pass.length<6) return {ok:false,err:'Password must be at least 6 characters.'};
    if(DB.userByEmail(email)) return {ok:false,err:'An account with this email already exists.'};
    const u={id:uid(),name:name.trim(),email,ph:btoa(pass),role:role||'student',createdAt:Date.now()};
    DB.saveUser(u); this.user=u; DB.setSession(u.id); return {ok:true,user:u};
  },
  logout(){ this.user=null; DB.clearSession(); },
  get ok(){ return !!this.user; },
  get role(){ return this.user?.role; },
  get id(){ return this.user?.id; },
};

// ── ROUTER ────────────────────────────────────────────────────────
const Router = {
  page: null,
  params: {},
  polls: [],

  go(page, params={}){
    this._clearPolls();
    this.page=page; this.params=params;
    this._render();
    window.scrollTo(0,0);
  },

  _clearPolls(){ this.polls.forEach(clearInterval); this.polls=[]; if(window._jitsi){try{window._jitsi.dispose();}catch(e){} window._jitsi=null;} },
  addPoll(fn,ms){ const id=setInterval(fn,ms); this.polls.push(id); },

  _render(){
    const app=document.getElementById('app');
    if(!Auth.ok){ app.innerHTML=Pages.login(); bindAuth(); tilt(); return; }
    switch(this.page){
      case 'register':  app.innerHTML=Pages.register(); bindAuth(); tilt(); break;
      case 'dashboard': app.innerHTML=Pages.dashboard(); break;
      case 'class':     app.innerHTML=Pages.classTeam(this.params.cid, this.params.tab||'stream');
                        if(this.params.tab==='chat') startChatPoll(this.params.cid); break;
      case 'assignment':app.innerHTML=Pages.assignment(this.params.aid); break;
      case 'progress':  app.innerHTML=Pages.progress(); break;
      case 'gradebook': app.innerHTML=Pages.gradebook(this.params.cid); break;
      case 'admin':     app.innerHTML=Pages.admin(); break;
      case 'notifs':    app.innerHTML=Pages.notifs(); break;
      case 'profile':   app.innerHTML=Pages.profile(); break;
      default:          app.innerHTML=Pages.dashboard();
    }
    bindGlobal(); tilt(); startNotifPoll();
  },
};

// ── SVG ICONS ─────────────────────────────────────────────────────
const I={
  logo:`<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  home:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  users:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  assign:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  chat:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  bell:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  folder:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  progress:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  admin:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  logout:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  plus:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  video:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  send:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  pin:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  check:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  clock:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  file:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  dl:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  close:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  back:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  menu:`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  upload:`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  wifi:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  wifiOff:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  copy:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  trash:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  announce:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
};

// ── HELPERS ───────────────────────────────────────────────────────
function timeAgo(ts){
  const d=Date.now()-ts;
  if(d<60000) return 'just now';
  if(d<3600000) return Math.floor(d/60000)+'m ago';
  if(d<86400000) return Math.floor(d/3600000)+'h ago';
  if(d<604800000) return Math.floor(d/86400000)+'d ago';
  return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function fDate(ts){ return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function fBytes(b){ if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function fileEmoji(t=''){
  if(t.includes('pdf')) return '📕';
  if(t.includes('ppt')) return '📊';
  if(t.includes('doc')||t.includes('word')) return '📝';
  if(t.includes('xls')||t.includes('sheet')) return '📗';
  if(t.includes('image')||t.includes('jpg')||t.includes('png')) return '🖼️';
  if(t.includes('zip')||t.includes('rar')) return '🗜️';
  if(t.includes('mp4')||t.includes('video')) return '🎬';
  return '📄';
}
function dueStatus(ts){
  const d=ts-Date.now();
  if(d<0) return {label:'Overdue',cls:'badge-rose'};
  if(d<86400000) return {label:'Due today',cls:'badge-amber'};
  if(d<3*86400000) return {label:`Due in ${Math.ceil(d/86400000)}d`,cls:'badge-amber'};
  return {label:new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short'}),cls:'badge-muted'};
}
function av(user,sz=''){
  if(!user) return `<div class="avatar ${sz}" style="background:var(--glass-2)">?</div>`;
  return `<div class="avatar ${sz}" style="background:${avColor(user.id)}">${initials(user.name)}</div>`;
}
function isLowBw(){ return localStorage.getItem('cc_lowbw')==='1'; }
function toggleLowBw(){ isLowBw()?localStorage.removeItem('cc_lowbw'):localStorage.setItem('cc_lowbw','1'); Router._render(); toast(isLowBw()?'Low-bandwidth ON':'Low-bandwidth OFF','info'); }

// Toast
function toast(msg,type='info'){
  const tc=document.getElementById('toast-container');
  const el=document.createElement('div');
  el.className=`toast toast-${type}`;
  el.innerHTML=`<span>${{success:'✅',error:'❌',info:'ℹ️'}[type]||'ℹ️'}</span><span>${msg}</span>`;
  tc.appendChild(el);
  setTimeout(()=>{ el.style.cssText='opacity:0;transform:translateX(40px);transition:.3s'; setTimeout(()=>el.remove(),320); },3500);
}

// Modal
function showModal(html){ const o=document.getElementById('modal-overlay'); o.innerHTML=`<div class="modal animate-in">${html}</div>`; o.classList.remove('hidden'); }
function closeModal(){ const o=document.getElementById('modal-overlay'); o.classList.add('hidden'); o.innerHTML=''; }

// ── 3D TILT ───────────────────────────────────────────────────────
function tilt(){
  document.querySelectorAll('.glass-card,.class-card,.auth-card').forEach(el=>{
    if(el._tilt) return; el._tilt=true;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      const m=el.classList.contains('auth-card')?7:11;
      el.style.transform=`perspective(1000px) rotateY(${x*m}deg) rotateX(${-y*m}deg) translateZ(8px)`;
    });
    el.addEventListener('mouseleave',()=>{ el.style.transform=''; });
  });
}

// ── COMPONENTS ────────────────────────────────────────────────────
function sidebar(active=''){
  const u=Auth.user;
  const uc=DB.unreadCount(u.id);
  const cls=DB.classesForUser(u.id);

  const navLinks={
    student:[
      {id:'dashboard',lbl:'Dashboard',icon:I.home},
      {id:'progress',lbl:'My Work',icon:I.progress},
      {id:'notifs',lbl:'Notifications',icon:I.bell,badge:uc},
    ],
    teacher:[
      {id:'dashboard',lbl:'Dashboard',icon:I.home},
      {id:'notifs',lbl:'Notifications',icon:I.bell,badge:uc},
    ],
    admin:[
      {id:'dashboard',lbl:'Dashboard',icon:I.home},
      {id:'admin',lbl:'Admin Panel',icon:I.admin},
      {id:'notifs',lbl:'Notifications',icon:I.bell,badge:uc},
    ],
  };
  const links=(navLinks[u.role]||navLinks.student);

  return `
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${I.logo}</div>
      <span class="sidebar-logo-text">CampusConnect</span>
    </div>
    <div class="nav-section">
      <div class="nav-label">Navigation</div>
      ${links.map(l=>`
        <div class="nav-item ${active===l.id?'active':''}" data-nav="${l.id}">
          ${l.icon}<span>${l.lbl}</span>
          ${l.badge?`<span class="nav-badge">${l.badge}</span>`:''}
        </div>`).join('')}
    </div>
    ${u.role!=='admin'?`
    <div class="nav-section">
      <div class="nav-label">My Classes
        ${u.role==='teacher'?`<button class="btn btn-ghost btn-sm" id="sb-new-class" style="padding:1px 6px;font-size:11px" title="New class">${I.plus}</button>`:''}
        ${u.role==='student'?`<button class="btn btn-ghost btn-sm" id="sb-join-class" style="padding:1px 6px;font-size:11px" title="Join class">${I.plus}</button>`:''}
      </div>
      ${cls.map(c=>`
        <div class="nav-item" data-nav="class" data-cid="${c.id}">
          <span style="width:8px;height:8px;border-radius:50%;background:${avColor(c.id)};flex-shrink:0"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px">${c.name}</span>
        </div>`).join('')}
    </div>`:''}
    <div class="sidebar-bottom">
      <div style="display:flex;align-items:center;gap:8px;padding:0 12px;margin-bottom:10px">
        <button class="icon-btn" id="lowbw-btn" title="${isLowBw()?'Disable':'Enable'} low-bandwidth mode" style="width:32px;height:32px">
          ${isLowBw()?I.wifiOff:I.wifi}
        </button>
        <span style="font-size:11px;color:var(--t4)">${isLowBw()?'Low-BW':'Normal'}</span>
      </div>
      <div class="user-card" data-nav="profile">
        ${av(u)}
        <div class="user-info">
          <div class="user-name">${u.name}</div>
          <div class="user-role">${u.role}</div>
        </div>
      </div>
      <div class="nav-item" id="logout-btn" style="color:var(--rose-l);margin-top:4px">
        ${I.logout}<span>Sign Out</span>
      </div>
    </div>
  </aside>`;
}

function topbar(title, backTarget=''){
  const u=Auth.user;
  const uc=DB.unreadCount(u.id);
  return `
  <header class="topbar">
    <button class="icon-btn" id="mob-menu" style="display:none">${I.menu}</button>
    ${backTarget?`<button class="icon-btn" id="back-btn" data-target="${backTarget}">${I.back}</button>`:''}
    <h1 class="topbar-title">${title}</h1>
    <div class="topbar-actions">
      <button class="icon-btn" id="notif-bell" title="Notifications" style="position:relative">
        ${I.bell}${uc>0?`<span class="notif-dot"></span>`:''}
      </button>
      ${av(u,'avatar-sm')}
    </div>
  </header>`;
}

// ── PAGES ─────────────────────────────────────────────────────────
const Pages = {

login(){return `<div class="auth-page"><div class="auth-card glass-prism" id="auth-card"><div class="auth-logo"><div class="auth-logo-icon">${I.logo}</div><span class="auth-logo-text">CampusConnect</span></div><p class="auth-tagline">Your school, <strong>all in one place</strong>.<br>Classes · Assignments · Chat · Video Meetings</p><form id="login-form"><div class="form-group"><label class="form-label">Email Address</label><input id="l-email" type="email" class="form-input" placeholder="you@sakec.ac.in" autocomplete="email"></div><div class="form-group"><label class="form-label">Password</label><input id="l-pass" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password"></div><div class="form-err" id="l-err"></div><button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:10px">Sign In</button></form><div style="text-align:center;margin-top:18px;font-size:13px;color:var(--t4)">New here? <a href="#" id="go-reg" style="color:var(--violet-l);font-weight:600">Create Account</a></div><div style="margin-top:26px;padding:16px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)"><div style="font-size:10.5px;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.9px;margin-bottom:10px">Quick-Login Test Accounts</div><div class="test-acc" data-e="admin@sakec.ac.in" data-p="Admin@123"><span class="badge badge-rose">Admin</span><span style="font-size:12px;color:var(--t3)">admin@sakec.ac.in / Admin@123</span></div><div class="test-acc" data-e="priya.sharma@sakec.ac.in" data-p="Teacher@123"><span class="badge badge-violet">Teacher</span><span style="font-size:12px;color:var(--t3)">priya.sharma@sakec.ac.in / Teacher@123</span></div><div class="test-acc" data-e="aisha.khan@sakec.ac.in" data-p="Student@123"><span class="badge badge-cyan">Student</span><span style="font-size:12px;color:var(--t3)">aisha.khan@sakec.ac.in / Student@123</span></div></div></div></div>`;},


register(){return `<div class="auth-page"><div class="auth-card glass-prism"><div class="auth-logo"><div class="auth-logo-icon">${I.logo}</div><span class="auth-logo-text">CampusConnect</span></div><p class="auth-tagline">Join your school's digital campus.<br><strong>Only @sakec.ac.in emails.</strong></p><form id="reg-form"><div class="form-group"><label class="form-label">Full Name</label><input id="r-name" type="text" class="form-input" placeholder="Your full name"></div><div class="form-group"><label class="form-label">Email Address</label><input id="r-email" type="email" class="form-input" placeholder="you@sakec.ac.in"><div class="form-hint">Must be a @sakec.ac.in address</div></div><div class="form-group"><label class="form-label">Role</label><select id="r-role" class="form-select"><option value="student">Student</option><option value="teacher">Teacher</option></select></div><div class="two-col"><div class="form-group"><label class="form-label">Password</label><input id="r-pass" type="password" class="form-input" placeholder="Min. 6 chars"></div><div class="form-group"><label class="form-label">Confirm</label><input id="r-conf" type="password" class="form-input" placeholder="Re-enter"></div></div><div class="form-err" id="r-err"></div><button type="submit" class="btn btn-primary btn-full btn-lg">Create Account</button></form><div style="text-align:center;margin-top:14px;font-size:13px;color:var(--t4)">Already have an account? <a href="#" id="go-login" style="color:var(--violet-l);font-weight:600">Sign In</a></div></div></div>`;},

dashboard(){
  const u=Auth.user; const lbw=isLowBw();
  const classes=DB.classesForUser(u.id);
  const now=Date.now(); const week=7*86400000;
  let due=[];
  if(u.role==='student'){classes.forEach(c=>{DB.assignments(c.id).forEach(a=>{if(a.dueAt>now&&a.dueAt<now+week&&!DB.submissionBy(a.id,u.id))due.push({...a,className:c.name});});});due.sort((a,b)=>a.dueAt-b.dueAt);}
  return `<div class="app-layout${lbw?' low-bw':''}">${sidebar('dashboard')}<div class="main-content">${topbar('Welcome back, '+u.name.split(' ')[0]+'! 👋')}<div class="page stagger">
  ${u.role==='student'&&due.length>0?`<div class="mb-24 animate-in"><div class="section-hdr mb-16"><div><div class="section-title">⏰ Due This Week</div><div class="section-sub">${due.length} assignment${due.length!==1?'s':''} coming up</div></div></div>${due.slice(0,3).map(a=>{const ds=dueStatus(a.dueAt);return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:var(--amber-d);color:var(--amber-l)">${I.clock}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${a.className}</div></div><span class="badge ${ds.cls}">${ds.label}</span></div>`;}).join('')}</div>`:''}
  <div class="section-hdr mb-16"><div><div class="section-title">My Classes</div><div class="section-sub">${classes.length} class${classes.length!==1?'es':''}</div></div><div style="display:flex;gap:8px">${u.role==='teacher'?`<button class="btn btn-primary btn-sm" id="new-class-btn">${I.plus} New Class</button>`:''}${u.role==='student'?`<button class="btn btn-secondary btn-sm" id="join-class-btn">${I.plus} Join Class</button>`:''}</div></div>
  ${classes.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">🏫</div><div class="empty-text">No classes yet</div><div class="empty-sub">${u.role==='student'?'Ask your teacher for a class code.':'Create your first class!'}</div>${u.role==='student'?`<button class="btn btn-primary" style="margin-top:18px" id="join-class-btn">${I.plus} Join Class</button>`:`<button class="btn btn-primary" style="margin-top:18px" id="new-class-btn">${I.plus} Create</button>`}</div>`:`<div class="card-grid">${classes.map(c=>{const teacher=DB.userById(c.createdBy);const members=DB.membersOf(c.id);const asgns=DB.assignments(c.id);return `<div class="class-card glass-prism" data-nav="class" data-cid="${c.id}">${!lbw?`<div class="class-card-banner" style="background:${banner(c.id)}"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.12"><svg width="80" height="80" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div></div>`:''}<div class="class-card-body"><div class="class-card-name">${c.name}</div><div class="class-card-sub">${c.subject} · Sem ${c.semester||3}</div><div style="display:flex;gap:5px;margin-bottom:11px"><span class="badge badge-muted">${I.assign} ${asgns.length}</span><span class="badge badge-muted">${I.users} ${members.length}</span></div><div class="class-card-meta"><div style="display:flex;align-items:center;gap:6px">${teacher?av(teacher,'avatar-sm'):''}<span style="font-size:12px">${teacher?.name||'Unknown'}</span></div><span class="badge badge-violet" style="font-size:10px">${c.code}</span></div></div></div>`;}).join('')}</div>`}
  </div></div></div>`;
},

classTeam(cid,activeTab='stream'){
  const u=Auth.user; const lbw=isLowBw();
  const cls=DB.classById(cid);
  if(!cls) return `<div style="padding:60px;text-align:center;color:var(--t4)">Class not found.</div>`;
  const members=DB.membersOf(cid);
  const isT=u.role==='teacher'&&cls.createdBy===u.id;
  const tabs=[{id:'stream',lbl:'Stream',icon:I.announce},{id:'assignments',lbl:'Assignments',icon:I.assign},{id:'resources',lbl:'Resources',icon:I.folder},{id:'chat',lbl:'Chat',icon:I.chat},{id:'meet',lbl:'Meet',icon:I.video},...(isT?[{id:'members',lbl:'Members',icon:I.users},{id:'gradebook',lbl:'Gradebook',icon:I.progress}]:[])];
  let content='';
  switch(activeTab){case 'stream':content=this._stream(cid,isT);break;case 'assignments':content=this._assignments(cid,isT);break;case 'resources':content=this._resources(cid,isT,lbw);break;case 'chat':content=this._chat(cid);break;case 'meet':content=this._meet(cid,cls);break;case 'members':content=this._members(cid,isT);break;case 'gradebook':content=Pages.gradebook(cid,true);break;default:content=this._stream(cid,isT);}
  return `<div class="app-layout${lbw?' low-bw':''}">${sidebar()}<div class="main-content">${topbar(cls.name,'dashboard')}<div class="page">${!lbw?`<div class="class-header mb-24" style="background:${banner(cid)}"><div class="class-header-overlay"></div><div class="class-header-content"><div class="class-title">${cls.name}</div><div class="class-subtitle"><span>${cls.subject}</span><span>·</span><span>${members.length} members</span>${isT?`<span>·</span><span class="badge badge-violet">Your Class</span>`:''}</div></div></div>`:`<div style="margin-bottom:20px"><h2 style="font-size:22px;font-weight:800">${cls.name}</h2><p style="color:var(--t4)">${cls.subject}</p></div>`}<div class="tabs mb-24">${tabs.map(t=>`<div class="tab-item${activeTab===t.id?' active':''}" data-tab="${t.id}" data-cid="${cid}">${t.icon}<span>${t.lbl}</span></div>`).join('')}</div><div id="tab-content" class="animate-in">${content}</div></div></div></div>`;
},

_stream(cid,isT){
  const u=Auth.user; const anns=DB.announcements(cid);
  return `${isT?`<div class="panel mb-20" style="padding:18px 22px"><form id="ann-form"><div style="display:flex;gap:11px;align-items:flex-start">${av(u)}<div style="flex:1"><textarea id="ann-body" class="form-input" rows="2" placeholder="Post an announcement..." style="resize:none"></textarea><div style="display:flex;justify-content:flex-end;margin-top:9px"><button type="submit" class="btn btn-primary btn-sm" data-cid="${cid}">Post</button></div></div></div></form></div>`:''}<div class="stagger">${anns.length===0?`<div class="empty-state"><div class="empty-icon">📢</div><div class="empty-text">No announcements yet</div></div>`:anns.map(a=>{const author=DB.userById(a.authorId);const unread=!DB.isRead(u.id,a.id);if(unread)DB.markAnnouncementRead(u.id,a.id);return `<div class="stream-post${unread?' unread':''}"><div class="stream-post-header">${av(author)}<div><div class="stream-post-author">${author?.name||'Unknown'}</div><div class="stream-post-time">${timeAgo(a.createdAt)}</div></div>${unread?`<span class="badge badge-violet" style="margin-left:auto;font-size:10px">New</span>`:''}</div><div class="stream-post-body">${a.body.replace(/\n/g,'<br>')}</div></div>`;}).join('')}</div>`;
},

_assignments(cid,isT){
  const u=Auth.user; const now=Date.now(); const asgns=DB.assignments(cid);
  if(isT)return `<div class="section-hdr mb-16"><div class="section-title">Assignments</div><button class="btn btn-primary btn-sm" id="new-asgn-btn" data-cid="${cid}">${I.plus} Create</button></div>${asgns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">📝</div><div class="empty-text">No assignments yet</div></div>`:asgns.map(a=>{const subs=DB.submissions(a.id);const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');const ds=dueStatus(a.dueAt);return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:var(--violet-d);color:var(--violet-l)">${I.assign}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${I.check} ${subs.length}/${stus.length} submitted · ${fDate(a.dueAt)}</div></div><span class="badge ${ds.cls}">${ds.label}</span></div>`;}).join('')}`;
  return `<div class="section-hdr mb-16"><div class="section-title">Assignments</div></div>${asgns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">🎉</div><div class="empty-text">No assignments!</div></div>`:asgns.map(a=>{const sub=DB.submissionBy(a.id,u.id);const ds=dueStatus(a.dueAt);const sb=sub?.grade!=null?`<span class="badge badge-emerald">Graded: ${sub.grade}/100</span>`:sub?`<span class="badge badge-cyan">Submitted</span>`:a.dueAt<now?`<span class="badge badge-rose">Missing</span>`:`<span class="badge badge-muted">Pending</span>`;return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:${sub?'var(--emerald-d)':'var(--violet-d)'};color:${sub?'var(--emerald-l)':'var(--violet-l)'}">${sub?I.check:I.assign}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${fDate(a.dueAt)}${sub?' · Submitted '+timeAgo(sub.submittedAt):''}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${sb}<span class="badge ${ds.cls}" style="font-size:10px">${ds.label}</span></div></div>`;}).join('')}`;
},

_resources(cid,isT,lbw){
  const res=DB.resources(cid);
  return `<div class="section-hdr mb-16"><div class="section-title">Resources</div>${isT?`<button class="btn btn-primary btn-sm" id="upload-res-btn" data-cid="${cid}">${I.upload} Upload</button>`:''}</div>${res.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">📁</div><div class="empty-text">No resources yet</div></div>`:res.map(r=>{const up=DB.userById(r.uploadedBy);return `<div class="resource-card"><div class="res-icon" style="background:var(--violet-d)">${fileEmoji(r.fileType||r.fileName||'')}</div><div class="res-info"><div class="res-name">${r.title}</div>${!lbw?`<div class="res-meta">${r.description||''}</div>`:''}<div class="res-meta">${up?.name||'Unknown'} · ${timeAgo(r.createdAt)} · ${fBytes(r.fileSize||0)}</div></div><div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm">${I.dl}${!lbw?' Download':''}</button>${isT?`<button class="btn btn-ghost btn-sm" data-del-res="${r.id}" data-cid="${cid}">${I.trash}</button>`:''}</div></div>`;}).join('')}`;
},

_chat(cid){
  const u=Auth.user; const isT=u.role==='teacher';
  const msgs=DB.messages(cid); const pinned=msgs.filter(m=>m.pinned);
  return `${pinned.length>0?`<div class="pinned-bar">${I.pin} <strong>Pinned:</strong> ${pinned[0].body.slice(0,68)}${pinned[0].body.length>68?'...':''}</div>`:''}<div class="chat-wrap" id="chat-wrap"><div class="chat-msgs" id="chat-msgs">${msgs.length===0?`<div style="text-align:center;padding:40px;color:var(--t4)"><div style="font-size:30px;margin-bottom:8px">💬</div><div>No messages yet!</div></div>`:msgs.map(m=>{const auth=DB.userById(m.authorId);const own=m.authorId===u.id;return `<div class="chat-msg${own?' own':''}${m.pinned?' pinned':''}">
  ${!own?av(auth,'avatar-sm'):''}<div>${!own?`<div class="chat-sender">${auth?.name||'?'}${m.pinned?' 📌':''}</div>`:''}<div class="chat-bubble">${m.body.replace(/\n/g,'<br>')}</div><div class="chat-time">${timeAgo(m.createdAt)}${isT&&!m.pinned?` <button onclick="pinMsg('${m.id}','${cid}')" style="font-size:10px;color:var(--amber-l);background:none;border:none;cursor:pointer;margin-left:6px">${I.pin} Pin</button>`:''}</div></div></div>`;}).join('')}</div><div class="chat-input-area"><textarea id="chat-input" class="chat-input" rows="1" placeholder="Message ${DB.classById(cid)?.name||'class'}..." data-cid="${cid}"></textarea><button class="chat-send" id="chat-send-btn" data-cid="${cid}" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="white"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div></div>`;
},

_meet(cid,cls){
  return `<div class="glass-card meet-lobby" id="meet-lobby"><div style="font-size:52px;margin-bottom:14px;animation:float 3s ease-in-out infinite">🎥</div><div class="meet-title">Class Meeting Room</div><div class="meet-desc">Join a live video call with your class. Works on all devices — share the link to invite others.</div><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:22px"><button class="btn btn-primary btn-lg" id="start-meet-btn" data-cid="${cid}" data-cname="${cls.name}">${I.video} Start / Join Meeting</button><button class="btn btn-secondary" id="copy-meet-btn" data-cid="${cid}">${I.copy} Copy Link</button></div><div style="font-size:12px;color:var(--t4)">Room: <code style="background:var(--glass-2);padding:2px 8px;border-radius:5px">campusconnect-${cid}</code></div></div><div id="jitsi-frame" style="display:none;border-radius:var(--r-xl);overflow:hidden"></div>`;
},

_members(cid,isT){
  const members=DB.membersOf(cid); const allStu=DB.users().filter(u=>u.role==='student'&&!DB.isEnrolled(u.id,cid));
  return `<div class="section-hdr mb-16"><div class="section-title">Members</div><div class="section-sub">${members.length} total</div></div>${isT?`<div class="panel mb-20" style="padding:18px 22px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Add Student</div><div style="display:flex;gap:10px"><select id="add-stu-sel" class="form-select" style="flex:1"><option value="">Select a student...</option>${allStu.map(s=>`<option value="${s.id}">${s.name} (${s.email})</option>`).join('')}</select><button class="btn btn-primary" id="add-stu-btn" data-cid="${cid}">Add</button></div></div>`:''}<div class="stagger">${members.map(m=>`<div class="resource-card">${av(m)}<div class="res-info"><div class="res-name">${m.name}</div><div class="res-meta">${m.email}</div></div><div style="display:flex;align-items:center;gap:8px"><span class="badge ${m.roleInClass==='teacher'?'badge-violet':'badge-cyan'}">${m.roleInClass}</span>${isT&&m.roleInClass==='student'?`<button class="btn btn-ghost btn-sm" data-remove-stu="${m.id}" data-cid="${cid}">${I.trash}</button>`:''}</div></div>`).join('')}</div>`;
},

assignment(aid){
  const u=Auth.user; const a=DB.assignmentById(aid);
  if(!a)return `<div style="padding:60px;text-align:center;color:var(--t4)">Assignment not found.</div>`;
  const cls=DB.classById(a.classId); const isT=u.role==='teacher'&&cls?.createdBy===u.id; const ds=dueStatus(a.dueAt);
  if(isT){
    const subs=DB.submissions(aid); const stus=DB.membersOf(a.classId).filter(m=>m.roleInClass==='student');
    return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar(a.title,'class:'+a.classId+':assignments')}<div class="page"><div class="panel mb-24"><div class="asgn-dh"><div class="asgn-icon" style="background:var(--violet-d);color:var(--violet-l);width:52px;height:52px;border-radius:16px">${I.assign}</div><div style="flex:1"><h2 style="font-size:22px;font-weight:800;margin-bottom:7px">${a.title}</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge ${ds.cls}">${ds.label}</span><span class="badge badge-muted">${cls?.name}</span><span class="badge badge-muted">${subs.length}/${stus.length} submitted</span></div></div></div><div style="font-size:11.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Instructions</div><div style="color:var(--t2);line-height:1.8;white-space:pre-wrap;font-size:13.5px">${a.instructions}</div></div><div class="section-hdr mb-16"><div class="section-title">Submissions</div></div><div class="stagger">${stus.length===0?`<div class="glass-card empty-state" style="padding:40px"><div class="empty-text">No students enrolled</div></div>`:stus.map(s=>{const sub=subs.find(x=>x.studentId===s.id);return `<div class="panel mb-14" style="padding:18px 22px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:${sub?'16px':'0'}">${av(s)}<div style="flex:1"><div style="font-weight:600">${s.name}</div><div style="font-size:12px;color:var(--t4)">${s.email}</div></div>${sub?`<span class="badge ${sub.grade!=null?'badge-emerald':'badge-cyan'}">${sub.grade!=null?'Graded: '+sub.grade+'/100':'Submitted'}</span><span style="font-size:12px;color:var(--t4)">${timeAgo(sub.submittedAt)}</span>`:`<span class="badge badge-rose">Not Submitted</span>`}</div>${sub?`<div style="background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m);padding:13px;margin-bottom:14px"><div style="font-size:11.5px;color:var(--t4);margin-bottom:5px">Student answer:</div><div style="font-size:13.5px;color:var(--t2);white-space:pre-wrap">${sub.textBody||''}</div>${sub.fileName?`<div style="margin-top:7px;font-size:12px;color:var(--cyan-l)">${I.file} ${sub.fileName}</div>`:''}</div><form class="grade-form" data-sid="${sub.id}"><div class="two-col"><div><label class="form-label">Grade (0-100)</label><input type="number" min="0" max="100" class="form-input g-grade" value="${sub.grade??''}" placeholder="85"></div><div><label class="form-label">Feedback</label><input type="text" class="form-input g-fb" value="${sub.feedback||''}" placeholder="Feedback..."></div></div><div style="display:flex;justify-content:flex-end;margin-top:9px"><button type="submit" class="btn btn-success btn-sm">Save Grade</button></div></form>`:''}</div>`;}).join('')}</div></div></div></div>`;
  }
  const sub=DB.submissionBy(aid,u.id); const overdue=a.dueAt<Date.now(); const draft=DB.getDraft(aid);
  return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar(a.title,'class:'+a.classId+':assignments')}<div class="page"><div class="panel mb-22"><div class="asgn-dh"><div class="asgn-icon" style="background:var(--violet-d);color:var(--violet-l);width:52px;height:52px;border-radius:16px">${I.assign}</div><div style="flex:1"><h2 style="font-size:22px;font-weight:800;margin-bottom:7px">${a.title}</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge ${ds.cls}">${ds.label}</span><span class="badge badge-muted">${cls?.name}</span></div></div></div><div style="font-size:11.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Instructions</div><div style="color:var(--t2);line-height:1.8;white-space:pre-wrap;font-size:13.5px">${a.instructions}</div></div>${sub?.grade!=null?`<div class="grade-display mb-22"><div><div class="grade-num">${sub.grade}</div><div style="font-size:13px;color:var(--t4)">/100</div></div><div><div style="font-size:15px;font-weight:700;color:var(--emerald-l);margin-bottom:4px">Assignment Graded!</div>${sub.feedback?`<div style="font-size:13.5px;color:var(--t2)">Feedback: ${sub.feedback}</div>`:''}</div></div>`:''}<div class="panel"><div style="font-size:17px;font-weight:700;margin-bottom:18px">${sub?overdue?'Your Submission':'Edit Submission':'Submit Assignment'}</div>${overdue&&!sub?`<div style="background:var(--rose-d);border:1px solid rgba(244,63,94,.3);border-radius:var(--r-m);padding:13px;margin-bottom:18px;font-size:13.5px;color:var(--rose-l)">⚠️ Past due. Submissions are closed.</div>`:''}${!overdue||sub?`<form id="sub-form" data-aid="${aid}">${draft&&!sub?`<div class="draft-ind">${I.clock} Draft restored</div>`:''}<div class="form-group"><label class="form-label">Your Answer</label><textarea id="sub-text" class="form-input" rows="7" placeholder="Write your answer..."${sub?' readonly':''}>${sub?sub.textBody||'':draft}</textarea></div>${!sub?`<div class="form-group"><label class="form-label">Attach File <span style="color:var(--t4);font-weight:400">(optional, max 5 MB)</span></label><div class="file-drop" id="fdrop"><div style="font-size:28px;margin-bottom:7px">☁️</div><div style="font-size:13.5px;color:var(--t3)">Drag & drop or <label for="f-input" style="color:var(--violet-l);cursor:pointer;font-weight:600">browse</label></div><input type="file" id="f-input" style="display:none"><div id="f-name" style="font-size:12px;color:var(--emerald-l);margin-top:6px"></div></div></div><button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:4px">Submit Assignment</button>`:`<div style="padding:13px;background:var(--emerald-d);border:1px solid rgba(16,185,129,.22);border-radius:var(--r-m);margin-top:11px;font-size:13.5px;color:var(--emerald-l)">✅ Submitted ${timeAgo(sub.submittedAt)}${sub.fileName?' · '+sub.fileName:''}</div>`}</form>`:''}</div></div></div></div>`;
},

progress(){
  const u=Auth.user; const classes=DB.classesForUser(u.id); const now=Date.now();
  let total=0,submitted=0,graded=0,missing=0; const allWork=[];
  classes.forEach(c=>{DB.assignments(c.id).forEach(a=>{total++;const sub=DB.submissionBy(a.id,u.id);if(sub){submitted++;if(sub.grade!=null)graded++;}else if(a.dueAt<now)missing++;allWork.push({...a,className:c.name,sub});});});
  allWork.sort((a,b)=>a.dueAt-b.dueAt);
  const pct=total>0?Math.round(submitted/total*100):0;
  return `<div class="app-layout">${sidebar('progress')}<div class="main-content">${topbar('My Progress')}<div class="page"><div class="three-col mb-24 stagger"><div class="progress-stat glass-card"><div class="stat-icon" style="background:var(--violet-d)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-l)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><div class="stat-num text-grad">${total}</div><div class="stat-label">Total</div></div></div><div class="progress-stat glass-card"><div class="stat-icon" style="background:var(--emerald-d)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-l)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="stat-num" style="color:var(--emerald-l)">${submitted}</div><div class="stat-label">Submitted</div></div></div><div class="progress-stat glass-card"><div class="stat-icon" style="background:var(--rose-d)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rose-l)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div><div class="stat-num" style="color:var(--rose-l)">${missing}</div><div class="stat-label">Missing</div></div></div></div><div class="panel mb-24"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:11px"><div style="font-size:15px;font-weight:700">Completion</div><div style="font-size:24px;font-weight:900" class="text-grad">${pct}%</div></div><div class="prog-bar-wrap"><div class="prog-bar" style="width:${pct}%"></div></div><div style="font-size:12px;color:var(--t4);margin-top:7px">${submitted} of ${total} submitted · ${graded} graded</div></div><div class="section-hdr mb-16"><div class="section-title">All Assignments</div></div>${allWork.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-text">No assignments</div></div>`:allWork.map(a=>{const ds=dueStatus(a.dueAt);const sb=a.sub?.grade!=null?`<span class="badge badge-emerald">Graded: ${a.sub.grade}/100</span>`:a.sub?`<span class="badge badge-cyan">Submitted</span>`:a.dueAt<now?`<span class="badge badge-rose">Missing</span>`:`<span class="badge badge-muted">Pending</span>`;return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:var(--violet-d);color:var(--violet-l)">${I.assign}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${a.className} · ${fDate(a.dueAt)}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${sb}<span class="badge ${ds.cls}" style="font-size:10px">${ds.label}</span></div></div>`;}).join('')}</div></div></div>`;
},

gradebook(cid,inline=false){
  const cls=DB.classById(cid); const asgns=DB.assignments(cid); const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');
  const inner=`<div class="section-hdr mb-16"><div class="section-title">Gradebook${inline?' — '+(cls?.name||''):''}</div><div class="section-sub">${stus.length} students · ${asgns.length} assignments</div></div>${stus.length===0||asgns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">📊</div><div class="empty-text">No data yet</div></div>`:`<div class="table-wrap glass-card"><table class="g-table"><thead><tr><th style="min-width:150px">Student</th>${asgns.map(a=>`<th style="min-width:110px">${a.title.slice(0,18)}${a.title.length>18?'…':''}</th>`).join('')}<th>Avg</th></tr></thead><tbody>${stus.map(s=>{const grades=asgns.map(a=>{const sub=DB.submissionBy(a.id,s.id);return sub?(sub.grade!=null?sub.grade:'sub'):'miss';});const nums=grades.filter(g=>typeof g==='number');const avg=nums.length>0?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):null;return `<tr><td><div style="display:flex;align-items:center;gap:8px">${av(s,'avatar-sm')}<span style="font-weight:600;font-size:13px">${s.name}</span></div></td>${grades.map((g,i)=>`<td><span class="grade-cell ${g==='miss'?'missing':g==='sub'?'submitted':'graded'}" data-nav="assignment" data-aid="${asgns[i].id}" style="cursor:pointer">${g==='miss'?'—':g==='sub'?'✓':g}</span></td>`).join('')}<td><span class="grade-cell ${avg!=null?(avg>=75?'graded':'submitted'):'na'}">${avg!=null?avg+'%':'N/A'}</span></td></tr>`;}).join('')}</tbody></table></div>`}`;
  if(inline)return inner;
  return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar('Gradebook — '+(cls?.name||''),'class:'+cid+':assignments')}<div class="page">${inner}</div></div></div>`;
},

admin(){
  const users=DB.users(); const classes=DB.classes();
  const subs=DB.get('submissions',[]); const recent=subs.filter(s=>s.submittedAt>Date.now()-7*86400000).length;
  return `<div class="app-layout">${sidebar('admin')}<div class="main-content">${topbar('Admin Dashboard')}<div class="page"><div class="admin-stat-grid stagger"><div class="admin-stat glass-card"><div class="admin-stat-num text-grad">${users.length}</div><div class="admin-stat-label">Total Users</div></div><div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--cyan-l)">${classes.length}</div><div class="admin-stat-label">Classes</div></div><div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--emerald-l)">${recent}</div><div class="admin-stat-label">Submissions This Week</div></div><div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--amber-l)">${users.filter(u=>u.role==='student').length}</div><div class="admin-stat-label">Students</div></div></div><div class="panel mb-24"><div style="font-size:17px;font-weight:700;margin-bottom:18px">Create New Class</div><form id="admin-cls-form"><div class="two-col"><div class="form-group"><label class="form-label">Class Name</label><input id="ac-name" class="form-input" placeholder="e.g. Operating Systems"></div><div class="form-group"><label class="form-label">Subject</label><input id="ac-subj" class="form-input" placeholder="e.g. Computer Science"></div></div><div class="two-col"><div class="form-group"><label class="form-label">Class Code</label><input id="ac-code" class="form-input" value="CC-${Math.random().toString(36).slice(2,6).toUpperCase()}"></div><div class="form-group"><label class="form-label">Assign Teacher</label><select id="ac-teacher" class="form-select"><option value="">Select teacher...</option>${users.filter(u=>u.role==='teacher').map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div></div><div style="display:flex;justify-content:flex-end"><button type="submit" class="btn btn-primary">Create Class</button></div></form></div><div class="section-hdr mb-16"><div class="section-title">All Users</div></div><div class="table-wrap glass-card mb-24"><table class="g-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${users.map(u=>`<tr><td><div style="display:flex;align-items:center;gap:8px">${av(u,'avatar-sm')}<span style="font-weight:600;font-size:13px">${u.name}</span></div></td><td style="font-size:13px;color:var(--t3)">${u.email}</td><td><span class="badge ${u.role==='admin'?'badge-rose':u.role==='teacher'?'badge-violet':'badge-cyan'}">${u.role}</span></td><td style="font-size:12px;color:var(--t4)">${timeAgo(u.createdAt)}</td></tr>`).join('')}</tbody></table></div><div class="section-hdr mb-16"><div class="section-title">All Classes</div></div><div class="table-wrap glass-card"><table class="g-table"><thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th>Members</th><th>Code</th></tr></thead><tbody>${classes.map(c=>{const t=DB.userById(c.createdBy);const m=DB.membersOf(c.id);return `<tr><td style="font-weight:600;font-size:13px">${c.name}</td><td style="font-size:13px;color:var(--t3)">${c.subject}</td><td style="font-size:13px">${t?.name||'—'}</td><td><span class="badge badge-muted">${m.length}</span></td><td><code style="background:var(--glass-2);padding:2px 8px;border-radius:4px;font-size:11px">${c.code}</code></td></tr>`;}).join('')}</tbody></table></div></div></div></div>`;
},

notifs(){
  const u=Auth.user; const ns=DB.notifs(u.id); DB.markAllRead(u.id);
  return `<div class="app-layout">${sidebar('notifs')}<div class="main-content">${topbar('Notifications')}<div class="page">${ns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">🔔</div><div class="empty-text">All caught up!</div></div>`:`<div class="panel stagger" style="padding:0;overflow:hidden">${ns.map(n=>`<div class="notif-item${!n.readAt?' unread':''}">${!n.readAt?`<div class="notif-dot2"></div>`:`<div style="width:8px;flex-shrink:0"></div>`}<div style="flex:1"><div class="notif-text">${n.message}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`).join('')}</div>`}</div></div></div>`;
},

profile(){
  const u=Auth.user;
  return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar('My Profile')}<div class="page" style="max-width:560px"><div class="panel mb-18"><div style="display:flex;align-items:center;gap:20px;margin-bottom:22px"><div class="avatar avatar-lg" style="background:${avColor(u.id)};box-shadow:var(--glow-v)">${initials(u.name)}</div><div><div style="font-size:22px;font-weight:800">${u.name}</div><div style="color:var(--t4);font-size:13.5px">${u.email}</div><span class="badge ${u.role==='admin'?'badge-rose':u.role==='teacher'?'badge-violet':'badge-cyan'}" style="margin-top:7px">${u.role}</span></div></div><div style="border-top:1px solid var(--glass-b);padding-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><div class="form-label">Member Since</div><div style="font-size:13.5px;color:var(--t2)">${new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div></div><div><div class="form-label">Classes</div><div style="font-size:13.5px;color:var(--t2)">${DB.classesForUser(u.id).length}</div></div></div></div><button class="btn btn-danger" id="logout-btn">${I.logout} Sign Out</button></div></div></div>`;
},

};

// ── EVENT BINDING ─────────────────────────────────────────────────
function bindAuth(){
  const lf=document.getElementById('login-form');
  if(lf){
    lf.addEventListener('submit',e=>{
      e.preventDefault();
      const em=document.getElementById('l-email').value;
      const pw=document.getElementById('l-pass').value;
      const err=document.getElementById('l-err');
      const r=Auth.login(em,pw);
      if(r.ok){Router.go('dashboard');}else{err.textContent=r.err;err.classList.add('show');}
    });
    document.querySelectorAll('.test-acc').forEach(el=>{
      el.addEventListener('click',()=>{
        document.getElementById('l-email').value=el.dataset.e;
        document.getElementById('l-pass').value=el.dataset.p;
        lf.dispatchEvent(new Event('submit'));
      });
    });
    document.getElementById('go-reg')?.addEventListener('click',e=>{e.preventDefault();Router.go('register');});
  }
  const rf=document.getElementById('reg-form');
  if(rf){
    rf.addEventListener('submit',e=>{
      e.preventDefault();
      const n=document.getElementById('r-name').value;
      const em=document.getElementById('r-email').value;
      const ro=document.getElementById('r-role').value;
      const pw=document.getElementById('r-pass').value;
      const co=document.getElementById('r-conf').value;
      const err=document.getElementById('r-err');
      if(pw!==co){err.textContent='Passwords do not match.';err.classList.add('show');return;}
      const r=Auth.register(n,em,pw,ro);
      if(r.ok){toast('Welcome, '+n.split(' ')[0]+'! 🎉','success');Router.go('dashboard');}
      else{err.textContent=r.err;err.classList.add('show');}
    });
    document.getElementById('go-login')?.addEventListener('click',e=>{e.preventDefault();Router.go('login');});
  }
}

function bindGlobal(){
  if(!Auth.ok) return;
  // Navigation
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click',()=>{
      const nav=el.dataset.nav;
      if(nav==='class') Router.go('class',{cid:el.dataset.cid,tab:'stream'});
      else if(nav==='assignment') Router.go('assignment',{aid:el.dataset.aid});
      else Router.go(nav);
    });
  });
  // Grade cells with data-aid
  document.querySelectorAll('[data-aid]').forEach(el=>{
    if(!el.hasAttribute('data-nav'))
      el.addEventListener('click',()=>Router.go('assignment',{aid:el.dataset.aid}));
  });
  // Back
  document.getElementById('back-btn')?.addEventListener('click',e=>{
    const t=e.currentTarget.dataset.target;
    if(t?.startsWith('class:')){const[,cid,tab]=t.split(':');Router.go('class',{cid,tab});}
    else Router.go(t||'dashboard');
  });
  // Logout
  document.querySelectorAll('#logout-btn').forEach(b=>b.addEventListener('click',()=>{Auth.logout();toast('Signed out','info');Router.go('login');}));
  // Low-bw toggle
  document.getElementById('lowbw-btn')?.addEventListener('click',toggleLowBw);
  // Notifications
  document.getElementById('notif-bell')?.addEventListener('click',()=>Router.go('notifs'));
  // Mobile menu
  document.getElementById('mob-menu')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open'));
  // Sidebar new-class / join-class shortcuts
  document.getElementById('sb-new-class')?.addEventListener('click',e=>{e.stopPropagation();modalNewClass();});
  document.getElementById('sb-join-class')?.addEventListener('click',e=>{e.stopPropagation();modalJoinClass();});
  // Tabs
  document.querySelectorAll('[data-tab]').forEach(t=>t.addEventListener('click',()=>Router.go('class',{cid:t.dataset.cid,tab:t.dataset.tab})));
  // Dashboard buttons
  document.getElementById('new-class-btn')?.addEventListener('click',modalNewClass);
  document.getElementById('join-class-btn')?.addEventListener('click',modalJoinClass);
  // Announcement form
  document.getElementById('ann-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const body=document.getElementById('ann-body').value.trim();
    const cid=e.submitter?.dataset.cid||Router.params.cid;
    if(!body)return toast('Write something first.','error');
    DB.addAnnouncement({id:uid(),classId:cid,authorId:Auth.id,body,createdAt:Date.now()});
    const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');
    notify(stus.map(m=>m.id),'announcement','📢 New announcement in '+DB.classById(cid)?.name,{classId:cid});
    toast('Announcement posted!','success');
    Router.go('class',{cid,tab:'stream'});
  });
  // Create assignment
  document.getElementById('new-asgn-btn')?.addEventListener('click',e=>modalNewAssignment(e.currentTarget.dataset.cid));
  // Upload resource
  document.getElementById('upload-res-btn')?.addEventListener('click',e=>modalUploadResource(e.currentTarget.dataset.cid));
  // Delete resource
  document.querySelectorAll('[data-del-res]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this resource?'))return;
    DB.deleteResource(b.dataset.delRes);
    toast('Resource deleted','info');
    Router.go('class',{cid:b.dataset.cid,tab:'resources'});
  }));
  // Add student to class
  document.getElementById('add-stu-btn')?.addEventListener('click',e=>{
    const cid=e.currentTarget.dataset.cid;
    const sid=document.getElementById('add-stu-sel')?.value;
    if(!sid)return toast('Select a student.','error');
    DB.enroll({userId:sid,classId:cid,role:'student'});
    toast('Student added!','success');
    Router.go('class',{cid,tab:'members'});
  });
  // Remove student
  document.querySelectorAll('[data-remove-stu]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Remove this student from the class?'))return;
    DB.unenroll(b.dataset.removeStu,b.dataset.cid);
    toast('Student removed','info');
    Router.go('class',{cid:b.dataset.cid,tab:'members'});
  }));
  // Submission form
  const sf=document.getElementById('sub-form');
  if(sf){
    const ta=document.getElementById('sub-text');
    ta?.addEventListener('input',()=>DB.saveDraft(sf.dataset.aid,ta.value));
    const fi=document.getElementById('f-input');
    const fd=document.getElementById('fdrop');
    fi?.addEventListener('change',()=>handleFile(fi));
    fd?.addEventListener('click',()=>fi?.click());
    fd?.addEventListener('dragover',e=>{e.preventDefault();fd.classList.add('dragover');});
    fd?.addEventListener('dragleave',()=>fd.classList.remove('dragover'));
    fd?.addEventListener('drop',e=>{e.preventDefault();fd.classList.remove('dragover');if(e.dataTransfer.files[0]){fi.files=e.dataTransfer.files;handleFile(fi);}});
    sf.addEventListener('submit',e=>{
      e.preventDefault();
      const aid=sf.dataset.aid; const a=DB.assignmentById(aid);
      if(a.dueAt<Date.now())return toast('Assignment is past due.','error');
      const text=document.getElementById('sub-text').value.trim();
      const file=fi?.files?.[0];
      if(!text&&!file)return toast('Add text or attach a file.','error');
      DB.saveSubmission({id:uid(),assignmentId:aid,studentId:Auth.id,textBody:text,fileName:file?.name||null,submittedAt:Date.now(),grade:null,feedback:null});
      DB.clearDraft(aid);
      const cls=DB.classById(a.classId);
      notify([cls?.createdBy],'submission','📬 '+Auth.user.name+' submitted "'+a.title+'"',{assignmentId:aid});
      toast('Assignment submitted! ✅','success');
      Router.go('assignment',{aid});
    });
  }
  // Grade forms
  document.querySelectorAll('.grade-form').forEach(form=>{
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const sid=form.dataset.sid;
      const grade=parseInt(form.querySelector('.g-grade').value);
      const fb=form.querySelector('.g-fb').value.trim();
      if(isNaN(grade)||grade<0||grade>100)return toast('Grade must be 0-100.','error');
      const subs=DB.get('submissions',[]);
      const sub=subs.find(s=>s.id===sid);
      if(sub){sub.grade=grade;sub.feedback=fb;DB.set('submissions',subs);
        const a=DB.assignmentById(sub.assignmentId);
        notify([sub.studentId],'grade','🎯 "'+a?.title+'" graded: '+grade+'/100',{assignmentId:sub.assignmentId});
        toast('Grade saved!','success');
        Router.go('assignment',{aid:sub.assignmentId});
      }
    });
  });
  // Chat
  document.getElementById('chat-send-btn')?.addEventListener('click',sendChat);
  document.getElementById('chat-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}});
  // Meet
  document.getElementById('start-meet-btn')?.addEventListener('click',e=>startMeet(e.currentTarget.dataset.cid,e.currentTarget.dataset.cname));
  document.getElementById('copy-meet-btn')?.addEventListener('click',e=>{
    navigator.clipboard.writeText('https://meet.jit.si/campusconnect-'+e.currentTarget.dataset.cid).then(()=>toast('Meeting link copied!','success'));
  });
  // Admin form
  document.getElementById('admin-cls-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('ac-name').value.trim();
    const subj=document.getElementById('ac-subj').value.trim();
    const code=document.getElementById('ac-code').value.trim();
    const tid=document.getElementById('ac-teacher').value;
    if(!name||!subj||!code||!tid)return toast('Fill all fields.','error');
    const c={id:uid(),name,subject:subj,code,createdBy:tid,semester:3,createdAt:Date.now()};
    DB.saveClass(c); DB.enroll({userId:tid,classId:c.id,role:'teacher'});
    toast('Class "'+name+'" created!','success'); Router.go('admin');
  });
  // Modal close on overlay click
  document.getElementById('modal-overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
  // Scroll chat
  const cm=document.getElementById('chat-msgs');
  if(cm)cm.scrollTop=cm.scrollHeight;
  // Mobile responsiveness
  document.getElementById('mob-menu') && (document.getElementById('mob-menu').style.display='flex');
}

// ── FILE HANDLER ──────────────────────────────────────────────────
function handleFile(input){
  const f=input.files?.[0]; if(!f)return;
  if(f.size>MAX_FILE){toast('File too large. Max 5 MB.','error');input.value='';return;}
  const fn=document.getElementById('f-name');
  if(fn)fn.textContent='📄 '+f.name+' ('+fBytes(f.size)+')';
}

// ── MODALS ────────────────────────────────────────────────────────
function modalNewClass(){
  showModal(`<div class="modal-header"><div class="modal-title">Create New Class</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
  <form id="mc-form">
    <div class="form-group"><label class="form-label">Class Name</label><input id="mc-name" class="form-input" placeholder="e.g. Operating Systems"></div>
    <div class="form-group"><label class="form-label">Subject</label><input id="mc-subj" class="form-input" placeholder="e.g. Computer Science"></div>
    <div class="form-group"><label class="form-label">Class Code</label><input id="mc-code" class="form-input" value="CC-${Math.random().toString(36).slice(2,6).toUpperCase()}"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">Create</button>
    </div>
  </form>`);
  document.getElementById('mc-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('mc-name').value.trim();
    const subj=document.getElementById('mc-subj').value.trim();
    const code=document.getElementById('mc-code').value.trim();
    if(!name||!subj||!code)return toast('Fill all fields.','error');
    const c={id:uid(),name,subject:subj,code,createdBy:Auth.id,semester:3,createdAt:Date.now()};
    DB.saveClass(c); DB.enroll({userId:Auth.id,classId:c.id,role:'teacher'});
    closeModal(); toast('Class "'+name+'" created!','success'); Router.go('dashboard');
  });
}

function modalJoinClass(){
  showModal(`<div class="modal-header"><div class="modal-title">Join a Class</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
  <div class="form-group"><label class="form-label">Class Code</label><input id="jc-code" class="form-input" placeholder="e.g. CS-DSA-2024"></div>
  <div id="jc-err" style="font-size:13px;color:var(--rose-l);margin-bottom:10px"></div>
  <div style="display:flex;gap:10px;justify-content:flex-end">
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="do-join">Join</button>
  </div>`);
  document.getElementById('do-join')?.addEventListener('click',()=>{
    const code=document.getElementById('jc-code').value.trim().toUpperCase();
    const cls=DB.classes().find(c=>c.code.toUpperCase()===code);
    if(!cls){document.getElementById('jc-err').textContent='Class not found.';return;}
    if(DB.isEnrolled(Auth.id,cls.id)){document.getElementById('jc-err').textContent='Already enrolled.';return;}
    DB.enroll({userId:Auth.id,classId:cls.id,role:'student'});
    closeModal(); toast('Joined "'+cls.name+'"! 🎉','success'); Router.go('class',{cid:cls.id,tab:'stream'});
  });
}

function modalNewAssignment(cid){
  const tomorrow=new Date(Date.now()+7*86400000).toISOString().slice(0,16);
  showModal(`<div class="modal-header"><div class="modal-title">Create Assignment</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
  <form id="ma-form">
    <div class="form-group"><label class="form-label">Title</label><input id="ma-title" class="form-input" placeholder="Assignment title"></div>
    <div class="form-group"><label class="form-label">Instructions</label><textarea id="ma-instr" class="form-input" rows="4" placeholder="Describe what students need to do..."></textarea></div>
    <div class="form-group"><label class="form-label">Due Date & Time</label><input id="ma-due" type="datetime-local" class="form-input" value="${tomorrow}"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">Post Assignment</button>
    </div>
  </form>`);
  document.getElementById('ma-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const title=document.getElementById('ma-title').value.trim();
    const instr=document.getElementById('ma-instr').value.trim();
    const dueAt=new Date(document.getElementById('ma-due').value).getTime();
    if(!title||!instr||!dueAt)return toast('Fill all fields.','error');
    const a={id:uid(),classId:cid,title,instructions:instr,dueAt,createdBy:Auth.id,createdAt:Date.now()};
    DB.saveAssignment(a);
    const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');
    notify(stus.map(m=>m.id),'assignment','📝 New assignment: "'+title+'" in '+DB.classById(cid)?.name,{assignmentId:a.id});
    closeModal(); toast('Assignment posted!','success'); Router.go('class',{cid,tab:'assignments'});
  });
}

function modalUploadResource(cid){
  showModal(`<div class="modal-header"><div class="modal-title">Upload Resource</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
  <form id="ur-form">
    <div class="form-group"><label class="form-label">Title</label><input id="ur-title" class="form-input" placeholder="e.g. Week 3 Slides"></div>
    <div class="form-group"><label class="form-label">Description</label><input id="ur-desc" class="form-input" placeholder="Brief description..."></div>
    <div class="form-group"><label class="form-label">File</label>
      <div class="file-drop" id="ur-drop"><div style="font-size:22px;margin-bottom:6px">${I.upload}</div><div style="font-size:13px;color:var(--t3)">Click to browse</div><input type="file" id="ur-file" style="display:none"><div id="ur-fname" style="font-size:12px;color:var(--emerald-l);margin-top:6px"></div></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">Upload</button>
    </div>
  </form>`);
  const fi=document.getElementById('ur-file');
  document.getElementById('ur-drop')?.addEventListener('click',()=>fi?.click());
  fi?.addEventListener('change',()=>{if(fi.files[0])document.getElementById('ur-fname').textContent='📄 '+fi.files[0].name;});
  document.getElementById('ur-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const title=document.getElementById('ur-title').value.trim();
    const desc=document.getElementById('ur-desc').value.trim();
    const file=fi?.files?.[0];
    if(!title)return toast('Add a title.','error');
    DB.addResource({id:uid(),classId:cid,uploadedBy:Auth.id,title,description:desc,fileName:file?.name||'No file',fileType:file?.type||'unknown',fileSize:file?.size||0,createdAt:Date.now()});
    closeModal(); toast('Resource uploaded!','success'); Router.go('class',{cid,tab:'resources'});
  });
}

// ── CHAT ──────────────────────────────────────────────────────────
function sendChat(){
  const inp=document.getElementById('chat-input');
  const cid=document.getElementById('chat-send-btn')?.dataset.cid;
  if(!inp||!cid)return;
  const body=inp.value.trim(); if(!body)return;
  DB.addMessage({id:uid(),classId:cid,authorId:Auth.id,body,pinned:false,createdAt:Date.now()});
  inp.value='';
  renderChatMsgs(cid);
}

function renderChatMsgs(cid){
  const u=Auth.user; const isT=u.role==='teacher';
  const msgs=DB.messages(cid);
  const el=document.getElementById('chat-msgs');
  if(!el)return;
  el.innerHTML=msgs.map(m=>{
    const auth=DB.userById(m.authorId); const own=m.authorId===u.id;
    return `<div class="chat-msg${own?' own':''}${m.pinned?' pinned':''}">
    ${!own?av(auth,'avatar-sm'):''}<div>${!own?`<div class="chat-sender">${auth?.name||'?'}${m.pinned?' 📌':''}</div>`:''}<div class="chat-bubble">${m.body.replace(/\n/g,'<br>')}</div><div class="chat-time">${timeAgo(m.createdAt)}${isT&&!m.pinned?` <button onclick="pinMsg('${m.id}','${cid}')" style="font-size:10px;color:var(--amber-l);background:none;border:none;cursor:pointer;margin-left:6px">${I.pin} Pin</button>`:''}</div></div></div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}

function pinMsg(msgId,cid){
  DB.pinMsg(msgId,true); toast('Message pinned!','success');
  Router.go('class',{cid,tab:'chat'});
}

function startChatPoll(cid){
  Router.addPoll(()=>{
    const el=document.getElementById('chat-msgs'); if(!el)return;
    const count=el.querySelectorAll('.chat-msg').length;
    if(DB.messages(cid).length>count) renderChatMsgs(cid);
  },POLL_CHAT);
}

// ── NOTIFICATIONS POLL ────────────────────────────────────────────
function startNotifPoll(){
  if(!Auth.ok)return;
  Router.addPoll(()=>{
    const n=DB.unreadCount(Auth.id);
    const btn=document.getElementById('notif-bell');
    if(!btn)return;
    const dot=btn.querySelector('.notif-dot');
    if(n>0&&!dot){const d=document.createElement('span');d.className='notif-dot';btn.appendChild(d);}
    else if(n===0&&dot)dot.remove();
    // Also update sidebar badge
    document.querySelectorAll('.nav-badge').forEach(b=>{if(n>0)b.textContent=n;});
  },POLL_NOTIF);
}

// ── MEET ──────────────────────────────────────────────────────────
function startMeet(cid,cname){
  const lobby=document.getElementById('meet-lobby');
  const frame=document.getElementById('jitsi-frame');
  if(!frame)return;
  lobby.style.display='none'; frame.style.display='block';
  const roomName='campusconnect-'+cid;
  const u=Auth.user;
  if(typeof JitsiMeetExternalAPI==='undefined'){
    frame.innerHTML=`<div style="padding:40px;text-align:center;background:var(--glass-1);border-radius:var(--r-xl)">
      <div style="font-size:32px;margin-bottom:12px">🔗</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--t1)">Opening in new tab…</div>
      <a href="https://meet.jit.si/${roomName}" target="_blank" class="btn btn-primary btn-lg">${I.video} Open Meeting Room</a>
      <div style="margin-top:16px;font-size:12px;color:var(--t4)">Share: <code style="color:var(--violet-l)">https://meet.jit.si/${roomName}</code></div>
    </div>`;
    window.open('https://meet.jit.si/'+roomName,'_blank');
    return;
  }
  window._jitsi=new JitsiMeetExternalAPI('meet.jit.si',{
    roomName, parentNode:frame, width:'100%', height:'600px',
    userInfo:{displayName:u.name,email:u.email},
    configOverwrite:{startWithAudioMuted:true,prejoinPageEnabled:false},
    interfaceConfigOverwrite:{SHOW_JITSI_WATERMARK:false,TOOLBAR_ALWAYS_VISIBLE:true},
  });
  window._jitsi.addEventListener('videoConferenceLeft',()=>{
    window._jitsi?.dispose(); window._jitsi=null;
    frame.style.display='none'; lobby.style.display='block';
  });
}

// ── INIT ──────────────────────────────────────────────────────────
function init(){
  seed();
  Auth.init();
  Router.go(Auth.ok?'dashboard':'login');
  window.addEventListener('resize',()=>{if(window.innerWidth>768)document.getElementById('sidebar')?.classList.remove('open');});
}

document.addEventListener('DOMContentLoaded',init);
