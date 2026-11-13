export const KEY = 'jaghori-research-workbench-v1';
export const TYPES = ['منبع مکتوب', 'مصاحبه', 'روایت محلی', 'شجره‌نامه', 'تعارض روایت‌ها', 'یادداشت', 'پاورقی', 'کار باز'];
export const STATUSES = ['مستند', 'نقل قول', 'روایت محلی', 'فرضیه', 'خلأ اطلاعاتی', 'نیازمند بررسی'];
export const PRIORITIES = ['بالا', 'متوسط', 'پایین'];

export const newChapter = (title) => ({
  id: crypto.randomUUID(), title, draft: '', versions: [], entries: [],
  stage: 'داده‌برداری', updated: new Date().toISOString()
});
export const newProject = () => ({schema: 1, chapters: []});

const plain = x => x && typeof x === 'object' && !Array.isArray(x);
const str = x => typeof x === 'string';
export function validateProject(x) {
  if (!plain(x) || x.schema !== 1 || !Array.isArray(x.chapters) || x.chapters.length > 100) throw Error('ساختار پرونده معتبر نیست.');
  const ids = new Set();
  for (const c of x.chapters) {
    if (!plain(c) || !str(c.id) || !str(c.title) || !str(c.draft) ||
        !str(c.stage) || !str(c.updated) || !Array.isArray(c.versions) ||
        !Array.isArray(c.entries) || c.versions.length > 1000 || c.entries.length > 10000 ||
        ids.has(c.id)) throw Error('اطلاعات فصل معتبر نیست.');
    ids.add(c.id);
    for (const v of c.versions) if (!plain(v) || !str(v.id) || !str(v.title) || !str(v.text) || !str(v.created)) throw Error('نسخهٔ متن معتبر نیست.');
    for (const e of c.entries) if (!plain(e) || !str(e.id) || !str(e.title) ||
      !str(e.body) || !str(e.source) || !str(e.type) || !str(e.status) ||
      !str(e.priority) || !str(e.next) || typeof e.done !== 'boolean') throw Error('مدرک معتبر نیست.');
  }
  return x;
}
export function parseBackup(text) {
  if (text.length > 10_000_000) throw Error('حجم فایل بیش از حد مجاز است.');
  const parsed = JSON.parse(text);
  if (parsed?.schema === undefined && Array.isArray(parsed?.chapters) &&
      [3,4].includes(parsed.chapters.length) &&
      parsed.chapters.every(c => plain(c) && str(c.base) && Array.isArray(c.versions) && Array.isArray(c.entries))) {
    const names = ['بابه','هیچه / ایچه','غوغه','چهل‌باغتوی پشی'];
    const migrated = newProject();
    parsed.chapters.forEach((old,i) => {
      const c = newChapter(names[i]);c.draft=old.base;c.stage=str(old.stage)?old.stage:'داده‌برداری';
      c.versions=old.versions.map(v=>({id:crypto.randomUUID(),title:String(v.title??'نسخه'),text:String(v.text??''),created:new Date().toISOString()}));
      c.entries=old.entries.map(e=>({id:crypto.randomUUID(),title:String(e.title??''),body:String(e.body??''),source:String(e.source??''),
        type:String(e.type??'یادداشت'),status:String(e.tag??'نیازمند بررسی'),priority:String(e.priority??'متوسط'),
        next:String(e.next??''),done:e.done===true}));
      migrated.chapters.push(c);
    });
    return validateProject(migrated);
  }
  return validateProject(parsed);
}
