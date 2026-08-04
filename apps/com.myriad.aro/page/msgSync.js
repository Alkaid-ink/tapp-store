// ==================== Message sync (fingerprint / merge / optimistic) ====================
// Extracted from api.js. Depends on: helpers (isE2e*), state, chat (render/schedule).
// Load after helpers + msgUi/chat symbols used only at call time.

/** Fingerprint message list so pin/content changes refresh even when count stays the same. */
function messagesFingerprint(msgs) {
  if (!msgs || !msgs.length) return '0';
  var parts = [];
  for (var i = 0; i < msgs.length; i++) {
    var msg = msgs[i] || {};
    var payload = msg.payload;
    var body = '';
    var kind = typeof payload;
    try {
      if (typeof isE2eCiphertextEnvelope === 'function' && isE2eCiphertextEnvelope(payload)) {
        kind = 'cipher';
        body = String(payload.ciphertext || '');
      } else if (typeof payload === 'string') {
        body = payload;
      } else if (payload && typeof payload === 'object') {
        var primary = payload.text || payload.title || payload.filename
          || payload.url || payload.data || payload.description || '';
        body = String(primary);
        kind = 'object:' + Object.keys(payload).sort().join(',');
      }
    } catch (eFp) { /* ignore malformed payloads */ }
    // Every row participates. In particular, a non-tail ciphertext becoming
    // plaintext must repaint even when message count and the final row stay put.
    parts.push([
      msg.message_id || '',
      msg.created_at || '',
      msg.is_pinned ? '1' : '0',
      msg.is_encrypted ? '1' : '0',
      kind,
      body.length,
      body.slice(0, 48),
      body.slice(-24),
    ].join(':'));
  }
  return msgs.length + '|' + parts.join('|');
}

