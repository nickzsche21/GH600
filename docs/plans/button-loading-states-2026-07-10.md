# GH600 — Button Loading States for Async Click Paths (2026-07-10)

## Context

Six click paths in `app.js` `await` a network request before anything on screen
changes. To the user the button looks dead, then the UI jumps — a modal appears
from nowhere, or the page redirects to Gumroad without warning. This reads as
"it's broken" on exactly the two clicks that carry revenue: **"Continue to
founding access"** and **"Unlock Pro lab"**.

Nothing here touches pricing, entitlements, or any server surface. The change is
confined to `app.js`, `styles.css`, three small `index.html` edits, and
`tests/static.test.js`. No new analytics events, so rule #4 in `CLAUDE.md` does
not apply.

**Surfaces touched:** `app.js` (loader helper + six call sites + `apiRequest`
timeout), `styles.css` (`.spinner`, `.button.is-loading`), `index.html`
(`#pro-gate-error` element), `tests/static.test.js`.

---

## The dead-time inventory (verified against current code)

| # | Path | Where | Current feedback | Awaited request(s) |
|---|---|---|---|---|
| A | "Member access" → Pro gate | `app.js:590-599`, buttons at `index.html:27,255` | **none** | `/access/session` |
| B | "Unlock Pro lab" | `app.js:602-619` | **none** | `/access/verify` |
| C | "Continue to founding access" | `app.js:530-560` | partial | `/lead` **then** `/checkout-intent`, then `location.assign` |
| D | Mock picker tiles | `app.js:575-578` → `startProLab` `app.js:305-324` | **none** | `/scenarios/progress` **then** `/scenarios/next` |
| E | "Restart from scratch" | `app.js:312-319` | **none** | `/scenarios/reset` |
| F | "Save report" (issue form) | `app.js:624-633` | **none** | `/issue-report` |

Three findings beyond the missing spinners:

1. **`openProGate()` awaits before `showModal()`** (A). The dialog cannot open
   until `/access/session` resolves. Nothing is disabled, so a second click
   fires a second request.

2. **The Pro-gate error clobbers its own markup** (B). The failure branch does
   `$("#pro-gate-message").textContent = "…"`, which destroys the
   `.important-asterisk` span and the `<p>` inside that div
   (`index.html:302-305`). The license-key hint never comes back, and the error
   inherits the hint's styling.

3. **`apiRequest` has no timeout** (`app.js:73-87`). A stalled fetch would leave
   any loader we add spinning forever with its button permanently disabled. This
   must be fixed *first* or the cure is worse than the disease.

`#access-form` (C) already disables the submitter and swaps its label to
"Preparing checkout… ", but it reads the button from `event.submitter`, which is
`null` under `form.requestSubmit()` — then there is no feedback at all across
two sequential round trips and a hard navigation.

---

## Phase 1 — Bound the requests

`apiRequest` gets an `AbortController` with a ~12s timeout. On abort it returns
`null`, which is **the same value it already returns for network errors**
(`app.js:83-86`), so every caller's fallback branch behaves identically. This is
what makes it safe to disable a button on click: the promise is guaranteed to
settle.

## Phase 2 — The loader primitives

`styles.css`: a `.spinner` keyframe plus `.button.is-loading` rules
(`pointer-events: none`, dimmed), and a `prefers-reduced-motion` branch that
drops the animation.

Every affected button already ends with a `<span>→</span>` arrow, so
`.is-loading > span { display: none }` swaps the arrow for the spinner **in
place**. No `innerHTML` surgery, and nothing fights `updatePlanFields()`'s
`action.firstChild.textContent` writes (`app.js:519`).

`app.js`: a `setButtonLoading(button, text)` / `clearButtonLoading(button)` pair
that stashes the original label in a `WeakMap`, sets `disabled` and
`aria-busy="true"`.

## Phase 3 — Wire it into the six paths

Every `await` wrapped in `try/finally` so a thrown error can never leave a button
permanently dead.

- **A — `[data-open-pro]`**: loading on the clicked button across
  `/access/session`; re-entrancy guard so double-clicks don't double-fetch.
- **B — `#pro-gate-form`**: loading on submit. Separately, add a dedicated
  `<p id="pro-gate-error">` to `index.html` so the hint markup survives an
  error, and clear it on retry.
- **C — `#access-form`**: resolve the submitter as
  `event.submitter || form.querySelector("button[type=submit]")`; spinner across
  both round trips; swap the label to "Redirecting to checkout…" immediately
  before `location.assign`, so the navigation is announced rather than sudden.
- **D — `[data-mock]`**: keep `#pro-area-dialog` **open** with the clicked tile
  in a loading state; close it only once `quizDialog.showModal()` is about to
  run. Then render a skeleton into `quizBody` before `renderNextProScenario()`
  awaits `/scenarios/next`, so the quiz shell is never empty.
- **E — `#mock-resume-restart`**: loading across `/scenarios/reset`.
- **F — `#issue-form`**: loading across `/issue-report`.

`#report-email-form` (`app.js:462-474`) already swaps its label to "Saving…" but
runs three sequential awaits behind it; fold it into the same helper for
consistency.

## Phase 4 — Tests

Extend `tests/static.test.js` with a check that each async submit handler routes
through `setButtonLoading`. The suite already greps `app.js` for revenue-endpoint
calls (`static.test.js:44`), so this follows the established pattern rather than
introducing a DOM test harness.

---

## Open decision

For the checkout redirect (C), this plan uses a **button-level label swap**, not
a full-screen "Redirecting…" overlay. The overlay reads as more polished but adds
a modal state to unwind if `location.assign` is slow or the user hits back.
Revisit if the redirect measurably feels slow in practice.
