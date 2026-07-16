// Quick Notes Tapp v1.0.0
// 便携便签

// ========================================
// 常量
// ========================================

var MAX_NOTE_CHARS = 500;

// ========================================
// 国际化
// ========================================

var i18n = {
  'zh-CN': {
    title: '便签',
    placeholder: '记录一个想法...',
    searchPlaceholder: '搜索笔记...',
    add: '添加',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    clearAll: '清空全部',
    clearConfirm: '确定要清空所有笔记吗？',
    notesCount: '条笔记',
    emptyTitle: '暂无笔记',
    emptySubtitle: '开始记录你的想法吧！',
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
    daysAgo: '天前',
    noteAdded: '笔记已添加',
    noteUpdated: '笔记已更新',
    noteDeleted: '笔记已删除',
    allCleared: '已清空所有笔记',
    charLimitReached: '已达字数上限（500）',
    notesTrimmed: '已达上限，已删除最旧的笔记',
    clickToEdit: '点击编辑'
  },
  'en-US': {
    title: 'Notes',
    placeholder: 'Write a note...',
    searchPlaceholder: 'Search notes...',
    add: 'Add',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    clearAll: 'Clear All',
    clearConfirm: 'Are you sure you want to clear all notes?',
    notesCount: 'notes',
    emptyTitle: 'No notes yet',
    emptySubtitle: 'Start writing your thoughts!',
    justNow: 'just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    noteAdded: 'Note added',
    noteUpdated: 'Note updated',
    noteDeleted: 'Note deleted',
    allCleared: 'All notes cleared',
    charLimitReached: 'Character limit reached (500)',
    notesTrimmed: 'Limit reached; oldest notes removed',
    clickToEdit: 'Click to edit'
  },
  'ja-JP': {
    title: 'メモ',
    placeholder: 'メモを書く...',
    searchPlaceholder: 'メモを検索...',
    add: '追加',
    delete: '削除',
    save: '保存',
    cancel: 'キャンセル',
    clearAll: '全削除',
    clearConfirm: 'すべてのメモを削除しますか？',
    notesCount: '件のメモ',
    emptyTitle: 'メモがありません',
    emptySubtitle: '思いを書き始めましょう！',
    justNow: 'たった今',
    minutesAgo: '分前',
    hoursAgo: '時間前',
    daysAgo: '日前',
    noteAdded: 'メモを追加しました',
    noteUpdated: 'メモを更新しました',
    noteDeleted: 'メモを削除しました',
    allCleared: 'すべてのメモを削除しました',
    charLimitReached: '文字数上限に達しました（500）',
    notesTrimmed: '上限に達したため、古いメモを削除しました',
    clickToEdit: 'クリックして編集'
  }
};

var currentLocale = 'zh-CN';

function normalizeLocale(locale) {
  if (!locale) return 'zh-CN';
  var l = String(locale).toLowerCase();
  if (l.indexOf('zh') === 0) return 'zh-CN';
  if (l.indexOf('ja') === 0) return 'ja-JP';
  return 'en-US';
}

function t(key) {
  return (i18n[currentLocale] || i18n['zh-CN'])[key] || key;
}

// ========================================
// 工具函数
// ========================================

function generateNoteId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function colorIndexFromId(id) {
  var s = String(id == null ? 0 : id);
  var hash = 0;
  for (var i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash = hash | 0;
  }
  return Math.abs(hash) % 6;
}

function noteTimestamp(note) {
  if (!note) return Date.now();
  if (note.updatedAt) return note.updatedAt;
  return note.createdAt || Date.now();
}

