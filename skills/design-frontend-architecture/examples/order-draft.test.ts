import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderDraft, DraftRuleError } from './order-draft.js';

const code = (value: string) => (error: unknown) =>
  error instanceof DraftRuleError && error.code === value;

test('同一实例快照稳定，新业务命令产生新实例且保留旧事实', () => {
  const empty = OrderDraft.empty();
  const snapshot = empty.getSnapshot();
  assert.equal(empty.getSnapshot(), snapshot);
  const draft = empty.addLine('wheel', 2).addLine('handle', 1);
  assert.equal(snapshot.totalQuantity, 0);
  assert.equal(snapshot.lines.length, 0);
  assert.equal(draft.getSnapshot().totalQuantity, 3);
});

test('数量变更集中执行规则，不改写原对象或未变化行的事实', () => {
  const before = OrderDraft.empty().addLine('wheel', 2);
  const after = before.changeQuantity('wheel', 4);
  assert.equal(before.getSnapshot().totalQuantity, 2);
  assert.equal(after.getSnapshot().totalQuantity, 4);
  assert.equal(after.changeQuantity('wheel', 4), after);
});

test('非法数量拒绝且不留下部分修改', () => {
  const draft = OrderDraft.empty().addLine('wheel', 2);
  const before = draft.getSnapshot();
  for (const quantity of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => draft.changeQuantity('wheel', quantity), code('INVALID_QUANTITY'));
    assert.equal(draft.getSnapshot(), before);
  }
});

test('空物料、重复物料和不存在的目标有明确业务错误', () => {
  const draft = OrderDraft.empty().addLine('wheel', 2);
  assert.throws(() => draft.addLine(' ', 1), code('EMPTY_SKU'));
  assert.throws(() => draft.addLine('wheel', 1), code('DUPLICATE_SKU'));
  assert.throws(() => draft.changeQuantity('missing', 1), code('MISSING_SKU'));
});

test('外部不能通过嵌套快照破坏业务状态', () => {
  const draft = OrderDraft.empty().addLine('wheel', 2);
  const snapshot = draft.getSnapshot();
  assert.equal(Reflect.set(snapshot.lines[0], 'quantity', -1), false);
  assert.equal(Reflect.set(snapshot.lines, '0', { skuId: 'wheel', quantity: -1 }), false);
  assert.equal(Reflect.set(snapshot, 'totalQuantity', -1), false);
  assert.equal(draft.getSnapshot().totalQuantity, 2);
});

test('总量溢出被拒绝，原草稿仍可安全使用', () => {
  const draft = OrderDraft.empty().addLine('wheel', Number.MAX_SAFE_INTEGER);
  assert.throws(() => draft.addLine('handle', 1), code('QUANTITY_OVERFLOW'));
  assert.equal(draft.getSnapshot().totalQuantity, Number.MAX_SAFE_INTEGER);
});
