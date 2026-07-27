// ==================== Attachment Menu ====================
var _attachMenu = null;
// Overall attach cap (large channel files use chunked transfer under federation:files).
var MAX_ATTACH_SIZE = 100 * 1024 * 1024; // 100MB
// Inline base64 only under this raw size so JSON payload stays under backend budget.
var INLINE_ATTACH_MAX = 2 * 1024 * 1024; // 2 MiB raw
// Must match backend federation file_transfer DEFAULT_CHUNK_SIZE (1 MiB).
var TRANSFER_CHUNK_SIZE = 1024 * 1024;

function toggleAttachMenu() {
  if (_attachMenu) { closeAttachMenu(); return; }
  var wrap = $('input-bar');
  if (!wrap) return;
  // Not writable / no active conversation: attach disabled
  var btn = $('attach-btn');
  if (btn && btn.disabled) return;
  var locked = (typeof isChannelComposerLocked === 'function' && isChannelComposerLocked())
    || (typeof isRoomComposerLocked === 'function' && isRoomComposerLocked())
    || !!(state.activeKind === 'channel' && state.channelDetail && state.channelDetail.status === 'closed');
  if (!state.activeId || locked || state.sending) return;
  wrap.style.position = 'relative';
  if (btn) btn.classList.add('attach-btn-active');

  var menu = document.createElement('div');
  menu.className = 'attach-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML =
    '<button type="button" class="attach-menu-item" data-attach="image" role="menuitem"><div class="attach-menu-icon attach-icon-image"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>' + esc(lang.attachImage) + '</button>'
    + '<button type="button" class="attach-menu-item" data-attach="file" role="menuitem"><div class="attach-menu-icon attach-icon-file"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>' + esc(lang.attachFile) + '</button>'
    + '<button type="button" class="attach-menu-item" data-attach="tapp" role="menuitem"><div class="attach-menu-icon attach-icon-tapp"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>' + esc(lang.attachTapp) + '</button>'
    + '<button type="button" class="attach-menu-item" data-attach="brew" role="menuitem"><div class="attach-menu-icon attach-icon-brew"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg></div>' + esc(lang.attachBrew) + '</button>'
    + '<button type="button" class="attach-menu-item" data-attach="library" role="menuitem"><div class="attach-menu-icon attach-icon-library"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>' + esc(lang.attachLibrary) + '</button>'
    + '<button type="button" class="attach-menu-item" data-attach="report" role="menuitem"><div class="attach-menu-icon attach-icon-report"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div>' + esc(lang.attachReport) + '</button>';

  menu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-attach]');
    if (!item) return;
    var type = item.dataset.attach;
    closeAttachMenu();
    if (type === 'image') { var inp = $('attach-image-input'); if (inp) inp.click(); }
    else if (type === 'file') { var inp2 = $('attach-file-input'); if (inp2) inp2.click(); }
    else pickFedContent(type);
  });

  wrap.appendChild(menu);
  _attachMenu = menu;
  aroPlayEnter(menu, 'aro-menu-enter');

  // Close on outside click
  setTimeout(function () {
    pageListen(document, 'click', _attachOutsideClick);
  }, 0);
}

function _attachOutsideClick(e) {
  if (_attachMenu && !_attachMenu.contains(e.target) && e.target.id !== 'attach-btn' && !e.target.closest('#attach-btn')) {
    closeAttachMenu();
  }
}

function closeAttachMenu() {
  if (!_attachMenu) {
    var btnIdle = $('attach-btn');
    if (btnIdle) btnIdle.classList.remove('attach-btn-active');
    document.removeEventListener('click', _attachOutsideClick);
    return;
  }
  var menu = _attachMenu;
  _attachMenu = null;
  var btn = $('attach-btn');
  if (btn) btn.classList.remove('attach-btn-active');
  document.removeEventListener('click', _attachOutsideClick);
  // PE none first (aroDismiss also does this); leftover .aro-leaving must not eat clicks.
  try { menu.style.pointerEvents = 'none'; } catch (ePe) { /* ignore */ }
  aroDismiss(menu, { remove: true, ms: 120 });
}

function handleFileSelect(file, forceType) {
  if (!file) return;
  if (file.size > MAX_ATTACH_SIZE) {
    try { Tapp.ui.showNotification({ title: lang.fileTooLarge, type: 'error' }); } catch (e) { /* ignore */ }
    return;
  }
  var type = forceType || (file.type && file.type.indexOf('image/') === 0 ? 'image' : 'file');
  // Keep the File for chunked upload; dataURL preview only for images.
  if (type === 'image') {
    var reader = new FileReader();
    reader.onload = function () {
      setPendingAttach({ type: type, file: file, data: reader.result, name: file.name, size: file.size, mime: file.type || 'image/*' });
    };
    reader.onerror = function () {
      setPendingAttach({ type: type, file: file, name: file.name, size: file.size, mime: file.type || 'image/*' });
    };
    reader.readAsDataURL(file);
  } else {
    setPendingAttach({ type: type, file: file, name: file.name, size: file.size, mime: file.type || 'application/octet-stream' });
  }
}

function readFileAsDataURL(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(reader.error || new Error('read failed')); };
    reader.readAsDataURL(file);
  });
}