function formatTime(timestamp) {
  var date = new Date(timestamp);
  var now = new Date();
  var diff = now - date;

  if (diff < 60000) return t('justNow');
  if (diff < 3600000) return Math.floor(diff / 60000) + ' ' + t('minutesAgo');
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' ' + t('hoursAgo');
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' ' + t('daysAgo');

  return date.toLocaleDateString(currentLocale);
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clampNoteText(text) {
  var value = String(text == null ? '' : text);
  if (value.length > MAX_NOTE_CHARS) {
    return value.slice(0, MAX_NOTE_CHARS);
  }
  return value;
}

function notify(opts) {
  try {
    if (Tapp.ui && typeof Tapp.ui.showNotification === 'function') {
      return Tapp.ui.showNotification(opts);
    }
  } catch (e) {}
  return Promise.resolve();
}

function invalidateWidgets(reason) {
  try {
    if (Tapp.widget && typeof Tapp.widget.invalidate === 'function') {
      return Tapp.widget.invalidate(reason || 'notes-updated');
    }
  } catch (e) {}
  return Promise.resolve();
}

function applyTheme(theme) {
  var isDark = theme === 'dark';
  try {
    document.documentElement.classList.toggle('dark', isDark);
    if (document.body) {
      document.body.classList.toggle('dark', isDark);
    }
  } catch (e) {}
}

function applyPrimaryColor(color) {
  if (!color || typeof color !== 'string') return;
  var hex = color.trim();
  if (hex.charAt(0) === '#') hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
  }
  if (hex.length !== 6 || !/^[0-9a-fA-F]+$/.test(hex)) return;

  var r = parseInt(hex.slice(0, 2), 16);
  var g = parseInt(hex.slice(2, 4), 16);
  var b = parseInt(hex.slice(4, 6), 16);
  var root = document.documentElement;
  try {
    root.style.setProperty('--tapp-primary', '#' + hex.toLowerCase());
    root.style.setProperty('--tapp-primary-rgb', r + ', ' + g + ', ' + b);
    root.style.setProperty('--notes-primary', '#' + hex.toLowerCase());
    root.style.setProperty('--notes-primary-rgb', r + ', ' + g + ', ' + b);
  } catch (e) {}
}

function normalizeNotes(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(function(n) {
    return n && typeof n === 'object' && n.text != null;
  });
}

function trimToMaxNotes(notes, maxNotes) {
  var max = parseInt(maxNotes, 10);
  if (!max || max < 1) max = 100;
  var list = notes || [];
  if (list.length <= max) {
    return { notes: list, trimmed: 0 };
  }
  return {
    notes: list.slice(0, max),
    trimmed: list.length - max
  };
}

// ========================================
// Widget 状态
// ========================================

var widgetState = {
  notes: [],
  settings: { maxNotes: 100, showTimestamp: true, saveHistory: true },
  size: '2x2',
  syncing: false
};

// ========================================
// Widget 初始化 - 通用
// ========================================

async function initWidget() {
  var props = window._TAPP_WIDGET_PROPS || {};
  var size = props.size || '2x2';
  widgetState.size = size;
  currentLocale = normalizeLocale(props.locale);

  if (props.theme) {
    applyTheme(props.theme);
  }
  if (props.primaryColor) {
    applyPrimaryColor(props.primaryColor);
  }

  await loadWidgetData();

  // 设置 UI 文本
  var titleEl = document.getElementById('widget-title');
  var inputEl = document.getElementById('widget-input');
  var countEl = document.getElementById('widget-count');

  if (titleEl) titleEl.textContent = t('title');
  if (inputEl) {
    inputEl.placeholder = t('placeholder');
    inputEl.setAttribute('maxlength', String(MAX_NOTE_CHARS));
  }
  if (countEl) countEl.textContent = widgetState.notes.length;

  renderWidgetNotes(size);

  var addBtn = document.getElementById('widget-add');
  var input = document.getElementById('widget-input');

  if (addBtn && input) {
    addBtn.addEventListener('click', function() {
      addWidgetNote(input, size);
    });

    input.addEventListener('input', function() {
      if (input.value.length > MAX_NOTE_CHARS) {
        input.value = input.value.slice(0, MAX_NOTE_CHARS);
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addWidgetNote(input, size);
      }
    });
  }

  // Page/Widget 同步：其他实例改 storage 时刷新
  if (Tapp.storage && typeof Tapp.storage.onChanged === 'function') {
    Tapp.storage.onChanged(function() {
      if (widgetState.syncing) return;
      loadWidgetData().then(function() {
        renderWidgetNotes(widgetState.size);
      }).catch(function() {});
    });
  }
}

