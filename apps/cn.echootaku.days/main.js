var DAYS_STORAGE_KEY = 'days.events.v1';
var DAYS_COLORS = ['#D97757', '#C6924B', '#66917A', '#6687A8', '#8D78A8', '#B56F83'];
var DAYS_CATEGORY_LABELS = {
  life: '生活', birthday: '生日', anniversary: '纪念', study: '学习', travel: '旅行', other: '其他'
};

function daysPad(value) { return String(value).padStart(2, '0'); }
function daysTodayKey() {
  var now = new Date();
  return now.getFullYear() + '-' + daysPad(now.getMonth() + 1) + '-' + daysPad(now.getDate());
}
function daysParseDate(value) {
  var parts = String(value || '').split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}
function daysUtcDay(date) { return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000; }
function daysOccurrence(event, now) {
  var source = daysParseDate(event.date);
  if (!source) return null;
  if (!event.annual) return source;
  var candidate = new Date(now.getFullYear(), source.getMonth(), source.getDate(), 12, 0, 0, 0);
  if (candidate.getMonth() !== source.getMonth()) candidate = new Date(now.getFullYear(), source.getMonth() + 1, 0, 12, 0, 0, 0);
  if (daysUtcDay(candidate) < daysUtcDay(now)) {
    candidate = new Date(now.getFullYear() + 1, source.getMonth(), source.getDate(), 12, 0, 0, 0);
    if (candidate.getMonth() !== source.getMonth()) candidate = new Date(now.getFullYear() + 1, source.getMonth() + 1, 0, 12, 0, 0, 0);
  }
  return candidate;
}
function daysDifference(event, now) {
  var target = daysOccurrence(event, now || new Date());
  if (!target) return 0;
  return Math.round(daysUtcDay(target) - daysUtcDay(now || new Date()));
}
function daysNormalizeEvents(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(function (item) { return item && typeof item.title === 'string' && daysParseDate(item.date); }).map(function (item, index) {
    return {
      id: String(item.id || ('legacy-' + index)), title: item.title.trim().slice(0, 80), date: item.date,
      category: DAYS_CATEGORY_LABELS[item.category] ? item.category : 'other', note: String(item.note || '').slice(0, 240),
      annual: Boolean(item.annual), color: /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : DAYS_COLORS[index % DAYS_COLORS.length],
      createdAt: Number(item.createdAt) || Date.now()
    };
  });
}
function daysSortEvents(events) {
  var now = new Date();
  return events.slice().sort(function (a, b) {
    var ad = daysDifference(a, now); var bd = daysDifference(b, now);
    var ar = ad >= 0 ? 0 : 1; var br = bd >= 0 ? 0 : 1;
    if (ar !== br) return ar - br;
    return ar === 0 ? ad - bd : bd - ad;
  });
}
async function daysLoadEvents() {
  try { return daysNormalizeEvents(await Tapp.storage.get(DAYS_STORAGE_KEY)); }
  catch (error) { console.error('[Days] load failed', error); return []; }
}
async function daysSaveEvents(events) { await Tapp.storage.set(DAYS_STORAGE_KEY, daysNormalizeEvents(events)); }
function daysFormatDate(date, annual) {
  var options = annual ? { month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long', day: 'numeric' };
  try { return new Intl.DateTimeFormat('zh-CN', options).format(date); } catch (_) { return date.toLocaleDateString(); }
}
function daysCountCopy(diff) {
  if (diff === 0) return { count: '今', unit: '天', phrase: '就是今天' };
  if (diff > 0) return { count: String(diff), unit: '天', phrase: '还有 ' + diff + ' 天' };
  return { count: String(Math.abs(diff)), unit: '天', phrase: '已经 ' + Math.abs(diff) + ' 天' };
}
function daysNotify(message, type) {
  if (Tapp.ui && typeof Tapp.ui.showNotification === 'function') {
    return Tapp.ui.showNotification({ title: '朝夕', message: message, type: type || 'success', duration: 2600 });
  }
  return Promise.resolve();
}
function daysApplyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  if (document.body) document.body.classList.toggle('dark', theme === 'dark');
}
async function daysInitTheme() {
  try { daysApplyTheme(await Tapp.ui.getTheme()); } catch (_) {}
  if (Tapp.ui && typeof Tapp.ui.onThemeChange === 'function') Tapp.ui.onThemeChange(daysApplyTheme);
}