function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = '';
  var step = 0x8000;
  for (var i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

/**
 * Chunked transfer for files above INLINE_ATTACH_MAX.
 * Supports both channel (DM) and room (group) via initiateTransfer / initiateRoomTransfer.
 */
/**
 * @param {object} [sendCtx] optional frozen { kind, id, quoteMsg } from doSend (ARO-03)
 */
async function sendChunkedFileTransfer(attach, text, replyTo, sendCtx) {
  var file = attach.file;
  if (!file) throw new Error('Missing file data');

  var destKind = (sendCtx && sendCtx.kind) || state.activeKind;
  var destId = (sendCtx && sendCtx.id) || state.activeId;
  var isRoom = destKind === 'room';
  var isChannel = destKind === 'channel';
  if (!isRoom && !isChannel) {
    throw new Error(lang.fileTooLarge || 'File too large');
  }
  if (!destId) throw new Error(lang.sendFail || 'No conversation');

  if (isChannel) {
    var chStatus = state.channelDetail && state.channelDetail.status;
    if (chStatus && chStatus !== 'active' && chStatus !== 'accepted') {
      throw new Error(lang.channelNotAccepted || 'Channel must be accepted first');
    }
    if (typeof Tapp.federation.initiateTransfer !== 'function') {
      throw new Error(lang.fileTooLarge || 'File too large');
    }
  } else if (typeof Tapp.federation.initiateRoomTransfer !== 'function') {
    throw new Error(lang.fileTooLargeRoom || lang.fileTooLarge || 'File too large for group');
  }
  if (typeof Tapp.federation.uploadChunk !== 'function') {
    throw new Error(lang.fileTooLarge || 'File too large');
  }

  try {
    Tapp.ui.showNotification({ title: lang.transferStarting || 'Uploading…', type: 'info' });
  } catch (e0) { /* ignore */ }

  var meta = {
    filename: attach.name,
    file_size: attach.size,
    mime_type: attach.mime || 'application/octet-stream',
  };
  // Always target frozen destId — never re-read state.activeId mid-upload
  var transfer = isRoom
    ? await Tapp.federation.initiateRoomTransfer(destId, meta)
    : await Tapp.federation.initiateTransfer(destId, meta);
  var transferId = transfer && transfer.transfer_id;
  if (!transferId) throw new Error('No transfer_id returned');

  // ARO-04 partial: stream chunks via file.slice instead of holding whole file twice
  var totalSize = file.size || attach.size || 0;
  var totalChunks = Math.max(1, Math.ceil(totalSize / TRANSFER_CHUNK_SIZE));
  var lastPct = -1;

  for (var i = 0; i < totalChunks; i++) {
    var start = i * TRANSFER_CHUNK_SIZE;
    var end = Math.min(start + TRANSFER_CHUNK_SIZE, totalSize);
    var sliceBuf = await file.slice(start, end).arrayBuffer();
    var slice = new Uint8Array(sliceBuf);
    var chunkData = arrayBufferToBase64(slice);
    await Tapp.federation.uploadChunk(transferId, {
      chunk_index: i,
      chunk_data: chunkData,
      chunk_size: slice.length,
    });
    var pct = Math.round(((i + 1) / totalChunks) * 100);
    if (pct >= lastPct + 20 || pct === 100) {
      lastPct = pct;
      try {
        var prog = (lang.transferProgress || 'Uploading… {pct}%').replace('{pct}', String(pct));
        Tapp.ui.showNotification({ title: prog, type: 'info' });
      } catch (e1) { /* ignore */ }
    }
  }

  var msgPayload = {
    filename: attach.name,
    size: attach.size,
    mime_type: attach.mime || 'application/octet-stream',
    transfer_id: transferId,
    text: text || '',
  };
  var quote = (sendCtx && sendCtx.quoteMsg) || state.quoteMsg;
  if (quote) {
    msgPayload.quote_sender = quote.sender;
    msgPayload.quote_text = quote.text;
    msgPayload.quote_id = quote.message_id;
  }
  var sendReq = { payload: msgPayload, message_type: 'file-meta' };
  if (replyTo) sendReq.reply_to = replyTo;
  if (isRoom) {
    await Tapp.federation.sendRoomMessage(destId, sendReq);
  } else {
    await Tapp.federation.sendMessage(destId, sendReq);
  }

  try {
    Tapp.ui.showNotification({ title: lang.transferComplete || 'File sent', type: 'success' });
  } catch (e2) { /* ignore */ }
}

/**
 * Handle WS transfer_progress / transfer_completed / transfer_cancelled for
 * inbound federated file transfers (and outbound multi-tab).
 */
function handleTransferWsEvent(data) {
  if (!data || !data.type) return;
  if (!state.transferUi) state.transferUi = {};
  var tid = data.transfer_id || data.transferId || '';
  if (tid) {
    state.transferUi[tid] = {
      status: data.status || data.type,
      progress: data.progress != null ? Number(data.progress) : (state.transferUi[tid] && state.transferUi[tid].progress) || 0,
      chunks_completed: data.chunks_completed,
      chunks_total: data.chunks_total,
      updatedAt: Date.now(),
    };
  }
  try {
    if (data.type === 'transfer_progress') {
      var pct = Math.round(Number(data.progress) || 0);
      // Throttle toasts: 25% steps only
      var key = tid + ':' + Math.floor(pct / 25);
      if (!state.transferUi._lastToastKey || state.transferUi._lastToastKey !== key) {
        if (pct > 0 && pct < 100) {
          state.transferUi._lastToastKey = key;
          var prog = (lang.transferProgress || 'Receiving… {pct}%').replace('{pct}', String(pct));
          Tapp.ui.showNotification({ title: prog, type: 'info' });
        }
      }
    } else if (data.type === 'transfer_completed') {
      Tapp.ui.showNotification({
        title: lang.transferReceived || lang.transferComplete || 'File ready',
        type: 'success',
      });
      // Reload messages so file-meta / ready status updates
      if (typeof pollMessages === 'function') pollMessages(true);
    } else if (data.type === 'transfer_cancelled') {
      Tapp.ui.showNotification({
        title: lang.transferCancelled || 'Transfer cancelled',
        type: 'info',
      });
    }
  } catch (e) { /* ignore toast errors */ }
}

/** @deprecated use sendChunkedFileTransfer */
async function sendChannelFileTransfer(attach, text, replyTo) {
  return sendChunkedFileTransfer(attach, text, replyTo);
}

function pickFedContent(type) {
  var icons = { tapp: SVG_ICONS.tapp, brew: SVG_ICONS.brew, library: SVG_ICONS.library, report: SVG_ICONS.report };
  var titles = { tapp: lang.selectTapp, brew: lang.selectBrew, library: lang.selectLibrary, report: lang.selectReport };

  if (type === 'tapp') { openTappPicker(icons, titles); return; }
  if (type === 'brew') { openBrewPicker(icons, titles); return; }
  if (type === 'library') { openLibraryPicker(icons, titles); return; }
  if (type === 'report') { openReportPicker(icons, titles); return; }
}

/* ----- Shared overlay helpers ----- */
function createPickerOverlay(type, icons, titles) {
  var overlay = document.createElement('div');
  overlay.className = 'picker-overlay';
  // Closed CSS default is display:none + PE none — open triad after append.
  overlay.style.display = 'none';
  overlay.style.pointerEvents = 'none';
  var visual = sheetVisual({ type: type, rawSvg: icons[type], fallback: SVG_ICONS.file });
  applySheetAccent(overlay, visual.accent);
  overlay.innerHTML =
    '<div class="picker-sheet" role="dialog" aria-modal="true" aria-label="' + esc(titles[type]) + '">'
    + '<div class="picker-header">'
    + '<div class="picker-header-icon">' + visual.icon + '</div>'
    + '<div class="picker-header-text">'
    + '<div class="picker-header-title">' + esc(titles[type]) + '</div>'
    + '<div class="picker-header-sub">' + esc(lang.pickerPickOne || '') + '</div>'
    + '</div>'
    + '<button type="button" class="picker-close-btn" aria-label="' + esc(lang.dismiss || lang.close || 'Close') + '">&times;</button>'
    + '</div>'
    + '<div class="picker-search"><input placeholder="' + esc(lang.pickerSearchPlaceholder) + '" aria-label="' + esc(lang.pickerSearchPlaceholder) + '" /></div>'
    + '<div class="picker-body"></div>'
    + '<div class="picker-footer">'
    + '<button type="button" class="picker-footer-btn picker-btn-cancel">' + esc(lang.pickerCancel) + '</button>'
    + '<button type="button" class="picker-footer-btn picker-btn-confirm" disabled>' + esc(lang.pickerConfirm) + '</button>'
    + '</div>'
    + '</div>';
  var dismissPicker = function () { dismissPickerOverlay(overlay); };
  overlay.querySelector('.picker-close-btn').addEventListener('click', dismissPicker);
  overlay.querySelector('.picker-btn-cancel').addEventListener('click', dismissPicker);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) dismissPicker(); });
  overlay.dataset.aroDismissable = '1';
  document.body.appendChild(overlay);
  if (typeof showAroOverlay === 'function') showAroOverlay(overlay);
  else {
    overlay.style.pointerEvents = 'auto';
    overlay.style.display = 'flex';
  }
  return overlay;
}

