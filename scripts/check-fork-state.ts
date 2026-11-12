#!/usr/bin/env node
/**
 * Print one health report for this fork before starting work.
 *
 * The fork carries three branches with distinct jobs (`main` mirrors upstream,
 * `custom` holds local source changes, `release` publishes artifacts), and a
 * mismatch between them fails quietly rather than loudly: the wrong branch loads
 * the wrong code, a stale `release` ships old artifacts, and an `engines.dsh`
 * that drifts from the running Host refuses to load at all.
 *
 * Read-only: it never builds, commits, or pushes. Exit 1 means at least one
 * check failed.
 *
 * Usage: node scripts/check-fork-state.ts [--host <version>]
 * @module @deepseek-ai/dsh-acp-adapter/scripts/check-fork-state
 */
import { spawnSync } from 'node:child_process'
import { closeSync, readdirSync, readFileSync, openSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Paths whose content changes the built artifacts. */
const ARTIFACT_INPUTS = ['src', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'tsdown.config.ts', 'scripts']

/** Outcomes that make the report fail. */
const failures: string[] = []

/**
 * Record one check's result.
 * @param ok - whether the check passed.
 * @param label - the check name.
 * @param detail - what was observed.
 */
function check(ok: boolean, label: string, detail: string): void {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${label}: ${detail}`)
  if (!ok) failures.push(label)
}

/**
 * Git output is captured through a temporary file rather than a pipe: this
 * sandbox denies piped stdio to child processes, while a descriptor to a
 * regular file is allowed.
 */
let probeSequence = 0

/**
 * Run one git command in the repository root.
 * @param args - git arguments.
 * @returns the trimmed combined output and exit status.
 */
function git(args: readonly string[]): { readonly output: string; readonly status: number } {
  probeSequence += 1
  const probe = join(tmpdir(), `dsh-acp-state-${process.pid}-${probeSequence}.txt`)
  const fd = openSync(probe, 'w')
  try {
    const settled = spawnSync('git', args, { cwd: root, stdio: ['ignore', fd, fd] })
    return { output: readFileSync(probe, 'utf8').trim(), status: settled.status ?? 1 }
  } finally {
    closeSync(fd)
    unlinkSync(probe)
  }
}

/**
 * Run one git command, returning undefined on a nonzero exit.
 * @param args - git arguments.
 * @returns the trimmed combined output, or undefined.
 */
function tryGit(args: readonly string[]): string | undefined {
  const settled = git(args)
  return settled.status === 0 ? settled.output : undefined
}

/**
 * Read one manifest field, returning undefined when absent.
 * @param manifestPath - path relative to the repository root.
 * @returns the parsed manifest, or undefined when unreadable.
 */
function manifestAt(manifestPath: string): { version?: string; engines?: { dsh?: string } } | undefined {
  try {
    return JSON.parse(readFileSync(join(root, manifestPath), 'utf8')) as { version?: string; engines?: { dsh?: string } }
  } catch {
    return undefined
  }
}

const { values } = parseArgs({ options: { host: { type: 'string' } } })

const workspace = manifestAt('package.json')
if (workspace === undefined) {
  console.error('[fork-state] FAIL: cannot read package.json')
  process.exit(2)
}
const enginesDsh = workspace.engines?.dsh
const version = workspace.version

console.log(`[fork-state] repository ${root}`)

// -- branches ----------------------------------------------------------------
const current = git(['branch', '--show-current']).output
check(current === 'custom', 'on branch custom', current === '' ? 'detached HEAD' : current)

for (const branch of ['main', 'custom', 'release']) {
  check(tryGit(['rev-parse', '--verify', '--quiet', `${branch}^{commit}`]) !== undefined, `branch ${branch}`, 'present')
}

const dirty = git(['status', '--porcelain']).output
check(dirty === '', 'working tree clean', dirty === '' ? 'nothing to commit' : `${dirty.split('\n').length} changed path(s)`)

// -- upstream ----------------------------------------------------------------
const behind = tryGit(['rev-list', '--count', `main..upstream/main`])
if (behind === undefined) {
  console.log('SKIP  upstream tracking: no upstream/main ref (run: git fetch upstream)')
} else {
  const pending = git(['log', '--oneline', 'main..upstream/main']).output
  check(behind === '0', 'main matches upstream', behind === '0' ? 'up to date' : `${behind} commit(s) behind${pending === '' ? '' : `\n      ${pending.split('\n').join('\n      ')}`}`)
}

// -- artifacts ---------------------------------------------------------------
if (tryGit(['cat-file', '-e', 'release:lib/index.js']) === undefined) {
  check(false, 'release carries lib/', 'lib/index.js missing; an install from it cannot load')
} else {
  check(true, 'release carries lib/', 'lib/index.js present')
}
const stale = git(['log', '--oneline', 'release..custom', '--', ...ARTIFACT_INPUTS]).output
check(stale === '', 'release is current', stale === '' ? 'no artifact-input changes since release' : `${stale.split('\n').length} commit(s) changed source after release`)

// -- version alignment -------------------------------------------------------
const releaseManifest = tryGit(['show', 'release:package.json'])
const releaseVersion = releaseManifest === undefined
  ? undefined
  : ((): string | undefined => {
      try {
        return (JSON.parse(releaseManifest) as { version?: string }).version
      } catch {
        return undefined
      }
    })()
check(releaseVersion === version, 'release version matches workspace', `workspace ${String(version)}, release ${String(releaseVersion)}`)

const tags = tryGit(['tag', '--sort=-v:refname'])?.split('\n').filter((line) => line !== '') ?? []
const latestTag = tags[0]
check(latestTag === `v${String(version)}`, 'latest tag matches version', latestTag === undefined ? 'no tags' : latestTag)

// -- host alignment ----------------------------------------------------------
if (enginesDsh === undefined) {
  check(false, 'engines.dsh declared', 'missing')
} else {
  const host = values.host ?? process.env['DSH_RUNTIME_VERSION']
  if (host === undefined) {
    console.log(`SKIP  engines.dsh satisfies the running Host: engines.dsh=${enginesDsh}; pass --host <version> to check`)
  } else {
    check(host === enginesDsh, 'engines.dsh satisfies the running Host', `engines.dsh ${enginesDsh}, host ${host}`)
  }
}

// -- dependency pinning ------------------------------------------------------
const dshDependencies = Object.entries<string>(
  (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { devDependencies?: Record<string, string> }).devDependencies ?? {},
).filter(([name]) => name.startsWith('@deepseek-ai/dsh') && name !== '@deepseek-ai/dsh-brand')
const mismatched = dshDependencies.filter(([, pinned]) => pinned !== enginesDsh).map(([name]) => name)
check(mismatched.length === 0, 'devDependencies pinned to engines.dsh', mismatched.length === 0 ? `${dshDependencies.length} package(s)` : `mismatched: ${mismatched.slice(0, 3).join(', ')}${mismatched.length > 3 ? ', ...' : ''}`)

// -- runtime dependencies present -------------------------------------------
const runtimeDependencies = Object.keys((JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies ?? {}) as Record<string, string>)
const missing = runtimeDependencies.filter((name) => {
  try {
    readdirSync(join(root, 'node_modules', ...name.split('/'))).length
    return false
  } catch {
    return true
  }
})
check(missing.length === 0, 'runtime dependencies installed', missing.length === 0 ? `${runtimeDependencies.length} package(s)` : `missing: ${missing.join(', ')}`)

console.log('')
if (failures.length === 0) {
  console.log('[fork-state] OK: every check passed')
  process.exit(0)
}
console.error(`[fork-state] ${failures.length} check(s) failed: ${failures.join(', ')}`)
process.exit(1)
