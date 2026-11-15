# 本地后端

NestJS 12 + Prisma 7 + PostgreSQL，使用 Node.js 22.12 或更高的受支持 LTS 版本。前端使用 `npm run dev` 关闭 Mock，开发代理将 `/api/` 转发到本服务的 `3000` 端口。

首次运行：

```bash
cd backend
npm install
cp .env.example .env
# 在 .env 中填写数据库密码，并设置 ADMIN_PASSWORD、DEMO_PASSWORD、PLATFORM_ADMIN_PASSWORD
npm run db:init
npm start
```

初始化命令先应用 Prisma 迁移，再初始化测试租户、账号和成员关系；重复执行不会重置已有密码、角色或停用状态。`.env` 和生成的 Prisma Client 不提交到 Git，构建时自动生成客户端。

已有数据库升级：本项目原先通过 SQL 创建的 `app_users` 和 `app_sessions` 表无需重建。确认表结构与 `prisma/migrations/0_init/migration.sql` 一致后，首次执行 `npm run db:baseline` 登记已存在的表，再执行 `npm run db:init`。本地现有数据库已完成基线登记，不需要再次执行。请勿对已有数据执行 `prisma migrate reset`。

日常数据库开发：

```bash
# 修改 prisma/schema.prisma 后，生成并应用开发迁移
npm run db:migrate -- --name describe_change
# 重新生成客户端并编译
npm run build
# 发布时只应用仓库中已提交的迁移
npm run db:deploy
# 初始化本地测试数据（不修改已有账号和成员关系）
npm run db:seed
# 本地数据库管理界面
npm run db:studio
```

业务查询使用 Prisma，不再手写 SQL。模型通过 `@map` / `@@map` 对应原有表和字段；数据库中的 BIGINT ID 在接口输出时转为字符串。迁移 SQL 是版本化的数据库结构记录。

模块结构：

```text
src/
├── auth/       # 登录、会话、全局 Guard、当前会话装饰器和集成测试
├── database/   # 共享 PrismaService、客户端工厂和测试数据初始化
├── tenants/    # 当前租户、成员管理和订阅查询
├── platform/   # 平台租户管理、套餐管理与人工分配
├── plans/      # 套餐成员额度校验
├── common/     # 请求参数校验和响应序列化
├── generated/  # 自动生成的 Prisma Client
├── app.module.ts
├── init-db.ts
└── main.ts
```

多租户模型采用共享表：账号全局唯一，`TenantMembership` 通过 `(tenantId, userId)` 关联用户和租户，角色保存在成员关系中。会话通过复合外键绑定成员关系，不能为非成员创建租户会话。升级时将已有账号及其角色、会话迁入默认租户 `tenant-a`，然后移除账号上的全局 `access` 字段。

本地测试数据如下。`admin` 使用 `ADMIN_PASSWORD`，其他账号使用 `DEMO_PASSWORD`（未配置时使用 `ADMIN_PASSWORD`）；示例环境文件均为 `ant.design`。这些是显式初始化的开发测试账号，不应将测试密码用于生产。

| 租户编码 | 用户名 | 租户内角色 |
|---|---|---|
| `tenant-a` | `admin` | 管理员 |
| `tenant-b` | `admin` | 普通成员 |
| `tenant-a` | `tenant-a-user` | 普通成员，仅能登录 A |
| `tenant-b` | `tenant-b-user` | 管理员，仅能登录 B |

平台管理使用独立的 `platform-admin` 账号，登录时租户编码填写保留值 `platform`。密码由 `PLATFORM_ADMIN_PASSWORD` 指定，未配置时使用 `ADMIN_PASSWORD`，示例为 `ant.design`。平台会话不绑定业务租户，停用客户企业不会锁死平台管理员。现有 `admin` 仍只有租户权限，没有被提升为平台管理员。

平台权限仅在显式登录 `platform` 后生效；平台账号不能通过成员管理加入客户企业。角色和平台权限都会在每次请求时从数据库重新校验。`isPlatformAdmin` 只能由受控的初始化或数据库运维流程设置，所有管理 API 都不接受该字段进行授权。

管理页面：

- `/platform/tenants`：平台管理员创建企业、指定首位管理员、修改名称、启用/停用企业、手动分配套餐及到期时间。
- `/platform/plans`：平台管理员维护套餐编码、名称、启用成员数上限和是否允许分配。
- `/tenant/members`：租户管理员管理本企业成员，查看套餐、当前用量和到期时间。

