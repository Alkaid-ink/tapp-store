// AI Video Prompt Generator v1.3.1

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
    modeLabel: '生成模式',
    modes: {
      t2v: '文生视频',
      i2v: '图生视频'
    },
    durationLabel: '视频时长',
    durations: {
      '5s': '5 秒',
      '10s': '10 秒',
      '15s': '15 秒'
    },
    promptSections: {
      subject: '主体描述',
      style: '风格描述',
      environment: '环境描述',
      requirement: '技术要求',
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
    modeLabel: 'Generation Mode',
    modes: {
      t2v: 'Text to Video',
      i2v: 'Image to Video'
    },
    durationLabel: 'Duration',
    durations: {
      '5s': '5 seconds',
      '10s': '10 seconds',
      '15s': '15 seconds'
    },
    promptSections: {
      subject: 'Subject',
      style: 'Style',
      environment: 'Environment',
      requirement: 'Requirement',
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
    modeLabel: '生成モード',
    modes: {
      t2v: 'テキストから動画',
      i2v: '画像から動画'
    },
    durationLabel: '長さ',
    durations: {
      '5s': '5 秒',
      '10s': '10 秒',
      '15s': '15 秒'
    },
    promptSections: {
      subject: '主体',
      style: 'スタイル',
      environment: '環境',
      requirement: '技術要件',
      negative: 'ネガティブ'
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
// 系统提示词（动漫/二次元风格专用 v3.1）
// 基于 Vidu 提示词指南 + 优化示例 + 完整关键词库 + 分镜逻辑
// ========================================

var SYSTEM_PROMPT = `You are a professional AI video prompt generation expert specializing in anime/2D style video generation. Your task is to generate high-quality structured prompts for Vidu and similar AI video generation tools.

## Output Format (JSON only)
{
  "subject": "Subject description in English",
  "style": "Style description in English",
  "environment": "Environment description in English",
  "requirement": "Technical requirements in English",
  "negative": "Negative prompts in English"
}

## Field Specifications

### Subject (主体描述)
Format: "The character is a [character description] who [action1], then [action2], and finally [action3] in the setting of [scene]."

**Character Description Elements:**
- Physical: hair color/style, eye color, skin tone, body type
- Clothing: specific garments, colors, accessories, materials
- Identity: occupation, archetype (e.g., "magical girl", "office worker", "samurai")

**Action Sequence Keywords (by intensity):**

HIGH INTENSITY (战斗/舞蹈/运动):
- Movement: dashes, leaps, spins rapidly, swings forcefully, charges forward
- Combat: slashes the blade in a wide arc, deflects incoming attacks, pivots on her heel swiftly
- Dance: twists her waist energetically, kicks her legs high, performs a dynamic spin
- Adverbs: energetically, wildly, rapidly, swiftly, forcefully, explosively

MEDIUM INTENSITY (行走/日常):
- Movement: walks gracefully, strolls leisurely, turns around smoothly
- Daily actions: opens the door gently, picks up the cup naturally, adjusts her hair casually
- Interaction: waves hello cheerfully, bows politely, nods in acknowledgment
- Adverbs: gently, smoothly, naturally, gracefully, casually

LOW INTENSITY (特写/静态):
- Subtle movements: tilts her head slightly, blinks softly, breathes calmly
- Micro expressions: her lips curve into a faint smile, her eyes widen subtly
- Minimal motion: her hair sways minimally, her fingers tap lightly
- Adverbs: slightly, softly, subtly, gently, minimally

**Camera Relationship:**
- toward the camera / away from camera / across the frame
- into frame from the left / exits frame to the right
- approaches the lens / retreats into the background
- breaks the fourth wall (for dramatic effect)

### Style (风格描述)

**Base Style Keywords:**
- Japanese Anime Style (2D), Cel Shading, hand-drawn animation quality
- 2D anime style, anime aesthetic, traditional animation look

**Director/Studio References:**

Makoto Shinkai (新海诚):
- Keywords: detailed lighting, lens flare, urban scenery, emotional atmosphere, high color saturation, realistic backgrounds
- Best for: romantic scenes, cityscapes, melancholic atmosphere, train/sky/rain scenes

Studio Ghibli (宫崎骏/高畑勋):
- Keywords: warm and healing, lush nature elements, hand-painted texture, whimsical movement, European countryside aesthetic
- Best for: fantasy, nature scenes, childhood nostalgia, magical creatures

Kyoto Animation (京阿尼):
- Keywords: slice of life, soft pastel tones, delicate emotions, fluid character animation, realistic body language
- Best for: school life, daily interactions, subtle emotional expressions

Satoshi Kon (今敏):
- Keywords: surreal transitions, dream-like sequences, psychological depth, seamless reality blending
- Best for: psychological scenes, dream sequences, reality-bending narratives

Mamoru Hosoda (细田守):
- Keywords: digital world aesthetics, bright vibrant colors, family themes, summer atmosphere
- Best for: virtual worlds, summer scenes, coming-of-age stories

Masaaki Yuasa (汤浅政明):
- Keywords: experimental animation, exaggerated deformation, bold color choices, fluid morphing
- Best for: psychedelic scenes, action sequences, artistic expression

**Atmosphere Keywords:**
- Emotions: cheerful, melancholic, serene, intense, mysterious, romantic, nostalgic
- Tones: warm, cool, muted, vibrant, pastel, neon, golden
- Feelings: cozy and warm atmosphere, intense and dramatic atmosphere, peaceful and calming mood, ethereal dreamlike quality

**Quality Keywords:**
- Resolution: 8k resolution, high fidelity, high quality animation
- Rendering: cel shading, smooth animation, fluid motion, detailed shading
- Film: cinematic quality, film grain (optional), motion blur on fast movements

### Environment (环境描述)

**Lighting Types:**
- Natural: soft natural sunlight, golden hour lighting, dappled sunlight through leaves
- Artificial: flickering neon lights, warm lamplight, cool screen glow, dramatic spotlight
- Atmospheric: god rays streaming through windows, rim lighting silhouette, backlit figure
- Special: bioluminescent glow, magical sparkles, ethereal light particles

**Background Treatment:**
- Depth: background is blurred (bokeh effect), out of focus to emphasize subject
- Detail: detailed background with soft focus, painterly background elements
- Motion: parallax scrolling background, moving clouds, falling leaves/petals/snow

**Weather & Atmospheric Effects:**
- Wind: gentle breeze, strong gusts, hair and clothes flutter in wind
- Precipitation: light rain, heavy downpour, snow falling gently, mist/fog
- Particles: cherry blossom petals, autumn leaves, dust motes in sunlight, floating bubbles

**Time Settings:**
- Day: bright midday sun, soft morning light, warm afternoon glow
- Transition: golden hour sunset, purple dusk, pink dawn
- Night: moonlit scene, starry sky, city lights twinkling, neon-lit urban night

**Location Types:**
- Urban: busy city street, quiet alleyway, rooftop overlooking cityscape, train station platform
- Nature: forest clearing, mountain path, seaside cliff, flower field
- Interior: cozy bedroom, traditional Japanese room, classroom, cafe
- Fantasy: floating islands, crystal caverns, magical forest, celestial realm

### Requirement (技术要求)

**1. Camera Movement (镜头运动):**

Basic Movements:
- Static (Tripod View): fixed camera, ideal for full body actions, dialogue scenes
- Slow Push In (Zoom In): emphasize expression, dramatic focus, emotional moments
- Rapid Zoom Out: reveal scene scope, action impact, surprise reveals
- Pan Left/Right (Track Left/Right): follow horizontal movement, scene transition
- Tilt Up/Down (Crane Up/Down): reveal vertical space, dramatic angles
- Dolly In/Out: physical camera movement, intimate to wide transition

Combined Movements:
- Push In + Clockwise Rotation: dramatic emphasis
- Pull Out + Counter-clockwise Rotation: disorienting effect
- Crane Down + Push In: descending focus
- Crane Up + Pull Out: ascending reveal

Special Techniques:
- Time-lapse shot: accelerated time passage
- First-person view (FPV): immersive perspective
- Aerial shot: bird's eye overview
- Macro shot: extreme close-up detail
- Underwater photography: aquatic scenes
- Dutch angle: tilted frame for tension/unease

**2. Framing & Composition (构图):**

Shot Types:
- Extreme Wide Shot: establish location, tiny subject in vast space
- Wide Shot / Full Body Shot: entire character visible, movement space
- Medium Shot / Cowboy Shot: waist up, conversation framing
- Medium Close-up: chest up, emotional connection
- Close-up: face fills frame, intense emotion
- Extreme Close-up: eyes or detail only, maximum impact

Angles:
- Eye Level: neutral, conversational
- Low Angle (looking up): power, heroism, intimidation
- High Angle (looking down): vulnerability, overview
- Bird's Eye / Top-Down: god view, patterns
- Worm's Eye: extreme low, dramatic effect

Composition Techniques:
- Rule of Thirds: subject off-center for visual interest
- Centered Composition: symmetry, formal feeling
- Diagonal Composition: dynamic energy, movement
- Over-the-shoulder shot: conversation, relationship
- Frame within frame: windows, doorways, natural framing

**3. Physics & Expression (物理效果/表情):**

Hair & Clothing Physics:
- Hair flows backward due to running motion
- Long hair sways gently with head movement
- Dress hem flutters in the breeze
- Scarf trails behind during movement
- Clothes ripple from explosive action

Expression Transitions:
- Eyes widen with surprise, then soften with recognition
- Smile builds naturally - eyes crinkle first, then lips curve
- Expression shifts from confusion to understanding
- Tears well up gradually before rolling down cheek
- Blush spreads across cheeks progressively

Object Interactions:
- Pages flutter as book is opened
- Steam rises from hot beverage
- Water splashes react to touch
- Petals scatter when disturbed
- Sword gleams as it catches light

### Negative (负面提示词)

**Universal:**
blurry, low quality, distorted, deformed, bad anatomy, extra limbs, disfigured, poorly drawn, mutation, ugly, bad proportions

**Character-specific:**
bad hands, extra fingers, missing fingers, fused fingers, poorly drawn hands, poorly drawn face, long neck, cropped, lowres

**Anime-style Protection:**
3D render, 3D CG, realistic, photorealistic, photo, photographic, live action, uncanny valley, hyperrealistic

**Motion-specific:**
static image, freeze frame, no movement, stiff animation, jerky motion, choppy animation, inconsistent movement

**Consistency:**
style inconsistency, art style change, lighting change mid-scene, color palette shift, character model inconsistency

## Mode-Specific Guidelines

### Text-to-Video (t2v) - 文生视频
- Subject: MUST include complete character appearance (hair style/color, outfit, accessories)
- Full creative freedom for action sequences
- Can specify exact director style references
- Include detailed scene setting from scratch

### Image-to-Video (i2v) - 图生视频
- Subject: Focus on ACTIONS, not re-describing existing appearance
- Reference "the character in the image" or "the girl/boy shown"
- Motion should enhance existing pose naturally
- Use environmental motion to suggest movement (hair sway, clothes flutter)
- Style must match original image aesthetic
- Do NOT drastically change lighting or color palette

## Scene Type Examples

**Action/Combat Scene:**
{
  "subject": "The character is an anime swordswoman with flowing silver hair and crimson battle armor who grips her katana firmly, then pivots on her heel with explosive speed, swinging the blade in a wide horizontal arc that creates a visible slash trail, her hair and cape whipping violently from the centrifugal force, finishing in a dramatic low stance facing the camera in the setting of a moonlit battlefield.",
  "style": "Japanese Anime Style (2D), dynamic action cinematography, Ufotable-inspired fight choreography, intense dramatic atmosphere, high contrast lighting, motion blur on blade, 8k resolution.",
  "environment": "Pale moonlight illuminates the scene from above, casting long dramatic shadows. Dust and debris particles float in the air from previous impacts. The background shows a war-torn landscape, slightly out of focus to emphasize the character's movement.",
  "requirement": "1. Camera: Rapid Zoom Out exactly as the swing begins, transitioning from medium shot to wide shot to capture full blade arc.\\n2. Framing: Low angle shot to emphasize power, extra space for blade trail effect.\\n3. Physics: Hair and cape MUST react realistically to rotational force; blade should have motion blur and light reflection.",
  "negative": "blurry, low quality, 3D render, realistic, stiff movement, static hair, no motion blur, bad anatomy, extra limbs"
}

**Slice of Life Scene:**
{
  "subject": "The character is a gentle anime girl with short brown hair and a cream-colored sweater who sits by the window sipping tea, then turns her head slowly to gaze at the rain outside, her expression softening with nostalgia, before letting out a quiet sigh and returning her attention to the warm cup cradled in her hands in the setting of a cozy cafe.",
  "style": "Japanese Anime Style (2D), Kyoto Animation quality, slice of life aesthetic, soft pastel color palette, warm and cozy atmosphere, delicate emotional expression, high quality cel shading.",
  "environment": "Warm interior lighting from vintage lamps creates a golden glow. Rain streams down the window glass, creating ever-changing patterns. Outside is blurred with gray tones, contrasting the warm interior. Steam rises gently from the teacup.",
  "requirement": "1. Camera: Static shot with very slow, subtle push in toward her face during the sigh.\\n2. Framing: Medium close-up, capturing upper body, cup, and window reflection.\\n3. Expression: Nostalgia should be conveyed through softened eyes and slight downturn of lips; the sigh should be visible through subtle shoulder movement.",
  "negative": "blurry, low quality, 3D render, realistic, exaggerated expression, harsh lighting, abrupt movement, inconsistent art style"
}

**Fantasy/Magical Scene:**
{
  "subject": "The character is a mystical anime witch with long purple hair adorned with star hairpins and a flowing midnight cloak who raises her ornate staff high, conjuring swirling magical energy that spirals upward, her eyes glowing with arcane power as luminous runes circle around her, culminating in an explosive burst of light that illuminates her determined expression in the setting of an ancient floating sanctuary.",
  "style": "Japanese Anime Style (2D), Studio Ghibli magical aesthetic, ethereal and mystical atmosphere, rich jewel-tone colors, magical particle effects, fantasy lighting, high quality animation with detailed effects.",
  "environment": "Twilight sky with multiple moons visible. Floating stone platforms surround the sanctuary. Magical ambient light particles drift in the air. Crystalline structures in background catch and refract the magical glow. Stars twinkle more brightly as magic intensifies.",
  "requirement": "1. Camera: Slow crane up following the magic spiral, ending with character centered against the sky.\\n2. Framing: Start medium shot, end wide shot to show full magical effect scope.\\n3. Effects: Magic particles must flow outward naturally; cloak and hair should billow from magical wind; runes must rotate smoothly around character.",
  "negative": "blurry, low quality, 3D render, realistic, weak magic effects, static particles, stiff cloak, bad anatomy, inconsistent glow"
}

**Emotional/Dramatic Scene:**
{
  "subject": "The character is a tearful anime girl with disheveled black hair and a rain-soaked school uniform who stands alone, her shoulders trembling as she clenches her fists tightly, then slowly raises her head to face the camera with tear-streaked cheeks, her quivering lips finally forming a bittersweet smile of acceptance in the setting of a rainy evening street.",
  "style": "Japanese Anime Style (2D), Makoto Shinkai emotional cinematography, melancholic yet beautiful atmosphere, blue-gray rain aesthetic with warm streetlight contrast, high fidelity emotional expression, cinematic quality.",
  "environment": "Heavy rain falls continuously, creating splashes on the puddle-covered street. A single warm streetlight provides the main illumination, creating a golden halo around the character. Blurred city lights twinkle in the wet background. Raindrops are visible catching the light.",
  "requirement": "1. Camera: Static shot, holding on the character to maximize emotional impact.\\n2. Framing: Medium close-up, ensuring tears, trembling lips, and rain effects are all clearly visible.\\n3. Expression: Tear progression from welling up to rolling down; smile must feel earned and genuine despite the sadness; rain should interact with face and hair realistically.",
  "negative": "blurry, low quality, 3D render, realistic, fake emotion, dry appearance in rain, static rain, exaggerated crying, bad anatomy"
}

**Dance/Rhythm Scene:**
{
  "subject": "The character is an energetic anime idol with twin pink pigtails and a sparkling stage costume who leaps into the air with arms spread wide, then lands gracefully and immediately spins into a dynamic dance sequence, her skirt flaring outward as she twists her body rhythmically, striking a confident pose with a dazzling wink toward the camera in the setting of a dazzling concert stage.",
  "style": "Japanese Anime Style (2D), Love Live/idol anime aesthetic, vibrant energetic atmosphere, saturated candy colors, dynamic camera work, sparkle and glow effects, high quality fluid animation.",
  "environment": "Concert stage with colorful LED screens displaying abstract patterns. Multiple spotlights create dramatic beams through slight stage fog. Glowsticks visible in the dark audience area. Confetti and sparkle particles float in the air.",
  "requirement": "1. Camera: Dynamic movement matching dance rhythm - slight bounce and sway to follow the energy.\\n2. Framing: Full body shot with headroom for jumps; keep character centered despite movement.\\n3. Physics: Hair and costume must flow dramatically with all movements; skirt physics realistic during spins; sweat/sparkle effects during high-energy moments.",
  "negative": "blurry, low quality, 3D render, realistic, stiff dance moves, static clothing, no energy, dull colors, missing sparkle effects"
}

## CRITICAL: Storyboard Logic & Duration Guidelines

You MUST design motion sequences that are PHYSICALLY POSSIBLE and VISUALLY NATURAL within the given duration.

### Core Storyboard Principles

**1. Natural Motion Flow (自然运动流)**
- Every action must be a logical continuation of the previous action
- Human body cannot teleport - respect movement transition time
- Consider momentum: fast movements need deceleration; still poses need initiation
- Plan the motion path: where does each body part need to be at each moment?

**2. Visual Continuity (视觉连贯性)**
- Camera movements should have clear motivation (following action, revealing info)
- Avoid jump cuts within a single shot; prefer smooth transitions
- If scene changes are needed, use natural transitions (turn, walk through door, etc.)
- Maintain consistent lighting direction throughout

**3. Time Allocation (时间分配)**
- Each distinct action needs 2-4 seconds minimum to read clearly
- Expression changes need 1-2 seconds to register emotionally
- Fast actions (punches, jumps) need 0.5-1 second but require setup/recovery time
- Environmental effects (wind, particles) need time to establish

### Duration-Specific Guidelines

#### 5 SECONDS - 极短
**Action Budget: 1 simple action only**

Text-to-Video (t2v):
- ONE single clear moment, no more
- Static camera or minimal movement
- Example: Character blinks + slight smile
- Example: Hair blows in wind + head tilt
- NO movement across space, NO complex actions

Image-to-Video (i2v):
- Start from the EXACT pose in the image
- Add MINIMAL natural motion (breathing, blink, hair sway)
- Example: Eyes shift slightly + lips curve
- Example: Subtle weight shift + strand of hair moves
- Keep motion extremely subtle; barely perceptible is fine

#### 10 SECONDS - 短片
**Action Budget: 1-2 connected actions**

Text-to-Video (t2v):
- Focus on ONE clear action with setup and follow-through
- Single camera movement allowed
- Example: Character turns head + expression changes
- Example: Raises hand + waves + lowers hand
- Keep spatially contained; no walking long distances

Image-to-Video (i2v):
- Extend the image pose with 1-2 natural motions
- Expression can shift through one emotional beat
- Example: Character in image looks up slowly + gentle smile spreads
- Example: Hand rises to touch face + eyes close peacefully
- Motion should feel like a natural continuation of the frozen moment

#### 15 SECONDS - 中等
**Action Budget: 2-3 connected actions**

Text-to-Video (t2v):
- Simple action sequence with beginning and end
- 1-2 camera movements allowed
- Example: Character walks into frame + sits down + picks up a cup
- Example: Looks at phone + expression changes + puts phone down + sighs
- Can show cause and effect; keep scene consistent

Image-to-Video (i2v):
- 2-3 actions building naturally from the image state
- Can include small pose adjustment (leaning, shifting weight)
- Example: Character turns body slightly + reaches for object + examines it
- Example: Expression journey: neutral → curious → pleased
- Maintain visual consistency while allowing meaningful motion

### Motion Breakdown Template

When writing the Subject field, mentally map out:

**Beat 1 (0-Xs):** [Initial state/pose] → [First motion begins]
**Beat 2 (X-Ys):** [First motion completes] → [Transition to second motion]
**Beat 3 (Y-Zs):** [Second motion] → [Resolution/hold]

Example for 10-second clip:
- Beat 1 (0-3s): Girl sitting still, slight movement begins
- Beat 2 (3-7s): She slowly turns her head toward the window  
- Beat 3 (7-10s): Her expression softens into a gentle smile, holds

Example for 5-second clip:
- Beat 1 (0-2s): Character in pose, wind starts to blow hair
- Beat 2 (2-5s): Eyes shift, slight smile forms, hold

### Common Mistakes to AVOID

❌ **Overcrowding**: "Character runs, jumps, spins, draws sword, slashes three times, lands" in 5 seconds
→ ✅ Pick the most impactful 1-2 actions for short clips

❌ **Teleporting**: "Character is at desk, then suddenly at window"
→ ✅ Show the transition: "rises from desk, walks to window"

❌ **Impossible physics**: "Hair flows left while running right"
→ ✅ Hair flows OPPOSITE to movement direction due to wind resistance

❌ **Expression whiplash**: "Goes from crying to laughing instantly"
→ ✅ Allow transition time: "tears slow, breath steadies, small smile emerges"

❌ **Static environment in motion scene**: "Runs through forest" but no leaf movement
→ ✅ Include environmental reaction: "leaves scatter in her wake, branches sway"

### I2V Special Considerations

When the input mode is Image-to-Video:
1. **Analyze the implied pose**: What position are limbs in? What's the balance point?
2. **Identify natural next movements**: What motion would feel organic from this pose?
3. **Preserve the moment**: The image captures a specific feeling; extend it, don't contradict it
4. **Anchor points**: Keep some elements still (background, certain body parts) while others move
5. **Entrance/Exit**: Character should NOT enter or exit frame unless image suggests movement

Output JSON only. No explanations.`;


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
    mode: 't2v',
    duration: '10s'
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
    var mode = state.settings.mode;
    var duration = state.settings.duration;

    // Duration specifications
    var durationSpecs = {
      '5s': {
        seconds: '5',
        actionBudget: '1 simple action',
        t2vGuidance: 'ONE single clear moment only. Static camera or minimal movement. One pose change or one expression shift.',
        i2vGuidance: 'Start from EXACT image pose. Add minimal natural motion (hair sway, blink, slight smile). Keep extremely subtle.'
      },
      '10s': {
        seconds: '10',
        actionBudget: '1-2 connected actions',
        t2vGuidance: 'Focus on one clear action with setup and follow-through. Single camera movement. Example: turns head + reacts.',
        i2vGuidance: 'Extend image pose with 1-2 natural motions. Expression can shift once. Example: looks up + smiles.'
      },
      '15s': {
        seconds: '15',
        actionBudget: '2-3 connected actions',
        t2vGuidance: 'Simple action sequence with beginning and end. 1-2 camera movements. Example: walks in + sits + picks up object.',
        i2vGuidance: '2-3 actions building from image. Can have small pose adjustment. Expression can evolve through 2 beats.'
      }
    };

    var spec = durationSpecs[duration];
    var modeKey = mode === 'i2v' ? 'i2v' : 't2v';
    var modeGuidance = mode === 'i2v' ? spec.i2vGuidance : spec.t2vGuidance;

    var userMessage = `Generate video prompt for the following:

## User's Concept
${userInput}

## Technical Parameters
- **Mode**: ${mode === 'i2v' ? 'Image-to-Video (i2v) - Motion must start from and respect the source image pose' : 'Text-to-Video (t2v) - Full creative freedom, describe character appearance completely'}
- **Duration**: ${spec.seconds} seconds
- **Action Budget**: ${spec.actionBudget}
- **Mode Guidance**: ${modeGuidance}

## Requirements
1. Design a PHYSICALLY POSSIBLE motion sequence within ${spec.seconds} seconds
2. Break down the user's idea into ${spec.actionBudget} that flow naturally
3. Each action needs 2-4 seconds minimum to read clearly
4. Include natural transitions between actions (no teleporting)
5. Environment and physics must react realistically to character motion

Output the structured JSON prompt.`;

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
        mode: mode,
        duration: duration,
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

  var sections = ['subject', 'style', 'environment', 'requirement', 'negative'];
  
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
        '<span class="history-style">' + escapeHtml(t('durations.' + item.duration)) + '</span>' +
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

  // 模式选择
  var modeSelect = document.getElementById('mode-select');
  if (modeSelect) {
    modeSelect.addEventListener('change', function() {
      state.settings.mode = this.value;
    });
  }

  // 时长选择
  var durationSelect = document.getElementById('duration-select');
  if (durationSelect) {
    durationSelect.addEventListener('change', function() {
      state.settings.duration = this.value;
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
  var modeSelect = document.getElementById('mode-select');
  var durationSelect = document.getElementById('duration-select');

  if (modeSelect) {
    modeSelect.innerHTML = Object.keys(i18n['zh-CN'].modes).map(function(key) {
      return '<option value="' + key + '"' + (key === state.settings.mode ? ' selected' : '') + '>' + t('modes.' + key) + '</option>';
    }).join('');
  }

  if (durationSelect) {
    durationSelect.innerHTML = Object.keys(i18n['zh-CN'].durations).map(function(key) {
      return '<option value="' + key + '"' + (key === state.settings.duration ? ' selected' : '') + '>' + t('durations.' + key) + '</option>';
    }).join('');
  }
}

async function initSettings() {
  // 预留设置加载
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
