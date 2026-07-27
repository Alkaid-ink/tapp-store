// ==================== Stickers (personal + room shared pack) ====================
// Entry: #sticker-btn next to attach. Room pack uses federation.addRoomSticker /
// removeRoomSticker; personal pack is client-only (Tapp.storage / localStorage).

var STICKER_PANEL_MAX_H = 280;
var STICKER_PERSONAL_KEY = 'aro.personal_stickers';
var STICKER_PERSONAL_MAX = 48;
/** Backend ROOM_STICKER_MAX_DATA_LEN = 120_000 */
var STICKER_DATA_MAX = 115000;
var STICKER_ROOM_MAX = 24;
var _stickerPanelOpen = false;
var _stickerTab = 'room'; // 'room' | 'mine'
var _stickerBusy = false;
var _personalStickersCache = null;
var _stickerCtxMenu = null;

function ensureStickerState() {
  if (!state.stickers) {
    state.stickers = { open: false, tab: 'room' };
  }
  return state.stickers;
}

function isStickerPanelOpen() {
  var panel = $('sticker-panel');
  return !!(panel && panel.style.display !== 'none' && !panel.hidden && _stickerPanelOpen);
}

function getRoomStickersList() {
  var rd = state.roomDetail || {};
  var shared = rd.shared_data_config || rd.sharedDataConfig || {};
  var list = shared.stickers;
  if (!Array.isArray(list)) return [];
  return list.filter(function (s) {
    return s && typeof s === 'object' && s.data && String(s.data).indexOf('data:image/') === 0;
  });
}

function applyRoomStickersToDetail(stickers) {
  if (!state.roomDetail) state.roomDetail = {};
  var shared = state.roomDetail.shared_data_config || state.roomDetail.sharedDataConfig || {};
  if (typeof shared !== 'object' || !shared) shared = {};
  shared.stickers = Array.isArray(stickers) ? stickers : [];
  state.roomDetail.shared_data_config = shared;
}

