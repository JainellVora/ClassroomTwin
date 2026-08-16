"use strict";
// ================================================================
//  CampusConnect v2 — app.js
//  SPA: hero login + spotlight, theme, fixed upload, fixed meet,
//  better admin, 6 public API integrations
// ================================================================

const DOMAIN='@sakec.ac.in';
const POLL_CHAT=5000;
const POLL_NOTIF=10000;
const MAX_FILE=5*1024*1024;
const SPOTLIGHT_R=260;
const BG1='https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85';
const BG2='https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85';

const AV_COLORS=[
  '#e8702a','#10b981','#f43f5e','#22d3ee','#f59e0b',
  '#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6'
];
const BANNERS=['#1a1a1a','#111','#0f0f0f','#181818','#141414','#0c0c0c','#1c1c1c','#151515'];
function avColor(s){let h=0;for(let c of String(s))h=c.charCodeAt(0)+((h<<5)-h);return AV_COLORS[Math.abs(h)%AV_COLORS.length];}
function initials(n){return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);}
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

// ── THEME ────────────────────────────────────────────────────────
const Theme={
  _mode: null,
  _mql: window.matchMedia('(prefers-color-scheme: dark)'),
  init(){
    this._mode=localStorage.getItem('cc_theme')||'system';
    this._mql.addEventListener('change',()=>{if(this._mode==='system')this.apply();});
    this.apply();
  },
  set(mode){this._mode=mode;localStorage.setItem('cc_theme',mode);this.apply();},
  apply(){
    const dark=this._mode==='dark'||(this._mode==='system'&&this._mql.matches);
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  },
  get current(){return this._mode;},
  get isDark(){const m=this._mode;return m==='dark'||(m==='system'&&this._mql.matches);}
};

// ── DB ───────────────────────────────────────────────────────────
const DB={
  get:(k,d=null)=>{try{const v=localStorage.getItem('cc_'+k);return v?JSON.parse(v):d;}catch{return d;}},
  set:(k,v)=>{try{localStorage.setItem('cc_'+k,JSON.stringify(v));}catch(e){console.error(e);}},
  users:()=>DB.get('users',[]),
  saveUser(u){const a=DB.users();const i=a.findIndex(x=>x.id===u.id);if(i>=0)a[i]=u;else a.push(u);DB.set('users',a);},
  userById:id=>DB.users().find(u=>u.id===id),
  userByEmail:e=>DB.users().find(u=>u.email===e.toLowerCase()),
  classes:()=>DB.get('classes',[]),
  saveClass(c){const a=DB.classes();const i=a.findIndex(x=>x.id===c.id);if(i>=0)a[i]=c;else a.push(c);DB.set('classes',a);},
  classById:id=>DB.classes().find(c=>c.id===id),
  enrollments:()=>DB.get('enrollments',[]),
  enroll(e){const a=DB.enrollments();if(!a.find(x=>x.userId===e.userId&&x.classId===e.classId)){a.push(e);DB.set('enrollments',a);}},
  classesForUser:uid=>DB.enrollments().filter(e=>e.userId===uid).map(e=>DB.classById(e.classId)).filter(Boolean),
  membersOf:cid=>DB.enrollments().filter(e=>e.classId===cid).map(e=>({...DB.userById(e.userId),roleInClass:e.role})).filter(x=>x.id),
  isEnrolled:(uid,cid)=>DB.enrollments().some(e=>e.userId===uid&&e.classId===cid),
  unenroll:(uid,cid)=>{DB.set('enrollments',DB.enrollments().filter(e=>!(e.userId===uid&&e.classId===cid)));},
  announcements:cid=>DB.get('announcements',[]).filter(a=>a.classId===cid).sort((a,b)=>b.createdAt-a.createdAt),
  addAnnouncement(a){const arr=DB.get('announcements',[]);arr.push(a);DB.set('announcements',arr);},
  assignments:cid=>DB.get('assignments',[]).filter(a=>a.classId===cid).sort((a,b)=>a.dueAt-b.dueAt),
  allAssignments:()=>DB.get('assignments',[]),
  saveAssignment(a){const arr=DB.get('assignments',[]);const i=arr.findIndex(x=>x.id===a.id);if(i>=0)arr[i]=a;else arr.push(a);DB.set('assignments',arr);},
  assignmentById:id=>DB.get('assignments',[]).find(a=>a.id===id),
  submissions:aid=>DB.get('submissions',[]).filter(s=>s.assignmentId===aid),
  submissionBy:(aid,sid)=>DB.get('submissions',[]).find(s=>s.assignmentId===aid&&s.studentId===sid),
  saveSubmission(s){const arr=DB.get('submissions',[]);const i=arr.findIndex(x=>x.id===s.id);if(i>=0)arr[i]=s;else arr.push(s);DB.set('submissions',arr);},
  resources:cid=>DB.get('resources',[]).filter(r=>r.classId===cid).sort((a,b)=>b.createdAt-a.createdAt),
  addResource(r){const arr=DB.get('resources',[]);arr.push(r);DB.set('resources',arr);},
  deleteResource(id){DB.set('resources',DB.get('resources',[]).filter(r=>r.id!==id));},
  messages:cid=>DB.get('messages',[]).filter(m=>m.classId===cid).sort((a,b)=>a.createdAt-b.createdAt),
  addMessage(m){const arr=DB.get('messages',[]);arr.push(m);DB.set('messages',arr);},
  pinMsg(id,v){const arr=DB.get('messages',[]);const m=arr.find(x=>x.id===id);if(m){m.pinned=v;DB.set('messages',arr);}},
  notifs:uid=>DB.get('notifs',[]).filter(n=>n.userId===uid).sort((a,b)=>b.createdAt-a.createdAt),
  addNotif(n){const arr=DB.get('notifs',[]);arr.push(n);DB.set('notifs',arr);},
  markAllRead(uid){const arr=DB.get('notifs',[]);arr.filter(n=>n.userId===uid&&!n.readAt).forEach(n=>n.readAt=Date.now());DB.set('notifs',arr);},
  unreadCount:uid=>DB.get('notifs',[]).filter(n=>n.userId===uid&&!n.readAt).length,
  markAnnouncementRead:(uid,aid)=>{const r=DB.get('reads',{});r[uid+'_'+aid]=true;DB.set('reads',r);},
  isRead:(uid,aid)=>!!DB.get('reads',{})[uid+'_'+aid],
  getDraft:aid=>DB.get('draft_'+aid,''),
  saveDraft:(aid,t)=>DB.set('draft_'+aid,t),
  clearDraft:aid=>localStorage.removeItem('cc_draft_'+aid),
  session:()=>DB.get('session',null),
  setSession:uid=>DB.set('session',{userId:uid,loginAt:Date.now()}),
  clearSession:()=>localStorage.removeItem('cc_session'),
  // Meetings
  meetings:()=>DB.get('meetings',[]),
  activeMeeting:cid=>DB.get('meetings',[]).find(m=>m.classId===cid&&m.active),
  startMeeting(cid,userId){
    const code=Math.random().toString(36).slice(2,8).toUpperCase();
    const m={id:uid(),classId:cid,roomCode:code,startedBy:userId,startedAt:Date.now(),active:true};
    const arr=DB.meetings();arr.forEach(x=>{if(x.classId===cid)x.active=false;});arr.push(m);DB.set('meetings',arr);
    return m;
  },
  endMeeting(cid){const arr=DB.meetings();arr.filter(m=>m.classId===cid).forEach(m=>m.active=false);DB.set('meetings',arr);},
  // Activity log
  addActivity(a){const arr=DB.get('activity',[]);arr.push({...a,ts:Date.now()});if(arr.length>100)arr.splice(0,arr.length-100);DB.set('activity',arr);},
  activities:()=>DB.get('activity',[]).sort((a,b)=>b.ts-a.ts),
};
function notify(userIds,type,msg,payload={}){
  userIds.filter(Boolean).forEach(uid=>{DB.addNotif({id:Math.random().toString(36).slice(2)+Date.now().toString(36),userId:uid,type,message:msg,payload,createdAt:Date.now(),readAt:null});});
}

// ── AUTH ─────────────────────────────────────────────────────────
const Auth={
  user:null,
  init(){const s=DB.session();if(s)this.user=DB.userById(s.userId);},
  login(email,pass){
    email=email.toLowerCase().trim();
    if(!email.endsWith(DOMAIN))return{ok:false,err:'Only '+DOMAIN+' emails allowed.'};
    const u=DB.userByEmail(email);
    if(!u)return{ok:false,err:'No account found.'};
    if(u.ph!==btoa(pass))return{ok:false,err:'Incorrect password.'};
    this.user=u;DB.setSession(u.id);return{ok:true,user:u};
  },
  register(name,email,pass,role){
    email=email.toLowerCase().trim();
    if(!email.endsWith(DOMAIN))return{ok:false,err:'Only '+DOMAIN+' emails allowed.'};
    if(!name.trim()||name.trim().length<2)return{ok:false,err:'Enter your full name.'};
    if(!pass||pass.length<6)return{ok:false,err:'Password must be at least 6 characters.'};
    if(DB.userByEmail(email))return{ok:false,err:'Account already exists.'};
    const u={id:uid(),name:name.trim(),email,ph:btoa(pass),role:role||'student',createdAt:Date.now(),active:true};
    DB.saveUser(u);this.user=u;DB.setSession(u.id);return{ok:true,user:u};
  },
  logout(){this.user=null;DB.clearSession();},
  get ok(){return!!this.user;},get role(){return this.user?.role;},get id(){return this.user?.id;}
};

