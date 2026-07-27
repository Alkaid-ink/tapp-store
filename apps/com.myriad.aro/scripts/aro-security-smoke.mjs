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

// Security (prior)
assert.match(helpers, /function sanitizeRemoteSvg/)
assert.match(helpers, /function isValidStoreSourceRef/)
assert.match(helpers, /function safeInlineDownload/)
assert.match(helpers, /function safeMessageImageUrl/)
assert.match(helpers, /function createDisposableBag/)
assert.match(helpers, /function pageListen/)
assert.match(views, /pageListen\(document/)
assert.match(chat, /sanitizeRemoteSvg\(payload\.tapp_icon\)/)
assert.match(chat, /safeMessageImageUrl/)
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
for (const f of ['events.js', 'index.js', 'helpers.js', 'state.js', 'i18n.js']) {
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

console.log('aro-security-smoke: ok')
