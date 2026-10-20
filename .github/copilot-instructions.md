# Copilot Instructions

## Token & Operation Economy
- Read/scan only files directly relevant to the current task — don't
  traverse the whole repo when the change is scoped to one route/service.
- Show targeted diffs or the changed function only, not full unchanged
  files, unless a full new file is genuinely being created.
- Stop as soon as the task is complete — no speculative extra edits,
  no unrequested refactors, no exploratory commands once the fix/feature
  is verified working.
- When context is unclear, state the assumption made in one line and
  proceed, rather than a multi-question back-and-forth.

## Chat Response Format — minimize prose, prioritize code
- Default output is code. Do not summarize the code back in chat prose
  after showing it — the code is the answer.
- No preamble ("Sure, here's...", "I'll now...", "Let me..."). Start
  directly with the code or the diff.
- No closing summary, no "let me know if you need anything else," no
  restating what was changed after the code block is already shown.
- Put edge-case notes as inline code comments at the exact line they
  apply to, not as a separate chat explanation.

### New feature
- Output: code only.
- Zero chat explanation, unless a design decision was genuinely
  ambiguous and a silent assumption would be risky — then one line
  stating the assumption, nothing more.
  
### Bug fix
- Output: code + a maximum 2-line chat explanation covering only:
  (1) root cause, (2) how the fix addresses it.
- No restating the original bug, no walkthrough of the surrounding code,
  no "this should now work correctly" filler.