async function loadWidgetData() {
  try {
    var savedSettings = await Tapp.settings.getAll();
    if (savedSettings) {
      Object.assign(widgetState.settings, savedSettings);
    }

    if (widgetState.settings.saveHistory === false) {
      widgetState.notes = [];
      try {
        await Tapp.storage.set('notes', []);
      } catch (e) {}
      return;
    }

    widgetState.notes = normalizeNotes(await Tapp.storage.get('notes'));
  } catch (e) {
    console.error('[Notes] 加载数据失败:', e);
  }
}

function renderWidgetNotes(size) {
  var listEl = document.getElementById('notes-list');
  var countEl = document.getElementById('widget-count');

  if (!listEl) return;

  listEl.innerHTML = '';

  if (countEl) countEl.textContent = widgetState.notes.length;

  if (widgetState.notes.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'notes-empty';
    var emptyIcon = document.createElement('span');
    emptyIcon.className = 'empty-icon';
    emptyIcon.textContent = '📝';
    var emptyText = document.createElement('span');
    emptyText.className = 'empty-text';
    emptyText.textContent = t('emptyTitle');
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    listEl.appendChild(empty);
    return;
  }

  // 根据尺寸决定显示数量
  var maxDisplay = size === '4x4' ? 8 : (size === '4x2' ? 4 : 3);
  var displayNotes = widgetState.notes.slice(0, maxDisplay);

  displayNotes.forEach(function(note) {
    var item = document.createElement('div');
    item.className = 'note-item';

    var content = document.createElement('div');
    content.className = 'note-content';

    var text = document.createElement('div');
    text.className = 'note-text';
    text.textContent = note.text;
    content.appendChild(text);

    if (widgetState.settings.showTimestamp) {
      var time = document.createElement('div');
      time.className = 'note-time';
      time.textContent = formatTime(noteTimestamp(note));
      content.appendChild(time);
    }

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.title = t('delete');
    deleteBtn.setAttribute('aria-label', t('delete'));
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteWidgetNote(note.id, size);
    });

    item.appendChild(content);
    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });

  // 显示更多提示
  if (widgetState.notes.length > maxDisplay) {
    var more = document.createElement('div');
    more.className = 'note-item';
    more.style.cssText = 'justify-content: center; color: var(--notes-text-muted); font-size: 11px; padding: 6px;';
    more.textContent = '+' + (widgetState.notes.length - maxDisplay) + ' ' + t('notesCount');
    listEl.appendChild(more);
  }
}

async function saveWidgetNotes() {
  if (widgetState.settings.saveHistory === false) {
    widgetState.notes = [];
    widgetState.syncing = true;
    try {
      await Tapp.storage.set('notes', []);
    } catch (e) {
      console.error('[Notes] 清空失败:', e);
    }
    widgetState.syncing = false;
    return;
  }

  widgetState.syncing = true;
  try {
    await Tapp.storage.set('notes', widgetState.notes);
  } catch (e) {
    console.error('[Notes] 保存失败:', e);
  }
  widgetState.syncing = false;

  try {
    await invalidateWidgets('widget-notes-updated');
  } catch (e) {}
}

async function addWidgetNote(input, size) {
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;

  if (text.length > MAX_NOTE_CHARS) {
    await notify({
      title: t('charLimitReached'),
      type: 'warning'
    });
    return;
  }

  if (widgetState.settings.saveHistory === false) {
    input.value = '';
    widgetState.notes = [];
    await saveWidgetNotes();
    renderWidgetNotes(size);
    return;
  }

  var addBtn = document.getElementById('widget-add');
  if (addBtn) {
    addBtn.classList.add('add-bounce');
    setTimeout(function() { addBtn.classList.remove('add-bounce'); }, 350);
  }

  var now = Date.now();
  widgetState.notes.unshift({
    id: generateNoteId(),
    text: text,
    createdAt: now,
    updatedAt: now
  });

  var trimResult = trimToMaxNotes(widgetState.notes, widgetState.settings.maxNotes);
  widgetState.notes = trimResult.notes;

  input.value = '';

  await saveWidgetNotes();
  renderWidgetNotes(size);

  if (trimResult.trimmed > 0) {
    await notify({
      title: t('notesTrimmed'),
      message: String(trimResult.trimmed),
      type: 'warning'
    });
  }
}

