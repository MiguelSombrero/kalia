# The child brief

The standard brief every child session of [`implement-iteration`](SKILL.md)
gets, so none improvises its own process. The orchestrator's prompt points at
this file and adds only what differs: the task file, the files other in-flight
tasks name, its weight (heavy or cheap, and whether it needs the emulator), the
tasks whose merge it waits for, and the orchestrator's session id. Each rule
carries its reason, because a child that knows why applies it at the edge.

**You are a child of an orchestrating session.** Do exactly the task you were
given; list anything else you notice as a follow-up in your report.

## The task

- **Invoke `implement-task`** on the task file you were named, and follow it:
  every rule in it binds you. A `design` task is never delegated.
- **Where from:** a worktree off a freshly fetched `origin/dev`, on branch
  `iteration-N/<topic>` (the `worktree` skill). **Tell the orchestrator which
  worktree you work in, in chat only**: its directory name does not match the
  task, and worktrees are recycled after a merge. Never write the path in a
  commit, a pull request or a file.
- **Overlaps:** do not touch a file the orchestrator names as another task's,
  and wait for the tasks whose merge it names.
- **Do not edit iteration status.** `docs/roadmap.md` rows and "What each
  iteration built" belong to the opening and closing pull requests; a task pull
  request that touches them is sent back.

## Keeping the branch current

- **The opening pull request may not have merged yet.** If `make verify-fast`
  fails only on the roadmap row, wait for the orchestrator's word, merge
  `origin/dev` and push; do not edit the row.
- **Merge `origin/dev` as a plain merge. Never force-push, never rebase**, and
  never rebase a Dependabot branch: a rewrite replaces commits a reviewer has
  already read, and a force-push can overwrite another session's push.
- **Run a gate alone, read its exit status, and only then push**, as a separate
  command. A push chained after `make verify-fast` went out once with the gate
  red.
- **When the orchestrator says `dev` is red, or to hold:** do not fix it in your
  pull request and do not push. Two sessions' copies of one fix conflict. Merge
  `dev` when told it is green.

## The pull request

- **Fill the body from `docs/PULL_REQUEST_TEMPLATE.md`**, keeping its bold
  Gates labels as written, **one verdict on each label's own line**.
  `scripts/check-pr-body.mjs` reads only that line: a body that said the same in
  other words failed `Gates filled in and deferrals filed` on the first pull
  request of 11.5. Draft the body in the scratchpad, outside the repository.
- **No screenshot, absolute path or host name** in a commit, a pull request or a
  comment (`CLAUDE.md`).
- **No deferral without an ID.** "Follow-up" or "new task" appears only with the
  quality-backlog ID filed in this pull request (`implement-task` step 8).
  **A promise to do something "once task N has merged" is a deferral too**: file
  it, or wait for task N and do it now. One lost that way (task 14's lint ban)
  needed a pull request of its own.
- **A criterion only a person can give** (the product owner on the phone, a
  fresh-session run) is named with its owner in the pull request, and the task
  stays `refined`: ticking it after the merge costs the extra pull requests that
  task 15 took (#679, then #686 and #693). If the orchestrator says the check is
  done before the merge, tick it and set `done` in this pull request.

## Checks and Auto-fix

- **Start no background watcher**: no `gh pr checks --watch`, no polling loop,
  no "watcher" task. Read the checks once, report, end the turn. Every later
  exit of a watcher wakes the orchestrator for nothing.
- **Say in your report if a check was still pending** when you read it.
- **Auto-fix:** after opening the pull request, `get_status`, `bind_pr` with the
  URL if it does not report it, then `set_monitor` with `auto_fix: true` and the
  URL. If the call is denied, say so in the report and do not retry or ask the
  product owner: the orchestrator decides what to do about it.

## Asking and reporting

- **Ask the orchestrator, not the product owner.** One short question by
  `SendMessage` to its session id, then end the turn.
- **The report:** the pull request link first, then each gate's verdict, each
  criterion ticked or its named owner, whether Auto-fix is on, and anything the
  orchestrator must tell the product owner. The orchestrator verifies it from
  the pull request; the report is not the proof.
