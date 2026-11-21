# 本地后端

## 租户字典

租户管理页 `/tenant/dictionaries` 支持字典类型和字典项的新增、编辑、排序及启停。平台通过 `dictionaries` 功能模块控制开通；迁移仅自动为现有示例租户 `tenant-a`、`tenant-b` 开通，其他租户需在“分配功能”中启用。新建示例租户的 seed 会沿用现有全模块开通规则，重复 seed 不会恢复撤销的授权。

- 字典类型编码在本租户内唯一，字典项的值在类型内唯一；二者创建后不可修改。首期不提供删除，避免历史记录失去标签。
- `dictionaries:read/create/update` 分别控制管理页查看、新增类型及选项、修改类型及选项。新增和修改依赖查看权限，租户管理员拥有已开通模块的全部权限；普通成员无需管理权限即可按编码读取本租户字典。
- `GET /api/tenant/dictionaries` 分页查询类型，支持 `keyword` 搜索编码和名称；`GET /api/tenant/dictionaries/:code` 返回类型及按排序排列的全部选项，包含停用数据用于历史展示。创建和修改分别使用 `POST/PATCH`，字典项路径为 `/:code/items` 和 `/:code/items/:id`。
- 前端复用 `src/components/Dictionary` 的 `DictionarySelect`（单选或 `mode="multiple"`）、`DictionaryText` 和 `useDictionary(scope, code)`，必须明确指定 `scope="tenant"` 或 `scope="platform"`。缓存按作用域、租户、用户、编码区分，修改后失效，重新挂载或窗口聚焦时重新读取；请求失败提供重试。停用项仅在已有选择中显示且不可重新选取，停用类型不再提供新选项。
- 业务表保存稳定的字典值，不能保存显示标签。业务模块导入 `DictionariesModule` 后，在保存事务中调用 `DictionariesService.validateValues(tx, session, { scope: 'tenant', code }, values, previousValues)`：只允许存在且启用的新值，允许保留数据库中原有的停用值，拒绝重复或未知值。`previousValues` 必须从已有业务记录读取，不能来自客户端；租户业务记录必须先验证租户归属，事务使用现有 `transaction()` 的串行化与重试机制。
- 类型和选项的运行时新增、修改会在同一事务中写入审计；`GET /api/tenant/dictionaries/:code/history` 仅允许有字典查看权限的成员读取本租户记录。管理页支持选项搜索和变更记录查看。升级前的数据不补造历史审计。

验证：后端 `npm test` 包含独立 PostgreSQL schema 下的字典隔离、复合外键、权限、重复数据、不可变编码和值、停用历史及事务校验测试。前端组件测试为 `src/components/Dictionary/index.test.tsx`。

## 平台字典与业务接入

平台管理员通过 `/platform/dictionaries` 统一维护共享字典。管理接口 `/api/platform/dictionaries` 使用独立的平台会话校验，与现有平台管理权限一致，租户管理员及自定义角色均不能维护。平台类型及字典项独立存表，不自动转换、覆盖或合并任何同编码租户字典。

- `GET /api/dictionaries/platform/:code` 允许任意有效会话只读访问，包括未开通租户字典功能的企业成员；不允许匿名读取。返回全部选项，停用项只用于历史展示。此接口不能读取变更审计。
- 平台的 `POST/PATCH` 路径与租户字典结构一致；更新类型和选项时必须携带读取到的各自 `revision`，过期版本返回 409，失败不会产生审计。编辑失败时应关闭表单并刷新后重新编辑。平台菜单维护页在停用前提示所有企业的影响并要求确认。
- `GET /api/platform/dictionaries/:code/history` 仅平台管理员可查看，分页返回修改人、时间、对象、操作及变更前后快照。平台标签修改会反映到所有引用页面，历史名称需要由业务模块另存快照时再扩展。
- 新迁移初始化平台 `industry` 字典及六个行业选项，供平台租户管理的“所属行业”使用；已有租户的行业为空，不根据企业名称或租户字典推断。行业保存与字典校验在同一串行化事务内完成，保留已有停用值时从当前租户记录读取旧值，清空后不可重新选入停用值。旧客户端省略 `industry` 时保留原值，传空字符串显式清空。

业务引用在业务模块中明确声明：后端参考 `platform/tenant.constants.ts`，前端参考 `management/tenants/service.ts`，均固定 `{ scope: 'platform', code: 'industry' }`。请求体只提交值，不让客户端选择字典来源。组件使用方式：

```tsx
<DictionarySelect scope="platform" dictionaryCode="industry" value={industry} onChange={setIndustry} />
<DictionaryText scope="platform" dictionaryCode="industry" value={industry} />
```

后端接入方式（以租户管理为例；空字符串在业务层表示未填写）：