async function deleteWidgetNote(noteId, size) {
  widgetState.notes = widgetState.notes.filter(function(n) {
    return String(n.id) !== String(noteId);
  });
  await saveWidgetNotes();
  renderWidgetNotes(size);
}

// ========================================
// Page 状态
// ========================================

var pageState = {
  notes: [],
  filteredNotes: [],
  searchQuery: '',
  settings: { maxNotes: 100, showTimestamp: true, saveHistory: true },
  editingId: null,
  syncing: false
};

// ========================================
// Page 初始化
// ========================================

async function loadPageData() {
  try {
    var savedSettings = await Tapp.settings.getAll();
    if (savedSettings) {
      Object.assign(pageState.settings, savedSettings);
    }

    if (pageState.settings.saveHistory === false) {
      pageState.notes = [];
      pageState.filteredNotes = [];
      pageState.syncing = true;
      try {
        await Tapp.storage.set('notes', []);
      } catch (e) {}
      pageState.syncing = false;
      return;
    }

    var notes = normalizeNotes(await Tapp.storage.get('notes'));
    pageState.notes = notes;
    pageState.filteredNotes = notes;
  } catch (e) {
    console.error('[Notes] 加载数据失败:', e);
  }
}

async function saveNotes() {
  if (pageState.settings.saveHistory === false) {
    pageState.notes = [];
    pageState.filteredNotes = [];
    pageState.syncing = true;
    try {
      await Tapp.storage.set('notes', []);
    } catch (e) {
      console.error('[Notes] 清空失败:', e);
    }
    pageState.syncing = false;
    try {
      await invalidateWidgets('notes-cleared');
    } catch (e) {}
    return;
  }

  pageState.syncing = true;
  try {
    await Tapp.storage.set('notes', pageState.notes);
  } catch (e) {
    console.error('[Notes] 保存失败:', e);
  }
  pageState.syncing = false;

  try {
    await invalidateWidgets('notes-updated');
  } catch (e) {}
}

function updateStatusPill() {
  var titleEl = document.getElementById('status-title');
  var subtitleEl = document.getElementById('status-subtitle');

  if (!titleEl || !subtitleEl) return;

  titleEl.textContent = t('title');

  var count = pageState.notes.length;
  if (count === 0) {
    subtitleEl.textContent = t('emptyTitle');
  } else if (pageState.searchQuery) {
    subtitleEl.textContent = pageState.filteredNotes.length + ' / ' + count + ' ' + t('notesCount');
  } else {
    subtitleEl.textContent = count + ' ' + t('notesCount');
  }
}

function updateCharCount(input, charCount) {
  if (!input || !charCount) return;
  var len = input.value.length;
  charCount.textContent = len + ' / ' + MAX_NOTE_CHARS;
  if (len >= MAX_NOTE_CHARS) {
    charCount.classList.add('char-count-limit');
  } else {
    charCount.classList.remove('char-count-limit');
  }
}

function renderEmptyState(area) {
  area.classList.add('empty');

  var empty = document.createElement('div');
  empty.className = 'notes-empty-state';

  var icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.textContent = '📝';

  var title = document.createElement('div');
  title.className = 'empty-title';
  title.textContent = t('emptyTitle');

  var subtitle = document.createElement('div');
  subtitle.className = 'empty-subtitle';
  subtitle.textContent = t('emptySubtitle');

  empty.appendChild(icon);
  empty.appendChild(title);
  empty.appendChild(subtitle);
  area.appendChild(empty);
}

