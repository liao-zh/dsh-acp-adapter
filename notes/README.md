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
| `LlmError` 构造器 | 0.2.2 只接受 `BuiltinLlmFailureCode`；适配器自有 code 直接传会类型报错 | 走 `LlmError.fromFailure({ message, code })` |
| `sessionProjections.stateOf(session, key)` | 已废弃，返回 `unknown`，不参与 `SessionProjectionMap` 收窄 | 自注册单元用 `ProjectionHandle.stateOf`；宿主单元用 `snapshot().values` |
| `sessionProjections.register()` | 0.2.2 起返回 `Promise<ProjectionHandle<S>>` | `await` 后保存 handle；同步 `ctx.effect` 里用 `.then()` 注入 |
| `agents.roots()` / `isOwnedBy()` | 0.2.2 从 `AgentRegistry` 删除 | `subagents.rootOf(x) === x` 判根；`rootOf(a) === rootOf(b) && parentSession` 判归属 |
| zod 双实例 | 适配器 4.4.3、宿主 4.6.6 时 `ZodType` 类型不兼容 | zod 版本与宿主对齐 |

## 不做

- 不改 `CHANGELOG.md`、`docs/`：上游最近 10 次提交里改了 10 次，加了必然冲突。
- 不跑上游 `.agents/skills/adapter-release`，不发 npm 包。
- 不写 `~/.dsh/profiles/*/compatibility.json` 豁免：fork 把 `engines.dsh` 改对即可，不绕门禁。

## 安装与使用

- **本机**：profile 的 `package.json` 用 `link:` 指向本仓库；改完 `pnpm build` 后**完全退出 DSH 再启动**（ESM 模块缓存不热重载）。
- **远程**：`dsh plugin --profile <名> add "github:liao-zh/dsh-acp-adapter#<40位完整SHA>"`
  - `--profile` 必须紧跟 `plugin` 之后（`dsh/args` 规定启动器 flag 在前，否则被当成内层参数）。
  - 用 **40 位完整 SHA**，不要用分支名：只有完整 SHA 才让 `BundleInfo.update` 识别为 `git` 更新源。
  - 装的是 `release` 分支的产物；`main` 无 `lib/`，装它会因缺少入口而加载失败。
- **设置不用搬**：ACP 配置在 profile 的 `cordis.patch.yml`，不在插件目录。
- **状态不用搬**：`~/.dsh/dsh-acp` 按 sessionId 记录，与插件版本、安装方式无关。
- 换安装方式时**不要改包名**，否则 profile 里的配置段需要跟着改名。

## 更新误报：dshmarket 的「有新提交（未发版）」

`dshmarket` 插件（非 DSH 官方）会在插件页提示「有新提交（未发版）<sha>」，那个 sha 指的是
**fork 的 `main` 分支 HEAD**（= 上游镜像，不含 `lib/`）。

- **不要点这个更新**：装 `main` 会因缺少 `lib/` 而加载失败，且是降级回 0.2.1-rc.4.1。
- 该提示自带说明「市场只安装正式版本，不会自动装这些提交」，**忽略即可**。
- 想根治可把 fork 默认分支改成 `release`，但要先确认 dshmarket 比较的是默认分支而非安装 spec 所在分支。

## 切回上游

上游修好 0.2.2 兼容后：

1. profile 的 `dependencies` 把 `github:...` 改回 `"<上游版本号>"`（如 `0.2.3-rc.1.1`）。
2. `cordis.patch.yml` **不用改**：按 `name` 匹配，同名即复用。
3. 重新 `dsh plugin add` / `pnpm install`，完全退出 DSH 重启。
4. 本地 fork 可留在 `custom` 分支，随时可切回对比。
