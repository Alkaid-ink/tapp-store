var ROCOM_SNAPSHOT_KEY = 'rocom.intel.snapshot.v3';
var rocomSyncPromise = null;

function text(value) { return String(value == null ? '' : value); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, function (character) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]; }); }
function unwrap(value) {
  var payload = value; var depth = 0;
  while (payload && depth < 4) {
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (error) { break; } }
    if (!payload || typeof payload !== 'object') { break; }
    if (payload.data && typeof payload.data === 'object') { payload = payload.data; }
    else if (payload.body && typeof payload.body === 'object') { payload = payload.body; }
    else if (payload.result && typeof payload.result === 'object') { payload = payload.result; }
    else { break; }
    depth += 1;
  }
  return payload && typeof payload === 'object' ? payload : {};
}
function numberTimestamp(value) { var result = Number(value); return Number.isFinite(result) && result > 0 ? (result < 100000000000 ? result * 1000 : result) : 0; }
function formatTime(value) { var date = new Date(value || Date.now()); return Number.isNaN(date.getTime()) ? '--' : String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'); }
function formatDate(value) { var timestamp = numberTimestamp(value); if (timestamp) { return new Date(timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } return text(value || '--'); }
function splitWatchlist(value) { return text(value).split(/[\uFF0C,\n]/).map(function (item) { return item.trim(); }).filter(Boolean); }
function getRound() {
  var current = new Date(); var minutes = current.getHours() * 60 + current.getMinutes();
  if (minutes < 480 || minutes >= 1440) { return { isOpen: false, current: 0, total: 4, countdown: '\u672a\u5f00\u5e02' }; }
  var round = Math.floor((minutes - 480) / 240) + 1; var end = 480 + round * 240;
  var seconds = Math.max(0, end * 60 - (current.getHours() * 3600 + current.getMinutes() * 60 + current.getSeconds()));
  return { isOpen: true, current: round, total: 4, countdown: (Math.floor(seconds / 3600) ? Math.floor(seconds / 3600) + '\u5c0f\u65f6' : '') + Math.floor((seconds % 3600) / 60) + '\u5206\u949f' };
}
function settings() { return Tapp.settings.getAll().then(function (data) { return { apiKey: text(data.wegame_api_key).trim(), watchlist: splitWatchlist(data.watchlist) }; }); }
function hasValue(value) { return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === ''); }
function firstValue(source, keys) {
  if (!source || typeof source !== 'object') { return undefined; }
  for (var index = 0; index < keys.length; index += 1) {
    if (hasValue(source[keys[index]])) { return source[keys[index]]; }
  }
  return undefined;
}
function goodsKeys(item) {
  if (!item || typeof item !== 'object') { return []; }
  return [
    item.goods_id, item.goodsId, item.goods_no, item.goodsNo, item.item_id, item.itemId, item.item_no, item.itemNo, item.prop_id, item.propId, item.prop_no, item.propNo, item.pet_id, item.petId, item.id, item.key,
    item.goods_name, item.goodsName, item.item_name, item.itemName, item.prop_name, item.propName, item.name, item.title
  ].filter(hasValue).map(function (value) { return text(value).trim(); }).filter(Boolean);
}
function goodsIndex(items) {
  var index = {};
  (Array.isArray(items) ? items : []).forEach(function (item) {
    goodsKeys(item).forEach(function (key) { index[key] = item; });
  });
  return index;
}
function appendGoodsSource(value, output, depth) {
  if (!value || depth > 2) { return; }
  if (Array.isArray(value)) {
    value.forEach(function (item) { if (item && typeof item === 'object') { output.push(item); } });
    return;
  }
  if (typeof value === 'object') {
    var keys = Object.keys(value);
    var looksLikeGoods = goodsKeys(value).length && (priceValue(value) !== undefined || limitValue(value) !== undefined);
    if (looksLikeGoods) { output.push(value); }
    keys.forEach(function (key) {
      if (/goods|props|pets|items|list|records|rows|data/i.test(key)) { appendGoodsSource(value[key], output, depth + 1); }
    });
    keys.forEach(function (key) {
      var child = value[key];
      if (child && typeof child === 'object' && !Array.isArray(child) && goodsKeys(child).length) { output.push(child); }
    });
  }
}
function merchantGoodsSources(payload, activity) {
  var output = [];
  [payload, activity].forEach(function (source) {
    if (!source || typeof source !== 'object') { return; }
    ['random_goods', 'randomGoods', 'goods', 'goods_list', 'goodsList', 'goods_info', 'goodsInfo', 'merchant_goods', 'merchantGoods', 'shop_goods', 'shopGoods', 'props', 'items', 'list', 'data'].forEach(function (key) {
      appendGoodsSource(source[key], output, 0);
    });
  });
  return output;
}
function matchingGoods(item, index) {
  var keys = goodsKeys(item);
  for (var position = 0; position < keys.length; position += 1) {
    if (index[keys[position]]) { return index[keys[position]]; }
  }
  return {};
}
var PRICE_FIELDS = ['price', 'price_text', 'priceText', 'goods_price', 'goodsPrice', 'buy_price', 'buyPrice', 'buy_price_num', 'buyPriceNum', 'sell_price', 'sellPrice', 'purchase_price', 'purchasePrice', 'purchase_num', 'purchaseNum', 'exchange_price', 'exchangePrice', 'exchange_num', 'exchangeNum', 'need_num', 'needNum', 'require_num', 'requireNum', 'price_num', 'priceNum', 'consume_num', 'consumeNum', 'cost', 'cost_num', 'costNum', 'gold_price', 'goldPrice', 'gold_cost', 'goldCost', 'need_gold', 'needGold', 'need_coin', 'needCoin', 'need_money', 'needMoney', 'gold', 'gold_num', 'goldNum', 'coin_price', 'coinPrice', 'coin', 'coins', 'currency_num', 'currencyNum', 'currency_amount', 'currencyAmount', 'money', 'money_num', 'moneyNum', 'amount', 'value', 'text', 'label'];
function numericPrice(value) {
  if (typeof value === 'number') { return Number.isFinite(value) ? value : NaN; }
  if (typeof value === 'string' && value.trim() !== '') {
    var match = value.replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
    var parsed = match ? Number(match[0]) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}
function priceSources(item) {
  if (!item || typeof item !== 'object') { return []; }
  return [item, item.goods, item.goods_info, item.goodsInfo, item.goods_detail, item.goodsDetail, item.item, item.item_info, item.itemInfo, item.detail, item.info, item.data, item.meta, item.price_info, item.priceInfo, item.cost_info, item.costInfo, item.currency, item.money].filter(function (source) { return source && typeof source === 'object'; });
}
function scanPriceValue(source, depth) {
  if (!source || typeof source !== 'object' || depth > 3) { return undefined; }
  var fallback;
  var keys = Object.keys(source);
  for (var index = 0; index < keys.length; index += 1) {
    var key = keys[index]; var normalizedKey = key.toLowerCase(); var value = source[key];
    var priceLike = /(price|cost|consume|currency|gold|coin|money|amount|exchange|need|require|pay|bean|rock|\u4ef7|\u8d39|\u94b1|\u8d1d|\u5151\u6362|\u6d88\u8017|\u9700\u8981|\u6d1b\u514b\u8d1d)/.test(normalizedKey) && !/(limit|count|id|quantity|stock|total|time|date|\u9650|\u6570\u91cf|\u65f6\u95f4)/.test(normalizedKey);
    if (value && typeof value === 'object') {
      var nested = scanPriceValue(value, depth + 1);
      if (nested !== undefined && hasUsablePrice(nested)) { return nested; }
      if (fallback === undefined && nested !== undefined) { fallback = nested; }
    } else if (priceLike && hasValue(value)) {
      if (fallback === undefined) { fallback = value; }
      if (numericPrice(value) > 0) { return value; }
    }
  }
  return fallback;
}
function priceValue(item) {
  var fallback;
  var sources = priceSources(item);
  for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    var source = sources[sourceIndex];
    for (var fieldIndex = 0; fieldIndex < PRICE_FIELDS.length; fieldIndex += 1) {
      var value = source[PRICE_FIELDS[fieldIndex]];
      if (value && typeof value === 'object') { value = firstValue(value, ['value', 'amount', 'num', 'number', 'price', 'cost', 'text', 'label']); }
      if (!hasValue(value)) { continue; }
      if (fallback === undefined) { fallback = value; }
      if (numericPrice(value) > 0) { return value; }
    }
  }
  var scanned = scanPriceValue(item, 0);
  return hasUsablePrice(scanned) ? scanned : (fallback !== undefined ? fallback : scanned);
}
function limitValue(item) { return firstValue(item, ['buy_limit_num', 'buyLimitNum', 'buy_limit', 'buyLimit', 'limit']); }
function hasUsablePrice(value) { return hasValue(value) && numericPrice(value) > 0; }
function mergedPrice(item, extra) {
  var ownPrice = priceValue(item); var metaPrice = priceValue(extra);
  if (hasUsablePrice(ownPrice)) { return ownPrice; }
  if (hasUsablePrice(metaPrice)) { return metaPrice; }
  return hasValue(ownPrice) ? ownPrice : metaPrice;
}
function normalizeMerchant(payload, watchlist) {
  var activities = payload.merchantActivities || payload.merchant_activities || []; var activity = Array.isArray(activities) && activities[0] ? activities[0] : {};
  var prices = goodsIndex(merchantGoodsSources(payload, activity));
  var groups = [{ name: '\u9053\u5177', items: activity.get_props }, { name: '\u989d\u5916\u9053\u5177', items: activity.get_extra_props }, { name: '\u7cbe\u7075', items: activity.get_pets }];
  var products = []; var now = Date.now();
  groups.forEach(function (group) { (Array.isArray(group.items) ? group.items : []).forEach(function (item) {
    if (!item || typeof item !== 'object') { return; }
    var start = numberTimestamp(item.start_time) || numberTimestamp(activity.start_time); var end = numberTimestamp(item.end_time) || numberTimestamp(activity.end_time);
    if (start && end && (now < start || now >= end)) { return; }
    var extra = matchingGoods(item, prices); var name = text(item.name || item.goods_name || item.goodsName || extra.goods_name || extra.goodsName || extra.name || '\u672a\u547d\u540d\u5546\u54c1');
    products.push({ name: name, category: group.name, price: mergedPrice(item, extra), limit: limitValue(item) !== undefined ? limitValue(item) : limitValue(extra), image: text(item.icon_url || item.iconUrl), watched: watchlist.indexOf(name) !== -1 });
  }); });
  return { activity: activity, products: products };
}
function activityItems(payload) {
  var source = payload.activityCalendar || payload.calendar || payload.otherActivities || payload.activities || payload.list || payload.items || [];
  if (!Array.isArray(source)) { return []; }
  return source.filter(function (item) { return item && !item.is_deleted; }).map(function (item) {
    var start = item.start_time || item.startAt || item.start_at || item.start_ts || item.start_date || ''; var end = item.end_time || item.endAt || item.end_at || item.end_ts || item.end_date || '';
    var startValue = numberTimestamp(start); var endValue = numberTimestamp(end); var permanent = Boolean(item.is_unlimited) || (startValue && endValue && endValue - startValue >= 300 * 86400000);
    var status = permanent ? '\u5e38\u9a7b' : (startValue && Date.now() < startValue ? '\u672a\u5f00\u59cb' : (endValue && Date.now() > endValue ? '\u5df2\u7ed3\u675f' : '\u8fdb\u884c\u4e2d'));
    return { name: text(item.name || item.title || '\u672a\u547d\u540d\u6d3b\u52a8'), desc: text(item.description || item.desc || '\u6d3b\u52a8\u8be6\u60c5\u6682\u65e0'), cover: text(item.cover_url || item.cover || item.pic), start: formatDate(start), end: formatDate(end), status: status, rewards: text(item.rewards || '') };
  }).slice(0, 12);
}
function announcementItems(payload) {
  var source = payload.list || payload.items || (payload.title ? [payload] : []); if (!Array.isArray(source)) { source = []; }
  return source.filter(function (item) { return item && typeof item === 'object'; }).slice(0, 8).map(function (item) { return { id: text(item.thread_id || item.id), title: text(item.title || '\u672a\u547d\u540d\u516c\u544a'), summary: text(item.summary), time: text(item.publishAt || item.published_at || item.createdAt), cover: text(item.cover), sticky: Boolean(item.isStick) }; });
}
async function loadSnapshot() { return Tapp.storage.get(ROCOM_SNAPSHOT_KEY); }
async function syncRocom(force) {
  if (rocomSyncPromise) { return rocomSyncPromise; }
  rocomSyncPromise = (async function () {
    var config = await settings();
    if (!config.apiKey) { var missing = { state: 'missing-key', products: [], activities: [], announcements: [], round: getRound(), updatedAt: Date.now() }; await Tapp.storage.set(ROCOM_SNAPSHOT_KEY, missing); return missing; }
    var results = await Promise.all([Tapp.api('merchantInfo', { apiKey: config.apiKey, refresh: Boolean(force) }), Tapp.api('activitiesInfo', { apiKey: config.apiKey }), Tapp.api('announcementLatest', { apiKey: config.apiKey })]);
    var merchant = normalizeMerchant(unwrap(results[0]), config.watchlist); var snapshot = { state: merchant.products.length ? 'ready' : 'empty', activityName: text(merchant.activity.name || '\u8fdc\u884c\u5546\u4eba'), subtitle: text(merchant.activity.start_date || '\u6bcf\u65e5 08:00 \u81f3 24:00\uff0c\u6bcf 4 \u5c0f\u65f6\u6362\u8d27'), products: merchant.products, activities: activityItems(unwrap(results[1])), announcements: announcementItems(unwrap(results[2])), watchCount: merchant.products.filter(function (item) { return item.watched; }).length, round: getRound(), updatedAt: Date.now() };
    await Tapp.storage.set(ROCOM_SNAPSHOT_KEY, snapshot); return snapshot;
  })();
  try { return await rocomSyncPromise; } finally { rocomSyncPromise = null; }
}
Tapp.lifecycle.onReady(function () { syncRocom(false).catch(function () {}); var timer = setInterval(function () { syncRocom(false).catch(function () {}); }, 300000); Tapp.lifecycle.onDestroy(function () { clearInterval(timer); }); });

function messageFor(snapshot) { if (!snapshot || snapshot.state === 'missing-key') { return '\u8bf7\u5148\u5728 Tapp \u540e\u53f0\u8bbe\u7f6e\u4e2d\u586b\u5199 WeGame API Key'; } if (snapshot.state === 'empty') { return '\u672c\u8f6e\u6682\u65e0\u53ef\u5c55\u793a\u7684\u5546\u54c1'; } return ''; }
function emptyStateHtml(title, body) { return '<div class="empty-state"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(body) + '</span></div>'; }
function statusClass(status) { if (status === '\u8fdb\u884c\u4e2d' || status === '\u5e38\u9a7b') { return ' status-live'; } if (status === '\u672a\u5f00\u59cb') { return ' status-upcoming'; } return ' status-ended'; }
function setButtonLoading(button, loading, busyLabel) { if (!button) { return; } if (!button.getAttribute('data-idle-label')) { button.setAttribute('data-idle-label', button.textContent); } button.disabled = Boolean(loading); button.setAttribute('aria-busy', loading ? 'true' : 'false'); button.textContent = loading ? busyLabel : button.getAttribute('data-idle-label'); }
function arrayFromPayload(payload) {
  if (Array.isArray(payload)) { return payload; }
  if (!payload || typeof payload !== 'object') { return []; }
  var keys = ['items', 'list', 'records', 'rows', 'data'];
  for (var index = 0; index < keys.length; index += 1) {
    var value = payload[keys[index]];
    if (Array.isArray(value)) { return value; }
    if (value && typeof value === 'object') {
      var nested = arrayFromPayload(value);
      if (nested.length) { return nested; }
    }
  }
  return [];
}
function renderWidget(container, snapshot) {
  var round = snapshot && snapshot.round ? snapshot.round : getRound(); var products = snapshot && snapshot.products ? snapshot.products : [];
  var fields = { round: container.querySelector('[data-field="widget-round"]'), countdown: container.querySelector('[data-field="widget-countdown"]'), updated: container.querySelector('[data-field="widget-updated-at"]'), products: container.querySelector('[data-field="widget-products"]'), stock: container.querySelector('[data-field="widget-stock-count"]'), watch: container.querySelector('[data-field="widget-watch-count"]') };
  if (fields.round) { fields.round.textContent = round.isOpen ? '\u7b2c' + round.current + '/' + round.total + '\u8f6e' : '\u4eca\u65e5\u672a\u5f00\u5e02'; }
  if (fields.countdown) { fields.countdown.textContent = round.isOpen ? '\u6362\u8d27 ' + round.countdown : '08:00 \u5f00\u5e02'; }
  if (fields.updated) { fields.updated.textContent = snapshot ? '\u66f4\u65b0\u4e8e ' + formatTime(snapshot.updatedAt) : '\u7b49\u5f85\u540e\u53f0\u540c\u6b65'; }
  if (fields.stock) { fields.stock.textContent = products.length + ' \u4ef6\u5728\u552e'; }
  if (fields.watch) { fields.watch.textContent = (snapshot && snapshot.watchCount ? snapshot.watchCount : 0) + ' \u547d\u4e2d'; }
  if (fields.products) { fields.products.innerHTML = products.slice(0, container.classList.contains('merchant-widget-large') ? 8 : 4).map(function (item) { return '<span class="widget-product' + (item.watched ? ' is-watched' : '') + '">' + escapeHtml(item.name) + '</span>'; }).join('') || '<span class="widget-product widget-product-empty">' + escapeHtml(messageFor(snapshot) || '\u7b49\u5f85\u5546\u54c1\u6570\u636e') + '</span>'; }
}
Tapp.widgets['rocom-merchant-overview'] = { render: async function (container) { async function update(force) { var button = container.querySelector('[data-action="widget-refresh"]'); setButtonLoading(button, force, '\u2026'); try { var snapshot = force ? await syncRocom(true) : await loadSnapshot(); if (!snapshot) { snapshot = await syncRocom(false); } renderWidget(container, snapshot); } finally { setButtonLoading(button, false, '\u2026'); } } var button = container.querySelector('[data-action="widget-refresh"]'); if (button) { button.addEventListener('click', function () { update(true).catch(function () {}); }); } var off = Tapp.storage.onChanged(function (event) { if (event && event.key === ROCOM_SNAPSHOT_KEY) { update(false).catch(function () {}); } }); Tapp.lifecycle.onDestroy(function () { if (off) { off(); } }); await update(false); } };

function productHtml(item) { return '<article class="product-card' + (item.watched ? ' is-watched' : '') + '" title="' + escapeHtml(item.name) + '"><div class="product-icon">' + (item.image ? '<img src="' + escapeHtml(item.image) + '" alt="" />' : '&#29289;') + '</div><div class="product-main"><div class="product-meta"><span>' + escapeHtml(item.category) + '</span>' + (item.watched ? '<b>\u5173\u6ce8</b>' : '') + '</div><h3>' + escapeHtml(item.name) + '</h3><p>' + (hasValue(item.limit) ? '\u9650\u8d2d ' + escapeHtml(item.limit) : '\u672c\u8f6e\u5728\u552e') + '</p></div></article>'; }
function activityHtml(item) { return '<article class="activity-card"><div class="activity-cover">' + (item.cover ? '<img src="' + escapeHtml(item.cover) + '" alt="" />' : '&#28216;') + '</div><div><div class="activity-card-head"><h3>' + escapeHtml(item.name) + '</h3><span class="status-pill' + statusClass(item.status) + '">' + escapeHtml(item.status) + '</span></div><p>' + escapeHtml(item.desc) + '</p><small>' + escapeHtml(item.start) + ' &#8212; ' + escapeHtml(item.end) + '</small></div></article>'; }
function announcementHtml(item) { var coverClass = item.cover ? ' has-cover' : ' no-cover'; return '<article class="announcement-card' + coverClass + (item.sticky ? ' is-sticky' : '') + '">' + (item.cover ? '<img src="' + escapeHtml(item.cover) + '" alt="" />' : '') + '<div><span>' + (item.sticky ? '\u7f6e\u9876\u516c\u544a' : '\u5b98\u65b9\u516c\u544a') + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.summary || '\u6682\u65e0\u516c\u544a\u6458\u8981') + '</p><small>' + escapeHtml(item.time || '--') + '</small></div></article>'; }
async function searchPets(query) {
  var config = await settings();
  if (!config.apiKey) { throw new Error('\u8bf7\u5148\u8bbe\u7f6e API Key'); }
  var response = await Tapp.api('wikiPets', { apiKey: config.apiKey, q: encodeURIComponent(query) });
  var payload = unwrap(response);
  var items = arrayFromPayload(payload);
  return items.map(function (item) { return { name: text(item.name || item.pet_name || item.petName || item.title || item.pet_id || item.id || '\u672a\u547d\u540d\u7cbe\u7075'), id: text(item.pet_id || item.petId || item.id || item.no), icon: text(item.icon || item.small_icon || item.icon_url || item.avatar || item.image), form: text(item.form || item.form_name), quality: text(item.quality || item.rank), types: Array.isArray(item.type_names) ? item.type_names.join('\u00b7') : (Array.isArray(item.types) ? item.types.join('\u00b7') : text(item.type_names || item.types || item.type)) }; });
}
function renderPage(root, snapshot) {
  var round = snapshot && snapshot.round ? snapshot.round : getRound(); var products = snapshot && snapshot.products ? snapshot.products : [];
  var filterMode = root.getAttribute('data-stock-filter-mode') || 'all'; var visibleProducts = filterMode === 'watched' ? products.filter(function (item) { return item.watched; }) : products; var stockButton = root.querySelector('[data-stock-filter]');
  root.setAttribute('data-state', snapshot && snapshot.state ? snapshot.state : 'loading');
  root.querySelector('[data-field="subtitle"]').textContent = snapshot ? snapshot.subtitle : '\u7b49\u5f85\u540e\u53f0\u540c\u6b65'; root.querySelector('[data-field="updated"]').textContent = snapshot ? '\u66f4\u65b0\u4e8e ' + formatTime(snapshot.updatedAt) : '\u7b49\u5f85\u540e\u53f0\u540c\u6b65'; root.querySelector('[data-field="round"]').textContent = round.isOpen ? '\u7b2c ' + round.current + ' / ' + round.total + ' \u8f6e' : '\u672a\u5f00\u5e02'; root.querySelector('[data-field="countdown"]').textContent = round.isOpen ? round.countdown : '08:00'; root.querySelector('[data-field="watch-count"]').textContent = snapshot ? String(snapshot.watchCount) : '--'; root.querySelector('[data-field="stock-count"]').textContent = products.length + ' \u4ef6\u5728\u552e';
  if (stockButton) { stockButton.setAttribute('aria-pressed', filterMode === 'watched' ? 'true' : 'false'); stockButton.textContent = filterMode === 'watched' ? '\u5df2\u7b5b\u9009 ' + (snapshot ? snapshot.watchCount : 0) : '\u53ea\u770b\u5173\u6ce8'; stockButton.disabled = !products.length; }
  root.querySelector('[data-field="message"]').textContent = messageFor(snapshot); root.querySelector('[data-field="message"]').classList.toggle('is-hidden', !messageFor(snapshot));
  root.querySelector('[data-field="product-list"]').innerHTML = visibleProducts.map(productHtml).join('') || (products.length ? emptyStateHtml('\u672c\u8f6e\u6ca1\u6709\u547d\u4e2d\u5173\u6ce8', '\u53ef\u201c\u53ea\u770b\u5173\u6ce8\u201d\u518d\u5207\u56de\u5168\u90e8\uff0c\u6216\u5728 Tapp \u8bbe\u7f6e\u91cc\u8c03\u6574\u5173\u6ce8\u6e05\u5355\u3002') : emptyStateHtml('\u8fd8\u6ca1\u6709\u8d27\u5355\u6570\u636e', messageFor(snapshot) || '\u70b9\u51fb\u53f3\u4e0a\u89d2\u201c\u540c\u6b65\u201d\u540e\uff0c\u672c\u8f6e\u5546\u54c1\u4f1a\u5728\u8fd9\u91cc\u663e\u793a\u3002'));
  root.querySelector('[data-field="activity-list"]').innerHTML = (snapshot && snapshot.activities || []).map(activityHtml).join('') || emptyStateHtml('\u6682\u65e0\u6d3b\u52a8\u6570\u636e', '\u540c\u6b65\u540e\u4f1a\u5c55\u793a\u6b63\u5728\u8fdb\u884c\u3001\u672a\u5f00\u59cb\u548c\u5e38\u9a7b\u6d3b\u52a8\u3002'); root.querySelector('[data-field="announcement-list"]').innerHTML = (snapshot && snapshot.announcements || []).map(announcementHtml).join('') || emptyStateHtml('\u6682\u65e0\u6700\u65b0\u516c\u544a', '\u5f53\u524d\u6ca1\u6709\u53ef\u5c55\u793a\u7684\u5b98\u65b9\u516c\u544a\uff0c\u7a0d\u540e\u53ef\u4ee5\u518d\u540c\u6b65\u4e00\u6b21\u3002');
}
Tapp.pages['rocom-merchant-dashboard'] = { render: async function (container) { var root = container || document.querySelector('[data-page-root]'); if (!root || root.getAttribute('data-page-ready') === 'true') { return; } root.setAttribute('data-page-ready', 'true'); async function refresh(force) { var refreshButton = root.querySelector('[data-action="refresh"]'); root.classList.toggle('is-loading', Boolean(force)); setButtonLoading(refreshButton, force, '\u540c\u6b65\u4e2d'); try { var snapshot = force ? await syncRocom(true) : await loadSnapshot(); if (!snapshot) { snapshot = await syncRocom(false); } renderPage(root, snapshot); } catch (error) { var notice = root.querySelector('[data-field="message"]'); if (notice) { notice.textContent = text(error && error.message ? error.message : '\u540c\u6b65\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'); notice.classList.remove('is-hidden'); } } finally { root.classList.remove('is-loading'); setButtonLoading(refreshButton, false, '\u540c\u6b65\u4e2d'); } } root.querySelector('[data-action="refresh"]').addEventListener('click', function () { refresh(true).catch(function () {}); }); root.querySelectorAll('[data-tab]').forEach(function (button) { button.addEventListener('click', function () { var target = button.getAttribute('data-tab'); root.querySelectorAll('[data-tab]').forEach(function (item) { var active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', active ? 'true' : 'false'); }); root.querySelectorAll('[data-panel]').forEach(function (panel) { panel.classList.toggle('is-active', panel.getAttribute('data-panel') === target); }); }); }); var stockFilter = root.querySelector('[data-stock-filter]'); if (stockFilter) { stockFilter.addEventListener('click', function () { root.setAttribute('data-stock-filter-mode', root.getAttribute('data-stock-filter-mode') === 'watched' ? 'all' : 'watched'); loadSnapshot().then(function (snapshot) { renderPage(root, snapshot); }).catch(function () {}); }); } var form = root.querySelector('[data-search-form]'); var input = root.querySelector('[data-field="pet-query"]'); var results = root.querySelector('[data-field="pet-results"]'); async function submitPetSearch() { var query = text(input && input.value).trim(); if (!query) { results.innerHTML = emptyStateHtml('\u8f93\u5165\u7cbe\u7075\u540d\u79f0\u6216 ID', '\u4f8b\u5982\uff1a\u8fea\u83ab\u30011001\u3002'); if (input) { input.focus(); } return; } results.classList.add('is-loading'); results.innerHTML = emptyStateHtml('\u6b63\u5728\u68c0\u7d22\u56fe\u9274', '\u6b63\u5728\u67e5\u627e\u4e0e\u201c' + query + '\u201d\u5339\u914d\u7684\u7cbe\u7075\u7ebf\u7d22\u3002'); try { var items = await searchPets(query); results.innerHTML = items.map(function (item) { return '<article class="pet-card">' + (item.icon ? '<img src="' + escapeHtml(item.icon) + '" alt="" />' : '') + '<div><h3>' + escapeHtml(item.name) + '</h3><p>#' + escapeHtml(item.id) + (item.form ? ' &#183; ' + escapeHtml(item.form) : '') + (item.types ? ' &#183; ' + escapeHtml(item.types) : '') + '</p></div></article>'; }).join('') || emptyStateHtml('\u672a\u627e\u5230\u5339\u914d\u7684\u7cbe\u7075', '\u8bd5\u8bd5\u66f4\u51c6\u786e\u7684\u540d\u79f0\u3001ID\uff0c\u6216\u6362\u4e00\u4e2a\u5173\u952e\u8bcd\u3002'); } catch (error) { results.innerHTML = emptyStateHtml('\u56fe\u9274\u6682\u65f6\u4e0d\u53ef\u7528', text(error && error.message ? error.message : '\u8bf7\u7a0d\u540e\u518d\u68c0\u7d22\u3002')); } finally { results.classList.remove('is-loading'); } } if (form) { form.addEventListener('submit', function (event) { event.preventDefault(); submitPetSearch(); }); } var searchButton = root.querySelector('[data-action="search-pets"]'); if (searchButton) { searchButton.addEventListener('click', function () { submitPetSearch(); }); } var off = Tapp.storage.onChanged(function (event) { if (event && event.key === ROCOM_SNAPSHOT_KEY) { refresh(false).catch(function () {}); } }); Tapp.lifecycle.onDestroy(function () { if (off) { off(); } }); await refresh(false); } };
Tapp.lifecycle.onReady(function () { var root = document.querySelector('[data-page-root]'); if (root) { Tapp.pages['rocom-merchant-dashboard'].render(root); } });
