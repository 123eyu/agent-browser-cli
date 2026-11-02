# 更新日志

所有重要变更都会记录在这里。日期使用北京时间自然日。

## Chrome 扩展 v2.2

- 调整弹窗布局，将连接配置和 Cookie 列表分为两个标签页，支持跟随系统切换深浅主题。
- Cookie 列表支持筛选、单条复制和批量复制；Profile 标识符支持点击复制。
- 文件网址访问未启用时提供扩展详情页入口；非 HTTP(S) 页面读取 Cookie 时给出明确提示。

## v0.3.7 - 2026-08-02

### 修复

- Chrome 扩展不再全局移除页面 CSP 响应头或 meta 标签；升级时会清理旧版持久化的动态规则，避免与 Tampermonkey 等注入脚本共同导致 YouTube renderer 满载卡死。受 CSP 限制的页面执行继续使用现有 CDP fallback。

## 已发布

## v0.3.4 - 2026-05-19

### 修复

- 修复 daemon 非 graceful 退出后扩展侧 CDP attach 状态残留，导致后续 exec/CDP fallback 报 `Another debugger is already attached` 的问题。

### 调整

- 调整 `agent-browser-cli` skill 的默认操作流程：浏览器任务优先直接执行 `tabs` / `open` / `exec` / `scan`，由 CLI 按需自动启动 daemon。
- 明确 `daemon_not_running` / `running=false` 只是未常驻状态，不能在尚未执行目标命令前阻塞任务。
- 将 `status` / `doctor` / `logs` 收敛为目标命令失败、连接异常或用户明确排障时才使用的诊断入口。

## v0.3.3 - 2026-05-18

- `tabtree` 默认改为 compact 输出，截断长 URL 并省略 `session_key` 以降低 token 消耗；新增 `tabtree --full` 输出完整 URL 和 `session_key`。
- 优化 `tabtree` 实现，daemon 锁内只复制必要会话字段，锁外完成排序和 JSON 组装。
- Chrome 扩展 popup 增加 label 唯一性提示：推荐用 CLI 设置 label 以校验当前 daemon 内跨 Profile 唯一性。
- 平台 npm 包打包时默认对复制后的原生二进制执行 `strip`，减小发布体积；本地 `target/release` 二进制保持不变。
- 新增 `tabtree` 树形查询命令，支持按 `tab_id`、`profile_id/profile_label`、`browser_id` 过滤，并保留 browser → profile → tab 父子节点；原先临时增加的 `profiles` / `browsers` 摘要命令已移除，统一使用 `tabtree` / `lookup`。
- 新增 `lookup tab|browser|profile` 反查命令，可由 `tab_id` 反查 `browser_id` / `profile_id` / `profile_label`，或由 `browser_id` 反查所属 profile。
- 移除扩展默认注入的全局 `alert` / `confirm` / `prompt` 重写，改为 CLI 页面执行期间临时抑制弹窗并在命令结束后恢复原生函数。
- 新增 `profile-label set|clear`，并在 Chrome 扩展 popup 中支持设置 Profile Label；label 冲突时 CLI 按歧义处理，不参与内部路由主键。

## v0.3.2 - 2026-05-17

### 修复

- 修复长 URL 页面中 `snapshot` 后立即使用 `@e` 可能误报 `ref expired` 的问题。

## v0.3.1 - 2026-05-17

### 新增

- 新增 `logs`：读取 `~/.agent-browser-cli/logs/daemon.log`，支持 `--tail`。
- 新增 `doctor`：输出 JSON 诊断信息，不自动启动 daemon。
- 新增 `install-skill`：支持 `--dry-run` 和 `--yes`，用于安装/更新 Agent skill。
- 增强 `status`：新增 `healthy`、`summary`、`message`，保留旧字段。
- 新增 `snapshot`：基于 Chrome Accessibility Tree 生成 `@e` 操作引用，支持 `--offset`、`--limit`、`--details`、`--tab`。
- 新增高层操作命令：`click`、`fill`、`send-keys`、`mouse-click`，支持 `--monitor`、`--wait-js`、`--wait-timeout`。
- 新增 `screenshot`：支持视口截图、全页截图、元素截图、PNG/JPEG、默认落盘目录。
- 新增 `save-pdf`：支持纸张、横向、缩放、打印背景、默认文件名清理和 50MB 上限。
- 新增 `network` 调试命令：`start`、`list`、`detail`、`clear`、`stop`。
- 新增 `console` 调试命令：`start`、`list`、`clear`、`stop`。
- 新增多浏览器 / 多 Chrome Profile 会话隔离：扩展上报 `browser_id`、`profile_id`、`profile_label`，daemon 内部使用 `session_key = browser_id:profile_id:tab_id` 路由。
- CLI 主要浏览器命令新增 `--browser` 和 `--profile`，支持按浏览器实例和 Profile 过滤/定位 tab。
- `tabs` 输出新增 `browser_id`、`profile_id`、`profile_label`、`tab_id`、`session_key`。
- `open` 新增 `--session` 和 `--group-title`，支持 Chrome 原生 tab group。
- `open` 新增 `--window`，支持新开独立 Chrome 窗口。
- `open` 新增 `--focus`，只有显式传入时才请求聚焦窗口。
- `open --window --group-title/--session` 支持对新窗口首个 tab 创建 Chrome tab group。
- 新增 `close --tab <tabId>`，通过扩展原生 `chrome.tabs.remove` 关闭标签页。
- Chrome 扩展新增图标，显示名改为 `Agent Browser CLI Bridge`。