function showPickerLoading(body) {
  body.innerHTML = '<div class="picker-loading"><div class="picker-loading-spinner"></div>' + esc(lang.pickerLoading) + '</div>';
}
function showPickerEmpty(body) {
  body.innerHTML = '<div class="picker-empty">' + esc(lang.pickerEmpty) + '</div>';
}

/** getItems: array or () => array (avoids stale empty-list closures after async load). */
function bindPickerSearch(overlay, getItems, renderFn, filterFn) {
  var searchInput = overlay.querySelector('.picker-search input');
  if (!searchInput) return;
  searchInput.addEventListener('input', function () {
    var allItems = typeof getItems === 'function' ? getItems() : getItems;
    if (!allItems) allItems = [];
    var q = this.value.trim().toLowerCase();
    if (!q) { renderFn(allItems); return; }
    renderFn(allItems.filter(function (item) { return filterFn(item, q); }));
  });
}

function dismissPickerOverlay(overlay) {
  if (!overlay) return;
  // Seal PE immediately so a half-closed sheet never blocks the chat shell.
  try { overlay.style.pointerEvents = 'none'; } catch (ePe) { /* ignore */ }
  aroDismiss(overlay, { remove: true, ms: 170 });
}

function bindPickerItems(body, items, confirmBtn, onSelect) {
  bindFaviconFallbacks(body);
  body.querySelectorAll('.picker-item').forEach(function (el) {
    el.addEventListener('click', function () {
      body.querySelectorAll('.picker-item').forEach(function (e) { e.classList.remove('selected'); });
      el.classList.add('selected');
      onSelect(items[parseInt(el.dataset.idx)]);
      confirmBtn.disabled = false;
    });
  });
}

