# Tiller Budget Dashboard

A visual budget dashboard for Google Sheets, layered on top of a Tiller-connected
spreadsheet. Native charts and in-cell bars so it works in the Sheets mobile app,
plus one desktop-only Sankey.

**Tiller owns `Transactions`, `Categories`, `Balances`, `Balance History` and
`AutoCat`. This add-on reads them and never writes to them.** Every write path
calls `assertWritable_()` first, which throws on those five names. Tiller can
overwrite them daily without this project noticing or caring.

---

## Install

1. In your Tiller spreadsheet: **Extensions ▸ Apps Script**.
2. Create each file below and paste in its contents. File names matter —
   `SankeySidebar.html` is loaded by name.

   | Apps Script file | + type | What's in it |
   |---|---|---|
   | `Config.gs`      | Script | Every knob: the mock/live switch, palette, formats, layout |
   | `Lib.gs`         | Script | Read-only guard, source resolution, shared formula fragments |
   | `Setup.gs`       | Script | Orchestration, named ranges, the `_Calc` normalization layer |
   | `BudgetSetup.gs` | Script | The Budget Setup tab (non-destructive rebuilds) |
   | `ChartData.gs`   | Script | `_ChartData` — contiguous blocks the charts read |
   | `Dashboard.gs`   | Script | Cards, goal bars, category table, conditional formatting |
   | `Charts.gs`      | Script | The four native charts |
   | `Flags.gs`       | Script | Review queue + reconciliation |
   | `MockData.gs`    | Script | The mock Tiller tabs |
   | `Sankey.gs`      | Script | Server side of the Money Flow sidebar |
   | `Menu.gs`        | Script | The 💰 Budget menu |
   | `SankeySidebar.html` | **HTML** | The Sankey itself |

3. Save, then reload the spreadsheet. A **💰 Budget** menu appears.
4. **💰 Budget ▸ Generate mock Tiller data** (skip if Tiller is already connected
   and you set `USE_MOCK_DATA = false` — see below).
5. **💰 Budget ▸ Set up / refresh everything.** Grant the permissions it asks
   for; it takes 20–40 seconds.

You land on the Dashboard, pointed at the last complete month.

---

## The one-line switch

`Config.gs`, line ~20:

```js
var USE_MOCK_DATA = true;    // true → the "Mock ..." tabs.  false → Tiller's real tabs.
```

Flip it and run **Set up / refresh everything**. That is the whole migration.

It works because no formula anywhere names a source tab. Everything reads named
ranges and the `_Calc` layer, and setup just re-aims them. Not one formula,
chart, conditional format or data validation changes.

**💰 Budget ▸ Which data am I reading?** tells you which tabs are live right now,
and the Dashboard carries an orange `MOCK DATA` / green `LIVE TILLER` badge in
the top right so you can never mistake one for the other.

Column *order* doesn't matter either — setup finds each column by its header
name, so Tiller's real 16-column `Transactions` and the 10-column mock both work.
Optional columns (`Group`, `Class`, `Type`) degrade gracefully when absent.

---

## The tabs

### Budget Setup — yours

One row per category. Only columns A–C are editable:

| | |
|---|---|
| **A Category** | Dropdown sourced live from Tiller's `Categories` column, so new categories appear without re-running anything. |
| **B Bucket** | `fixed` · `variable` · `debt` · `savings`, plus `income` (auto-seeded onto every category Tiller types as Income) and `ignore` (drop it from every total). |
| **C Monthly Budget Target** | What the in-cell bars measure against. |

Columns D–G are read from Tiller: Group, Type, Hide From Reports, and a computed
**Counts in reports?**. A category counts unless Tiller hides it, Tiller calls it
a Transfer, or you left the bucket blank or set it to `ignore`.

Settings sit in `I3:J7` — monthly savings target, cumulative goal, goal label,
the account-name pattern that identifies your savings accounts, and your target
savings rate.

Setup pre-seeds a best-guess bucket for every category from Tiller's Type and
Group plus the category name. **Rebuilding never destroys your work** — buckets,
targets and settings are read back before the tab is rewritten and put back.

**💰 Budget ▸ Seed budget targets from 3-month average** fills any *blank* target
with that category's trailing 3-month average, then freezes them as plain numbers
so changing the month later can't move your budget.

### Dashboard — generated

Month dropdown in `B2`. Every visual reacts to it, with no script running: the
charts read `_ChartData`, whose cells are formulas keyed off that one cell.

- **Four big-number cards** — money in, money out, net, savings rate. Large,
  colour-coded, each with its delta against the 3-month average underneath.
- **Two savings-goal bars** — this month against your monthly target, and your
  real savings-account balance against your cumulative goal.
