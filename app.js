import {KEY, TYPES, STATUSES, PRIORITIES, newChapter, newProject, validateProject, parseBackup} from './model.js';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (className) n.className = className;
  return n;
};
const button = (text, action, className) => {
  const b = node('button', text, className);
  b.type = 'button'; b.addEventListener('click', action); return b;
};
const field = (label, value = '', multiline = false) => {
  const box = node('div', undefined, 'field');
  const caption = node('label', label);
  const control = document.createElement(multiline ? 'textarea' : 'input');
  control.value = value; caption.append(control); box.append(caption);
  return {box, control};
};
const select = (items, current) => {
  const s = node('select');
  for (const item of items) {
    const o = node('option', item); o.value = item; s.append(o);
  }
  s.value = current || items[0]; return s;
};
let data;
try { data = validateProject(JSON.parse(localStorage.getItem(KEY)) || newProject()); }
catch { data = newProject(); }
let selected = data.chapters[0]?.id || null, view = 'chapter';
function save() { localStorage.setItem(KEY, JSON.stringify(data)); render(); }
const chapter = () => data.chapters.find(c => c.id === selected);
const touch = c => { c.updated = new Date().toISOString(); save(); };

function render() {
  const nav = $('chapters'); nav.replaceChildren();
  for (const c of data.chapters) nav.append(button(c.title, () => {selected = c.id;view='chapter';render();}, selected === c.id && view === 'chapter' ? 'active' : ''));
  nav.append(button('همهٔ کارهای باز', () => {view='tasks';render();}, view==='tasks'?'active':''));
  const main = $('main'); main.replaceChildren();
  if (view === 'tasks') return renderTasks(main);
  const c = chapter();
  if (!c) {
    main.append(node('h1','پژوهش خود را آغاز کنید'),node('p','برای ساخت نخستین صفحه، «افزودن فصل» را بزنید.'));
    return;
  }
  main.append(node('h1', c.title), node('p', 'متن مبنا، شواهد و نسخه‌ها در این صفحه نگه‌داری می‌شوند.', 'muted'));
  const tools = node('div',undefined,'tools');
  tools.append(button('تغییر نام فصل', () => {const name=prompt('نام فصل',c.title)?.trim();if(name){c.title=name;touch(c)}}),
    button('ثبت نسخه از متن مبنا', () => {if(!c.draft.trim())return alert('ابتدا متن مبنا را بنویسید.');const title=prompt('نام نسخه','نسخهٔ '+(c.versions.length+1))?.trim();if(title){c.versions.push({id:crypto.randomUUID(),title,text:c.draft,created:new Date().toISOString()});touch(c)}}),
    button('مقایسهٔ نسخه‌ها', () => {view='compare';render();}));
  main.append(tools);
  if (view === 'compare') return renderCompare(main,c);
  const layout=node('div',undefined,'grid'), left=node('div'), right=node('div');
  const draftCard=node('section',undefined,'card');draftCard.append(node('h2','متن مبنا'));
  const draft=field('متن جاری فصل',c.draft,true); draft.control.style.minHeight='340px';
  let timer;draft.control.addEventListener('input',()=>{c.draft=draft.control.value;c.updated=new Date().toISOString();clearTimeout(timer);timer=setTimeout(()=>localStorage.setItem(KEY,JSON.stringify(data)),300)});
  draftCard.append(draft.box,node('p','تغییرهای متن پس از مکث کوتاه در همین مرورگر ذخیره می‌شوند.','hint'));left.append(draftCard);
  const versions=node('section',undefined,'card');versions.append(node('h2','نسخه‌های ثبت‌شده'));
  for(const v of [...c.versions].reverse()) versions.append(node('div',v.title+' · '+new Date(v.created).toLocaleDateString('fa-IR'),'entry'));
  if(!c.versions.length)versions.append(node('p','هنوز نسخه‌ای ثبت نشده است.','muted'));
  left.append(versions);
  const form=node('section',undefined,'card');form.append(node('h2','ثبت شاهد یا کار'));
  const title=field('عنوان'), body=field('شرح یا نقل قول','',true),source=field('منبع، گوینده، تاریخ و شمارهٔ صفحه'),next=field('گام بعدی برای کار باز');
  const type=select(TYPES),status=select(STATUSES),priority=select(PRIORITIES);
  for(const [label,control] of [['نوع',type],['وضعیت ادعا',status],['اولویت کار',priority]]){
    const wrap=node('div',undefined,'field'),caption=node('label',label);caption.append(control);wrap.append(caption);form.append(wrap);
  }
  form.append(title.box,body.box,source.box,next.box);
  form.append(button('ثبت در فصل',()=>{
    if(!title.control.value.trim())return alert('عنوان را وارد کنید.');
    c.entries.push({id:crypto.randomUUID(),title:title.control.value.trim(),body:body.control.value,source:source.control.value,
      type:type.value,status:status.value,priority:priority.value,next:next.control.value,done:false});touch(c);
  },'primary'));right.append(form);
  const evidence=node('section',undefined,'card');evidence.append(node('h2','شواهد و یادداشت‌ها'));
  for(const e of [...c.entries].reverse()){
    const item=node('div',undefined,'entry');
    item.append(node('strong',e.title),node('span',e.type,'tag'),node('span',e.status,'tag'),node('p',e.body),
      node('small',e.source || 'منبع ثبت نشده است.','muted'));
    if(e.type==='کار باز')item.append(node('p','اولویت: '+e.priority+' · گام بعدی: '+(e.next||'ثبت نشده')));
    item.append(button('ویرایش',()=>editEntry(c,e)),button('حذف',()=>{if(confirm('این مورد حذف شود؟')){c.entries=c.entries.filter(x=>x.id!==e.id);touch(c)}}));
    evidence.append(item);
  }
  if(!c.entries.length)evidence.append(node('p','هنوز شاهدی ثبت نشده است.','muted'));
  right.append(evidence);layout.append(left,right);main.append(layout);
}
function editEntry(c,e){
  const title=prompt('عنوان',e.title);if(title===null)return;
  const body=prompt('شرح',e.body);if(body===null)return;
  const source=prompt('منبع و صفحه',e.source);if(source===null)return;
  e.title=title.trim();e.body=body;e.source=source;touch(c);
}
function renderCompare(main,c){
  const versions=[{title:'متن مبنا',text:c.draft},...c.versions];
  const grid=node('div',undefined,'grid compare');
  for(let i=0;i<2;i++){
    const card=node('section',undefined,'card'),pick=select(versions.map((v,j)=>String(j)),String(Math.min(i,versions.length-1)));
    const area=node('textarea');area.readOnly=true;
    const update=()=>area.value=versions[Number(pick.value)]?.text||'';
    for(const [j,o] of [...pick.options].entries())o.textContent=versions[j].title;
    pick.addEventListener('change',update);update();
    card.append(pick,area);grid.append(card);
  }
  main.append(grid);
}
function renderTasks(main){
  main.append(node('h1','کارهای باز'));
  const list=[];
  for(const c of data.chapters)for(const e of c.entries)if(e.type==='کار باز'&&!e.done)list.push({c,e});
  list.sort((a,b)=>PRIORITIES.indexOf(a.e.priority)-PRIORITIES.indexOf(b.e.priority));
  for(const {c,e} of list){
    const card=node('section',undefined,'card');card.append(node('strong',e.title),node('p',c.title+' · '+e.priority+' · '+(e.next||'گام بعدی ثبت نشده')));
    card.append(button('انجام شد',()=>{e.done=true;touch(c)}),button('دیدن فصل',()=>{selected=c.id;view='chapter';render()}));main.append(card);
  }
  if(!list.length)main.append(node('p','کار بازی ثبت نشده است.','muted'));
}
$('add-chapter').addEventListener('click',()=>{const title=prompt('نام فصل یا منطقه')?.trim();if(!title)return;const c=newChapter(title);data.chapters.push(c);selected=c.id;view='chapter';save()});
$('export').addEventListener('click',async()=>{
  const file=new File([JSON.stringify(data,null,2)],'jaghori-research-backup.json',{type:'application/json'});
  if(navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:'پشتیبان پژوهش'});return}catch(e){if(e.name==='AbortError')return}
  }
  const url=URL.createObjectURL(file),a=node('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
});
$('copy-backup').addEventListener('click',()=>{$('backup-text').value=JSON.stringify(data,null,2);$('backup-dialog').showModal();$('backup-text').select()});
$('close-backup').addEventListener('click',()=>$('backup-dialog').close());
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    const incoming=parseBackup(await file.text());
    if(confirm('داده‌های فعلی با محتوای این فایل جایگزین شوند؟ ابتدا از داده‌های فعلی پشتیبان بگیرید.')){
      data=incoming;selected=data.chapters[0]?.id||null;view='chapter';save();
    }
  }catch(e){alert('فایل قابل بازیابی نیست: '+e.message)}
  event.target.value='';
});
render();