```ts
await transaction(prisma, async (tx) => {
  const before = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (industry) {
    await dictionaries.validateValues(tx, session, tenantIndustryDictionary,
      [industry], before.industry ? [before.industry] : []);
  }
  await tx.tenant.update({ where: { id: tenantId }, data: { industry } });
});
```

新增引用字段时必须同步接入前端组件、稳定值存储、后端校验和历史展示。字典管理中的单选、多选预览仅用于检查效果，不保存业务数据。当前不提供树形、继承、批量导入或多语言标签。

## 启动与现有功能

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

动态菜单与租户功能：

- 菜单目录保存在 `app_menus`，功能目录保存在 `app_features`，租户授权保存在 `app_tenant_features`。租户自定义角色保存在 `app_tenant_roles`，成员可通过 `app_member_roles` 关联多个本租户角色；数据库复合外键阻止跨租户分配。
- 平台的 `/platform/navigation` 使用树形表格，支持新增目录、选择已注册页面、调整父目录、名称、国际化键、图标、排序和显示状态，以及删除无子菜单的入口。首页及内置平台菜单不能停用、删除或调整层级。空目录不显示在导航中。个人页面保留代码路由与访问权限，只通过头像下拉进入，不可添加到侧边栏。
- 页面注册表在 `src/auth/page-registry.ts`，固定每个页面的路径、所属端、功能模块和最低角色。新增业务页面需发布代码并登记注册表，菜单管理只能选择已登记页面，不能填写任意组件或路径。`npm run test:routes` 在项目根目录验证注册表与实际页面路由一致，同时覆盖 Umi 包装器下的嵌套路由匹配。
- 同一页面只保留一个菜单入口；需要换位置可直接编辑父目录，删除入口后也可重新添加。目录仅组织导航，可包含多个模块的页面，展示取决于当前用户有权访问的子菜单。父目录必须属于同一端，不能将菜单移入自身、后代目录或页面节点；并发移动通过串行化事务防止生成循环。
- 平台在租户管理的“分配功能”中勾选模块。新建租户默认只有公共首页和个人页面；升级迁移会为已有租户保留原有模块。示例租户首次创建时开通全部示例模块，重复 seed 不会恢复已撤销的授权。
- `GET /api/current/navigation` 按当前会话计算菜单、允许访问的页面路径和成员管理操作权限。平台会话只返回公共菜单与平台菜单，租户会话只返回公共菜单与已开通、角色允许的租户菜单。隐藏目录时，其子菜单也不返回。页面权限直接根据注册表、模块开通与角色计算，隐藏、移动或删除菜单不会改变页面和接口权限；撤销模块请在租户的“分配功能”中操作。
- 前端从接口渲染菜单，访问页面与窗口重新获得焦点时重新校验。菜单加载失败不会回退到静态菜单；手输未授权页面地址显示 403。目录只组织和展开子菜单，不绑定页面路径，空目录自动隐藏；原有代码路由的目录跳转继续保留。
- 成员管理的增删改查接口同时校验 `members` 功能与 `members:read/create/update/delete` 操作权限，前端按相同权限显示按钮。平台撤销功能或租户修改角色后，后续请求重新计算权限；订阅查询、当前身份查询和退出登录仍可使用。新增业务接口需声明 `@RequireFeature('功能编码')` 与 `@RequirePermission('权限编码')`，导航菜单本身不代替接口授权。
- 租户管理员通过 `/tenant/roles` 创建、修改、删除自定义角色，在成员管理中分配多个角色，权限取并集。只可分配已开通模块中的注册权限；成员操作同时要求查看权限。已有 `admin/user` 身份保持兼容：管理员拥有已开通模块的全部权限；普通成员未分配自定义角色时保留原基础页面，分配后按角色授权。空权限角色可用于仅保留首页和个人页面。已分配的角色不能直接删除，管理员身份及角色分配仅允许租户管理员修改。
- 当前功能开通与套餐成员额度独立管理，不自动跟随套餐变化。菜单通过 `i18nKey` 查找当前语言包，缺少翻译时回退到数据库名称；平台自定义目录可填写语言包已有键，留空则显示自定义名称。切换语言时菜单与头像下拉同步翻译。
- 平台 `/platform/users` 支持账号/姓名搜索、新建普通全局账号、修改姓名、全局启停、查看租户成员关系和重置密码。全局停用或密码重置会撤销全部会话；重新启用不会恢复旧会话。全局停用会影响所有租户，租户成员停用仅影响当前租户。系统保护最后一名有效平台管理员和租户管理员；管理接口不允许提升平台管理员身份。
- 平台配置接口：`GET /api/platform/features`、`GET /api/platform/pages`、`GET/POST /api/platform/menus`、`PATCH/DELETE /api/platform/menus/:code`、`GET/PATCH /api/platform/tenants/:id/features`。空功能数组表示撤销全部业务模块；未知、重复或格式错误的功能编码被拒绝。