async function loadPersonalStickers() {
  if (_personalStickersCache) return _personalStickersCache;
  var list = [];
  try {
    if (Tapp.storage && typeof Tapp.storage.get === 'function') {
      var stored = await Tapp.storage.get(STICKER_PERSONAL_KEY);
      if (Array.isArray(stored)) list = stored;
    }
  } catch (e0) { /* ignore */ }
  if (!list.length) {
    try {
      var raw = localStorage.getItem(STICKER_PERSONAL_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (e1) { /* ignore */ }
  }
  _personalStickersCache = list.filter(function (s) {
    return s && s.id && s.data && String(s.data).indexOf('data:image/') === 0;
  }).slice(0, STICKER_PERSONAL_MAX);
  return _personalStickersCache;
}

async function savePersonalStickers(list) {
  _personalStickersCache = (list || []).slice(0, STICKER_PERSONAL_MAX);
  try {
    if (Tapp.storage && typeof Tapp.storage.set === 'function') {
      await Tapp.storage.set(STICKER_PERSONAL_KEY, _personalStickersCache);
    }
  } catch (e0) { /* ignore */ }
  try {
    localStorage.setItem(STICKER_PERSONAL_KEY, JSON.stringify(_personalStickersCache));
  } catch (e1) { /* ignore */ }
  return _personalStickersCache;
}

/**
 * Compress image dataURL to fit sticker budget (canvas JPEG/WebP prefer).
 * @returns {Promise<string>} data URL
 */
function compressStickerDataUrl(dataUrl) {
  return new Promise(function (resolve, reject) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      reject(new Error('invalid image'));
      return;
    }
    if (dataUrl.length <= STICKER_DATA_MAX && /^data:image\/(png|jpe?g|gif|webp)/i.test(dataUrl)) {
      resolve(dataUrl);
      return;
    }
    var img = new Image();
    img.onload = function () {
      try {
        var maxSide = 320;
        var w = img.naturalWidth || img.width || 1;
        var h = img.naturalHeight || img.height || 1;
        var scale = Math.min(1, maxSide / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        var out = '';
        var qualities = [0.82, 0.7, 0.55, 0.4, 0.28];
        for (var i = 0; i < qualities.length; i++) {
          out = canvas.toDataURL('image/jpeg', qualities[i]);
          if (out.length <= STICKER_DATA_MAX) break;
        }
        // Shrink further if still oversized
        var side = maxSide;
        while (out.length > STICKER_DATA_MAX && side > 96) {
          side = Math.floor(side * 0.75);
          scale = Math.min(1, side / Math.max(w, h));
          cw = Math.max(1, Math.round(w * scale));
          ch = Math.max(1, Math.round(h * scale));
          canvas.width = cw;
          canvas.height = ch;
          ctx.drawImage(img, 0, 0, cw, ch);
          out = canvas.toDataURL('image/jpeg', 0.55);
        }
        if (out.length > STICKER_DATA_MAX) {
          reject(new Error(lang.stickerTooLarge || 'Image too large for sticker'));
          return;
        }
        resolve(out);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = function () { reject(new Error('image load failed')); };
    img.src = dataUrl;
  });
}

function canManageRoomSticker(sticker) {
  if (!sticker) return false;
  var myRole = (state.roomDetail && state.roomDetail.my_role) || '';
  if (myRole === 'owner' || myRole === 'admin') return true;
  var me = state.localActorUrl
    || (typeof getIdentityActorUrl === 'function' ? getIdentityActorUrl() : '');
  if (!me) return false;
  return typeof sameActorUrl === 'function'
    ? sameActorUrl(sticker.actor, me)
    : String(sticker.actor || '') === String(me);
}

function closeStickerCtxMenu() {
  if (_stickerCtxMenu) {
    try { _stickerCtxMenu.remove(); } catch (e) { /* ignore */ }
    _stickerCtxMenu = null;
  }
  document.removeEventListener('click', _stickerCtxOutside, true);
}

function _stickerCtxOutside(e) {
  if (_stickerCtxMenu && !_stickerCtxMenu.contains(e.target)) closeStickerCtxMenu();
}

function openStickerCtxMenu(x, y, sticker, pack) {
  closeStickerCtxMenu();
  var menu = document.createElement('div');
  menu.className = 'sticker-ctx-menu';
  menu.setAttribute('role', 'menu');
  var items = [];
  items.push(
    '<button type="button" class="sticker-ctx-item" data-act="send" role="menuitem">'
    + esc(lang.stickerSend || 'Send') + '</button>'
  );
  if (pack === 'mine' || canManageRoomSticker(sticker)) {
    items.push(
      '<button type="button" class="sticker-ctx-item sticker-ctx-danger" data-act="remove" role="menuitem">'
      + esc(lang.stickerRemove || 'Remove') + '</button>'
    );
  }
  if (pack === 'mine' && state.activeKind === 'room' && !isRoomComposerLocked()) {
    items.push(
      '<button type="button" class="sticker-ctx-item" data-act="share-room" role="menuitem">'
      + esc(lang.stickerShareToRoom || 'Share to group pack') + '</button>'
    );
  }
  menu.innerHTML = items.join('');
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - 160)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, window.innerHeight - 120)) + 'px';
  menu.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    closeStickerCtxMenu();
    if (act === 'send') sendStickerNow(sticker);
    else if (act === 'remove') removeStickerItem(sticker, pack);
    else if (act === 'share-room') sharePersonalToRoom(sticker);
  });
  document.body.appendChild(menu);
  _stickerCtxMenu = menu;
  setTimeout(function () {
    document.addEventListener('click', _stickerCtxOutside, true);
  }, 0);
}

function toggleStickerPanel() {
  if (isStickerPanelOpen()) {
    closeStickerPanel();
    return;
  }
  openStickerPanel();
}

