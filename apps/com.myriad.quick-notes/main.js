// Quick Notes Tapp v1.0.0
// 便携便签

// ========================================
// 常量
// ========================================

var MAX_NOTE_CHARS = 500;
var STICKY_COLOR_COUNT = 6;
var EXPORT_VERSION = 1;
var DEFAULT_SORT = 'newest';

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
    emptyCta: '写一条便签',
    searchEmptyTitle: '无匹配笔记',
    searchEmptySubtitle: '试试其他关键词',
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
    clickToExpand: '点击展开',
    longNoteHint: '更多',
    pin: '置顶',
    unpin: '取消置顶',
    pinned: '已置顶',
    notePinned: '已置顶',
    noteUnpinned: '已取消置顶',
    copy: '复制',
    noteCopied: '已复制到剪贴板',
    copyFailed: '复制失败',
    expand: '展开',
    close: '关闭',
    edit: '编辑',
    color: '颜色',
    more: '更多',
    search: '搜索',
    sort: '排序',
    export: '导出',
    import: '导入',
    exportSuccess: '笔记已导出',
    exportFailed: '导出失败',
    importSuccess: '导入成功',
    importFailed: '导入失败',
    importEmpty: '没有可导入的笔记',
    importMergeConfirm: '合并导入到现有笔记？取消则选择替换。',
    importReplaceConfirm: '确定用导入内容替换全部现有笔记吗？此操作不可撤销。',
    importPasteTitle: '粘贴 JSON 导入',
    importPasteHint: '粘贴导出的 JSON，或选择文件',
    chooseFile: '选择文件',
    pasteImport: '粘贴导入',
    sortNewest: '最新',
    sortOldest: '最早',
    sortUpdated: '更新',
    moreOverflow: '更多'
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
    emptyCta: 'Write a note',
    searchEmptyTitle: 'No matching notes',
    searchEmptySubtitle: 'Try a different keyword',
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
    clickToExpand: 'Tap to expand',
    longNoteHint: 'More',
    pin: 'Pin',
    unpin: 'Unpin',
    pinned: 'Pinned',
    notePinned: 'Pinned',
    noteUnpinned: 'Unpinned',
    copy: 'Copy',
    noteCopied: 'Copied to clipboard',
    copyFailed: 'Copy failed',
    expand: 'Expand',
    close: 'Close',
    edit: 'Edit',
    color: 'Color',
    more: 'More',
    search: 'Search',
    sort: 'Sort',
    export: 'Export',
    import: 'Import',
    exportSuccess: 'Notes exported',
    exportFailed: 'Export failed',
    importSuccess: 'Import successful',
    importFailed: 'Import failed',
    importEmpty: 'No notes to import',
    importMergeConfirm: 'Merge into existing notes? Cancel to replace instead.',
    importReplaceConfirm: 'Replace all existing notes with imported data? This cannot be undone.',
    importPasteTitle: 'Paste JSON to import',
    importPasteHint: 'Paste exported JSON, or pick a file',
    chooseFile: 'Choose file',
    pasteImport: 'Import paste',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortUpdated: 'Updated',
    moreOverflow: 'more'
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
    emptyCta: 'メモを書く',
    searchEmptyTitle: '一致するメモがありません',
    searchEmptySubtitle: '別のキーワードを試してください',
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
    clickToExpand: 'タップして展開',
    longNoteHint: '続き',
    pin: '固定',
    unpin: '固定解除',
    pinned: '固定中',
    notePinned: '固定しました',
    noteUnpinned: '固定を解除しました',
    copy: 'コピー',
    noteCopied: 'クリップボードにコピーしました',
    copyFailed: 'コピーに失敗しました',
    expand: '展開',
    close: '閉じる',
    edit: '編集',
    color: '色',
    more: 'その他',
    search: '検索',
    sort: '並び替え',
    export: 'エクスポート',
    import: 'インポート',
    exportSuccess: 'メモをエクスポートしました',
    exportFailed: 'エクスポートに失敗しました',
    importSuccess: 'インポート成功',
    importFailed: 'インポートに失敗しました',
    importEmpty: 'インポートできるメモがありません',
    importMergeConfirm: '既存のメモにマージしますか？キャンセルで置き換えを選択します。',
    importReplaceConfirm: '既存のメモをすべて置き換えますか？この操作は元に戻せません。',
    importPasteTitle: 'JSON を貼り付けてインポート',
    importPasteHint: 'エクスポートした JSON を貼り付けるか、ファイルを選択',
    chooseFile: 'ファイル選択',
    pasteImport: '貼り付けインポート',
    sortNewest: '新しい順',
    sortOldest: '古い順',
    sortUpdated: '更新順',
    moreOverflow: '件以上'
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

var SVG_NS = 'http://www.w3.org/2000/svg';

