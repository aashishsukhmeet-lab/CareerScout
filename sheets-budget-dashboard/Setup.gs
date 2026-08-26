/**
 * Setup.gs
 * ---------------------------------------------------------------------------
 * Orchestration. Creates the tabs this project owns, aims every named range at
 * whichever source (mock or live Tiller) is active, and builds the hidden
 * `_Calc` layer that everything else reads.
 *
 * `_Calc` is the whole trick: one normalized row per transaction, produced by a
 * handful of ARRAYFORMULAs over full-column named ranges. Tiller can append
 * rows every morning and nothing downstream notices, because every chart and
 * every card is a SUMIFS or QUERY over `_Calc`, never over a fixed A2:A5000.
 */

/** Menu entry point: build (or rebuild) the entire dashboard. */
function setupAll() {
  var ss = SpreadsheetApp.getActive();
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var src = resolveSources_(ss);

    // 1. Make sure every tab we own exists and is big enough.
    var calc  = ensureOwnSheet_(ss, TABS.calc);
    var cdata = ensureOwnSheet_(ss, TABS.chartData);
    var setup = ensureOwnSheet_(ss, TABS.setup);
    var dash  = ensureOwnSheet_(ss, TABS.dashboard);
    var flags = ensureOwnSheet_(ss, TABS.flags);

    var calcRows = Math.max(
      src.tx.sheet.getMaxRows(),
      src.bal.sheet.getMaxRows(),
      src.cat.sheet.getMaxRows()) + 1 + LIMITS.calcHeadroom;
    ensureGrid_(calc,  calcRows, 40);
    ensureGrid_(cdata, 400, 70);
    ensureGrid_(setup, LIMITS.setupRows + 10, 12);
    ensureGrid_(dash,  DASH.notesRow + 10, 12);
    ensureGrid_(flags, 600, 24);

    // 2. Point every named range at today's source. This is where the
    //    USE_MOCK_DATA switch actually takes effect.
    wireNamedRanges_(ss, src);

    // 3. Build, in dependency order.
    buildCalc_(ss, src);          // normalized transactions + balances
    buildBudgetSetup_(ss, src);   // preserves whatever you have already typed
    buildDashboard_(ss, src);     // cards, goals, in-cell bars, sparklines
    setDefaultMonth_(ss);         // open on the last complete month
    buildChartData_(ss);          // contiguous blocks for the native charts
    buildFlags_(ss);              // nothing falls out of the totals silently
    buildCharts_(ss);             // the four native charts

    calc.hideSheet();
    cdata.hideSheet();
    ss.setActiveSheet(dash);

    SpreadsheetApp.getActive().toast(
      'Dashboard rebuilt. Reading from: ' + sourceLabel_() + '.', 'Done', 6);
  } finally {
    lock.releaseLock();
  }
}

/** Menu entry point: rebuild only the volatile parts. Much faster. */
function refreshDashboard() {
  var ss = SpreadsheetApp.getActive();
  var src = resolveSources_(ss);

  // Keep _Calc tall enough for however many rows Tiller has synced since.
  var calc = ensureOwnSheet_(ss, TABS.calc);
  var needed = Math.max(src.tx.sheet.getMaxRows(), src.bal.sheet.getMaxRows()) + 1 + 200;
  if (calc.getMaxRows() < needed) {
    ensureGrid_(calc, needed + LIMITS.calcHeadroom, 40);
    wireNamedRanges_(ss, src);   // re-aim the _Calc names at the taller grid
  }

  refreshBudgetSetupCategories_(ss, src);
  SpreadsheetApp.flush();
  if (!String(ss.getRangeByName('SelMonth').getValue() || '').trim()) setDefaultMonth_(ss);
  buildChartData_(ss);
  buildCharts_(ss);
  ss.getSheetByName(TABS.dashboard)
    .getRange(2, 9).setValue('refreshed ' + nowStamp_(ss));
  ss.toast('Refreshed. Source: ' + sourceLabel_() + '.', 'Done', 4);
}


/**
 * Pick the month the dashboard opens on.
 *
 * The newest month is usually the current one, which is only part-spent — half
 * the income booked, all the rent paid — so opening there would make a healthy
 * month look like a disaster. Default to the last *complete* month instead, and
 * fall back to the newest if that is all there is. The dropdown still offers
 * every month, and the in-progress month carries a ⏳ note explaining itself.
 */
