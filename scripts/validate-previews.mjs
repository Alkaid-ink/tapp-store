import { readFile, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(await readFile(resolve(root, 'index.json'), 'utf8'))
const blockedHtml = /<(?:script|iframe|frame|object|embed|portal|base|link|form)\b/i
const remoteCss = /@import\b|url\(\s*['"]?https?:/i

function fail(appId, message) {
  throw new Error(appId + ': ' + message)
}

async function checkedFile(appId, path, kind) {
  if (typeof path !== 'string' || !path.trim()) fail(appId, kind + ' path is required')
  const target = resolve(root, path)
  const rel = relative(root, target)
  if (rel.startsWith('..') || rel.includes('/../')) fail(appId, kind + ' escapes catalog root')
  const info = await stat(target)
  if (!info.isFile()) fail(appId, kind + ' is not a file: ' + path)
  if (info.size > 512 * 1024) fail(appId, kind + ' exceeds 512 KiB: ' + path)
  return readFile(target, 'utf8')
}

let count = 0
for (const app of catalog.apps || []) {
  const preview = app.preview
  if (preview == null) continue
  if (typeof preview !== 'object' || Array.isArray(preview)) fail(app.id, 'preview must be an object')
  if (preview.version !== 1) fail(app.id, 'preview.version must be 1')
  if (preview.type !== 'snapshot') fail(app.id, 'preview.type must be snapshot')
  if (!['cover', 'contain'].includes(preview.fit ?? 'cover')) fail(app.id, 'invalid preview.fit')
  if (!['auto', 'light', 'dark'].includes(preview.theme ?? 'auto')) fail(app.id, 'invalid preview.theme')

  const width = preview.viewport?.width ?? 1280
  const height = preview.viewport?.height ?? 720
  if (!Number.isInteger(width) || width < 1280 || width > 3840) fail(app.id, 'viewport.width must be 1280..3840')
  if (!Number.isInteger(height) || height < 720 || height > 2160) fail(app.id, 'viewport.height must be 720..2160')
  for (const axis of ['x', 'y']) {
    const value = preview.focus?.[axis] ?? 0.5
    if (typeof value !== 'number' || value < 0 || value > 1) fail(app.id, 'focus.' + axis + ' must be 0..1')
  }

  const html = await checkedFile(app.id, preview.html, 'preview HTML')
  if (blockedHtml.test(html)) fail(app.id, 'preview HTML contains executable or embedded content')
  const styles = preview.styles ?? []
  if (!Array.isArray(styles) || styles.length > 8) fail(app.id, 'preview.styles must contain at most 8 paths')
  for (const path of styles) {
    const css = await checkedFile(app.id, path, 'preview stylesheet')
    if (remoteCss.test(css)) fail(app.id, 'preview stylesheet may not load remote resources: ' + path)
  }
  count += 1
}

console.log('Validated ' + count + ' static Tapp preview' + (count === 1 ? '.' : 's.'))
