export type CheckName = 'lint' | 'test' | 'typecheck'
export type CheckStatus = 'idle' | 'running' | 'pass' | 'fail'
export type Check = {
  status: CheckStatus
  at: number | null
  seconds: number | null
  summary: string
}
export type Checks = Record<CheckName, Check>
export type GitInfo = {
  branch: string
  ahead: number
  behind: number
  changed: string[]
  lastCommit: string
}
export type Repo = {
  git: GitInfo | null
  migrations: number
  latestMigration: string
  hasNodeModules: boolean
  refreshedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'mjfird-dev': {
      checks: Shaped<Checks>
      repo: Shaped<Repo>
      isStale: boolean
    }
  }
}
