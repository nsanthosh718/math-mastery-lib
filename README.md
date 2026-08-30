# MathTrack

A three-month, week-gated math curriculum for two children in one household — a
kindergartener and a fifth grader — with self-checking answer keys that show
worked reasoning, progress tracking, and pluggable accountability rules.

Sibling app to BlueTracker: per-user profiles, weekly structured content,
mobile-friendly single-page React app, no backend required.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 84 tests
npm run build
```

## The pedagogy comes first

The target ratio is **80% cognitive/reasoning work, 20% direct instruction**, and
the content is built to hit it. A test enforces the balance, so the ratio cannot
quietly drift as weeks are edited.

| Track | Weeks | Problems | Reasoning | Direct instruction |
|---|---|---|---|---|
| Kindergarten | 12 | 61 | 80.3% | 19.7% |
| Grade 5 (accelerated) | 12 | 63 | 81.0% | 19.0% |

What that means concretely in the content:

- Every week contains at least one *explain your thinking*, *solve it two ways*,
  or open exploration problem — also enforced by a test.
- Answer keys give **multiple valid approaches with worked steps**, not a final
  number. Most also name the approach that shows the deepest understanding.
- Every key carries a `lookFor` field (what a parent should listen for in the
  child's explanation) and a `misconception` field (the specific wrong turn to
  expect, and how to address it without just correcting).
- Error-analysis problems ask the child to find and diagnose a mistake, which
  cannot be pattern-matched to a procedure.
- Mental-math strategies (compensation, number bonds, estimate-then-check,
  benchmark comparison) are attached to each week rather than siloed.
- Bar models are used throughout both tracks, per Singapore Math, and the
  kindergarten track follows Concrete → Pictorial → Abstract explicitly.

The two tracks are deliberately linked: the kindergartener's "bigger unit means
a smaller count" measurement week is the same idea the fifth grader meets as
unit rate and map scale, and the answer keys say so.

### Curriculum shape

**Kindergarten** — counting with meaning and conservation → number bonds to 5 →
bonds to 10 → comparing by matching → the number line → *review + patterns* →
shape attributes → addition as joining → subtraction's two meanings → teen
numbers as ten-and-some-more → measurement with units → *review*.

**Grade 5, accelerated toward 7th-grade readiness** — fraction sense by
benchmarks → adding/subtracting unlike fractions → multiplying fractions and area
models → *cumulative review 1* → dividing with fractions → decimals as fractions
→ decimal operations by estimation → *cumulative review 2* → ratios →
unit rates and percent → variables and expressions → *cumulative review 3:
equations, volume, everything*.

Cumulative review lands at weeks 4, 8 and 12 (enforced by a test). Geometry and
measurement are woven into problems — area models in week 3, perimeter and area
with decimals in week 7, scale in week 10, volume in week 12 — rather than
taught as a separate unit.

## App behaviour

**Profiles.** Two child profiles with independent progress, plus a parent view.
Names and tracks are editable in parent settings.

**Weekly gating.** Week N opens only when *both* hold: its scheduled release date
has arrived (start date + cadence, default weekly), and week N-1 has been
completed. A parent can override any single week, bypassing both checks for that
week only.

**Completion.** A problem counts toward completion only when it was **attempted
and then reviewed against the key** — revealing the key without attempting does
not count. The default threshold is 80% of a week's problems, configurable.

**Answer-key reveal.** Keys are hidden per problem, behind a two-step reveal: the
child marks that they had a go, then confirms they committed to an answer before
the worked reasoning appears. After reviewing, they log a self-check
(*Got it / Partly / Not yet*).

**Accountability rules.** A rule engine produces events; consuming them is a
separate decision, which is what makes new rules drop-in. Four ship built in:

| Rule | Default | Fires when |
|---|---|---|
| `overdue-week` | on | An open week passes its due date unfinished; escalates to `alert` at a week late |
| `due-soon` | on | A week is within the reminder window and not yet done |
| `inactivity` | on | No work recorded for N days; escalates when the gap doubles |
| `privilege-hold` | **off** | A week is overdue beyond the grace period — marks the parent-named privilege on hold |

`privilege-hold` is the hook for "restrict a privilege the parent manages
elsewhere". It only emits an event describing the hold; wiring it to a real
screen-time control is the integration point, and that rule is where the call
would go. It ships **off** so nothing is ever restricted without the parent
opting in.

A rule that throws is caught and reported as a notice rather than taking the
dashboard down, so a custom rule cannot break the app.

**Progress tracking.** Weeks completed, current and longest streak, consistency
(share of days worked since start), time on task, and a per-week **reasoning
quality** rating the parent logs by hand after reading the child's explanations.
That rating is deliberately never computed — nothing in the app can tell whether
a child understood, only whether they clicked.

## Architecture

```
src/
  data/curriculum/       kindergarten.json, grade5.json, index.js (registry)
  lib/                   pure logic, fully unit-tested
    dates.js             UTC-safe 'YYYY-MM-DD' arithmetic
    progress.js          per-problem records, week and track completion
    gating.js            release dates, due dates, unlock decisions
    streak.js            streak, longest streak, consistency
    rules.js             pluggable consequence engine + built-in rules
    state.js             state shape, defaults, reducer
    storage.js           persistence seam (localStorage + in-memory adapters)
  state/AppContext.jsx   provider: load once, persist on change, derive views
  components/            ProfilePicker, ChildHome, WeekView, ProblemCard,
                         ParentDashboard
  styles/app.css         design tokens at the top; restyling is one block
