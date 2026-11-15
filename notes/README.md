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

### ⚠️ 本地 tag 一律加 `fork-` 前缀

上游也用 `v<version>` 给同名版本打 tag（如 `v0.2.2-rc.2.1`）。fork 早期用 `sync:release`
直接打 `v${version}`，与上游撞名后：

- `git fetch --all --tags` 报 `! [rejected] ... (would clobber existing tag)`，**exit=1，且该 remote 其余 ref 也不再更新**；
- `git fetch upstream`（不带 `--tags`）反而**静默通过**，本地那条 tag 却仍指向 fork 的提交 —— 最容易误判「上游没发版」。

**现状**：本地 fork 的 3 个发版 tag 已改名为 `fork-v0.2.2-rc.2.1` / `fork-v0.2.2-rc.2.2` /
`fork-v0.2.2-rc.3.1`（提交、消息、tagger 时间保持不变），原名的 3 个 tag 已从本地与 `origin` 删除。
`v0.2.2-rc.2.1` 现在指向**上游**的 `0aef1e5`。`sync:release` 与 `check:fork-state` 已同步改为只认 `fork-v*`。

**查版本一律以上游为准**，别看本地 tag：

```sh
git ls-remote --tags upstream | Select-String "0\.2\.2"
```


## 同步上游

```sh
git fetch --all
git switch main && git merge --ff-only upstream/main && git switch custom
git rebase main
```

> **`upstream/main` 是 0.2.1 线，不是 0.2.2 线。** 0.2.2 的 rc.1.1 / rc.1.2 / rc.2.1 全在
> `upstream/0.2.2-alpha`（`28ccc67..0.2.2-alpha` 共 44 个提交，均未进 `main`）。
> 上面这套 `merge --ff-only upstream/main` 只用于跟进 0.2.1 的修补；要看 0.2.2 的进展：

```sh
git fetch --all --tags
git log --oneline upstream/0.2.2-alpha -10
```

**tag 安全网**：`fetch --all` 默认只拉**本地尚不存在**的 tag，遇到同名不同指向的会
`rejected (would clobber existing tag)` 并让整个 remote 的 fetch 失败（exit=1）。
本 fork 的发版 tag 已全部改成 `fork-v*`，与上游 `v*` 不再重叠，因此正常 `fetch --all` 应当 **exit=0**。
若哪天又看到 `would clobber`，说明**又有 fork tag 用了 `v<version>` 原名** —— 按「远程」一节的规则改名，
不要用 `--prune-tags`（那会强行覆盖）或 `git tag -d` 直接删（那会丢发版记录）。

只有确实不想让任何 tag 进本地时，才临时用：

```sh
git fetch --no-tags upstream
# 需要某个上游 tag 时单独取到独立命名空间，不污染 git tag：
git fetch --no-tags upstream refs/tags/<tag>:refs/upstream-tags/<tag>
```

## 升级 DSH 目标版本

1. 改 `package.json` 的 `engines.dsh`，并把 peer/dev 里所有 `@deepseek-ai/dsh-*` 同步到同一版本。
   `scripts/verify-dev-dependencies.ts` 强制相等，漏一个 build 就失败。
2. 注意改名：`@deepseek-ai/dsh-experimental-agent-team` 自 0.2.2 起叫 `@deepseek-ai/dsh-agent-team`。
3. **同族的非 `dsh-` 包也要对齐宿主声明**，漏掉会引发 pnpm 双实例（详见「已知遗留」）：
   `cordis`（`~4.1.0`）、`cordis-plugin-loader`（`~1.1.0`）、`cordis-plugin-group`（`~1.1.0`）、
   `cordis-plugin-include`（`~1.1.0`）、`cordis-plugin-timer`（`~1.2.0`）、`schemastery`（`~3.19.0`）。
   查法：读宿主 `package.json` 的同名字段，或看 `node_modules/.pnpm` 里是否有同版本的多个哈希目录。
4. `pnpm install && pnpm typecheck` —— **这一步就是版本敏感点扫描器**，会列出所有签名对不上的调用点。
5. 修完 `pnpm build`。

不维护「版本敏感点清单」：51 个宿主包、221 处 import、19 个服务、64 处 `ctx.get`，
全量列表的维护成本高于收益，而 typecheck 已覆盖 call-site 这一类。

## 日常脚本

三个只读写本地状态的维护脚本（除 `--push` 外都不动远端）：