/** Stroke/fill icon path defs (24×24). Keys used by createSvgIcon. */
var SVG_ICON_DEFS = {
  note: {
    paths: [
      'M8 2v3M16 2v3M3 9h18',
      'M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5z',
      'M8 14h4M8 18h8'
    ]
  },
  search: {
    circles: [{ cx: 11, cy: 11, r: 8 }],
    paths: ['M21 21l-4.35-4.35']
  },
  pin: {
    // Pushpin — readable at 10–12px badge sizes
    strokeWidth: '2',
    paths: [
      'M12 17v5',
      'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'
    ]
  },
  pinOff: {
    strokeWidth: '2',
    paths: [
      'M12 17v5',
      'M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89',
      'M2 2l20 20',
      'M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11'
    ]
  },
  copy: {
    paths: [
      'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
      'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z'
    ]
  },
  expand: {
    paths: [
      'M15 3h6v6',
      'M9 21H3v-6',
      'M21 3l-7 7',
      'M3 21l7-7'
    ]
  },
  edit: {
    paths: [
      'M12 20h9',
      'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'
    ]
  },
  delete: {
    paths: [
      'M3 6h18',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6M14 11v6'
    ]
  },
  close: {
    paths: ['M18 6L6 18M6 6l12 12']
  },
  more: {
    fill: true,
    circles: [
      { cx: 5, cy: 12, r: 1.8 },
      { cx: 12, cy: 12, r: 1.8 },
      { cx: 19, cy: 12, r: 1.8 }
    ]
  },
  export: {
    paths: [
      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
      'M17 8l-5-5-5 5',
      'M12 3v12'
    ]
  },
  import: {
    paths: [
      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
      'M7 10l5 5 5-5',
      'M12 15V3'
    ]
  },
  clear: {
    paths: [
      'M3 6h18',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'
    ]
  },
  color: {
    paths: [
      'M12 3a9 9 0 1 0 0 18c.8 0 1.4-.6 1.4-1.3 0-.4-.15-.7-.35-1-.2-.3-.35-.65-.35-1.05A1.5 1.5 0 0 1 14.2 16H16a5 5 0 0 0 0-10h-.5'
    ],
    circles: [
      { cx: 7.5, cy: 11.5, r: 1.2, fill: true },
      { cx: 10.5, cy: 8, r: 1.2, fill: true },
      { cx: 14.5, cy: 8, r: 1.2, fill: true }
    ]
  },
  add: {
    paths: ['M12 5v14M5 12h14']
  },
  plus: {
    paths: ['M12 5v14M5 12h14']
  },
  check: {
    paths: ['M20 6L9 17l-5-5']
  }
};

/**
 * Create a decorative SVG icon element (aria-hidden).
 * @param {string} name - key in SVG_ICON_DEFS
 * @param {number} [size=16]
 * @returns {SVGElement}
 */
function createSvgIcon(name, size) {
  size = size == null ? 16 : size;
  var def = SVG_ICON_DEFS[name] || SVG_ICON_DEFS.note;
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'svg-icon svg-icon-' + name);

  if (def.fill) {
    svg.setAttribute('fill', 'currentColor');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', def.strokeWidth || '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }

  var i;
  var paths = def.paths || [];
  for (i = 0; i < paths.length; i++) {
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', paths[i]);
    if (def.fill) path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
  }

  var circles = def.circles || [];
  for (i = 0; i < circles.length; i++) {
    var c = circles[i];
    var circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(c.cx));
    circle.setAttribute('cy', String(c.cy));
    circle.setAttribute('r', String(c.r));
    if (def.fill || c.fill) {
      circle.setAttribute('fill', 'currentColor');
      if (!def.fill) circle.setAttribute('stroke', 'none');
    }
    svg.appendChild(circle);
  }

  return svg;
}

/** Alias for createSvgIcon */
function svgIcon(name, size) {
  return createSvgIcon(name, size);
}

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
  return Math.abs(hash) % STICKY_COLOR_COUNT;
}

function normalizeColorIndex(color) {
  if (color == null || color === '') return null;
  var n = parseInt(color, 10);
  if (isNaN(n) || n < 0 || n >= STICKY_COLOR_COUNT) return null;
  return n;
}

function getNoteColorIndex(note) {
  if (!note) return 0;
  var c = normalizeColorIndex(note.color);
  if (c != null) return c;
  return colorIndexFromId(note.id);
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

function normalizeSortOrder(value) {
  var v = String(value || DEFAULT_SORT);
  if (v === 'oldest' || v === 'updated' || v === 'newest') return v;
  return DEFAULT_SORT;
}

function normalizeNotes(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var n = raw[i];
    if (!n || typeof n !== 'object' || n.text == null) continue;
    var note = {
      id: n.id != null ? n.id : generateNoteId(),
      text: clampNoteText(String(n.text)),
      createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
      updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : (typeof n.createdAt === 'number' ? n.createdAt : Date.now()),
      pinned: !!n.pinned
    };
    var color = normalizeColorIndex(n.color);
    if (color != null) note.color = color;
    out.push(note);
  }
  return out;
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

function compareNotes(a, b, sortBy) {
  var ap = a && a.pinned ? 1 : 0;
  var bp = b && b.pinned ? 1 : 0;
  if (ap !== bp) return bp - ap;

  var order = normalizeSortOrder(sortBy);
  if (order === 'oldest') {
    return (a.createdAt || 0) - (b.createdAt || 0);
  }
  if (order === 'updated') {
    return noteTimestamp(b) - noteTimestamp(a);
  }
  // newest
  return (b.createdAt || 0) - (a.createdAt || 0);
}

function sortNotesList(notes, sortBy) {
  var list = (notes || []).slice();
  list.sort(function(a, b) {
    return compareNotes(a, b, sortBy);
  });
  return list;
}

function applySortAndTrim(notes, settings) {
  var sortBy = settings && settings.sortOrder ? settings.sortOrder : DEFAULT_SORT;
  var sorted = sortNotesList(notes, sortBy);
  return trimToMaxNotes(sorted, settings && settings.maxNotes);
}

function isNoteLong(text) {
  var s = String(text == null ? '' : text);
  return s.length > 120 || s.split('\n').length > 4;
}

function copyTextToClipboard(text) {
  var value = String(text == null ? '' : text);

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(value).then(function() {
      return true;
    }).catch(function() {
      return fallbackCopyText(value);
    });
  }

  return Promise.resolve(fallbackCopyText(value));
}