function openStickerPanel() {
  if (!state.activeId || state.sending) return;
  if (typeof isChannelComposerLocked === 'function' && isChannelComposerLocked()) return;
  if (typeof isRoomComposerLocked === 'function' && isRoomComposerLocked()) return;
  try { if (typeof closeAttachMenu === 'function') closeAttachMenu(); } catch (e0) { /* ignore */ }
  closeStickerCtxMenu();

  var panel = $('sticker-panel');
  if (!panel) return;
  var st = ensureStickerState();
  st.open = true;
  // Default tab: room pack in groups, mine in DMs
  if (state.activeKind === 'room') {
    _stickerTab = st.tab === 'mine' ? 'mine' : 'room';
  } else {
    _stickerTab = 'mine';
  }
  st.tab = _stickerTab;
  _stickerPanelOpen = true;

  panel.hidden = false;
  panel.style.display = 'flex';
  panel.style.pointerEvents = 'auto';
  var btn = $('sticker-btn');
  if (btn) {
    btn.classList.add('sticker-btn-active');
    btn.setAttribute('aria-expanded', 'true');
  }
  applyStickerLabels();
  renderStickerPanel();
  if (typeof aroPlayEnter === 'function') aroPlayEnter(panel, 'aro-sticker-enter');
}

function closeStickerPanel() {
  _stickerPanelOpen = false;
  var st = ensureStickerState();
  st.open = false;
  closeStickerCtxMenu();
  var panel = $('sticker-panel');
  var btn = $('sticker-btn');
  if (btn) {
    btn.classList.remove('sticker-btn-active');
    btn.setAttribute('aria-expanded', 'false');
  }
  if (!panel) return;
  if (panel.style.display === 'none' || panel.hidden) {
    panel.hidden = true;
    panel.style.display = 'none';
    panel.style.pointerEvents = 'none';
    return;
  }
  panel.style.pointerEvents = 'none';
  if (typeof aroDismiss === 'function') {
    aroDismiss(panel, {
      ms: 140,
      onDone: function () {
        panel.hidden = true;
        panel.style.display = 'none';
        panel.classList.remove('aro-sticker-enter', 'aro-leaving');
      },
    });
  } else {
    panel.hidden = true;
    panel.style.display = 'none';
  }
}

function resetStickersOnConversationChange() {
  closeStickerPanel();
  var st = ensureStickerState();
  st.tab = state.activeKind === 'room' ? 'room' : 'mine';
  _stickerTab = st.tab;
}

function applyStickerLabels() {
  var btn = $('sticker-btn');
  if (btn) {
    var title = lang.stickerBtn || lang.stickers || 'Stickers';
    btn.setAttribute('title', title);
    btn.setAttribute('aria-label', title);
  }
  var tabRoom = $('sticker-tab-room');
  if (tabRoom) tabRoom.textContent = lang.stickerTabRoom || 'Group';
  var tabMine = $('sticker-tab-mine');
  if (tabMine) tabMine.textContent = lang.stickerTabMine || 'Mine';
  var addBtn = $('sticker-add-btn');
  if (addBtn) {
    addBtn.textContent = lang.stickerAdd || 'Add';
    addBtn.setAttribute('aria-label', lang.stickerAdd || 'Add sticker');
  }
  var empty = $('sticker-empty');
  if (empty && empty.dataset.role === 'empty') {
    empty.textContent = _stickerTab === 'room'
      ? (lang.stickerRoomEmpty || 'No group stickers yet. Add one to share with everyone.')
      : (lang.stickerMineEmpty || 'No personal stickers yet.');
  }
}

function setStickerTab(tab) {
  if (tab !== 'room' && tab !== 'mine') return;
  if (tab === 'room' && state.activeKind !== 'room') return;
  _stickerTab = tab;
  ensureStickerState().tab = tab;
  renderStickerPanel();
}