// ── SEED ─────────────────────────────────────────────────────────
function seed(){
  if(DB.get('seeded3'))return;
  const now=Date.now(),d=86400000;
  [{id:'admin001',name:'Admin (Test)',email:'admin@sakec.ac.in',ph:btoa('Admin@123'),role:'admin',createdAt:now-30*d,active:true},
   {id:'tea001',name:'Dr. Priya Sharma',email:'priya.sharma@sakec.ac.in',ph:btoa('Teacher@123'),role:'teacher',createdAt:now-20*d,active:true},
   {id:'tea002',name:'Prof. Rahul Mehta',email:'rahul.mehta@sakec.ac.in',ph:btoa('Teacher@123'),role:'teacher',createdAt:now-18*d,active:true},
   {id:'stu001',name:'Aisha Khan',email:'aisha.khan@sakec.ac.in',ph:btoa('Student@123'),role:'student',createdAt:now-10*d,active:true},
   {id:'stu002',name:'Rohan Verma',email:'rohan.verma@sakec.ac.in',ph:btoa('Student@123'),role:'student',createdAt:now-8*d,active:true},
   {id:'stu003',name:'Sneha Patel',email:'sneha.patel@sakec.ac.in',ph:btoa('Student@123'),role:'student',createdAt:now-6*d,active:true},
  ].forEach(u=>DB.saveUser(u));
  [{id:'cls001',name:'Data Structures & Algorithms',subject:'Computer Science',createdBy:'tea001',code:'CS-DSA-2024',semester:3,createdAt:now-18*d},
   {id:'cls002',name:'Database Management Systems',subject:'Computer Science',createdBy:'tea002',code:'CS-DBMS-2024',semester:3,createdAt:now-16*d},
   {id:'cls003',name:'Engineering Mathematics III',subject:'Mathematics',createdBy:'tea001',code:'MATH-3-2024',semester:3,createdAt:now-14*d},
  ].forEach(c=>DB.saveClass(c));
  [{userId:'tea001',classId:'cls001',role:'teacher'},{userId:'tea002',classId:'cls002',role:'teacher'},{userId:'tea001',classId:'cls003',role:'teacher'},
   {userId:'stu001',classId:'cls001',role:'student'},{userId:'stu001',classId:'cls002',role:'student'},{userId:'stu001',classId:'cls003',role:'student'},
   {userId:'stu002',classId:'cls001',role:'student'},{userId:'stu002',classId:'cls002',role:'student'},
   {userId:'stu003',classId:'cls001',role:'student'},{userId:'stu003',classId:'cls003',role:'student'},
  ].forEach(e=>DB.enroll(e));
  [{classId:'cls001',authorId:'tea001',body:'Welcome to DSA! First assessment in Week 3.',createdAt:now-5*d},
   {classId:'cls001',authorId:'tea001',body:'Reminder: Assignment 1 (Linked List) due Friday 11:59 PM.',createdAt:now-2*d},
   {classId:'cls002',authorId:'tea002',body:'Unit 2 (Normalization) notes uploaded. Read before Thursday.',createdAt:now-3*d},
   {classId:'cls003',authorId:'tea001',body:'Mathematics quiz on Laplace Transforms — next Monday.',createdAt:now-d},
  ].forEach(a=>DB.addAnnouncement({id:uid(),...a}));
  const asgns=[
    {id:'asgn001',classId:'cls001',title:'Linked List Implementation',instructions:'Implement a doubly linked list with:\n1. Node class (data, prev, next)\n2. Insert at beginning, end, position n\n3. Delete by value and position\n4. Search and display\n\nSubmit code + explanation (max 300 words).',dueAt:now+3*d,createdBy:'tea001',createdAt:now-5*d},
    {id:'asgn002',classId:'cls001',title:'Binary Search Tree Operations',instructions:'Implement a BST with:\n1. Insert, Delete, Search\n2. All traversals\n3. Height calculation\n4. Time complexity analysis.',dueAt:now+10*d,createdBy:'tea001',createdAt:now-2*d},
    {id:'asgn003',classId:'cls002',title:'ER Diagram Design',instructions:'Design an ER diagram for a Hospital Management System.\nSubmit as PDF or image.',dueAt:now+5*d,createdBy:'tea002',createdAt:now-3*d},
    {id:'asgn004',classId:'cls003',title:'Laplace Transform Problems',instructions:'Solve Ch. 4: Problems 1-10 (Ex 4.2), Problems 3,5,7 (Ex 4.4).\nShow all steps.',dueAt:now-d,createdBy:'tea001',createdAt:now-7*d},
  ];
  asgns.forEach(a=>DB.saveAssignment(a));
  [{id:uid(),assignmentId:'asgn001',studentId:'stu002',textBody:'Implemented doubly linked list in Python.',fileName:'doubly_ll.py',fileData:null,submittedAt:now-d,grade:88,feedback:'Excellent! Minor edge case in delete.'},
   {id:uid(),assignmentId:'asgn004',studentId:'stu001',textBody:'Solutions attached.',fileName:'laplace_solutions.pdf',fileData:null,submittedAt:now-2*d,grade:null,feedback:null},
   {id:uid(),assignmentId:'asgn004',studentId:'stu003',textBody:'Completed all 13 problems.',fileName:null,fileData:null,submittedAt:now-1.5*d,grade:91,feedback:'Great work!'},
  ].forEach(s=>DB.saveSubmission(s));
  [{classId:'cls001',uploadedBy:'tea001',title:'DSA Syllabus 2024-25',description:'Complete syllabus and grading.',fileName:'DSA_Syllabus.pdf',fileType:'pdf',fileSize:245000,createdAt:now-17*d},
   {classId:'cls001',uploadedBy:'tea001',title:'Linked Lists — Lecture Slides',description:'Week 2 slides.',fileName:'LinkedLists_W2.pptx',fileType:'pptx',fileSize:1240000,createdAt:now-8*d},
   {classId:'cls002',uploadedBy:'tea002',title:'DBMS Unit 2 — Normalization',description:'1NF, 2NF, 3NF, BCNF.',fileName:'Normalization.pdf',fileType:'pdf',fileSize:890000,createdAt:now-3*d},
   {classId:'cls003',uploadedBy:'tea001',title:'Laplace Transform Reference',description:'Quick reference for pairs.',fileName:'Laplace_Ref.pdf',fileType:'pdf',fileSize:320000,createdAt:now-6*d},
  ].forEach(r=>DB.addResource({id:uid(),...r}));
  [{classId:'cls001',authorId:'stu001',body:'Has anyone started on the Linked List assignment?',pinned:false,createdAt:now-1.5*d,system:false},
   {classId:'cls001',authorId:'stu002',body:'Yes! The delete-by-position part was tricky.',pinned:false,createdAt:now-1.4*d,system:false},
   {classId:'cls001',authorId:'tea001',body:'Submit via the Assignments tab. Add proper comments!',pinned:true,createdAt:now-1.2*d,system:false},
   {classId:'cls001',authorId:'stu003',body:'Professor, can we use C++?',pinned:false,createdAt:now-0.8*d,system:false},
   {classId:'cls001',authorId:'tea001',body:'Yes, any language is fine.',pinned:false,createdAt:now-0.6*d,system:false},
  ].forEach(m=>DB.addMessage({id:uid(),...m}));
  notify(['stu001','stu002','stu003'],'announcement','New announcement in DSA',{classId:'cls001'});
  notify(['stu002'],'grade','Linked List graded: 88/100',{assignmentId:'asgn001'});
  notify(['stu003'],'grade','Laplace submission graded: 91/100',{assignmentId:'asgn004'});
  DB.addActivity({type:'user_join',text:'Admin account created',userId:'admin001'});
  DB.addActivity({type:'class_create',text:'Class "DSA" created by Dr. Priya Sharma',userId:'tea001'});
  DB.addActivity({type:'submission',text:'Rohan Verma submitted Linked List assignment',userId:'stu002'});
  DB.addActivity({type:'grade',text:'Sneha Patel graded 91/100 on Laplace Transform',userId:'stu003'});
  DB.set('seeded3',true);
}

// ── ICONS ─────────────────────────────────────────────────────────
const I={
  logo:'<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  home:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  users:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  assign:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  chat:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bell:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  folder:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  progress:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  admin:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  logout:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  plus:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  video:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  send:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  pin:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
  check:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  clock:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  file:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  close:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  back:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  menu:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  upload:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
  wifi:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  wifiOff:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/></svg>',
  copy:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  announce:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  sun:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  monitor:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  search:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  book:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  globe:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
};

