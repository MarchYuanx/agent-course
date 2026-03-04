# 安全与可靠性清单

## 输入/输出安全

- **XSS**：不安全的 HTML 注入、`dangerouslySetInnerHTML`、未转义模板、innerHTML 赋值
- **注入**：SQL/NoSQL/命令/GraphQL 注入（字符串拼接或模板字面量）
- **SSRF**：用户可控 URL 访问内部服务且无白名单校验
- **路径穿越**：用户输入参与文件路径且未校验（`../` 攻击）
- **原型污染**：JS 中不安全的对象合并（`Object.assign`、用户输入的 spread）

## 认证与授权

- 读写操作缺少租户或所有权校验
- 新接口无鉴权或 RBAC
- 信任客户端提供的角色/标志/ID
- 越权访问（IDOR）
- Session 固定或弱 Session 管理

## JWT 与 Token

- 算法混淆（接受 `none` 或 `HS256` 而期望 `RS256`）
- 弱或硬编码密钥
- 缺少过期（`exp`）或未校验
- JWT payload 中含敏感数据（Token 为 base64，非加密）
- 未校验 `iss`、`aud`

## 密钥与 PII

- API Key、Token、凭证出现在代码/配置/日志
- 密钥在 git 历史或暴露给客户端的环境变量
- 过度记录 PII 或敏感 payload
- 错误信息中未脱敏

## 依赖与供应链

- 依赖未锁定，可能引入恶意更新
- 依赖混淆（私有包名冲突）
- 从未信任源或 CDN 导入且无完整性校验
- 依赖含已知 CVE

## CORS 与响应头

- CORS 过于宽松（`*` 且带凭证）
- 缺少安全头（CSP、X-Frame-Options、X-Content-Type-Options）
- 暴露内部头或堆栈

## 运行时风险

- 无界循环、递归或大内存缓冲
- 外部调用缺少超时、重试或限流
- 请求路径上的阻塞操作（async 中的同步 I/O）
- 资源耗尽（文件句柄、连接、内存）
- ReDoS（正则拒绝服务）

## 竞态条件

- 多线程/协程/异步任务访问共享变量无同步
- Check-Then-Act（TOCTOU）：`if (exists) then use` 非原子
- 数据库并发：缺少乐观锁（version、updated_at）或悲观锁
- Read-modify-write 无事务隔离
- 分布式场景缺少分布式锁

## 数据完整性

- 缺少事务、部分写入或状态不一致
- 持久化前校验不足（类型强制问题）
- 可重试操作缺少幂等
- 并发修改导致更新丢失