function buildStickyEditUI(sticky, note) {
  if (!sticky || !note) return;

  sticky.classList.add('editing');
  sticky.innerHTML = '';

  var content = document.createElement('div');
  content.className = 'sticky-content sticky-edit-content';

  var textarea = document.createElement('textarea');
  textarea.className = 'sticky-edit-input';
  textarea.value = note.text;
  textarea.setAttribute('maxlength', String(MAX_NOTE_CHARS));
  textarea.setAttribute('rows', '5');

  var footer = document.createElement('div');
  footer.className = 'sticky-footer sticky-edit-footer';

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'sticky-edit-btn sticky-edit-cancel';
  cancelBtn.textContent = t('cancel');
  cancelBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    pageState.editingId = null;
    renderPageNotes();
  });

  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'sticky-edit-btn sticky-edit-save';
  saveBtn.textContent = t('save');
  saveBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    saveStickyEdit(note.id, textarea.value);
  });

  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      pageState.editingId = null;
      renderPageNotes();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveStickyEdit(note.id, textarea.value);
    }
  });

  textarea.addEventListener('click', function(e) {
    e.stopPropagation();
  });

  textarea.addEventListener('input', function() {
    if (textarea.value.length > MAX_NOTE_CHARS) {
      textarea.value = textarea.value.slice(0, MAX_NOTE_CHARS);
    }
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  content.appendChild(textarea);
  content.appendChild(footer);
  sticky.appendChild(content);

  setTimeout(function() {
    textarea.focus();
    try {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } catch (e) {}
  }, 0);
}

async function saveStickyEdit(noteId, rawText) {
  var text = String(rawText == null ? '' : rawText).trim();
  if (!text) {
    pageState.editingId = null;
    renderPageNotes();
    return;
  }

  if (text.length > MAX_NOTE_CHARS) {
    await notify({
      title: t('charLimitReached'),
      type: 'warning'
    });
    return;
  }

  var found = false;
  for (var i = 0; i < pageState.notes.length; i++) {
    if (String(pageState.notes[i].id) === String(noteId)) {
      pageState.notes[i].text = text;
      pageState.notes[i].updatedAt = Date.now();
      found = true;
      break;
    }
  }

  pageState.editingId = null;

  if (!found) {
    renderPageNotes();
    return;
  }

  await saveNotes();

  if (pageState.searchQuery) {
    filterNotes(pageState.searchQuery);
  } else {
    pageState.filteredNotes = pageState.notes;
  }

  renderPageNotes();

  await notify({
    title: t('noteUpdated'),
    message: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
    type: 'success'
  });
}

function renderPageNotes() {
  var area = document.getElementById('notes-area');
  if (!area) return;

  area.innerHTML = '';
  updateStatusPill();

  var notesToRender = pageState.searchQuery ? pageState.filteredNotes : pageState.notes;

  if (notesToRender.length === 0) {
    renderEmptyState(area);
    return;
  }

  area.classList.remove('empty');

  var grid = document.createElement('div');
  grid.className = 'notes-grid';

  notesToRender.forEach(function(note, index) {
    var sticky = document.createElement('div');
    var colorIndex = colorIndexFromId(note.id);
    sticky.className = 'sticky-note color-' + colorIndex;
    sticky.setAttribute('data-note-id', String(note.id));

    sticky.style.animationDelay = (index * 0.05) + 's';

    if (pageState.editingId != null && String(pageState.editingId) === String(note.id)) {
      grid.appendChild(sticky);
      buildStickyEditUI(sticky, note);
      return;
    }

    var content = document.createElement('div');
    content.className = 'sticky-content';

    var text = document.createElement('div');
    text.className = 'sticky-text';
    text.textContent = note.text;
    content.appendChild(text);

    var footer = document.createElement('div');
    footer.className = 'sticky-footer';

    if (pageState.settings.showTimestamp) {
      var time = document.createElement('span');
      time.className = 'sticky-time';
      time.textContent = formatTime(noteTimestamp(note));
      footer.appendChild(time);
    } else {
      var spacer = document.createElement('span');
      footer.appendChild(spacer);
    }

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'sticky-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.title = t('delete');
    deleteBtn.setAttribute('aria-label', t('delete'));
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      deletePageNote(note.id);
    });
    footer.appendChild(deleteBtn);

    content.appendChild(footer);
    sticky.appendChild(content);

    sticky.style.cursor = 'pointer';
    sticky.title = t('clickToEdit');

    sticky.addEventListener('click', function(e) {
      if (e.target && e.target.closest && e.target.closest('.sticky-delete')) return;
      pageState.editingId = note.id;
      renderPageNotes();
    });

    grid.appendChild(sticky);
  });

  area.appendChild(grid);
}

