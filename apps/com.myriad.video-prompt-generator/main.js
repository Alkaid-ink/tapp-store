// AI Video Prompt Generator v1.0.0

// ========================================
// 国际化
// ========================================

var i18n = {
  'zh-CN': {
    title: 'AI 视频提示词',
    subtitle: '生成专业的 AI 视频制作提示词',
    inputPlaceholder: '描述你想要的视频内容...',
    generate: '生成提示词',
    regenerate: '重新生成',
    copy: '复制',
    copied: '已复制',
    clear: '清空',
    history: '历史记录',
    noHistory: '暂无历史记录',
    generating: '生成中...',
    error: '生成失败',
    errorNetwork: '网络错误，请重试',
    styleLabel: '视频风格',
    durationLabel: '视频时长',
    aspectLabel: '画面比例',
    styles: {
      cinematic: '电影风格',
      anime: '动漫风格',
      realistic: '写实风格',
      abstract: '抽象艺术',
      '3d': '3D 渲染'
    },
    durations: {
      short: '短片 (5-10秒)',
      medium: '中等 (10-30秒)',
      long: '长片 (30-60秒)'
    },
    aspects: {
      '16:9': '横屏 16:9',
      '9:16': '竖屏 9:16',
      '1:1': '方形 1:1',
      '4:3': '传统 4:3'
    },
    promptSections: {
      main: '主提示词',
      camera: '镜头运动',
      lighting: '光影氛围',
      negative: '负面提示词'
    },
    tips: '提示：详细描述场景、主体、动作和情绪，获得更好的结果'
  },
  'en-US': {
    title: 'AI Video Prompts',
    subtitle: 'Generate professional AI video prompts',
    inputPlaceholder: 'Describe the video you want...',
    generate: 'Generate',
    regenerate: 'Regenerate',
    copy: 'Copy',
    copied: 'Copied',
    clear: 'Clear',
    history: 'History',
    noHistory: 'No history yet',
    generating: 'Generating...',
    error: 'Generation failed',
    errorNetwork: 'Network error, please retry',
    styleLabel: 'Video Style',
    durationLabel: 'Duration',
    aspectLabel: 'Aspect Ratio',
    styles: {
      cinematic: 'Cinematic',
      anime: 'Anime',
      realistic: 'Realistic',
      abstract: 'Abstract Art',
      '3d': '3D Render'
    },
    durations: {
      short: 'Short (5-10s)',
      medium: 'Medium (10-30s)',
      long: 'Long (30-60s)'
    },
    aspects: {
      '16:9': 'Landscape 16:9',
      '9:16': 'Portrait 9:16',
      '1:1': 'Square 1:1',
      '4:3': 'Classic 4:3'
    },
    promptSections: {
      main: 'Main Prompt',
      camera: 'Camera Movement',
      lighting: 'Lighting & Mood',
      negative: 'Negative Prompt'
    },
    tips: 'Tip: Describe scene, subject, action and mood in detail for better results'
  },
  'ja-JP': {
    title: 'AI動画プロンプト',
    subtitle: 'プロフェッショナルなAI動画プロンプトを生成',
    inputPlaceholder: '作りたい動画を説明してください...',
    generate: '生成',
    regenerate: '再生成',
    copy: 'コピー',
    copied: 'コピー完了',
    clear: 'クリア',
    history: '履歴',
    noHistory: '履歴がありません',
    generating: '生成中...',
    error: '生成失敗',
    errorNetwork: 'ネットワークエラー',
    styleLabel: '動画スタイル',
    durationLabel: '長さ',
    aspectLabel: 'アスペクト比',
    styles: {
      cinematic: 'シネマティック',
      anime: 'アニメ',
      realistic: 'リアリスティック',
      abstract: '抽象アート',
      '3d': '3Dレンダー'
    },
    durations: {
      short: '短い (5-10秒)',
      medium: '中程度 (10-30秒)',
      long: '長い (30-60秒)'
    },
    aspects: {
      '16:9': '横長 16:9',
      '9:16': '縦長 9:16',
      '1:1': '正方形 1:1',
      '4:3': 'クラシック 4:3'
    },
    promptSections: {
      main: 'メインプロンプト',
      camera: 'カメラワーク',
      lighting: 'ライティング',
      negative: 'ネガティブプロンプト'
    },
    tips: 'ヒント：シーン、被写体、アクション、ムードを詳しく説明すると良い結果が得られます'
  }
};