// ── HELPERS ──────────────────────────────────────────────────────
function timeAgo(ts){const d=Date.now()-ts;if(d<60000)return'just now';if(d<3600000)return Math.floor(d/60000)+'m ago';if(d<86400000)return Math.floor(d/3600000)+'h ago';if(d<604800000)return Math.floor(d/86400000)+'d ago';return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function fDate(ts){return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function fBytes(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB';}
function fileEmoji(t=''){if(t.includes('pdf'))return'📕';if(t.includes('ppt'))return'📊';if(t.includes('doc'))return'📝';if(t.includes('xls'))return'📗';if(t.includes('image')||t.includes('jpg')||t.includes('png'))return'🖼️';return'📄';}
function dueStatus(ts){const d=ts-Date.now();if(d<0)return{label:'Overdue',cls:'badge-rose'};if(d<86400000)return{label:'Due today',cls:'badge-amber'};if(d<3*86400000)return{label:'Due in '+Math.ceil(d/86400000)+'d',cls:'badge-amber'};return{label:new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short'}),cls:'badge-muted'};}
function av(user,sz=''){if(!user)return'<div class="avatar '+sz+'" style="background:var(--glass-2)">?</div>';return'<div class="avatar '+sz+'" style="background:'+avColor(user.id)+'">'+initials(user.name)+'</div>';}
function greetingName(user){
  if(!user||!user.name)return'there';
  const parts=user.name.trim().split(/\s+/);
  if(parts.length>1 && (parts[0]==='Dr.'||parts[0]==='Prof.'||parts[0]==='Mr.'||parts[0]==='Ms.'||parts[0]==='Mrs.')){
    return parts[0]+' '+parts[1];
  }
  return parts[0].replace(/[^a-zA-Z]/g,'')||parts[0];
}
function isLowBw(){return localStorage.getItem('cc_lowbw')==='1';}
function toggleLowBw(){isLowBw()?localStorage.removeItem('cc_lowbw'):localStorage.setItem('cc_lowbw','1');Router._render();toast(isLowBw()?'Low-bandwidth ON':'Low-bandwidth OFF','info');}
function toast(msg,type='info'){const tc=document.getElementById('toast-container');const el=document.createElement('div');el.className='toast toast-'+type;el.innerHTML='<span>'+({success:'✅',error:'❌',info:'🔶'}[type]||'🔶')+'</span><span>'+msg+'</span>';tc.appendChild(el);setTimeout(()=>{el.style.cssText='opacity:0;transform:translateX(40px);transition:.3s';setTimeout(()=>el.remove(),320);},3500);}
function showModal(html){const o=document.getElementById('modal-overlay');o.innerHTML='<div class="modal animate-in">'+html+'</div>';o.classList.remove('hidden');}
function closeModal(){const o=document.getElementById('modal-overlay');o.classList.add('hidden');o.innerHTML='';}

// ── API MODULE ──────────────────────────────────────────────────
const API={
  async quote(){try{const r=await fetch('https://api.quotable.io/random?maxLength=120');if(!r.ok)throw 0;const d=await r.json();return{text:d.content,author:d.author};}catch{return{text:'Education is the most powerful weapon you can use to change the world.',author:'Nelson Mandela'};}},
  async dictLookup(word){try{const r=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word));if(!r.ok)throw 0;return await r.json();}catch{return null;}},
  async searchBooks(q){try{const r=await fetch('https://openlibrary.org/search.json?q='+encodeURIComponent(q)+'&limit=6');if(!r.ok)throw 0;const d=await r.json();return d.docs||[];}catch{return[];}},
  async numberFact(n){try{const r=await fetch('https://numbersapi.com/'+n+'?json');if(!r.ok)throw 0;const d=await r.json();return d.text;}catch{return n+' is a number.';}},
  async weather(lat,lon){try{const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto');if(!r.ok)throw 0;return await r.json();}catch{return null;}},
  async countries(){try{const r=await fetch('https://restcountries.com/v3.1/all?fields=name,flags,region');if(!r.ok)throw 0;return await r.json();}catch{return[];}},
};

// ── ROUTER ──────────────────────────────────────────────────────
const Router={
  page:null,params:{},polls:[],
  go(page,params={}){this._clearPolls();this.page=page;this.params=params;this._render();window.scrollTo(0,0);},
  _clearPolls(){this.polls.forEach(clearInterval);this.polls=[];if(window._jitsi){try{window._jitsi.dispose();}catch(e){}window._jitsi=null;}},
  addPoll(fn,ms){const id=setInterval(fn,ms);this.polls.push(id);},
  _render(){
    const app=document.getElementById('app');
    if(!Auth.ok){app.innerHTML=Pages.hero();initSpotlight();bindHero();return;}
    switch(this.page){
      case'dashboard':app.innerHTML=Pages.dashboard();break;
      case'class':app.innerHTML=Pages.classTeam(this.params.cid,this.params.tab||'stream');if(this.params.tab==='chat')startChatPoll(this.params.cid);break;
      case'assignment':app.innerHTML=Pages.assignment(this.params.aid);break;
      case'progress':app.innerHTML=Pages.progress();break;
      case'gradebook':app.innerHTML=Pages.gradebook(this.params.cid);break;
      case'admin':app.innerHTML=Pages.admin();break;
      case'notifs':app.innerHTML=Pages.notifs();break;
      case'profile':app.innerHTML=Pages.profile();break;
      default:app.innerHTML=Pages.dashboard();
    }
    bindGlobal();startNotifPoll();
  },
};

// ── COMPONENTS ──────────────────────────────────────────────────
function banner(id){const idx=Math.abs(id.charCodeAt?[...id].reduce((a,c)=>c.charCodeAt(0)+((a<<5)-a),0):0)%BANNERS.length;return BANNERS[idx];}

function sidebar(active=''){
  const u=Auth.user; if(!u) return '';
  const items=[
    {id:'dashboard',icon:I.home,lbl:'Dashboard'},
    ...(u.role==='student'?[{id:'progress',icon:I.progress,lbl:'My Progress'}]:[]),
    ...(u.role==='admin'?[{id:'admin',icon:I.admin,lbl:'Admin Panel'}]:[]),
  ];
  const classes=DB.classesForUser(u.id);
  const unread=DB.unreadCount(u.id);
  return `<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo" data-nav="dashboard" style="cursor:pointer">
      <div class="sidebar-logo-icon">${I.logo}</div>
      <div class="sidebar-logo-text">CampusConnect</div>
    </div>
    <nav class="nav-section">
      <div class="nav-label">Menu</div>
      ${items.map(i=>`<div class="nav-item${active===i.id?' active':''}" data-nav="${i.id}">${i.icon}<span>${i.lbl}</span>${i.id==='dashboard'&&unread?`<span class="nav-badge">${unread}</span>`:''}</div>`).join('')}
    </nav>
    <nav class="nav-section" style="flex:1;overflow-y:auto">
      <div class="nav-label">My Classes
        ${u.role==='teacher'?`<button class="btn btn-ghost btn-sm" id="sb-new-class" style="padding:2px 6px;font-size:10px">${I.plus}</button>`:''}
        ${u.role==='student'?`<button class="btn btn-ghost btn-sm" id="sb-join-class" style="padding:2px 6px;font-size:10px">${I.plus}</button>`:''}
      </div>
      ${classes.map(c=>`<div class="nav-item" data-nav="class" data-cid="${c.id}">${I.folder}<span>${c.name}</span></div>`).join('')}
      ${classes.length===0?`<div style="padding:8px 12px;font-size:12px;color:var(--t4)">No classes yet</div>`:''}
    </nav>
    <div class="sidebar-bottom">
      <div style="display:flex;align-items:center;gap:6px;padding:0 12px 10px;justify-content:space-between">
        <button class="icon-btn" id="lowbw-btn" title="Toggle low-bandwidth mode">${isLowBw()?I.wifiOff:I.wifi}</button>
        <div class="theme-toggle">
          <button class="theme-opt${Theme.current==='light'?' active':''}" data-theme-set="light" title="Light">${I.sun}</button>
          <button class="theme-opt${Theme.current==='dark'?' active':''}" data-theme-set="dark" title="Dark">${I.moon}</button>
          <button class="theme-opt${Theme.current==='system'?' active':''}" data-theme-set="system" title="System">${I.monitor}</button>
        </div>
      </div>
      <div class="user-card" data-nav="profile">
        ${av(u)}<div class="user-info"><div class="user-name">${u.name}</div><div class="user-role">${u.role}</div></div>
        ${I.logout}
      </div>
    </div>
  </aside>`;
}

function topbar(title,back=''){
  const u=Auth.user;
  const unread=DB.unreadCount(u.id);
  return `<header class="topbar">
    <button class="icon-btn" id="mob-menu" title="Toggle Navigation Menu">${I.menu}</button>
    ${back?`<button class="icon-btn" id="back-btn" data-target="${back}">${I.back}</button>`:''}
    <div class="topbar-title">${title}</div>
    <div class="topbar-actions">
      <div class="theme-toggle" style="margin-right:4px">
        <button class="theme-opt${Theme.current==='light'?' active':''}" data-theme-set="light" title="Light">${I.sun}</button>
        <button class="theme-opt${Theme.current==='dark'?' active':''}" data-theme-set="dark" title="Dark">${I.moon}</button>
        <button class="theme-opt${Theme.current==='system'?' active':''}" data-theme-set="system" title="System">${I.monitor}</button>
      </div>
      <button class="icon-btn" id="notif-bell" title="Notifications">${I.bell}${unread>0?'<span class="notif-dot"></span>':''}</button>
    </div>
  </header>`;
}

// ── HERO LOGIN (Lithos-style) ──────────────────────────────────
const Pages={

hero(){
  return `<section class="hero-section" id="hero-container">
    <div class="hero-bg hero-zoom" style="background-image:url('${BG1}')"></div>
    <div class="hero-reveal" id="reveal-layer" style="background-image:url('${BG2}')"></div>
    <nav class="hero-nav">
      <div class="hero-nav-logo" id="hero-logo-btn">
        <svg width="26" height="26" viewBox="0 0 256 256" fill="#fff"><path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z"/></svg>
        <span>CampusConnect</span>
      </div>
      <div class="hero-nav-pill" id="hero-nav-pill">
        <button data-hero-tab="about" class="active">About</button>
        <button data-hero-tab="features">Features</button>
        <button data-hero-tab="classes">Classes</button>
        <button data-hero-tab="sdg">SDG Goals</button>
        <button data-hero-tab="contact">Contact</button>
      </div>
      <div class="hero-nav-right"><button id="hero-signup-btn">Sign Up</button></div>
      <button id="mob-menu-hero" style="background:none;border:none;color:#fff;cursor:pointer;padding:8px" class="md-hidden">${I.menu}</button>
    </nav>
    <div class="hero-heading">
      <h1>
        <span class="hero-line1 hero-anim hero-reveal-anim" style="animation-delay:.25s">Learning</span>
        <span class="hero-line2 hero-anim hero-reveal-anim" style="animation-delay:.42s">Beyond Walls</span>
      </h1>
    </div>
    <div class="hero-bl hero-anim hero-fade" style="animation-delay:.7s">
      <p>CampusConnect unifies classes, assignments, chat, and video meetings — so every student can participate, whether they're in the room or across the city.</p>
    </div>
    <div class="hero-br hero-anim hero-fade" style="animation-delay:.85s">
      <p>Built for SAKEC. Inspired by SDG 4 (Quality Education) and SDG 10 (Reduced Inequalities). Every critical action works asynchronously, on any device.</p>
      <button class="hero-cta" id="hero-signin-btn">Sign In</button>
    </div>
  </section>`;
},

heroModal(type){
  const tabs = [
    {id:'about', lbl:'About'},
    {id:'features', lbl:'Features'},
    {id:'classes', lbl:'Classes'},
    {id:'sdg', lbl:'SDG Goals'},
    {id:'contact', lbl:'Contact'}
  ];
  let body = '';
  if (type === 'about') {
    body = `
      <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--t1)">About CampusConnect</div>
      <p style="color:var(--t2);font-size:14px;line-height:1.7;margin-bottom:14px">
        <strong>"Microsoft Teams, redesigned for how a school actually runs."</strong>
      </p>
      <p style="color:var(--t3);font-size:13px;line-height:1.7;margin-bottom:18px">
        Built specifically for Shah & Anchor Kutchhi Engineering College (SAKEC). CampusConnect brings class announcements, assignments, textbook resources, live chat, and video meetings together under one unified platform.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--accent-l);margin-bottom:4px">🎓 SDG 4 Aligned</div>
          <div style="font-size:12px;color:var(--t3)">Quality education accessible asynchronously for every student.</div>
        </div>
        <div style="padding:14px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--cyan-l);margin-bottom:4px">⚡ Low-Bandwidth Mode</div>
          <div style="font-size:12px;color:var(--t3)">Optimized for slow mobile connections and offline auto-drafting.</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-primary" onclick="openLoginFromModal()">Get Started — Sign In</button>
      </div>
    `;
  } else if (type === 'features') {
    body = `
      <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--t1)">Core Features</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;max-height:320px;overflow-y:auto">
        <div style="padding:14px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--t1);margin-bottom:4px">📢 Class Stream</div>
          <div style="font-size:12px;color:var(--t3)">Real-time teacher announcements with unread tracking & built-in dictionary.</div>
        </div>
        <div style="padding:14px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--t1);margin-bottom:4px">📝 Asynchronous Work</div>
          <div style="font-size:12px;color:var(--t3)">Submit work via Drag & Drop or typing with auto-saved offline drafts.</div>
        </div>
        <div style="padding:14px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--t1);margin-bottom:4px">🎥 Video Meet Rooms</div>
          <div style="font-size:12px;color:var(--t3)">Teacher-controlled meeting rooms with chat alerts and code joining.</div>
        </div>
        <div style="padding:14px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--t1);margin-bottom:4px">📚 Open Library Integration</div>
          <div style="font-size:12px;color:var(--t3)">Search millions of textbooks directly from the course resources tab.</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-primary" onclick="openRegisterFromModal()">Join Now — Create Account</button>
      </div>
    `;
  } else if (type === 'classes') {
    body = `
      <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--t1)">Active Classes (Semester 3)</div>
      <p style="color:var(--t3);font-size:13px;margin-bottom:14px">Browse existing courses or join using your course code.</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;max-height:280px;overflow-y:auto">
        <div style="padding:12px 16px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;color:var(--t1)">Data Structures & Algorithms</div>
            <div style="font-size:12px;color:var(--t4)">Dr. Priya Sharma · Computer Science</div>
          </div>
          <span class="badge badge-accent">CS-DSA-2024</span>
        </div>
        <div style="padding:12px 16px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;color:var(--t1)">Database Management Systems</div>
            <div style="font-size:12px;color:var(--t4)">Prof. Rahul Mehta · Computer Science</div>
          </div>
          <span class="badge badge-accent">CS-DBMS-2024</span>
        </div>
        <div style="padding:12px 16px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;color:var(--t1)">Engineering Mathematics III</div>
            <div style="font-size:12px;color:var(--t4)">Dr. Priya Sharma · Mathematics</div>
          </div>
          <span class="badge badge-accent">MATH-3-2024</span>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-primary" onclick="openLoginFromModal()">Sign In to Join Class</button>
      </div>
    `;
  } else if (type === 'sdg') {
    body = `
      <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--t1)">United Nations SDG Alignment</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px">
        <div style="padding:16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--emerald-l);margin-bottom:4px;font-size:15px">🎯 SDG 4: Quality Education</div>
          <div style="font-size:13px;color:var(--t2);line-height:1.6">
            Ensure inclusive and equitable quality education. CampusConnect guarantees that physical absence never prevents learning by making materials, assignments, and discussions fully accessible anytime.
          </div>
        </div>
        <div style="padding:16px;background:rgba(232,112,42,0.08);border:1px solid rgba(232,112,42,0.25);border-radius:var(--r-m)">
          <div style="font-weight:700;color:var(--accent-l);margin-bottom:4px;font-size:15px">🌐 SDG 10: Reduced Inequalities</div>
          <div style="font-size:13px;color:var(--t2);line-height:1.6">
            Reduce inequality by supporting students with low connectivity, older mobile devices, and asynchronous work schedules through bandwidth toggles and offline draft resilience.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeHeroModal()">Back to Spotlight</button>
      </div>
    `;
  } else if (type === 'contact') {
    body = `
      <div style="font-size:22px;font-weight:800;margin-bottom:8px;color:var(--t1)">Contact & Helpdesk</div>
      <p style="color:var(--t3);font-size:13.5px;margin-bottom:16px">
        CampusConnect is developed for Shah & Anchor Kutchhi Engineering College.
      </p>
      <div style="padding:16px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m);margin-bottom:20px;font-size:13px;color:var(--t2);line-height:1.8">
        <div>📍 <strong>Address:</strong> Mahavir Education Trust Chowk, W.T. Patil Marg, Chembur, Mumbai 400088</div>
        <div>📧 <strong>Domain Support:</strong> admin@sakec.ac.in</div>
        <div>🔐 <strong>Account Policy:</strong> Restricted exclusively to verified @sakec.ac.in domain users.</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeHeroModal()">Close</button>
        <button class="btn btn-primary" onclick="openLoginFromModal()">Sign In</button>
      </div>
    `;
  }
  return `
    <div class="auth-card" style="max-width:540px;padding:32px 30px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="display:flex;gap:4px;background:var(--glass-1);padding:3px;border-radius:99px;border:1px solid var(--glass-b);overflow-x:auto;max-width:calc(100% - 40px)">
          ${tabs.map(t=>`<button class="hero-modal-tab${type===t.id?' active':''}" data-hero-modal-tab="${t.id}" style="padding:5px 12px;border-radius:99px;font-size:12px;border:none;background:${type===t.id?'var(--accent)':'transparent'};color:${type===t.id?'#fff':'var(--t3)'};cursor:pointer;font-weight:600;white-space:nowrap">${t.lbl}</button>`).join('')}
        </div>
        <button onclick="closeHeroModal()" style="width:30px;height:30px;border-radius:50%;background:var(--glass-1);border:1px solid var(--glass-b);color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:pointer">${I.close}</button>
      </div>
      <div id="hero-modal-content" class="animate-in">
        ${body}
      </div>
    </div>
  `;
},

login(){
  return `<div class="auth-card">
    <div class="auth-logo"><div class="auth-logo-icon">${I.logo}</div><span class="auth-logo-text">CampusConnect</span></div>
    <p class="auth-tagline">Your school, <strong>all in one place</strong>.<br>Classes · Assignments · Chat · Video Meetings</p>
    <form id="login-form">
      <div class="form-group"><label class="form-label">Email Address</label><input id="l-email" type="email" class="form-input" placeholder="you@sakec.ac.in" autocomplete="email"></div>
      <div class="form-group"><label class="form-label">Password</label><input id="l-pass" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password"></div>
      <div class="form-err" id="l-err"></div>
      <button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:10px">Sign In</button>
    </form>
    <div style="text-align:center;margin-top:18px;font-size:13px;color:var(--t4)">New here? <a href="#" id="go-reg" style="color:var(--accent-l);font-weight:600">Create Account</a></div>
    <div style="margin-top:26px;padding:16px;background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m)">
      <div style="font-size:10.5px;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.9px;margin-bottom:10px">Quick-Login Test Accounts</div>
      <div class="test-acc" data-e="admin@sakec.ac.in" data-p="Admin@123"><span class="badge badge-rose">Admin</span><span style="font-size:12px;color:var(--t3)">admin@sakec.ac.in / Admin@123</span></div>
      <div class="test-acc" data-e="priya.sharma@sakec.ac.in" data-p="Teacher@123"><span class="badge badge-accent">Teacher</span><span style="font-size:12px;color:var(--t3)">priya.sharma@sakec.ac.in / Teacher@123</span></div>
      <div class="test-acc" data-e="aisha.khan@sakec.ac.in" data-p="Student@123"><span class="badge badge-cyan">Student</span><span style="font-size:12px;color:var(--t3)">aisha.khan@sakec.ac.in / Student@123</span></div>
    </div>
  </div>`;
},

register(){
  return `<div class="auth-card">
    <div class="auth-logo"><div class="auth-logo-icon">${I.logo}</div><span class="auth-logo-text">CampusConnect</span></div>
    <p class="auth-tagline">Join your school's digital campus.<br><strong>Only @sakec.ac.in emails.</strong></p>
    <form id="reg-form">
      <div class="form-group"><label class="form-label">Full Name</label><input id="r-name" type="text" class="form-input" placeholder="Your full name"></div>
      <div class="form-group"><label class="form-label">Email Address</label><input id="r-email" type="email" class="form-input" placeholder="you@sakec.ac.in"><div class="form-hint">Must be a @sakec.ac.in address</div></div>
      <div class="form-group"><label class="form-label">Role</label><select id="r-role" class="form-select"><option value="student">Student</option><option value="teacher">Teacher</option></select></div>
      <div class="two-col">
        <div class="form-group"><label class="form-label">Password</label><input id="r-pass" type="password" class="form-input" placeholder="Min. 6 chars"></div>
        <div class="form-group"><label class="form-label">Confirm</label><input id="r-conf" type="password" class="form-input" placeholder="Re-enter"></div>
      </div>
      <div class="form-err" id="r-err"></div>
      <button type="submit" class="btn btn-primary btn-full btn-lg">Create Account</button>
    </form>
    <div style="text-align:center;margin-top:14px;font-size:13px;color:var(--t4)">Already have an account? <a href="#" id="go-login" style="color:var(--accent-l);font-weight:600">Sign In</a></div>
  </div>`;
},

dashboard(){
  const u=Auth.user; const lbw=isLowBw();
  const classes=DB.classesForUser(u.id);
  const now=Date.now(); const week=7*86400000;
  let due=[];
  if(u.role==='student'){classes.forEach(c=>{DB.assignments(c.id).forEach(a=>{if(a.dueAt>now&&a.dueAt<now+week&&!DB.submissionBy(a.id,u.id))due.push({...a,className:c.name});});});due.sort((a,b)=>a.dueAt-b.dueAt);}
  return `<div class="app-layout${lbw?' low-bw':''}">${sidebar('dashboard')}<div class="main-content">${topbar('Welcome back, '+greetingName(u)+'! 👋')}<div class="page stagger">
  <div id="quote-widget" class="api-widget mb-18"><div class="skeleton" style="height:52px"></div></div>
  ${u.role==='student'&&due.length>0?`<div class="mb-24 animate-in"><div class="section-hdr mb-16"><div><div class="section-title">⏰ Due This Week</div><div class="section-sub">${due.length} assignment${due.length!==1?'s':''} coming up</div></div></div>${due.slice(0,3).map(a=>{const ds=dueStatus(a.dueAt);return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:var(--amber-d);color:var(--amber-l)">${I.clock}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${a.className}</div></div><span class="badge ${ds.cls}">${ds.label}</span></div>`;}).join('')}</div>`:''}
  <div class="section-hdr mb-16"><div><div class="section-title">My Classes</div><div class="section-sub">${classes.length} class${classes.length!==1?'es':''}</div></div><div style="display:flex;gap:8px">${u.role==='teacher'?`<button class="btn btn-primary btn-sm" id="new-class-btn">${I.plus} New Class</button>`:''}${u.role==='student'?`<button class="btn btn-secondary btn-sm" id="join-class-btn">${I.plus} Join Class</button>`:''}</div></div>
  ${classes.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">🏫</div><div class="empty-text">No classes yet</div><div class="empty-sub">${u.role==='student'?'Ask your teacher for a class code.':'Create your first class!'}</div></div>`:`<div class="card-grid">${classes.map(c=>{const teacher=DB.userById(c.createdBy);const members=DB.membersOf(c.id);const asgns=DB.assignments(c.id);return `<div class="class-card glass-card" data-nav="class" data-cid="${c.id}">${!lbw?`<div class="class-card-banner" style="background:${banner(c.id)}"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.06"><svg width="50" height="50" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div></div>`:''}<div class="class-card-body"><div class="class-card-name">${c.name}</div><div class="class-card-sub">${c.subject} · Sem ${c.semester||3}</div><div style="display:flex;gap:5px;margin-bottom:11px"><span class="badge badge-muted">${I.assign} ${asgns.length}</span><span class="badge badge-muted">${I.users} ${members.length}</span></div><div class="class-card-meta"><div style="display:flex;align-items:center;gap:6px">${teacher?av(teacher,'avatar-sm'):''}<span style="font-size:12px">${teacher?.name||'Unknown'}</span></div><span class="badge badge-accent" style="font-size:10px">${c.code}</span></div></div></div>`;}).join('')}</div>`}
  </div></div></div>`;
},

classTeam(cid,activeTab='stream'){
  const u=Auth.user; const lbw=isLowBw();
  const cls=DB.classById(cid);
  if(!cls)return`<div style="padding:60px;text-align:center;color:var(--t4)">Class not found.</div>`;
  const members=DB.membersOf(cid);
  const isT=u.role==='teacher'&&cls.createdBy===u.id;
  const tabs=[{id:'stream',lbl:'Stream',icon:I.announce},{id:'assignments',lbl:'Assignments',icon:I.assign},{id:'resources',lbl:'Resources',icon:I.folder},{id:'chat',lbl:'Chat',icon:I.chat},{id:'meet',lbl:'Meet',icon:I.video},...(isT?[{id:'members',lbl:'Members',icon:I.users},{id:'gradebook',lbl:'Gradebook',icon:I.progress}]:[])];
  let content='';
  switch(activeTab){case'stream':content=this._stream(cid,isT);break;case'assignments':content=this._assignments(cid,isT);break;case'resources':content=this._resources(cid,isT,lbw);break;case'chat':content=this._chat(cid);break;case'meet':content=this._meet(cid,cls);break;case'members':content=this._members(cid,isT);break;case'gradebook':content=Pages.gradebook(cid,true);break;default:content=this._stream(cid,isT);}
  return `<div class="app-layout${lbw?' low-bw':''}">${sidebar()}<div class="main-content">${topbar(cls.name,'dashboard')}<div class="page">${!lbw?`<div class="class-header mb-24" style="background:${banner(cid)}"><div class="class-header-overlay"></div><div class="class-header-content"><div class="class-title">${cls.name}</div><div class="class-subtitle"><span>${cls.subject}</span><span>·</span><span>${members.length} members</span>${isT?`<span>·</span><span class="badge badge-accent">Your Class</span>`:''}</div></div></div>`:`<div style="margin-bottom:20px"><h2 style="font-size:22px;font-weight:800">${cls.name}</h2><p style="color:var(--t4)">${cls.subject}</p></div>`}<div class="tabs mb-24">${tabs.map(t=>`<div class="tab-item${activeTab===t.id?' active':''}" data-tab="${t.id}" data-cid="${cid}">${t.icon}<span>${t.lbl}</span></div>`).join('')}</div><div id="tab-content" class="animate-in">${content}</div></div></div></div>`;
},

_stream(cid,isT){
  const u=Auth.user; const anns=DB.announcements(cid);
  return `${isT?`<div class="panel mb-20" style="padding:18px 22px"><form id="ann-form"><div style="display:flex;gap:11px;align-items:flex-start">${av(u)}<div style="flex:1"><textarea id="ann-body" class="form-input" rows="2" placeholder="Post an announcement..." style="resize:none"></textarea><div style="display:flex;justify-content:flex-end;margin-top:9px"><button type="submit" class="btn btn-primary btn-sm" data-cid="${cid}">Post</button></div></div></div></form></div>`:''}<div id="dict-widget" class="api-widget mb-18"><div style="display:flex;gap:8px"><input type="text" id="dict-input" class="form-input" placeholder="Look up a word..." style="flex:1"><button class="btn btn-secondary btn-sm" id="dict-btn">${I.search} Define</button></div><div id="dict-result"></div></div><div class="stagger">${anns.length===0?`<div class="empty-state"><div class="empty-icon">📢</div><div class="empty-text">No announcements yet</div></div>`:anns.map(a=>{const author=DB.userById(a.authorId);const unread=!DB.isRead(u.id,a.id);if(unread)DB.markAnnouncementRead(u.id,a.id);return `<div class="stream-post${unread?' unread':''}"><div class="stream-post-header">${av(author)}<div><div class="stream-post-author">${author?.name||'Unknown'}</div><div class="stream-post-time">${timeAgo(a.createdAt)}</div></div>${unread?`<span class="badge badge-accent" style="margin-left:auto;font-size:10px">New</span>`:''}</div><div class="stream-post-body">${a.body.replace(/\n/g,'<br>')}</div></div>`;}).join('')}</div>`;
},

_assignments(cid,isT){
  const u=Auth.user; const now=Date.now(); const asgns=DB.assignments(cid);
  if(isT)return `<div class="section-hdr mb-16"><div class="section-title">Assignments</div><button class="btn btn-primary btn-sm" id="new-asgn-btn" data-cid="${cid}">${I.plus} Create</button></div>${asgns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">📝</div><div class="empty-text">No assignments yet</div></div>`:asgns.map(a=>{const subs=DB.submissions(a.id);const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');const ds=dueStatus(a.dueAt);return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:var(--accent-d);color:var(--accent-l)">${I.assign}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${I.check} ${subs.length}/${stus.length} submitted · ${fDate(a.dueAt)}</div></div><span class="badge ${ds.cls}">${ds.label}</span></div>`;}).join('')}`;
  return `<div class="section-hdr mb-16"><div class="section-title">Assignments</div></div>${asgns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">🎉</div><div class="empty-text">No assignments!</div></div>`:asgns.map(a=>{const sub=DB.submissionBy(a.id,u.id);const ds=dueStatus(a.dueAt);const sb=sub?.grade!=null?`<span class="badge badge-emerald">Graded: ${sub.grade}/100</span>`:sub?`<span class="badge badge-cyan">Submitted</span>`:a.dueAt<now?`<span class="badge badge-rose">Missing</span>`:`<span class="badge badge-muted">Pending</span>`;return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:${sub?'var(--emerald-d)':'var(--accent-d)'};color:${sub?'var(--emerald-l)':'var(--accent-l)'}">${sub?I.check:I.assign}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${fDate(a.dueAt)}${sub?' · Submitted '+timeAgo(sub.submittedAt):''}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${sb}<span class="badge ${ds.cls}" style="font-size:10px">${ds.label}</span></div></div>`;}).join('')}`;
},

_resources(cid,isT,lbw){
  const res=DB.resources(cid);
  return `<div class="section-hdr mb-16"><div class="section-title">Resources</div><div style="display:flex;gap:8px">${isT?`<button class="btn btn-primary btn-sm" id="upload-res-btn" data-cid="${cid}">${I.upload} Upload</button>`:''}<button class="btn btn-secondary btn-sm" id="search-books-btn">${I.book} Search Books</button></div></div><div id="book-results"></div>${res.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">📁</div><div class="empty-text">No resources yet</div></div>`:res.map(r=>{const up=DB.userById(r.uploadedBy);return `<div class="resource-card"><div class="res-icon" style="background:var(--accent-d)">${fileEmoji(r.fileType||r.fileName||'')}</div><div class="res-info"><div class="res-name">${r.title}</div>${!lbw?`<div class="res-meta">${r.description||''}</div>`:''}<div class="res-meta">${up?.name||'Unknown'} · ${timeAgo(r.createdAt)} · ${fBytes(r.fileSize||0)}</div></div><div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm">${I.dl}${!lbw?' Download':''}</button>${isT?`<button class="btn btn-ghost btn-sm" data-del-res="${r.id}" data-cid="${cid}">${I.trash}</button>`:''}</div></div>`;}).join('')}`;
},

_chat(cid){
  const u=Auth.user; const isT=u.role==='teacher'||u.role==='admin';
  const msgs=DB.messages(cid); const pinned=msgs.filter(m=>m.pinned);
  return `${pinned.length>0?`<div class="pinned-bar">${I.pin} <strong>Pinned:</strong> ${pinned[0].body.slice(0,68)}${pinned[0].body.length>68?'...':''}</div>`:''}<div class="chat-wrap" id="chat-wrap"><div class="chat-msgs" id="chat-msgs">${msgs.length===0?`<div style="text-align:center;padding:40px;color:var(--t4)"><div style="font-size:30px;margin-bottom:8px">💬</div><div>No messages yet!</div></div>`:msgs.map(m=>{const auth=DB.userById(m.authorId);const own=m.authorId===u.id;return `<div class="chat-msg${own?' own':''}${m.pinned?' pinned':''}${m.system?' system':''}">
  ${!own&&!m.system?av(auth,'avatar-sm'):''}<div>${!own&&!m.system?`<div class="chat-sender">${auth?.name||'?'}${m.pinned?' 📌':''}</div>`:''}<div class="chat-bubble">${m.body}</div><div class="chat-time">${timeAgo(m.createdAt)}${isT&&!m.pinned&&!m.system?` <button onclick="pinMsg('${m.id}','${cid}')" style="font-size:10px;color:var(--amber-l);background:none;border:none;cursor:pointer;margin-left:6px">${I.pin} Pin</button>`:''}</div></div></div>`;}).join('')}</div><div class="chat-input-area"><textarea id="chat-input" class="chat-input" rows="1" placeholder="Message ${DB.classById(cid)?.name||'class'}..." data-cid="${cid}"></textarea><button class="chat-send" id="chat-send-btn" data-cid="${cid}" type="button">${I.send}</button></div></div>`;
},

_meet(cid,cls){
  const u=Auth.user;
  const isT=u.role==='teacher'||u.role==='admin';
  const active=DB.activeMeeting(cid);
  return `<div class="glass-card meet-lobby" id="meet-lobby">
    <div style="font-size:52px;margin-bottom:14px;animation:float 3s ease-in-out infinite">🎥</div>
    <div class="meet-title">Class Meeting Room</div>
    <div class="meet-desc">Join a live video call with your class. Works on all devices.</div>
    ${active?`<div class="meet-active"><div class="meet-active-title">🔴 Meeting In Progress</div><div style="font-size:13px;color:var(--t2);margin-bottom:6px">Started by ${DB.userById(active.startedBy)?.name||'Teacher'} · ${timeAgo(active.startedAt)}</div><div style="margin-bottom:14px"><code style="background:var(--glass-2);padding:6px 16px;border-radius:8px;font-size:18px;letter-spacing:3px;color:var(--emerald-l)">${active.roomCode}</code></div><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary btn-lg" id="join-meet-btn" data-code="${active.roomCode}" data-cname="${cls.name}">${I.video} Join Meeting</button><button class="btn btn-secondary" id="copy-meet-btn" data-code="${active.roomCode}">${I.copy} Copy Link</button>${isT?`<button class="btn btn-danger" id="end-meet-btn" data-cid="${cid}">End Meeting</button>`:''}</div></div>`:`
    ${isT?`<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:22px"><button class="btn btn-primary btn-lg" id="start-meet-btn" data-cid="${cid}" data-cname="${cls.name}">${I.video} Start Meeting</button></div>
    <div style="font-size:12px;color:var(--t4);margin-bottom:22px">A meeting code will be generated and shared in the class chat.</div>`:`<div style="font-size:14px;color:var(--t3);margin-bottom:22px">No active meeting. Only teachers can start meetings.</div>`}
    <div style="border-top:1px solid var(--glass-b);padding-top:22px;max-width:360px;margin:0 auto"><div style="font-size:13px;font-weight:600;color:var(--t2);margin-bottom:10px">Join with a code</div><div class="meet-code-box"><input type="text" id="meet-code-input" class="form-input" placeholder="Enter code..." style="text-transform:uppercase;letter-spacing:2px;text-align:center"><button class="btn btn-primary" id="join-code-btn" data-cname="${cls.name}">Join</button></div></div>`}
  </div>
  <div id="jitsi-container" style="display:none"></div>`;
},

_members(cid,isT){
  const members=DB.membersOf(cid); const allStu=DB.users().filter(u=>u.role==='student'&&!DB.isEnrolled(u.id,cid));
  return `<div class="section-hdr mb-16"><div class="section-title">Members</div><div class="section-sub">${members.length} total</div></div>${isT?`<div class="panel mb-20" style="padding:18px 22px"><div style="font-size:14px;font-weight:600;margin-bottom:12px">Add Student</div><div style="display:flex;gap:10px"><select id="add-stu-sel" class="form-select" style="flex:1"><option value="">Select a student...</option>${allStu.map(s=>`<option value="${s.id}">${s.name} (${s.email})</option>`).join('')}</select><button class="btn btn-primary" id="add-stu-btn" data-cid="${cid}">Add</button></div></div>`:''}<div class="stagger">${members.map(m=>`<div class="resource-card">${av(m)}<div class="res-info"><div class="res-name">${m.name}</div><div class="res-meta">${m.email}</div></div><div style="display:flex;align-items:center;gap:8px"><span class="badge ${m.roleInClass==='teacher'?'badge-accent':'badge-cyan'}">${m.roleInClass}</span>${isT&&m.roleInClass==='student'?`<button class="btn btn-ghost btn-sm" data-remove-stu="${m.id}" data-cid="${cid}">${I.trash}</button>`:''}</div></div>`).join('')}</div>`;
},

assignment(aid){
  const u=Auth.user; const a=DB.assignmentById(aid);
  if(!a)return`<div style="padding:60px;text-align:center;color:var(--t4)">Assignment not found.</div>`;
  const cls=DB.classById(a.classId); const isT=u.role==='teacher'&&cls?.createdBy===u.id; const ds=dueStatus(a.dueAt);
  if(isT){
    const subs=DB.submissions(aid); const stus=DB.membersOf(a.classId).filter(m=>m.roleInClass==='student');
    return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar(a.title,'class:'+a.classId+':assignments')}<div class="page"><div class="panel mb-24"><div class="asgn-dh"><div class="asgn-icon" style="background:var(--accent-d);color:var(--accent-l);width:52px;height:52px;border-radius:16px">${I.assign}</div><div style="flex:1"><h2 style="font-size:22px;font-weight:800;margin-bottom:7px">${a.title}</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge ${ds.cls}">${ds.label}</span><span class="badge badge-muted">${cls?.name}</span><span class="badge badge-muted">${subs.length}/${stus.length} submitted</span></div></div></div><div style="font-size:11.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Instructions</div><div style="color:var(--t2);line-height:1.8;white-space:pre-wrap;font-size:13.5px">${a.instructions}</div></div><div class="section-hdr mb-16"><div class="section-title">Submissions</div></div><div class="stagger">${stus.length===0?`<div class="glass-card empty-state" style="padding:40px"><div class="empty-text">No students enrolled</div></div>`:stus.map(s=>{const sub=subs.find(x=>x.studentId===s.id);return `<div class="panel mb-14" style="padding:18px 22px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:${sub?'16px':'0'}">${av(s)}<div style="flex:1"><div style="font-weight:600">${s.name}</div><div style="font-size:12px;color:var(--t4)">${s.email}</div></div>${sub?`<span class="badge ${sub.grade!=null?'badge-emerald':'badge-cyan'}">${sub.grade!=null?'Graded: '+sub.grade+'/100':'Submitted'}</span><span style="font-size:12px;color:var(--t4)">${timeAgo(sub.submittedAt)}</span>`:`<span class="badge badge-rose">Not Submitted</span>`}</div>${sub?`<div style="background:var(--glass-1);border:1px solid var(--glass-b);border-radius:var(--r-m);padding:13px;margin-bottom:14px"><div style="font-size:11.5px;color:var(--t4);margin-bottom:5px">Student answer:</div><div style="font-size:13.5px;color:var(--t2);white-space:pre-wrap">${sub.textBody||''}</div>${sub.fileName?`<div style="margin-top:7px;font-size:12px;color:var(--cyan-l)">${I.file} ${sub.fileName}</div>`:''}</div><form class="grade-form" data-sid="${sub.id}"><div class="two-col"><div><label class="form-label">Grade (0-100)</label><input type="number" min="0" max="100" class="form-input g-grade" value="${sub.grade??''}" placeholder="85"></div><div><label class="form-label">Feedback</label><input type="text" class="form-input g-fb" value="${sub.feedback||''}" placeholder="Feedback..."></div></div><div style="display:flex;justify-content:flex-end;margin-top:9px"><button type="submit" class="btn btn-success btn-sm">Save Grade</button></div></form>`:''}</div>`;}).join('')}</div></div></div></div>`;
  }
  // Student view
  const sub=DB.submissionBy(aid,u.id); const overdue=a.dueAt<Date.now(); const draft=DB.getDraft(aid);
  return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar(a.title,'class:'+a.classId+':assignments')}<div class="page"><div class="panel mb-22"><div class="asgn-dh"><div class="asgn-icon" style="background:var(--accent-d);color:var(--accent-l);width:52px;height:52px;border-radius:16px">${I.assign}</div><div style="flex:1"><h2 style="font-size:22px;font-weight:800;margin-bottom:7px">${a.title}</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge ${ds.cls}">${ds.label}</span><span class="badge badge-muted">${cls?.name}</span></div></div></div><div style="font-size:11.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Instructions</div><div style="color:var(--t2);line-height:1.8;white-space:pre-wrap;font-size:13.5px">${a.instructions}</div></div>${sub?.grade!=null?`<div class="grade-display mb-22"><div><div class="grade-num">${sub.grade}</div><div style="font-size:13px;color:var(--t4)">/100</div></div><div><div style="font-size:15px;font-weight:700;color:var(--emerald-l);margin-bottom:4px">Assignment Graded!</div>${sub.feedback?`<div style="font-size:13.5px;color:var(--t2)">Feedback: ${sub.feedback}</div>`:''}</div></div>`:''}<div class="panel"><div style="font-size:17px;font-weight:700;margin-bottom:18px">${sub?overdue?'Your Submission':'Edit Submission':'Submit Assignment'}</div>${overdue&&!sub?`<div style="background:var(--rose-d);border:1px solid rgba(244,63,94,.3);border-radius:var(--r-m);padding:13px;margin-bottom:18px;font-size:13.5px;color:var(--rose-l)">⚠️ Past due. Submissions are closed.</div>`:''}${!overdue||sub?`<form id="sub-form" data-aid="${aid}">${draft&&!sub?`<div class="draft-ind">${I.clock} Draft restored</div>`:''}<div class="form-group"><label class="form-label">Your Answer</label><textarea id="sub-text" class="form-input" rows="7" placeholder="Write your answer..."${sub?' readonly':''}>${sub?sub.textBody||'':draft||''}</textarea></div>${!sub?`<div class="form-group"><label class="form-label">Attach File <span style="color:var(--t4);font-weight:400">(optional, max 5 MB)</span></label><div class="file-drop" id="fdrop"><div style="font-size:28px;margin-bottom:7px">☁️</div><div style="font-size:13.5px;color:var(--t3)">Drag & drop or <span style="color:var(--accent-l);cursor:pointer;font-weight:600" id="browse-trigger">browse</span></div><input type="file" id="f-input" style="display:none" accept="*/*"></div><div id="file-preview-area"></div></div><button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:4px">Submit Assignment</button>`:`<div style="padding:13px;background:var(--emerald-d);border:1px solid rgba(16,185,129,.22);border-radius:var(--r-m);margin-top:11px;font-size:13.5px;color:var(--emerald-l)">✅ Submitted ${timeAgo(sub.submittedAt)}${sub.fileName?' · '+sub.fileName:''}</div>`}</form>`:''}</div></div></div></div>`;
},

progress(){
  const u=Auth.user; const classes=DB.classesForUser(u.id); const now=Date.now();
  let total=0,submitted=0,graded=0,missing=0; const allWork=[];
  classes.forEach(c=>{DB.assignments(c.id).forEach(a=>{total++;const sub=DB.submissionBy(a.id,u.id);if(sub){submitted++;if(sub.grade!=null)graded++;}else if(a.dueAt<now)missing++;allWork.push({...a,className:c.name,sub});});});
  allWork.sort((a,b)=>a.dueAt-b.dueAt);
  const pct=total>0?Math.round(submitted/total*100):0;
  return `<div class="app-layout">${sidebar('progress')}<div class="main-content">${topbar('My Progress')}<div class="page"><div id="num-fact" class="api-widget mb-18"><div class="skeleton" style="height:28px"></div></div><div class="three-col mb-24 stagger"><div class="progress-stat glass-card"><div class="stat-icon" style="background:var(--accent-d)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-l)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><div class="stat-num" style="color:var(--accent-l)">${total}</div><div class="stat-label">Total</div></div></div><div class="progress-stat glass-card"><div class="stat-icon" style="background:var(--emerald-d)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-l)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div><div class="stat-num" style="color:var(--emerald-l)">${submitted}</div><div class="stat-label">Submitted</div></div></div><div class="progress-stat glass-card"><div class="stat-icon" style="background:var(--rose-d)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rose-l)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div><div class="stat-num" style="color:var(--rose-l)">${missing}</div><div class="stat-label">Missing</div></div></div></div><div class="panel mb-24"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:11px"><div style="font-size:15px;font-weight:700">Completion</div><div style="font-size:24px;font-weight:900;color:var(--accent-l)">${pct}%</div></div><div class="prog-bar-wrap"><div class="prog-bar" style="width:${pct}%"></div></div><div style="font-size:12px;color:var(--t4);margin-top:7px">${submitted} of ${total} submitted · ${graded} graded</div></div><div class="section-hdr mb-16"><div class="section-title">All Assignments</div></div>${allWork.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-text">No assignments</div></div>`:allWork.map(a=>{const ds=dueStatus(a.dueAt);const sb=a.sub?.grade!=null?`<span class="badge badge-emerald">Graded: ${a.sub.grade}/100</span>`:a.sub?`<span class="badge badge-cyan">Submitted</span>`:a.dueAt<now?`<span class="badge badge-rose">Missing</span>`:`<span class="badge badge-muted">Pending</span>`;return `<div class="assignment-card" data-nav="assignment" data-aid="${a.id}"><div class="asgn-icon" style="background:var(--accent-d);color:var(--accent-l)">${I.assign}</div><div class="asgn-info"><div class="asgn-title">${a.title}</div><div class="asgn-meta">${a.className} · ${fDate(a.dueAt)}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${sb}<span class="badge ${ds.cls}" style="font-size:10px">${ds.label}</span></div></div>`;}).join('')}</div></div></div>`;
},

gradebook(cid,inline=false){
  const cls=DB.classById(cid); const asgns=DB.assignments(cid); const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');
  const inner=`<div class="section-hdr mb-16"><div class="section-title">Gradebook${inline?' — '+(cls?.name||''):''}</div><div class="section-sub">${stus.length} students · ${asgns.length} assignments</div></div>${stus.length===0||asgns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">📊</div><div class="empty-text">No data yet</div></div>`:`<div class="table-wrap glass-card"><table class="g-table"><thead><tr><th style="min-width:150px">Student</th>${asgns.map(a=>`<th style="min-width:110px">${a.title.slice(0,18)}${a.title.length>18?'…':''}</th>`).join('')}<th>Avg</th></tr></thead><tbody>${stus.map(s=>{const grades=asgns.map(a=>{const sub=DB.submissionBy(a.id,s.id);return sub?(sub.grade!=null?sub.grade:'sub'):'miss';});const nums=grades.filter(g=>typeof g==='number');const avg=nums.length>0?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):null;return `<tr><td><div style="display:flex;align-items:center;gap:8px">${av(s,'avatar-sm')}<span style="font-weight:600;font-size:13px">${s.name}</span></div></td>${grades.map((g,i)=>`<td><span class="grade-cell ${g==='miss'?'missing':g==='sub'?'submitted':'graded'}" data-nav="assignment" data-aid="${asgns[i].id}" style="cursor:pointer">${g==='miss'?'—':g==='sub'?'✓':g}</span></td>`).join('')}<td><span class="grade-cell ${avg!=null?(avg>=75?'graded':'submitted'):'na'}">${avg!=null?avg+'%':'N/A'}</span></td></tr>`;}).join('')}</tbody></table></div>`}`;
  if(inline)return inner;
  return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar('Gradebook — '+(cls?.name||''),'class:'+cid+':assignments')}<div class="page">${inner}</div></div></div>`;
},

admin(){
  const users=DB.users(); const classes=DB.classes();
  const subs=DB.get('submissions',[]); const recentSubs=subs.filter(s=>s.submittedAt>Date.now()-7*86400000).length;
  const ungradedCount=subs.filter(s=>s.grade===null).length;
  const acts=DB.activities().slice(0,10);
  return `<div class="app-layout">${sidebar('admin')}<div class="main-content">${topbar('Admin Dashboard')}<div class="page">
  <div class="admin-stat-grid stagger">
    <div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--accent-l)">${users.length}</div><div class="admin-stat-label">Total Users</div></div>
    <div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--cyan-l)">${classes.length}</div><div class="admin-stat-label">Classes</div></div>
    <div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--emerald-l)">${recentSubs}</div><div class="admin-stat-label">Submissions (7d)</div></div>
    <div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--amber-l)">${users.filter(u=>u.role==='student').length}</div><div class="admin-stat-label">Students</div></div>
    <div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--rose-l)">${ungradedCount}</div><div class="admin-stat-label">Ungraded</div></div>
    <div class="admin-stat glass-card"><div class="admin-stat-num" style="color:var(--accent-l)">${users.filter(u=>u.role==='teacher').length}</div><div class="admin-stat-label">Teachers</div></div>
  </div>
  <div id="weather-widget" class="api-widget mb-18"><div class="skeleton" style="height:50px"></div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="mb-24">
    <div class="panel"><div style="font-size:15px;font-weight:700;margin-bottom:16px">📊 Submissions Chart</div><canvas id="admin-chart" height="200"></canvas></div>
    <div class="panel"><div style="font-size:15px;font-weight:700;margin-bottom:16px">📋 Activity Log</div><div style="max-height:260px;overflow-y:auto">${acts.length===0?`<div style="color:var(--t4);font-size:13px;padding:20px;text-align:center">No activity yet</div>`:acts.map(a=>`<div class="activity-item"><div class="activity-dot" style="background:${a.type==='grade'?'var(--emerald)':a.type==='submission'?'var(--cyan)':a.type==='class_create'?'var(--accent)':'var(--amber)'}"></div><div class="activity-text">${a.text}</div><div class="activity-time">${timeAgo(a.ts)}</div></div>`).join('')}</div></div>
  </div>
  <div class="panel mb-24"><div style="font-size:17px;font-weight:700;margin-bottom:18px">Create New Class</div><form id="admin-cls-form"><div class="two-col"><div class="form-group"><label class="form-label">Class Name</label><input id="ac-name" class="form-input" placeholder="e.g. Operating Systems"></div><div class="form-group"><label class="form-label">Subject</label><input id="ac-subj" class="form-input" placeholder="e.g. Computer Science"></div></div><div class="two-col"><div class="form-group"><label class="form-label">Class Code</label><input id="ac-code" class="form-input" value="CC-${Math.random().toString(36).slice(2,6).toUpperCase()}"></div><div class="form-group"><label class="form-label">Assign Teacher</label><select id="ac-teacher" class="form-select"><option value="">Select teacher...</option>${users.filter(u=>u.role==='teacher').map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div></div><div style="display:flex;justify-content:flex-end"><button type="submit" class="btn btn-primary">Create Class</button></div></form></div>
  <div class="section-hdr mb-16"><div class="section-title">User Management</div></div>
  <div class="table-wrap glass-card mb-24"><table class="g-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${users.map(u=>`<tr><td><div style="display:flex;align-items:center;gap:8px">${av(u,'avatar-sm')}<span style="font-weight:600;font-size:13px">${u.name}</span></div></td><td style="font-size:13px;color:var(--t3)">${u.email}</td><td><span class="badge ${u.role==='admin'?'badge-rose':u.role==='teacher'?'badge-accent':'badge-cyan'}">${u.role}</span></td><td><span class="badge ${u.active!==false?'badge-emerald':'badge-rose'}">${u.active!==false?'Active':'Inactive'}</span></td><td style="font-size:12px;color:var(--t4)">${timeAgo(u.createdAt)}</td><td><div style="display:flex;gap:4px">${u.role==='student'?`<button class="btn btn-ghost btn-sm" data-promote="${u.id}" title="Promote to teacher">⬆️</button>`:u.role==='teacher'?`<button class="btn btn-ghost btn-sm" data-demote="${u.id}" title="Demote to student">⬇️</button>`:''}${u.role!=='admin'?`<button class="btn btn-ghost btn-sm" data-toggle-active="${u.id}" title="${u.active!==false?'Deactivate':'Activate'}">${u.active!==false?'🚫':'✅'}</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>
  <div class="section-hdr mb-16"><div class="section-title">All Classes</div></div>
  <div class="table-wrap glass-card"><table class="g-table"><thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th>Members</th><th>Code</th></tr></thead><tbody>${classes.map(c=>{const t=DB.userById(c.createdBy);const m=DB.membersOf(c.id);return `<tr><td style="font-weight:600;font-size:13px">${c.name}</td><td style="font-size:13px;color:var(--t3)">${c.subject}</td><td style="font-size:13px">${t?.name||'—'}</td><td><span class="badge badge-muted">${m.length}</span></td><td><code style="background:var(--glass-2);padding:2px 8px;border-radius:4px;font-size:11px">${c.code}</code></td></tr>`;}).join('')}</tbody></table></div></div></div></div>`;
},

notifs(){
  const u=Auth.user; const ns=DB.notifs(u.id); DB.markAllRead(u.id);
  return `<div class="app-layout">${sidebar('notifs')}<div class="main-content">${topbar('Notifications')}<div class="page">${ns.length===0?`<div class="glass-card empty-state" style="padding:60px"><div class="empty-icon">🔔</div><div class="empty-text">All caught up!</div></div>`:`<div class="panel stagger" style="padding:0;overflow:hidden">${ns.map(n=>`<div class="notif-item${!n.readAt?' unread':''}">${!n.readAt?`<div class="notif-dot2"></div>`:`<div style="width:8px;flex-shrink:0"></div>`}<div style="flex:1"><div class="notif-text">${n.message}</div><div class="notif-time">${timeAgo(n.createdAt)}</div></div></div>`).join('')}</div>`}</div></div></div>`;
},

profile(){
  const u=Auth.user;
  return `<div class="app-layout">${sidebar()}<div class="main-content">${topbar('My Profile')}<div class="page" style="max-width:560px"><div class="panel mb-18"><div style="display:flex;align-items:center;gap:20px;margin-bottom:22px"><div class="avatar avatar-lg" style="background:${avColor(u.id)};box-shadow:0 0 20px rgba(232,112,42,.3)">${initials(u.name)}</div><div><div style="font-size:22px;font-weight:800">${u.name}</div><div style="color:var(--t4);font-size:13.5px">${u.email}</div><span class="badge ${u.role==='admin'?'badge-rose':u.role==='teacher'?'badge-accent':'badge-cyan'}" style="margin-top:7px">${u.role}</span></div></div><div style="border-top:1px solid var(--glass-b);padding-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><div class="form-label">Member Since</div><div style="font-size:13.5px;color:var(--t2)">${new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div></div><div><div class="form-label">Classes</div><div style="font-size:13.5px;color:var(--t2)">${DB.classesForUser(u.id).length}</div></div></div></div><button class="btn btn-danger" id="logout-btn">${I.logout} Sign Out</button></div></div></div>`;
},

};

// ── SPOTLIGHT & 3D PARALLAX ───────────────────────────────────────
function initSpotlight(){
  const reveal=document.getElementById('reveal-layer');
  const bg=document.querySelector('.hero-bg');
  const heading=document.querySelector('.hero-heading');
  if(!reveal)return;
  
  // Start spotlight right in the center so user sees glowing lava immediately
  const initialX = window.innerWidth / 2;
  const initialY = window.innerHeight / 2;
  const mouse={x: initialX, y: initialY};
  const smooth={x: initialX, y: initialY};
  let rafId=null;

  function applyMask(x, y){
    const maskVal = `radial-gradient(circle ${SPOTLIGHT_R}px at ${x}px ${y}px, black 0%, black 40%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.12) 88%, transparent 100%)`;
    reveal.style.webkitMaskImage = maskVal;
    reveal.style.maskImage = maskVal;
    reveal.style.webkitMaskSize = '100% 100%';
    reveal.style.maskSize = '100% 100%';
  }
  applyMask(initialX, initialY);

  function onMove(e){
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    mouse.x=cx;
    mouse.y=cy;
  }
  window.addEventListener('mousemove',onMove);
  window.addEventListener('touchmove',onMove,{passive:true});

  function loop(){
    smooth.x+=(mouse.x-smooth.x)*0.12;
    smooth.y+=(mouse.y-smooth.y)*0.12;
    
    // 1. Hardware accelerated cursor spotlight reveal
    applyMask(smooth.x, smooth.y);

    // 2. 3D Parallax Tilt Effect on hero layers
    const normX = (smooth.x - window.innerWidth / 2) / (window.innerWidth / 2 || 1);
    const normY = (smooth.y - window.innerHeight / 2) / (window.innerHeight / 2 || 1);
    
    const rotX = normY * -4;
    const rotY = normX * 4;
    const transX = normX * -12;
    const transY = normY * -12;

    if(bg) bg.style.transform = `scale(1.06) translate3d(${transX}px, ${transY}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    if(reveal) reveal.style.transform = `scale(1.06) translate3d(${transX}px, ${transY}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    if(heading) heading.style.transform = `translate3d(${normX * 10}px, ${normY * 10}px, 30px)`;

    rafId=requestAnimationFrame(loop);
  }
  loop();

  window._spotlightCleanup=()=>{
    window.removeEventListener('mousemove',onMove);
    window.removeEventListener('touchmove',onMove);
    if(rafId)cancelAnimationFrame(rafId);
  };
}

// ── 3D TILT ON CARDS ──────────────────────────────────────────────
function init3DTilt(){
  document.querySelectorAll('.class-card, .progress-stat, .admin-stat, .assignment-card').forEach(card=>{
    card.classList.add('tilt-card');
    card.onmousemove = e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rX = -(y / (rect.height / 2)) * 7;
      const rY = (x / (rect.width / 2)) * 7;
      card.style.transform = `perspective(800px) rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.02, 1.02, 1.02)`;
    };
    card.onmouseleave = () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    };
  });
}

// ── HERO MODAL HELPERS ───────────────────────────────────────────
window.openHeroModal = function(type){
  const overlay=document.getElementById('auth-overlay');
  if(!overlay)return;
  overlay.innerHTML=Pages.heroModal(type);
  overlay.classList.remove('hidden');
  bindHeroModalTabs();
};

window.closeHeroModal = function(){
  const overlay=document.getElementById('auth-overlay');
  if(overlay){
    overlay.classList.add('hidden');
    overlay.innerHTML='';
  }
};

window.openLoginFromModal = function(){
  const overlay=document.getElementById('auth-overlay');
  if(!overlay)return;
  overlay.innerHTML=Pages.login();
  bindAuthForm();
};

window.openRegisterFromModal = function(){
  const overlay=document.getElementById('auth-overlay');
  if(!overlay)return;
  overlay.innerHTML=Pages.register();
  bindAuthForm();
};

function bindHeroModalTabs(){
  document.querySelectorAll('[data-hero-modal-tab]').forEach(tabBtn=>{
    tabBtn.addEventListener('click',()=>{
      const t = tabBtn.dataset.heroModalTab;
      openHeroModal(t);
      // Sync navbar pill
      document.querySelectorAll('#hero-nav-pill button').forEach(b=>{
        b.classList.toggle('active', b.dataset.heroTab === t);
      });
    });
  });
}

// ── HERO BINDINGS ────────────────────────────────────────────────
function bindHero(){
  const overlay=document.getElementById('auth-overlay');
  
  // Sign In / Sign Up buttons
  document.getElementById('hero-signin-btn')?.addEventListener('click',()=>{
    overlay.innerHTML=Pages.login();
    overlay.classList.remove('hidden');
    bindAuthForm();
  });
  document.getElementById('hero-signup-btn')?.addEventListener('click',()=>{
    overlay.innerHTML=Pages.register();
    overlay.classList.remove('hidden');
    bindAuthForm();
  });
  document.getElementById('hero-logo-btn')?.addEventListener('click',()=>{
    openHeroModal('about');
  });

  // Hero navbar pill buttons (About, Features, Classes, SDG Goals, Contact)
  document.querySelectorAll('#hero-nav-pill button').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      const tab = btn.dataset.heroTab || 'about';
      document.querySelectorAll('#hero-nav-pill button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      openHeroModal(tab);
    });
  });

  // Mobile menu button
  document.getElementById('mob-menu-hero')?.addEventListener('click',()=>{
    openHeroModal('about');
  });

  // Close overlay on background click
  overlay?.addEventListener('click',e=>{
    if(e.target===overlay){
      overlay.classList.add('hidden');
      overlay.innerHTML='';
    }
  });
}

