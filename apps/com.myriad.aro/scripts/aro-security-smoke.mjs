/**
 * Aro security + architecture smoke checks (ARO-01..14 subset).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const page = (n) => readFileSync(join(root, 'page', n), 'utf8')
const main = readFileSync(join(root, 'index.js'), 'utf8')

const helpers = page('helpers.js')
const chat = page('chat.js')
const api = page('api.js')
const attachments = page('attachments.js')
const history = page('history.js')
const files = page('files.js')
const events = page('events.js')
const index = page('index.js')
const views = page('views.js')
const msgUi = page('msgUi.js')
const members = page('members.js')
const msgSync = page('msgSync.js')

// Security (prior)
assert.match(helpers, /function sanitizeRemoteSvg/)
assert.match(helpers, /function isValidStoreSourceRef/)
assert.match(helpers, /function safeInlineDownload/)
assert.match(helpers, /function safeMessageImageUrl/)
assert.match(helpers, /function createDisposableBag/)
assert.match(helpers, /function pageListen/)
assert.match(views, /pageListen\(document/)
// ARO-01: a remote tapp icon must never reach innerHTML unsanitized.
// Matched loosely on the argument: chat.js reads it via shareCardPayload(card),
// msgUi.js via payload — an exact-expression assertion went stale on the first
// rename and failed the whole suite while the property still held.
assert.match(chat, /sanitizeRemoteSvg\(.{0,60}?tapp_icon/)
assert.match(msgUi, /sanitizeRemoteSvg\(.{0,60}?tapp_icon/)
// Image bubbles are rendered in msgUi.js (moved out of chat.js) — the src must
// still go through the message-sized URL validator.
assert.match(msgUi, /safeMessageImageUrl/)
assert.doesNotMatch(api, /delete sendReq\.encrypt/)
assert.match(api, /var ctx = \{/)
assert.match(attachments, /file\.slice\(/)

// Chat image bubbles must not use the tiny icon data: cap (256 KiB) alone
const safeMessageImageUrl = new Function(helpers + '; return safeMessageImageUrl;')()
const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
assert.ok(safeMessageImageUrl(tiny), 'tiny data:image ok')
// ~400 KiB base64 body would fail safeIconUrl (256 KiB) but must pass for chat
const mid = 'data:image/jpeg;base64,' + 'A'.repeat(400 * 1024)
assert.ok(safeMessageImageUrl(mid), 'mid-size chat image data URL must pass')
assert.equal(safeMessageImageUrl('javascript:alert(1)'), '')
assert.equal(safeMessageImageUrl('/media/federation/1/wallhaven-1p9529.jpg'), '/media/federation/1/wallhaven-1p9529.jpg')
assert.equal(safeMessageImageUrl('/media/federation/1/../evil.jpg'), '')

// esc() must be safe in *attribute* context, not just text context.
//
// It is interpolated into ~176 double-quoted attributes, several fed by
// peer-controlled data (member actor_url, message payload.filename/quote_id).
// The old textContent→innerHTML round-trip left `"` unescaped, so a remote
// could close the attribute and inject markup into the Aro page.
const esc = new Function(helpers + '; return esc;')()
assert.equal(esc('<b>&'), '&lt;b&gt;&amp;', 'text context unchanged')
assert.ok(!esc('x" onmouseover="alert(1)').includes('"'), 'double quotes must be encoded')
assert.ok(!esc("y' onerror='alert(1)").includes("'"), 'single quotes must be encoded')
assert.equal(esc(null), '')
assert.equal(esc(undefined), '')
// esc() must not need a DOM (it runs before the page sandbox is ready).
assert.equal(typeof globalThis.document, 'undefined', 'esc must be DOM-free')
// Attribute sinks that carry remote data stay wrapped.
assert.match(members, /data-actor="'\s*\n?\s*\+ esc\(m\.actor_url/)
assert.match(msgUi, /data-quote-id="'\s*\+ esc\(qId\)/)

// ARO-13 thin main
assert.ok(main.length < 12000, 'main index.js should stay thin, got ' + main.length)
assert.match(main, /pageModules|headless|background/i)
assert.doesNotMatch(main, /function renderMessages\s*\(/)
assert.doesNotMatch(main, /function openConversation\s*\(/)

// ARO-12 parseable boundaries
assert.match(views, /function bindEvents\s*\(/)
assert.match(index, /async function init\s*\(/)
assert.doesNotMatch(events, /async function init\s*\(/)
assert.doesNotMatch(events, /function bindEvents\s*\(/)
assert.match(events, /Event binding lives in views\.js/)

// ARO-06 / 07
assert.match(history, /ARO_IMPORT_MAX_BYTES|ARO-07/)
assert.match(history, /scope = \{ kind: h\.kind/)
assert.match(files, /scope = \{ roomId:/)

// ARO-14
assert.match(index, /disposePageSession/)
assert.match(helpers, /disposePageSession/)

// syntax check page modules that should parse alone
for (const f of ['events.js', 'index.js', 'helpers.js', 'state.js', 'i18n.js', 'msgSync.js', 'api.js']) {
  const r = spawnSync(process.execPath, ['--check', join(root, 'page', f)], { encoding: 'utf8' })
  assert.equal(r.status, 0, f + ' syntax: ' + (r.stderr || r.stdout))
}
// views.js is huge but must parse
const rv = spawnSync(process.execPath, ['--check', join(root, 'page', 'views.js')], { encoding: 'utf8' })
assert.equal(rv.status, 0, 'views.js syntax: ' + (rv.stderr || ''))

// pure isValidStoreSourceRef
const isValidStoreSourceRef = new Function(helpers + '; return isValidStoreSourceRef;')()
assert.equal(isValidStoreSourceRef('1'), true)
assert.equal(isValidStoreSourceRef('store'), false)
assert.equal(isValidStoreSourceRef('http://x/y'), false)

const isCiphertext = (payload) => !!(
  payload
  && typeof payload === 'object'
  && typeof payload.ciphertext === 'string'
)

function makeFakeClock() {
  let now = 0
  let nextId = 1
  const timers = new Map()
  const setTimeoutFake = (fn, delay = 0) => {
    const id = nextId++
    timers.set(id, { at: now + Math.max(0, Number(delay) || 0), fn })
    return id
  }
  const clearTimeoutFake = (id) => timers.delete(id)
  const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }
  const advanceBy = async (ms) => {
    const target = now + ms
    while (true) {
      await flush()
      let next = null
      for (const [id, timer] of timers) {
        if (timer.at > target) continue
        if (!next || timer.at < next.timer.at || (timer.at === next.timer.at && id < next.id)) {
          next = { id, timer }
        }
      }
      if (!next) break
      now = next.timer.at
      timers.delete(next.id)
      next.timer.fn()
    }
    now = target
    await flush()
  }
  return {
    setTimeout: setTimeoutFake,
    clearTimeout: clearTimeoutFake,
    advanceBy,
    pending: () => timers.size,
    flush,
  }
}

function makeMsgSyncHarness({ state, clock, pollMessages }) {
  return new Function(
    'state',
    'setTimeout',
    'clearTimeout',
    'pollMessages',
    'isE2eCiphertextEnvelope',
    'console',
    msgSync + '; return {'
      + 'messagesFingerprint,'
      + 'scheduleDecryptRefresh,'
      + 'cancelDecryptRefresh'
      + '};',
  )(
    state,
    clock.setTimeout,
    clock.clearTimeout,
    pollMessages,
    isCiphertext,
    { warn() {} },
  )
}

// A non-tail ciphertext becoming plaintext must invalidate the live-window fingerprint.
{
  const state = { activeKind: 'channel', activeId: 'fp', openGen: 1, messages: [] }
  const clock = makeFakeClock()
  const sync = makeMsgSyncHarness({ state, clock, pollMessages: async () => {} })
  const tail = { message_id: 'm2', created_at: '2026-08-04T00:00:02Z', payload: { text: 'tail' } }
  const encrypted = [
    { message_id: 'm1', created_at: '2026-08-04T00:00:01Z', payload: { ciphertext: 'abc' }, is_encrypted: true },
    tail,
  ]
  const decrypted = [
    { message_id: 'm1', created_at: '2026-08-04T00:00:01Z', payload: { text: 'plain' }, is_encrypted: false },
    tail,
  ]
  assert.notEqual(sync.messagesFingerprint(encrypted), sync.messagesFingerprint(decrypted))
}

// Persistent ciphertext uses one bounded retry chain, never a timer fan-out.
{
  const state = {
    activeKind: 'channel',
    activeId: 'retry',
    openGen: 1,
    messages: [{ message_id: 'm1', payload: { ciphertext: 'abc' } }],
  }
  const clock = makeFakeClock()
  let calls = 0
  let active = 0
  let maxActive = 0
  const sync = makeMsgSyncHarness({
    state,
    clock,
    pollMessages: async () => {
      calls++
      active++
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active--
    },
  })
  sync.scheduleDecryptRefresh({ reset: true })
  sync.scheduleDecryptRefresh()
  await clock.advanceBy(30000)
  assert.equal(calls, 5, 'decrypt retries must have a fixed total budget')
  assert.equal(maxActive, 1, 'decrypt retries must be single-flight')
  assert.equal(clock.pending(), 0)
}

// Once GET returns plaintext, no later retry timer may keep polling.
{
  const state = {
    activeKind: 'channel',
    activeId: 'success',
    openGen: 1,
    messages: [{ message_id: 'm1', payload: { ciphertext: 'abc' } }],
  }
  const clock = makeFakeClock()
  let calls = 0
  const sync = makeMsgSyncHarness({
    state,
    clock,
    pollMessages: async () => {
      calls++
      state.messages = [{ message_id: 'm1', payload: { text: 'plain' } }]
    },
  })
  sync.scheduleDecryptRefresh({ reset: true })
  await clock.advanceBy(30000)
  assert.equal(calls, 1)
  assert.equal(clock.pending(), 0)
}

// A timer captured for conversation A must never poll conversation B.
{
  const state = {
    activeKind: 'channel',
    activeId: 'A',
    openGen: 1,
    messages: [{ message_id: 'm1', payload: { ciphertext: 'abc' } }],
  }
  const clock = makeFakeClock()
  let calls = 0
  const sync = makeMsgSyncHarness({
    state,
    clock,
    pollMessages: async () => { calls++ },
  })
  sync.scheduleDecryptRefresh({ reset: true })
  state.activeId = 'B'
  state.openGen = 2
  await clock.advanceBy(1000)
  assert.equal(calls, 0)
}

function makeApiHarness({ state, federation, clock = makeFakeClock(), hooks = {} }) {
  const deps = {
    state,
    Tapp: { federation, ui: { showNotification() {} } },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    console: { warn() {}, error() {} },
    messagesFingerprint: hooks.messagesFingerprint || ((msgs) => String((msgs || []).length)),
    mergeMessageLists: hooks.mergeMessageLists || ((_prev, next) => (next || []).slice()),
    pruneOptimisticMessages() {},
    hasCiphertextMessages: hooks.hasCiphertextMessages || (() => false),
    cancelDecryptRefresh: hooks.cancelDecryptRefresh || (() => {}),
    scheduleDecryptRefresh: hooks.scheduleDecryptRefresh || (() => {}),
    renderMessages() {},
    scheduleRenderMessages() {},
    renderChatHeader: hooks.renderChatHeader || (() => {}),
    updateSendState() {},
    maybeAnnounceE2eEstablished() {},
    ensureHistoryState: () => ({ hasMoreMain: false }),
    isMessagesNearBottom: () => true,
    $: () => null,
  }
  const factory = new Function('deps', `
    var state = deps.state;
    var Tapp = deps.Tapp;
    var setTimeout = deps.setTimeout;
    var clearTimeout = deps.clearTimeout;
    var console = deps.console;
    var MSG_WINDOW_LIMIT = 50;
    var messagesFingerprint = deps.messagesFingerprint;
    var mergeMessageLists = deps.mergeMessageLists;
    var pruneOptimisticMessages = deps.pruneOptimisticMessages;
    var hasCiphertextMessages = deps.hasCiphertextMessages;
    var cancelDecryptRefresh = deps.cancelDecryptRefresh;
    var scheduleDecryptRefresh = deps.scheduleDecryptRefresh;
    var renderMessages = deps.renderMessages;
    var scheduleRenderMessages = deps.scheduleRenderMessages;
    var renderChatHeader = deps.renderChatHeader;
    var updateSendState = deps.updateSendState;
    var maybeAnnounceE2eEstablished = deps.maybeAnnounceE2eEstablished;
    var ensureHistoryState = deps.ensureHistoryState;
    var isMessagesNearBottom = deps.isMessagesNearBottom;
    var $ = deps.$;
    ${api}
    return { pollMessages, bindRealtimeListeners };
  `)
  return { api: factory(deps), clock }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function basePollState() {
  return {
    activeKind: 'channel',
    activeId: 'single',
    openGen: 1,
    messages: [],
    messagesFp: '0',
    chatLoadError: null,
    skipMsgAppear: false,
    subscribedKind: null,
    subscribedId: null,
    realtimeBound: false,
    channels: [],
    rooms: [],
  }
}

// Normal + forced callers coalesce behind one active bridge request.
{
  const state = basePollState()
  const pending = []
  let calls = 0
  let active = 0
  let maxActive = 0
  const { api: pollApi } = makeApiHarness({
    state,
    federation: {
      getMessages() {
        calls++
        active++
        maxActive = Math.max(maxActive, active)
        const d = deferred()
        pending.push(d)
        return d.promise.then((value) => { active--; return value })
      },
    },
  })
  const first = pollApi.pollMessages(false)
  const forced = pollApi.pollMessages(true, { messagesOnly: true, stickBottom: false })
  assert.equal(calls, 1)
  pending[0].resolve({ messages: [] })
  while (calls < 2) await Promise.resolve()
  assert.equal(maxActive, 1)
  pending[1].resolve({ messages: [] })
  await Promise.all([first, forced])
  assert.equal(calls, 2, 'one queued forced refresh should follow the active poll')
  assert.equal(maxActive, 1)
}

// A disconnected typed event clears stale subscription state and coalesces reconnects.
{
  const state = basePollState()
  state.subscribedKind = 'channel'
  state.subscribedId = 'single'
  const clock = makeFakeClock()
  let channelUpdate
  let subscribeCalls = 0
  const federation = {
    getMessages: async () => ({ messages: [] }),
    subscribeChannel: async () => { subscribeCalls++ },
    unsubscribeChannel: async () => {},
    onMessage() {},
    onChannelUpdate(cb) { channelUpdate = cb },
  }
  const { api: realtimeApi } = makeApiHarness({ state, federation, clock })
  realtimeApi.bindRealtimeListeners()
  channelUpdate({ channelId: 'single', event: 'disconnected' })
  channelUpdate({ channelId: 'single', event: 'disconnected' })
  assert.equal(state.subscribedKind, null)
  assert.equal(state.subscribedId, null)
  await clock.advanceBy(1000)
  assert.equal(subscribeCalls, 1)
  assert.equal(state.subscribedKind, 'channel')
  assert.equal(state.subscribedId, 'single')
}

// A socket that closes while subscribeChannel is still resolving must not be
// marked connected by the late successful bridge reply.
{
  const state = basePollState()
  state.subscribedKind = 'channel'
  state.subscribedId = 'single'
  const clock = makeFakeClock()
  const subscribePending = deferred()
  let channelUpdate
  let subscribeCalls = 0
  const federation = {
    getMessages: async () => ({ messages: [] }),
    subscribeChannel() { subscribeCalls++; return subscribePending.promise },
    unsubscribeChannel: async () => {},
    onMessage() {},
    onChannelUpdate(cb) { channelUpdate = cb },
  }
  const { api: realtimeApi } = makeApiHarness({ state, federation, clock })
  realtimeApi.bindRealtimeListeners()
  channelUpdate({ channelId: 'single', event: 'disconnected' })
  await clock.advanceBy(1000)
  assert.equal(subscribeCalls, 1)
  channelUpdate({ channelId: 'single', event: 'disconnected' })
  subscribePending.resolve()
  await clock.flush()
  assert.equal(state.subscribedKind, null)
  assert.equal(state.subscribedId, null)
}

// Typed key exchange refreshes E2E detail and kicks the scoped decrypt chain.
{
  const state = basePollState()
  const clock = makeFakeClock()
  let channelUpdate
  let detailCalls = 0
  let decryptOpts = null
  let headerPaints = 0
  const detail = { channel_id: 'single', e2e_established: true }
  const federation = {
    getMessages: async () => ({ messages: [] }),
    getChannel: async () => { detailCalls++; return detail },
    onMessage() {},
    onChannelUpdate(cb) { channelUpdate = cb },
  }
  const { api: realtimeApi } = makeApiHarness({
    state,
    federation,
    clock,
    hooks: {
      scheduleDecryptRefresh(opts) { decryptOpts = opts },
      renderChatHeader() { headerPaints++ },
    },
  })
  realtimeApi.bindRealtimeListeners()
  channelUpdate({ channelId: 'single', event: 'key_exchange' })
  await clock.flush()
  assert.equal(detailCalls, 1)
  assert.equal(state.channelDetail, detail)
  assert.deepEqual(decryptOpts, { reset: true, immediate: true })
  assert.equal(headerPaints, 1)
}

console.log('aro-security-smoke: ok')
