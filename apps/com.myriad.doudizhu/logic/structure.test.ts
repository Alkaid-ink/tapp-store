/**
 * Structural checks for com.myriad.doudizhu package (tapp-store).
 *
 *   cd apps/com.myriad.doudizhu && npx --yes tsx --test logic/*.test.ts
 */
/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DOUDIZHU_MESSAGE_TYPE } from './protocol.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = join(__dirname, '..')

describe('com.myriad.doudizhu package layout', () => {
  it('has manifest, main, page assets', () => {
    assert.ok(existsSync(join(appDir, 'manifest.json')))
    assert.ok(existsSync(join(appDir, 'main.js')))
    assert.ok(existsSync(join(appDir, 'page.html')))
    assert.ok(existsSync(join(appDir, 'page.css')))
  })

  it('manifest is game with federation permissions', () => {
    const manifest = JSON.parse(readFileSync(join(appDir, 'manifest.json'), 'utf8'))
    assert.equal(manifest.id, 'com.myriad.doudizhu')
    assert.equal(manifest.category, 'game')
    assert.equal(manifest.name, '斗地主')
    const perms = manifest.permissions || []
    assert.ok(perms.includes('federation:read'))
    assert.ok(perms.includes('federation:write'))
    assert.ok(perms.includes('federation:message'))
  })

  it('UI has create-room / invite / ready / play / pass', () => {
    const html = readFileSync(join(appDir, 'page.html'), 'utf8')
    assert.ok(html.includes('创建房间'))
    assert.ok(html.includes('邀请好友'))
    assert.ok(html.includes('准备'))
    assert.ok(html.includes('出牌'))
    assert.ok(html.includes('过牌'))
  })

  it('product table has required zones and control groups', () => {
    const html = readFileSync(join(appDir, 'page.html'), 'utf8')
    // Table zones: self hand, left/right opponents, bottom, last play, phase/turn
    assert.ok(html.includes('id="ddz-hand"'), 'self hand')
    assert.ok(html.includes('data-view="left"'), 'left opponent')
    assert.ok(html.includes('data-view="right"'), 'right opponent')
    assert.ok(html.includes('id="ddz-bottom"'), 'bottom cards')
    assert.ok(html.includes('id="ddz-last"'), 'last play')
    assert.ok(html.includes('id="ddz-phase"'), 'phase')
    assert.ok(html.includes('id="ddz-turn-hint"'), 'turn hint')
    // Role badges
    assert.ok(html.includes('id="ddz-role-me"'))
    assert.ok(html.includes('id="ddz-role-left"'))
    assert.ok(html.includes('id="ddz-role-right"'))
    // Auction / play / end control groups
    assert.ok(html.includes('id="ddz-auction-btns"'))
    assert.ok(html.includes('id="ddz-play-btns"'))
    assert.ok(html.includes('id="ddz-end-btns"'))
    assert.ok(html.includes('id="ddz-again"'))
    assert.ok(html.includes('id="ddz-to-lobby"'))
    // Bid feedback + last-play meta + end summary
    assert.ok(html.includes('id="ddz-bid-score"') || html.includes('id="ddz-auction-score"'))
    assert.ok(html.includes('id="ddz-last-meta"'))
    assert.ok(html.includes('id="ddz-end-summary"'))
    // Federation lobby actions
    assert.ok(html.includes('id="ddz-create"'))
    assert.ok(html.includes('id="ddz-invite"'))
    assert.ok(html.includes('id="ddz-ready"'))
    assert.ok(html.includes('id="ddz-start"'))
    assert.ok(html.includes('id="ddz-leave"'))
    assert.ok(html.includes('id="ddz-solo"'))
  })

  it('page.css uses product theme tokens and light/dark', () => {
    const css = readFileSync(join(appDir, 'page.css'), 'utf8')
    assert.ok(
      css.includes('--tapp-primary') || css.includes('--tapp-primary-rgb'),
      'must reference --tapp-primary tokens',
    )
    assert.ok(css.includes('.dark'), 'must include .dark rules')
    assert.ok(css.includes('--ddz-primary') || css.includes('var(--tapp-primary'))
    // Not only hard-coded dark-only greens as the sole surface model
    assert.ok(css.includes('--ddz-text') || css.includes('--ddz-surface'))
    assert.ok(css.includes('.ddz-card.selected') || css.includes('selected'))
    assert.ok(css.includes(':hover') || css.includes(':focus-visible'))
    assert.ok(css.includes('@media'))
  })

  it('main.js wires federation + host-owned intent sequencing', () => {
    const main = readFileSync(join(appDir, 'main.js'), 'utf8')
    assert.ok(main.includes('createRoom'))
    assert.ok(main.includes('inviteMember'))
    assert.ok(main.includes('subscribeRoom'))
    assert.ok(main.includes('sendRoomMessage'))
    assert.ok(main.includes('onMessage'))
    assert.ok(main.includes(DOUDIZHU_MESSAGE_TYPE) || main.includes("'doudizhu'"))
    assert.ok(main.includes("type: 'intent'") || main.includes('type: "intent"'))
    assert.ok(main.includes('hostHandleIntent') || main.includes('hostEmit'))
    assert.ok(main.includes('seatActorLocal') || main.includes('seatActor'))
  })

  it('main.js product feedback: combo label, role badges, theme, last play', () => {
    const main = readFileSync(join(appDir, 'main.js'), 'utf8')
    assert.ok(main.includes('comboTypeLabel') || main.includes('COMBO_LABELS'))
    assert.ok(main.includes('is-landlord') || main.includes('地主'))
    assert.ok(main.includes('lastPlaySeat') || main.includes('ddz-last-meta'))
    assert.ok(
      main.includes('onThemeChange')
        || main.includes('--tapp-primary')
        || main.includes('applyThemeClass'),
    )
    assert.ok(main.includes('ddz-end-summary') || main.includes('再来一局'))
    assert.ok(main.includes('startSolo') || main.includes('单机'))
  })

  it('store index.json lists this app', () => {
    const indexPath = join(appDir, '../../index.json')
    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    const app = (index.apps || []).find((a) => a.id === 'com.myriad.doudizhu')
    assert.ok(app)
    assert.ok(app.download?.code?.includes('com.myriad.doudizhu'))
  })

  it('logic modules exist', () => {
    assert.ok(existsSync(join(__dirname, 'rules.ts')))
    assert.ok(existsSync(join(__dirname, 'protocol.ts')))
    const rules = readFileSync(join(__dirname, 'rules.ts'), 'utf8')
    const protocol = readFileSync(join(__dirname, 'protocol.ts'), 'utf8')
    assert.ok(rules.includes('export function deal'))
    assert.ok(rules.includes('export function comboTypeLabel'))
    assert.ok(protocol.includes('hostProcessIntent'))
  })
})
