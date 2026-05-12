---
name: testing-miniapp-e2e
description: Miniapp E2E 测试编写与拆分：miniprogram-automator、按用例拆分、步骤化实现、共享 helper 提取。在创建、拆分或重构 tests/miniapp-e2e 时使用。
---

# Miniapp E2E 测试编写

## 角色

指导 `tests/miniapp-e2e` 下的小程序端到端测试设计、拆分和重构，确保用例独立、步骤清晰、helper 可复用，并能稳定定位失败原因。

## 约束

### 核心规则

1. 不把所有 E2E 用例放在一个文件里。
2. 一个用例文件只覆盖一个场景或一组紧密相关的用户流程。
3. 实现前必须先拆成有序步骤。
4. 一次实现并验证一个步骤。
5. 跨用例复用的流程必须提取到共享 helper。

### 推荐目录

```text
tests/miniapp-e2e/
  runner.mjs
  cases/
    login.case.mjs
    inventory.case.mjs
    stock.case.mjs
    category.case.mjs
  helpers/
    auth.mjs
    navigation.mjs
    mock-api.mjs
    assertions.mjs
    signals.mjs
```

### 用例规则

- 用例名应绑定页面和行为，避免泛化命名。
- 每个步骤只做一件事：准备状态、执行一次交互或断言一个结果。
- 失败输出保持步骤级别可读，例如 `[库存页：类别切换] 切换到第二类别 失败：...`。
- 每个用例必须可独立运行，不依赖其他用例的 storage、登录状态、导航栈或 mock 数据。
- 需要时在用例开始重置 mock 状态和测试信号。

### Helper 规则

- 逻辑被 2 个及以上用例复用时提取 helper。
- 优先提取登录、会话初始化、mock API 安装和重置、页面进入、tab 切换、页面断言、等待、storage 信号读写、仓库和类别切换。
- helper 应小而确定，优先无状态；必须带状态时在每个用例开始重置。

## 工作流

### 1. 拆分场景

- 阅读现有 `tests/miniapp-e2e` 结构和目标需求。
- 将用户流程拆为独立用例边界。
- 为每个用例列出有序步骤。

### 2. 规划复用

- 找出登录、导航、mock、断言、等待和信号读写等跨用例重复逻辑。
- 先规划 helper 接口，再移动或新增用例。

### 3. 实现用例

- 每次只实现一个用例中的一个步骤。
- 优先使用稳定页面方法和确定性 helper；当两者都能验证同一行为时，避免脆弱 UI 链。
- 把不稳定但无关的流程隔离到独立用例，避免阻塞整套测试。

### 4. 重构单体测试

1. 识别每个用例边界。
2. 先提取共享 helper。
3. 一次迁移一个用例到 `cases/`。
4. 保持 runner 精简，只负责组装和执行用例。
5. 拆分稳定后再删除重复 helper 逻辑。

### 5. 验证

- 单独运行新增或迁移的用例。
- 再运行 runner 验证组合执行。
- 检查失败输出是否能定位到具体步骤。

## 输入

- 用户指定的新 E2E 用例、重构目标或失败测试。
- 现有 `tests/miniapp-e2e` 文件结构。

## 输出

- 拆分后的 `cases/*.case.mjs`。
- 必要的 `helpers/*.mjs`。
- 精简的 `runner.mjs` 调整。
- 明确的步骤化测试结果或失败说明。

## 工具与权限

- 文件读取与搜索，用于理解现有测试结构。
- 测试命令，用于逐步验证单个 case 和完整 runner。

## 自检

- [ ] 每个 case 文件只覆盖一个场景或紧密相关流程。
- [ ] case 已拆为有序步骤，失败信息包含步骤上下文。
- [ ] 共享流程已提取 helper，未在多个 case 中复制。
- [ ] 每个 case 可独立运行，并重置必要 mock、storage 或信号状态。
- [ ] runner 只负责组装和执行用例。
