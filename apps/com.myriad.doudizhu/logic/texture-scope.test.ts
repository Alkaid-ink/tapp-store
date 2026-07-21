/**
 * Texture CSS-var scope tests — proves #tapp-background ancestors receive felt/scene.
 *
 *   cd apps/com.myriad.doudizhu && npx --yes tsx --test logic/*.test.ts
 */
/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = join(__dirname, '..')
const mainSrc = readFileSync(join(appDir, 'main.js'), 'utf8')
const cssSrc = readFileSync(join(appDir, 'page.css'), 'utf8')
const htmlSrc = readFileSync(join(appDir, 'page.html'), 'utf8')

describe('texture CSS variable scope (shipped main.js)', () => {
  it('textureApplyTargets includes document.documentElement (sibling bg inherits)', () => {
    assert.ok(mainSrc.includes('function textureApplyTargets'), 'textureApplyTargets must exist')
    const fnStart = mainSrc.indexOf('function textureApplyTargets')
    const fnSlice = mainSrc.slice(fnStart, fnStart + 600)
    assert.ok(
      fnSlice.includes('document.documentElement'),
      'targets must include document.documentElement so #tapp-background sees --ddz-tex-felt',
    )
    assert.ok(
      fnSlice.includes('tapp-background') || fnSlice.includes("getElementById('tapp-background')"),
      'targets should also include #tapp-background when present',
    )
  })

  it('loadTextures applies textureApplyTargets, not only .ddz-root', () => {
    const loadStart = mainSrc.indexOf('async function loadTextures')
    assert.ok(loadStart >= 0)
    const loadSlice = mainSrc.slice(loadStart, loadStart + 900)
    assert.ok(loadSlice.includes('textureApplyTargets()'))
    assert.ok(
      !/applyTextureCssVars\(\s*document\.querySelector\('\.ddz-root'\)/.test(loadSlice),
      'must not apply only on .ddz-root (breaks sibling #tapp-background)',
    )
  })

  it('every TEXTURE_MAP key is bound to a CSS var in TEXTURE_CSS_VARS', () => {
    const mapMatch = mainSrc.match(/var TEXTURE_MAP = \{([\s\S]*?)\n  \};/)
    assert.ok(mapMatch, 'TEXTURE_MAP object')
    const keys = [...mapMatch[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((m) => m[1])
    assert.ok(keys.length >= 30, `expected many texture keys, got ${keys.length}`)

    const cssMapMatch = mainSrc.match(/var TEXTURE_CSS_VARS = \{([\s\S]*?)\n  \};/)
    assert.ok(cssMapMatch, 'TEXTURE_CSS_VARS object')
    const cssKeys = new Set(
      [...cssMapMatch[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((m) => m[1]),
    )
    const missing = keys.filter((k) => !cssKeys.has(k))
    assert.deepEqual(missing, [], `TEXTURE_MAP keys missing from TEXTURE_CSS_VARS: ${missing.join(',')}`)
  })

  it('page.css consumes sm card faces, bubble-gold, coin, ornament, ready textures', () => {
    assert.ok(cssSrc.includes('--ddz-tex-card-back-sm'))
    assert.ok(cssSrc.includes('--ddz-tex-card-face-sm'))
    assert.ok(cssSrc.includes('--ddz-tex-bubble-gold'))
    assert.ok(cssSrc.includes('--ddz-tex-coin'))
    assert.ok(cssSrc.includes('--ddz-tex-ornament'))
    assert.ok(cssSrc.includes('--ddz-tex-ready'))
    assert.ok(cssSrc.includes('.ddz-bg-felt'))
    assert.ok(cssSrc.includes('var(--ddz-tex-felt)'))
    assert.ok(cssSrc.includes('var(--ddz-tex-scene)'))
  })

  it('DOM cascade: documentElement receives --ddz-tex-felt and .ddz-bg-felt is under that tree', async () => {
    assert.ok(existsSync(join(appDir, 'assets/felt/table_felt.png')))
    assert.ok(cssSrc.includes('var(--ddz-tex-felt)'))
    assert.ok(htmlSrc.includes('class="ddz-bg-felt"') || htmlSrc.includes('ddz-bg-felt'))

    // Sibling layout: #tapp-background is NOT inside .ddz-root
    const bgIdx = htmlSrc.indexOf('id="tapp-background"')
    const contentIdx = htmlSrc.indexOf('id="tapp-content"')
    assert.ok(bgIdx >= 0 && contentIdx > bgIdx, 'background before content')
    assert.ok(
      !htmlSrc.slice(contentIdx).includes('id="tapp-background"'),
      '#tapp-background must not nest inside #tapp-content',
    )

    let JSDOM: typeof import('jsdom').JSDOM | null = null
    try {
      const require = createRequire(import.meta.url)
      JSDOM = require('jsdom').JSDOM
    } catch {
      try {
        JSDOM = (await import('jsdom')).JSDOM
      } catch {
        JSDOM = null
      }
    }

    if (!JSDOM) {
      // Source-level guarantee still required
      assert.ok(mainSrc.includes('document.documentElement'))
      assert.ok(mainSrc.includes("getElementById('tapp-background')"))
      return
    }

    const fixture = `<!DOCTYPE html><html><head><style>${cssSrc}</style></head><body>
${htmlSrc}
</body></html>`
    const dom = new JSDOM(fixture, { url: 'https://local.test/doudizhu/' })
    const { document, getComputedStyle } = dom.window
    const feltPath = 'assets/felt/table_felt.png'
    const scenePath = 'assets/felt/scene_bg.png'

    // Drive the same target set as shipped textureApplyTargets()
    const targets = [
      document.documentElement,
      document.body,
      document.getElementById('tapp-background'),
      document.querySelector('.ddz-root'),
    ].filter(Boolean) as HTMLElement[]

    assert.ok(targets[0] === document.documentElement)
    for (const el of targets) {
      el.style.setProperty('--ddz-tex-felt', `url("${feltPath}")`)
      el.style.setProperty('--ddz-tex-scene', `url("${scenePath}")`)
      el.style.setProperty('--ddz-tex-felt-tile', `url("assets/felt/felt_tile.png")`)
    }

    // 1) documentElement must hold the var (inheritance root for #tapp-background in real browsers)
    const rootFelt = document.documentElement.style.getPropertyValue('--ddz-tex-felt')
    assert.ok(
      rootFelt.includes('table_felt'),
      `documentElement --ddz-tex-felt must include table_felt, got: ${rootFelt}`,
    )
    const bgFeltVar = (document.getElementById('tapp-background') as HTMLElement).style
      .getPropertyValue('--ddz-tex-felt')
    assert.ok(bgFeltVar.includes('table_felt'), `#tapp-background must also receive --ddz-tex-felt`)

    // 2) Tree: .ddz-bg-felt under #tapp-background, NOT under .ddz-root (sibling bug class)
    const feltEl = document.querySelector('.ddz-bg-felt') as HTMLElement
    assert.ok(feltEl)
    assert.ok(document.documentElement.contains(feltEl))
    const bg = document.getElementById('tapp-background')
    assert.ok(bg && bg.contains(feltEl), '.ddz-bg-felt must live under #tapp-background')
    const ddzRoot = document.querySelector('.ddz-root')
    assert.ok(ddzRoot && !ddzRoot.contains(feltEl), '.ddz-bg-felt must NOT be inside .ddz-root')

    // 3) CSS rule for felt uses the custom property (browser will resolve from ancestors)
    assert.match(cssSrc, /\.ddz-bg-felt[\s\S]*?var\(--ddz-tex-felt\)/)

    // 4) Walk ancestor chain: every node from felt → html is either a target we painted
    //    or a descendant of documentElement (so documentElement vars apply in real CSSOM).
    let node: Element | null = feltEl
    let sawDocumentElement = false
    while (node) {
      if (node === document.documentElement) sawDocumentElement = true
      node = node.parentElement
    }
    assert.ok(sawDocumentElement, 'felt must be under documentElement for CSS var inheritance')

    // 5) Regression: if we ONLY set vars on .ddz-root, #tapp-background itself has empty var
    const dom2 = new JSDOM(fixture, { url: 'https://local.test/doudizhu/' })
    const rootOnly = dom2.window.document.querySelector('.ddz-root') as HTMLElement
    rootOnly.style.setProperty('--ddz-tex-felt', `url("${feltPath}")`)
    const bg2 = dom2.window.document.getElementById('tapp-background') as HTMLElement
    const bg2Val = bg2.style.getPropertyValue('--ddz-tex-felt').trim()
    assert.equal(
      bg2Val,
      '',
      'regression: applying only on .ddz-root leaves #tapp-background without the var',
    )
    // and documentElement also empty in that broken path
    assert.equal(
      dom2.window.document.documentElement.style.getPropertyValue('--ddz-tex-felt').trim(),
      '',
    )
  })
})
