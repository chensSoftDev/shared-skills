/**
 * 场景模板系统 — 结构参考 + 回退模板
 *
 * 正常流程中，AI agent 会根据主题自行编写 script.json 并通过
 * --script 参数传入，本文件的对白变体不会被使用。
 *
 * 本文件的作用：
 * 1. 定义 7 个场景角色 (role) 的叙事结构，供 AI 参考
 * 2. 提供回退对白变体 — 当用户直接 CLI 运行、不经 AI 时使用
 *
 * 模板中用 {{topic}} 标记主题占位符。
 *
 * --- 自定义 ---
 * 可通过 --templates <file.json> 传入自定义模板文件覆盖回退行为。
 */

const fs = require('node:fs');

/**
 * 默认的 7 个场景角色，每个角色含 2-3 套对白变体。
 * durationWeight — 该场景在总时长中的占比权重（所有权重之和会归一化）。
 */
const DEFAULT_SCENE_ROLES = [
  {
    role: 'hook',
    title: '开场钩子',
    durationWeight: 0.12,
    variants: [
      {
        description: '{{topic}}：用反常识问题把观众拉进来',
        action: '主角盯着一张写满问号的便签，表情夸张地后退一步。',
        dialogue: '今天聊{{topic}}。先别急着找答案，真正卡住你的，往往不是努力不够，而是你把问题看反了。',
      },
      {
        description: '{{topic}}：用数据反差引起好奇',
        action: '屏幕中央弹出一个巨大的数字，然后碎裂消失。',
        dialogue: '关于{{topic}}，大多数人连第一步就搞错了。接下来两分钟，帮你把思路理清楚。',
      },
      {
        description: '{{topic}}：用一句话制造悬念',
        action: '画面从黑屏渐亮，聚光灯打在一句标题上。',
        dialogue: '{{topic}}这件事，表面上是能力问题，背后其实是认知差距。听完你就明白了。',
      },
    ],
  },
  {
    role: 'myth',
    title: '常见误区',
    durationWeight: 0.15,
    variants: [
      {
        description: '{{topic}}：拆掉最容易误导人的表层解释',
        action: '配角拿出三个写着借口的牌子，逐个摇头否定。',
        dialogue: '很多人解释{{topic}}，喜欢怪环境、怪运气、怪别人资源多。可这些只解释了一部分，不能指导下一步行动。',
      },
      {
        description: '{{topic}}：指出大众直觉中的盲点',
        action: '画面上三条看似正确的箭头逐条变红打叉。',
        dialogue: '说到{{topic}}，最常见的误区有三个：觉得靠坚持就够、觉得方向不重要、觉得别人只是运气好。今天逐个拆解。',
      },
    ],
  },
  {
    role: 'root_cause',
    title: '底层原因',
    durationWeight: 0.13,
    variants: [
      {
        description: '{{topic}}：把注意力拉回可控变量',
        action: '画面切到放大镜扫过计划表，圈出关键变量。',
        dialogue: '更有用的看法是，先找自己能控制的变量：目标是否清楚，反馈是否及时，投入有没有持续复盘。',
      },
      {
        description: '{{topic}}：揭示问题的结构性根源',
        action: '一棵大树从枝叶逐渐聚焦到根部，根部标注关键词。',
        dialogue: '{{topic}}的核心原因往往藏得更深：信息差、决策质量、资源匹配度，这三个才是底层变量。',
      },
    ],
  },
  {
    role: 'example',
    title: '具体例子',
    durationWeight: 0.15,
    variants: [
      {
        description: '{{topic}}：用日常场景解释抽象逻辑',
        action: '主角把一堆杂乱卡片排成三列，突然露出恍然大悟的表情。',
        dialogue: '举个例子，如果每天都很忙，却不知道哪件事带来结果，那忙碌只是噪音，不会自动变成进步。',
      },
      {
        description: '{{topic}}：用对比案例突出差异',
        action: '画面分成左右两半，左边混乱右边有序，戏剧性对比。',
        dialogue: '同样面对{{topic}}，有人花了三年原地踏步，有人半年就看到变化。区别不在天赋，而在做事顺序。',
      },
    ],
  },
  {
    role: 'action',
    title: '行动方法',
    durationWeight: 0.15,
    variants: [
      {
        description: '{{topic}}：给出可以马上执行的小步骤',
        action: '屏幕上出现三步清单，主角逐项打勾。',
        dialogue: '可以从三步开始：写下目标，记录每天的关键动作，每周删掉一个低回报习惯。先让系统变清楚。',
      },
      {
        description: '{{topic}}：提供最小可行的行动框架',
        action: '主角在白板上画出一个简单的流程图，边画边讲解。',
        dialogue: '不需要大改，就三件事：明确一个指标、每天检查一次、每周调整一次。小循环跑起来，结果自然不同。',
      },
    ],
  },
  {
    role: 'caveat',
    title: '反转提醒',
    durationWeight: 0.15,
    variants: [
      {
        description: '{{topic}}：提醒观众避开新的误区',
        action: '配角按下暂停按钮，阻止主角冲出去乱试。',
        dialogue: '但别把方法当魔法。真正改变结果的不是收藏技巧，而是持续执行、看数据、再调整。这个循环不能省。',
      },
      {
        description: '{{topic}}：给出现实预期管理',
        action: '日历翻页，从第一天到第三十天，进度条缓慢但稳定前进。',
        dialogue: '关于{{topic}}，别指望一招见效。大部分改变需要两到四周才能感知，坚持记录比盲目努力更重要。',
      },
    ],
  },
  {
    role: 'wrap_up',
    title: '收束总结',
    durationWeight: 0.15,
    variants: [
      {
        description: '{{topic}}：用一句话完成记忆点',
        action: '主角把问号便签翻面，背面写着清晰的下一步。',
        dialogue: '所以，理解{{topic}}的关键，是少一点情绪解释，多一点可验证行动。能被复盘的事，才有机会被改变。',
      },
      {
        description: '{{topic}}：快速回顾全篇并留下行动号召',
        action: '画面快速闪回前面几幕的关键词，最终定格在一句话上。',
        dialogue: '总结一下，{{topic}}不是一个运气问题，而是一个系统问题。从今天开始，挑一个小动作先做起来。',
      },
    ],
  },
];

