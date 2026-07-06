# 东方财富数据源参考

用于 A 股持仓跟踪中的行情、资金面、逐笔成交、分时和日 K 数据。若接口不可用，按 `SKILL.md` 的失败与降级规则处理。

## secid

- 沪市股票/ETF/指数常用 `1.代码`。
- 深市股票/ETF/指数常用 `0.代码`。
- 不确定时分别试取并在报告中标注实际成功的 `secid`。

## 最小接口

| 用途 | 路径 | 关键字段 | 口径 |
|------|------|----------|------|
| 实时行情 | `https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f47,f48,f50,f57,f58,f60,f168,f169,f170,f171,f292` | `f43` 现价，`f44` 高，`f45` 低，`f46` 开，`f47` 成交量，`f48` 成交额，`f50` 量比，`f168` 换手，`f170` 涨跌幅 | 个股实时盘口和日内状态 |
| 多标的行情 | `https://push2.eastmoney.com/api/qt/ulist.np/get?secids={secids}&fields=f12,f14,f2,f3,f15,f16,f17,f18,f5,f6,f8,f10,f124` | `f12` 代码，`f14` 名称，`f2` 现价，`f3` 涨跌幅，`f15/f16/f17/f18` 高低开昨收，`f6` 成交额，`f8` 换手，`f10` 量比，`f124` 时间戳 | 组合和指数批量查询 |
| 分钟资金流 | `https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?secid={secid}&klt=1&lmt=0&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56` | `f51` 时间，`f52` 主力，`f53` 小单，`f54` 中单，`f55` 大单，`f56` 超大单 | 返回累计净额，单位按接口原始值为元；分钟净额=本分钟累计值-上一分钟累计值 |
| 逐笔成交 | `https://push2.eastmoney.com/api/qt/stock/details/get?secid={secid}&fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55&pos=-200&iscca=1` | `f51` 时间，`f52` 价格，`f53` 成交量，`f54` 笔数，`f55` 方向码 | 常只覆盖最近窗口；成交额约为 `价格*成交量*100`；方向码需标注来源口径 |
| 分时走势 | `https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid={secid}&ndays=1&fields2=f51,f52,f53,f54,f55,f56,f57,f58` | 时间、开高低收、成交量、成交额、均价 | 与资金节点对照，判断拉升、回落或横盘承接 |
| 日 K | `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&klt=101&fqt=1&beg=0&end=20500101&lmt=60&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` | `f51` 日期，`f52` 开，`f53` 收，`f54` 高，`f55` 低，`f56` 成交量，`f57` 成交额，`f59` 涨跌幅，`f61` 换手 | 计算 MA5/MA10/MA20、近端高低点和趋势结构 |
| 公告 | `https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=5&page_index=1&ann_type=A&client_source=web&stock_list={code}` | 标题、公告时间、栏目 | 未返回不等于无公告，只能写“该接口未检出” |

## 资金面解析

1. 先取分钟资金流，按相邻分钟差值计算主力、大单、超大单的当分钟净流入。
2. 再取分时走势，对照资金节点所在分钟的价格变化和成交额。
3. 若需要秒级节点，再取逐笔成交；报告必须写明逐笔数据覆盖时间段。
4. 输出至少包含：关键流入时间段、关键流出时间段、累计主力/大单/超大单、资金标签和数据限制。

## 标签建议

- `主力回流`：主力、大单或超大单差值转正，价格同步走强。
- `资金分歧`：价格上涨但大单或主力差值转负。
- `拉高派发`：高位放量、价格冲高回落，同时大单/超大单差值转负。
- `承接换手`：大单净流出但价格不跌或回落后收回关键位。
- `散户接盘`：小单净流入、大单或超大单净流出，且价格在高位滞涨。
- `资金未核验`：接口失败、字段缺失、来源冲突或仅有用户观察。