- **Four mini-stats** — net worth, total debt, savings balance, leftover.
- **Four native charts** (these render in the mobile app):
  1. stacked column — spend by bucket, 12 months ending at the selected month
  2. line — money in vs money out, with savings rate on a right-hand percent axis
  3. stacked bar — the selected month by category, biggest first, each bar in its
     bucket's colour
  4. line — debt balance per account plus a bold total, 12 months
- **Category table** — `Category · Bucket · Actual · ▮ vs target · Budget ·
  Over/Under · 3-mo avg · vs 3-mo avg · Last 12 months`. The bar is `REPT()`, the
  trend is `SPARKLINE()` coloured by bucket. Both are plain cells, so they render
  anywhere Sheets does.

### Flags — generated

Four blocks, each in its own column band so a spilling `QUERY` can grow freely:

1. **Transactions that map to nothing** — blank category, or a category not on
   Budget Setup. Excluded from every total until you map them.
2. **Categories missing from Budget Setup**, with a transaction count and the net
   amount at stake.
3. **Budget Setup rows to finish** — no bucket, or a spendable bucket with no
   target.
4. **Reconciliation.** Income + each bucket + deliberately-excluded + not-yet-mapped,
   summed, against the raw total of every transaction in the month. **The
   difference must be zero.** If it isn't, something is double-counted or dropped,
   and the banner at the top says so. Below it are four health checks that a sum
   can't catch (income categories in the wrong bucket, no savings categories at
   all, refund count, all-time unmapped count).

**💰 Budget ▸ Add missing categories to Budget Setup** appends everything block ②
is complaining about, with a best-guess bucket.

### `_Calc` and `_ChartData` — hidden machinery

`_Calc` is one normalized row per transaction, produced by eleven ARRAYFORMULAs:
month key, category, signed amount, bucket, Tiller type, counts flag, mapped
flag, positive-spend. Plus the balance history, sorted by date. `_ChartData`
holds the contiguous rectangles the native charts need, the sorted category
table, and the 12-month sparkline matrix.

You never need to open either. If you do, `_Calc` column `BA` documents its own
layout.

---

## Decisions baked in

| | |
|---|---|
| **Savings rate** | Both. The card headline is the **net** rate — `(money in − money out) ÷ money in` — which works before you've tagged anything. Underneath it, the **tagged** rate counts only categories bucketed `savings`, next to your target. |
| **Money out** | `fixed + variable + debt`. Savings contributions are tracked separately, so moving money to savings does not read as spending. `leftover = in − out − savings`. |
| **Savings goal** | Two bars. Monthly (tagged savings vs your monthly target) and cumulative (real savings-account balance vs your goal). |
| **Currency** | USD. It's four strings in `FMT` — see Customizing. |
| **Default month** | The last *complete* month. The newest month is usually part-spent (half the income booked, all the rent paid), and opening there makes a healthy month look like a disaster. The dropdown still offers every month, and the in-progress one carries a ⏳ note. |
| **3-month comparison** | The three months *before* the selected one, so the comparison means something. |
| **12-month windows** | Charts 1, 2, 4 and every sparkline end at the selected month, so they move with the dropdown too. |

## Behaviour

**Transfers and hidden categories are excluded.** A credit-card payment is a
Transfer: it moves money you already counted when you bought the groceries.
Counting it again would double your spend. Same for anything Tiller marks
`Hide From Reports`. Both are excluded from the buckets but still shown, as a
line, in the Flags reconciliation — excluded is not the same as disappeared.

**Refunds net against their own category.** A $50 grocery refund is a positive
amount in `Groceries`, and it reduces that month's grocery spend rather than
being dropped. A category *can* go negative for a month; that's a net refund, not
a bug, and it's formatted distinctly (blue, not green or red) so it reads as its
own thing. `REPT()` bars clamp at zero rather than erroring on a negative count.

**Conditional formatting.** Over budget is vermillion, under is bluish green —
they read as red and green to trichromats but stay distinguishable to everyone
else. Every colour cue is doubled with a ▲/▼ glyph, so nothing depends on hue
alone.

**Every total is a `SUMIFS` or `QUERY`** over full-column named ranges, and the
one layer that reads Tiller directly (`_Calc`) uses literal whole-column
references like `'Transactions'!A:A`. A whole-column reference in a formula is
unbounded and follows the sheet however far Tiller grows it. Nothing points at a
fixed `A2:A5000` that a daily sync could outgrow.

## Palette

Okabe–Ito, safe for deuteranopia, protanopia and tritanopia. One colour per
bucket, identical across all four charts, the in-cell bucket chips, the
sparklines and the Sankey.

| bucket | | hex |
|---|---|---|
| income | bluish green | `#009E73` |
| fixed | blue | `#0072B2` |
| variable | orange | `#E69F00` |
| debt | vermillion | `#D55E00` |
| savings | sky blue | `#56B4E9` |
| leftover | reddish purple | `#CC79A7` |