async function renderStickerPanel() {
  var panel = $('sticker-panel');
  if (!panel || !_stickerPanelOpen) return;

  var tabs = $('sticker-tabs');
  if (tabs) {
    tabs.style.display = state.activeKind === 'room' ? 'flex' : 'none';
  }
  document.querySelectorAll('[data-sticker-tab]').forEach(function (el) {
    var t = el.getAttribute('data-sticker-tab');
    var active = t === _stickerTab;
    el.classList.toggle('sticker-tab-active', active);
    el.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  var grid = $('sticker-grid');
  var empty = $('sticker-empty');
  if (!grid) return;

  var list = [];
  if (_stickerTab === 'room' && state.activeKind === 'room') {
    list = getRoomStickersList();
  } else {
    list = await loadPersonalStickers();
  }

  if (!list.length) {
    grid.innerHTML = '';
    if (empty) {
      empty.style.display = 'block';
      empty.dataset.role = 'empty';
      empty.textContent = _stickerTab === 'room'
        ? (lang.stickerRoomEmpty || 'No group stickers yet. Add one to share with everyone.')
        : (lang.stickerMineEmpty || 'No personal stickers yet.');
    }
  } else {
    if (empty) empty.style.display = 'none';
    var pack = _stickerTab;
    var html = '';
    list.forEach(function (s, idx) {
      var src = typeof safeMessageImageUrl === 'function'
        ? safeMessageImageUrl(s.data)
        : (typeof safeIconUrl === 'function' ? safeIconUrl(s.data) : '');
      if (!src) {
        // Fallback: allow short data URLs already validated as data:image
        if (String(s.data).indexOf('data:image/') === 0 && s.data.length < STICKER_DATA_MAX + 5000) {
          src = s.data;
        }
      }
      if (!src) return;
      var name = s.name || '';
      html += '<button type="button" class="sticker-cell" data-sticker-idx="' + idx + '"'
        + ' data-sticker-id="' + esc(s.id || '') + '"'
        + ' title="' + esc(name || lang.stickerSend || 'Send') + '"'
        + ' aria-label="' + esc(name || lang.stickerSend || 'Send sticker') + '">'
        + '<img src="' + esc(src) + '" alt="" loading="lazy" draggable="false" />'
        + '</button>';
    });
    grid.innerHTML = html;
    grid._stickerList = list;
    grid._stickerPack = pack;
  }

  var meta = $('sticker-meta');
  if (meta) {
    if (_stickerTab === 'room') {
      meta.textContent = (lang.stickerRoomMeta || '{n}/{max}')
        .replace('{n}', String(list.length))
        .replace('{max}', String(STICKER_ROOM_MAX));
    } else {
      meta.textContent = (lang.stickerMineMeta || '{n}')
        .replace('{n}', String(list.length));
    }
  }

  var addBtn = $('sticker-add-btn');
  if (addBtn) {
    var roomFull = _stickerTab === 'room' && list.length >= STICKER_ROOM_MAX;
    addBtn.disabled = !!_stickerBusy || roomFull;
    addBtn.title = roomFull
      ? (lang.stickerRoomFull || 'Group pack is full')
      : (lang.stickerAdd || 'Add');
  }
}

/**
 * Immediately send sticker as an image message (does not use pending attach).
 */
async function sendStickerNow(sticker) {
  if (!sticker || !sticker.data || !state.activeId || state.sending || _stickerBusy) return;
  if (typeof isChannelComposerLocked === 'function' && isChannelComposerLocked()) return;
  if (typeof isRoomComposerLocked === 'function' && isRoomComposerLocked()) return;

  var ctx = {
    kind: state.activeKind,
    id: state.activeId,
    generation: state.openGen,
  };
  state.sending = true;
  _stickerBusy = true;
  if (typeof updateSendState === 'function') updateSendState();

  try {
    var dataUrl = sticker.data;
    if (dataUrl.length > INLINE_ATTACH_MAX) {
      // Stickers should already be small; re-compress if needed
      dataUrl = await compressStickerDataUrl(dataUrl);
    }
    var mime = 'image/png';
    var m = /^data:(image\/[a-z0-9.+-]+);/i.exec(dataUrl);
    if (m) mime = m[1];
    var filename = (sticker.name || 'sticker').replace(/[^\w.\-()+\u4e00-\u9fff]+/g, '_').slice(0, 80) + '.png';
    if (mime.indexOf('jpeg') >= 0 || mime.indexOf('jpg') >= 0) filename = filename.replace(/\.png$/i, '.jpg');
    else if (mime.indexOf('webp') >= 0) filename = filename.replace(/\.png$/i, '.webp');
    else if (mime.indexOf('gif') >= 0) filename = filename.replace(/\.png$/i, '.gif');

    var msgPayload = {
      data: dataUrl,
      filename: filename,
      mime_type: mime,
      size: Math.floor(dataUrl.length * 0.75),
      text: '',
      sticker: true,
    };
    var sendReq = { payload: msgPayload, message_type: 'image' };
    if (state.e2ePreferEncrypt !== false && typeof isE2eReadyForActive === 'function' && isE2eReadyForActive()) {
      sendReq.encrypt = true;
    }
    var sendRes;
    if (ctx.kind === 'channel') {
      sendRes = await Tapp.federation.sendMessage(ctx.id, sendReq);
    } else {
      sendRes = await Tapp.federation.sendRoomMessage(ctx.id, sendReq);
    }
    if (typeof noteDeliveryEnqueue === 'function') noteDeliveryEnqueue(sendRes);
    // Keep panel open for rapid-fire stickers
    if (state.activeKind === ctx.kind && state.activeId === ctx.id) {
      if (typeof pollMessages === 'function') await pollMessages(true);
    }
  } catch (e) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerSendFail || lang.sendFail || 'Send failed', e);
    }
  } finally {
    state.sending = false;
    _stickerBusy = false;
    if (typeof updateSendState === 'function') updateSendState();
  }
}