var currentLocale = 'zh-CN';

function normalizeLocale(locale) {
  if (!locale) return 'zh-CN';
  var l = locale.toLowerCase();
  if (l.startsWith('zh')) return 'zh-CN';
  if (l.startsWith('ja')) return 'ja-JP';
  return 'en-US';
}

function t(key) {
  var keys = key.split('.');
  var value = i18n[currentLocale] || i18n['zh-CN'];
  for (var i = 0; i < keys.length; i++) {
    value = value[keys[i]];
    if (value === undefined) return key;
  }
  return value;
}

// ========================================
// 系统提示词（核心 - 占位版本）
// ========================================

var SYSTEM_PROMPT = `你是一个专业的 AI 视频提示词生成专家。你的任务是根据用户的描述，生成高质量、结构化的 AI 视频生成提示词。

## 你的能力
- 理解用户的创意意图并转化为专业的视频提示词
- 熟悉主流 AI 视频生成工具（Runway, Pika, Kling, Sora 等）的提示词格式
- 掌握电影语言、镜头运动、光影氛围的专业术语

## 输出格式要求
请以 JSON 格式输出，包含以下字段：

{
  "main": "主提示词：详细描述视频内容、场景、主体、动作、情绪等",
  "camera": "镜头运动：如 dolly in, pan left, tracking shot, crane shot 等",
  "lighting": "光影氛围：如 golden hour, dramatic lighting, soft diffused light 等",
  "negative": "负面提示词：需要避免的元素，如 blurry, distorted, low quality 等"
}

## 生成原则
1. 主提示词应具体、生动，避免抽象模糊的描述
2. 包含视觉细节：颜色、材质、环境元素
3. 描述动态变化：运动方向、速度、节奏
4. 考虑画面构图和视觉层次
5. 根据视频风格调整用词和氛围

## 风格指南
- 电影风格：使用电影术语，强调叙事感和情绪张力
- 动漫风格：强调夸张的表现、鲜艳的色彩、动态线条
- 写实风格：注重真实感、自然光影、生活化细节
- 抽象艺术：强调形式、色彩、节奏的抽象表达
- 3D 渲染：强调材质质感、光线追踪、空间深度

请只输出 JSON，不要包含其他解释文字。`;

// ========================================
// 工具函数
// ========================================

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseJSON(text) {
  try {
    // 尝试从文本中提取 JSON
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}

// ========================================
// 状态管理
// ========================================

var state = {
  generating: false,
  currentPrompt: null,
  history: [],
  settings: {
    style: 'cinematic',
    duration: 'medium',
    aspect: '16:9'
  }
};

// ========================================
// 生成提示词
// ========================================

async function generatePrompt(userInput) {
  if (state.generating || !userInput.trim()) return null;

  state.generating = true;
  updateUI();

  try {
    var style = state.settings.style;
    var duration = state.settings.duration;
    var aspect = state.settings.aspect;

    var userMessage = `请为以下视频创意生成提示词：

用户描述：${userInput}

参数设置：
- 视频风格：${t('styles.' + style)}
- 视频时长：${t('durations.' + duration)}
- 画面比例：${aspect}

请生成适合这些参数的专业视频提示词。`;

    var response = await Tapp.ai.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      {},
      { maxTokens: 1000 }
    );

    var result = parseJSON(response.message.content);
    
    if (result) {
      state.currentPrompt = {
        input: userInput,
        output: result,
        style: style,
        duration: duration,
        aspect: aspect,
        timestamp: Date.now()
      };

      // 保存到历史
      await saveToHistory(state.currentPrompt);
    }

    return result;

  } catch (error) {
    console.error('Generate error:', error);
    await Tapp.ui.showNotification({
      message: t('errorNetwork'),
      type: 'error'
    });
    return null;

  } finally {
    state.generating = false;
    updateUI();
  }
}

// ========================================
// 历史管理
// ========================================