// ========== Widget Code ==========
var daysWidgetOff = null;
var daysWidgetDestroyBound = false;
var daysWidgetMidnightTimer = null;
function daysSetText(root, selector, value) { var element = root.querySelector(selector); if (element) element.textContent = value; }
function daysScheduleWidgetMidnight(root, props) {
  if (daysWidgetMidnightTimer) clearTimeout(daysWidgetMidnightTimer);
  var now = new Date(); var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  daysWidgetMidnightTimer = setTimeout(function () {
    daysLoadEvents().then(function (events) { daysRenderWidget(root, events, props || {}); daysScheduleWidgetMidnight(root, props); }).catch(console.error);
  }, Math.max(1000, next.getTime() - now.getTime()));
}
function daysRenderWidget(root, events, props) {
  var sorted = daysSortEvents(events); var now = new Date();
  daysSetText(root, '[data-widget-date]', (now.getMonth() + 1) + '月' + now.getDate() + '日');
  if (props && props.primaryColor) root.style.setProperty('--days-accent', props.primaryColor);
  if (props && props.theme) daysApplyTheme(props.theme);
  var primary = sorted[0];
  if (primary) {
    var target = daysOccurrence(primary, now); var diff = daysDifference(primary, now); var copy = daysCountCopy(diff);
    daysSetText(root, '[data-widget-category]', DAYS_CATEGORY_LABELS[primary.category] || '重要日子');
    daysSetText(root, '[data-widget-title]', primary.title);
    daysSetText(root, '[data-widget-count]', copy.count);
    daysSetText(root, '[data-widget-unit]', copy.unit);
    daysSetText(root, '[data-widget-full-date]', daysFormatDate(target, primary.annual));
    var dot = root.querySelector('[data-widget-dot]'); if (dot) dot.style.background = primary.color;
  }
  var list = root.querySelector('[data-widget-list]'); var empty = root.querySelector('[data-widget-empty]');
  if (list) {
    list.textContent = '';
    sorted.slice(0, 4).forEach(function (event) {
      var item = document.createElement('article'); item.className = 'widget-list-item';
      var mark = document.createElement('i'); mark.style.background = event.color;
      var copy = document.createElement('div'); var title = document.createElement('strong'); title.textContent = event.title;
      var meta = document.createElement('span'); meta.textContent = daysFormatDate(daysOccurrence(event, now), event.annual);
      var count = document.createElement('b'); count.textContent = daysCountCopy(daysDifference(event, now)).phrase;
      copy.appendChild(title); copy.appendChild(meta); item.appendChild(mark); item.appendChild(copy); item.appendChild(count); list.appendChild(item);
    });
    if (empty) empty.hidden = sorted.length > 0;
  }
  daysSetText(root, '[data-widget-total]', sorted.length + ' 个日子');
}
if (typeof Tapp !== 'undefined' && Tapp.widgets) {
  Tapp.widgets['days-countdown'] = {
    render: async function (container, props) {
      var root = container.querySelector('[data-widget-root]') || container;
      daysRenderWidget(root, await daysLoadEvents(), props || {});
      daysScheduleWidgetMidnight(root, props);
      if (daysWidgetOff) daysWidgetOff();
      if (Tapp.storage && typeof Tapp.storage.onChanged === 'function') {
        daysWidgetOff = Tapp.storage.onChanged(function (event) {
          if (!event || !event.key || event.key === DAYS_STORAGE_KEY) daysLoadEvents().then(function (events) { daysRenderWidget(root, events, props || {}); });
        });
      }
      if (!daysWidgetDestroyBound) {
        daysWidgetDestroyBound = true;
        Tapp.lifecycle.onDestroy(function () { if (daysWidgetOff) daysWidgetOff(); if (daysWidgetMidnightTimer) clearTimeout(daysWidgetMidnightTimer); daysWidgetOff = null; daysWidgetMidnightTimer = null; });
      }
    }
  };
}