async function removeStickerItem(sticker, pack) {
  if (!sticker || !sticker.id) return;
  if (pack === 'mine') {
    var list = await loadPersonalStickers();
    list = list.filter(function (s) { return s.id !== sticker.id; });
    await savePersonalStickers(list);
    renderStickerPanel();
    return;
  }
  if (state.activeKind !== 'room' || !state.activeId) return;
  if (typeof Tapp.federation.removeRoomSticker !== 'function') {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerApiMissing || 'Sticker API unavailable (update Myriad host)');
    }
    return;
  }
  if (!(await (typeof aroConfirm === 'function'
    ? aroConfirm(lang.stickerRemoveConfirm || 'Remove this sticker from the group pack?', true)
    : Promise.resolve(confirm(lang.stickerRemoveConfirm || 'Remove?'))))) {
    return;
  }
  _stickerBusy = true;
  try {
    var res = await Tapp.federation.removeRoomSticker(state.activeId, sticker.id);
    var stickers = (res && res.stickers) || (res && res.data && res.data.stickers) || null;
    if (Array.isArray(stickers)) applyRoomStickersToDetail(stickers);
    else {
      // optimistic
      applyRoomStickersToDetail(getRoomStickersList().filter(function (s) { return s.id !== sticker.id; }));
    }
    renderStickerPanel();
  } catch (e) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerRemoveFail || lang.sendFail || 'Remove failed', e);
    }
  } finally {
    _stickerBusy = false;
  }
}

async function sharePersonalToRoom(sticker) {
  if (!sticker || !sticker.data || state.activeKind !== 'room' || !state.activeId) return;
  if (typeof Tapp.federation.addRoomSticker !== 'function') {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerApiMissing || 'Sticker API unavailable (update Myriad host)');
    }
    return;
  }
  if (getRoomStickersList().length >= STICKER_ROOM_MAX) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerRoomFull || 'Group pack is full');
    }
    return;
  }
  _stickerBusy = true;
  try {
    var data = await compressStickerDataUrl(sticker.data);
    var res = await Tapp.federation.addRoomSticker(state.activeId, {
      data: data,
      name: sticker.name || undefined,
    });
    var stickers = (res && res.stickers) || (res && res.data && res.data.stickers);
    if (Array.isArray(stickers)) applyRoomStickersToDetail(stickers);
    try {
      Tapp.ui.showNotification({
        title: lang.stickerShared || 'Added to group pack',
        type: 'success',
      });
    } catch (eN) { /* ignore */ }
    _stickerTab = 'room';
    ensureStickerState().tab = 'room';
    renderStickerPanel();
  } catch (e) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerAddFail || lang.sendFail || 'Add failed', e);
    }
  } finally {
    _stickerBusy = false;
  }
}

function pickStickerImage() {
  if (_stickerBusy) return;
  if (_stickerTab === 'room' && getRoomStickersList().length >= STICKER_ROOM_MAX) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerRoomFull || 'Group pack is full');
    }
    return;
  }
  var inp = $('sticker-file-input');
  if (inp) {
    inp.value = '';
    inp.click();
  }
}