function bindAuthForm(){
  const overlay=document.getElementById('auth-overlay');
  const lf=document.getElementById('login-form');
  if(lf){
    lf.addEventListener('submit',e=>{
      e.preventDefault();
      const em=document.getElementById('l-email').value;
      const pw=document.getElementById('l-pass').value;
      const err=document.getElementById('l-err');
      const r=Auth.login(em,pw);
      if(r.ok){overlay.classList.add('hidden');overlay.innerHTML='';if(window._spotlightCleanup)window._spotlightCleanup();Router.go('dashboard');}
      else{err.textContent=r.err;err.classList.add('show');}
    });
    document.querySelectorAll('.test-acc').forEach(el=>{
      el.addEventListener('click',()=>{
        document.getElementById('l-email').value=el.dataset.e;
        document.getElementById('l-pass').value=el.dataset.p;
        lf.dispatchEvent(new Event('submit'));
      });
    });
    document.getElementById('go-reg')?.addEventListener('click',e=>{
      e.preventDefault();
      overlay.innerHTML=Pages.register();
      bindAuthForm();
    });
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
      if(r.ok){overlay.classList.add('hidden');overlay.innerHTML='';if(window._spotlightCleanup)window._spotlightCleanup();toast('Welcome, '+n.split(' ')[0]+'! 🎉','success');Router.go('dashboard');}
      else{err.textContent=r.err;err.classList.add('show');}
    });
    document.getElementById('go-login')?.addEventListener('click',e=>{
      e.preventDefault();
      overlay.innerHTML=Pages.login();
      bindAuthForm();
    });
  }
}