---

## Money Flow (desktop only)

**💰 Budget ▸ Money Flow (sidebar)** — income sources → Income → fixed /
variable / debt / savings / leftover, as a `google.visualization.Sankey`.
**Money Flow (large window)** is the same diagram with room to breathe, which is
what you want on a desktop; the sidebar is 300px and the labels get tight.

It needs an HTML context, so this one visual does **not** render in the Sheets
mobile app. That is exactly why everything else on the Dashboard is native charts
and in-cell `REPT`/`SPARKLINE`.

It has its own month picker (independent of the sheet, so you can compare without
disturbing the Dashboard), rolls income sources beyond seven into "Other income",
and reports two things a Sankey structurally cannot draw:

- **an overspent month** — there is no negative ribbon, so it omits Leftover and
  states the shortfall in words;
- **unmapped money** — anything without a bucket isn't in the diagram, and it
  says how much and points you at Flags.

---

## The mock data

`Mock Transactions` uses Tiller's schema and sign conventions: `Date,
Description, Category, Amount, Account, Institution, Month, Week, Full
Description, Transaction ID`, amounts negative for spend. It comes with matching
`Mock Categories`, `Mock Balances` (today's snapshot) and `Mock Balance History`
(monthly snapshots) — you need all four, or there is nothing for the bucket
logic, the debt chart or net worth to read.

Roughly **1,000 transactions over 15 months** across six accounts, generated from
a fixed seed, so regenerating gives you the same numbers back. A household with
about $9,000/month in and $6,800 out, saving $1,050 — landing near a 20% savings
rate so the card exercises its green, amber and red states as you page through
months.

It deliberately includes the awkward cases, so you can watch them being handled
rather than take it on trust:

- credit-card payments as Transfers, **both sides**, which must not double-count
- a `Reimbursable` category marked `Hide From Reports`, expensed and reimbursed
- refunds — positive amounts sitting in expense categories
- a few transactions with no category at all
- **`Mystery Subscription`** — a category that appears in Transactions but not in
  Categories. It exists to prove the Flags tab catches it.

Verified: every one of the 15 months reconciles to the cent.

---

## Customizing

Everything is in `Config.gs`.

- **Currency** — change the `$` in `FMT.money`, `FMT.moneyBig`, `FMT.moneySigned`
  and `FMT.delta`, then re-run setup. For `€1.234,56`, set the spreadsheet locale
  too (**File ▸ Settings**).
- **Palette** — `PALETTE`. Charts, chips, sparklines and the Sankey all read it.
- **More categories / rows / bars** — `LIMITS`: `setupRows` (300),
  `categoryRows` (60 shown on the Dashboard), `barCategories` (25 bars),
  `debtAccounts` (8 series), `trendMonths` (12), `barChars` (20).
- **Layout** — `DASH` holds the row of every section and `COL_WIDTHS` the column
  widths. The widths are picked so each card is exactly 300px *and* the table
  underneath still reads well; if you change one, check both.
- **Bucket guesses** — `guessBucket_()` in `BudgetSetup.gs`.

## Troubleshooting

**`#REF! — Array result was not expanded`** on `_Calc`. Tiller grew past the
space `_Calc` had. Run **Set up / refresh everything**; it resizes `_Calc` to the
source plus 2,000 spare rows.

**Charts look empty / `#NAME?` right after setup.** Formulas resolve as the named
ranges are created during the build. Give it a few seconds; if it persists, run
setup once more.

**A category's bar says "— no target —".** No `budget_target` on Budget Setup.
Set one, or use Seed budget targets from 3-month average.

**The savings goal bar reads 0%.** Nothing is bucketed `savings` yet — Flags
health check ③ tells you the same thing. The *net* savings rate on the card still
works regardless.

**Flags block ④ shows a non-zero difference.** Something is being counted twice —
usually a category Tiller types as Income that you put in a spend bucket. Health
check ② finds those.

**The debt chart is empty.** No `Balance History` tab and no `Balances` tab, or
no account looks like a liability. Debt is detected as: `Class = Liability` →
account `Type` matching credit/loan/mortgage → balance below zero, in that order.

**"Refusing to write to Transactions".** Working as designed. Something asked the
script to modify a Tiller tab and it declined.

## Known limits

- **Chart 4's account columns** are laid out at build time. Link a new debt
  account and run **Refresh dashboard** to pick it up.
- **The Sankey reads `_Calc` in one pass.** On a very large Transactions tab
  (20k+ rows) opening it takes a few seconds.
- **The category dropdown** on Budget Setup covers Tiller's `Categories` tab up
  to its current row count. Past a few hundred categories, re-run setup.
- **Sheets recalculates the whole workbook** when you change the month. On a
  large history expect a second or two before the charts settle.
