# 代码质量清单

## 错误处理

### 需标记的反模式

- **吞异常**：空 catch 或仅 log 不处理
  ```javascript
  try { ... } catch (e) { }  // 静默失败
  try { ... } catch (e) { console.log(e) }  // 仅记录
  ```
- **过宽 catch**：捕获 `Exception`/`Error` 基类而非具体类型
- **错误信息泄露**：堆栈或内部细节暴露给用户
- **缺失错误处理**：I/O、网络、解析等易失败操作无 try-catch
- **异步错误**：未处理的 Promise rejection、缺少 `.catch()`、无错误边界

### 建议检查

- [ ] 在合适边界捕获错误
- [ ] 错误信息对用户友好（不暴露内部细节）
- [ ] 错误日志有足够上下文便于排查
- [ ] 异步错误正确传播或处理
- [ ] 可恢复错误有回退行为
- [ ] 关键错误触发告警/监控

### 自问

- 「该操作失败时会发生什么？」
- 「调用方能否感知到失败？」
- 「是否有足够上下文排查？」

---

## 性能与缓存

### CPU 密集

- 热路径中的昂贵操作：正则编译、JSON 解析、循环内加密
- 阻塞主线程：同步 I/O、无 worker/async 的重计算
- 重复计算：相同输入多次计算
- 缺少 memoization：纯函数重复调用

### 数据库与 I/O

- **N+1 查询**：循环内逐条查询
  ```javascript
  // 坏：N+1
  for (const id of ids) {
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, id)
  }
  // 好：批量
  const users = await db.query(`SELECT * FROM users WHERE id IN (?)`, ids)
  ```
- 未建索引的查询列
- 过度拉取（SELECT *）
- 无分页，整表加载到内存

### 缓存

- 昂贵操作无缓存（重复 API、DB、计算）
- 缓存无 TTL，数据长期过期
- 无失效策略，数据更新后缓存未清
- 缓存键冲突
- 用户相关数据全局缓存（安全/隐私问题）

### 内存

- 无界集合（数组/Map 无限增长）
- 大对象持有引用阻碍 GC
- 循环内字符串拼接（应用 join/StringBuilder）
- 大文件整块加载（应流式处理）

### 自问

- 「该操作的时间复杂度？」
- 「数据量 10x/100x 时表现如何？」
- 「结果是否可缓存？是否应该？」
- 「能否批量而非逐条？」

---

## 边界条件

### Null/Undefined

- 缺少 null 检查：访问可能为 null 的对象属性
- Truthy/falsy 混淆：`if (value)` 而 `0` 或 `""` 为合法值
- 过度可选链：`a?.b?.c?.d` 掩盖结构问题
- null 与 undefined 混用无约定

### 空集合

- 空数组未处理：假设数组有元素
- 空对象边界：`for...in` 或 `Object.keys` 在空对象上
- 首/末元素访问：`arr[0]` 或 `arr[arr.length-1]` 无长度检查

### 数值边界

- 除零：除法前未检查
- 整数溢出：超出安全整数范围
- 浮点比较：用 `===` 而非 epsilon
- 负值：索引或计数不应为负
- 差一错误：循环边界、切片、分页

### 字符串边界

- 空字符串未处理
- 仅空白字符串：通过 truthy 但实际为空
- 超长字符串：无长度限制导致内存/展示问题
- Unicode 边界：emoji、RTL、组合字符

### 常见危险模式

```javascript
// 危险：无 null 检查
const name = user.profile.name

// 危险：数组访问无检查
const first = items[0]

// 危险：除法无检查
const avg = total / count

// 危险：truthy 排除合法值
if (value) { ... }  // 0、""、false 会失败
```

### 自问

- 「若为 null/undefined 会怎样？」
- 「集合为空时怎么办？」
- 「该数值的有效范围？」
- 「边界（0、-1、MAX_INT）处会发生什么？」
