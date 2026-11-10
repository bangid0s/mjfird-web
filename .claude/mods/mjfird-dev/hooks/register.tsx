import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Check, CheckName, Checks, GitInfo, Repo } from '../types'

const PANE = 'mjfird-dev'
const TITLE = 'mjfird-web dev'
const ORDER: CheckName[] = ['lint', 'typecheck', 'test']
const ARGV: Record<CheckName, string[]> = {
  lint: ['npx', 'eslint', '.'],
  typecheck: ['npx', 'tsc', '--noEmit', '-p', '.'],
  test: ['npm', 'test', '--silent'],
}
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

const idle = (): Check => ({ status: 'idle', at: null, seconds: null, summary: 'not run yet' })
const emptyChecks = (): Checks => ({ lint: idle(), typecheck: idle(), test: idle() })
const emptyRepo = (): Repo => ({
  git: null,
  migrations: 0,
  latestMigration: '',
  hasNodeModules: false,
  refreshedAt: null,
})

// Change a tag when that value's fields change: an older stored value is then read as absent.
const checks = atom({ plugin: 'mjfird-dev', key: 'checks' } as const, emptyChecks(), { shape: 'checks-1' })
const repo = atom({ plugin: 'mjfird-dev', key: 'repo' } as const, emptyRepo(), { shape: 'repo-1' })
const isStale = atom({ plugin: 'mjfird-dev', key: 'isStale' } as const, false)

// ---------- parsing ----------

export function parseStatus(porcelain: string): Omit<GitInfo, 'lastCommit'> {
  const lines = porcelain.split('\n').filter(Boolean)
  const head = lines[0]?.startsWith('## ') ? lines.shift()!.slice(3) : ''
  const branch = (head.split('...')[0] ?? '').replace(/^No commits yet on /, '') || '(detached)'
  const ahead = Number(/ahead (\d+)/.exec(head)?.[1] ?? 0)
  const behind = Number(/behind (\d+)/.exec(head)?.[1] ?? 0)

  return { branch, ahead, behind, changed: lines }
}

export function summarize(name: CheckName, exitCode: number, out: string): string {
  const text = out.replace(/\x1b\[[0-9;]*m/g, '')
  if (name === 'lint') {
    const m = /✖ (\d+ problems? \([^)]*\))/.exec(text)
    return m?.[1] ? m[1] : exitCode === 0 ? 'no problems' : lastLine(text)
  }
  if (name === 'typecheck') {
    const errors = (text.match(/error TS\d+/g) ?? []).length
    return exitCode === 0 ? 'no type errors' : errors > 0 ? `${errors} type error${errors === 1 ? '' : 's'}` : lastLine(text)
  }
  const pass = /^# pass (\d+)/m.exec(text)?.[1]
  const fail = /^# fail (\d+)/m.exec(text)?.[1]
  if (pass !== undefined || fail !== undefined) return `${pass ?? 0} passed, ${fail ?? 0} failed`
  return exitCode === 0 ? 'passed' : lastLine(text)
}

function lastLine(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return (lines[lines.length - 1] ?? 'failed').slice(0, 120)
}

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

// ---------- work ----------

async function refreshRepo($: EngineInterface): Promise<void> {
  const [status, log, ls, nm] = await Promise.all([
    $.process.run(['git', 'status', '--porcelain=v1', '-b']),
    $.process.run(['git', 'log', '-1', '--format=%h %s']),
    $.process.run(['ls', 'supabase/migrations']),
    $.process.run(['test', '-d', 'node_modules']),
  ])
  const migrations = ls.exitCode === 0 ? ls.stdout.split('\n').filter(f => f.endsWith('.sql')).sort() : []
  const git: GitInfo | null =
    status.exitCode === 0 ? { ...parseStatus(status.stdout), lastCommit: log.stdout.trim() } : null
  const now = await $.clock.now()

  await update($, repo, () => ({
    git,
    migrations: migrations.length,
    latestMigration: migrations[migrations.length - 1] ?? '',
    hasNodeModules: nm.exitCode === 0,
    refreshedAt: now,
  }))
}

let isRunning = false

async function runChecks($: EngineInterface): Promise<void> {
  if (isRunning) return
  isRunning = true
  try {
    await update($, isStale, () => false)
    const { hasNodeModules } = await read($, repo)
    if (!hasNodeModules) {
      await update($, checks, list => {
        const next = { ...list }
        for (const name of ORDER) next[name] = { ...idle(), summary: 'node_modules missing: run npm install' }
        return next
      })
      return
    }
    await update($, checks, list => {
      const next = { ...list }
      for (const name of ORDER) next[name] = { ...list[name], status: 'running' }
      return next
    })
    for (const name of ORDER) {
      const started = await $.clock.now()
      let check: Check
      try {
        const r = await $.process.run(ARGV[name], { timeoutMs: 600_000 })
        const ended = await $.clock.now()
        check = {
          status: r.exitCode === 0 ? 'pass' : 'fail',
          at: ended,
          seconds: Math.round((ended - started) / 1000),
          summary: summarize(name, r.exitCode, `${r.stdout}\n${r.stderr}`),
        }
      } catch (err) {
        check = { status: 'fail', at: await $.clock.now(), seconds: null, summary: `could not run: ${String(err).slice(0, 100)}` }
      }
      await update($, checks, list => ({ ...list, [name]: check }))
    }
    const done = await read($, checks)
    const failed = ORDER.filter(n => done[n].status === 'fail')
    $.ui.status(failed.length ? `mjfird: ${failed.join(', ')} failing` : undefined)
  } finally {
    isRunning = false
  }
}