tests/                   84 tests
```

All curriculum content lives in the two JSON files. Editing a week, or adding a
third track, needs no component changes — drop in a JSON file with the same
shape and register it in `src/data/curriculum/index.js`.

Progress is keyed by problem id, so curriculum content can be edited under saved
progress without invalidating it.

### Adding a rule

```js
// src/lib/rules.js
export const weekendCatchupRule = {
  id: 'weekend-catchup',
  label: 'Weekend catch-up',
  description: 'Suggests a Saturday session when the week is behind.',
  defaultEnabled: false,
  evaluate({ child, today, gates, progressByWeek }) {
    // return an event, an array of events, or null
  },
};
```

Add it to `BUILT_IN_RULES` and it appears in parent settings automatically.

### Hooking up real persistence

Everything goes through a three-method interface (`load`, `save`, `clear`), so
moving off localStorage means writing one adapter and passing it to
`AppProvider`. Notes on keying and migration are in `src/lib/storage.js`.

## Assumptions made

Flagged rather than asked, per the brief:

- **BlueTracker's source was not available in this repo**, so the visual style is
  an interpretation of the description — mobile-first, card-based, single blue
  accent, generous tap targets. All design tokens sit at the top of
  `src/styles/app.css` so matching the real thing is a one-block edit.
- **"4-5 short problem sets" per kindergarten week** is implemented as one themed
  set of 5-6 problems per week, each intended as a short sitting, rather than 4-5
  separate sets of several problems each. That keeps a kindergarten session at
  15-20 minutes; the JSON shape supports splitting a week further if wanted.
- **Time on task** is stored per problem and surfaced on the parent dashboard,
  but nothing currently writes to it — no timer is wired into the UI, since
  auto-timing a child who wanders off produces misleading numbers. The reducer
  action (`add-time`) and the display are in place for whichever trigger you
  prefer.
- **Completion is self-reported.** The app cannot check whether a child actually
  worked a problem; the gate measures engagement with the material, and the
  parent's reasoning rating is what measures understanding.
- **No authentication.** Any profile can be opened from the picker, including the
  parent view. For two children on a shared family device this is the right
  trade-off; a PIN on the parent view would be the first thing to add if not.
- **The privilege-hold rule does not talk to anything.** It emits an event; no
  external API is called, and no app is actually restricted.