已有数据库升级：本项目原先通过 SQL 创建的 `app_users` 和 `app_sessions` 表无需重建。确认表结构与 `prisma/migrations/0_init/migration.sql` 一致后，首次执行 `npm run db:baseline` 登记已存在的表，再执行 `npm run db:init`。本地现有数据库已完成基线登记，不需要再次执行。请勿对已有数据执行 `prisma migrate reset`。

站点配置：

- 平台管理员通过 `/platform/settings` 维护系统名称、Logo、登录背景、页脚版权主体、默认主题色和默认语言。本期为平台全局配置；图片地址留空可隐藏，支持 HTTP(S) 或站内绝对路径，页脚文字留空隐藏版权行。
- 配置通过 `app_site_settings` 的固定单行存储，每次修改在同一串行化事务中写入 `app_site_settings_audits`，记录修改人、时间和修改前后值。请求必须携带读取到的 `revision`，过期版本返回 409，刷新后重新编辑，避免覆盖其他管理员的修改。
- `GET /api/site-settings` 允许未登录访问，只返回六项站点展示字段。`GET/PATCH /api/platform/settings` 和 `GET /api/platform/settings/history` 仅平台管理员可用；租户成员不能读取管理详情或变更记录。接口不接受任意配置键，不暴露环境变量或密钥。
- 布局、浏览器标题、登录页和页脚读取运行时配置。保存后当前会话立即应用，其他会话刷新后生效；用户明确选择的语言优先于平台默认语言。公共配置请求失败或超时后回退到代码默认值，保证登录页仍能展示；管理配置加载失败时禁止保存。
- 应用 `20261117000200_site_settings` 迁移后重启后端，即可使用新接口。生产环境通过 `npm run db:deploy` 应用迁移，无需重新 seed。

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

DTO 与 OpenAPI：

- 请求体、分页/筛选和路径参数使用 DTO 类；全局 `ValidationPipe` 执行运行时校验。只对分页字段显式转换数值，JSON 布尔值和数值不做隐式转换，额外字段会被过滤。
- DTO 校验参数形状和范围；Service 保留套餐是否到期、成员额度、租户权限和最后管理员等业务规则。创建已有账号时不要求姓名或密码，新建账号时两者必填。
- 请求校验失败返回 HTTP 400，格式为 `{ success: false, errorCode: 400, errorMessage, errors: string[] }`，嵌套字段包含路径，不返回提交的密码或原始请求值。
- DTO 同时通过 `@ApiProperty` / `@ApiPropertyOptional` 描述契约；Controller 使用明确的响应 DTO 和稳定的 `operationId`。Controller 参数 DTO 必须保留运行时类引用，不能只导入类型。
- 开发环境文档地址：`http://localhost:3000/api/docs`，原始 JSON：`http://localhost:3000/api/openapi.json`。生产环境默认不挂载文档路由。

更新接口后，在**项目根目录**执行：

```bash
npm run openapi
```

该命令编译后端、从 Controller/DTO 元数据导出 `config/backend.openapi.json`，再复用前端现有 OpenAPI 插件的生成器，更新 `src/services/backend/`。无需启动后端或连接数据库；需要事先安装前后端依赖并配置好本地环境文件，以供 Prisma 构建读取配置。

生成的声明使用独立 `BackendAPI` 命名空间，正确保留可空字段和字符串 ID；例如 `BackendAPI.LoginDto`、`BackendAPI.CreateTenantDto`、`BackendAPI.CurrentUserDto`。登录和管理页面的 service 现在只是生成客户端的薄封装，用于保留页面自己的错误处理选项，不再重复维护请求路径和数据类型。模板示例目录 `src/services/ant-design-pro/` 不受此命令影响。

生成文件不要手动修改。修改 DTO 后，统一使用项目的 `npm run openapi`，其中包含生成器所需的 nullable 兼容处理；不要用裸 `max openapi` 替代。契约快照和生成客户端应随接口变更一起提交。

只导出契约也可以在后端目录运行 `npm run openapi:export`。后端 `npm test` 会对比导出的契约与当前元数据，检查 39 个操作、路径/请求体/响应类型，并验证 Swagger 文档路由。根目录 `npm run test:unit` 运行无需浏览器的菜单与访问控制单元测试。

模块结构：

```text
src/
├── auth/       # 登录、会话、授权服务、页面/权限注册表和全局 Guard
├── database/   # 共享 PrismaService、客户端工厂和测试数据初始化
├── tenants/    # 当前租户、成员管理、角色及权限分配和订阅查询
├── platform/   # 平台账号、租户、套餐管理与人工分配
├── navigation/ # 菜单配置及基于授权结果的导航
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
- `/platform/users`：平台管理员管理全局账号、账号状态与密码。
- `/tenant/roles`：租户管理员管理本企业自定义角色与页面、操作权限。
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