async function addPageNote() {
  var input = document.getElementById('page-input');
  var sendBtn = document.getElementById('page-send');
  var charCount = document.getElementById('char-count');

  if (!input) return;

  var text = input.value.trim();
  if (!text) return;

  if (text.length > MAX_NOTE_CHARS) {
    updateCharCount(input, charCount);
    await notify({
      title: t('charLimitReached'),
      type: 'warning'
    });
    return;
  }

  if (pageState.settings.saveHistory === false) {
    input.value = '';
    input.style.height = 'auto';
    if (charCount) {
      charCount.textContent = '0 / ' + MAX_NOTE_CHARS;
      charCount.classList.remove('char-count-limit');
    }
    pageState.notes = [];
    pageState.filteredNotes = [];
    await saveNotes();
    renderPageNotes();
    return;
  }

  if (sendBtn) {
    sendBtn.classList.add('send-flying');
    setTimeout(function() { sendBtn.classList.remove('send-flying'); }, 300);
  }

  var now = Date.now();
  pageState.notes.unshift({
    id: generateNoteId(),
    text: text,
    createdAt: now,
    updatedAt: now
  });

  var trimResult = trimToMaxNotes(pageState.notes, pageState.settings.maxNotes);
  pageState.notes = trimResult.notes;

  input.value = '';
  input.style.height = 'auto';
  if (charCount) {
    charCount.textContent = '0 / ' + MAX_NOTE_CHARS;
    charCount.classList.remove('char-count-limit');
  }

  await saveNotes();

  if (pageState.searchQuery) {
    filterNotes(pageState.searchQuery);
  } else {
    pageState.filteredNotes = pageState.notes;
  }

  renderPageNotes();

  await notify({
    title: t('noteAdded'),
    message: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
    type: 'success'
  });

  if (trimResult.trimmed > 0) {
    await notify({
      title: t('notesTrimmed'),
      message: String(trimResult.trimmed),
      type: 'warning'
    });
  }
}

async function deletePageNote(noteId) {
  pageState.notes = pageState.notes.filter(function(n) {
    return String(n.id) !== String(noteId);
  });
  if (String(pageState.editingId) === String(noteId)) {
    pageState.editingId = null;
  }

  await saveNotes();

  if (pageState.searchQuery) {
    filterNotes(pageState.searchQuery);
  } else {
    pageState.filteredNotes = pageState.notes;
  }

  renderPageNotes();
}

async function clearAllNotes() {
  try {
    var confirmed = await Tapp.ui.confirm(t('clearConfirm'));
    if (!confirmed) return;

    pageState.notes = [];
    pageState.filteredNotes = [];
    pageState.searchQuery = '';
    pageState.editingId = null;

    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    var statusPill = document.getElementById('status-pill');
    var searchToggle = document.getElementById('search-toggle');
    if (statusPill) statusPill.classList.remove('searching');
    if (searchToggle) searchToggle.classList.remove('active');

    await saveNotes();
    renderPageNotes();

    await notify({
      title: t('allCleared'),
      type: 'success'
    });
  } catch (e) {
    console.error('[Notes] 清空失败:', e);
  }
}

function filterNotes(query) {
  pageState.searchQuery = query;

  if (!query) {
    pageState.filteredNotes = pageState.notes;
  } else {
    var lowerQuery = String(query).toLowerCase();
    pageState.filteredNotes = pageState.notes.filter(function(note) {
      return String(note.text).toLowerCase().indexOf(lowerQuery) !== -1;
    });
  }
}

