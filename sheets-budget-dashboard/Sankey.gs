/**
 * Sankey.gs
 * ---------------------------------------------------------------------------
 * The desktop extra: a Money Flow diagram showing income sources fanning into
 * fixed / variable / debt / savings / leftover.
 *
 * google.visualization.Sankey needs an HTML context, so this one visual cannot
 * be native and will not render in the Sheets mobile app — which is exactly why
 * everything else on the Dashboard is native charts and in-cell REPT/SPARKLINE.
 *
 * Server side only reads. It aggregates `_Calc` in memory and hands the sidebar
 * a small JSON payload.
 */

/** Open the Sankey in the right-hand sidebar. */
function showSankeySidebar() {
  var t = HtmlService.createTemplateFromFile('SankeySidebar');
  t.mode = 'sidebar';
  SpreadsheetApp.getUi().showSidebar(
    t.evaluate().setTitle('Money Flow'));
}

/** Open the same diagram in a window with room to breathe. */
function showSankeyDialog() {
  var t = HtmlService.createTemplateFromFile('SankeySidebar');
  t.mode = 'dialog';
  SpreadsheetApp.getUi().showModelessDialog(
    t.evaluate().setWidth(940).setHeight(660), 'Money Flow');
}


/**
 * Aggregate one month into Sankey nodes and links.
 *
 * @param {string=} monthKey "yyyy-mm". Defaults to the Dashboard's selection.
 * @return {Object} payload for the sidebar. Never throws; on any problem it
 *     comes back with `error` set so the sidebar can say something useful.
 */
function getSankeyData(monthKey) {
  try {
    var ss = SpreadsheetApp.getActive();
    var sel = ss.getRangeByName('SelMonth');
    var month = String(monthKey || (sel ? sel.getValue() : '') || '').trim();

    var months = readListName_(ss, 'MonthList', 500);
    if (!month) month = months.length ? months[0] : '';
    if (!month) return { error: 'No months found. Run setup first.' };

    var agg = aggregateMonth_(ss, month);
    if (agg.income <= 0 && agg.out <= 0) {
      return { month: month, monthLabel: monthLabel_(month), months: months,
               error: 'Nothing recorded in ' + monthLabel_(month) + '.' };
    }

    // Every dollar in has to go somewhere. Sankey cannot draw a negative flow,
    // so an overspent month shows the buckets it can and reports the shortfall
    // rather than silently rebalancing itself.
    var leftover = agg.income - agg.out - agg.savings;
    var overspent = leftover < 0 ? -leftover : 0;
    if (leftover < 0) leftover = 0;

    var links = [];
    var colours = {};
    // Shades around the income green, none of them exactly PALETTE.income —
    // otherwise the first source ribbon is indistinguishable from the Income
    // node it flows into.
    var greens = ['#1FA37F', '#3FBF9B', '#0F8A6E', '#66C2A5',
                  '#046A50', '#7FD3B8', '#2E8B72', '#8FD6C2'];

    agg.sources.forEach(function (s, i) {
      links.push([s.name, 'Income', round2_(s.amount)]);
      colours[s.name] = greens[i % greens.length];
    });
    colours['Income'] = PALETTE.income;

    [['Fixed', agg.fixed, PALETTE.fixed],
     ['Variable', agg.variable, PALETTE.variable],
     ['Debt', agg.debt, PALETTE.debt],
     ['Savings', agg.savings, PALETTE.savings],
     ['Leftover', leftover, PALETTE.leftover]
    ].forEach(function (b) {
      colours[b[0]] = b[2];
      if (b[1] > 0.005) links.push(['Income', b[0], round2_(b[1])]);
    });

    // Google Charts colours nodes in order of first appearance across the rows,
    // so derive that order here rather than guessing at it in the browser.
    var order = [], seen = {};
    links.forEach(function (l) {
      [l[0], l[1]].forEach(function (n) {
        if (!seen[n]) { seen[n] = true; order.push(n); }
      });
    });

    return {
      month: month,
      monthLabel: monthLabel_(month),
      months: months,
      links: links,
      nodeColours: order.map(function (n) { return colours[n] || PALETTE.neutral; }),
      overspent: round2_(overspent),
      unmapped: round2_(agg.unmapped),
      excluded: round2_(agg.excluded),
      totals: {
        income:   round2_(agg.income),
        out:      round2_(agg.out),
        fixed:    round2_(agg.fixed),
        variable: round2_(agg.variable),
        debt:     round2_(agg.debt),
        savings:  round2_(agg.savings),
        leftover: round2_(leftover),
        rate:     agg.income > 0 ? (agg.income - agg.out) / agg.income : 0
      },
      palette: PALETTE,
      source: sourceLabel_()
    };
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}


/**
 * Walk `_Calc` once and total the month. Reading values rather than adding more
 * formulas keeps the sheet's recalculation graph small.
 */
function aggregateMonth_(ss, month) {
  var sh = ss.getSheetByName(TABS.calc);
  var out = { income: 0, out: 0, fixed: 0, variable: 0, debt: 0, savings: 0,
              excluded: 0, unmapped: 0, sources: [] };
  if (!sh) return out;

  var lastRow = sh.getLastRow();
  if (lastRow < 2) return out;

  // B month · D category · F amount · G bucket · H type · I counts · J mapped
  var grid = sh.getRange(2, 2, lastRow - 1, 9).getValues();
  var bySource = {};

  for (var i = 0; i < grid.length; i++) {
    var row = grid[i];
    if (String(row[0]) !== month) continue;          // B: month key
    var category = String(row[2] || '');             // D
    var amount   = Number(row[4]) || 0;              // F
    var bucket   = String(row[5] || '').toLowerCase();// G
    var counts   = Number(row[7]) || 0;              // I
    var mapped   = Number(row[8]) || 0;              // J

    if (!counts) {
      if (mapped) out.excluded += amount; else out.unmapped += amount;
      continue;
    }
    if (bucket === 'income') {
      out.income += amount;
      bySource[category] = (bySource[category] || 0) + amount;
    } else if (bucket === 'fixed' || bucket === 'variable' || bucket === 'debt') {
      out[bucket] += -amount;                        // spend is negative
      out.out     += -amount;
    } else if (bucket === 'savings') {
      out.savings += -amount;
    }
  }

  // Negative buckets happen when a month is net-refunded. Floor them at zero
  // for the diagram and let the Flags tab carry the real signed number.
  ['fixed', 'variable', 'debt', 'savings', 'out'].forEach(function (k) {
    if (out[k] < 0) out[k] = 0;
  });

  out.sources = Object.keys(bySource)
    .map(function (k) { return { name: k, amount: bySource[k] }; })
    .filter(function (s) { return s.amount > 0.005; })
    .sort(function (a, b) { return b.amount - a.amount; });

  // Keep the diagram readable: top 7 sources, the rest rolled up.
  if (out.sources.length > 8) {
    var head = out.sources.slice(0, 7);
    var tail = out.sources.slice(7).reduce(function (n, s) { return n + s.amount; }, 0);
    head.push({ name: 'Other income', amount: tail });
    out.sources = head;
  }
  return out;
}


/** "2026-07" → "July 2026". */
function monthLabel_(key) {
  var m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m) return String(key || '');
  var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
               'August', 'September', 'October', 'November', 'December'];
  return names[Number(m[2]) - 1] + ' ' + m[1];
}
