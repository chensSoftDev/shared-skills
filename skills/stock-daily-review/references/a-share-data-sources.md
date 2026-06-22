# A股复盘数据源参考

用于 A 股每日复盘中的涨停池、封板质量、北交所补核、个股行情、公告和新闻核验。接口可能变更，使用前必须以实际返回为准；接口失败、字段缺失或口径不清时，降级为网页/公告/人工核验并在报告中标注。

## 使用顺序

1. 先取收盘后结构化涨停池，确认交易日期和数据更新时间。
2. 检查名单源覆盖范围：沪市、深市、创业板、科创板、ST、北交所。
3. 若主名单源不含北交所，单独核验北交所当日是否存在 30% 涨停。
4. 对重点股补取个股实时/日 K/分时数据，核验封板质量、换手、成交额和技术位置。
5. 对关键涨停原因，用公告、交易所/巨潮资讯、互动平台、权威媒体或公司披露交叉验证。

## 与 stock-data-foundation 的关系

本文件继续维护涨停池和行情接口口径。个股背景字段不在本文件重复维护，统一以 `stock-data-foundation/references/*field-source-map.md` 为准。

## 东方财富候选接口

| 用途 | 路径 | 关键字段 | 口径 |
|------|------|----------|------|
| 涨停池 | `https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=10000&sort=fbt:asc&date={YYYYMMDD}` | `c` 代码，`n` 名称，`zdp` 涨跌幅，`amount` 成交额，`hs` 换手，`fbt` 首封时间，`lbt` 最后封板时间，`zbc` 炸板次数，`hybk` 行业 | 东方财富涨停池候选源；使用前核验返回日期、市场覆盖和字段含义 |
| 股票列表行情 | `https://push2.eastmoney.com/api/qt/clist/get?pn={page}&pz={size}&fs={market_filter}&fields=f12,f14,f2,f3,f5,f6,f8,f10,f15,f16,f17,f18,f20,f21,f62` | `f12` 代码，`f14` 名称，`f2` 现价，`f3` 涨跌幅，`f6` 成交额，`f8` 换手，`f20/f21` 总/流通市值 | 用于补核候选股收盘涨跌、市场段和市值；`market_filter` 需按实际可用口径记录 |
| 个股行情 | `https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f47,f48,f50,f57,f58,f60,f168,f169,f170,f171,f292` | 现价、高低开、成交额、量比、换手、涨跌幅 | 核验收盘状态和重点股日内位置 |
| 分时走势 | `https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid={secid}&ndays=1&fields2=f51,f52,f53,f54,f55,f56,f57,f58` | 时间、开高低收、成交量、成交额、均价 | 辅助判断早盘封板、盘中换手、尾盘偷袭 |
| 日 K | `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&klt=101&fqt=1&beg=0&end=20500101&lmt=60&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` | 日期、开收高低、成交量、成交额、涨跌幅、换手 | 计算 5/10/20 日走势、均线、前高前低和量能 |
| 公告 | `https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=10&page_index=1&ann_type=A&client_source=web&stock_list={code}` | 公告标题、时间、栏目、链接 | 未返回不等于无公告，只能写“该接口未检出” |

## secid

- 沪市股票/ETF 常用 `1.代码`。
- 深市股票/ETF 常用 `0.代码`。
- 北交所、指数或接口返回异常时，分别试取可用市场前缀，并在报告中标注实际成功口径。

## 北交所补核

- 若主涨停池源不明确包含北交所，不得直接写“沪深京全量”。
- 额外核验北交所官方行情/披露页面、东方财富北证 A 股行情列表或其他可访问结构化源。
- 北交所涨停按 30% 口径核验；若确认为 0 家，报告中写明“北交所当日 30% 涨停已核验为 0”。
- 若无法可靠核验，报告标题和口径降级为“沪深涨停池”或“待补全名单”。

## 来源标注

每条关键结论至少记录：

- 来源名称和链接。
- 采集时间。
- 数据口径：是否收盘后、是否全量、是否包含 ST/北交所/复牌股。
- 异常说明：接口失败、字段缺失、来源冲突、人工网页核验等。