// ── GLOBAL BINDINGS ──────────────────────────────────────────────
function bindGlobal(){
  if(!Auth.ok)return;
  // Navigation
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click',()=>{
      const nav=el.dataset.nav;
      if(nav==='class')Router.go('class',{cid:el.dataset.cid,tab:'stream'});
      else if(nav==='assignment')Router.go('assignment',{aid:el.dataset.aid});
      else Router.go(nav);
    });
  });
  document.querySelectorAll('[data-aid]').forEach(el=>{
    if(!el.hasAttribute('data-nav'))
      el.addEventListener('click',()=>Router.go('assignment',{aid:el.dataset.aid}));
  });
  document.getElementById('back-btn')?.addEventListener('click',e=>{
    const t=e.currentTarget.dataset.target;
    if(t?.startsWith('class:')){const[,cid,tab]=t.split(':');Router.go('class',{cid,tab});}
    else Router.go(t||'dashboard');
  });
  document.querySelectorAll('#logout-btn').forEach(b=>b.addEventListener('click',()=>{Auth.logout();toast('Signed out','info');Router.go('login');}));
  document.getElementById('lowbw-btn')?.addEventListener('click',toggleLowBw);
  document.getElementById('notif-bell')?.addEventListener('click',()=>Router.go('notifs'));
  
  // Sidebar toggle with responsive behavior (desktop collapse + mobile drawer with backdrop)
  const sidebarEl = document.getElementById('sidebar');
  const appLayout = document.querySelector('.app-layout');
  let backdrop = document.getElementById('sidebar-backdrop');
  if(!backdrop){
    backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  document.getElementById('mob-menu')?.addEventListener('click', e => {
    e.stopPropagation();
    if(window.innerWidth <= 768){
      const isOpen = sidebarEl?.classList.toggle('open');
      backdrop.classList.toggle('active', !!isOpen);
    } else {
      appLayout?.classList.toggle('sidebar-collapsed');
    }
  });

  backdrop.addEventListener('click', () => {
    sidebarEl?.classList.remove('open');
    backdrop.classList.remove('active');
  });

  sidebarEl?.querySelectorAll('[data-nav], .user-card').forEach(el => {
    el.addEventListener('click', () => {
      if(window.innerWidth <= 768){
        sidebarEl?.classList.remove('open');
        backdrop?.classList.remove('active');
      }
    });
  });

  document.getElementById('sb-new-class')?.addEventListener('click',e=>{e.stopPropagation();modalNewClass();});
  document.getElementById('sb-join-class')?.addEventListener('click',e=>{e.stopPropagation();modalJoinClass();});
  // Theme toggles
  document.querySelectorAll('[data-theme-set]').forEach(btn=>{
    btn.addEventListener('click',()=>{Theme.set(btn.dataset.themeSet);Router._render();});
  });
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
    DB.addActivity({type:'announcement',text:Auth.user.name+' posted in '+DB.classById(cid)?.name,userId:Auth.id});
    toast('Announcement posted!','success');
    Router.go('class',{cid,tab:'stream'});
  });
  // Create assignment
  document.getElementById('new-asgn-btn')?.addEventListener('click',e=>modalNewAssignment(e.currentTarget.dataset.cid));
  // Upload resource
  document.getElementById('upload-res-btn')?.addEventListener('click',e=>modalUploadResource(e.currentTarget.dataset.cid));
  // Search books (API)
  document.getElementById('search-books-btn')?.addEventListener('click',modalSearchBooks);
  // Delete resource
  document.querySelectorAll('[data-del-res]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this resource?'))return;
    DB.deleteResource(b.dataset.delRes);
    toast('Resource deleted','info');
    Router.go('class',{cid:b.dataset.cid,tab:'resources'});
  }));
  // Add student
  document.getElementById('add-stu-btn')?.addEventListener('click',e=>{
    const cid=e.currentTarget.dataset.cid;
    const sid=document.getElementById('add-stu-sel')?.value;
    if(!sid)return toast('Select a student.','error');
    DB.enroll({userId:sid,classId:cid,role:'student'});
    DB.addActivity({type:'enrollment',text:DB.userById(sid)?.name+' added to '+DB.classById(cid)?.name,userId:Auth.id});
    toast('Student added!','success');
    Router.go('class',{cid,tab:'members'});
  });
  // Remove student
  document.querySelectorAll('[data-remove-stu]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Remove this student?'))return;
    DB.unenroll(b.dataset.removeStu,b.dataset.cid);
    toast('Student removed','info');
    Router.go('class',{cid:b.dataset.cid,tab:'members'});
  }));
  // ── FIXED FILE UPLOAD ──────────────────────────────────────────
  const sf=document.getElementById('sub-form');
  if(sf){
    const ta=document.getElementById('sub-text');
    ta?.addEventListener('input',()=>DB.saveDraft(sf.dataset.aid,ta.value));
    const fi=document.getElementById('f-input');
    const fd=document.getElementById('fdrop');
    const browse=document.getElementById('browse-trigger');
    window._selectedFile=null;

    // Browse click — only on the text trigger, not the whole div (to avoid double dialog)
    browse?.addEventListener('click',e=>{e.stopPropagation();fi?.click();});
    // Drop zone click (on the zone itself, but not on child triggers)
    fd?.addEventListener('click',e=>{if(e.target===fd||e.target.closest('#fdrop')&&!e.target.closest('#browse-trigger')&&!e.target.closest('#file-preview-area'))fi?.click();});

    // File input change
    fi?.addEventListener('change',()=>{
      const f=fi.files?.[0];
      if(!f)return;
      if(f.size>MAX_FILE){toast('File too large. Max 5 MB.','error');fi.value='';return;}
      window._selectedFile=f;
      showFilePreview(f);
    });

    // Drag and drop
    fd?.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();fd.classList.add('dragover');});
    fd?.addEventListener('dragleave',e=>{e.preventDefault();fd.classList.remove('dragover');});
    fd?.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();
      fd.classList.remove('dragover');
      const f=e.dataTransfer?.files?.[0];
      if(!f)return;
      if(f.size>MAX_FILE){toast('File too large. Max 5 MB.','error');return;}
      window._selectedFile=f;
      // Try to set input files via DataTransfer API
      try{const dt=new DataTransfer();dt.items.add(f);fi.files=dt.files;}catch(err){}
      showFilePreview(f);
    });

    // Submit
    sf.addEventListener('submit',e=>{
      e.preventDefault();
      const aid=sf.dataset.aid; const a=DB.assignmentById(aid);
      if(a.dueAt<Date.now())return toast('Assignment is past due.','error');
      const text=document.getElementById('sub-text').value.trim();
      const file=window._selectedFile||fi?.files?.[0];
      if(!text&&!file)return toast('Write an answer or attach a file.','error');
      // Store file data as base64 in localStorage for persistence
      const saveIt=(fileData)=>{
        DB.saveSubmission({id:uid(),assignmentId:aid,studentId:Auth.id,textBody:text,fileName:file?.name||null,fileData:fileData,submittedAt:Date.now(),grade:null,feedback:null});
        DB.clearDraft(aid);
        window._selectedFile=null;
        const cls=DB.classById(a.classId);
        notify([cls?.createdBy],'submission','📬 '+Auth.user.name+' submitted "'+a.title+'"',{assignmentId:aid});
        DB.addActivity({type:'submission',text:Auth.user.name+' submitted "'+a.title+'"',userId:Auth.id});
        toast('Assignment submitted! ✅','success');
        Router.go('assignment',{aid});
      };
      if(file){
        const reader=new FileReader();
        reader.onload=()=>saveIt(reader.result);
        reader.onerror=()=>saveIt(null);
        reader.readAsDataURL(file);
      } else {
        saveIt(null);
      }
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
        DB.addActivity({type:'grade',text:Auth.user.name+' graded '+DB.userById(sub.studentId)?.name+': '+grade+'/100',userId:Auth.id});
        toast('Grade saved!','success');
        Router.go('assignment',{aid:sub.assignmentId});
      }
    });
  });

  // Chat
  document.getElementById('chat-send-btn')?.addEventListener('click',sendChat);
  document.getElementById('chat-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}});
  // Dict lookup
  document.getElementById('dict-btn')?.addEventListener('click',dictLookup);
  document.getElementById('dict-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')dictLookup();});

  // ── MEET ──────────────────────────────────────────────────────
  document.getElementById('start-meet-btn')?.addEventListener('click',e=>{
    const cid=e.currentTarget.dataset.cid;
    const cname=e.currentTarget.dataset.cname;
    const meeting=DB.startMeeting(cid,Auth.id);
    // Post system message in chat
    DB.addMessage({id:uid(),classId:cid,authorId:Auth.id,body:'📡 <strong>Live Meeting Started</strong> — Code: <code style="background:var(--glass-2);padding:2px 8px;border-radius:4px;letter-spacing:2px">'+meeting.roomCode+'</code> · <span style="cursor:pointer;color:var(--accent-l);text-decoration:underline" onclick="Router.go(\'class\',{cid:\''+cid+'\',tab:\'meet\'})">Join Meeting</span>',pinned:false,createdAt:Date.now(),system:true});
    // Notify all class students
    const stus=DB.membersOf(cid).filter(m=>m.roleInClass==='student');
    notify(stus.map(m=>m.id),'meeting','🎥 Live meeting started in '+cname+' — Code: '+meeting.roomCode,{classId:cid});
    DB.addActivity({type:'meeting',text:Auth.user.name+' started a meeting in '+cname,userId:Auth.id});
    toast('Meeting started! Code: '+meeting.roomCode,'success');
    Router.go('class',{cid,tab:'meet'});
  });
  document.getElementById('end-meet-btn')?.addEventListener('click',e=>{
    const cid=e.currentTarget.dataset.cid;
    DB.endMeeting(cid);
    DB.addMessage({id:uid(),classId:cid,authorId:Auth.id,body:'🔴 <strong>Meeting Ended</strong> by '+Auth.user.name,pinned:false,createdAt:Date.now(),system:true});
    if(window._jitsi){try{window._jitsi.dispose();}catch(err){}window._jitsi=null;}
    toast('Meeting ended.','info');
    Router.go('class',{cid,tab:'meet'});
  });
  document.getElementById('join-meet-btn')?.addEventListener('click',e=>{
    launchJitsi(e.currentTarget.dataset.code,e.currentTarget.dataset.cname);
  });
  document.getElementById('join-code-btn')?.addEventListener('click',e=>{
    const code=document.getElementById('meet-code-input')?.value.trim().toUpperCase();
    if(!code||code.length<4)return toast('Enter a valid meeting code.','error');
    launchJitsi(code,e.currentTarget.dataset.cname);
  });
  document.getElementById('copy-meet-btn')?.addEventListener('click',e=>{
    const code=e.currentTarget.dataset.code;
    navigator.clipboard.writeText('https://meet.jit.si/campusconnect-'+code).then(()=>toast('Meeting link copied!','success'));
  });

  // Admin actions
  document.getElementById('admin-cls-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('ac-name').value.trim();
    const subj=document.getElementById('ac-subj').value.trim();
    const code=document.getElementById('ac-code').value.trim();
    const tid=document.getElementById('ac-teacher').value;
    if(!name||!subj||!code||!tid)return toast('Fill all fields.','error');
    const c={id:uid(),name,subject:subj,code,createdBy:tid,semester:3,createdAt:Date.now()};
    DB.saveClass(c);DB.enroll({userId:tid,classId:c.id,role:'teacher'});
    DB.addActivity({type:'class_create',text:'Class "'+name+'" created (admin)',userId:Auth.id});
    toast('Class "'+name+'" created!','success');Router.go('admin');
  });
  // Promote/Demote
  document.querySelectorAll('[data-promote]').forEach(b=>b.addEventListener('click',()=>{
    const u=DB.userById(b.dataset.promote);
    if(u){u.role='teacher';DB.saveUser(u);DB.addActivity({type:'role_change',text:u.name+' promoted to teacher',userId:Auth.id});toast(u.name+' is now a teacher!','success');Router.go('admin');}
  }));
  document.querySelectorAll('[data-demote]').forEach(b=>b.addEventListener('click',()=>{
    const u=DB.userById(b.dataset.demote);
    if(u){u.role='student';DB.saveUser(u);DB.addActivity({type:'role_change',text:u.name+' demoted to student',userId:Auth.id});toast(u.name+' is now a student.','info');Router.go('admin');}
  }));
  // Toggle active
  document.querySelectorAll('[data-toggle-active]').forEach(b=>b.addEventListener('click',()=>{
    const u=DB.userById(b.dataset.toggleActive);
    if(u){u.active=u.active===false?true:false;DB.saveUser(u);DB.addActivity({type:'user_status',text:u.name+(u.active?' activated':' deactivated'),userId:Auth.id});toast(u.name+(u.active?' activated':' deactivated'),'info');Router.go('admin');}
  }));

  // Modal close on overlay
  document.getElementById('modal-overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
  // Scroll chat
  const cm=document.getElementById('chat-msgs');
  if(cm)cm.scrollTop=cm.scrollHeight;

  // Load API data
  loadQuote();loadWeather();loadNumFact();loadAdminChart();init3DTilt();
}

