/**
 * 集中配置 — 所有脚本共享的默认值。
 *
 * 用户可通过 CLI 参数或传入 options 覆盖任何字段，
 * 无需修改本文件。
 */

const DEFAULTS = {
  width: 1080,
  height: 1920,
  fps: 30,
  voice: 'Tingting',
  rate: 185,
  /** 目标总时长（秒），用于自动分配各场景时长 */
  targetTotalDuration: 105,
  /** 允许的总时长范围（秒），用于校验 */
  durationRange: [90, 120],
};

/** 调色板池，场景会依序循环取用 */
const PALETTES = [
  { bg: '0x0B3954', accent: '0xF6AE2D' },
  { bg: '0x2E4057', accent: '0xF26419' },
  { bg: '0x224F34', accent: '0xFFCB47' },
  { bg: '0x402E32', accent: '0x5BC0EB' },
  { bg: '0x17324D', accent: '0xEFA00B' },
  { bg: '0x3C1642', accent: '0x7FD1B9' },
  { bg: '0x1F363D', accent: '0xF7B801' },
];

/** macOS 中文字体候选路径，按优先级排列 */
const FONT_CANDIDATES = [
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  '/System/Library/Fonts/Hiragino Sans GB.ttc',
  '/Library/Fonts/Arial Unicode.ttf',
];

module.exports = { DEFAULTS, PALETTES, FONT_CANDIDATES };
