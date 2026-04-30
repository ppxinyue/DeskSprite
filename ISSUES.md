# DeskSprite 开发问题记录

## ISSUE-001
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A. 项目初始化
- 严重程度：已解决
- 问题现象：npm/pnpm 下载依赖极慢（部分包下载速度 < 10 KiB，多次 ECONNRESET/ETIMEDOUT），首次 `pnpm install` 耗时 6 分钟。
- 原因分析：国内网络环境访问 npm registry 不稳定，需要代理。
- 解决方案：配置本地代理 `export https_proxy=http://127.0.0.1:6478 http_proxy=http://127.0.0.1:6478 all_proxy=socks5://127.0.0.1:6478`，使用 `pnpm dlx` 替代 `npx`（避免 npm 缓存权限问题）。
- 经验总结：所有网络请求命令前加上代理环境变量。用 `pnpm dlx` 而非 `npx` 执行 CLI 工具。
- 是否需更新技术文档：否

## ISSUE-002
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A3. 配置 shadcn/ui
- 严重程度：已解决
- 问题现象：`shadcn add` 组件后，文件安装到项目根目录的 `@/components/ui/` 而非 `src/components/ui/`，导致 TypeScript 报 `Cannot find module '@/components/ui/tooltip'`。
- 原因分析：`components.json` 中 `aliases.components` 设为 `@/components`，但 shadcn CLI（v4.6.0）将其解析为字面 `@/` 目录而非 `src/`。
- 解决方案：手动将 `@/components/ui/*.tsx` 移动到 `src/components/ui/`，删除空的 `@/` 目录。
- 经验总结：shadcn/ui 初始化后应验证组件文件实际位置。后续如再使用 `shadcn add`，需检查安装路径。
- 是否需更新技术文档：否

## ISSUE-003
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A3. Tailwind + shadcn 配置
- 严重程度：已解决
- 问题现象：TypeScript 6.0 报 `Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`，导致构建失败。
- 原因分析：TypeScript 6 弃用了 `baseUrl` + `paths` 组合，推荐使用 imports/package.json#imports。
- 解决方案：在 `tsconfig.app.json` 中添加 `"ignoreDeprecations": "6.0"` 以静默警告，保留 `baseUrl` + `paths` 配置（Vite 通过 vite-tsconfig-paths 或手动 resolve.alias 处理实际路径解析）。
- 经验总结：TypeScript 6+ 中路径别名的配置方式可能有变化，后续版本需关注。
- 是否需更新技术文档：否

## ISSUE-004
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A3. shadcn/ui 依赖
- 严重程度：已解决
- 问题现象：shadcn 组件安装后缺少 `class-variance-authority` 依赖，构建报 `Cannot find module 'class-variance-authority'`。
- 原因分析：shadcn CLI 通过 `pnpm dlx` 运行时，未自动将依赖写入项目的 package.json。
- 解决方案：手动 `pnpm add class-variance-authority`。
- 经验总结：使用 `pnpm dlx shadcn add` 后需检查是否有遗漏的依赖。
- 是否需更新技术文档：否