function hasCiphertextMessages() {
  if (typeof state === 'undefined' || !Array.isArray(state.messages)) return false;
  for (var i = 0; i < state.messages.length; i++) {
    if (
      typeof isE2eCiphertextEnvelope === 'function'
      && isE2eCiphertextEnvelope(state.messages[i] && state.messages[i].payload)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Prefer decrypted/plain payloads over WS ciphertext envelopes.
 * Host WS often echoes storage form {algorithm,ciphertext,...} while GET history
 * returns decrypted JSON — a late WS event must not clobber good plaintext.
 * Also: poll must not replace a good plain bubble with a failed-decrypt ciphertext.
 */
function preferDisplayPayload(existingMsg, incomingMsg) {
  var out = Object.assign({}, existingMsg || {}, incomingMsg || {});
  var oldP = existingMsg && existingMsg.payload;
  var newP = incomingMsg && incomingMsg.payload;
  var oldEnc = typeof isE2eCiphertextEnvelope === 'function' && isE2eCiphertextEnvelope(oldP);
  var newEnc = typeof isE2eCiphertextEnvelope === 'function' && isE2eCiphertextEnvelope(newP);
  if (newEnc && oldP && !oldEnc) {
    out.payload = oldP;
    // Keep display flags consistent with retained plaintext
    if (existingMsg && existingMsg.is_encrypted === false) out.is_encrypted = false;
  } else if (oldEnc && newP && !newEnc) {
    out.payload = newP;
    out.is_encrypted = false;
  } else if (!newEnc && newP) {
    // Incoming is plain — clear stale encrypted flag from storage shape
    if (out.is_encrypted && !isE2eCiphertextEnvelope(out.payload)) {
      out.is_encrypted = false;
    }
  }
  return out;
}

/**
 * Live-window page size (open + poll). Older history is loaded via before= pages.
 * Kept modest so open/poll stay snappy; load-older preserves prior messages.
 */
var MSG_WINDOW_LIMIT = 50;

/** Merge server/WS lists without letting ciphertext stomp known-good plaintext.
 *  Also preserves older pages (loaded via before=) and optimistic local bubbles
 *  that are not present in the latest tail window.
 */
function mergeMessageLists(prev, next) {
  prev = Array.isArray(prev) ? prev : [];
  next = Array.isArray(next) ? next : [];
  if (!next.length) return prev.slice(); // empty poll must not wipe history
  if (!prev.length) return next.slice();

  // Null-prototype maps: message_id comes off the wire (a peer sets
  // `object.messageId` verbatim). With a plain object a message id of
  // `constructor` / `toString` reads back a truthy inherited value, so the
  // prior copy gets treated as "already in next" and silently dropped.
  var byId = Object.create(null);
  for (var i = 0; i < prev.length; i++) {
    var p = prev[i];
    if (p && p.message_id) byId[p.message_id] = p;
  }
  var nextIds = Object.create(null);
  for (var j0 = 0; j0 < next.length; j0++) {
    if (next[j0] && next[j0].message_id) nextIds[next[j0].message_id] = true;
  }

  // Tail window bounds — keep history below and WS-ahead rows above the poll page.
  var oldestNext = next[0];
  var newestNext = next[next.length - 1];
  var oldestTs = oldestNext && oldestNext.created_at ? String(oldestNext.created_at) : '';
  var newestTs = newestNext && newestNext.created_at ? String(newestNext.created_at) : '';

  var out = [];
  // 1) Keep prior messages not in next: older history, optimistic, or newer-than-poll (WS race)
  for (var pi = 0; pi < prev.length; pi++) {
    var pm = prev[pi];
    if (!pm || !pm.message_id) continue;
    if (nextIds[pm.message_id]) continue;
    if (pm._optimistic) {
      out.push(pm);
      continue;
    }
    var pts = pm.created_at ? String(pm.created_at) : '';
    if (oldestTs && pts && pts < oldestTs) {
      out.push(pm);
      continue;
    }
    if (newestTs && pts && pts > newestTs) {
      out.push(pm);
      continue;
    }
    // Same-window id missing from poll: keep if still looking "pending" (no created_at)
    if (!pts) out.push(pm);
  }
  // 2) Append/update tail from server window
  for (var j = 0; j < next.length; j++) {
    var n = next[j];
    if (!n) continue;
    var old = n.message_id ? byId[n.message_id] : null;
    out.push(old ? preferDisplayPayload(old, n) : n);
  }
  // Stable ASC by created_at then message_id
  out.sort(function (a, b) {
    var ca = String((a && a.created_at) || '');
    var cb = String((b && b.created_at) || '');
    if (ca !== cb) return ca < cb ? -1 : 1;
    return String((a && a.message_id) || '').localeCompare(String((b && b.message_id) || ''));
  });
  return out;
}

/** Drop optimistic bubbles once real server copies (or send failure) settle. */
function pruneOptimisticMessages(opts) {
  opts = opts || {};
  if (!state.messages || !state.messages.length) return false;
  var before = state.messages.length;
  if (opts.all) {
    state.messages = state.messages.filter(function (m) { return !m || !m._optimistic; });
  } else if (opts.id) {
    state.messages = state.messages.filter(function (m) {
      return !m || m.message_id !== opts.id;
    });
  } else {
    // Match optimistic text OR light media filename+size against confirmed local messages
    var localKeys = Object.create(null);
    state.messages.forEach(function (m) {
      if (!m || m._optimistic) return;
      if (typeof isLocalActor === 'function' && !isLocalActor(m.sender_actor)) return;
      var t = typeof getPayloadText === 'function' ? getPayloadText(m.payload) : '';
      if (t) localKeys['t:' + t] = true;
      var p = m.payload && typeof m.payload === 'object' ? m.payload : {};
      if (p.filename) localKeys['f:' + p.filename + ':' + (p.size || '')] = true;
      if (p.data && typeof p.data === 'string' && p.data.length < 80) {
        localKeys['d:' + p.data.slice(0, 48)] = true;
      }
    });
    state.messages = state.messages.filter(function (m) {
      if (!m || !m._optimistic) return true;
      var t = typeof getPayloadText === 'function' ? getPayloadText(m.payload) : '';
      if (t && localKeys['t:' + t]) return false;
      var p = m.payload && typeof m.payload === 'object' ? m.payload : {};
      if (p.filename && localKeys['f:' + p.filename + ':' + (p.size || '')]) return false;
      // Stale optimistic > 60s
      try {
        if (m.created_at && (Date.now() - new Date(m.created_at).getTime()) > 60000) return false;
      } catch (eAge) { /* keep */ }
      return true;
    });
  }
  if (state.messages.length !== before) {
    state.messagesFp = messagesFingerprint(state.messages);
    return true;
  }
  return false;
}

function pushOptimisticMessage(msgType, payload, opts) {
  opts = opts || {};
  var id = 'opt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  var msg = {
    message_id: id,
    sender_actor: state.localActorUrl || '',
    message_type: msgType || 'text',
    payload: payload || {},
    reply_to: opts.replyTo || null,
    is_encrypted: !!opts.encrypt,
    is_pinned: false,
    created_at: new Date().toISOString(),
    _optimistic: true,
  };
  if (!state.messages) state.messages = [];
  state.messages.push(msg);
  state.messagesFp = messagesFingerprint(state.messages);
  if (typeof renderMessages === 'function') {
    renderMessages({ animateNew: true, newCount: 1, stickBottom: true });
  }
  return id;
}

var DECRYPT_REFRESH_DELAYS = [120, 500, 1500, 4000, 10000];
var _decryptRefreshTimer = null;
var _decryptRefreshAttempt = 0;
var _decryptRefreshScope = '';
var _decryptRefreshInFlight = false;
var _decryptRefreshRun = 0;

function currentDecryptRefreshScope() {
  if (typeof state === 'undefined' || !state.activeKind || !state.activeId) return '';
  return state.activeKind + ':' + state.activeId + ':' + String(state.openGen || 0);
}

function cancelDecryptRefresh() {
  _decryptRefreshRun += 1;
  if (_decryptRefreshTimer != null) {
    try { clearTimeout(_decryptRefreshTimer); } catch (e) { /* ignore */ }
  }
  _decryptRefreshTimer = null;
  _decryptRefreshAttempt = 0;
  _decryptRefreshScope = '';
  _decryptRefreshInFlight = false;
}

function scheduleDecryptRefresh(opts) {
  opts = opts || {};
  var scope = currentDecryptRefreshScope();
  if (!scope || !hasCiphertextMessages()) {
    cancelDecryptRefresh();
    return;
  }

  if (_decryptRefreshScope !== scope) {
    cancelDecryptRefresh();
    _decryptRefreshScope = scope;
  }
  if (opts.reset) _decryptRefreshAttempt = 0;
  if (opts.immediate && _decryptRefreshTimer != null) {
    try { clearTimeout(_decryptRefreshTimer); } catch (eClear) { /* ignore */ }
    _decryptRefreshTimer = null;
  }
  if (_decryptRefreshTimer != null || _decryptRefreshInFlight) return;
  if (_decryptRefreshAttempt >= DECRYPT_REFRESH_DELAYS.length) return;

  var run = _decryptRefreshRun;
  var delay = opts.immediate ? 0 : DECRYPT_REFRESH_DELAYS[_decryptRefreshAttempt];
  _decryptRefreshAttempt += 1;
  _decryptRefreshTimer = setTimeout(function () {
    _decryptRefreshTimer = null;
    if (run !== _decryptRefreshRun || scope !== currentDecryptRefreshScope()) return;
    if (!hasCiphertextMessages()) {
      cancelDecryptRefresh();
      return;
    }

    _decryptRefreshInFlight = true;
    var request = typeof pollMessages === 'function'
      ? pollMessages(true, {
        messagesOnly: true,
        stickBottom: false,
        skipDecryptSchedule: true,
      })
      : Promise.resolve();
    Promise.resolve(request).catch(function (ePoll) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Aro] decrypt refresh failed:', ePoll);
      }
    }).then(function () {
      if (run !== _decryptRefreshRun || scope !== currentDecryptRefreshScope()) return;
      _decryptRefreshInFlight = false;
      if (!hasCiphertextMessages()) {
        cancelDecryptRefresh();
        return;
      }
      scheduleDecryptRefresh();
    });
  }, delay);
}