const later = ($: EngineInterface, fn: () => Promise<void>) => {
  $.clock.after(0, () => void fn())
}

// ---------- hooks ----------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'dev', description: 'Open the mjfird-web dev dashboard pane' })
    await $.command.register({ name: 'dev-check', description: 'Run lint, typecheck and tests for mjfird-web' })
    void $.ui.open({ id: PANE, title: TITLE })
    later($, () => refreshRepo($))

    return next(e)
  })

  on('command.run', { command: 'dev' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    later($, () => refreshRepo($))

    return { text: 'mjfird-web dev pane opened.' }
  })

  on('command.run', { command: 'dev-check' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    later($, async () => {
      await refreshRepo($)
      await runChecks($)
    })

    return { text: 'Running lint, typecheck and tests; results appear in the dev pane.' }
  })

  // After every edit or shell command: refresh git, and mark checks stale on edits.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    try {
      if (EDIT_TOOLS.has(e.tool)) await update($, isStale, () => true)
      if (EDIT_TOOLS.has(e.tool) || e.tool === 'Bash') later($, () => refreshRepo($))
    } catch {
      // The dashboard is best effort: never let it disturb a tool call.
    }

    return ran
    // A failed hook must not block the tool: hand the call on (as the engine's tool-call example does).
  }).catch(($, e, next) => next(e))

  // When a turn that edited files ends, re-run the checks in the background.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (await read($, isStale)) {
      later($, async () => {
        await refreshRepo($)
        await runChecks($)
      })
    }

    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const r = await read($, repo)
    const c = await read($, checks)
    const stale = await read($, isStale)
    const now = await $.clock.now()
    const room = Math.max(3, (e.viewport?.rows ?? 30) - 18)
    const git = r.git
    const nextNum = String(r.migrations + 1).padStart(4, '0')

    const mark = (s: Check['status']) =>
      s === 'pass' ? '✓' : s === 'fail' ? '✗' : s === 'running' ? '…' : '·'
    const color = (s: Check['status']) =>
      s === 'pass' ? 'green' : s === 'fail' ? 'red' : s === 'running' ? 'yellow' : undefined

    return (
      <Box flexDirection="column">
        <Text bold>Git</Text>
        {git === null ? (
          <Text dimColor>not a git repo, or git failed</Text>
        ) : (
          <Box flexDirection="column">
            <Text>
              {git.branch}
              <Text dimColor>
                {' '}
                ↑{git.ahead} ↓{git.behind}
              </Text>
            </Text>
            <Text dimColor>{git.lastCommit.slice(0, 70)}</Text>
            {git.changed.length === 0 ? (
              <Text dimColor>working tree clean</Text>
            ) : (
              <Box flexDirection="column">
                <Text>{git.changed.length} changed file{git.changed.length === 1 ? '' : 's'}</Text>
                {git.changed.slice(0, room).map(line => (
                  <Text dimColor>  {line}</Text>
                ))}
                {git.changed.length > room && <Text dimColor>  … {git.changed.length - room} more</Text>}
              </Box>
            )}
          </Box>
        )}

        <Text> </Text>
        <Text bold>Supabase migrations</Text>
        <Text>
          {r.migrations} files<Text dimColor> · latest {r.latestMigration || 'none'}</Text>
        </Text>
        <Text dimColor>next: {nextNum}_&lt;name&gt;.sql</Text>

        <Text> </Text>
        <Text bold>
          Checks{stale && <Text color="yellow"> (files changed since last run)</Text>}
        </Text>
        {!r.hasNodeModules && r.refreshedAt !== null && (
          <Text color="yellow">node_modules missing: run npm install first</Text>
        )}
        {ORDER.map(name => {
          const check = c[name]
          return (
            <Text>
              <Text color={color(check.status)}>{mark(check.status)}</Text> {name.padEnd(9)}
              <Text dimColor>
                {check.status === 'running' ? 'running…' : check.summary}
                {check.at !== null && check.status !== 'running' ? ` · ${ago(now - check.at)}` : ''}
                {check.seconds !== null && check.status !== 'running' ? ` (${check.seconds}s)` : ''}
              </Text>
            </Text>
          )
        })}

        <Text> </Text>
        <Box>
          <Button
            key="run"
            hotkey="r"
            variant="primary"
            label="Run checks"
            onPress={() =>
              later($, async () => {
                await refreshRepo($)
                await runChecks($)
              })
            }
          />
          <Text> </Text>
          <Button key="refresh" hotkey="g" label="Refresh git" onPress={() => later($, () => refreshRepo($))} />
        </Box>
      </Box>
    )
  })
}