async function loadHistory() {
  try {
    var saved = await Tapp.storage.get('prompt_history');
    state.history = saved || [];
  } catch (e) {
    state.history = [];
  }
}

async function saveToHistory(prompt) {
  try {
    var saveHistory = await Tapp.settings.get('saveHistory');
    if (saveHistory === false) return;

    var maxHistory = await Tapp.settings.get('maxHistory') || 20;
    
    state.history.unshift(prompt);
    if (state.history.length > maxHistory) {
      state.history = state.history.slice(0, maxHistory);
    }

    await Tapp.storage.set('prompt_history', state.history);
  } catch (e) {
    console.error('Save history error:', e);
  }
}

async function clearHistory() {
  state.history = [];
  await Tapp.storage.remove('prompt_history');
  renderHistory();
}

// ========================================
// UI 渲染
// ========================================

function updateUI() {
  var generateBtn = document.getElementById('generate-btn');
  var inputArea = document.getElementById('user-input');
  
  if (generateBtn) {
    generateBtn.disabled = state.generating;
    generateBtn.innerHTML = state.generating 
      ? '<span class="loading-spinner"></span>' + t('generating')
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-6.364L14.95 7.05m-5.9 9.9l-1.414 1.414m0-11.314L9.05 8.464m5.9 9.9l1.414 1.414"/></svg>' + t('generate');
  }

  if (inputArea) {
    inputArea.disabled = state.generating;
  }
}

function renderResult(result) {
  var container = document.getElementById('result-container');
  if (!container || !result) return;

  container.innerHTML = '';
  container.classList.add('visible');

  var sections = ['main', 'camera', 'lighting', 'negative'];
  
  sections.forEach(function(section) {
    if (result[section]) {
      var card = document.createElement('div');
      card.className = 'result-card';
      
      card.innerHTML = 
        '<div class="result-header">' +
          '<span class="result-label">' + escapeHtml(t('promptSections.' + section)) + '</span>' +
          '<button class="copy-btn" data-content="' + escapeHtml(result[section]) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
            t('copy') +
          '</button>' +
        '</div>' +
        '<div class="result-content">' + escapeHtml(result[section]) + '</div>';
      
      container.appendChild(card);
    }
  });

  // 绑定复制按钮
  container.querySelectorAll('.copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var content = this.getAttribute('data-content');
      copyToClipboard(content, this);
    });
  });
}

function renderHistory() {
  var container = document.getElementById('history-list');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = '<div class="empty-state">' + t('noHistory') + '</div>';
    return;
  }

  container.innerHTML = '';
  
  state.history.forEach(function(item, index) {
    var card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = 
      '<div class="history-input">' + escapeHtml(item.input.substring(0, 50)) + (item.input.length > 50 ? '...' : '') + '</div>' +
      '<div class="history-meta">' +
        '<span class="history-style">' + escapeHtml(t('styles.' + item.style)) + '</span>' +
        '<span class="history-time">' + formatTime(item.timestamp) + '</span>' +
      '</div>';
    
    card.addEventListener('click', function() {
      state.currentPrompt = item;
      renderResult(item.output);
      document.getElementById('user-input').value = item.input;

      // 切换到结果视图
      showResultPanel();
    });
    
    container.appendChild(card);
  });
}

function formatTime(timestamp) {
  var date = new Date(timestamp);
  var now = new Date();
  var diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  return date.toLocaleDateString();
}

function showResultPanel() {
  document.getElementById('result-panel').classList.add('visible');
}

function hideResultPanel() {
  document.getElementById('result-panel').classList.remove('visible');
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    var originalText = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' + t('copied');
    btn.classList.add('copied');
    
    setTimeout(function() {
      btn.innerHTML = originalText;
      btn.classList.remove('copied');
    }, 2000);
  } catch (e) {
    console.error('Copy failed:', e);
  }
}

async function copyAllPrompts() {
  if (!state.currentPrompt) return;
  
  var result = state.currentPrompt.output;
  var text = Object.keys(result).map(function(key) {
    return t('promptSections.' + key) + ':\n' + result[key];
  }).join('\n\n');
  
  await navigator.clipboard.writeText(text);
  await Tapp.ui.showNotification({
    message: t('copied'),
    type: 'success'
  });
}