| 命令 | 用途 | 退出码 |
|---|---|---|
| `pnpm run check:fork-state [-- --host 0.2.2-rc.3]` | **开工体检**：当前分支、工作区、上游落后、`release` 是否含 `lib/`、版本号与 tag 是否一致、`engines.dsh` 是否匹配运行版、依赖是否装齐 | 0 全通过 / 1 有失败 |
| `pnpm run check:release-freshness` | **发版前自查**：`custom` 有没有改过产出物料的路径（`src`、`package.json`、`pnpm-lock.yaml`、`tsconfig.json`、`tsdown.config.ts`、`scripts`）却没重建 `release` | 0 最新 / 1 需重建 / 2 分支或产物缺失 |
| `pnpm run sync:release [-- --push]` | **发版**：构建 → 单提交快照（含 `lib/`）→ 移动 `release` → 打 tag。默认只做本地 | 0 成功 / 1 失败 |

`sync:release` 的守卫：工作区不干净、tag 已存在、构建没产出 `lib/index.js`、没有暂存到任何产物——任一不满足即拒绝，并用 `finally` 恢复原分支、清理临时分支。

⚠️ **`lib/` 在 `custom` 分支上被 gitignore**。任何切到 `release`（该分支跟踪 `lib/`）再切回来的操作，都会让 Git 删掉工作区的 `lib/`，于是本地 `link:` 安装的插件失去入口。`sync:release` 的 `finally` 已处理这一点：切回后若发现 `lib/index.js` 缺失会自动重建。**手工切分支时须自己重建**：

```sh
git switch release && git switch custom && pnpm build
```

> **2026-11-14 实测：这个 `finally` 没兜住。** 跑 `pnpm run sync:release` 成功后
> （`release → 44e60fc`、tag `v0.2.2-rc.3.1` 已建），切回 `custom` 时 `lib/index.js`
> **仍然不存在**，需要手动 `pnpm build` 才恢复。判断顺序：发版后**先查一次**
> `Test-Path lib/index.js`，缺了就立刻 `pnpm build`；不要以为「脚本说有 finally 就没事」。
> （`check:fork-state` 的 `runtime dependencies installed` 那项查的是 `dependencies`，
> 不查 `lib/`，所以它报 OK 也不能证明入口还在。）

`--allow-dirty` 可跳过工作区检查，仅供脚本自身开发时 dry-run。

> 脚本用 `node` 直接跑即可（Node 26 原生剥离 TS 类型）；`pnpm run` 需要能写
> `%LOCALAPPDATA%\pnpm-store-operation-locks`，沙箱会话里要给一次 full-access。
> 脚本内部调用 git 时把输出重定向到临时文件而非管道——沙箱禁止子进程走管道（EPERM）。

## 发版流程

```sh
# 1. 确认源码已提交、版本号已改
pnpm run check:fork-state -- --host <宿主版本>

# 2. 自查 release 是否已过期
pnpm run check:release-freshness

# 3. 重建（默认只在本地；先看不带 --push 的结果）
pnpm run sync:release

# 4. 确认无误后推送
pnpm run sync:release -- --push
```

**只有改了产出物料的路径才需要重建 `release`**。只改 `notes/`、`AGENTS.md`、
`README.md` 或测试时，`check:release-freshness` 会报 OK，可跳过第 3、4 步。

## 已知遗留

### 测试与 Devin 实测脚本不再覆盖 Team 成员功能

DSH 0.2.2 删除了 Agent Teams 的 roster（`tryMembership` / `listMembers` / `spawnTeammate` /
`sendMessage` / `interrupt` / `waitForChange`），只保留任务板。依赖这些 API 的测试与脚本因此失效：

| 范围 | 处置 |
|---|---|
| `tsconfig.tools.json` 的 `scripts/check-devin-live.ts` | 排除。该脚本 29 处依赖 Team 实测，被验证的功能本身已不存在 |
| `tsconfig.test.json` 中 14 个测试文件 | 待处理（37 个错误，多为 Team 相关） |
| 已删除：`test/unit/runtime/team-management.spec.ts`、`test/unit/client/team-member-state.spec.ts` | 它们导入的源码已随功能一起删除 |

**`pnpm typecheck` 的 `tsconfig.json` 与 `tsconfig.tools.json` 两门是绿的**；只有
`tsconfig.test.json` 一门因上述原因仍报错。`build`（只跑 `tsconfig.json`）不受影响，
发版流程正常。

### pnpm 双实例（已修复，记录成因）

升级初期 pnpm 解析出**两份 `cordis@4.1.0`**（连 `dsh-app-boot`、`dsh` 也各两份），
导致 `runProfile()` 返回的 `Context` 与 `dsh-agent` 的类型声明不在同一模块实例上，
`ctx.agents` 等在类型上全部不存在（36 个错误）。

