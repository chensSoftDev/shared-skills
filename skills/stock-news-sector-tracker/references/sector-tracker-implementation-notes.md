# 消息-板块-个股跟踪系统落地实施笔记

本文件记录 `stock-news-sector-tracker` 从 skill 文档到可运行系统的具体实现、部署和坑点，供后续维护/复用。

## 1. 触发场景

- 用户说"让 stock-news-sector-tracker 跑起来"、"把消息-板块-个股联动用起来"
- 用户要求初始化板块跟踪注册表、部署定时任务、修复扫描脚本
- 用户要求新增/修改板块到跟踪列表，并写入项目仓库
- 用户报告"盘中观察没推送"、"定时任务到点没消息"
- 用户反馈"为什么这么多板块都评 9 分"、"评分没区分度"

## 2. 项目文件位置

```
/opt/codebase/stock/
├── .agents/skills-config.json                        # 主配置入口（stockNewsSectorTracker 字段）
├── scripts/sector_tracker.py                         # 主扫描脚本（三种模式）
├── output/stock-news-sector-tracker/
│   ├── daily-scans/YYYY-MM-DD-full.md                # 盘后完整报告
│   ├── daily-scans/YYYY-MM-DD-pre.md               # 盘前简报
│   ├── opportunities/{sector}-YYYY-MM-DD.md        # 单个板块机会档案
│   └── registry/
│       ├── sector-registry.csv                       # 板块注册表
│       └── stock-sector-map.csv                      # 个股-板块映射表
└── .shared-skills/skills/stock-news-sector-tracker/  # 技能文档（子模块）
```

## 3. 主脚本 `scripts/sector_tracker.py`

三种扫描模式：

| 模式 | 参数 | 输出 | 是否推送 |
|------|------|------|----------|
| `post_market` | `--scan-type post_market --date YYYY-MM-DD` | 完整报告 + 机会档案 | 是 |
| `pre_market` | `--scan-type pre_market --date YYYY-MM-DD` | 盘前简报（次日观察清单） | 是 |
| `intraday` | `--scan-type intraday --date YYYY-MM-DD` | 盘中异动简报 | 仅高评分/风险信号时推送 |

命令行示例：
```bash
cd /opt/codebase/stock
python3 scripts/sector_tracker.py --scan-type post_market --date 2026-08-31
python3 scripts/sector_tracker.py --scan-type intraday --date 2026-08-31
```

测试不提交Git：
```bash
python3 scripts/sector_tracker.py --scan-type post_market --date 2026-08-31 --no-git
```

## 4. 关键修复记录

### 4.1 沪市ETF前缀识别

问题：`prefix_code()` 只把 `50` 开头判为沪市，导致 588170（科创芯片ETF）、512480（半导体ETF）、515880（通信ETF）被传到 `sz` 前缀，返回 N/A。

修复：沪市前缀扩展为 `50/51/58` 开头均为 `sh`。

```python
def prefix_code(c):
    if c.startswith(('sh', 'sz', 'bj')): return c
    if c.startswith(('50', '51', '58', '60', '68', '000')): return f'sh{c}'
    return f'sz{c}'
```

### 4.2 中军/后排角色排序

问题：原逻辑按涨幅排序，中军（市值大）和后排（涨幅小）可能为空或选错。

修复：
- 中军：同板块内按**流通市值**从大到小排序，取前 2
- 后排：按**涨幅**从小到大排序，取倒数 2

### 4.3 评分通胀修复（v2）

**问题（v1）**：`has_news=True` 是硬编码，导致所有板块默认有消息催化；状态判定门槛低，龙头平均涨幅 >1% 就给出 9 分，失去区分度。

**修复（v2）**：
1. 接入新浪财经滚动新闻 API，按板块 `keywords` 做标题关键词匹配。
2. 无真实消息命中时，状态不能为“埋伏/确认”，只能标为“观察”或“调整”。
3. 评分从 10 分制改为 100 分制，5 个维度真实计算：
   - 消息可信度（25 分）：标题命中数 + 可信度关键词
   - 板块响应（25 分）：状态 + ETF 同步 + 龙头涨幅适中
   - 龙头质量（20 分）：协同、涨停家数、主力净流入
   - 风险收益（20 分）：埋伏 > 确认 > 加速 > 错过
   - 持仓匹配（10 分）：空仓/持仓冲突