// ========== Page Code ==========
var daysPageState = { events: [], filter: 'all', query: '', editingId: null, off: null };
function daysElement(tag, className, text) { var el = document.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el; }
function daysFilteredEvents() {
  var query = daysPageState.query.trim().toLowerCase(); var now = new Date();
  return daysSortEvents(daysPageState.events).filter(function (event) {
    var diff = daysDifference(event, now);
    if (daysPageState.filter === 'upcoming' && diff < 0) return false;
    if (daysPageState.filter === 'past' && (event.annual || diff >= 0)) return false;
    return !query || event.title.toLowerCase().includes(query) || event.note.toLowerCase().includes(query);
  });
}
function daysRenderHero(root) {
  var event = daysSortEvents(daysPageState.events)[0];
  if (!event) {
    daysSetText(root, '[data-hero-category]', '下一次相见'); daysSetText(root, '[data-hero-title]', '记录一个值得期待的日子');
    daysSetText(root, '[data-hero-date]', '从今天开始'); daysSetText(root, '[data-hero-count]', '0'); daysSetText(root, '[data-hero-unit]', '天'); return;
  }
  var target = daysOccurrence(event, new Date()); var copy = daysCountCopy(daysDifference(event, new Date()));
  daysSetText(root, '[data-hero-category]', DAYS_CATEGORY_LABELS[event.category]); daysSetText(root, '[data-hero-title]', event.title);
  daysSetText(root, '[data-hero-date]', daysFormatDate(target, event.annual) + (event.annual ? ' · 每年' : ''));
  daysSetText(root, '[data-hero-count]', copy.count); daysSetText(root, '[data-hero-unit]', copy.unit);
  var hero = root.querySelector('[data-hero]'); if (hero) hero.style.setProperty('--event-color', event.color);
}
function daysRenderPage(root) {
  daysRenderHero(root); var events = daysFilteredEvents(); var list = root.querySelector('[data-event-list]'); var empty = root.querySelector('[data-empty]');
  list.textContent = ''; daysSetText(root, '[data-event-total]', events.length + ' 个日子'); empty.hidden = events.length > 0;
  events.forEach(function (event) {
    var diff = daysDifference(event, new Date()); var target = daysOccurrence(event, new Date()); var copy = daysCountCopy(diff);
    var card = daysElement('article', 'event-card'); card.style.setProperty('--event-color', event.color); card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-label', '编辑 ' + event.title); card.dataset.eventId = event.id;
    var top = daysElement('div', 'event-card-top'); var category = daysElement('span', 'event-category', DAYS_CATEGORY_LABELS[event.category]);
    var repeat = daysElement('span', 'event-repeat', event.annual ? '每年' : '单次'); top.appendChild(category); top.appendChild(repeat);
    var title = daysElement('h3', '', event.title); var note = daysElement('p', 'event-note', event.note || '这一天值得被记住。');
    var bottom = daysElement('div', 'event-card-bottom'); var date = daysElement('span', 'event-date', daysFormatDate(target, event.annual));
    var counter = daysElement('strong', 'event-count', copy.phrase); bottom.appendChild(date); bottom.appendChild(counter);
    card.appendChild(top); card.appendChild(title); card.appendChild(note); card.appendChild(bottom); list.appendChild(card);
  });
}
function daysOpenEditor(root, event) {
  var panel = root.querySelector('[data-editor]'); var form = root.querySelector('[data-event-form]'); form.reset();
  daysPageState.editingId = event ? event.id : null; form.elements.id.value = event ? event.id : '';
  form.elements.title.value = event ? event.title : ''; form.elements.date.value = event ? event.date : daysTodayKey();
  form.elements.category.value = event ? event.category : 'life'; form.elements.note.value = event ? event.note : '';
  form.elements.annual.checked = event ? event.annual : false; form.elements.color.value = event ? event.color : DAYS_COLORS[daysPageState.events.length % DAYS_COLORS.length];
  daysSetText(root, '[data-editor-title]', event ? '编辑日子' : '新建日子'); root.querySelector('[data-action="delete-event"]').hidden = !event;
  panel.hidden = false; requestAnimationFrame(function () { panel.classList.add('is-open'); form.elements.title.focus(); });
}
function daysCloseEditor(root) {
  var panel = root.querySelector('[data-editor]'); panel.classList.remove('is-open'); daysPageState.editingId = null;
  setTimeout(function () { if (!panel.classList.contains('is-open')) panel.hidden = true; }, 180);
}
async function daysSubmitEvent(root, form) {
  var data = new FormData(form); var id = String(data.get('id') || ''); var existing = daysPageState.events.find(function (event) { return event.id === id; });
  var next = { id: id || ('day-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)), title: String(data.get('title') || '').trim(), date: String(data.get('date') || ''), category: String(data.get('category') || 'other'), note: String(data.get('note') || '').trim(), annual: data.get('annual') === 'on', color: String(data.get('color') || '#D97757'), createdAt: existing ? existing.createdAt : Date.now() };
  if (!next.title || !daysParseDate(next.date)) return;
  daysPageState.events = existing ? daysPageState.events.map(function (event) { return event.id === id ? next : event; }) : daysPageState.events.concat(next);
  await daysSaveEvents(daysPageState.events); daysCloseEditor(root); daysRenderPage(root); await daysNotify(existing ? '日子已更新' : '日子已保存');
}
async function daysDeleteEvent(root) {
  var event = daysPageState.events.find(function (item) { return item.id === daysPageState.editingId; }); if (!event) return;
  var confirmed = await Tapp.ui.confirm('确定删除“' + event.title + '”吗？'); if (!confirmed) return;
  daysPageState.events = daysPageState.events.filter(function (item) { return item.id !== event.id; });
  await daysSaveEvents(daysPageState.events); daysCloseEditor(root); daysRenderPage(root); await daysNotify('日子已删除', 'info');
}
async function daysMountPage(root) {
  if (root.dataset.ready === 'true') return; root.dataset.ready = 'true'; await daysInitTheme(); daysPageState.events = await daysLoadEvents(); daysRenderPage(root);
  root.addEventListener('click', function (event) {
    var action = event.target.closest('[data-action]');
    if (action) {
      var name = action.dataset.action; if (name === 'new-event') daysOpenEditor(root, null); if (name === 'close-editor') daysCloseEditor(root); if (name === 'delete-event') daysDeleteEvent(root).catch(console.error); return;
    }
    var filter = event.target.closest('[data-filter]'); if (filter) { daysPageState.filter = filter.dataset.filter; root.querySelectorAll('[data-filter]').forEach(function (button) { button.classList.toggle('is-active', button === filter); }); daysRenderPage(root); return; }
    var card = event.target.closest('[data-event-id]'); if (card) daysOpenEditor(root, daysPageState.events.find(function (item) { return item.id === card.dataset.eventId; }));
  });
  root.addEventListener('keydown', function (event) { var card = event.target.closest('[data-event-id]'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); card.click(); } if (event.key === 'Escape') daysCloseEditor(root); });
  root.querySelector('[data-search]').addEventListener('input', function (event) { daysPageState.query = event.target.value; daysRenderPage(root); });
  root.querySelector('[data-event-form]').addEventListener('submit', function (event) { event.preventDefault(); daysSubmitEvent(root, event.currentTarget).catch(function (error) { console.error(error); daysNotify('保存失败，请稍后重试', 'error'); }); });
  if (Tapp.storage && typeof Tapp.storage.onChanged === 'function') {
    daysPageState.off = Tapp.storage.onChanged(function (event) { if (!event || !event.key || event.key === DAYS_STORAGE_KEY) daysLoadEvents().then(function (items) { daysPageState.events = items; daysRenderPage(root); }); });
  }
  Tapp.lifecycle.onDestroy(function () { if (daysPageState.off) daysPageState.off(); });
}
if (typeof Tapp !== 'undefined' && Tapp.lifecycle) {
  Tapp.lifecycle.onReady(function () { var root = document.querySelector('[data-days-page]'); if (root) daysMountPage(root).catch(console.error); });
}