根因：`package.json` 里两个**不以 `dsh-` 开头**的开发依赖仍停在 0.2.1 时代：

```diff
- "@deepseek-ai/cordis-plugin-group": "1.0.5",
- "@deepseek-ai/cordis-plugin-loader": "1.0.6",
+ "@deepseek-ai/cordis-plugin-group": "1.1.0",
+ "@deepseek-ai/cordis-plugin-loader": "1.1.0",
```

`loader@1.0.6` 让 pnpm 为它建立独立的 peer 环境，于是同一版本的 cordis 出现两个哈希目录。

**教训**：升级 DSH 目标版本时，不能只替换 `@deepseek-ai/dsh-*`；`cordis`、
`cordis-plugin-loader`、`cordis-plugin-group`、`cordis-plugin-include`、
`cordis-plugin-timer`、`schemastery` 这些同族包也要对齐宿主声明。旧 `node_modules`
里的残留符号链接会让问题在 `pnpm install` 后继续存在，必要时删掉 `node_modules` 重装。

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

## 远程装太慢时：改用 tarball

Git 安装要克隆整个仓库（183 个提交、约 13 MB），国内经 SSH 可能等数分钟到更久。
产物确定、且网络不佳时，改传预打包文件：

```powershell
# 1. 本地打包（必须在 release 分支，那里有 lib/）
cd dsh-acp-adapter
git switch release
pnpm pack          # 生成 zaimokuza-dsh-acp-adapter-0.2.2-rc.3.1.tgz
git switch custom
```

```bash
# 2. 把 tgz 传到远程（WSL 可直接读 /mnt/c/...，或用 scp）
cp /mnt/c/path/to/zaimokuza-dsh-acp-adapter-0.2.2-rc.3.1.tgz ~/

# 3. 装
dsh plugin --profile <名> add ~/zaimokuza-dsh-acp-adapter-0.2.2-rc.3.1.tgz
```

- **优点**：秒级完成、不依赖网络、产物与本地验证的完全一致。
- **缺点**：不走 Git，插件市场**不会**出现更新提示；升级要重新传文件并改 spec。
- `pnpm pack` 依赖 `packageManager: pnpm@10.7.0`，用 12.x 也会自动切换，无需手动降级。

## 切回上游

上游修好 0.2.2 兼容后（**判据：上游 tag 的 `engines.dsh` 等于本机运行版**，例如 `0.2.2-rc.3`）：

> **切回前先复查一个 fork 侧记录的 bug**：`notes/2026-11-15-跨后端切换弹窗无法关闭.md`。
> 现象是源 provider 消失后跨后端切换弹窗无法关闭、重启复现。按那份笔记第四节的清单，
> 在**上游版本**上判一次是否已修：已修就直接切回，未修再提 issue（草稿在那份笔记的第八节）。

**查上游到哪一版了**（不要看本地 tag，本地是 fork 的 `fork-*`）：

```sh
git fetch --all --tags
git log --oneline upstream/0.2.2-alpha -10     # 0.2.2 线在 0.2.2-alpha，不在 main
git show upstream/0.2.2-alpha:package.json | Select-String '"dsh":'
```

> 2026-11-15 实况：上游最新 `v0.2.2-rc.2.1`（npm `next` 渠道已发），目标宿主仍是 `0.2.2-rc.2`；
> 本机跑 `0.2.2-rc.3`，因此**还不能切**。上游这波（11-13 → 11-14，44 个提交）已自行完成 0.2.2 迁移，
> 并把 Team 成员设置并回原生子代理目录 —— 我们在「已知遗留」里记的那条降级会被覆盖。

1. profile 的 `dependencies` 把 `link:`（本机）或 `github:...`（远程）改回 `"<上游版本号>"`，
   如 `0.2.3-rc.1.1`。⚠️ **本机 desktop profile 现在是 `link:` 指向本 fork，必须换掉**，
   否则装了上游版也不生效。
2. `cordis.patch.yml` **不用改**：按 `name` 匹配，同名即复用。
3. 重新 `dsh plugin add` / `pnpm install`，完全退出 DSH 重启。
4. 本地 fork 可留在 `custom` 分支，随时可切回对比。

**切回即退役，不移植**：上游的 0.2.2 迁移与本 fork 是**两条平行实现**（`git cherry` 显示 fork 的
11 个提交上游一个都没有；src 目录上游独有 29 个文件、fork 独有 3 个）。所以不要试图拿 fork 的补丁
rebase 到上游 —— 直接整体用上游，fork 侧唯一要带走的是这份 `notes/` 的判断经验。
切换后 `sync:release` / `check:fork-state` / `check:release-freshness` 三个脚本随 fork 一起作废。