function fallbackCopyText(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try {
      ok = document.execCommand && document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) {
    return false;
  }
}

async function downloadJsonFile(filename, content) {
  var body = String(content == null ? '' : content);

  try {
    if (typeof Tapp !== 'undefined' && Tapp.file && typeof Tapp.file.download === 'function') {
      await Tapp.file.download(body, filename, 'application/json');
      return true;
    }
  } catch (e) {
    console.error('[Notes] Tapp.file.download failed:', e);
  }

  try {
    var blob = new Blob([body], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() {
      try { URL.revokeObjectURL(url); } catch (e2) {}
    }, 1000);
    return true;
  } catch (e) {
    console.error('[Notes] blob download failed:', e);
    return false;
  }
}

function findNoteById(notes, noteId) {
  for (var i = 0; i < notes.length; i++) {
    if (String(notes[i].id) === String(noteId)) return notes[i];
  }
  return null;
}

function buildColorPalette(selectedColor, onSelect) {
  var wrap = document.createElement('div');
  wrap.className = 'color-palette';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', t('color'));

  for (var i = 0; i < STICKY_COLOR_COUNT; i++) {
    (function(colorIndex) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-swatch color-' + colorIndex;
      if (selectedColor === colorIndex) {
        btn.classList.add('selected');
      }
      btn.setAttribute('aria-label', t('color') + ' ' + (colorIndex + 1));
      btn.title = t('color') + ' ' + (colorIndex + 1);
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (typeof onSelect === 'function') onSelect(colorIndex);
      });
      wrap.appendChild(btn);
    })(i);
  }

  return wrap;
}

// ========================================
// Widget 状态
// ========================================

var widgetState = {
  notes: [],
  settings: { maxNotes: 100, showTimestamp: true, saveHistory: true, sortOrder: DEFAULT_SORT },
  size: '4x2',
  syncing: false
};

// ========================================
// Widget 初始化 - 通用
// ========================================

function normalizeWidgetSize(size) {
  if (size === '4x4' || size === '4x2') return size;
  return '4x2';
}

async function initWidget() {
  var props = window._TAPP_WIDGET_PROPS || {};
  var size = normalizeWidgetSize(props.size);
  widgetState.size = size;
  currentLocale = normalizeLocale(props.locale);

  if (props.theme) {
    applyTheme(props.theme);
  }
  if (props.primaryColor) {
    applyPrimaryColor(props.primaryColor);
  }

  await loadWidgetData();

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

  if (addBtn) {
    addBtn.title = t('add');
    addBtn.setAttribute('aria-label', t('add'));
  }

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
      widgetState.settings.sortOrder = normalizeSortOrder(widgetState.settings.sortOrder);
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

  size = normalizeWidgetSize(size || widgetState.size);
  listEl.innerHTML = '';

  if (countEl) countEl.textContent = widgetState.notes.length;

  if (widgetState.notes.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'notes-empty';
    var emptyIcon = document.createElement('span');
    emptyIcon.className = 'empty-icon';
    emptyIcon.appendChild(createSvgIcon('note', size === '4x4' ? 28 : 24));
    var emptyText = document.createElement('span');
    emptyText.className = 'empty-text';
    emptyText.textContent = t('emptyTitle');
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    listEl.appendChild(empty);
    return;
  }

  // 4x2: glanceable strip (~3–4); 4x4: mini board (~6)
  var maxDisplay = size === '4x4' ? 6 : 4;
  var isBoard = size === '4x4';
  var sorted = sortNotesList(widgetState.notes, widgetState.settings.sortOrder);
  var displayNotes = sorted.slice(0, maxDisplay);

  displayNotes.forEach(function(note) {
    var item = document.createElement('div');
    if (isBoard) {
      item.className = 'mini-sticky color-' + getNoteColorIndex(note);
    } else {
      item.className = 'note-row';
    }
    if (note.pinned) item.classList.add('pinned');

    if (note.pinned) {
      var pinBadge = document.createElement('span');
      pinBadge.className = 'note-pin-badge';
      pinBadge.title = t('pinned');
      pinBadge.setAttribute('aria-label', t('pinned'));
      pinBadge.appendChild(createSvgIcon('pin', isBoard ? 11 : 10));
      item.appendChild(pinBadge);
    }

    var text = document.createElement('div');
    text.className = 'note-text';
    text.textContent = note.text;
    item.appendChild(text);

    // Timestamp only on 4x4 board (space for glance + board density)
    if (isBoard && widgetState.settings.showTimestamp) {
      var time = document.createElement('div');
      time.className = 'note-time';
      time.textContent = formatTime(noteTimestamp(note));
      item.appendChild(time);
    }

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-delete';
    deleteBtn.type = 'button';
    deleteBtn.title = t('delete');
    deleteBtn.setAttribute('aria-label', t('delete'));
    deleteBtn.appendChild(createSvgIcon('close', 12));
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteWidgetNote(note.id, size);
    });

    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });

  if (sorted.length > maxDisplay) {
    var overflow = sorted.length - maxDisplay;
    var more = document.createElement('div');
    more.className = 'notes-more';
    more.textContent = '+' + overflow + ' ' + t('moreOverflow');
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
    updatedAt: now,
    pinned: false
  });

  var trimResult = applySortAndTrim(widgetState.notes, widgetState.settings);
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
  settings: { maxNotes: 100, showTimestamp: true, saveHistory: true, sortOrder: DEFAULT_SORT },
  editingId: null,
  expandingId: null,
  draftColor: 0,
  paletteOpen: false,
  menuOpen: false,
  skipCardAnimation: false,
  syncing: false
};

