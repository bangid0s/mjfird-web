import { expect, test } from 'claude-code/testing'

import { parseStatus, summarize } from '../hooks/register'

const PANE = {
  plugin: 'mjfird-dev',
  component: 'Pane',
  requestId: 'mjfird-dev',
  props: {
    title: 'mjfird-web dev',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('parses git status and check output', async () => {
  const s = parseStatus('## claude/x...origin/claude/x [ahead 2, behind 1]\n M src/a.ts\n?? b.ts\n')
  expect(s.branch).toBe('claude/x')
  expect(s.ahead).toBe(2)
  expect(s.behind).toBe(1)
  expect(s.changed.length).toBe(2)
  expect(summarize('test', 1, '# pass 10\n# fail 2\n')).toBe('10 passed, 2 failed')
  expect(summarize('typecheck', 2, 'a.ts(1,1): error TS2532: x\nb.ts(2,2): error TS2322: y')).toBe('2 type errors')
  expect(summarize('lint', 1, '✖ 3 problems (1 error, 2 warnings)')).toBe('3 problems (1 error, 2 warnings)')
  expect(summarize('lint', 0, '')).toBe('no problems')
})

test('the pane shows git, migrations and checks after a session starts', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: 1_000_000 }))
  on('clock.after', () => ({ value: undefined }))
  on('process.run', (_, e) => {
    const cmd = e.argv.join(' ')
    if (cmd.startsWith('git status'))
      return { value: { exitCode: 0, stdout: '## main...origin/main\n M src/app/page.tsx\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    if (cmd.startsWith('git log'))
      return { value: { exitCode: 0, stdout: 'abc1234 Add reviews\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    if (cmd.startsWith('ls'))
      return { value: { exitCode: 0, stdout: '0001_init.sql\n0002_more.sql\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'dev' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /^main/ }))?.text).toContain('main')
    expect((await ui.find({ type: 'Text', text: /changed file/ }))?.text).toBe('1 changed file')
    expect((await ui.find({ type: 'Text', text: /next:/ }))?.text).toBe('next: 0003_<name>.sql')
    expect((await ui.find({ type: 'Text', text: /typecheck/ }))?.text).toContain('not run yet')
    expect(await ui.find({ type: 'Button', key: 'run' })).toBeDefined()
    await ui.unmount()
  }
})