function setDefaultMonth_(ss) {
  SpreadsheetApp.flush();
  var months = readListName_(ss, 'MonthList', 500);
  if (!months.length) return null;

  var now = new Date();
  var currentKey = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'yyyy-MM');
  var pick = months[0];                       // newest
  if (pick === currentKey && months.length > 1) pick = months[1];

  ss.getSheetByName(TABS.dashboard).getRange('B2').setValue(pick);
  return pick;
}


/* ---------------------------------------------------------------------------
 * Grid sizing
 * -------------------------------------------------------------------------*/

function ensureGrid_(sh, rows, cols) {
  assertWritable_(sh.getName());
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  return sh;
}


/* ---------------------------------------------------------------------------
 * Named ranges — the indirection layer that makes the mock/live switch a
 * one-liner and makes Tiller's daily row-appends a non-event.
 * -------------------------------------------------------------------------*/

function wireNamedRanges_(ss, src) {
  var C  = TABS.calc, D = TABS.chartData, S = TABS.setup, B = TABS.dashboard;

  // --- source columns (full columns, so they grow with the sheet) ----------
  setName_(ss, 'TxDate',   src.tx.date);
  setName_(ss, 'TxDesc',   src.tx.desc);
  setName_(ss, 'TxCat',    src.tx.cat);
  setName_(ss, 'TxAmt',    src.tx.amt);
  setName_(ss, 'TxAcct',   src.tx.acct);

  setName_(ss, 'CatName',  src.cat.name);
  setName_(ss, 'CatGroup', src.cat.group);
  setName_(ss, 'CatType',  src.cat.type);
  setName_(ss, 'CatHide',  src.cat.hide);

  setName_(ss, 'BalDate',  src.bal.date);
  setName_(ss, 'BalAcct',  src.bal.acct);
  setName_(ss, 'BalAmt',   src.bal.amt);
  setName_(ss, 'BalClass', src.bal.klass);
  setName_(ss, 'BalType',  src.bal.type);

  // --- normalized transaction layer ---------------------------------------
  setName_(ss, 'CalcDate',   q_(C, 'A:A'));
  setName_(ss, 'CalcMonth',  q_(C, 'B:B'));
  setName_(ss, 'CalcDesc',   q_(C, 'C:C'));
  setName_(ss, 'CalcCat',    q_(C, 'D:D'));
  setName_(ss, 'CalcAcct',   q_(C, 'E:E'));
  setName_(ss, 'CalcAmt',    q_(C, 'F:F'));
  setName_(ss, 'CalcBucket', q_(C, 'G:G'));
  setName_(ss, 'CalcType',   q_(C, 'H:H'));
  setName_(ss, 'CalcCounts', q_(C, 'I:I'));
  setName_(ss, 'CalcMapped', q_(C, 'J:J'));
  setName_(ss, 'CalcSpend',  q_(C, 'K:K'));

  setName_(ss, 'MonthList',    q_(C, '$M$2:$M$400'));
  setName_(ss, 'SelMonthDate', q_(C, '$O$2'));

  // --- normalized balances (sorted by date ascending) ---------------------
  setName_(ss, 'BDate',    q_(C, 'Q:Q'));
  setName_(ss, 'BMonth',   q_(C, 'R:R'));
  setName_(ss, 'BAcct',    q_(C, 'S:S'));
  setName_(ss, 'BAmt',     q_(C, 'T:T'));
  setName_(ss, 'BIsDebt',  q_(C, 'U:U'));
  setName_(ss, 'BIsAsset', q_(C, 'V:V'));
  setName_(ss, 'DebtAccounts',  q_(C, '$X$2:$X$60'));
  setName_(ss, 'AssetAccounts', q_(C, '$Z$2:$Z$60'));

  // --- Budget Setup -------------------------------------------------------
  var lastRow = LIMITS.setupRows + 4;   // data starts at row 5
  setName_(ss, 'SetupCat',    q_(S, '$A$5:$A$' + lastRow));
  setName_(ss, 'SetupBucket', q_(S, '$B$5:$B$' + lastRow));
  setName_(ss, 'SetupTarget', q_(S, '$C$5:$C$' + lastRow));
  setName_(ss, 'SetupGroup',  q_(S, '$D$5:$D$' + lastRow));
  setName_(ss, 'SetupType',   q_(S, '$E$5:$E$' + lastRow));
  setName_(ss, 'SetupHide',   q_(S, '$F$5:$F$' + lastRow));
  setName_(ss, 'SetupCounts', q_(S, '$G$5:$G$' + lastRow));

  setName_(ss, 'CfgMonthlySavingsTarget', q_(S, '$J$3'));
  setName_(ss, 'CfgSavingsGoal',          q_(S, '$J$4'));
  setName_(ss, 'CfgSavingsGoalLabel',     q_(S, '$J$5'));
  setName_(ss, 'CfgSavingsAccounts',      q_(S, '$J$6'));
  setName_(ss, 'CfgTargetSavingsRate',    q_(S, '$J$7'));

  // --- Dashboard + chart data --------------------------------------------
  setName_(ss, 'SelMonth',     q_(B, '$B$2'));
  setName_(ss, 'Win12Keys',    q_(D, '$F$2:$F$13'));
  setName_(ss, 'CatTable',     q_(D, '$AH$2:$AL$310'));
  setName_(ss, 'SparkMatrix',  q_(D, '$AN$2:$AY$310'));
  setName_(ss, 'BucketColors', q_(D, '$BD$2:$BE$8'));
  setName_(ss, 'AssetRollup',  q_(D, '$AD$2:$AF$16'));
}