/* ----- Tapp picker (real list from SDK) ----- */
function openTappPicker(icons, titles) {
  var type = 'tapp';
  var overlay = createPickerOverlay(type, icons, titles);
  var body = overlay.querySelector('.picker-body');
  var confirmBtn = overlay.querySelector('.picker-btn-confirm');
  var selectedTapp = null;
  var allTapps = [];

  showPickerLoading(body);

  Tapp.tappList.list().then(function (tapps) {
    allTapps = tapps || [];
    renderTappItems(allTapps);
  }).catch(function () { showPickerEmpty(body); });

  function renderTappItems(items) {
    if (!items.length) { showPickerEmpty(body); return; }
    body.innerHTML = items.map(function (t, i) {
      var meta = t.version || '';
      if (t.status) meta += (meta ? ' · ' : '') + t.status;
      var tv = sheetVisual({ rawSvg: t.iconSvg || '', favicon: t.icon || '', fallback: SVG_ICONS.tapp });
      return '<button type="button" class="picker-item" data-idx="' + i + '">'
        + '<div class="picker-item-icon"' + sheetVisualAttrs(tv, 'tapp') + '>' + tv.icon + '</div>'
        + '<div class="picker-item-body"><div class="picker-item-name">' + esc(t.name) + '</div>'
        + '<div class="picker-item-meta">' + esc(t.id + (meta ? ' · ' + meta : '')) + '</div>'
        + (t.description ? '<div class="picker-item-meta">' + esc(t.description) + '</div>' : '')
        + '</div><div class="picker-item-check">✓</div></button>';
    }).join('');
    bindPickerItems(body, items, confirmBtn, function (t) { selectedTapp = t; });
  }

  bindPickerSearch(overlay, function () { return allTapps; }, renderTappItems, function (t, q) {
    return (t.name || '').toLowerCase().indexOf(q) !== -1
      || (t.id || '').toLowerCase().indexOf(q) !== -1
      || (t.description || '').toLowerCase().indexOf(q) !== -1;
  });

  confirmBtn.addEventListener('click', function () {
    if (!selectedTapp) return;
    confirmBtn.disabled = true;
    var pending = {
      type: type,
      name: selectedTapp.name,
      desc: selectedTapp.description || selectedTapp.id,
      icon: icons[type],
      label: lang.attachTapp || 'Tapp',
      tappId: selectedTapp.id,
      tappVersion: selectedTapp.version || '',
      tappIcon: selectedTapp.iconSvg || selectedTapp.icon || ''
    };
    // P0: resolve portable store catalog URL so peer installFromStore works.
    // (InstallFromStoreRequest.source is catalog URL/id — NEVER the mode "store".)
    // Optional: direct package for offline/custom as secondary path.
    var finish = function () {
      setPendingAttach(pending);
      dismissPickerOverlay(overlay);
    };
    var resolveStore = (typeof Tapp.tappList !== 'undefined' && typeof Tapp.tappList.resolveStoreSource === 'function')
      ? Tapp.tappList.resolveStoreSource(selectedTapp.id).then(function (res) {
          if (res && res.storeSource) {
            pending.storeSource = res.storeSource;
            pending.storeSourceMatched = !!res.matchedApp;
          }
        }).catch(function (e) {
          console.warn('[Aro] resolveStoreSource failed', e);
        })
      : Promise.resolve();
    // Package snapshot for reliability (storeSource remains P0). Cap under
    // channel/room 32 MiB payload + bridge envelope (bridge / backend).
    // Keep package modest: room multi-recipient E2E + JSON envelope easily exceeds 32 MiB.
    // Store catalog URL is the primary install path; package is best-effort offline fallback.
    var TAPP_SHARE_PACKAGE_MAX = 8 * 1024 * 1024;
    var resolvePkg = (typeof Tapp.tappList !== 'undefined' && typeof Tapp.tappList.getInstallPackage === 'function')
      ? Tapp.tappList.getInstallPackage(selectedTapp.id, { maxBytes: TAPP_SHARE_PACKAGE_MAX })
          .then(function (pkgRes) {
            if (pkgRes && pkgRes.package) {
              pending.installPackage = pkgRes.package;
            } else if (pkgRes && pkgRes.reason) {
              pending.installPackageOmitted = pkgRes.reason;
            }
          })
          .catch(function (e) {
            console.warn('[Aro] getInstallPackage failed; store-only share', e);
            pending.installPackageOmitted = 'fetch_failed';
          })
      : Promise.resolve();
    Promise.all([resolveStore, resolvePkg]).then(finish).catch(finish);
  });
}

/* ----- Brew picker (real list from SDK) ----- */
function openBrewPicker(icons, titles) {
  var type = 'brew';
  var overlay = createPickerOverlay(type, icons, titles);
  var body = overlay.querySelector('.picker-body');
  var confirmBtn = overlay.querySelector('.picker-btn-confirm');
  var selectedBrew = null;
  var allBrews = [];

  showPickerLoading(body);

  Tapp.brewList.list({ limit: 50 }).then(function (res) {
    allBrews = (res && res.items) || [];
    renderBrewItems(allBrews);
  }).catch(function () { showPickerEmpty(body); });

  function renderBrewItems(items) {
    if (!items.length) { showPickerEmpty(body); return; }
    body.innerHTML = items.map(function (b, i) {
      var meta = b.source_name || '';
      if (b.author) meta += (meta ? ' · ' : '') + b.author;
      if (b.published_at) meta += (meta ? ' · ' : '') + new Date(b.published_at).toLocaleDateString();
      var bv = sheetVisual({ favicon: b.source_icon || '', slug: b.source_name || '', fallback: SVG_ICONS.brew });
      return '<button type="button" class="picker-item" data-idx="' + i + '">'
        + '<div class="picker-item-icon"' + sheetVisualAttrs(bv, 'brew') + '>' + bv.icon + '</div>'
        + '<div class="picker-item-body"><div class="picker-item-name">' + esc(b.title) + '</div>'
        + (meta ? '<div class="picker-item-meta">' + esc(meta) + '</div>' : '')
        + (b.summary ? '<div class="picker-item-meta">' + esc(b.summary) + '</div>' : '')
        + '</div><div class="picker-item-check">✓</div></button>';
    }).join('');
    bindPickerItems(body, items, confirmBtn, function (b) { selectedBrew = b; });
  }

  bindPickerSearch(overlay, function () { return allBrews; }, renderBrewItems, function (b, q) {
    return (b.title || '').toLowerCase().indexOf(q) !== -1
      || (b.author || '').toLowerCase().indexOf(q) !== -1
      || (b.source_name || '').toLowerCase().indexOf(q) !== -1
      || (b.summary || '').toLowerCase().indexOf(q) !== -1;
  });

  confirmBtn.addEventListener('click', function () {
    if (!selectedBrew) return;
    var desc = selectedBrew.source_name || '';
    if (selectedBrew.author) desc += (desc ? ' · ' : '') + selectedBrew.author;
    // Source mark travels with the message so the receiver renders the site's
    // own icon without re-fetching a brew they may not have.
    setPendingAttach({
      type: type,
      name: selectedBrew.title,
      desc: desc,
      icon: icons[type],
      label: lang.attachBrew || 'Brew',
      brewId: selectedBrew.id,
      brewLink: selectedBrew.link,
      sourceIcon: selectedBrew.source_icon || '',
      sourceName: selectedBrew.source_name || '',
    });
    dismissPickerOverlay(overlay);
  });
}

/* ----- Library picker (platform data) ----- */
/**
 * Resolve stable platform slug for getData / cache paths.
 * listEnabled maps id/key → slug; keep defensive fallbacks for older hosts.
 */
function platformSlug(p) {
  if (!p) return '';
  if (p.key) return String(p.key);
  if (p.slug) return String(p.slug);
  // Skip pure numeric PKs — getData needs the stable slug (steam), not "3".
  // Prefer [0-9] over digit-class escapes: this block is embedded in a template string.
  if (p.id != null && p.id !== '' && !/^[0-9]+$/.test(String(p.id))) return String(p.id);
  return p.id != null ? String(p.id) : '';
}