function initPage() {
  var input = document.getElementById('page-input');
  var sendBtn = document.getElementById('page-send');
  var clearBtn = document.getElementById('page-clear');
  var charCount = document.getElementById('char-count');
  var searchInput = document.getElementById('search-input');
  var searchToggle = document.getElementById('search-toggle');
  var statusPill = document.getElementById('status-pill');

  if (input) {
    input.placeholder = t('placeholder');
    input.setAttribute('maxlength', String(MAX_NOTE_CHARS));
  }
  if (sendBtn) sendBtn.title = t('add');
  if (clearBtn) clearBtn.title = t('clearAll');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  if (charCount && input) updateCharCount(input, charCount);

  // 搜索切换按钮
  if (searchToggle && statusPill && searchInput) {
    searchToggle.onclick = function() {
      var isSearching = statusPill.classList.toggle('searching');
      searchToggle.classList.toggle('active', isSearching);

      if (isSearching) {
        setTimeout(function() {
          searchInput.focus();
        }, 150);
      } else {
        searchInput.value = '';
        filterNotes('');
        renderPageNotes();
      }
    };

    searchInput.onkeydown = function(e) {
      if (e.key === 'Escape') {
        statusPill.classList.remove('searching');
        searchToggle.classList.remove('active');
        searchInput.value = '';
        filterNotes('');
        renderPageNotes();
      }
    };
  }

  if (input) {
    input.oninput = function() {
      if (input.value.length > MAX_NOTE_CHARS) {
        input.value = input.value.slice(0, MAX_NOTE_CHARS);
      }
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      updateCharCount(input, charCount);

      if (input.value.length >= MAX_NOTE_CHARS) {
        // 轻量反馈：计数变红即可；粘贴超长时额外提示
      }
    };

    input.onpaste = function() {
      setTimeout(function() {
        if (input.value.length > MAX_NOTE_CHARS) {
          input.value = input.value.slice(0, MAX_NOTE_CHARS);
          updateCharCount(input, charCount);
          notify({
            title: t('charLimitReached'),
            type: 'warning'
          });
        }
      }, 0);
    };

    input.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addPageNote();
      }
    };
  }

  if (sendBtn) {
    sendBtn.onclick = addPageNote;
  }

  if (clearBtn) {
    clearBtn.onclick = clearAllNotes;
  }

  if (searchInput) {
    var searchTimeout;
    searchInput.oninput = function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        filterNotes(searchInput.value.trim());
        renderPageNotes();
      }, 200);
    };
  }

  renderPageNotes();
}

function bindPageStorageSync() {
  if (!Tapp.storage || typeof Tapp.storage.onChanged !== 'function') return;

  Tapp.storage.onChanged(function() {
    if (pageState.syncing) return;
    loadPageData().then(function() {
      if (pageState.searchQuery) {
        filterNotes(pageState.searchQuery);
      } else {
        pageState.filteredNotes = pageState.notes;
      }
      // 外部变更时退出编辑，避免脏写
      pageState.editingId = null;
      renderPageNotes();
    }).catch(function() {});
  });
}

function bindThemeListeners(initialTheme, initialPrimary) {
  if (initialTheme) applyTheme(initialTheme);
  if (initialPrimary) applyPrimaryColor(initialPrimary);

  try {
    if (Tapp.ui && typeof Tapp.ui.onThemeChange === 'function') {
      Tapp.ui.onThemeChange(function(theme) {
        applyTheme(theme);
      });
    }
  } catch (e) {}

  try {
    if (Tapp.ui && typeof Tapp.ui.onPrimaryColorChange === 'function') {
      Tapp.ui.onPrimaryColorChange(function(color) {
        applyPrimaryColor(color);
      });
    }
  } catch (e) {}
}

// ========================================
// 生命周期入口
// ========================================

(function() {
  var mode = window._TAPP_MODE;
  var hasHtml = window._TAPP_HAS_HTML;

  if (mode === 'widget') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWidget);
    } else {
      setTimeout(initWidget, 0);
    }
  } else if (mode === 'page' || hasHtml) {
    Tapp.lifecycle.onReady(async function() {
      try {
        var localePromise = Tapp.ui.getLocale();
        var themePromise = (Tapp.ui.getTheme && Tapp.ui.getTheme()) || Promise.resolve('light');
        var primaryPromise = (Tapp.ui.getPrimaryColor && Tapp.ui.getPrimaryColor()) || Promise.resolve(null);

        var results = await Promise.all([
          localePromise,
          themePromise,
          primaryPromise
        ]);

        currentLocale = normalizeLocale(results[0]);
        bindThemeListeners(results[1], results[2]);
        await loadPageData();
        initPage();
        bindPageStorageSync();

        Tapp.ui.onLocaleChange(function(locale) {
          currentLocale = normalizeLocale(locale);
          initPage();
        });
      } catch (err) {
        console.error('[Notes] 初始化失败:', err);
        try {
          await loadPageData();
        } catch (e) {}
        initPage();
        bindPageStorageSync();
      }
    });

    Tapp.lifecycle.onDestroy(async function() {
      await saveNotes();
    });
  }
})();