// ========================================
// 事件绑定
// ========================================

function bindEvents() {
  // 生成按钮
  var generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async function() {
      var input = document.getElementById('user-input').value;
      var result = await generatePrompt(input);
      if (result) {
        renderResult(result);
        showResultPanel();
      }
    });
  }

  // 输入框回车
  var inputArea = document.getElementById('user-input');
  if (inputArea) {
    inputArea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateBtn.click();
      }
    });
  }

  // 风格选择
  var styleSelect = document.getElementById('style-select');
  if (styleSelect) {
    styleSelect.addEventListener('change', function() {
      state.settings.style = this.value;
    });
  }

  // 时长选择
  var durationSelect = document.getElementById('duration-select');
  if (durationSelect) {
    durationSelect.addEventListener('change', function() {
      state.settings.duration = this.value;
    });
  }

  // 比例选择
  var aspectSelect = document.getElementById('aspect-select');
  if (aspectSelect) {
    aspectSelect.addEventListener('change', function() {
      state.settings.aspect = this.value;
    });
  }

  // 复制全部按钮
  var copyAllBtn = document.getElementById('copy-all-btn');
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', copyAllPrompts);
  }

  // 返回按钮
  var backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', hideResultPanel);
  }

  // 清空历史
  var clearHistoryBtn = document.getElementById('clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async function() {
      var confirmed = await Tapp.ui.confirm('确定要清空所有历史记录吗？');
      if (confirmed) {
        await clearHistory();
      }
    });
  }
}

// ========================================
// 初始化
// ========================================

function initLocale(locale) {
  currentLocale = normalizeLocale(locale);
  
  // 更新静态文本
  var titleEl = document.getElementById('page-title');
  var subtitleEl = document.getElementById('page-subtitle');
  var inputEl = document.getElementById('user-input');
  var tipsEl = document.getElementById('tips-text');

  if (titleEl) titleEl.textContent = t('title');
  if (subtitleEl) subtitleEl.textContent = t('subtitle');
  if (inputEl) inputEl.placeholder = t('inputPlaceholder');
  if (tipsEl) tipsEl.textContent = t('tips');

  // 更新选择器标签
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // 更新选择器选项
  updateSelectOptions();
}

function updateSelectOptions() {
  var styleSelect = document.getElementById('style-select');
  var durationSelect = document.getElementById('duration-select');
  var aspectSelect = document.getElementById('aspect-select');

  if (styleSelect) {
    styleSelect.innerHTML = Object.keys(i18n['zh-CN'].styles).map(function(key) {
      return '<option value="' + key + '">' + t('styles.' + key) + '</option>';
    }).join('');
  }

  if (durationSelect) {
    durationSelect.innerHTML = Object.keys(i18n['zh-CN'].durations).map(function(key) {
      return '<option value="' + key + '">' + t('durations.' + key) + '</option>';
    }).join('');
  }

  if (aspectSelect) {
    aspectSelect.innerHTML = Object.keys(i18n['zh-CN'].aspects).map(function(key) {
      return '<option value="' + key + '">' + t('aspects.' + key) + '</option>';
    }).join('');
  }
}

async function initSettings() {
  try {
    var defaultStyle = await Tapp.settings.get('defaultStyle');
    if (defaultStyle) {
      state.settings.style = defaultStyle;
      var styleSelect = document.getElementById('style-select');
      if (styleSelect) styleSelect.value = defaultStyle;
    }
  } catch (e) {
    console.error('Load settings error:', e);
  }
}

// ========================================
// 生命周期
// ========================================

Tapp.lifecycle.onReady(async function() {
  console.log('Video Prompt Generator ready');

  // 获取当前语言
  var locale = await Tapp.ui.getLocale();
  initLocale(locale);

  // 监听语言变化
  Tapp.ui.onLocaleChange(function(newLocale) {
    initLocale(newLocale);
    renderHistory();
  });

  // 加载设置
  await initSettings();

  // 加载历史
  await loadHistory();
  renderHistory();

  // 绑定事件
  bindEvents();

  // 初始化 UI 状态
  updateUI();
});

Tapp.lifecycle.onDestroy(function() {
  console.log('Video Prompt Generator destroyed');
});