/**
 * Resolve a sticker destination when user adds from an image.
 * @param {'mine'|'room'|'ask'|'auto'|undefined} target
 * @returns {Promise<'mine'|'room'|null>}
 */
async function resolveStickerAddTarget(target) {
  if (target === 'mine' || target === 'room') return target;
  // auto: follow open sticker tab, else room if in group, else mine
  if (target === 'auto' || !target) {
    if (_stickerPanelOpen && _stickerTab === 'room' && state.activeKind === 'room') return 'room';
    if (_stickerPanelOpen && _stickerTab === 'mine') return 'mine';
    if (state.activeKind === 'room') {
      // Prefer ask when both packs make sense
      return pickStickerAddTargetInteractive();
    }
    return 'mine';
  }
  if (target === 'ask') {
    if (state.activeKind !== 'room') return 'mine';
    return pickStickerAddTargetInteractive();
  }
  return 'mine';
}

/** Small chooser: mine vs group pack. Returns null if cancelled. */
function pickStickerAddTargetInteractive() {
  return new Promise(function (resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'sticker-target-overlay';
    overlay.dataset.aroDismissable = '1';
    overlay.innerHTML =
      '<div class="sticker-target-sheet" role="dialog" aria-modal="true" aria-label="'
      + esc(lang.stickerAddWhere || 'Add sticker to') + '">'
      + '<div class="sticker-target-title">' + esc(lang.stickerAddWhere || 'Add sticker to') + '</div>'
      + '<button type="button" class="sticker-target-item" data-target="room">'
      + esc(lang.stickerTabRoom || 'Group pack') + '</button>'
      + '<button type="button" class="sticker-target-item" data-target="mine">'
      + esc(lang.stickerTabMine || 'Mine') + '</button>'
      + '<button type="button" class="sticker-target-cancel">' + esc(lang.pickerCancel || lang.cancel || 'Cancel') + '</button>'
      + '</div>';
    var done = function (val) {
      try { overlay.style.pointerEvents = 'none'; } catch (ePe) { /* ignore */ }
      if (typeof aroDismiss === 'function') {
        aroDismiss(overlay, { remove: true, ms: 140 });
      } else {
        try { overlay.remove(); } catch (eR) { /* ignore */ }
      }
      resolve(val);
    };
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { done(null); return; }
      var btn = e.target.closest('[data-target]');
      if (btn) {
        done(btn.getAttribute('data-target') === 'room' ? 'room' : 'mine');
        return;
      }
      if (e.target.closest('.sticker-target-cancel')) done(null);
    });
    document.body.appendChild(overlay);
    if (typeof showAroOverlay === 'function') showAroOverlay(overlay);
    else {
      overlay.style.display = 'flex';
      overlay.style.pointerEvents = 'auto';
    }
  });
}