/**
 * 从变体数组中随机选一个。
 * 可通过 seed 参数控制确定性（用于测试）。
 */
function pickVariant(variants, seed) {
  if (!variants || variants.length === 0) {
    throw new Error('variants array must not be empty');
  }
  if (typeof seed === 'number') {
    return variants[Math.abs(seed) % variants.length];
  }
  return variants[Math.floor(Math.random() * variants.length)];
}

/** 将模板中的 {{topic}} 替换为真实主题 */
function applyTopic(template, topic) {
  const result = {};
  for (const [key, value] of Object.entries(template)) {
    result[key] = typeof value === 'string' ? value.replace(/\{\{topic\}\}/g, topic) : value;
  }
  return result;
}

/**
 * 根据 durationWeight 把总时长分配给各场景。
 * 返回每个场景的计划时长数组。
 */
function allocateDurations(roles, totalDuration) {
  const totalWeight = roles.reduce((sum, r) => sum + (r.durationWeight || 1), 0);
  return roles.map((r) => {
    const weight = r.durationWeight || 1;
    return Math.round((weight / totalWeight) * totalDuration * 10) / 10;
  });
}

/**
 * 加载模板。
 * - 无参数或 null → 使用 DEFAULT_SCENE_ROLES
 * - 字符串 → 从 JSON 文件加载
 * - 数组 → 直接使用
 */
function loadTemplates(source) {
  if (!source) return DEFAULT_SCENE_ROLES;
  if (Array.isArray(source)) return source;
  if (typeof source === 'string') {
    const raw = fs.readFileSync(source, 'utf8');
    return JSON.parse(raw);
  }
  throw new Error('templates must be null, a file path string, or an array');
}

module.exports = {
  DEFAULT_SCENE_ROLES,
  pickVariant,
  applyTopic,
  allocateDurations,
  loadTemplates,
};