// ========================================
// Page 数据
// ========================================

async function loadPageData() {
  try {
    var savedSettings = await Tapp.settings.getAll();
    if (savedSettings) {
      Object.assign(pageState.settings, savedSettings);
      pageState.settings.sortOrder = normalizeSortOrder(pageState.settings.sortOrder);
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

function refreshFilteredNotes() {
  if (pageState.searchQuery) {
    filterNotes(pageState.searchQuery);
  } else {
    pageState.filteredNotes = pageState.notes;
  }
}

function getDisplayNotes() {
  var source = pageState.searchQuery ? pageState.filteredNotes : pageState.notes;
  return sortNotesList(source, pageState.settings.sortOrder);
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

  // 仅在聚焦、接近上限、或已输入较多时显示字数
  var focused = false;
  try {
    focused = document.activeElement === input;
  } catch (e) {}
  var show = focused || len > 400 || len >= MAX_NOTE_CHARS;
  if (show) {
    charCount.classList.add('char-count-visible');
  } else {
    charCount.classList.remove('char-count-visible');
  }
}

function focusPageInput() {
  var input = document.getElementById('page-input');
  if (!input) return;
  try {
    input.focus();
    input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (e) {
    try { input.focus(); } catch (e2) {}
  }
}

function renderEmptyState(area, isSearch) {
  area.classList.add('empty');

  var empty = document.createElement('div');
  empty.className = 'notes-empty-state';

  var icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.appendChild(createSvgIcon(isSearch ? 'search' : 'note', 40));

  var title = document.createElement('div');
  title.className = 'empty-title';
  title.textContent = isSearch ? t('searchEmptyTitle') : t('emptyTitle');

  var subtitle = document.createElement('div');
  subtitle.className = 'empty-subtitle';
  subtitle.textContent = isSearch ? t('searchEmptySubtitle') : t('emptySubtitle');

  empty.appendChild(icon);
  empty.appendChild(title);
  empty.appendChild(subtitle);

  if (!isSearch) {
    var cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'empty-cta';
    cta.textContent = t('emptyCta');
    cta.addEventListener('click', function(e) {
      e.preventDefault();
      focusPageInput();
    });
    empty.appendChild(cta);
  }

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

  var editColor = getNoteColorIndex(note);

  var palette = buildColorPalette(editColor, function(colorIndex) {
    editColor = colorIndex;
    sticky.className = 'sticky-note editing color-' + colorIndex;
    sticky.classList.add('editing');
    var swatches = palette.querySelectorAll('.color-swatch');
    for (var i = 0; i < swatches.length; i++) {
      if (i === colorIndex) swatches[i].classList.add('selected');
      else swatches[i].classList.remove('selected');
    }
  });

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
    saveStickyEdit(note.id, textarea.value, editColor);
  });

  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      pageState.editingId = null;
      renderPageNotes();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveStickyEdit(note.id, textarea.value, editColor);
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
  content.appendChild(palette);
  content.appendChild(footer);
  sticky.appendChild(content);

  setTimeout(function() {
    textarea.focus();
    try {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } catch (e) {}
  }, 0);
}

async function saveStickyEdit(noteId, rawText, colorIndex) {
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
      var c = normalizeColorIndex(colorIndex);
      if (c != null) pageState.notes[i].color = c;
      found = true;
      break;
    }
  }

  pageState.editingId = null;

  if (!found) {
    renderPageNotes();
    return;
  }

  var trimResult = applySortAndTrim(pageState.notes, pageState.settings);
  pageState.notes = trimResult.notes;

  await saveNotes();
  refreshFilteredNotes();
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
  updateCreateColorPalette();
  updateOverflowMenuLabels();

  var notesToRender = getDisplayNotes();
  var skipAnim = pageState.skipCardAnimation || !!pageState.searchQuery;

  if (notesToRender.length === 0) {
    renderEmptyState(area, !!pageState.searchQuery);
    renderExpandOverlay();
    pageState.skipCardAnimation = false;
    return;
  }

  area.classList.remove('empty');

  var grid = document.createElement('div');
  grid.className = 'notes-grid';

  notesToRender.forEach(function(note, index) {
    var sticky = document.createElement('div');
    var colorIndex = getNoteColorIndex(note);
    sticky.className = 'sticky-note color-' + colorIndex;
    if (note.pinned) sticky.classList.add('pinned');
    if (skipAnim) sticky.classList.add('no-animate');
    sticky.setAttribute('data-note-id', String(note.id));
    if (!skipAnim) {
      sticky.style.animationDelay = (index * 0.05) + 's';
    }

    if (pageState.editingId != null && String(pageState.editingId) === String(note.id)) {
      grid.appendChild(sticky);
      buildStickyEditUI(sticky, note);
      return;
    }

    var content = document.createElement('div');
    content.className = 'sticky-content';

    if (note.pinned) {
      var pinMark = document.createElement('span');
      pinMark.className = 'sticky-pin-mark';
      pinMark.title = t('pinned');
      pinMark.setAttribute('aria-label', t('pinned'));
      pinMark.appendChild(createSvgIcon('pin', 12));
      sticky.appendChild(pinMark);
    }

    var text = document.createElement('div');
    text.className = 'sticky-text';
    var longNote = isNoteLong(note.text);
    if (longNote) text.classList.add('sticky-text-long');
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

    if (longNote) {
      var hint = document.createElement('span');
      hint.className = 'sticky-long-hint';
      hint.textContent = t('longNoteHint') + '…';
      footer.appendChild(hint);
    }

    content.appendChild(footer);
    sticky.appendChild(content);

    sticky.title = t('clickToExpand');
    sticky.setAttribute('role', 'button');
    sticky.setAttribute('tabindex', '0');
    sticky.setAttribute('aria-label', t('expand'));

    sticky.addEventListener('click', function() {
      openNoteExpand(note.id);
    });

    sticky.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openNoteExpand(note.id);
      }
    });

    grid.appendChild(sticky);
  });

  area.appendChild(grid);
  renderExpandOverlay();
  pageState.skipCardAnimation = false;
}