/** Build a chat-safe library item snapshot (never id-only / blank title). */
function buildLibraryShareSnapshot(item, platformId) {
  var title = '';
  var contentType = '';
  var image = '';
  var itemId = '';
  var description = '';
  var meta = item && item.metadata && typeof item.metadata === 'object' ? item.metadata : null;
  if (item) {
    title = String(item.title || item.name || item.username || '').trim();
    contentType = String(item.type || item.content_type || item.subject_type || '').trim().toLowerCase();
    if (contentType === 'bangumi') contentType = 'anime';
    if (contentType === 'games') contentType = 'game';
    image = String(item.image || item.cover || item.display_image || item.thumbnail || '').trim();
    if (!image && meta) {
      image = String(meta.image || meta.cover || meta.display_image || '').trim();
    }
    if (!image && (platformId === 'steam' || item.platform === 'steam')) {
      var appid = (item.appid != null ? item.appid : (meta && meta.appid)) || item.id;
      if (appid != null && String(appid).match(/^\d+$/)) {
        image = 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + appid + '/header.jpg';
      }
    }
    if (image.indexOf('http://') === 0) image = 'https://' + image.slice(7);
    itemId = item.id != null && item.id !== ''
      ? String(item.id)
      : (item.subject_id != null ? String(item.subject_id)
        : (item.title_id != null ? String(item.title_id)
          : (item.appid != null ? String(item.appid)
            : (meta && meta.appid != null ? String(meta.appid)
              : (meta && meta.bvid ? String(meta.bvid)
                : (meta && meta.season_id != null ? String(meta.season_id) : ''))))));
    description = String(item.description || item.summary || '').trim();
  }
  if (!title) title = itemId || (lang.shareUntitled || 'Untitled');
  var platform = platformId ? String(platformId) : '';
  var descParts = [];
  if (platform) descParts.push(platform);
  if (contentType) descParts.push(contentType);
  if (meta) {
    if (meta.playtime != null && meta.playtime !== '') descParts.push(String(meta.playtime) + ' min');
    else if (item && item.playtime != null) descParts.push(String(item.playtime) + ' min');
    if (meta.rate != null) descParts.push('★ ' + meta.rate);
    else if (meta.score != null) descParts.push('★ ' + meta.score);
  } else if (item) {
    if (item.score !== undefined && item.score !== null) descParts.push('★ ' + item.score);
    if (item.rate !== undefined && item.rate !== null) descParts.push('★ ' + item.rate);
    if (item.year) descParts.push(String(item.year));
  }
  if (!description) description = descParts.join(' · ');
  else if (descParts.length) description = descParts.join(' · ') + (description ? ' · ' + description : '');
  // Structured sender stats travel alongside the text snapshot so the recipient
  // renders the media card (playtime / watch progress / rating) without refetch.
  var statSource = {};
  if (item) { for (var ik in item) if (Object.prototype.hasOwnProperty.call(item, ik)) statSource[ik] = item[ik]; }
  if (meta) { for (var mk in meta) if (Object.prototype.hasOwnProperty.call(meta, mk)) statSource[mk] = meta[mk]; }
  var stats = extractLibraryStats(contentType || (item && item.type) || '', statSource);
  var music = extractMusicMeta(statSource);
  return {
    title: title,
    description: description,
    platform_id: platform,
    item_id: itemId,
    image: image,
    content_type: contentType || 'library',
    playtime_min: stats.playtimeMin,
    rating: stats.rating,
    progress_cur: stats.progressCur,
    progress_total: stats.progressTotal,
    artist: music.artist,
    album: music.album,
  };
}

