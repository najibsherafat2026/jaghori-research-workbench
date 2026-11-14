import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject, newChapter, parseBackup} from './model.js';

test('backup preserves chapter text and evidence', () => {
  const project = newProject();
  const chapter = newChapter('نمونه');
  chapter.draft = 'متن پژوهشی';
  chapter.entries.push({
    id: 'example', title: 'روایت', body: 'متن', source: 'مصاحبه',
    type: 'روایت محلی', status: 'نیازمند بررسی',
    priority: 'بالا', next: 'تطبیق', done: false
  });
  project.chapters.push(chapter);
  assert.deepEqual(parseBackup(JSON.stringify(project)), project);
});

test('invalid backups are rejected', () => {
  assert.throws(() => parseBackup('{"schema":1,"chapters":[{"title":"ناقص"}]}'));
  assert.throws(() => parseBackup('{"schema":99,"chapters":[]}'));
});

test('old workshop backup is imported', () => {
  const old = {chapters: ['بابه', 'هیچه', 'غوغه', 'پشی'].map(name => ({
    base: name + ' متن', stage: 'پیش‌نویس', versions: [],
    entries: [{title: 'شاهد', body: 'روایت', source: 'ص ۱۲',
      type: 'مصاحبه', tag: 'نقل قول', priority: 'بالا',
      next: '', done: false}]
  }))};
  const restored = parseBackup(JSON.stringify(old));
  assert.equal(restored.chapters.length, 4);
  assert.equal(restored.chapters[3].draft, 'پشی متن');
  assert.equal(restored.chapters[0].entries[0].source, 'ص ۱۲');
});