function renderExpandOverlay() {
  var existing = document.getElementById('note-expand-overlay');
  if (existing) existing.parentNode.removeChild(existing);

  if (pageState.expandingId == null) return;

  var note = findNoteById(pageState.notes, pageState.expandingId);
  if (!note) {
    pageState.expandingId = null;
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'note-expand-overlay';
  overlay.className = 'note-expand-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  var card = document.createElement('div');
  card.className = 'note-expand-card color-' + getNoteColorIndex(note);

  var header = document.createElement('div');
  header.className = 'note-expand-header';

  var headerLeft = document.createElement('div');
  headerLeft.className = 'note-expand-meta';
  if (note.pinned) {
    var pin = document.createElement('span');
    pin.className = 'note-expand-pin';
    pin.appendChild(createSvgIcon('pin', 12));
    var pinLabel = document.createElement('span');
    pinLabel.textContent = t('pinned');
    pin.appendChild(pinLabel);
    headerLeft.appendChild(pin);
  }
  if (pageState.settings.showTimestamp) {
    var time = document.createElement('span');
    time.className = 'note-expand-time';
    time.textContent = formatTime(noteTimestamp(note));
    headerLeft.appendChild(time);
  }

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'note-expand-close';
  closeBtn.title = t('close');
  closeBtn.setAttribute('aria-label', t('close'));
  closeBtn.appendChild(createSvgIcon('close', 16));
  closeBtn.addEventListener('click', function() {
    closeNoteExpand();
  });

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);

  var body = document.createElement('div');
  body.className = 'note-expand-body';
  body.textContent = note.text;

  var actions = document.createElement('div');
  actions.className = 'note-expand-actions';

  var pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'sticky-edit-btn';
  pinBtn.textContent = note.pinned ? t('unpin') : t('pin');
  pinBtn.setAttribute('aria-label', note.pinned ? t('unpin') : t('pin'));
  pinBtn.addEventListener('click', function() {
    togglePinNote(note.id);
  });

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'sticky-edit-btn';
  copyBtn.textContent = t('copy');
  copyBtn.setAttribute('aria-label', t('copy'));
  copyBtn.addEventListener('click', function() {
    copyNoteText(note.text);
  });

  var editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'sticky-edit-btn sticky-edit-save';
  editBtn.textContent = t('edit');
  editBtn.setAttribute('aria-label', t('edit'));
  editBtn.addEventListener('click', function() {
    pageState.expandingId = null;
    pageState.editingId = note.id;
    renderPageNotes();
  });

  var deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'sticky-edit-btn sticky-edit-danger';
  deleteBtn.textContent = t('delete');
  deleteBtn.setAttribute('aria-label', t('delete'));
  deleteBtn.addEventListener('click', function() {
    pageState.expandingId = null;
    deletePageNote(note.id);
  });

  actions.appendChild(pinBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(actions);
  overlay.appendChild(card);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeNoteExpand();
  });

  try {
    document.removeEventListener('keydown', expandEscHandler);
  } catch (e) {}
  document.addEventListener('keydown', expandEscHandler);

  var content = document.getElementById('tapp-content') || document.body;
  content.appendChild(overlay);
}

function expandEscHandler(e) {
  if (e.key === 'Escape' && pageState.expandingId != null) {
    closeNoteExpand();
  }
}

function openNoteExpand(noteId) {
  pageState.editingId = null;
  pageState.expandingId = noteId;
  renderPageNotes();
}

function closeNoteExpand() {
  pageState.expandingId = null;
  try {
    document.removeEventListener('keydown', expandEscHandler);
  } catch (e) {}
  var existing = document.getElementById('note-expand-overlay');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  renderPageNotes();
}

async function copyNoteText(text) {
  var ok = await copyTextToClipboard(text);
  if (ok) {
    await notify({
      title: t('noteCopied'),
      type: 'success'
    });
  } else {
    await notify({
      title: t('copyFailed'),
      type: 'error'
    });
  }
}