新增账号和添加已有账号是两种明确的操作。添加已有账号不修改其姓名、密码或其他企业的成员关系；成员管理只调整本租户角色与状态。停用成员会撤销本租户会话，移除成员通过外键级联撤销会话，均不删除全局账号。后端禁止移除、停用或降级最后一名启用的管理员。

套餐与人工分配：

- 每个租户保存一条当前订阅，记录套餐、生效时间、到期时间及订阅启用状态；人工分配时立即生效。
- 额度统计启用成员，包含管理员；新建企业的首位管理员是建立企业所需的初始成员，之后需分配套餐才能添加成员。
- 新增或重新启用成员必须有有效订阅且未超额。未分配、停用或到期后仍可登录、查看成员、调整角色和清理成员，不能新增或启用成员。
- 调低套餐额度或分配更小套餐时，不能低于租户当前启用成员数。
- 套餐“允许分配”关闭后禁止新的分配，已有订阅继续生效；停止现有订阅使用分配弹窗中的“订阅启用”。
- 额度和最后管理员保护使用可重试的串行化事务，兼容 Prisma 与 PostgreSQL 驱动返回的冲突形式，防止并发超额或移除全部管理员。
- 不包含支付、自动续费、订单或计费逻辑。

新增管理接口：平台接口以 `/api/platform` 开头，租户成员接口从会话中取得租户 ID，忽略请求体或查询参数中伪造的租户 ID。

```text
GET/POST    /api/platform/tenants
PATCH       /api/platform/tenants/:id
GET/POST    /api/platform/plans
PATCH       /api/platform/plans/:id
POST        /api/platform/tenants/:id/subscription
GET/POST    /api/tenant/members
PATCH/DELETE /api/tenant/members/:userId
GET         /api/tenant/subscription
```

接口：

- `GET /api/hello`：无需登录的连通性检查。
- `POST /api/login/account`：JSON 请求体 `{ "tenantCode": "tenant-a", "username": "admin", "password": "...", "autoLogin": true, "type": "account" }`。租户必须存在且启用，账号必须是有效成员。
- `GET /api/currentUser`：返回 `{ success: true, data: { userid, name, access, isPlatformAdmin, tenant } }`。租户会话的 `access` 来源于成员角色，`tenant` 为 `{ id, code, name }`；平台会话的 `tenant` 为 `null`，`isPlatformAdmin` 为 `true`。
- `GET /api/tenant/current`：返回当前会话的租户信息及角色，无公开租户列表。
- `POST /api/login/outLogin`：撤销当前会话并清除 Cookie。

登录成功返回 `{ success: true, data: null }`，同时设置 HttpOnly、SameSite=Strict 的 Cookie。密码使用 scrypt 加盐哈希，会话仅保存令牌哈希。自动登录有效期 7 天；未勾选时使用浏览器会话 Cookie，服务端最多有效 12 小时。会话保存在 PostgreSQL，刷新页面或重启后端后仍可使用。

全局 `SessionGuard` 默认保护新接口，并要求租户身份；仅登录、退出和 `/api/hello` 使用 `@Public()` 放行。`@RequireScope('platform')` 要求平台会话，`tenant-admin` 要求当前租户管理员，`authenticated` 允许任意有效会话。每次请求从数据库生成 `SessionContext`，通过 `@CurrentSession()` 注入控制器。成员被删除或通过管理接口停用时，其本租户会话会失效。仅直接操作数据库设置停用标记时，重新启用后尚未过期、未删除的会话可继续使用。

前端每个标签页在 `sessionStorage` 保存当前租户 ID，并附加 `X-Tenant-ID` 请求头。后端将其与会话绑定的租户比较，不一致返回 403；该请求头不能用于切换租户。这样另一个标签页重新登录其他租户时，旧页面的请求会被拒绝，而不会意外在另一个租户下执行。切换租户目前通过退出后重新登录完成。

后续业务模块从 `SessionContext.tenant.id` 获取租户，不接受请求体或查询参数直接决定数据归属。业务表需要非空 `tenantId`、租户范围查询和相应的复合约束。当前框架提供租户身份和授权边界，**不会自动为任意 Prisma 查询追加租户条件**；尚未引入业务数据表或 PostgreSQL RLS。

生产构建的前端使用同源 `/api/`，需由部署网关转发到后端；后端在 `NODE_ENV=production` 时使用 Secure Cookie，需要 HTTPS。

运行真实数据库集成测试：

```bash
npm test
```

测试使用随机独立 schema，覆盖旧数据迁移、跨租户访问、租户角色、租户/成员停用、会话撤销和登录生命周期，结束后删除测试 schema，不修改 `public` 中的用户或会话。