function mergeIncomingMessage(msg) {
  if (!msg || !msg.message_id) return false;
  // Realtime can race a conversation switch; never mutate without an active chat.
  if (!state.activeId || !state.activeKind) return false;
  var needsDecryptRefresh = typeof isE2eCiphertextEnvelope === 'function'
    && isE2eCiphertextEnvelope(msg.payload);
  for (var i = 0; i < state.messages.length; i++) {
    if (state.messages[i].message_id === msg.message_id) {
      var merged = preferDisplayPayload(state.messages[i], msg);
      // If we still only have ciphertext, keep UI placeholder until poll decrypts
      if (typeof isE2eCiphertextEnvelope === 'function'
        && isE2eCiphertextEnvelope(merged.payload)) {
        needsDecryptRefresh = true;
      }
      state.messages[i] = merged;
      state.messagesFp = messagesFingerprint(state.messages);
      if (typeof scheduleRenderMessages === 'function') scheduleRenderMessages({ forceFull: true });
      else renderMessages({ forceFull: true });
      if (needsDecryptRefresh) scheduleDecryptRefresh();
      return true;
    }
  }
  state.messages.push(msg);
  state.messagesFp = messagesFingerprint(state.messages);
  if (typeof scheduleRenderMessages === 'function') {
    scheduleRenderMessages({ animateNew: true, newCount: 1 });
  } else {
    renderMessages({ animateNew: true, newCount: 1 });
  }
  if (needsDecryptRefresh) scheduleDecryptRefresh({ reset: true });
  return true;
}