function openLibraryPicker(icons, titles) {
  var type = 'library';
  var overlay = createPickerOverlay(type, icons, titles);
  var sheet = overlay.querySelector('.picker-sheet');
  var body = overlay.querySelector('.picker-body');
  var confirmBtn = overlay.querySelector('.picker-btn-confirm');
  var selectedItem = null;

  showPickerLoading(body);

  // Insert platform tabs before search
  var searchDiv = overlay.querySelector('.picker-search');
  var tabsDiv = document.createElement('div');
  tabsDiv.className = 'picker-tabs';
  sheet.insertBefore(tabsDiv, searchDiv);

  var allItems = [];
  var activePlatform = null;

  Tapp.platform.listEnabled().then(function (platforms) {
    if (!platforms || !platforms.length) {
      body.innerHTML = '<div class="picker-empty">' + esc(lang.libraryPickerEmpty || lang.pickerEmpty) + '</div>';
      return;
    }
    tabsDiv.innerHTML = platforms.map(function (p) {
      var slug = platformSlug(p);
      return '<button class="picker-tab" data-pid="' + esc(slug) + '">' + (p.icon && p.icon.length <= 4 ? '<span style="margin-right:3px">' + esc(p.icon) + '</span>' : '') + esc(p.name || slug) + '</button>';
    }).join('');
    selectPlatform(platformSlug(platforms[0]));
    tabsDiv.addEventListener('click', function (e) {
      var tab = e.target.closest('.picker-tab');
      if (!tab) return;
      selectPlatform(tab.dataset.pid);
    });
  }).catch(function () {
    body.innerHTML = '<div class="picker-empty">' + esc(lang.libraryPickerLoadFail || lang.loadFail || lang.pickerEmpty) + '</div>';
  });

  function selectPlatform(pid) {
    activePlatform = pid;
    allItems = [];
    selectedItem = null;
    confirmBtn.disabled = true;
    tabsDiv.querySelectorAll('.picker-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.pid === pid);
    });
    showPickerLoading(body);
    // getData expects stable slug (steam), not numeric PK
    Tapp.platform.getData(pid, { limit: 50 }).then(function (res) {
      // Host may return { items }, { data: { items } }, or a bare array.
      var root = res && res.data && typeof res.data === 'object' ? res.data : res;
      var list = [];
      if (Array.isArray(root)) list = root;
      else if (root && Array.isArray(root.items)) list = root.items;
      else if (res && Array.isArray(res.items)) list = res.items;
      allItems = list;
      renderLibraryItems(allItems);
    }).catch(function (err) {
      console.error('[Aro] library getData failed', pid, err);
      body.innerHTML = '<div class="picker-empty">' + esc(lang.libraryPickerLoadFail || lang.loadFail || lang.pickerEmpty) + '</div>';
    });
  }

  function libraryItemCover(item) {
    if (!item) return '';
    var m = item.metadata || {};
    var cover = item.image || item.cover || item.display_image || item.thumbnail
      || m.image || m.cover || '';
    // Legacy steam filters only kept playtime — rebuild CDN art from appid.
    if (!cover && (item.platform === 'steam' || activePlatform === 'steam')) {
      var appid = item.appid || m.appid || item.id;
      if (appid != null && String(appid).match(/^\d+$/)) {
        cover = 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + appid + '/header.jpg';
      }
    }
    if (cover && String(cover).indexOf('http://') === 0) {
      cover = 'https://' + String(cover).slice(7);
    }
    return cover;
  }

  function libraryItemMeta(item) {
    var meta = item.platform || activePlatform || '';
    var itemType = item.type || item.content_type || '';
    if (itemType && itemType !== 'library' && itemType !== 'item') {
      meta += (meta ? ' · ' : '') + itemType;
    }
    var m = item.metadata || {};
    if (item.score !== undefined && item.score !== null) meta += (meta ? ' · ' : '') + '★ ' + item.score;
    else if (m.rate != null) meta += (meta ? ' · ' : '') + '★ ' + m.rate;
    else if (m.score != null) meta += (meta ? ' · ' : '') + '★ ' + m.score;
    if (item.year) meta += (meta ? ' · ' : '') + item.year;
    else {
      var pt = m.playtime != null && m.playtime !== '' ? m.playtime : item.playtime;
      if (pt != null && pt !== '') {
        var mins = Number(pt);
        if (isFinite(mins) && mins > 0) {
          meta += (meta ? ' · ' : '') + (mins >= 60
            ? (Math.round(mins / 60) + 'h')
            : (Math.round(mins) + 'm'));
        } else {
          meta += (meta ? ' · ' : '') + String(pt);
        }
      }
    }
    if (m.progress) meta += (meta ? ' · ' : '') + String(m.progress);
    return meta;
  }

  function renderLibraryItems(items) {
    if (!items.length) {
      body.innerHTML = '<div class="picker-empty">' + esc(lang.libraryPickerEmpty || lang.pickerEmpty) + '</div>';
      return;
    }
    body.innerHTML = items.map(function (item, i) {
      var name = item.title || item.name || item.username || item.id || ('Item ' + (i + 1));
      var meta = libraryItemMeta(item);
      var cover = libraryItemCover(item);
      var lv = sheetVisual({ cover: safeIconUrl(cover), slug: item.platform || activePlatform || '', fallback: SVG_ICONS.library });
      return '<button type="button" class="picker-item" data-idx="' + i + '">'
        + '<div class="picker-item-icon"' + sheetVisualAttrs(lv, 'library') + '>' + lv.icon + '</div>'
        + '<div class="picker-item-body"><div class="picker-item-name">' + esc(name) + '</div>'
        + (meta ? '<div class="picker-item-meta">' + esc(meta) + '</div>' : '')
        + '</div><div class="picker-item-check">✓</div></button>';
    }).join('');
    bindPickerItems(body, items, confirmBtn, function (item) { selectedItem = item; });
  }

  bindPickerSearch(overlay, function () { return allItems; }, renderLibraryItems, function (item, q) {
    var hay = ((item.title || item.name || item.username || item.id || '') + ' ' + (item.type || item.content_type || '') + ' ' + (item.description || '')).toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  confirmBtn.addEventListener('click', function () {
    if (!selectedItem) return;
    var snap = buildLibraryShareSnapshot(selectedItem, activePlatform);
    // Snapshot fields travel with the message so recipients render without re-fetch.
    setPendingAttach({
      type: type,
      name: snap.title,
      desc: snap.description,
      icon: icons[type],
      label: lang.attachLibrary,
      platformId: snap.platform_id,
      itemId: snap.item_id,
      image: snap.image,
      contentType: snap.content_type,
      summary: snap.title,
      playtimeMin: snap.playtime_min,
      rating: snap.rating,
      progressCur: snap.progress_cur,
      progressTotal: snap.progress_total,
      artist: snap.artist,
      album: snap.album,
    });
    dismissPickerOverlay(overlay);
  });
}

/* ----- Report picker ----- */
function openReportPicker(icons, titles) {
  var type = 'report';
  var overlay = createPickerOverlay(type, icons, titles);
  var body = overlay.querySelector('.picker-body');
  var confirmBtn = overlay.querySelector('.picker-btn-confirm');
  var selectedReport = null;
  var allReports = [];

  showPickerLoading(body);

  Tapp.report.listReports().then(function (res) {
    allReports = (res && res.reports) || [];
    renderReportItems(allReports);
  }).catch(function () { showPickerEmpty(body); });

  function renderReportItems(reports) {
    if (!reports.length) { showPickerEmpty(body); return; }
    body.innerHTML = reports.map(function (r, i) {
      var name = r.summary || r.type || ('Report ' + (i + 1));
      var meta = '';
      if (r.platform) meta += r.platform;
      if (r.type) meta += (meta ? ' · ' : '') + r.type;
      if (r.createdAt) meta += (meta ? ' · ' : '') + new Date(r.createdAt).toLocaleDateString();
      var rv = sheetVisual({ slug: r.platform || '', fallback: SVG_ICONS.report });
      return '<button type="button" class="picker-item" data-idx="' + i + '">'
        + '<div class="picker-item-icon"' + sheetVisualAttrs(rv, 'report') + '>' + rv.icon + '</div>'
        + '<div class="picker-item-body"><div class="picker-item-name">' + esc(name) + '</div>'
        + (meta ? '<div class="picker-item-meta">' + esc(meta) + '</div>' : '')
        + '</div><div class="picker-item-check">✓</div></button>';
    }).join('');
    bindPickerItems(body, reports, confirmBtn, function (r) { selectedReport = r; });
  }

  bindPickerSearch(overlay, function () { return allReports; }, renderReportItems, function (r, q) {
    return ((r.summary || '') + ' ' + (r.type || '') + ' ' + (r.platform || '')).toLowerCase().indexOf(q) !== -1;
  });

  confirmBtn.addEventListener('click', function () {
    if (!selectedReport) return;
    var snap = buildReportShareSnapshot(selectedReport);
    var name = snap.summary || selectedReport.type || 'Report';
    var desc = snap.platform || '';
    if (selectedReport.createdAt) desc += (desc ? ' · ' : '') + new Date(selectedReport.createdAt).toLocaleDateString();
    // Snapshot fields travel with the message so recipients can render without getReport (user-scoped).
    setPendingAttach({
      type: type,
      name: name,
      desc: desc,
      icon: icons[type],
      label: lang.attachReport,
      reportId: snap.report_id,
      summary: snap.summary,
      platform: snap.platform,
      contentPreview: snap.content_preview,
    });
    dismissPickerOverlay(overlay);
  });
}

/**
 * Build a chat/federation-safe report snapshot.
 * Field names: report_id, summary, platform, content_preview.
 * Mirrored by frontend/src/tapp/utils/reportShareSnapshot.ts (unit-tested).
 * Does not include full report JSON — only what chat recipients need to render.
 */
function buildReportShareSnapshot(report) {
  var reportId = report && (report.id != null ? report.id : report.report_id);
  var platform = (report && (report.platform || report.platform_id)) || '';
  var summary = '';
  if (report) {
    if (report.summary) summary = String(report.summary);
    else if (report.report_title) summary = String(report.report_title);
    else if (report.type) summary = String(report.type);
  }
  var preview = '';
  if (report) {
    if (report.content_preview) preview = String(report.content_preview);
    else if (report.summary) preview = String(report.summary);
    else preview = formatReportContentBody(report.content, '');
  }
  preview = stripHtmlPreview(preview || '').trim();
  if (preview.length > 500) preview = preview.slice(0, 500);
  if (!summary) summary = preview ? preview.slice(0, 80) : 'Report';
  return {
    report_id: reportId != null && reportId !== '' ? String(reportId) : '',
    summary: summary,
    platform: platform ? String(platform) : '',
    content_preview: preview,
  };
}

/**
 * Format structured report content into readable plain text.
 * Never produces "[object Object]" — walks known fields (summary, insights, 综合分析).
 * Mirrored by formatReportContentBody in reportShareSnapshot.ts.
 */
function formatReportContentBody(content, fallbackPreview) {
  if (content == null || content === '') return fallbackPreview || '';
  if (typeof content === 'string') {
    var s = stripHtmlPreview(content).trim();
    return s || fallbackPreview || '';
  }
  if (typeof content === 'number' || typeof content === 'boolean') return String(content);
  if (typeof content !== 'object') return fallbackPreview || '';

  var parts = [];
  if (typeof content.summary === 'string' && content.summary.trim()) {
    parts.push(content.summary.trim());
  }
  if (Array.isArray(content.insights)) {
    for (var i = 0; i < content.insights.length; i++) {
      var item = content.insights[i];
      if (item == null || item === '') continue;
      if (typeof item === 'string' || typeof item === 'number') {
        parts.push('• ' + String(item));
      }
    }
  }
  var analysis = content['综合分析'];
  if (analysis && typeof analysis === 'object') {
    if (typeof analysis['总体画像'] === 'string' && analysis['总体画像'].trim()) {
      parts.push(String(analysis['总体画像']).trim());
    } else if (analysis.content && typeof analysis.content === 'object' && typeof analysis.content['总体画像'] === 'string') {
      parts.push(String(analysis.content['总体画像']).trim());
    }
  } else if (typeof analysis === 'string' && analysis.trim()) {
    parts.push(analysis.trim());
  }
  // Use fromCharCode so this survives PAGE_MOD template-literal embedding (avoids '\n' escape issues).
  var nl = String.fromCharCode(10);
  if (parts.length) return parts.join(nl);

  // Last resort: primitive key/value lines (not JSON dump, not [object Object])
  try {
    var keys = Object.keys(content);
    for (var k = 0; k < keys.length && k < 12; k++) {
      var v = content[keys[k]];
      if (v == null) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        var line = String(v).trim();
        if (line) parts.push(keys[k] + ': ' + line);
      }
    }
  } catch (e) { /* ignore */ }
  if (parts.length) return parts.join(nl);
  return fallbackPreview || '';
}

