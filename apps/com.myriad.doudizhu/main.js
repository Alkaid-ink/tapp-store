// com.myriad.doudizhu — 斗地主 (federation multiplayer)
// Host-owned seq + peer intents; pure rules also in Myriad frontend/src/tapp/examples/doudizhu/
// 斗地主 core — 规则纯模块见 examples/doudizhu/；对局逻辑在 page。
console.log('[斗地主] core loaded');

// ========== Page ==========
(function () {
  'use strict';

  var MSG_TYPE = 'doudizhu';
  var DECK_SIZE = 54;
  var HAND_SIZE = 17;
  var BOTTOM_SIZE = 3;
  var N = 3;
  var RANK_ORDER = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','SJ','BJ'];
  var SUITS = ['S','H','D','C'];
  var STD_RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];

  function rankValue(rank) {
    if (rank === 'SJ') return 16;
    if (rank === 'BJ') return 17;
    var idx = RANK_ORDER.indexOf(rank);
    return idx + 3;
  }
  function cardId(suit, rank) { return suit + '-' + rank; }
  function createDeck() {
    var deck = [];
    for (var s = 0; s < SUITS.length; s++) {
      for (var r = 0; r < STD_RANKS.length; r++) {
        deck.push({ id: cardId(SUITS[s], STD_RANKS[r]), suit: SUITS[s], rank: STD_RANKS[r] });
      }
    }
    deck.push({ id: cardId('J','SJ'), suit: 'J', rank: 'SJ' });
    deck.push({ id: cardId('J','BJ'), suit: 'J', rank: 'BJ' });
    return deck;
  }
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffleDeck(deck, seed) {
    var arr = deck.slice();
    var rnd = mulberry32(seed);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  function sortHand(cards) {
    return cards.slice().sort(function (a, b) {
      var dv = rankValue(a.rank) - rankValue(b.rank);
      return dv !== 0 ? dv : a.suit.localeCompare(b.suit);
    });
  }
  function deal(seed) {
    var shuffled = shuffleDeck(createDeck(), seed);
    return {
      hands: [
        sortHand(shuffled.slice(0, HAND_SIZE)),
        sortHand(shuffled.slice(HAND_SIZE, HAND_SIZE * 2)),
        sortHand(shuffled.slice(HAND_SIZE * 2, HAND_SIZE * 3))
      ],
      bottom: sortHand(shuffled.slice(HAND_SIZE * 3, HAND_SIZE * 3 + BOTTOM_SIZE)),
      seed: seed
    };
  }
  function consecutiveNoTwo(values) {
    if (values.length < 2) return false;
    if (values.some(function (v) { return v >= 15; })) return false;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  }
  function isStraightValues(values) {
    return values.length >= 5 && consecutiveNoTwo(values) && values.length === new Set(values).size;
  }
  function countByRank(cards) {
    var m = {};
    for (var i = 0; i < cards.length; i++) {
      var v = rankValue(cards[i].rank);
      if (!m[v]) m[v] = [];
      m[v].push(cards[i]);
    }
    return m;
  }
  function identifyCombo(cards) {
    if (!cards || !cards.length) return null;
    var n = cards.length;
    var byRank = countByRank(cards);
    var ranks = Object.keys(byRank).map(Number).sort(function (a, b) { return a - b; });
    var counts = ranks.map(function (r) { return byRank[r].length; });
    if (n === 2) {
      var ids = {};
      cards.forEach(function (c) { ids[c.rank] = true; });
      if (ids.SJ && ids.BJ) return { type: 'rocket', mainValue: 17, length: 1, cards: cards.slice() };
    }
    if (n === 4 && ranks.length === 1 && counts[0] === 4)
      return { type: 'bomb', mainValue: ranks[0], length: 1, cards: cards.slice() };
    if (n === 1)
      return { type: 'single', mainValue: rankValue(cards[0].rank), length: 1, cards: cards.slice() };
    if (n === 2 && ranks.length === 1 && counts[0] === 2)
      return { type: 'pair', mainValue: ranks[0], length: 1, cards: cards.slice() };
    if (n === 3 && ranks.length === 1 && counts[0] === 3)
      return { type: 'triple', mainValue: ranks[0], length: 1, cards: cards.slice() };
    if (n === 4 && ranks.length === 2) {
      var tr = ranks.find(function (r) { return byRank[r].length === 3; });
      var sr = ranks.find(function (r) { return byRank[r].length === 1; });
      if (tr !== undefined && sr !== undefined)
        return { type: 'triple_one', mainValue: tr, length: 1, cards: cards.slice() };
    }
    if (n === 5 && ranks.length === 2) {
      var tr2 = ranks.find(function (r) { return byRank[r].length === 3; });
      var pr = ranks.find(function (r) { return byRank[r].length === 2; });
      if (tr2 !== undefined && pr !== undefined)
        return { type: 'triple_two', mainValue: tr2, length: 1, cards: cards.slice() };
    }
    if (n >= 5 && ranks.length === n && counts.every(function (c) { return c === 1; }) && isStraightValues(ranks))
      return { type: 'straight', mainValue: Math.min.apply(null, ranks), length: n, cards: cards.slice() };
    if (n >= 6 && n % 2 === 0 && ranks.length === n / 2 && counts.every(function (c) { return c === 2; }) && ranks.length >= 3 && consecutiveNoTwo(ranks))
      return { type: 'pair_seq', mainValue: Math.min.apply(null, ranks), length: ranks.length, cards: cards.slice() };
    var tripleRanks = ranks.filter(function (r) { return byRank[r].length === 3; });
    if (tripleRanks.length >= 2 && consecutiveNoTwo(tripleRanks)) {
      var planeLen = tripleRanks.length;
      var mainValue = Math.min.apply(null, tripleRanks);
      var body = planeLen * 3;
      var rest = n - body;
      if (rest === 0 && ranks.length === planeLen)
        return { type: 'airplane', mainValue: mainValue, length: planeLen, cards: cards.slice() };
      if (rest === planeLen)
        return { type: 'airplane_singles', mainValue: mainValue, length: planeLen, cards: cards.slice() };
      if (rest === planeLen * 2) {
        var pairUnits = 0;
        for (var i = 0; i < ranks.length; i++) {
          if (tripleRanks.indexOf(ranks[i]) >= 0) continue;
          var c = byRank[ranks[i]].length;
          if (c % 2 !== 0) { pairUnits = -999; break; }
          pairUnits += c / 2;
        }
        if (pairUnits === planeLen)
          return { type: 'airplane_pairs', mainValue: mainValue, length: planeLen, cards: cards.slice() };
      }
    }
    return null;
  }
  function canBeat(incoming, table) {
    if (!table) return true;
    if (incoming.type === 'rocket') return true;
    if (table.type === 'rocket') return false;
    if (incoming.type === 'bomb' && table.type !== 'bomb') return true;
    if (incoming.type === 'bomb' && table.type === 'bomb') return incoming.mainValue > table.mainValue;
    if (table.type === 'bomb') return false;
    if (incoming.type !== table.type || incoming.length !== table.length) return false;
    return incoming.mainValue > table.mainValue;
  }
  function removeFromHand(hand, cards) {
    var ids = {};
    for (var i = 0; i < cards.length; i++) {
      if (ids[cards[i].id]) return null;
      ids[cards[i].id] = true;
    }
    var remaining = [];
    var have = {};
    hand.forEach(function (c) { have[c.id] = true; });
    for (var k in ids) { if (!have[k]) return null; }
    hand.forEach(function (c) { if (!ids[c.id]) remaining.push(c); });
    return remaining;
  }
  function startDeal(seed, auctionStart) {
    var d = deal(seed);
    var start = ((auctionStart % N) + N) % N;
    return {
      phase: 'auction', seed: seed, hands: d.hands, bottom: d.bottom,
      landlord: null, bidScore: 0, bidWinner: null, turn: start,
      trickLeader: null, lastCombo: null, passCount: 0,
      auctionStart: start, auctionActions: 0, winner: null, winningSide: null
    };
  }
  function finishAuction(state, landlord) {
    var next = JSON.parse(JSON.stringify(state));
    next.landlord = landlord;
    next.hands[landlord] = sortHand(next.hands[landlord].concat(next.bottom));
    next.phase = 'playing';
    next.turn = landlord;
    next.trickLeader = null;
    next.lastCombo = null;
    next.passCount = 0;
    return next;
  }
  function applyBid(state, action) {
    if (state.phase !== 'auction') return { ok: false, error: 'Not in auction', state: state };
    if (action.seat !== state.turn) return { ok: false, error: 'Not your turn', state: state };
    var next = JSON.parse(JSON.stringify(state));
    if (action.kind === 'bid') {
      if (action.score < 1 || action.score > 3 || action.score <= next.bidScore)
        return { ok: false, error: 'Invalid bid', state: state };
      next.bidScore = action.score;
      next.bidWinner = action.seat;
      next.auctionActions += 1;
      next.passCount = 0;
      if (action.score === 3) return { ok: true, state: finishAuction(next, action.seat) };
      next.turn = (action.seat + 1) % N;
      return { ok: true, state: next };
    }
    next.auctionActions += 1;
    next.passCount += 1;
    next.turn = (action.seat + 1) % N;
    if (next.bidWinner === null && next.auctionActions >= N)
      return { ok: true, state: next, redeal: true };
    if (next.bidWinner !== null && next.passCount >= N - 1)
      return { ok: true, state: finishAuction(next, next.bidWinner) };
    return { ok: true, state: next };
  }
  function findTrickWinner(stateBeforePass) {
    var passer = stateBeforePass.turn;
    var newPassCount = stateBeforePass.passCount + 1;
    return (passer - newPassCount + N * 3) % N;
  }
  function applyPlay(state, action) {
    if (state.phase !== 'playing') return { ok: false, error: 'Not playing', state: state };
    if (action.seat !== state.turn) return { ok: false, error: 'Not your turn', state: state };
    var next = JSON.parse(JSON.stringify(state));
    if (action.kind === 'pass') {
      if (next.lastCombo === null || next.trickLeader === null)
        return { ok: false, error: 'Cannot pass when leading', state: state };
      next.passCount += 1;
      if (next.passCount >= N - 1) {
        var w = findTrickWinner(state);
        next.lastCombo = null;
        next.passCount = 0;
        next.trickLeader = null;
        next.turn = w;
        return { ok: true, state: next };
      }
      next.turn = (action.seat + 1) % N;
      return { ok: true, state: next };
    }
    var combo = identifyCombo(action.cards);
    if (!combo) return { ok: false, error: 'Illegal combination', state: state };
    if (!canBeat(combo, next.lastCombo)) return { ok: false, error: 'Cannot beat', state: state };
    var remaining = removeFromHand(next.hands[action.seat], action.cards);
    if (!remaining) return { ok: false, error: 'Cards not in hand', state: state };
    next.hands[action.seat] = sortHand(remaining);
    next.lastCombo = combo;
    next.passCount = 0;
    if (next.trickLeader === null) next.trickLeader = action.seat;
    if (next.hands[action.seat].length === 0) {
      next.phase = 'finished';
      next.winner = action.seat;
      next.winningSide = action.seat === next.landlord ? 'landlord' : 'farmers';
      return { ok: true, state: next };
    }
    next.turn = (action.seat + 1) % N;
    return { ok: true, state: next };
  }
  function assignSeats(actorIds) {
    var sorted = actorIds.slice().sort();
    var map = {};
    sorted.forEach(function (id, i) { map[id] = i; });
    return map;
  }
  function canStartMatch(seats, ready) {
    var actors = Object.keys(seats);
    if (actors.length !== 3) return false;
    return actors.every(function (a) { return ready[a] === true; });
  }

  // ─── UI helpers ─────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function setText(el, t) { if (el) el.textContent = t == null ? '' : String(t); }
  function show(el, on) { if (el) el.classList.toggle('hidden', !on); }

  var RANK_LABEL = { '3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','10':'10','J':'J','Q':'Q','K':'K','A':'A','2':'2','SJ':'小王','BJ':'大王' };
  var SUIT_LABEL = { S:'♠', H:'♥', D:'♦', C:'♣', J:'' };

  function cardLabel(card) {
    if (card.rank === 'SJ' || card.rank === 'BJ') return RANK_LABEL[card.rank];
    return SUIT_LABEL[card.suit] + RANK_LABEL[card.rank];
  }
  function isRed(card) {
    return card.suit === 'H' || card.suit === 'D' || card.rank === 'BJ';
  }
  function renderCards(container, cards, opts) {
    opts = opts || {};
    if (!container) return;
    container.textContent = '';
    (cards || []).forEach(function (card) {
      var el = document.createElement('div');
      var cls = 'ddz-card';
      if (card.rank === 'SJ' || card.rank === 'BJ') cls += ' joker';
      else if (isRed(card)) cls += ' red';
      if (opts.selectable) cls += ' btnlike';
      if (opts.selectedIds && opts.selectedIds[card.id]) cls += ' selected';
      if (opts.backs) cls = 'ddz-card back';
      el.className = cls;
      el.textContent = opts.backs ? '🂠' : cardLabel(card);
      if (opts.selectable) {
        el.addEventListener('click', function () {
          if (opts.onToggle) opts.onToggle(card);
        });
      }
      container.appendChild(el);
    });
  }

  // ─── App state ──────────────────────────────────────────────
  var mode = 'lobby'; // lobby | solo | multi
  var myActorId = '';
  var roomId = '';
  var hostActor = '';
  var seats = {};
  var readyMap = {};
  var seq = 0;
  var lastSeq = 0;
  var game = null;
  var selected = {};
  var unsubMessage = null;
  var isHost = false;
  var botTimers = [];

  function clearBots() {
    botTimers.forEach(function (t) { clearTimeout(t); });
    botTimers = [];
  }

  function status(msg) { setText($('ddz-status'), msg); }
  function lobbyMsg(msg) { setText($('ddz-lobby-msg'), msg); }
  function tableMsg(msg) { setText($('ddz-table-msg'), msg); }

  function mySeat() {
    if (myActorId && seats[myActorId] !== undefined) return seats[myActorId];
    return 0;
  }

  function viewSeat(which) {
    // which: me | left | right relative to my seat
    var me = mySeat();
    if (which === 'me') return me;
    if (which === 'left') return (me + 1) % N;
    return (me + 2) % N;
  }

  function actorAtSeat(seat) {
    var keys = Object.keys(seats);
    for (var i = 0; i < keys.length; i++) {
      if (seats[keys[i]] === seat) return keys[i];
    }
    return '座位' + seat;
  }

  function shortName(actor) {
    if (!actor) return '?';
    var s = String(actor);
    if (s.indexOf('/') >= 0) s = s.split('/').pop();
    if (s.indexOf(':') >= 0) s = s.split(':').pop();
    return s.length > 16 ? s.slice(0, 14) + '…' : s;
  }

  function roleLabel(seat) {
    if (!game || game.landlord === null) return '';
    return seat === game.landlord ? '地主' : '农民';
  }

  function updateLobbyUI() {
    var box = $('ddz-seats');
    if (!box) return;
    box.textContent = '';
    for (var seat = 0; seat < N; seat++) {
      var actor = null;
      Object.keys(seats).forEach(function (a) { if (seats[a] === seat) actor = a; });
      var div = document.createElement('div');
      div.className = 'ddz-seat-card' + (actor ? (readyMap[actor] ? ' ready' : '') : ' empty');
      var title = actor ? shortName(actor) : '空位';
      var sub = actor ? (readyMap[actor] ? '已准备' : '未准备') : '等待加入';
      if (actor === hostActor) sub += ' · 房主';
      if (actor === myActorId) sub += ' · 我';
      var line1 = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = '座位 ' + seat;
      line1.appendChild(strong);
      var line2 = document.createElement('div');
      line2.textContent = title;
      var line3 = document.createElement('div');
      line3.className = 'ddz-muted';
      line3.textContent = sub;
      div.appendChild(line1);
      div.appendChild(line2);
      div.appendChild(line3);
      box.appendChild(div);
    }
    var inRoom = !!roomId;
    $('ddz-ready').disabled = !inRoom || mode === 'solo';
    $('ddz-start').disabled = !inRoom || !isHost || !canStartMatch(seats, readyMap);
    $('ddz-leave').disabled = !inRoom && mode !== 'solo';
    $('ddz-invite').disabled = !inRoom || !isHost;
    setText($('ddz-room-label'), roomId ? ('房间 ' + roomId) : '');
    setText($('ddz-phase'), mode === 'solo' ? '单机' : (game ? phaseLabel(game.phase) : '大厅'));
  }

  function phaseLabel(p) {
    return ({ lobby: '大厅', auction: '叫分', playing: '出牌', finished: '结束' })[p] || p;
  }

  function updateTableUI() {
    if (!game) return;
    show($('ddz-lobby'), false);
    show($('ddz-table'), true);
    setText($('ddz-phase'), phaseLabel(game.phase));

    var me = mySeat();
    var left = viewSeat('left');
    var right = viewSeat('right');

    setText($('ddz-name-me'), shortName(actorAtSeat(me)) + '（我）');
    setText($('ddz-name-left'), shortName(actorAtSeat(left)));
    setText($('ddz-name-right'), shortName(actorAtSeat(right)));
    setText($('ddz-count-me'), game.hands[me].length);
    setText($('ddz-count-left'), game.hands[left].length);
    setText($('ddz-count-right'), game.hands[right].length);
    setText($('ddz-role-me'), roleLabel(me));
    setText($('ddz-role-left'), roleLabel(left));
    setText($('ddz-role-right'), roleLabel(right));

    var showBottom = game.landlord !== null || game.phase === 'playing' || game.phase === 'finished';
    renderCards($('ddz-bottom'), showBottom ? game.bottom : game.bottom.map(function () {
      return { id: '?', suit: 'J', rank: 'SJ' };
    }), { backs: !showBottom && game.phase === 'auction' });

    if (game.lastCombo) {
      renderCards($('ddz-last'), game.lastCombo.cards);
    } else {
      setText($('ddz-last'), '');
      $('ddz-last').textContent = '';
    }

    // Opponent "played" area shows card backs for count visual
    renderCards($('ddz-played-left'), game.hands[left].slice(0, Math.min(8, game.hands[left].length)).map(function (_, i) {
      return { id: 'b' + i, suit: 'S', rank: '3' };
    }), { backs: true });
    renderCards($('ddz-played-right'), game.hands[right].slice(0, Math.min(8, game.hands[right].length)).map(function (_, i) {
      return { id: 'b' + i, suit: 'S', rank: '3' };
    }), { backs: true });

    renderCards($('ddz-hand'), game.hands[me], {
      selectable: game.phase === 'playing' && game.turn === me,
      selectedIds: selected,
      onToggle: function (card) {
        if (selected[card.id]) delete selected[card.id];
        else selected[card.id] = true;
        updateTableUI();
      }
    });

    var myTurn = game.turn === me;
    show($('ddz-auction-btns'), game.phase === 'auction' && myTurn);
    show($('ddz-play-btns'), game.phase === 'playing' && myTurn);
    show($('ddz-end-btns'), game.phase === 'finished');

    var hint = '';
    if (game.phase === 'auction') {
      hint = myTurn ? '轮到你叫分（当前 ' + game.bidScore + ' 分）' : ('等待 ' + shortName(actorAtSeat(game.turn)) + ' 叫分');
    } else if (game.phase === 'playing') {
      hint = myTurn
        ? (game.lastCombo ? '请压牌或过牌' : '请出牌（首家）')
        : ('等待 ' + shortName(actorAtSeat(game.turn)) + ' 出牌');
    } else if (game.phase === 'finished') {
      var wname = shortName(actorAtSeat(game.winner));
      hint = (game.winningSide === 'landlord' ? '地主胜 · ' : '农民胜 · ') + wname + ' 出完';
    }
    setText($('ddz-turn-hint'), hint);
  }

  function showLobby() {
    show($('ddz-lobby'), true);
    show($('ddz-table'), false);
    updateLobbyUI();
  }

  // ─── Protocol: host-owned seq + peer intents ────────────────
  // Only the host assigns global seq on canonical messages and rebroadcasts.
  // Peers send { type:'intent', actorId, clientNonce, action } — never own lastSeq.
  var seenNonces = {};

  function makeNonce() {
    return 'n-' + myActorId + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function seatActorLocal(actorId) {
    if (seats[actorId] !== undefined) return true;
    var used = {};
    Object.keys(seats).forEach(function (a) { used[seats[a]] = true; });
    for (var i = 0; i < N; i++) {
      if (!used[i]) {
        seats[actorId] = i;
        return true;
      }
    }
    return false;
  }

  async function sendWire(payload) {
    if (mode === 'solo') return;
    if (!roomId || !Tapp.federation) return;
    try {
      await Tapp.federation.sendRoomMessage(roomId, {
        message_type: MSG_TYPE,
        payload: payload
      });
    } catch (e) {
      tableMsg('发送失败: ' + (e && e.message ? e.message : e));
    }
  }

  /**
   * Host (or solo) assigns the next global seq, applies locally, then broadcasts.
   * Callers must NOT pre-assign seq — assignment is atomic with apply so consecutive
   * hostEmit calls get contiguous numbers.
   */
  async function hostEmit(partial) {
    var msg = {};
    for (var k in partial) {
      if (k !== 'seq') msg[k] = partial[k];
    }
    msg.seq = (lastSeq || 0) + 1;
    applyCanonical(msg);
    if (mode === 'solo') return;
    await sendWire(msg);
  }

  /** Peer (or host acting as player) submits an intent; host turns it into canonical msgs. */
  async function submitIntent(action) {
    var intent = {
      type: 'intent',
      actorId: myActorId,
      clientNonce: makeNonce(),
      action: action
    };
    if (mode === 'solo' || isHost) {
      await hostHandleIntent(intent);
      return;
    }
    // Peer: do not apply optimistically with a private seq — wait for host rebroadcast
    await sendWire(intent);
  }

  async function hostHandleIntent(intent) {
    if (!isHost && mode !== 'solo') return;
    if (!intent || intent.type !== 'intent') return;
    if (seenNonces[intent.clientNonce]) return;
    seenNonces[intent.clientNonce] = true;

    var action = intent.action;
    if (action.kind === 'join' || action.kind === 'ready') {
      if (!seatActorLocal(intent.actorId)) {
        lobbyMsg('座位已满');
        return;
      }
      if (action.kind === 'ready') {
        readyMap[intent.actorId] = !!action.ready;
      } else if (readyMap[intent.actorId] === undefined) {
        readyMap[intent.actorId] = false;
      }
      await hostEmit({
        type: 'ready',
        actorId: intent.actorId,
        ready: readyMap[intent.actorId] === true
      });
      await hostEmit({
        type: 'lobby_sync',
        seats: seats,
        ready: readyMap,
        hostActor: hostActor || myActorId
      });
      return;
    }

    var seat = seats[intent.actorId];
    if (seat === undefined) {
      tableMsg('未入座');
      return;
    }
    var msg = null;
    if (action.kind === 'bid') {
      msg = { type: 'bid', seat: seat, score: action.score };
    } else if (action.kind === 'bid_pass') {
      msg = { type: 'bid_pass', seat: seat };
    } else if (action.kind === 'play') {
      msg = { type: 'play', seat: seat, cards: action.cards };
    } else if (action.kind === 'pass') {
      msg = { type: 'pass', seat: seat };
    }
    if (msg) await hostEmit(msg);
  }

  function applyCanonical(msg) {
    // Host-sequenced only: drop exact redeliveries, never drop because of peer-local counters
    if (msg.seq > 0 && msg.seq <= lastSeq) {
      return;
    }
    // Contiguous for game actions; allow host reset types to jump
    if (lastSeq > 0 && msg.seq !== lastSeq + 1) {
      if (msg.type !== 'lobby_sync' && msg.type !== 'deal_start' && msg.type !== 'redeal' && msg.type !== 'state_sync') {
        console.warn('[斗地主] seq gap expected', lastSeq + 1, 'got', msg.seq, msg.type);
        return;
      }
    }
    lastSeq = msg.seq;

    if (msg.type === 'lobby_sync') {
      seats = msg.seats || {};
      readyMap = msg.ready || {};
      hostActor = msg.hostActor || hostActor;
      if (!game || game.phase === 'lobby' || game.phase === 'finished') {
        game = null;
      }
      updateLobbyUI();
      return;
    }
    if (msg.type === 'ready') {
      if (seats[msg.actorId] === undefined) {
        seatActorLocal(msg.actorId);
      }
      readyMap[msg.actorId] = msg.ready;
      updateLobbyUI();
      return;
    }
    if (msg.type === 'deal_start' || msg.type === 'redeal') {
      seats = msg.seats || seats;
      if (msg.hostActor) hostActor = msg.hostActor;
      game = {
        phase: 'auction',
        seed: msg.seed,
        hands: msg.hands,
        bottom: msg.bottom,
        landlord: null,
        bidScore: 0,
        bidWinner: null,
        turn: msg.auctionStart || 0,
        trickLeader: null,
        lastCombo: null,
        passCount: 0,
        auctionStart: msg.auctionStart || 0,
        auctionActions: 0,
        winner: null,
        winningSide: null
      };
      selected = {};
      mode = mode === 'solo' ? 'solo' : 'multi';
      updateLobbyUI();
      updateTableUI();
      scheduleBots();
      return;
    }
    if (!game) return;
    if (msg.type === 'bid') {
      var br = applyBid(game, { kind: 'bid', seat: msg.seat, score: msg.score });
      if (br.ok) { game = br.state; if (br.redeal) hostRedeal(); }
      else tableMsg(br.error || '叫分失败');
    } else if (msg.type === 'bid_pass') {
      var pr = applyBid(game, { kind: 'pass', seat: msg.seat });
      if (pr.ok) {
        game = pr.state;
        if (pr.redeal) hostRedeal();
      } else tableMsg(pr.error || '操作失败');
    } else if (msg.type === 'play') {
      var pl = applyPlay(game, { kind: 'play', seat: msg.seat, cards: msg.cards });
      if (pl.ok) game = pl.state;
      else tableMsg(pl.error || '出牌失败');
      selected = {};
    } else if (msg.type === 'pass') {
      var pa = applyPlay(game, { kind: 'pass', seat: msg.seat });
      if (pa.ok) game = pa.state;
      else tableMsg(pa.error || '过牌失败');
    }
    updateTableUI();
    scheduleBots();
  }

  function hostRedeal() {
    if (!isHost && mode !== 'solo') return;
    tableMsg('无人叫分，重新发牌…');
    var seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    var d = deal(seed);
    var msg = {
      type: 'redeal',
      seed: seed,
      auctionStart: (game && game.auctionStart != null ? (game.auctionStart + 1) % N : 0),
      hands: d.hands,
      bottom: d.bottom,
      seats: seats,
      hostActor: hostActor
    };
    setTimeout(function () { hostEmit(msg); }, 400);
  }

  // ─── Simple bot for solo / fill ─────────────────────────────
  function isBot(seat) {
    if (mode !== 'solo') return false;
    return seat !== mySeat();
  }

  function botPickBid(state, seat) {
    if (state.bidScore === 0 && Math.random() < 0.55) return { kind: 'bid', score: 1 };
    if (state.bidScore === 1 && Math.random() < 0.25) return { kind: 'bid', score: 2 };
    if (state.bidScore < 3 && Math.random() < 0.08) return { kind: 'bid', score: state.bidScore + 1 };
    return { kind: 'pass' };
  }

  function botPickPlay(state, seat) {
    var hand = state.hands[seat];
    if (!state.lastCombo) {
      var sorted = sortHand(hand);
      return { kind: 'play', cards: [sorted[0]] };
    }
    if (state.lastCombo.type === 'single') {
      var sorted2 = sortHand(hand);
      for (var i = 0; i < sorted2.length; i++) {
        var combo = identifyCombo([sorted2[i]]);
        if (combo && canBeat(combo, state.lastCombo))
          return { kind: 'play', cards: [sorted2[i]] };
      }
    }
    if (state.lastCombo.type === 'pair') {
      var by = countByRank(hand);
      var ranks = Object.keys(by).map(Number).sort(function (a, b) { return a - b; });
      for (var j = 0; j < ranks.length; j++) {
        if (by[ranks[j]].length >= 2) {
          var pair = by[ranks[j]].slice(0, 2);
          var c2 = identifyCombo(pair);
          if (c2 && canBeat(c2, state.lastCombo)) return { kind: 'play', cards: pair };
        }
      }
    }
    if (hand.length <= 6) {
      var by2 = countByRank(hand);
      var rs = Object.keys(by2).map(Number);
      for (var k = 0; k < rs.length; k++) {
        if (by2[rs[k]].length === 4) {
          var bomb = by2[rs[k]];
          var cb = identifyCombo(bomb);
          if (cb && canBeat(cb, state.lastCombo)) return { kind: 'play', cards: bomb };
        }
      }
    }
    return { kind: 'pass' };
  }

  function scheduleBots() {
    clearBots();
    if (!game) return;
    if (game.phase === 'finished') return;
    var seat = game.turn;
    if (!isBot(seat)) return;
    var botActor = actorAtSeat(seat);
    var t = setTimeout(function () {
      if (!game || game.turn !== seat) return;
      if (game.phase === 'auction') {
        var b = botPickBid(game, seat);
        if (b.kind === 'bid') {
          hostHandleIntent({
            type: 'intent', actorId: botActor, clientNonce: makeNonce(),
            action: { kind: 'bid', score: b.score }
          });
        } else {
          hostHandleIntent({
            type: 'intent', actorId: botActor, clientNonce: makeNonce(),
            action: { kind: 'bid_pass' }
          });
        }
      } else if (game.phase === 'playing') {
        var p = botPickPlay(game, seat);
        if (p.kind === 'play') {
          hostHandleIntent({
            type: 'intent', actorId: botActor, clientNonce: makeNonce(),
            action: { kind: 'play', cards: p.cards }
          });
        } else {
          hostHandleIntent({
            type: 'intent', actorId: botActor, clientNonce: makeNonce(),
            action: { kind: 'pass' }
          });
        }
      }
    }, 450 + Math.random() * 400);
    botTimers.push(t);
  }

  // ─── Federation lobby ───────────────────────────────────────
  function decodeIncoming(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var messageType = raw.message_type;
    var payload = raw.payload;
    if (raw.data && typeof raw.data === 'object') {
      if (raw.data.message_type !== undefined) {
        messageType = raw.data.message_type;
        payload = raw.data.payload;
      }
    }
    // federation:message event: { scope, roomId, data }
    if (raw.scope === 'room' && raw.data) {
      var d = raw.data;
      messageType = d.message_type || messageType;
      payload = d.payload !== undefined ? d.payload : d;
    }
    if (messageType && messageType !== MSG_TYPE) return null;
    if (!payload || typeof payload !== 'object') return null;
    if (payload.type === 'intent') {
      if (typeof payload.actorId !== 'string' || !payload.action) return null;
      return payload;
    }
    if (!payload.type || typeof payload.seq !== 'number') return null;
    return payload;
  }

  async function ensureIdentity() {
    if (myActorId) return myActorId;
    try {
      if (Tapp.federation && Tapp.federation.getIdentity) {
        var id = await Tapp.federation.getIdentity();
        myActorId = (id && (id.actor_id || id.id || id.actor || id.username)) || ('local-' + Math.random().toString(36).slice(2, 8));
      } else {
        myActorId = 'local-' + Math.random().toString(36).slice(2, 8);
      }
    } catch (e) {
      myActorId = 'local-' + Math.random().toString(36).slice(2, 8);
    }
    return myActorId;
  }

  async function subscribeRoom(id) {
    if (!Tapp.federation || !Tapp.federation.subscribeRoom) return;
    try {
      await Tapp.federation.subscribeRoom(id);
      status('已订阅房间实时事件');
    } catch (e) {
      status('订阅房间失败: ' + (e && e.message ? e.message : e));
    }
  }

  function wireMessageHandler() {
    if (unsubMessage || !Tapp.federation || !Tapp.federation.onMessage) return;
    unsubMessage = Tapp.federation.onMessage(function (evt) {
      try {
        if (evt && evt.scope && evt.scope !== 'room') return;
        if (evt && evt.roomId && roomId && evt.roomId !== roomId) return;
        var msg = decodeIncoming(evt);
        if (!msg) msg = decodeIncoming(evt && evt.data);
        if (!msg) return;
        if (msg.type === 'intent') {
          // Only host turns intents into sequenced canonical messages
          if (isHost || mode === 'solo') {
            hostHandleIntent(msg);
          }
          return;
        }
        // Canonical host-sequenced message — applyCanonical handles redelivery
        applyCanonical(msg);
      } catch (err) {
        console.warn('[斗地主] onMessage', err);
      }
    });
  }

  async function createRoom() {
    await ensureIdentity();
    if (!Tapp.federation || !Tapp.federation.createRoom) {
      lobbyMsg('当前环境无联邦能力（Playground 不可用）。请安装后运行，或使用单机练习。');
      return;
    }
    try {
      var res = await Tapp.federation.createRoom({
        name: '斗地主 ' + shortName(myActorId),
        description: 'Myriad 斗地主联机房',
        max_members: 3,
        invite_policy: 'member-invite',
        governance_type: 'owner'
      });
      roomId = (res && (res.room_id || res.id)) || '';
      if (!roomId) {
        lobbyMsg('创建房间失败：无 room_id');
        return;
      }
      hostActor = myActorId;
      isHost = true;
      seats = {};
      seats[myActorId] = 0;
      readyMap = {};
      readyMap[myActorId] = false;
      mode = 'multi';
      seq = 0;
      lastSeq = 0;
      seenNonces = {};
      await subscribeRoom(roomId);
      wireMessageHandler();
      lobbyMsg('房间已创建。邀请两位好友后准备开始。');
      status('房主 · ' + roomId);
      updateLobbyUI();
      await hostEmit({
        type: 'lobby_sync',
        seats: seats,
        ready: readyMap,
        hostActor: hostActor
      });
    } catch (e) {
      lobbyMsg('创建失败: ' + (e && e.message ? e.message : e));
    }
  }

  async function joinRoom() {
    await ensureIdentity();
    var id = ($('ddz-join-id').value || '').trim();
    if (!id) { lobbyMsg('请输入房间 ID'); return; }
    if (!Tapp.federation) {
      lobbyMsg('无联邦 API');
      return;
    }
    try {
      if (Tapp.federation.acceptRoomInvite) {
        try { await Tapp.federation.acceptRoomInvite(id); } catch (e1) { /* may already be member */ }
      }
      if (Tapp.federation.joinRoom) {
        try { await Tapp.federation.joinRoom(id); } catch (e2) { /* optional */ }
      }
      roomId = id;
      isHost = false;
      mode = 'multi';
      seq = 0;
      lastSeq = 0;
      seenNonces = {};
      await subscribeRoom(roomId);
      wireMessageHandler();
      lobbyMsg('已加入房间，向房主登记入座…');
      status('成员 · ' + roomId);
      updateLobbyUI();
      // Peer announces join via intent — host seats + lobby_sync (no private seq)
      await submitIntent({ kind: 'join' });
    } catch (e) {
      lobbyMsg('加入失败: ' + (e && e.message ? e.message : e));
    }
  }

  async function inviteFriend() {
    var actor = ($('ddz-invite-actor').value || '').trim();
    if (!actor || !roomId) { lobbyMsg('请填写好友并先创建房间'); return; }
    try {
      await Tapp.federation.inviteMember(roomId, { actor: actor, role: 'member' });
      lobbyMsg('已邀请 ' + actor + '（对方加入后会自动入座）');
      // Host may pre-reserve a seat; final seat also happens on join/ready intent
      if (isHost && seats[actor] === undefined) {
        if (seatActorLocal(actor)) {
          readyMap[actor] = false;
          await hostEmit({
            type: 'lobby_sync',
            seats: seats,
            ready: readyMap,
            hostActor: hostActor
          });
        }
      }
      updateLobbyUI();
    } catch (e) {
      lobbyMsg('邀请失败: ' + (e && e.message ? e.message : e));
    }
  }

  async function toggleReady() {
    await ensureIdentity();
    if (!roomId && mode !== 'solo') return;
    var nextReady = !readyMap[myActorId];
    await submitIntent({ kind: 'ready', ready: nextReady });
  }

  async function startMatch() {
    if (!isHost && mode !== 'solo') {
      lobbyMsg('仅房主可开始');
      return;
    }
    var actors = Object.keys(seats);
    if (mode === 'multi') {
      if (actors.length < 3) {
        lobbyMsg('需要 3 名玩家入座');
        return;
      }
      if (!canStartMatch(seats, readyMap)) {
        lobbyMsg('需三人都准备');
        return;
      }
      seats = assignSeats(actors.slice(0, 3));
    }
    var seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    var d = deal(seed);
    await hostEmit({
      type: 'deal_start',
      seed: seed,
      auctionStart: 0,
      seats: seats,
      hostActor: hostActor || myActorId,
      hands: d.hands,
      bottom: d.bottom
    });
  }

  function startSolo() {
    clearBots();
    ensureIdentity().then(function () {
      mode = 'solo';
      isHost = true;
      hostActor = myActorId;
      roomId = 'solo-local';
      seats = {};
      seats[myActorId] = 0;
      seats['bot:west'] = 1;
      seats['bot:east'] = 2;
      readyMap = {};
      readyMap[myActorId] = true;
      readyMap['bot:west'] = true;
      readyMap['bot:east'] = true;
      seq = 0;
      lastSeq = 0;
      seenNonces = {};
      lobbyMsg('单机练习：你 vs 两位本地对手');
      status('单机练习');
      updateLobbyUI();
      startMatch();
    });
  }

  async function leaveRoom() {
    clearBots();
    if (roomId && mode === 'multi' && Tapp.federation && Tapp.federation.leaveRoom) {
      try { await Tapp.federation.leaveRoom(roomId); } catch (e) {}
      try {
        if (Tapp.federation.unsubscribeRoom) await Tapp.federation.unsubscribeRoom(roomId);
      } catch (e2) {}
    }
    roomId = '';
    game = null;
    seats = {};
    readyMap = {};
    isHost = false;
    mode = 'lobby';
    showLobby();
    status('已离开');
    lobbyMsg('');
  }

  // ─── Controls ───────────────────────────────────────────────
  function selectedCards() {
    if (!game) return [];
    var me = mySeat();
    return game.hands[me].filter(function (c) { return selected[c.id]; });
  }

  async function doBid(score) {
    if (!game || game.phase !== 'auction') return;
    var seat = mySeat();
    if (game.turn !== seat) return;
    await submitIntent({ kind: 'bid', score: score });
  }
  async function doBidPass() {
    if (!game || game.phase !== 'auction') return;
    var seat = mySeat();
    if (game.turn !== seat) return;
    await submitIntent({ kind: 'bid_pass' });
  }
  async function doPlay() {
    if (!game || game.phase !== 'playing') return;
    var seat = mySeat();
    if (game.turn !== seat) return;
    var cards = selectedCards();
    if (!cards.length) { tableMsg('请先选择手牌'); return; }
    var combo = identifyCombo(cards);
    if (!combo) { tableMsg('不是合法牌型'); return; }
    if (!canBeat(combo, game.lastCombo)) { tableMsg('压不过当前牌'); return; }
    await submitIntent({ kind: 'play', cards: cards });
  }
  async function doPass() {
    if (!game || game.phase !== 'playing') return;
    var seat = mySeat();
    if (game.turn !== seat) return;
    await submitIntent({ kind: 'pass' });
  }

  // ─── Wire DOM ───────────────────────────────────────────────
  $('ddz-create').addEventListener('click', createRoom);
  $('ddz-join').addEventListener('click', joinRoom);
  $('ddz-invite').addEventListener('click', inviteFriend);
  $('ddz-ready').addEventListener('click', toggleReady);
  $('ddz-start').addEventListener('click', startMatch);
  $('ddz-leave').addEventListener('click', leaveRoom);
  $('ddz-solo').addEventListener('click', startSolo);
  $('ddz-play').addEventListener('click', doPlay);
  $('ddz-pass').addEventListener('click', doPass);
  $('ddz-clear').addEventListener('click', function () { selected = {}; updateTableUI(); });
  $('ddz-bid-pass').addEventListener('click', doBidPass);
  Array.prototype.forEach.call(document.querySelectorAll('[data-bid]'), function (btn) {
    btn.addEventListener('click', function () {
      doBid(Number(btn.getAttribute('data-bid')));
    });
  });
  $('ddz-again').addEventListener('click', function () {
    if (mode === 'solo' || isHost) startMatch();
    else tableMsg('等待房主开下一局');
  });
  $('ddz-to-lobby').addEventListener('click', function () {
    game = null;
    if (mode === 'solo') {
      mode = 'lobby';
      roomId = '';
      seats = {};
      readyMap = {};
    }
    showLobby();
  });

  Tapp.lifecycle.onDestroy(function () {
    clearBots();
    if (roomId && mode === 'multi' && Tapp.federation && Tapp.federation.unsubscribeRoom) {
      try { Tapp.federation.unsubscribeRoom(roomId); } catch (e) {}
    }
  });

  Tapp.lifecycle.onReady(async function () {
    await ensureIdentity();
    wireMessageHandler();
    showLobby();
    status('身份: ' + shortName(myActorId));
    var hasFed = Tapp.federation && typeof Tapp.federation.createRoom === 'function';
    if (!hasFed) {
      lobbyMsg('联邦 API 不可用时仍可「单机练习」。安装运行并授予 federation 权限后可联机。');
    }
  });
})();
