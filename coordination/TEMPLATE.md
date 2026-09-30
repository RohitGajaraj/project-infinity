---
from: kiro             # kiro | supervisor
to: lovable            # lovable | founder | supervisor
type: lovable-task     # secret | publish | lovable-task | question | decision | proposal
status: open           # supervisor sets: relayed | done | blocked | needs-founder
                       # proposals: proposed -> approved | rejected (founder decides)
commit: <sha>          # the commit this request depends on
---

## Ask

What must happen, in one paragraph. Name secrets; never include their values.

## Why

What it unblocks, and a DIRECTION.md or README.md section if there is one.

## Acceptance

How the supervisor proves it is done: a read-only SQL probe, an HTTP check against the preview or
production, or a script such as `bun run e2e:identity`.

## Result

_Filled by the supervisor._
