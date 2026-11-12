# dsh-acp-adapter fork 维护指南

本仓库是 `@zaimokuza/dsh-acp-adapter` 的个人 fork，自用，不发 npm，暂不提 PR。
上游原始文档见仓库根的 `README.md` 与 `docs/`；本文件只记 fork 自己的规则与流程。

## 分支模型

| 分支 | 作用 | 怎么变 |
|---|---|---|
| `main` | 上游镜像，只快进 | `git merge --ff-only upstream/main` |
| `custom` | 本地改动都在这里 | 手工提交 |
| `release` | 构建产物快照（含 `lib/`），单提交、force-push | 发版时从 `custom` 生成 |

`lib/` 不进 `custom`：约 4.3 万行产物会淹没 diff，并让 rebase 变脏。
上游没有 `notes/` 这个路径，所以本目录里的改动永不与上游冲突。

## 远程

- `origin` = `liao-zh/dsh-acp-adapter`（推这里）
- `upstream` = `zaimokuza-yoshiteru/dsh-acp-adapter`（只 fetch，push URL 已改为无效地址作守卫）
- 上游 **HTTPS 走 schannel 会报 `SEC_E_NO_CREDENTIALS`**，必须用 SSH 地址
- `remote.pushDefault = origin`；`main` 跟踪 `upstream/main` 但推 `origin`

## 同步上游

```sh
git fetch --all
git switch main && git merge --ff-only upstream/main && git switch custom
git rebase main
```

## 升级 DSH 目标版本

1. 改 `package.json` 的 `engines.dsh`，并把 peer/dev 里所有 `@deepseek-ai/dsh-*` 同步到同一版本。
   `scripts/verify-dev-dependencies.ts` 强制相等，漏一个 build 就失败。
2. 注意改名：`@deepseek-ai/dsh-experimental-agent-team` 自 0.2.2 起叫 `@deepseek-ai/dsh-agent-team`。
3. `pnpm install && pnpm typecheck` —— **这一步就是版本敏感点扫描器**，会列出所有签名对不上的调用点。
4. 修完 `pnpm build`。

不维护「版本敏感点清单」：51 个宿主包、221 处 import、19 个服务、64 处 `ctx.get`，
全量列表的维护成本高于收益，而 typecheck 已覆盖 call-site 这一类。

## 已炸过的 seam

只记 typecheck 抓不到、或修法有讲究的。

| seam | 症状 | 处置 |
|---|---|---|
| `agentTeams.tryMembership` / `listMembers` 等 roster 面 | 0.2.2-rc.2 删掉整个 roster；`ctx.get(...)?.` 只兜「服务不存在」，兜不住「服务在、方法没了」 | 降级为「非 Team 会话」 |
| `tools.execute` | 0.2.2 只收批次 `ToolBatchInput`；旧签名报 `Tool batch execution failed`（cause 被丢弃） | 改批次调用；**重装插件会覆盖本地补丁，必须走 fork** |

## 不做

- 不改 `CHANGELOG.md`、`docs/`：上游最近 10 次提交里改了 10 次，加了必然冲突。
- 不跑上游 `.agents/skills/adapter-release`，不发 npm 包。
- 不写 `~/.dsh/profiles/*/compatibility.json` 豁免：fork 把 `engines.dsh` 改对即可，不绕门禁。

## 安装与使用

- **本机**：profile 的 `package.json` 用 `link:` 指向本仓库；改完 `pnpm build` 后**完全退出 DSH 再启动**（ESM 模块缓存不热重载）。
- **远程**：`dsh plugin add github:liao-zh/dsh-acp-adapter#release`
- **设置不用搬**：ACP 配置在 profile 的 `cordis.patch.yml`，不在插件目录。
- **状态不用搬**：`~/.dsh/dsh-acp` 按 sessionId 记录，与插件版本、安装方式无关。
- 换安装方式时**不要改包名**，否则 profile 里的配置段需要跟着改名。
