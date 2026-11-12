#!/usr/bin/env node
/**
 * Rebuild `lib/` and publish it as a single-commit `release` snapshot.
 *
 * `lib/` is gitignored in the source branch but must be committed for a Git
 * install to load the package, so publishing is: build, create a snapshot
 * commit that adds `lib/`, and move `release` to it. That commit is a product
 * snapshot rather than history, so the branch is replaced wholesale.
 *
 * Local by default. `--push` also updates the remote branch and creates the
 * version tag.
 *
 * Usage: node scripts/sync-release.ts [--push] [--release <branch>] [--base <branch>] [--message <text>]
 * @module @deepseek-ai/dsh-acp-adapter/scripts/sync-release
 */
import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Git output is captured through a temporary file rather than a pipe: this
 * sandbox denies piped stdio to child processes, while a descriptor to a
 * regular file is allowed.
 */
let probeSequence = 0

/**
 * Run one command in the repository root with both streams captured.
 * @param file - executable name.
 * @param args - arguments.
 * @returns the trimmed combined output and the exit status.
 */
function run(file: string, args: readonly string[]): { readonly output: string; readonly status: number } {
  probeSequence += 1
  const probe = join(tmpdir(), `dsh-acp-run-${process.pid}-${probeSequence}.txt`)
  const fd = openSync(probe, 'w')
  try {
    const settled = spawnSync(file, args, { cwd: root, stdio: ['ignore', fd, fd] })
    return { output: readFileSync(probe, 'utf8').trim(), status: settled.status ?? 1 }
  } finally {
    closeSync(fd)
    unlinkSync(probe)
  }
}

/**
 * Run one command and fail the whole script on a nonzero exit.
 * @param file - executable name.
 * @param args - arguments.
 * @returns the trimmed combined output.
 */
function must(file: string, args: readonly string[]): string {
  const settled = run(file, args)
  if (settled.status !== 0) {
    if (settled.output !== '') console.error(settled.output)
    console.error(`[sync-release] FAIL: ${file} ${args.join(' ')} exited ${settled.status}`)
    process.exit(1)
  }
  return settled.output
}

/**
 * Run one command whose output is shown to the caller as it happens.
 * @param file - executable name.
 * @param args - arguments.
 */
function visible(file: string, args: readonly string[]): void {
  const settled = spawnSync(file, args, { cwd: root, stdio: 'inherit' })
  if ((settled.status ?? 1) !== 0) {
    console.error(`[sync-release] FAIL: ${file} ${args.join(' ')} exited ${settled.status ?? 1}`)
    process.exit(1)
  }
}

const { values } = parseArgs({
  options: {
    push: { type: 'boolean', default: false },
    release: { type: 'string', default: 'release' },
    base: { type: 'string', default: 'custom' },
    remote: { type: 'string', default: 'origin' },
    'allow-dirty': { type: 'boolean', default: false },
  },
})
const releaseBranch = values.release
const baseBranch = values.base
const remote = values.remote

const version = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version
const tag = `v${version}`
const initialBranch = run('git', ['branch', '--show-current']).output
const snapshotBranch = `release-snapshot-${process.pid}`

/**
 * Return to the branch the caller started on, tolerating a checkout that
 * already happened.
 * @param branch - branch to restore.
 */
function restore(branch: string): void {
  run('git', ['switch', branch])
}

/** Remove the throwaway snapshot branch when it still exists. */
function dropSnapshotBranch(): void {
  run('git', ['branch', '-D', snapshotBranch])
}

try {
  if (!values['allow-dirty'] && run('git', ['status', '--porcelain']).output !== '') {
    console.error('[sync-release] FAIL: the working tree has uncommitted changes; commit or stash them first')
    console.error('[sync-release]       (--allow-dirty skips this check for a dry run)')
    process.exit(1)
  }
  if (run('git', ['rev-parse', '--verify', '--quiet', `${tag}^{commit}`]).status === 0) {
    console.error(`[sync-release] FAIL: tag ${tag} already exists; bump package.json version first`)
    process.exit(1)
  }

  console.log(`[sync-release] base ${baseBranch}, version ${version}, tag ${tag}`)
  restore(baseBranch)

  console.log('[sync-release] building')
  visible(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', 'build'])

  if (!existsSync(join(root, 'lib', 'index.js'))) {
    console.error('[sync-release] FAIL: the build produced no lib/index.js')
    process.exit(1)
  }

  // A fresh branch from the base keeps this commit's parent predictable, so the
  // snapshot is always one commit of source plus artifacts.
  must('git', ['switch', '-c', snapshotBranch, baseBranch])
  must('git', ['add', '-f', 'lib'])
  const staged = run('git', ['diff', '--cached', '--name-only', '--', 'lib']).output
  if (staged === '') {
    console.error('[sync-release] FAIL: no lib/ changes were staged; the build may have produced nothing new')
    process.exit(1)
  }
  const fileCount = staged.split('\n').length
  must('git', ['commit', '-m', `build: ${version} prebuilt artifacts

Committed lib/ so a Git install can load this package. \`files\` ships build
output only and no \`prepare\` script runs at install time, so a source-only
checkout has no entry module to load.

Generated from ${baseBranch} at ${must('git', ['rev-parse', '--short', baseBranch])} by \`pnpm build\`.
${fileCount} artifact files.`])
  const snapshotTip = must('git', ['rev-parse', snapshotBranch])
  must('git', ['tag', '-a', tag, '-m', `ACP adapter ${version}`, snapshotTip])
  must('git', ['branch', '-f', releaseBranch, snapshotBranch])
  dropSnapshotBranch()
  restore(initialBranch)

  console.log(`[sync-release] release ${releaseBranch} -> ${snapshotTip.slice(0, 7)} (${fileCount} files)`)
  console.log(`[sync-release] tag ${tag} created locally`)

  if (!values.push) {
    console.log('[sync-release] local only; re-run with --push to update the remote and push the tag')
    console.log(`[sync-release]   git push --force-with-lease ${remote} ${releaseBranch}`)
    console.log(`[sync-release]   git push ${remote} ${tag}`)
    process.exit(0)
  }

  console.log(`[sync-release] pushing ${releaseBranch} to ${remote}`)
  must('git', ['push', `--force-with-lease`, remote, releaseBranch])
  console.log(`[sync-release] pushing ${tag}`)
  must('git', ['push', remote, tag])
  console.log(`[sync-release] published ${tag}; install with:`)
  console.log(`  dsh plugin --profile <name> add "github:<owner>/<repo>#${snapshotTip}"`)
} finally {
  if (run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${snapshotBranch}`]).status === 0) dropSnapshotBranch()
  const current = run('git', ['branch', '--show-current']).output
  if (current !== initialBranch) restore(initialBranch)
}