/**
 * Structured HTML sections for report *detail* (owner getReport path).
 * Complementary to formatReportContentBody (plain text used for share snapshots).
 * Never esc() objects — only primitives/arrays of primitives.
 */
function formatReportFieldValueHtml(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    var s = String(value).trim();
    return s ? esc(s) : '';
  }
  if (Array.isArray(value)) {
    var items = value.filter(function (v) {
      return v != null && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
    }).map(function (v) { return String(v).trim(); }).filter(Boolean);
    if (!items.length) return '';
    return '<ul>' + items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>';
  }
  return '';
}

function isSkippedReportContentKey(key) {
  return /^(id|platform|type|summary|created_?at|metadata|card_visuals|cardVisuals|theme_color|visual_style|decorative_emojis|card_subtitle|key_metric|theme_icon|icon_image_url|icon_prompt|background_elements|platform_reports)$/i.test(key)
    || key === '综合分析'
    || key === 'comprehensive_analysis';
}

function formatReportContentSectionsHtml(content) {
  if (content == null || content === '') return '';
  if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
    var plain = String(content).trim();
    return plain ? '<div class="sheet-text sheet-scroll">' + esc(plain) + '</div>' : '';
  }
  if (typeof content !== 'object') return '';

  var sections = [];
  function pushSection(label, bodyHtml) {
    if (!bodyHtml) return;
    sections.push(
      '<div class="sheet-section">'
      + (label ? '<div class="sheet-label">' + esc(label) + '</div>' : '')
      + bodyHtml
      + '</div>'
    );
  }

  if (Array.isArray(content.insights) && content.insights.length) {
    pushSection(
      lang.reportInsights || 'Insights',
      formatReportFieldValueHtml(content.insights)
    );
  }

  var analysis = content['综合分析'] || content.comprehensive_analysis;
  if (analysis && typeof analysis === 'object') {
    var analysisParts = [];
    Object.keys(analysis).forEach(function (k) {
      if (isSkippedReportContentKey(k)) return;
      var fieldHtml = formatReportFieldValueHtml(analysis[k]);
      if (!fieldHtml) return;
      analysisParts.push(
        '<div class="sheet-section" style="margin-bottom:10px">'
        + '<div class="sheet-label">' + esc(k) + '</div>'
        + '<div class="sheet-text">' + fieldHtml + '</div>'
        + '</div>'
      );
    });
    if (analysisParts.length) {
      pushSection(lang.reportAnalysis || 'Analysis', analysisParts.join(''));
    }
  } else if (typeof analysis === 'string' && analysis.trim()) {
    pushSection(lang.reportAnalysis || 'Analysis', '<div class="sheet-text">' + esc(analysis.trim()) + '</div>');
  }

  Object.keys(content).forEach(function (k) {
    if (isSkippedReportContentKey(k) || k === 'insights') return;
    var fieldHtml = formatReportFieldValueHtml(content[k]);
    if (!fieldHtml) return;
    pushSection(k, '<div class="sheet-text">' + fieldHtml + '</div>');
  });

  if (!sections.length) return '';
  return '<div class="sheet-section sheet-scroll" style="gap:14px">' + sections.join('') + '</div>';
}