/* ---------------------------------------------------------------------------
 * _Calc — one normalized row per transaction, one per balance snapshot.
 *
 * Every column is a single ARRAYFORMULA over a full-column named range. Row 1
 * is deliberately left blank so the named ranges can be unbounded full columns
 * (which grow with the source sheet) without a text header poisoning a SUMIFS.
 * The `ISNUMBER(TxDate)` guard drops the source's own header row and any blank
 * or malformed row in one move.
 * -------------------------------------------------------------------------*/

function buildCalc_(ss, src) {
  var sh = wipeOwnSheet_(ensureOwnSheet_(ss, TABS.calc));

  // These are literal full-column references — 'Transactions'!A:A, not the
  // TxDate named range. A whole-column reference written into a formula is
  // unbounded and follows the sheet however far Tiller grows it; a named range
  // is stored as a grid rectangle and may not. Transactions and Balance History
  // gain rows every morning, so this one layer reads them literally and
  // everything downstream reads _Calc, whose size this script controls.
  var TX  = src.tx,  CT = src.cat,  BL = src.bal;
  var g   = 'ISNUMBER(' + TX.date + ')';   // true only for real transaction rows

  var f = {};

  // Numeric columns fall back to 0, never to "". QUERY types a column from the
  // majority of its non-empty values, and a mostly-empty sheet full of ""
  // would make it read the dates and amounts as text and quietly null them.
  // Text columns fall back to "", which QUERY is happy to treat as text.

  // A Date (serial) · B Month key · C Description · D Category · E Account · F Amount
  f.A2 = '=ARRAYFORMULA(IF(' + g + ',' + TX.date + '*1,0))';
  f.B2 = '=ARRAYFORMULA(IF(' + g + ',TEXT(' + TX.date + ',"yyyy-mm"),""))';
  f.C2 = '=ARRAYFORMULA(IF(' + g + ',' + TX.desc + '&"",""))';
  f.D2 = '=ARRAYFORMULA(IF(' + g + ',IF(TRIM(' + TX.cat + '&"")="","(uncategorized)",TRIM(' +
         TX.cat + '&"")),""))';
  f.E2 = '=ARRAYFORMULA(IF(' + g + ',' + TX.acct + '&"",""))';
  f.F2 = '=ARRAYFORMULA(IF(' + g + ',IFERROR(' + TX.amt + '*1,0),0))';

  // G Bucket · H Tiller Type · I Counts (1/0) · J Mapped in Budget Setup (1/0)
  f.G2 = '=ARRAYFORMULA(IF(' + g +
         ',LOWER(IFERROR(VLOOKUP($D:$D,{SetupCat,SetupBucket},2,FALSE),"")),""))';
  f.H2 = '=ARRAYFORMULA(IF(' + g +
         ',IFERROR(VLOOKUP($D:$D,{' + CT.name + ',' + CT.type + '},2,FALSE),""),""))';
  f.I2 = '=ARRAYFORMULA(IF(' + g +
         ',IFERROR(VLOOKUP($D:$D,{SetupCat,SetupCounts},2,FALSE),0),0))';
  f.J2 = '=ARRAYFORMULA(IF(' + g + ',IF(ISNA(MATCH($D:$D,SetupCat,0)),0,1),0))';

  // K Spend as a positive number. Refunds stay negative here on purpose:
  // a $50 grocery refund nets against the month's grocery spend rather than
  // being dropped, so totals still reconcile.
  f.K2 = '=ARRAYFORMULA(IF(' + g + ',IF(($I:$I=1)*($G:$G<>"income"),-$F:$F,0),0))';

  // M Every month that has data, newest first — the dropdown's source.
  f.M2 = '=IFERROR(SORT(UNIQUE(FILTER($B:$B,$B:$B<>"")),1,FALSE),"")';

  // O The selected month as a real date. Falls back to the newest month, then
  //   to today, so the sheet is never broken on a fresh install.
  f.O2 = '=IFERROR(DATE(VALUE(LEFT(SelMonth,4)),VALUE(RIGHT(SelMonth,2)),1),' +
         'IFERROR(DATE(VALUE(LEFT($M$2,4)),VALUE(RIGHT($M$2,2)),1),' +
         'DATE(YEAR(TODAY()),MONTH(TODAY()),1)))';

  // --- balances -----------------------------------------------------------
  // Raw normalization in AC:AH, then Q:V holds the same rows sorted by date
  // ascending so LOOKUP(2,1/(...)) reliably lands on the latest snapshot.
  var gb = 'ISNUMBER(' + BL.date + ')';
  f.AC2 = '=ARRAYFORMULA(IF(' + gb + ',' + BL.date + ',""))';
  f.AD2 = '=ARRAYFORMULA(IF(' + gb + ',TEXT(' + BL.date + ',"yyyy-mm"),""))';
  f.AE2 = '=ARRAYFORMULA(IF(' + gb + ',' + BL.acct + '&"",""))';
  f.AF2 = '=ARRAYFORMULA(IF(' + gb + ',IFERROR(' + BL.amt + '*1,0),""))';
  // Debt detection, in order of trustworthiness:
  //   Class = Liability/Asset  →  Type looks like credit/loan  →  balance < 0.
  f.AG2 = '=ARRAYFORMULA(IF(' + gb + ',' +
            'IF(LOWER(TRIM(' + BL.klass + '&""))="liability",1,' +
            'IF(LOWER(TRIM(' + BL.klass + '&""))="asset",0,' +
            'IF(REGEXMATCH(LOWER(TRIM(' + BL.type + '&"")),' +
              '"credit|loan|mortgage|liab|line of credit"),1,' +
            'IF(IFERROR(' + BL.amt + '*1,0)<0,1,0)))),""))';
  f.AH2 = '=ARRAYFORMULA(IF(' + gb + ',IF($AG:$AG=1,0,1),""))';

  f.Q2 = '=IFERROR(SORT(FILTER($AC:$AH,ISNUMBER($AC:$AC)),1,TRUE),"")';

  f.X2 = '=IFERROR(SORT(UNIQUE(FILTER($S:$S,$U:$U=1,$S:$S<>""))),"")';
  f.Z2 = '=IFERROR(SORT(UNIQUE(FILTER($S:$S,$V:$V=1,$S:$S<>""))),"")';

  Object.keys(f).forEach(function (a1) { sh.getRange(a1).setFormula(f[a1]); });

  // Column A must stay a plain number, not a date-formatted one: QUERY reads a
  // date-formatted cell as a date, and we want it numeric so `Col1 > 0` can
  // separate real transactions from the padding rows.
  sh.getRange('A:A').setNumberFormat('0');

  // A legend, parked well clear of every spill range.
  sh.getRange('BA1').setValue('_Calc column map — this sheet is machine-generated');
  var legend = [
    ['A', 'Transaction date, as a serial number'], ['B', 'Month key (yyyy-mm)'], ['C', 'Description'],
    ['D', 'Category (blank → "(uncategorized)")'], ['E', 'Account'],
    ['F', 'Amount, signed (negative = spend)'], ['G', 'Bucket from Budget Setup'],
    ['H', 'Tiller category Type'], ['I', 'Counts in reports? 1/0'],
    ['J', 'Mapped in Budget Setup? 1/0'], ['K', 'Spend as a positive number'],
    ['M', 'Months present in the data, newest first'],
    ['O', 'Selected month, as a date'],
    ['Q:V', 'Balances sorted by date: date, month, account, amount, isDebt, isAsset'],
    ['X', 'Debt accounts'], ['Z', 'Asset accounts'],
    ['AC:AH', 'Balances, unsorted (feeds Q:V)']
  ];
  sh.getRange(2, 53, legend.length, 2).setValues(legend);
  sh.getRange(1, 53, legend.length + 1, 2).setFontColor(INK.muted).setFontSize(9);

  sh.setColumnWidth(53, 60);
  sh.setColumnWidth(54, 320);
  return sh;
}