async function togglePinNote(noteId) {
  var note = findNoteById(pageState.notes, noteId);
  if (!note) return;

  note.pinned = !note.pinned;
  // pin 状态变更不改 updatedAt，避免「最近更新」被置顶打乱

  var trimResult = applySortAndTrim(pageState.notes, pageState.settings);
  pageState.notes = trimResult.notes;

  await saveNotes();
  refreshFilteredNotes();
  renderPageNotes();

  await notify({
    title: note.pinned ? t('notePinned') : t('noteUnpinned'),
    type: 'success'
  });
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
    updateCharCount(input, charCount);
    pageState.notes = [];
    pageState.filteredNotes = [];
    setPaletteOpen(false);
    await saveNotes();
    renderPageNotes();
    return;
  }

  if (sendBtn) {
    sendBtn.classList.add('send-flying');
    setTimeout(function() { sendBtn.classList.remove('send-flying'); }, 300);
  }

  var now = Date.now();
  var color = normalizeColorIndex(pageState.draftColor);
  if (color == null) color = 0;

  pageState.notes.unshift({
    id: generateNoteId(),
    text: text,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    color: color
  });

  var trimResult = applySortAndTrim(pageState.notes, pageState.settings);
  pageState.notes = trimResult.notes;

  input.value = '';
  input.style.height = 'auto';
  updateCharCount(input, charCount);
  setPaletteOpen(false);

  await saveNotes();
  refreshFilteredNotes();
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
  var removed = findNoteById(pageState.notes, noteId);
  pageState.notes = pageState.notes.filter(function(n) {
    return String(n.id) !== String(noteId);
  });
  if (String(pageState.editingId) === String(noteId)) {
    pageState.editingId = null;
  }
  if (String(pageState.expandingId) === String(noteId)) {
    pageState.expandingId = null;
  }

  await saveNotes();
  refreshFilteredNotes();
  renderPageNotes();

  await notify({
    title: t('noteDeleted'),
    message: removed ? (String(removed.text).substring(0, 30) + (String(removed.text).length > 30 ? '...' : '')) : '',
    type: 'success'
  });
}

