#!/usr/bin/env node
/**
 * Report whether the `release` branch still carries the artifacts of this
 * source tree.
 *
 * `release` publishes `lib/`, which the working tree ignores. A Git install
 * therefore loads whatever that branch committed, not the current checkout, so
 * source changes that never reached `release` silently stay uninstalled. This
 * check compares the two branches over exactly the paths that produce those
 * artifacts.
 *
 * Read-only: it never builds, commits, or pushes.
 *
 * Git output is captured through a temporary file rather than a pipe: this
 * sandbox denies piped stdio to child processes, while a file descriptor to a
 * regular file is allowed.
 *
 * Usage: node scripts/check-release-freshness.ts [--release <branch>] [--base <branch>]
 * @module @deepseek-ai/dsh-acp-adapter/scripts/check-release-freshness
 */
import { spawnSync } from 'node:child_process'
import { closeSync, openSync, readFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Paths whose content changes the built artifacts. */
const ARTIFACT_INPUTS = ['src', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'tsdown.config.ts', 'scripts']

/** Monotonic counter keeping concurrent probe files apart. */
let probeSequence = 0

/**
 * Run one git command in the repository root, capturing both streams in one file.
 * @param args - git arguments.
 * @returns the trimmed combined output and the exit status.
 */
function git(args: readonly string[]): { readonly output: string; readonly status: number } {
  probeSequence += 1
  const probe = join(tmpdir(), `dsh-acp-git-${process.pid}-${probeSequence}.txt`)
  const fd = openSync(probe, 'w')
  try {
    const run = spawnSync('git', args, { cwd: root, stdio: ['ignore', fd, fd] })
    return { output: readFileSync(probe, 'utf8').trim(), status: run.status ?? 1 }
  } finally {
    closeSync(fd)
    unlinkSync(probe)
  }
}

/**
 * Run one git command, returning undefined when it exits nonzero.
 * @param args - git arguments.
 * @returns the trimmed combined output, or undefined.
 */
function tryGit(args: readonly string[]): string | undefined {
  const run = git(args)
  return run.status === 0 ? run.output : undefined
}

/** The manifest's version, or a marker when it cannot be read. */
function versionOf(manifest: string | undefined): string {
  if (manifest === undefined) return '(unreadable)'
  try {
    return (JSON.parse(manifest) as { version?: string }).version ?? '(no version)'
  } catch {
    return '(unreadable)'
  }
}

const { values } = parseArgs({
  options: {
    release: { type: 'string', default: 'release' },
    base: { type: 'string', default: 'custom' },
  },
})
const releaseBranch = values.release
const baseBranch = values.base

for (const [label, branch] of [['base', baseBranch], ['release', releaseBranch]] as const) {
  if (tryGit(['rev-parse', '--verify', '--quiet', `${branch}^{commit}`]) === undefined) {
    console.error(`[release-freshness] FAIL: ${label} branch ${JSON.stringify(branch)} does not exist`)
    process.exit(2)
  }
}

const releaseTip = git(['rev-parse', '--short', releaseBranch]).output
const baseTip = git(['rev-parse', '--short', baseBranch]).output
const releaseVersion = versionOf(tryGit(['show', `${releaseBranch}:package.json`]))
const baseVersion = versionOf(tryGit(['show', `${baseBranch}:package.json`]))

// `lib/` must be present on the release branch: a source-only commit there has
// no entry module, so every install from it fails to load.
if (tryGit(['cat-file', '-e', `${releaseBranch}:lib/index.js`]) === undefined) {
  console.error(`[release-freshness] FAIL: ${releaseBranch} has no lib/index.js; an install from it cannot load`)
  process.exit(2)
}

const pending = git(['log', '--oneline', `${releaseBranch}..${baseBranch}`, '--', ...ARTIFACT_INPUTS]).output

console.log(`[release-freshness] base    ${baseBranch} ${baseTip} (version ${baseVersion})`)
console.log(`[release-freshness] release ${releaseBranch} ${releaseTip} (version ${releaseVersion})`)
console.log('[release-freshness] release has lib/index.js: yes')

if (pending === '') {
  console.log('[release-freshness] OK: release carries the current artifacts; nothing to rebuild')
  process.exit(0)
}

const commits = pending.split('\n')
console.error(`[release-freshness] STALE: ${commits.length} commit(s) changed artifact inputs after ${releaseBranch}`)
for (const line of commits) console.error(`  ${line}`)
console.error('[release-freshness] rebuild with: node scripts/sync-release.ts')
process.exit(1)