/**
 * Add any image (data URL, message bubble, viewer) into mine / room sticker pack.
 * @param {string} dataUrl
 * @param {{ target?: 'mine'|'room'|'ask'|'auto', name?: string, alsoMine?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
async function addImageDataAsSticker(dataUrl, opts) {
  opts = opts || {};
  if (!dataUrl || typeof dataUrl !== 'string') {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerNeedImage || 'Please choose an image');
    }
    return false;
  }
  if (_stickerBusy) return false;

  var dest = await resolveStickerAddTarget(opts.target);
  if (!dest) return false;

  if (dest === 'room') {
    if (state.activeKind !== 'room' || !state.activeId) {
      if (typeof notifyError === 'function') {
        notifyError(lang.stickerNeedRoom || 'Open a group chat to add group stickers');
      }
      return false;
    }
    if (getRoomStickersList().length >= STICKER_ROOM_MAX) {
      if (typeof notifyError === 'function') {
        notifyError(lang.stickerRoomFull || 'Group pack is full');
      }
      return false;
    }
    if (typeof Tapp.federation.addRoomSticker !== 'function') {
      if (typeof notifyError === 'function') {
        notifyError(lang.stickerApiMissing || 'Sticker API unavailable (update Myriad host)');
      }
      return false;
    }
  }

  _stickerBusy = true;
  if (typeof updateSendState === 'function') updateSendState();
  try {
    var compressed = await compressStickerDataUrl(dataUrl);
    var baseName = (opts.name || 'sticker').replace(/\.[^.]+$/, '').slice(0, 40);

    if (dest === 'room') {
      var res = await Tapp.federation.addRoomSticker(state.activeId, {
        data: compressed,
        name: baseName || undefined,
      });
      var stickers = (res && res.stickers) || (res && res.data && res.data.stickers);
      if (Array.isArray(stickers)) applyRoomStickersToDetail(stickers);
      // Keep a personal copy unless caller disables
      if (opts.alsoMine !== false) {
        try {
          var mine = await loadPersonalStickers();
          mine.unshift({
            id: 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            data: compressed,
            name: baseName || '',
            created_at: new Date().toISOString(),
          });
          await savePersonalStickers(mine);
        } catch (eP) { /* ignore */ }
      }
      try {
        Tapp.ui.showNotification({
          title: lang.stickerShared || 'Added to group pack',
          type: 'success',
        });
      } catch (eN) { /* ignore */ }
      if (_stickerPanelOpen) {
        _stickerTab = 'room';
        ensureStickerState().tab = 'room';
        renderStickerPanel();
      }
    } else {
      var list = await loadPersonalStickers();
      if (list.length >= STICKER_PERSONAL_MAX) {
        list = list.slice(0, STICKER_PERSONAL_MAX - 1);
      }
      list.unshift({
        id: 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        data: compressed,
        name: baseName || '',
        created_at: new Date().toISOString(),
      });
      await savePersonalStickers(list);
      try {
        Tapp.ui.showNotification({
          title: lang.stickerAdded || 'Sticker saved',
          type: 'success',
        });
      } catch (eN2) { /* ignore */ }
      if (_stickerPanelOpen) {
        _stickerTab = 'mine';
        ensureStickerState().tab = 'mine';
        renderStickerPanel();
      }
    }
    return true;
  } catch (e) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerAddFail || lang.sendFail || 'Add failed', e);
    }
    return false;
  } finally {
    _stickerBusy = false;
    if (typeof updateSendState === 'function') updateSendState();
  }
}

/**
 * Extract image data URL from a chat message (inline image only).
 * @returns {string}
 */
function getMessageImageDataUrl(msg) {
  if (!msg) return '';
  var payload = msg.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = null; }
  }
  if (!payload || typeof payload !== 'object') return '';
  var data = payload.data || '';
  if (!data || typeof data !== 'string') return '';
  if (String(data).indexOf('data:image/') !== 0) return '';
  return data;
}

function messageLooksLikeImage(msg) {
  if (!msg) return false;
  if (getMessageImageDataUrl(msg)) return true;
  var payload = msg.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = null; }
  }
  if (!payload || typeof payload !== 'object') return false;
  var mt = msg.message_type || '';
  if (mt === 'image') return true;
  if (payload.mime_type && String(payload.mime_type).indexOf('image/') === 0) return true;
  return false;
}

/**
 * Add sticker from a chat message image (context menu / viewer).
 * @param {object} msg
 * @param {{ target?: 'mine'|'room'|'ask'|'auto' }} [opts]
 */
async function addStickerFromMessage(msg, opts) {
  opts = opts || {};
  var dataUrl = getMessageImageDataUrl(msg);
  if (!dataUrl) {
    // Try visible DOM img as last resort (already sanitized when rendered)
    try {
      var mid = msg && msg.message_id;
      if (mid) {
        var row = document.querySelector('.msg-row[data-msg-id="' + mid.replace(/"/g, '') + '"] img.msg-image');
        if (row && row.src && String(row.src).indexOf('data:image/') === 0) {
          dataUrl = row.src;
        }
      }
    } catch (eDom) { /* ignore */ }
  }
  if (!dataUrl) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerImageUnavailable || 'This image cannot be added as a sticker (no inline data)');
    }
    return false;
  }
  var name = '';
  try {
    var p = msg.payload;
    if (typeof p === 'string') p = JSON.parse(p);
    name = (p && (p.filename || p.name)) || '';
  } catch (eN) { /* ignore */ }
  return addImageDataAsSticker(dataUrl, {
    target: opts.target || 'ask',
    name: name,
  });
}

