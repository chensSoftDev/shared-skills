// 整数件数的不可变业务对象。与React、DOM、HTTP和表单库无关。
export type DraftLine = Readonly<{ skuId: string; quantity: number }>;
export type DraftSnapshot = Readonly<{
  lines: readonly DraftLine[];
  totalQuantity: number;
}>;
export type DraftErrorCode =
  | 'EMPTY_SKU' | 'INVALID_QUANTITY' | 'DUPLICATE_SKU'
  | 'MISSING_SKU' | 'QUANTITY_OVERFLOW';

export class DraftRuleError extends Error {
  constructor(readonly code: DraftErrorCode, message: string) {
    super(message);
    this.name = 'DraftRuleError';
  }
}

export class OrderDraft {
  readonly #snapshot: DraftSnapshot;

  private constructor(lines: readonly DraftLine[]) {
    const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
    if (!Number.isSafeInteger(totalQuantity)) {
      throw new DraftRuleError('QUANTITY_OVERFLOW', '总件数超出安全范围');
    }
    const safeLines = Object.freeze(lines.map(line => Object.freeze({ ...line })));
    this.#snapshot = Object.freeze({ lines: safeLines, totalQuantity });
  }

  static empty(): OrderDraft { return new OrderDraft([]); }

  // 同一不可变实例始终返回同一快照；由任务对象持有当前实例并发布变化。
  getSnapshot = (): DraftSnapshot => this.#snapshot;

  addLine(skuId: string, quantity: number): OrderDraft {
    if (!skuId.trim()) throw new DraftRuleError('EMPTY_SKU', '物料不能为空');
    this.validateQuantity(quantity);
    if (this.#snapshot.lines.some(line => line.skuId === skuId)) {
      throw new DraftRuleError('DUPLICATE_SKU', '物料已存在');
    }
    return new OrderDraft([...this.#snapshot.lines, { skuId, quantity }]);
  }

  changeQuantity(skuId: string, quantity: number): OrderDraft {
    this.validateQuantity(quantity);
    const current = this.#snapshot.lines.find(line => line.skuId === skuId);
    if (!current) throw new DraftRuleError('MISSING_SKU', '物料不存在');
    if (current.quantity === quantity) return this;
    return new OrderDraft(this.#snapshot.lines.map(line =>
      line.skuId === skuId ? { ...line, quantity } : line));
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new DraftRuleError('INVALID_QUANTITY', '件数必须为正的安全整数');
    }
  }
}
