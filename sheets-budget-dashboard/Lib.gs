/**
 * Lib.gs
 * ---------------------------------------------------------------------------
 * Shared plumbing: the read-only guard, source-tab resolution, header
 * detection, named-range management, and the formula fragments that the
 * Dashboard, Flags and chart-data builders all reuse.
 */

/* ---------------------------------------------------------------------------
 * The read-only guard
 * -------------------------------------------------------------------------*/

/**
 * Throws if `name` is a tab Tiller owns. Every function in this project that
 * is about to write anything calls this first.
 */
function assertWritable_(name) {
  var n = String(name || '').trim().toLowerCase();
  for (var i = 0; i < PROTECTED_TABS.length; i++) {
    if (PROTECTED_TABS[i].toLowerCase() === n) {
      throw new Error(
        'Refusing to write to "' + name + '". Tiller owns that tab and ' +
        'overwrites it daily. This add-on only reads from it.');
    }
  }
  return name;
}

/** Get a sheet we own, creating it if needed. Never touches a Tiller tab. */
function ensureOwnSheet_(ss, name) {
  assertWritable_(name);
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

/** Blank a sheet we own: contents, formats, merges, validations, rules, charts. */
function wipeOwnSheet_(sh) {
  assertWritable_(sh.getName());
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.clearConditionalFormatRules();
  var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  all.breakApart();
  all.clearDataValidations();
  all.clearNote();
  all.clear();
  // Undo any leftover row/column sizing quirks from a previous build.
  sh.setFrozenRows(0);
  sh.setFrozenColumns(0);
  return sh;
}


/* ---------------------------------------------------------------------------
 * Source resolution — which tabs are we reading today?
 * -------------------------------------------------------------------------*/

/** The active source tab names, per USE_MOCK_DATA. */
function sourceTabs_() {
  return USE_MOCK_DATA ? MOCK_TABS : TILLER_TABS;
}

function sourceLabel_() {
  return USE_MOCK_DATA ? 'MOCK DATA' : 'LIVE TILLER';
}

/** Normalise a header for matching: "Hide From Reports" → "hidefromreports". */
function normHeader_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Find the header row of a sheet (first of the top 8 rows containing at least
 * two of the expected headers) and map normalised header → column number.
 * Returns { row: n, cols: { normalisedHeader: colNumber } }.
 */
function readHeaders_(sh, expected) {
  var scan = Math.min(8, sh.getMaxRows());
  var width = sh.getMaxColumns();
  var grid = sh.getRange(1, 1, scan, width).getDisplayValues();
  var want = expected.map(normHeader_);

  for (var r = 0; r < scan; r++) {
    var cols = {}, hits = 0;
    for (var c = 0; c < width; c++) {
      var key = normHeader_(grid[r][c]);
      if (!key) continue;
      if (cols[key] === undefined) cols[key] = c + 1;
      if (want.indexOf(key) >= 0) hits++;
    }
    if (hits >= 2) return { row: r + 1, cols: cols };
  }
  return { row: 1, cols: {} };
}

/**
 * Resolve one logical column to an A1 full-column reference on `sh`.
 * `aliases` are tried in order. Optional columns that are genuinely missing
 * fall back to a spare empty column on the same sheet, so array formulas
 * built from several columns always line up in length.
 */
function colRef_(sh, headers, aliases, required, what) {
  for (var i = 0; i < aliases.length; i++) {
    var col = headers.cols[normHeader_(aliases[i])];
    if (col) return sh.getRange(1, col, sh.getMaxRows(), 1).getA1Notation()
                     .replace(/\d+/g, '');   // "C1:C1000" → "C:C"
  }
  if (required) {
    throw new Error(
      'Could not find a "' + what + '" column on the "' + sh.getName() +
      '" tab. Looked for: ' + aliases.join(', ') + '.');
  }
  return spareColumnRef_(sh);
}

/**
 * An always-empty column on `sh`, used as a stand-in for an optional column the
 * sheet does not have. It has to live on the *same* sheet so that array
 * formulas combining it with a real column still line up in length. We never
 * add a column to a Tiller tab — we just point at one that is already blank.
 */
function spareColumnRef_(sh) {
  var last = sh.getLastColumn();
  var col = (last < sh.getMaxColumns()) ? last + 1 : sh.getMaxColumns();
  return sh.getRange(1, col, sh.getMaxRows(), 1).getA1Notation().replace(/\d+/g, '');
}

/**
 * Inspect the three (or four) source tabs and return, for each logical field,
 * a full-column A1 reference like "'Mock Transactions'!D:D".
 */
function resolveSources_(ss) {
  var t = sourceTabs_();
  var out = { usingMock: USE_MOCK_DATA, tabs: t, missing: [] };

  var tx = ss.getSheetByName(t.transactions);
  if (!tx) throw new Error(
    'Tab "' + t.transactions + '" not found. ' +
    (USE_MOCK_DATA
      ? 'Run 💰 Budget ▸ Generate mock Tiller data first.'
      : 'Connect Tiller, or set USE_MOCK_DATA = true in Config.gs.'));

  var cat = ss.getSheetByName(t.categories);
  if (!cat) throw new Error('Tab "' + t.categories + '" not found.');

  // Prefer Balance History (a time series) over Balances (today's snapshot).
  var bal = ss.getSheetByName(t.balanceHistory) || ss.getSheetByName(t.balances);
  if (!bal) out.missing.push('balances');

  var q = function (sh, ref) { return "'" + sh.getName().replace(/'/g, "''") + "'!" + ref; };

  var th = readHeaders_(tx, ['Date', 'Description', 'Category', 'Amount', 'Account']);
  out.tx = {
    sheet: tx,
    date:  q(tx, colRef_(tx, th, ['Date'], true, 'Date')),
    desc:  q(tx, colRef_(tx, th, ['Description'], false, 'Description')),
    cat:   q(tx, colRef_(tx, th, ['Category'], true, 'Category')),
    amt:   q(tx, colRef_(tx, th, ['Amount'], true, 'Amount')),
    acct:  q(tx, colRef_(tx, th, ['Account'], false, 'Account'))
  };

  var ch = readHeaders_(cat, ['Category', 'Group', 'Type', 'Hide From Reports']);
  out.cat = {
    sheet: cat,
    name:  q(cat, colRef_(cat, ch, ['Category'], true, 'Category')),
    group: q(cat, colRef_(cat, ch, ['Group'], false, 'Group')),
    type:  q(cat, colRef_(cat, ch, ['Type'], true, 'Type')),
    hide:  q(cat, colRef_(cat, ch, ['Hide From Reports', 'Hide'], false, 'Hide From Reports'))
  };

  if (bal) {
    var bh = readHeaders_(bal, ['Date', 'Account', 'Balance', 'Class', 'Type']);
    out.bal = {
      sheet: bal,
      date:  q(bal, colRef_(bal, bh, ['Date'], true, 'Date')),
      acct:  q(bal, colRef_(bal, bh, ['Account', 'Account Name'], true, 'Account')),
      amt:   q(bal, colRef_(bal, bh, ['Balance', 'Amount'], true, 'Balance')),
      klass: q(bal, colRef_(bal, bh, ['Class', 'Account Class'], false, 'Class')),
      type:  q(bal, colRef_(bal, bh, ['Type', 'Account Type'], false, 'Type'))
    };
  } else {
    // No balances at all: point everything at an empty column of Transactions
    // so the debt chart and net-worth stats come back blank instead of broken.
    var blank = q(tx, spareColumnRef_(tx));
    out.bal = { sheet: tx, date: blank, acct: blank, amt: blank, klass: blank, type: blank };
  }

  return out;
}


/* ---------------------------------------------------------------------------
 * Named ranges
 * -------------------------------------------------------------------------*/

/** Create or replace a named range from an A1 string like "'Tab'!D:D". */
function setName_(ss, name, a1) {
  var existing = ss.getNamedRanges();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getName() === name) existing[i].remove();
  }
  ss.setNamedRange(name, ss.getRange(a1));
  return name;
}

/** Quote a sheet name for use in A1 notation. */
function q_(sheetName, ref) {
  return "'" + String(sheetName).replace(/'/g, "''") + "'!" + ref;
}


/* ---------------------------------------------------------------------------
 * Reusable formula fragments
 *
 * Every aggregate in the workbook is a SUMIFS or a QUERY over full-column
 * named ranges, so Tiller appending rows each morning can never leave a
 * formula (or a chart) pointing at the wrong place.
 * -------------------------------------------------------------------------*/

/** Money in for a month: Tiller Type = Income, and the category counts. */
function fIn_(m) {
  return 'SUMIFS(CalcAmt,CalcMonth,' + m + ',CalcType,"Income",CalcCounts,1)';
}

/** Signed total for one bucket in one month (negative for spend). */
function fBucket_(m, bucket) {
  return 'SUMIFS(CalcAmt,CalcMonth,' + m + ',CalcBucket,"' + bucket + '",CalcCounts,1)';
}

/** Money out for a month, as a positive number: fixed + variable + debt. */
function fOut_(m) {
  var parts = SPEND_BUCKETS.map(function (b) { return fBucket_(m, b); });
  return '-(' + parts.join('+') + ')';
}

/** Savings contributions for a month, as a positive number. */
function fSavings_(m) {
  return '-(' + fBucket_(m, 'savings') + ')';
}

/** Month key of the selected month offset by n months, as "yyyy-mm" text. */
function monthKey_(n) {
  return 'TEXT(EDATE(SelMonthDate,' + n + '),"yyyy-mm")';
}

/**
 * Last-known balance for one account on or before a month key.
 * _Calc's balance block is sorted by date ascending, so LOOKUP(2, 1/(...))
 * lands on the most recent matching snapshot.
 */
function fBalanceAt_(acctRef, monthRef) {
  return 'LOOKUP(2,1/((BAcct=' + acctRef + ')*(BMonth<>"")*(BMonth<=' + monthRef +
         ')),BAmt)';
}

/** A REPT() progress bar: `value` against `target`, clamped to [0, width]. */
function fBar_(valueRef, targetRef, width) {
  var filled = 'MAX(0,MIN(' + width + ',ROUND(' + width + '*' + valueRef + '/' + targetRef + ',0)))';
  return 'IF(N(' + targetRef + ')<=0,"— no target —",' +
         'REPT("' + BAR.full + '",' + filled + ')&' +
         'REPT("' + BAR.empty + '",' + width + '-' + filled + ')&' +
         'IF(' + valueRef + '>' + targetRef + '," ' + BAR.over + '",""))';
}


/* ---------------------------------------------------------------------------
 * Small formatting helpers used while building sheets
 * -------------------------------------------------------------------------*/

function styleSectionHeader_(range, text) {
  range.merge()
       .setValue(text)
       .setFontSize(12).setFontWeight('bold')
       .setFontColor(INK.heading)
       .setBackground(INK.panel)
       .setVerticalAlignment('middle')
       .setBorder(null, null, true, null, null, null, INK.hairline,
                  SpreadsheetApp.BorderStyle.SOLID);
  return range;
}

function styleMutedLabel_(range, text) {
  range.setValue(text)
       .setFontSize(9)
       .setFontColor(INK.muted)
       .setFontWeight('normal');
  return range;
}

/** Timestamped "last refreshed" string in the spreadsheet's own timezone. */
function nowStamp_(ss) {
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'd MMM yyyy, HH:mm');
}