### 调整

- `open` 返回结构改为以新打开目标为主：`opened_tab_id`、`opened_session_key`、`window_id`、`window`、`group`。旧执行通道移入 `metadata.executor`，避免 AI 误用旧 tab。
- daemon 在默认 session 失效时会回退到当前 active session，避免重启后卡在旧 `session_key`。
- `snapshot`、`@e` 缓存、调试缓存、截图/PDF、network/console 等路径统一按 `session_key` 隔离。
- daemon stdout/stderr 日志固定写入用户目录，不再落到当前目录或 npm 包目录。
- npm wrapper 设置 `AGENT_BROWSER_CLI_PACKAGE_DIR`，方便全局安装后定位内置 skill。
- `network stop` / `console stop` 会停止监听并清理对应缓存。
- daemon 退出时清理 daemon 缓存，并通知扩展清理 network/console 调试缓存。
- skill 文档重写为 Agent 操作 SOP，明确 `scan`、`snapshot`、`exec/CDP` 的职责边界，并补充多 Profile、多浏览器、`open --window`、`--focus` 和 `opened_tab_id` 使用说明。

### 验证

- 已覆盖真实 Chrome 场景：百度搜索、页面扫描、DOM 定位、输入/点击、截图、PDF、network/console 监听、缓存清理、tab group、关闭测试 tab。
- 已覆盖多 Profile 字段上报、`tabs --profile`、`tabs --browser --profile`、`exec/scan/snapshot/click/fill/send-keys/mouse-click/screenshot/save-pdf/network/console --profile --tab`、`open` tab/window/background/focus/group/session 组合。
- 已执行 `cargo fmt --check`、`cargo check`、`cargo build`、`cargo test`、`node --check`、`npm pack --dry-run`。

## v0.2.10-extension - 2026-05-15

### 调整

- Chrome 扩展默认不抢占系统前台窗口。
- `Page.bringToFront` 这类可能聚焦浏览器的行为改为显式 `allowFocus=true` 才执行。

## v0.2.9 - 2026-05-15

### 修复

- 同步平台包版本，保证 npm 包与 Rust crate 版本一致。

## v0.2.8 - 2026-05-15

### 新增

- 支持自定义 Chrome 扩展 WebSocket 监听端口。
- 新增 `set-extension-port <port>`，写入 `~/.agent-browser-cli/config.json`。
- daemon 运行中修改端口时自动重启，使新端口立即生效。

## v0.2.7 - 2026-05-15

### 调整

- 发布版本 `0.2.7`。
- 整合 release/publish 流程，为后续多平台包发布做准备。

## v0.2.6 - 2026-05-15

### 新增

- 支持 Linux ARM64 平台包。

### 文档

- 更新 Chrome 扩展安装说明，推荐从 Release 下载 `chrome-extensions.zip`。
- 补充 Linux 与 WSL 使用前提。

## v0.2.5 - 2026-05-13

### 调整

- 准备 `0.2.5` 发布。
- 更新支持平台说明。
- 改进 Chrome 扩展右侧提示角标，并补充文档说明。
- 增加 GenericAgent 友情链接。

## v0.2.4 - 2026-05-13

### 调整

- 准备 `0.2.4` 发布。
- 改进 release notes 保留逻辑。
- 增加 Linux 构建验证。

## v0.2.3 - 2026-05-12

### 修复

- 修复 Release npm artifact 匹配逻辑，让发布产物查找更稳健。
- 更新 `Cargo.lock` 到 `0.2.3`。

## v0.2.2 - 2026-05-12

### CI

- npm token 不存在时跳过 npm publish，避免发布流程失败。
- 增加 npm 发布 GitHub Actions 工作流。
- 调整 macOS Intel runner。

## v0.2.1 - 2026-05-11

### 移除

- 移除旧 Python runtime，CLI 主链路切换到 Rust 实现。

## v0.2.0 - 2026-05-11

### 新增

- 新增 Rust npm CLI release。
- 通过 npm 包分发 Rust CLI。

### 文档

- 补充性能参考和延迟数据说明。

## v0.1.1 - 2026-05-11

### 修复

- CLI 关闭时主动关闭 bridge，避免连接残留。

### 文档

- 补充安装指引，强调替换项目路径占位符。

## v0.1.0 - 2026-05-09

### 新增

- 新增 `open 命令。
- 支持通过 Chrome 扩展原生创建标签页。
- 建立基础浏览器控制 CLI 能力。
