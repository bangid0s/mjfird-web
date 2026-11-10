# mjfird-dev

A Claude Code mod for working on mjfird-web. It opens a **dev dashboard pane** beside the chat:

- **Git**: current branch, commits ahead/behind the remote, last commit, changed files. Refreshes after every edit or shell command Claude runs.
- **Supabase migrations**: how many files are in `supabase/migrations`, the latest one, and the next number to use (`00NN_<name>.sql`).
- **Checks**: lint (`npx eslint .`), typecheck (`npx tsc --noEmit -p .`) and tests (`npm test`). They re-run in the background when a turn in which Claude edited files ends. A failure also shows in the status line.

Commands:

- `/dev`: open (or reopen) the pane.
- `/dev-check`: run all checks now. The pane's **Run checks** button (hotkey `r`) does the same; **Refresh git** is `g`.

The checks need `node_modules`: run `npm install` first.

## Install

At the Claude Code prompt, opened in this repository:

```
/plugin install mjfird-dev --marketplace bangid0s/mjfird-web
```

Answer `y` to add the marketplace, then pick a scope (project is a good fit).

Or load it straight from the folder for one session:

```bash
claude --plugin-dir .claude/mods/mjfird-dev
```

## Developing it

```bash
claude plugin validate .claude/mods/mjfird-dev
```

```bash
claude plugin test .claude/mods/mjfird-dev
```

`.claude-plugin/types/` is written by Claude Code when the mod loads and is git-ignored.