async function clearAllNotes() {
  try {
    var confirmed = await Tapp.ui.confirm(t('clearConfirm'));
    if (!confirmed) return;

    pageState.notes = [];
    pageState.filteredNotes = [];
    pageState.searchQuery = '';
    pageState.editingId = null;
    pageState.expandingId = null;

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

// ========================================
// Export / Import
// ========================================

async function exportNotes() {
  try {
    if (pageState.settings.saveHistory === false) {
      await notify({ title: t('exportFailed'), type: 'warning' });
      return;
    }

    var payload = {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      notes: pageState.notes
    };
    var json = JSON.stringify(payload, null, 2);
    var stamp = new Date().toISOString().slice(0, 10);
    var ok = await downloadJsonFile('quick-notes-' + stamp + '.json', json);
    if (ok) {
      await notify({ title: t('exportSuccess'), type: 'success' });
    } else {
      await notify({ title: t('exportFailed'), type: 'error' });
    }
  } catch (e) {
    console.error('[Notes] export failed:', e);
    await notify({ title: t('exportFailed'), type: 'error' });
  }
}

function parseImportPayload(raw) {
  var data = raw;
  if (typeof raw === 'string') {
    data = JSON.parse(raw);
  }
  if (!data) throw new Error('empty');

  var list = null;
  if (Array.isArray(data)) {
    list = data;
  } else if (data.notes && Array.isArray(data.notes)) {
    list = data.notes;
  } else {
    throw new Error('invalid');
  }

  return normalizeNotes(list);
}

function mergeImportedNotes(existing, incoming) {
  var byId = {};
  var result = [];
  var i;

  for (i = 0; i < existing.length; i++) {
    byId[String(existing[i].id)] = existing[i];
    result.push(existing[i]);
  }

  for (i = 0; i < incoming.length; i++) {
    var note = incoming[i];
    var key = String(note.id);
    if (byId[key]) {
      // 同 id：保留更新时间较新的
      if (noteTimestamp(note) >= noteTimestamp(byId[key])) {
        var idx = -1;
        for (var j = 0; j < result.length; j++) {
          if (String(result[j].id) === key) {
            idx = j;
            break;
          }
        }
        if (idx >= 0) {
          result[idx] = note;
          byId[key] = note;
        }
      }
    } else {
      byId[key] = note;
      result.push(note);
    }
  }

  return result;
}

async function applyImportedNotes(incoming, mode) {
  if (!incoming || !incoming.length) {
    await notify({ title: t('importEmpty'), type: 'warning' });
    return;
  }

  if (pageState.settings.saveHistory === false) {
    await notify({ title: t('importFailed'), type: 'warning' });
    return;
  }

  var next;
  if (mode === 'replace') {
    next = incoming.slice();
  } else {
    next = mergeImportedNotes(pageState.notes, incoming);
  }

  var trimResult = applySortAndTrim(next, pageState.settings);
  pageState.notes = trimResult.notes;
  pageState.editingId = null;
  pageState.expandingId = null;

  await saveNotes();
  refreshFilteredNotes();
  renderPageNotes();

  await notify({
    title: t('importSuccess'),
    message: String(incoming.length),
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

async function importNotesFromText(rawText) {
  try {
    var incoming = parseImportPayload(rawText);
    if (!incoming.length) {
      await notify({ title: t('importEmpty'), type: 'warning' });
      return;
    }

    var merge = true;
    if (pageState.notes.length > 0) {
      try {
        // confirm=true → merge; false → ask replace
        merge = await Tapp.ui.confirm(t('importMergeConfirm'));
      } catch (e) {
        merge = true;
      }

      if (!merge) {
        var replaceOk = false;
        try {
          replaceOk = await Tapp.ui.confirm(t('importReplaceConfirm'));
        } catch (e2) {
          replaceOk = false;
        }
        if (!replaceOk) return;
        await applyImportedNotes(incoming, 'replace');
        return;
      }
    }

    await applyImportedNotes(incoming, 'merge');
  } catch (e) {
    console.error('[Notes] import failed:', e);
    await notify({ title: t('importFailed'), type: 'error' });
  }
}

function openImportDialog() {
  var existing = document.getElementById('note-import-overlay');
  if (existing) existing.parentNode.removeChild(existing);

  var overlay = document.createElement('div');
  overlay.id = 'note-import-overlay';
  overlay.className = 'note-import-overlay';

  var card = document.createElement('div');
  card.className = 'note-import-card';

  var title = document.createElement('div');
  title.className = 'note-import-title';
  title.textContent = t('importPasteTitle');

  var hint = document.createElement('div');
  hint.className = 'note-import-hint';
  hint.textContent = t('importPasteHint');

  var textarea = document.createElement('textarea');
  textarea.className = 'note-import-textarea';
  textarea.setAttribute('rows', '8');
  textarea.placeholder = '{"version":1,"notes":[...]}';

  var fileRow = document.createElement('div');
  fileRow.className = 'note-import-file-row';

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json,text/plain';
  fileInput.className = 'note-import-file';
  fileInput.addEventListener('change', function() {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      textarea.value = String(reader.result || '');
    };
    reader.onerror = function() {
      notify({ title: t('importFailed'), type: 'error' });
    };
    reader.readAsText(file);
  });

  var fileBtn = document.createElement('button');
  fileBtn.type = 'button';
  fileBtn.className = 'sticky-edit-btn';
  fileBtn.textContent = t('chooseFile');
  fileBtn.addEventListener('click', function() {
    fileInput.click();
  });

  fileRow.appendChild(fileBtn);
  fileRow.appendChild(fileInput);

  var actions = document.createElement('div');
  actions.className = 'note-import-actions';

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'sticky-edit-btn sticky-edit-cancel';
  cancelBtn.textContent = t('cancel');
  cancelBtn.addEventListener('click', function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });

  var importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'sticky-edit-btn sticky-edit-save';
  importBtn.textContent = t('import');
  importBtn.addEventListener('click', function() {
    var text = textarea.value.trim();
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    importNotesFromText(text);
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(importBtn);

  card.appendChild(title);
  card.appendChild(hint);
  card.appendChild(textarea);
  card.appendChild(fileRow);
  card.appendChild(actions);
  overlay.appendChild(card);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });

  var content = document.getElementById('tapp-content') || document.body;
  content.appendChild(overlay);
  setTimeout(function() { textarea.focus(); }, 0);
}

// ========================================
// UI helpers
// ========================================

function updateColorToggleSwatch() {
  var swatch = document.getElementById('color-toggle-swatch');
  var toggle = document.getElementById('color-toggle');
  if (swatch) {
    swatch.className = 'color-toggle-swatch color-' + (normalizeColorIndex(pageState.draftColor) != null ? pageState.draftColor : 0);
  }
  if (toggle) {
    if (pageState.paletteOpen) {
      toggle.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }
}

function updateCreateColorPalette() {
  var host = document.getElementById('create-color-palette');
  if (!host) return;

  updateColorToggleSwatch();

  if (!pageState.paletteOpen) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }

  host.hidden = false;
  host.innerHTML = '';
  var palette = buildColorPalette(pageState.draftColor, function(colorIndex) {
    pageState.draftColor = colorIndex;
    updateCreateColorPalette();
  });
  host.appendChild(palette);
}

function setPaletteOpen(open) {
  pageState.paletteOpen = !!open;
  updateCreateColorPalette();
}

function closeOverflowMenu() {
  pageState.menuOpen = false;
  var menu = document.getElementById('page-menu');
  var toggle = document.getElementById('page-menu-toggle');
  if (menu) menu.hidden = true;
  if (toggle) {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }
}

function openOverflowMenu() {
  pageState.menuOpen = true;
  var menu = document.getElementById('page-menu');
  var toggle = document.getElementById('page-menu-toggle');
  updateOverflowMenuLabels();
  if (menu) menu.hidden = false;
  if (toggle) {
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
  }
}

function toggleOverflowMenu() {
  if (pageState.menuOpen) {
    closeOverflowMenu();
  } else {
    openOverflowMenu();
  }
}

function updateOverflowMenuLabels() {
  var sortLabel = document.getElementById('menu-sort-label');
  var sortNewest = document.getElementById('menu-sort-newest');
  var sortOldest = document.getElementById('menu-sort-oldest');
  var sortUpdated = document.getElementById('menu-sort-updated');
  var exportBtn = document.getElementById('menu-export');
  var importBtn = document.getElementById('menu-import');
  var clearBtn = document.getElementById('menu-clear');
  var menuToggle = document.getElementById('page-menu-toggle');
  var searchToggle = document.getElementById('search-toggle');
  var colorToggle = document.getElementById('color-toggle');
  var sendBtn = document.getElementById('page-send');

  if (sortLabel) sortLabel.textContent = t('sort');
  if (sortNewest) {
    sortNewest.textContent = t('sortNewest');
    sortNewest.classList.toggle('active', normalizeSortOrder(pageState.settings.sortOrder) === 'newest');
    sortNewest.setAttribute('aria-checked', normalizeSortOrder(pageState.settings.sortOrder) === 'newest' ? 'true' : 'false');
  }
  if (sortOldest) {
    sortOldest.textContent = t('sortOldest');
    sortOldest.classList.toggle('active', normalizeSortOrder(pageState.settings.sortOrder) === 'oldest');
    sortOldest.setAttribute('aria-checked', normalizeSortOrder(pageState.settings.sortOrder) === 'oldest' ? 'true' : 'false');
  }
  if (sortUpdated) {
    sortUpdated.textContent = t('sortUpdated');
    sortUpdated.classList.toggle('active', normalizeSortOrder(pageState.settings.sortOrder) === 'updated');
    sortUpdated.setAttribute('aria-checked', normalizeSortOrder(pageState.settings.sortOrder) === 'updated' ? 'true' : 'false');
  }
  if (exportBtn) exportBtn.textContent = t('export');
  if (importBtn) importBtn.textContent = t('import');
  if (clearBtn) clearBtn.textContent = t('clearAll');
  if (menuToggle) {
    menuToggle.title = t('more');
    menuToggle.setAttribute('aria-label', t('more'));
  }
  if (searchToggle) {
    searchToggle.title = t('search');
    searchToggle.setAttribute('aria-label', t('search'));
  }
  if (colorToggle) {
    colorToggle.title = t('color');
    colorToggle.setAttribute('aria-label', t('color'));
  }
  if (sendBtn) {
    sendBtn.title = t('add');
    sendBtn.setAttribute('aria-label', t('add'));
  }
}

async function persistSortOrder(order) {
  var next = normalizeSortOrder(order);
  pageState.settings.sortOrder = next;

  try {
    if (typeof Tapp !== 'undefined' && Tapp.settings) {
      if (typeof Tapp.settings.set === 'function') {
        await Tapp.settings.set('sortOrder', next);
      } else if (typeof Tapp.settings.setAll === 'function') {
        await Tapp.settings.setAll({ sortOrder: next });
      }
    }
  } catch (e) {
    console.error('[Notes] 保存排序失败:', e);
  }

  pageState.skipCardAnimation = true;
  refreshFilteredNotes();
  renderPageNotes();
  updateOverflowMenuLabels();
}

function menuOutsideClickHandler(e) {
  if (!pageState.menuOpen) return;
  var wrap = document.querySelector('.status-menu-wrap');
  if (!wrap) return;
  if (e.target && wrap.contains(e.target)) return;
  closeOverflowMenu();
}

function menuEscHandler(e) {
  if (e.key === 'Escape' && pageState.menuOpen) {
    closeOverflowMenu();
  }
}

function initPage() {
  var input = document.getElementById('page-input');
  var sendBtn = document.getElementById('page-send');
  var charCount = document.getElementById('char-count');
  var searchInput = document.getElementById('search-input');
  var searchToggle = document.getElementById('search-toggle');
  var statusPill = document.getElementById('status-pill');
  var menuToggle = document.getElementById('page-menu-toggle');
  var menuExport = document.getElementById('menu-export');
  var menuImport = document.getElementById('menu-import');
  var menuClear = document.getElementById('menu-clear');
  var menuSortNewest = document.getElementById('menu-sort-newest');
  var menuSortOldest = document.getElementById('menu-sort-oldest');
  var menuSortUpdated = document.getElementById('menu-sort-updated');
  var colorToggle = document.getElementById('color-toggle');

  if (input) {
    input.placeholder = t('placeholder');
    input.setAttribute('maxlength', String(MAX_NOTE_CHARS));
  }
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  if (charCount && input) updateCharCount(input, charCount);

  updateOverflowMenuLabels();
  updateCreateColorPalette();
  closeOverflowMenu();

  if (searchToggle && statusPill && searchInput) {
    searchToggle.onclick = function() {
      closeOverflowMenu();
      var isSearching = statusPill.classList.toggle('searching');
      searchToggle.classList.toggle('active', isSearching);

      if (isSearching) {
        setTimeout(function() {
          searchInput.focus();
        }, 150);
      } else {
        searchInput.value = '';
        filterNotes('');
        pageState.skipCardAnimation = true;
        renderPageNotes();
      }
    };

    searchInput.onkeydown = function(e) {
      if (e.key === 'Escape') {
        statusPill.classList.remove('searching');
        searchToggle.classList.remove('active');
        searchInput.value = '';
        filterNotes('');
        pageState.skipCardAnimation = true;
        renderPageNotes();
      }
    };
  }

  if (menuToggle) {
    menuToggle.onclick = function(e) {
      e.stopPropagation();
      e.preventDefault();
      toggleOverflowMenu();
    };
  }

  if (menuSortNewest) {
    menuSortNewest.onclick = function() {
      persistSortOrder('newest');
      closeOverflowMenu();
    };
  }
  if (menuSortOldest) {
    menuSortOldest.onclick = function() {
      persistSortOrder('oldest');
      closeOverflowMenu();
    };
  }
  if (menuSortUpdated) {
    menuSortUpdated.onclick = function() {
      persistSortOrder('updated');
      closeOverflowMenu();
    };
  }

  if (menuExport) {
    menuExport.onclick = function() {
      closeOverflowMenu();
      exportNotes();
    };
  }
  if (menuImport) {
    menuImport.onclick = function() {
      closeOverflowMenu();
      openImportDialog();
    };
  }
  if (menuClear) {
    menuClear.onclick = function() {
      closeOverflowMenu();
      clearAllNotes();
    };
  }

  // 触摸友好：点击外部 / Escape 关闭溢出菜单
  try {
    document.removeEventListener('click', menuOutsideClickHandler, true);
    document.removeEventListener('touchstart', menuOutsideClickHandler, true);
    document.removeEventListener('keydown', menuEscHandler);
  } catch (e) {}
  document.addEventListener('click', menuOutsideClickHandler, true);
  document.addEventListener('touchstart', menuOutsideClickHandler, true);
  document.addEventListener('keydown', menuEscHandler);

  if (colorToggle) {
    colorToggle.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      setPaletteOpen(!pageState.paletteOpen);
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
    };

    input.onfocus = function() {
      updateCharCount(input, charCount);
    };

    input.onblur = function() {
      updateCharCount(input, charCount);
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
        } else {
          updateCharCount(input, charCount);
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

  if (searchInput) {
    var searchTimeout;
    searchInput.oninput = function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        filterNotes(searchInput.value.trim());
        pageState.skipCardAnimation = true;
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
      refreshFilteredNotes();
      pageState.editingId = null;
      pageState.expandingId = null;
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