4. 增加输出分级阈值：≥70 为重点机会，50–69 为观察。

v2 评分公式见 `references/scoring-rules.md`。

### 4.4 资金流向日期校验

v2 中读取新浪 MoneyFlow 数据时，校验最新记录的 `opendate` 是否等于扫描日期。若不相等，资金净额不计入评分，避免用上一交易日数据冒充今日。

## 5. 定时任务部署清单

部署后确认 8 个 cron job：

| 名称 | 时间 | 模式 |
|------|------|------|
| `stock-sector-tracker-post-market` | 22:00 | `post_market` |
| `stock-sector-tracker-pre-market` | 08:20 | `pre_market` |
| `stock-sector-tracker-intraday-0932` | 09:32 | `intraday` |
| `stock-sector-tracker-intraday-1030` | 10:30 | `intraday` |
| `stock-sector-tracker-intraday-1130` | 11:30 | `intraday` |
| `stock-sector-tracker-intraday-1310` | 13:10 | `intraday` |
| `stock-sector-tracker-intraday-1400` | 14:00 | `intraday` |
| `stock-sector-tracker-intraday-1448` | 14:48 | `intraday` |

部署方式：
```bash
cronjob create action=create name=... schedule="..." prompt="cd /opt/codebase/stock && python3 scripts/sector_tracker.py --scan-type ... --date $(date +%Y-%m-%d) ..."
```

## 6. 数据与行情源

- 主实时行情：新浪 `hq.sinajs.cn`（价格最稳定）+ 腾讯 `qt.gtimg.cn`（补充市值/主力净流）
- 新闻源：新浪财经滚动新闻 `feed.mix.sina.com.cn/api/roll/get`
- 个股资金流向：新浪财经 `MoneyFlow.ssl_qsfx_lscjfb`
- 板块成分股/映射：维护 `registry/sector-registry.csv` 和 `stock-sector-map.csv`

## 7. 推送规则

默认规则（用户已接受）：
- 盘后/盘前完整报告 → 微信推送
- 盘中简报 → 只落盘，不主动推送
- 盘中出现以下情况才推送简要提醒：
  - 板块状态变为“确认”或“加速”，评分 ≥ 70
  - 持仓股触发风险信号（如跌破关键位、利好兑现）
  - 错过信号（龙头已涨停，提示观望）

## 8. 空仓处理

- 盘中 `intraday` 任务：若 `portfolio.csv` 中无 `status=holding` 持仓，直接结束，不拉行情、不写快照、不推送
- 盘后 `post_market`：无论是否持仓，都生成完整板块报告（因报告不依赖持仓）

## 9. Git 提交规范

每次新增/修改产出后：
```bash
cd /opt/codebase/stock
git pull --no-recurse-submodules
git add output/stock-news-sector-tracker/ scripts/sector_tracker.py .agents/skills-config.json
git commit -m "feat(sector-tracker): ..."
git push origin main
```

如果同时修改了 `.shared-skills/` 子模块：
```bash
cd .shared-skills
git add skills/stock-news-sector-tracker/
git commit -m "docs(sector-tracker): ..."
git pull --rebase origin main
git push origin main
cd ..
git add .shared-skills
git commit -m "chore: update .shared-skills submodule"
git push origin main
```

## 10. 常见坑点

| 问题 | 原因/解决 |
|------|----------|
| ETF 涨幅 N/A | 代码前缀传错。沪市ETF应是 `sh`（50/51/58开头）。 |
| 中军/后排为空 | 排序逻辑错误。中军按市值，后排按涨幅倒数。 |
| 定时任务触发但没输出 | 脚本可能卡在行情代码前缀或异常。查 `~/.hermes/logs/agent.log` 和 `cronjob list`。 |
| 盘中推送太频繁 | 默认只推送 ≥70 分机会/风险/错过信号，可在 `.agents/skills-config.json` 调阈值。 |
| 评分都是 9 分 | v1 硬编码 `has_news=True`；升级到 v2，按新闻标题匹配 + 100 分制评分。 |
| 盘前给出大量“埋伏” | 盘前无真实资金确认，应标为“观察”或“调整”；v2 已修复。 |
| 资金流向数据未更新 | 新浪 MoneyFlow 最新 `opendate` 不是当天，校验后不计入评分。 |
| 板块映射表不全 | 修改 `registry/sector-registry.csv` 和 `stock-sector-map.csv` 后重新部署。 |
