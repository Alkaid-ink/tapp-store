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
    assert.ok(protocol.includes('hostProcessIntent'))
  })
})