// ── FILE PREVIEW ────────────────────────────────────────────────
function showFilePreview(f){
  const area=document.getElementById('file-preview-area');
  if(!area)return;
  area.innerHTML=`<div class="file-preview"><div style="font-size:24px">${fileEmoji(f.type||f.name)}</div><div style="flex:1;min-width:0"><div class="fname">${f.name}</div><div class="fmeta">${fBytes(f.size)} · ${f.type||'unknown'}</div></div><button class="fremove" id="remove-file-btn" type="button">${I.close}</button></div>`;
  document.getElementById('remove-file-btn')?.addEventListener('click',()=>{
    window._selectedFile=null;
    const fi=document.getElementById('f-input');
    if(fi)fi.value='';
    area.innerHTML='';
  });
}

// ── JITSI ────────────────────────────────────────────────────────
function launchJitsi(code,className){
  const container=document.getElementById('jitsi-container');
  const lobby=document.getElementById('meet-lobby');
  if(!container)return;
  lobby.style.display='none';
  container.style.display='block';
  const roomName='campusconnect-'+code;
  const u=Auth.user;
  if(typeof JitsiMeetExternalAPI==='undefined'){
    container.innerHTML=`<div style="padding:40px;text-align:center;background:var(--glass-1);border-radius:var(--r-xl);height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div style="font-size:36px;margin-bottom:14px">🔗</div>
      <div style="font-size:17px;font-weight:700;margin-bottom:10px;color:var(--t1)">Opening in new tab…</div>
      <div style="font-size:13px;color:var(--t3);margin-bottom:18px">Room: ${className} · Code: ${code}</div>
      <a href="https://meet.jit.si/${roomName}" target="_blank" class="btn btn-primary btn-lg">${I.video} Open Meeting Room</a>
      <div style="margin-top:16px;font-size:12px;color:var(--t4)">Link: <code style="color:var(--accent-l)">https://meet.jit.si/${roomName}</code></div>
    </div>`;
    window.open('https://meet.jit.si/'+roomName,'_blank');
    return;
  }
  window._jitsi=new JitsiMeetExternalAPI('meet.jit.si',{
    roomName,parentNode:container,width:'100%',height:'100%',
    userInfo:{displayName:u.name,email:u.email},
    configOverwrite:{startWithAudioMuted:true,prejoinPageEnabled:false},
    interfaceConfigOverwrite:{SHOW_JITSI_WATERMARK:false,TOOLBAR_ALWAYS_VISIBLE:true},
  });
  window._jitsi.addEventListener('videoConferenceLeft',()=>{
    window._jitsi?.dispose();window._jitsi=null;
    container.style.display='none';lobby.style.display='block';
  });
}

