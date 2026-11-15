# 本地后端

NestJS 12 + PostgreSQL，Node.js ≥22。前端使用 `npm run dev` 关闭 Mock，开发代理将 `/api/` 转发到本服务的 `3000` 端口。

首次运行：

```bash
cd backend
npm install
cp .env.example .env
# 在 .env 中填写数据库密码，并设置 ADMIN_PASSWORD
npm run db:init
npm start
```

初始化命令创建 `app_users` 和 `app_sessions` 表，以及 `admin` 用户；重复执行不会重置已有账号密码。`.env` 不提交到 Git。

接口：

- `GET /api/hello`：无需登录的连通性检查。
- `POST /api/login/account`：JSON 请求体 `{ "username": "admin", "password": "...", "autoLogin": true, "type": "account" }`。
- `GET /api/currentUser`：返回 `{ success: true, data: { userid, name, access } }`；未登录或会话过期返回 HTTP 401。
- `POST /api/login/outLogin`：撤销当前会话并清除 Cookie。

登录成功返回 `{ success: true, data: null }`，同时设置 HttpOnly、SameSite=Strict 的 Cookie。密码使用 scrypt 加盐哈希，会话仅保存令牌哈希。自动登录有效期 7 天；未勾选时使用浏览器会话 Cookie，服务端最多有效 12 小时。会话保存在 PostgreSQL，刷新页面或重启后端后仍可使用。

生产构建的前端使用同源 `/api/`，需由部署网关转发到后端；后端在 `NODE_ENV=production` 时使用 Secure Cookie，需要 HTTPS。

运行真实数据库集成测试：

```bash
npm test
```

测试使用随机独立 schema，并在结束后删除，不修改 `public` 中的用户或会话。