/** Full structured detail HTML: summary / platform / type / date + sectioned content. */
function renderReportDetailBodyHtml(detail) {
  detail = detail || {};
  var content = detail.content;
  var summary = detail.summary || '';
  var platform = detail.platform || '';
  var type = detail.type || '';
  var createdAt = detail.createdAt || detail.created_at || '';

  if (content && typeof content === 'object') {
    if (!summary && content.summary) summary = content.summary;
    if (!platform && content.platform) platform = content.platform;
    if (!createdAt && (content.createdAt || content.created_at)) {
      createdAt = content.createdAt || content.created_at;
    }
  }

  var title = summary || detail.name || type || (lang.attachReport || 'Report');
  var metaParts = [];
  if (platform) metaParts.push(platform);
  if (type) metaParts.push(type);
  if (createdAt) {
    try {
      var d = new Date(createdAt);
      if (!isNaN(d.getTime())) metaParts.push(d.toLocaleDateString(currentLocale));
    } catch (e) { /* ignore */ }
  }

  var html = '<div class="sheet-pad">';
  html += sheetMetaHtml(metaParts);
  // When summary *is* the title the sheet header already shows it; only render
  // it here when the header title came from somewhere else (name / type).
  if (summary && summary !== title) {
    html += '<div class="sheet-section">'
      + '<div class="sheet-label">' + esc(lang.reportSummary || 'Summary') + '</div>'
      + '<div class="sheet-text">' + esc(summary) + '</div>'
      + '</div>';
  }

  var contentHtml = formatReportContentSectionsHtml(content);
  if (contentHtml) {
    html += contentHtml;
  } else if (!summary) {
    // Fall back to plain-text formatter when no sectionable fields.
    // .sheet-desc is pre-wrap, so newlines survive without <br> splicing.
    var plain = formatReportContentBody(content, '');
    if (plain) html += '<div class="sheet-desc sheet-scroll">' + esc(plain) + '</div>';
  }
  html += '</div>';
  return html;
}

function setPendingAttach(attach) {
  state.pendingAttach = attach;
  renderAttachPreview();
  updateSendState();
}

function clearPendingAttach() {
  state.pendingAttach = null;
  var preview = $('attach-preview');
  if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
  // Reset file inputs
  var fi = $('attach-file-input'); if (fi) fi.value = '';
  var ii = $('attach-image-input'); if (ii) ii.value = '';
  updateSendState();
}

function renderAttachPreview() {
  var preview = $('attach-preview');
  if (!preview || !state.pendingAttach) return;
  var a = state.pendingAttach;
  var html = '';
  if (a.type === 'image' && a.data) {
    html += '<div class="attach-preview-thumb"><img src="' + esc(a.data) + '" alt="" /></div>';
  } else if (a.type === 'file') {
    html += '<div class="attach-preview-icon attach-icon-file" style="background:rgba(245,158,11,.1)">' + SVG_ICONS.file + '</div>';
  } else {
    var iconBg = { tapp: 'rgba(var(--tapp-primary-rgb,100,100,255),.1)', brew: 'rgba(34,197,94,.1)', library: 'rgba(168,85,247,.1)', report: 'rgba(239,68,68,.1)' };
    html += '<div class="attach-preview-icon" style="background:' + (iconBg[a.type] || 'rgba(128,128,128,.06)') + '">' + (a.icon || SVG_ICONS.file) + '</div>';
  }
  html += '<div class="attach-preview-info">'
    + '<div class="attach-preview-name">' + esc(a.name || '') + '</div>'
    + '<div class="attach-preview-meta">' + (a.size ? formatFileSize(a.size) : (a.label || a.type)) + '</div>'
    + '</div>'
    + '<button type="button" class="attach-preview-remove" id="attach-remove" title="' + esc(lang.remove || lang.dismiss || 'Remove') + '" aria-label="' + esc(lang.remove || lang.dismiss || 'Remove') + '">&times;</button>';
  preview.innerHTML = html;
  preview.style.display = 'flex';
  aroPlayEnter(preview, 'aro-attach-enter');
  var removeBtn = $('attach-remove');
  if (removeBtn) removeBtn.addEventListener('click', clearPendingAttach);
}