// ── CHAT ────────────────────────────────────────────────────────
function sendChat(){
  const inp=document.getElementById('chat-input');
  const cid=document.getElementById('chat-send-btn')?.dataset.cid;
  if(!inp||!cid)return;
  const body=inp.value.trim();if(!body)return;
  DB.addMessage({id:uid(),classId:cid,authorId:Auth.id,body:body.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'),pinned:false,createdAt:Date.now(),system:false});
  inp.value='';
  renderChatMsgs(cid);
}

function renderChatMsgs(cid){
  const u=Auth.user; const isT=u.role==='teacher'||u.role==='admin';
  const msgs=DB.messages(cid);
  const el=document.getElementById('chat-msgs');
  if(!el)return;
  el.innerHTML=msgs.map(m=>{
    const auth=DB.userById(m.authorId); const own=m.authorId===u.id;
    return `<div class="chat-msg${own?' own':''}${m.pinned?' pinned':''}${m.system?' system':''}">
    ${!own&&!m.system?av(auth,'avatar-sm'):''}<div>${!own&&!m.system?`<div class="chat-sender">${auth?.name||'?'}${m.pinned?' 📌':''}</div>`:''}<div class="chat-bubble">${m.body}</div><div class="chat-time">${timeAgo(m.createdAt)}${isT&&!m.pinned&&!m.system?` <button onclick="pinMsg('${m.id}','${cid}')" style="font-size:10px;color:var(--amber-l);background:none;border:none;cursor:pointer;margin-left:6px">${I.pin} Pin</button>`:''}</div></div></div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}

function pinMsg(msgId,cid){DB.pinMsg(msgId,true);toast('Message pinned!','success');Router.go('class',{cid,tab:'chat'});}
function startChatPoll(cid){Router.addPoll(()=>{const el=document.getElementById('chat-msgs');if(!el)return;const count=el.querySelectorAll('.chat-msg').length;if(DB.messages(cid).length>count)renderChatMsgs(cid);},POLL_CHAT);}
function startNotifPoll(){if(!Auth.ok)return;Router.addPoll(()=>{const n=DB.unreadCount(Auth.id);const btn=document.getElementById('notif-bell');if(!btn)return;const dot=btn.querySelector('.notif-dot');if(n>0&&!dot){const d=document.createElement('span');d.className='notif-dot';btn.appendChild(d);}else if(n===0&&dot)dot.remove();},POLL_NOTIF);}

// ── API LOADERS ─────────────────────────────────────────────────
async function loadQuote(){
  const el=document.getElementById('quote-widget');
  if(!el)return;
  const q=await API.quote();
  el.innerHTML=`<div class="quote-widget">"${q.text}"</div><div class="quote-author">— ${q.author}</div>`;
}

async function dictLookup(){
  const word=document.getElementById('dict-input')?.value.trim();
  const out=document.getElementById('dict-result');
  if(!word||!out)return;
  out.innerHTML='<div class="skeleton" style="height:40px;margin-top:12px"></div>';
  const data=await API.dictLookup(word);
  if(!data){out.innerHTML='<div style="color:var(--rose-l);margin-top:10px;font-size:13px">Word not found.</div>';return;}
  const entry=data[0];
  const meanings=entry.meanings?.slice(0,2)||[];
  out.innerHTML=`<div class="dict-result"><div class="dict-word">${entry.word}</div>${entry.phonetic?`<div class="dict-phonetic">${entry.phonetic}</div>`:''}${meanings.map(m=>`<div style="margin-bottom:8px"><span class="badge badge-muted" style="margin-bottom:4px">${m.partOfSpeech}</span>${m.definitions?.slice(0,2).map(d=>`<div class="dict-meaning">${d.definition}</div>`).join('')||''}</div>`).join('')}</div>`;
}

async function loadNumFact(){
  const el=document.getElementById('num-fact');
  if(!el)return;
  const u=Auth.user;
  const total=DB.classesForUser(u.id).reduce((sum,c)=>sum+DB.assignments(c.id).length,0);
  if(total===0){el.innerHTML='<div style="font-size:13px;color:var(--t3)">💡 You have no assignments yet!</div>';return;}
  const fact=await API.numberFact(total);
  el.innerHTML='<div style="font-size:13px;color:var(--t2)">💡 <strong>'+total+' assignments</strong> — Fun fact: '+fact+'</div>';
}

async function loadWeather(){
  const el=document.getElementById('weather-widget');
  if(!el)return;
  // Mumbai (SAKEC location)
  const data=await API.weather(19.04,72.86);
  if(!data||!data.current){el.innerHTML='<div style="font-size:13px;color:var(--t3)">🌤️ Weather unavailable</div>';return;}
  const c=data.current;
  const wCode=c.weather_code;
  const emoji=wCode<=1?'☀️':wCode<=3?'⛅':wCode<=49?'🌧️':wCode<=65?'🌧️':wCode<=77?'❄️':'🌩️';
  el.innerHTML=`<div class="weather-widget"><div style="font-size:38px">${emoji}</div><div><div class="weather-temp">${Math.round(c.temperature_2m)}°C</div><div class="weather-detail">Mumbai (SAKEC) · Humidity ${c.relative_humidity_2m}% · Wind ${c.wind_speed_10m} km/h</div></div></div>`;
}

function loadAdminChart(){
  const canvas=document.getElementById('admin-chart');
  if(!canvas||typeof Chart==='undefined')return;
  const subs=DB.get('submissions',[]);
  const now=Date.now();const d=86400000;
  const labels=[];const data=[];
  for(let i=6;i>=0;i--){
    const dayStart=now-(i*d);const dayEnd=dayStart+d;
    labels.push(new Date(dayStart).toLocaleDateString('en-IN',{day:'numeric',month:'short'}));
    data.push(subs.filter(s=>s.submittedAt>=dayStart&&s.submittedAt<dayEnd).length);
  }
  new Chart(canvas,{type:'bar',data:{labels,datasets:[{label:'Submissions',data,backgroundColor:'rgba(232,112,42,0.45)',borderColor:'#e8702a',borderWidth:2,borderRadius:6,barPercentage:0.6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'rgba(255,255,255,.4)',font:{size:11}}},y:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'rgba(255,255,255,.4)',font:{size:11},stepSize:1}}}}});
}

// ── MODALS ──────────────────────────────────────────────────────
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
    DB.saveClass(c);DB.enroll({userId:Auth.id,classId:c.id,role:'teacher'});
    DB.addActivity({type:'class_create',text:'Class "'+name+'" created by '+Auth.user.name,userId:Auth.id});
    closeModal();toast('Class "'+name+'" created!','success');Router.go('dashboard');
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
    closeModal();toast('Joined "'+cls.name+'"! 🎉','success');Router.go('class',{cid:cls.id,tab:'stream'});
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
    notify(stus.map(m=>m.id),'assignment','📝 New: "'+title+'" in '+DB.classById(cid)?.name,{assignmentId:a.id});
    DB.addActivity({type:'assignment',text:'Assignment "'+title+'" posted by '+Auth.user.name,userId:Auth.id});
    closeModal();toast('Assignment posted!','success');Router.go('class',{cid,tab:'assignments'});
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
    closeModal();toast('Resource uploaded!','success');Router.go('class',{cid,tab:'resources'});
  });
}

function modalSearchBooks(){
  showModal(`<div class="modal-header"><div class="modal-title">Search Books (Open Library)</div><button class="modal-close" onclick="closeModal()">${I.close}</button></div>
  <div style="display:flex;gap:8px;margin-bottom:18px"><input id="bk-query" class="form-input" placeholder="Search for textbooks..." style="flex:1"><button class="btn btn-primary" id="bk-search">${I.search} Search</button></div>
  <div id="bk-results"></div>`);
  document.getElementById('bk-search')?.addEventListener('click',async()=>{
    const q=document.getElementById('bk-query')?.value.trim();
    if(!q)return;
    const out=document.getElementById('bk-results');
    out.innerHTML='<div class="skeleton" style="height:80px"></div>';
    const books=await API.searchBooks(q);
    if(books.length===0){out.innerHTML='<div style="color:var(--t4);text-align:center;padding:20px">No books found.</div>';return;}
    out.innerHTML=books.map(b=>`<div class="resource-card" style="margin-bottom:8px"><div class="res-icon" style="background:var(--accent-d)">📚</div><div class="res-info"><div class="res-name">${(b.title||'Untitled').slice(0,60)}</div><div class="res-meta">${b.author_name?b.author_name.slice(0,2).join(', '):'Unknown Author'} · ${b.first_publish_year||'N/A'}</div></div></div>`).join('');
  });
  document.getElementById('bk-query')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('bk-search')?.click();});
}

// ── INIT ────────────────────────────────────────────────────────
function init(){
  seed();
  Theme.init();
  Auth.init();
  Router.go(Auth.ok?'dashboard':'hero');
  window.addEventListener('resize',()=>{if(window.innerWidth>768)document.getElementById('sidebar')?.classList.remove('open');});
}

document.addEventListener('DOMContentLoaded',init);
