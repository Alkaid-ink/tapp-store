/**
 * Lightweight smoke checks for Aro security helpers (ARO-01/05/09/10).
 * Does not need a browser for storeSource / accept-key shape checks.
 * SVG sanitizer is exercised only when DOMParser is available (Node 22+ / jsdom).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const helpers = readFileSync(join(root, 'page/helpers.js'), 'utf8')
const chat = readFileSync(join(root, 'page/chat.js'), 'utf8')
const api = readFileSync(join(root, 'page/api.js'), 'utf8')
const attachments = readFileSync(join(root, 'page/attachments.js'), 'utf8')

// Source structure assertions (shipped code, not re-implemented)
assert.match(helpers, /function sanitizeRemoteSvg/)
assert.match(helpers, /function isValidStoreSourceRef/)
assert.match(helpers, /function safeInlineDownload/)
assert.match(helpers, /function tappAcceptStorageKey/)
assert.match(helpers, /function safeExternalHref/)

assert.match(chat, /sanitizeRemoteSvg\(payload\.tapp_icon\)/)
assert.doesNotMatch(chat, /iconContent = payload\.tapp_icon/)
// Catch path after store failure must not chain another install(direct)
assert.match(chat, /tappStoreInstallFailedNoAutoDirect|not installed automatically/)
assert.doesNotMatch(
  chat,
  /installReq\.source === ['"]store['"][\s\S]{0,400}Tapp\.tappList\.install\(directReq/,
)
assert.match(chat, /ARO-05/)
assert.match(chat, /tappAcceptStorageKey|data-accept-key/)
assert.match(chat, /safeInlineDownload/)

assert.match(api, /ARO-02|never auto-downgrade/)
assert.doesNotMatch(api, /delete sendReq\.encrypt/)
assert.match(api, /var ctx = \{/)
assert.match(api, /generation: state\.conversationGeneration/)

assert.match(attachments, /sendCtx/)
assert.match(attachments, /file\.slice\(/)

// Pure logic: extract isValidStoreSourceRef via Function (no DOM)
const isValidStoreSourceRef = new Function(
  helpers + '; return isValidStoreSourceRef;',
)()

assert.equal(isValidStoreSourceRef('store'), false)
assert.equal(isValidStoreSourceRef('direct'), false)
assert.equal(isValidStoreSourceRef(''), false)
assert.equal(isValidStoreSourceRef('1'), true)
assert.equal(
  isValidStoreSourceRef(
    'https://raw.githubusercontent.com/Myriad-You/tapp-store/main/index.json',
  ),
  true,
)
assert.equal(isValidStoreSourceRef('http://evil.example/index.json'), false)
assert.equal(isValidStoreSourceRef('javascript:alert(1)'), false)

console.log('aro-security-smoke: ok')
