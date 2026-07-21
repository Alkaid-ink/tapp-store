#!/usr/bin/env node
/**
 * Structural audit of SHIPPED Aro messenger page modules.
 * Greps/parses real files under apps/com.myriad.aro — does not reimplement messenger UI.
 *
 * Exit 0 only if every acceptance check passes.
 * Run: node apps/com.myriad.aro/scripts/messenger-interaction-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARO_ROOT = path.resolve(__dirname, '..');

const failures = [];
const passes = [];

function pass(name, detail) {
  passes.push(detail ? `${name}: ${detail}` : name);
}

function fail(name, detail) {
  failures.push(detail ? `${name}: ${detail}` : name);
}

function read(rel) {
  const abs = path.join(ARO_ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail('missing-file', rel);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip scripts themselves and node_modules if any
      if (ent.name === 'node_modules' || ent.name === 'scripts') continue;
      walkFiles(p, exts, out);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1) Zero banned closed-UI symbols in js/html/css
// ---------------------------------------------------------------------------
function checkClosedUiBan() {
  const banned =
    /showClosed|setShowClosed|toggleShowClosed|conv-closed-toggle|conv-closed-chip|conv-tabs-dimmed|conv-tabs-closed/;
  const files = walkFiles(ARO_ROOT, ['.js', '.html', '.css']);
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (banned.test(line)) {
        hits.push(`${path.relative(ARO_ROOT, f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
  if (hits.length === 0) {
    pass('1-closed-ui-ban', '0 matches in js/html/css');
  } else {
    fail('1-closed-ui-ban', `${hits.length} hit(s)\n  ` + hits.slice(0, 20).join('\n  '));
  }
}

// ---------------------------------------------------------------------------
// 2) openConversation: first real await after shell paint; is unsubscribeRealtime
// ---------------------------------------------------------------------------
/** Strip // line comments and /* block comments *\/ (naive, good enough for structural scan). */
function stripComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      i += 2;
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i = Math.min(src.length, i + 2);
      continue;
    }
    // Keep string literals intact so // inside strings is not stripped wrong
    if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      const q = src[i];
      out += src[i++];
      while (i < src.length) {
        if (src[i] === '\\') {
          out += src[i++];
          if (i < src.length) out += src[i++];
          continue;
        }
        out += src[i];
        if (src[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += src[i++];
  }
  return out;
}

function extractFunctionBody(src, fnSigRe) {
  const m = fnSigRe.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  // Find opening brace after signature
  let i = start;
  while (i < src.length && src[i] !== '{') i++;
  if (i >= src.length) return null;
  let depth = 0;
  const bodyStart = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === q) break;
        i++;
      }
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return src.slice(bodyStart + 1, i);
      }
    }
  }
  return null;
}