async function handleStickerFileSelected(file) {
  if (!file || !file.type || file.type.indexOf('image/') !== 0) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerNeedImage || 'Please choose an image');
    }
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerTooLarge || 'Image too large');
    }
    return;
  }
  try {
    var dataUrl = await readFileAsDataURL(file);
    var baseName = (file.name || 'sticker').replace(/\.[^.]+$/, '').slice(0, 40);
    // File picker from panel: follow current tab (auto)
    await addImageDataAsSticker(dataUrl, {
      target: 'auto',
      name: baseName,
    });
  } catch (e) {
    if (typeof notifyError === 'function') {
      notifyError(lang.stickerAddFail || lang.sendFail || 'Add failed', e);
    }
  }
}

/** Apply remote stickers_changed WS event into roomDetail + refresh panel if open */
function handleStickersChangedEvent(ev) {
  if (!ev || !ev.roomId) return;
  if (state.activeKind === 'room' && state.activeId === ev.roomId) {
    if (Array.isArray(ev.stickers)) {
      applyRoomStickersToDetail(ev.stickers);
    }
    if (_stickerPanelOpen) renderStickerPanel();
  }
}

function bindStickerUi() {
  var btn = $('sticker-btn');
  if (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleStickerPanel();
    });
  }
  var tabRoom = $('sticker-tab-room');
  if (tabRoom) {
    tabRoom.addEventListener('click', function () { setStickerTab('room'); });
  }
  var tabMine = $('sticker-tab-mine');
  if (tabMine) {
    tabMine.addEventListener('click', function () { setStickerTab('mine'); });
  }
  var addBtn = $('sticker-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      pickStickerImage();
    });
  }
  var fileInp = $('sticker-file-input');
  if (fileInp) {
    fileInp.addEventListener('change', function () {
      if (this.files && this.files[0]) handleStickerFileSelected(this.files[0]);
    });
  }
  var grid = $('sticker-grid');
  if (grid) {
    grid.addEventListener('click', function (e) {
      var cell = e.target.closest('.sticker-cell');
      if (!cell || !grid._stickerList) return;
      var idx = parseInt(cell.getAttribute('data-sticker-idx'), 10);
      if (isNaN(idx) || idx < 0 || idx >= grid._stickerList.length) return;
      sendStickerNow(grid._stickerList[idx]);
    });
    grid.addEventListener('contextmenu', function (e) {
      var cell = e.target.closest('.sticker-cell');
      if (!cell || !grid._stickerList) return;
      e.preventDefault();
      var idx = parseInt(cell.getAttribute('data-sticker-idx'), 10);
      if (isNaN(idx) || idx < 0 || idx >= grid._stickerList.length) return;
      openStickerCtxMenu(e.clientX, e.clientY, grid._stickerList[idx], grid._stickerPack || _stickerTab);
    });
    // Long-press for touch
    var lpTimer = null;
    var lpCell = null;
    grid.addEventListener('touchstart', function (e) {
      var cell = e.target.closest('.sticker-cell');
      if (!cell) return;
      lpCell = cell;
      var touch = e.touches && e.touches[0];
      lpTimer = setTimeout(function () {
        if (!lpCell || !grid._stickerList) return;
        var idx = parseInt(lpCell.getAttribute('data-sticker-idx'), 10);
        if (isNaN(idx) || idx < 0 || idx >= grid._stickerList.length) return;
        var x = touch ? touch.clientX : 0;
        var y = touch ? touch.clientY : 0;
        openStickerCtxMenu(x, y, grid._stickerList[idx], grid._stickerPack || _stickerTab);
      }, 480);
    }, { passive: true });
    grid.addEventListener('touchend', function () {
      if (lpTimer) clearTimeout(lpTimer);
      lpTimer = null;
      lpCell = null;
    });
    grid.addEventListener('touchmove', function () {
      if (lpTimer) clearTimeout(lpTimer);
      lpTimer = null;
    }, { passive: true });
  }
}
