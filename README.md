# 偉盛テクノロジー官网

多语言企业官网（默认日文，含中文/英文）+ 管理后台 + 需求提交通知 + 防刷机制 + 媒体管理。

## 本地启动

```bash
npm install
cp .env.example .env
npm run dev
```

- 前端：`http://localhost:5173`
- API：`http://localhost:8787`
- 管理后台：`/admin/login`

## 一键自动部署（已内置）

仓库已包含三套 GitHub Actions 工作流，`push main` 自动触发：

- GitHub Pages：`.github/workflows/deploy-github-pages.yml`
- Vercel：`.github/workflows/deploy-vercel.yml`
- Netlify：`.github/workflows/deploy-netlify.yml`

如果你只想启用其中一个平台，可在 GitHub Actions 页面手动禁用其它 workflow。

## GitHub Secrets 配置

### 通用（前端构建）

- `VITE_SITE_URL`：站点正式地址（例：`https://www.example.com`）
- `PROD_API_BASE`：后端 API 域名（例：`https://api.example.com`）

### GitHub Pages

- 可选：`CUSTOM_DOMAIN`（例：`www.example.com`）

### Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Netlify

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

## 自定义域名 + HTTPS

### GitHub Pages

1. 仓库 `Settings` -> `Pages`，Source 选择 `GitHub Actions`
2. 在仓库 `Settings` -> `Secrets and variables` -> `Actions` 添加 `CUSTOM_DOMAIN`
3. DNS 配置：
   - 子域名（推荐）：`CNAME www -> chenyx511.github.io`
   - 根域名：按 GitHub 文档配置 `A` 记录
4. Pages 会自动签发 HTTPS，勾选 `Enforce HTTPS`

### Vercel

1. Vercel 项目 `Settings` -> `Domains` 添加域名
2. 按提示配置 DNS（`A`/`CNAME`）
3. Vercel 自动启用 HTTPS（Let's Encrypt）

### Netlify

1. Netlify 站点 `Domain settings` 添加自定义域名
2. 按提示配置 DNS
3. 在 `HTTPS` 区域申请并启用证书

## 生产环境变量（后端 API）

后端使用 `server.js`，建议部署在可运行 Node 的服务（Railway/Render/Fly.io/云主机）。

必配：

- `API_PORT`：默认 `8787`
- `JWT_SECRET`：JWT 密钥（务必改成强随机）
- `ADMIN_USERS_JSON`：后台账号与角色
- `SITE_URL`：用于 sitemap/robots 的正式域名

防刷与上传：

- `CAPTCHA_TTL_MS`：验证码有效期
- `RATE_LIMIT_WINDOW_MS`：限流时间窗口
- `RATE_LIMIT_MAX`：窗口内最大提交次数
- `UPLOAD_MAX_BYTES`：上传文件大小限制

通知：

- SMTP：`SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `NOTIFY_EMAIL_FROM` `NOTIFY_EMAIL_TO`
- Webhook：`WECOM_WEBHOOK_URL` `FEISHU_WEBHOOK_URL`

前端环境变量（构建时注入）：

- `VITE_SITE_URL`
- `VITE_API_BASE`

## 权限模型

- `admin`：可登录、编辑内容、上传媒体、删除媒体
- `editor`：可登录、编辑内容、上传媒体（不能删媒体）

## 常用命令

```bash
npm run dev          # 前后端联调
npm run lint         # 代码检查
npm run build        # 生成生产包 + sitemap/robots
```