function checkOpenConversationOrder() {
  const api = read('page/api.js');
  if (!api) return;
  const body = extractFunctionBody(api, /async\s+function\s+openConversation\s*\([^)]*\)\s*/);
  if (!body) {
    fail('2-openConversation-order', 'could not find async function openConversation in page/api.js');
    return;
  }
  const clean = stripComments(body);
  // First real await in the function body
  const awaitRe = /\bawait\s+([A-Za-z0-9_$.]+)\s*\(/g;
  const first = awaitRe.exec(clean);
  if (!first) {
    fail('2-openConversation-order', 'no await found in openConversation');
    return;
  }
  const awaitExpr = first[1];
  const awaitIndex = first.index;
  const before = clean.slice(0, awaitIndex);

  const hasActiveKind = /state\.activeKind\s*=/.test(before);
  const hasActiveId = /state\.activeId\s*=/.test(before);
  const hasEmptyPaint =
    /empty-state/.test(before) ||
    /emptyEl\.style\.display/.test(before) ||
    /\$\(\s*['"]empty-state['"]\s*\)/.test(before);
  const hasChatPaint =
    /chat-container/.test(before) ||
    /chatEl\.style\.display/.test(before) ||
    /\$\(\s*['"]chat-container['"]\s*\)/.test(before);
  const hasRenderConvList = /\brenderConvList\s*\(/.test(before);
  const isUnsub = /unsubscribeRealtime/.test(awaitExpr);

  const ok =
    hasActiveKind &&
    hasActiveId &&
    hasEmptyPaint &&
    hasChatPaint &&
    hasRenderConvList &&
    isUnsub;

  if (ok) {
    pass(
      '2-openConversation-order',
      `first await is ${awaitExpr}() after activeKind/id + empty/chat shell + renderConvList`,
    );
  } else {
    fail(
      '2-openConversation-order',
      [
        `first await: ${awaitExpr} (need unsubscribeRealtime: ${isUnsub})`,
        `activeKind before: ${hasActiveKind}`,
        `activeId before: ${hasActiveId}`,
        `empty shell before: ${hasEmptyPaint}`,
        `chat shell before: ${hasChatPaint}`,
        `renderConvList before: ${hasRenderConvList}`,
      ].join('; '),
    );
  }
}

// ---------------------------------------------------------------------------
// 3) bindConvListClicks with closest(.conv-item) delegation
// ---------------------------------------------------------------------------
function checkConvListDelegation() {
  const chat = read('page/chat.js');
  if (!chat) return;
  const body = extractFunctionBody(chat, /function\s+bindConvListClicks\s*\([^)]*\)\s*/);
  if (!body) {
    fail('3-bindConvListClicks', 'function bindConvListClicks not found in page/chat.js');
    return;
  }
  const hasClosest =
    /\.closest\s*\(\s*['"]\.conv-item['"]\s*\)/.test(body) ||
    /\.closest\s*\(\s*['"]\.conv-item['"]\s*\)/.test(stripComments(body));
  const hasListen = /\.addEventListener\s*\(\s*['"]click['"]/.test(body);
  if (hasClosest && hasListen) {
    pass('3-bindConvListClicks', 'closest(.conv-item) click delegation present');
  } else {
    fail(
      '3-bindConvListClicks',
      `closest(.conv-item)=${hasClosest}, addEventListener(click)=${hasListen}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4) create-overlay in page.css AND styles.css: display:none + PE none
// ---------------------------------------------------------------------------
function extractCreateOverlayRules(cssText) {
  const rules = [];
  const re = /\.create-overlay\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    rules.push(m[1].replace(/\s+/g, ' ').trim());
  }
  return rules;
}

function checkCreateOverlayCss() {
  for (const rel of ['page.css', 'styles.css']) {
    const css = read(rel);
    if (!css) continue;
    const rules = extractCreateOverlayRules(css);
    // Prefer the layout rule (position:fixed / inset) over dark/animation-only shorthands
    const base =
      rules.find((r) => /position\s*:\s*fixed/.test(r) || /inset\s*:\s*0/.test(r)) || rules[0];
    if (!base) {
      fail(`4-create-overlay-${rel}`, 'no .create-overlay { } rule found');
      continue;
    }
    const hasDisplayNone = /display\s*:\s*none/.test(base);
    const hasPeNone = /pointer-events\s*:\s*none/.test(base);
    if (hasDisplayNone && hasPeNone) {
      pass(`4-create-overlay-${rel}`, 'display:none + pointer-events:none');
    } else {
      fail(
        `4-create-overlay-${rel}`,
        `display:none=${hasDisplayNone}, pointer-events:none=${hasPeNone}; rule="${base.slice(0, 160)}"`,
      );
    }
  }
  // Sync check (not required by checklist but catches drift)
  const a = read('page.css');
  const b = read('styles.css');
  if (a && b && a === b) {
    pass('4-css-sync', 'page.css === styles.css');
  } else if (a && b) {
    fail('4-css-sync', 'page.css !== styles.css (must stay in sync)');
  }
}

// ---------------------------------------------------------------------------
// 5) helpers.js: dismiss helpers, aroDismiss PE early, onDocPointer bubble
// ---------------------------------------------------------------------------
function checkHelpers() {
  const h = read('page/helpers.js');
  if (!h) return;

  if (/function\s+dismissTransientUi\s*\(/.test(h)) {
    pass('5-dismissTransientUi', 'function present');
  } else {
    fail('5-dismissTransientUi', 'function dismissTransientUi missing');
  }

  if (/function\s+forceHideInteractive\s*\(/.test(h)) {
    pass('5-forceHideInteractive', 'function present');
  } else {
    fail('5-forceHideInteractive', 'function forceHideInteractive missing');
  }

  const dismissBody = extractFunctionBody(h, /function\s+aroDismiss\s*\([^)]*\)\s*/);
  if (!dismissBody) {
    fail('5-aroDismiss-pe', 'function aroDismiss not found');
  } else {
    const clean = stripComments(dismissBody);
    // PE none must appear before animation end / finish path dependency — "early"
    // Require pointerEvents = 'none' (or pointer-events) near the top of the body
    // before addEventListener('animationend' or classList.add('aro-leaving')
    const peMatch = /(?:style\.)?pointerEvents\s*=\s*['"]none['"]|pointer-events\s*:\s*none/.exec(
      clean,
    );
    if (!peMatch) {
      fail('5-aroDismiss-pe', "no pointerEvents = 'none' in aroDismiss");
    } else {
      const peIdx = peMatch.index;
      const leavingIdx = clean.search(/aro-leaving|animationend|setTimeout\s*\(\s*finish/);
      if (leavingIdx === -1 || peIdx < leavingIdx) {
        pass('5-aroDismiss-pe', 'pointerEvents none set early (before leave animation path)');
      } else {
        fail('5-aroDismiss-pe', 'pointerEvents none appears after leave animation wiring');
      }
    }
  }

  // onDocPointer registered with capture false, not true
  const bubble =
    /addEventListener\s*\(\s*['"]click['"]\s*,\s*onDocPointer\s*,\s*false\s*\)/.test(h);
  const capture =
    /addEventListener\s*\(\s*['"]click['"]\s*,\s*onDocPointer\s*,\s*true\s*\)/.test(h);
  if (bubble && !capture) {
    pass('5-onDocPointer-bubble', 'registered with capture false (not true)');
  } else {
    fail(
      '5-onDocPointer-bubble',
      `bubble(false)=${bubble}, capture(true)=${capture} — need false only`,
    );
  }
}

// ---------------------------------------------------------------------------
// 6) state has openGen + convLoadGen; api uses them
// ---------------------------------------------------------------------------
function checkGens() {
  const state = read('page/state.js');
  const api = read('page/api.js');
  if (!state || !api) return;

  const hasOpenGenState = /\bopenGen\s*:/.test(state);
  const hasConvLoadGenState = /\bconvLoadGen\s*:/.test(state);
  if (hasOpenGenState && hasConvLoadGenState) {
    pass('6-state-gens', 'openGen + convLoadGen in state.js');
  } else {
    fail(
      '6-state-gens',
      `openGen=${hasOpenGenState}, convLoadGen=${hasConvLoadGenState} in state.js`,
    );
  }

  const usesOpenGen =
    /state\.openGen/.test(api) &&
    (/isOpenGenCurrent/.test(api) || /isConversationCurrent/.test(api));
  const usesConvLoadGen = /state\.convLoadGen/.test(api);
  if (usesOpenGen && usesConvLoadGen) {
    pass('6-api-gens', 'page/api.js uses openGen (guards) + convLoadGen');
  } else {
    fail(
      '6-api-gens',
      `openGen usage=${usesOpenGen}, convLoadGen usage=${usesConvLoadGen} in page/api.js`,
    );
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log(`Aro messenger interaction audit\nroot: ${ARO_ROOT}\n`);

checkClosedUiBan();
checkOpenConversationOrder();
checkConvListDelegation();
checkCreateOverlayCss();
checkHelpers();
checkGens();

console.log('--- PASS ---');
for (const p of passes) console.log(`  ✓ ${p}`);
if (failures.length) {
  console.log('--- FAIL ---');
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`\n${failures.length} check(s) failed, ${passes.length} passed.`);
  process.exit(1);
}
console.log(`\nAll ${passes.length} checks passed (10-round structural audit green).`);
process.exit(0);
