/**
 * ChartData.gs
 * ---------------------------------------------------------------------------
 * The hidden `_ChartData` tab. Native Sheets charts need contiguous, rectangular
 * ranges, so this builds one tidy block per chart, plus the sorted category
 * table and the 12-month matrix that every SPARKLINE indexes into.
 *
 * Layout
 *   A1:E13    chart 1 — spend by bucket, 12 months
 *   F2:F13    the 12 month keys (yyyy-mm) everything else joins on
 *   H1:K13    chart 2 — money in / money out / savings rate
 *   M1:Q26    chart 3 — selected month by category, split across bucket series
 *   S1:__13   chart 4 — debt balances per account + total
 *   AD1:AF16  asset roll-up (for net worth and the cumulative savings goal)
 *   AH2:AL    the category table, sorted biggest spend first
 *   AN2:AY    12-month spend matrix, one row per category table row
 *   BA2:BB26  raw QUERY behind chart 3
 *   BD2:BE8   bucket → colour, so sparklines match the charts
 *   BG2:BK    the category table before sorting
 */

function buildChartData_(ss) {
  var sh = wipeOwnSheet_(ensureOwnSheet_(ss, TABS.chartData));
  var N  = LIMITS.trendMonths;         // 12
  var lastTrendRow = 1 + N;            // rows 2..13
  var lastCatRow   = 310;

  /* --- the 12-month window, ending at the selected month ----------------- */
  var labels = [], keys = [];
  for (var i = 0; i < N; i++) {
    var off = i - (N - 1);             // -11 .. 0
    labels.push(['=IFERROR(TEXT(EDATE(SelMonthDate,' + off + '),"MMM yy"),"")']);
    keys.push(['=IFERROR(TEXT(EDATE(SelMonthDate,' + off + '),"yyyy-mm"),"")']);
  }
  sh.getRange(2, 1, N, 1).setFormulas(labels);
  sh.getRange(2, 6, N, 1).setFormulas(keys);
  sh.getRange('F1').setValue('key');

  /* --- chart 1: stacked column, spend by bucket -------------------------- */
  sh.getRange('A1:E1').setValues([['Month', 'Fixed', 'Variable', 'Debt', 'Savings']]);
  var c1 = [];
  for (var r = 2; r <= lastTrendRow; r++) {
    c1.push(VISIBLE_BUCKETS.map(function (b) {
      return '=IF($F' + r + '="","",-' + fBucket_('$F' + r, b) + ')';
    }));
  }
  sh.getRange(2, 2, c1.length, 4).setFormulas(c1);

  /* --- chart 2: income vs spend vs savings rate -------------------------- */
  sh.getRange('H1:K1').setValues([['Month', 'Money in', 'Money out', 'Savings rate']]);
  var c2 = [];
  for (var r2 = 2; r2 <= lastTrendRow; r2++) {
    var m = '$F' + r2;
    c2.push([
      '=$A' + r2,
      '=IF($F' + r2 + '="","",' + fIn_(m) + ')',
      '=IF($F' + r2 + '="","",' + fOut_(m) + ')',
      '=IF(N($I' + r2 + ')<=0,"",($I' + r2 + '-$J' + r2 + ')/$I' + r2 + ')'
    ]);
  }
  sh.getRange(2, 8, c2.length, 4).setFormulas(c2);

  /* --- chart 3: the selected month by category --------------------------- */
  // One QUERY does the grouping and the sort; the bucket split into four
  // series is what gives each bar its bucket colour.
  sh.getRange('BA1').setValue('raw (chart 3)');
  sh.getRange('BA2').setFormula(
    '=IFERROR(QUERY({CalcCat,CalcSpend,CalcMonth,CalcCounts,CalcBucket},' +
    '"select Col1, sum(Col2) ' +
    'where Col4 = 1 and Col5 <> \'income\' and Col3 = \'"&SelMonth&"\' ' +
    'group by Col1 order by sum(Col2) desc limit ' + LIMITS.barCategories + ' ' +
    'label Col1 \'\', sum(Col2) \'\'",0),"")');

  var rawA = '$BA$2:$BA$' + (1 + LIMITS.barCategories);
  var rawB = '$BB$2:$BB$' + (1 + LIMITS.barCategories);
  sh.getRange('M1:Q1').setValues([['Category', 'Fixed', 'Variable', 'Debt', 'Savings']]);
  sh.getRange('M2').setFormula('=ARRAYFORMULA(IF(' + rawA + '="","",' + rawA + '))');
  VISIBLE_BUCKETS.forEach(function (b, idx) {
    sh.getRange(2, 14 + idx).setFormula(
      '=ARRAYFORMULA(IF(' + rawA + '="","",' +
      'IF(IFERROR(VLOOKUP(' + rawA + ',{SetupCat,SetupBucket},2,FALSE),"")="' + b + '",' +
      rawB + ',0)))');
  });

  /* --- chart 4: debt balances over time ---------------------------------- */
  SpreadsheetApp.flush();                       // let _Calc settle first
  var debtAccounts = readListName_(ss, 'DebtAccounts', LIMITS.debtAccounts);
  var nDebt = debtAccounts.length;

  sh.getRange('S1').setValue('Month');
  var s4 = [];
  for (var r4 = 2; r4 <= lastTrendRow; r4++) s4.push(['=$A' + r4]);
  sh.getRange(2, 19, s4.length, 1).setFormulas(s4);

  var totalCol = 20 + nDebt;                    // T is 20
  for (var a = 0; a < nDebt; a++) {
    var col = 20 + a;
    var colA1 = columnLetter_(col);
    // Live header, so a renamed or newly linked account still labels correctly.
    sh.getRange(1, col).setFormula('=IFERROR(INDEX(DebtAccounts,' + (a + 1) + '),"")');
    var cells = [];
    for (var r5 = 2; r5 <= lastTrendRow; r5++) {
      cells.push(['=IF(' + colA1 + '$1="","",IFERROR(ABS(' +
        fBalanceAt_(colA1 + '$1', '$F' + r5) + '),""))']);
    }
    sh.getRange(2, col, cells.length, 1).setFormulas(cells);
  }
  if (nDebt > 0) {
    var firstA1 = columnLetter_(20), lastA1 = columnLetter_(19 + nDebt);
    sh.getRange(1, totalCol).setValue('Total debt');
    var tot = [];
    for (var r6 = 2; r6 <= lastTrendRow; r6++) {
      tot.push(['=IF(COUNT(' + firstA1 + r6 + ':' + lastA1 + r6 + ')=0,"",' +
                'SUM(' + firstA1 + r6 + ':' + lastA1 + r6 + '))']);
    }
    sh.getRange(2, totalCol, tot.length, 1).setFormulas(tot);
    setName_(ss, 'TotalDebtSeries',
             q_(TABS.chartData, '$' + columnLetter_(totalCol) + '$2:$' +
                columnLetter_(totalCol) + '$' + lastTrendRow));
  } else {
    sh.getRange(1, totalCol).setValue('Total debt');
    sh.getRange(2, totalCol, N, 1).setValue('');
    setName_(ss, 'TotalDebtSeries',
             q_(TABS.chartData, '$' + columnLetter_(totalCol) + '$2:$' +
                columnLetter_(totalCol) + '$' + lastTrendRow));
  }
  // Remember where chart 4's range ends so Charts.gs can size it exactly.
  PropertiesService.getDocumentProperties()
    .setProperty('debtLastCol', String(totalCol));

  /* --- asset roll-up: net worth + the cumulative savings goal ------------ */
  sh.getRange('AD1:AF1').setValues([['Asset account', 'Balance', 'Savings?']]);
  var assets = [];
  for (var k = 0; k < LIMITS.assetAccounts; k++) {
    var row = 2 + k;
    assets.push([
      '=IFERROR(INDEX(AssetAccounts,' + (k + 1) + '),"")',
      '=IF($AD' + row + '="","",IFERROR(' + fBalanceAt_('$AD' + row, 'SelMonth') + ',""))',
      '=IF($AD' + row + '="","",IFERROR(REGEXMATCH(LOWER($AD' + row +
        '),LOWER(CfgSavingsAccounts&"")),FALSE))'
    ]);
  }
  sh.getRange(2, 30, assets.length, 3).setFormulas(assets);

  var aEnd = 1 + LIMITS.assetAccounts;
  sh.getRange(18, 30, 4, 1).setValues([
    ['Total assets'], ['Savings balance'], ['Total debt'], ['Net worth']]);
  sh.getRange(18, 31, 4, 1).setFormulas([
    ['=IFERROR(SUM($AE$2:$AE$' + aEnd + '),0)'],
    ['=IFERROR(SUMIF($AF$2:$AF$' + aEnd + ',TRUE,$AE$2:$AE$' + aEnd + '),0)'],
    ['=IFERROR(INDEX(TotalDebtSeries,' + N + '),0)'],
    ['=IFERROR($AE$18-$AE$20,0)']
  ]);
  setName_(ss, 'TotalAssets',    q_(TABS.chartData, '$AE$18'));
  setName_(ss, 'SavingsBalance', q_(TABS.chartData, '$AE$19'));
  setName_(ss, 'TotalDebt',      q_(TABS.chartData, '$AE$20'));
  setName_(ss, 'NetWorth',       q_(TABS.chartData, '$AE$21'));

  /* --- the selected month, computed once and reused everywhere -----------
   * The cards, the goal bars, the Flags reconciliation and the Sankey all
   * read these nine cells instead of each re-deriving the same SUMIFS.      */
  var M = 'SelMonth';
  sh.getRange(23, 30, 9, 1).setValues([
    ['Money in'], ['Money out'], ['Savings'], ['Net'], ['Leftover'],
    ['Fixed'], ['Variable'], ['Debt'], ['Savings rate (net)']]);
  sh.getRange(23, 31, 9, 1).setFormulas([
    ['=IFERROR(' + fIn_(M) + ',0)'],
    ['=IFERROR(' + fOut_(M) + ',0)'],
    ['=IFERROR(' + fSavings_(M) + ',0)'],
    ['=IFERROR($AE$23-$AE$24,0)'],
    ['=IFERROR($AE$23-$AE$24-$AE$25,0)'],
    ['=IFERROR(-' + fBucket_(M, 'fixed') + ',0)'],
    ['=IFERROR(-' + fBucket_(M, 'variable') + ',0)'],
    ['=IFERROR(-' + fBucket_(M, 'debt') + ',0)'],
    ['=IF(N($AE$23)<=0,"",$AE$26/$AE$23)']
  ]);
  setName_(ss, 'MIn',        q_(TABS.chartData, '$AE$23'));
  setName_(ss, 'MOut',       q_(TABS.chartData, '$AE$24'));
  setName_(ss, 'MSavings',   q_(TABS.chartData, '$AE$25'));
  setName_(ss, 'MNet',       q_(TABS.chartData, '$AE$26'));
  setName_(ss, 'MLeftover',  q_(TABS.chartData, '$AE$27'));
  setName_(ss, 'MFixed',     q_(TABS.chartData, '$AE$28'));
  setName_(ss, 'MVariable',  q_(TABS.chartData, '$AE$29'));
  setName_(ss, 'MDebt',      q_(TABS.chartData, '$AE$30'));
  setName_(ss, 'MRate',      q_(TABS.chartData, '$AE$31'));

  /* --- the 3-month comparison ------------------------------------------
   * Rows 10-12 of the trend block are already the three months before the
   * selected one, so averaging them costs nothing. Deriving these inline in
   * each card instead would mean twelve more SUMIFS per card and a formula
   * long enough to be unreadable.                                          */
  sh.getRange(33, 30, 4, 1).setValues([
    ['3-mo avg money in'], ['3-mo avg money out'], ['3-mo avg net'],
    ['3-mo avg savings rate']]);
  sh.getRange(33, 31, 4, 1).setFormulas([
    ['=IFERROR(AVERAGE($I$10:$I$12),0)'],
    ['=IFERROR(AVERAGE($J$10:$J$12),0)'],
    ['=IFERROR(AVERAGE($I$10:$I$12)-AVERAGE($J$10:$J$12),0)'],
    ['=IFERROR(AVERAGE($K$10:$K$12),0)']
  ]);
  setName_(ss, 'Avg3In',   q_(TABS.chartData, '$AE$33'));
  setName_(ss, 'Avg3Out',  q_(TABS.chartData, '$AE$34'));
  setName_(ss, 'Avg3Net',  q_(TABS.chartData, '$AE$35'));
  setName_(ss, 'Avg3Rate', q_(TABS.chartData, '$AE$36'));

  /* --- the category table (unsorted, then sorted) ------------------------ */
  var rawCat = '$BG$2:$BG$' + lastCatRow;
  sh.getRange('BG1:BK1').setValues([['Category', 'Actual', 'Bucket', 'Target', '3-mo avg']]);
  sh.getRange('BG2').setFormula(
    '=IFERROR(FILTER(SetupCat,SetupCounts=1,LOWER(SetupBucket&"")<>"income",SetupCat<>""),"")');
  sh.getRange('BH2').setFormula(
    '=ARRAYFORMULA(IF(' + rawCat + '="","",' +
    'SUMIFS(CalcSpend,CalcCat,' + rawCat + ',CalcMonth,SelMonth,CalcCounts,1)))');
  sh.getRange('BI2').setFormula(
    '=ARRAYFORMULA(IF(' + rawCat + '="","",' +
    'IFERROR(VLOOKUP(' + rawCat + ',{SetupCat,SetupBucket},2,FALSE),"")))');
  sh.getRange('BJ2').setFormula(
    '=ARRAYFORMULA(IF(' + rawCat + '="","",' +
    'IFERROR(VLOOKUP(' + rawCat + ',{SetupCat,SetupTarget},2,FALSE),0)))');
  sh.getRange('BK2').setFormula(
    '=ARRAYFORMULA(IF(' + rawCat + '="","",(' +
    [-1, -2, -3].map(function (o) {
      return 'SUMIFS(CalcSpend,CalcCat,' + rawCat + ',CalcMonth,' + monthKey_(o) + ',CalcCounts,1)';
    }).join('+') + ')/3))');

  sh.getRange('AH1:AL1').setValues([['Category', 'Actual', 'Bucket', 'Target', '3-mo avg']]);
  sh.getRange('AH2').setFormula(
    '=IFERROR(SORT(FILTER({' +
    ['$BG$2:$BG$' + lastCatRow, '$BH$2:$BH$' + lastCatRow, '$BI$2:$BI$' + lastCatRow,
     '$BJ$2:$BJ$' + lastCatRow, '$BK$2:$BK$' + lastCatRow].join(',') +
    '},' + rawCat + '<>""),2,FALSE),"")');

  /* --- the sparkline matrix: 12 columns, aligned to the sorted table ----- */
  var sortedCat = '$AH$2:$AH$' + lastCatRow;
  for (var mth = 0; mth < N; mth++) {
    sh.getRange(1, 40 + mth).setFormula('=$A' + (2 + mth));
    sh.getRange(2, 40 + mth).setFormula(
      '=ARRAYFORMULA(IF(' + sortedCat + '="","",' +
      'SUMIFS(CalcSpend,CalcCat,' + sortedCat + ',CalcMonth,$F$' + (2 + mth) + ',CalcCounts,1)))');
  }

  /* --- bucket colours, so sparklines match the charts -------------------- */
  sh.getRange('BD1:BE1').setValues([['bucket', 'hex']]);
  var colours = ['income', 'fixed', 'variable', 'debt', 'savings', 'leftover']
    .map(function (b) { return [b, PALETTE[b]]; });
  sh.getRange(2, 56, colours.length, 2).setValues(colours);

  /* --- cosmetics --------------------------------------------------------- */
  sh.getRange(1, 1, 1, sh.getMaxColumns())
    .setFontWeight('bold').setFontColor(INK.muted).setFontSize(9);
  sh.getRange(2, 2, N, 4).setNumberFormat(FMT.money);
  sh.getRange(2, 9, N, 2).setNumberFormat(FMT.money);
  sh.getRange(2, 11, N, 1).setNumberFormat(FMT.pct);
  sh.getRange(2, 14, LIMITS.barCategories, 4).setNumberFormat(FMT.money);
  if (nDebt > 0) sh.getRange(2, 20, N, nDebt + 1).setNumberFormat(FMT.moneyBig);
  sh.getRange(2, 31, LIMITS.assetAccounts, 1).setNumberFormat(FMT.money);
  sh.getRange(18, 31, 4, 1).setNumberFormat(FMT.money);
  sh.getRange(23, 31, 8, 1).setNumberFormat(FMT.money);
  sh.getRange(31, 31).setNumberFormat(FMT.pct);
  sh.getRange(33, 31, 3, 1).setNumberFormat(FMT.money);
  sh.getRange(36, 31).setNumberFormat(FMT.pct);
  return sh;
}


/* ---------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------*/

/** Read a single-column named range into a trimmed array of non-empty strings. */
function readListName_(ss, name, cap) {
  var rng = ss.getRangeByName(name);
  if (!rng) return [];
  var out = [];
  rng.getValues().forEach(function (r) {
    var v = String(r[0] == null ? '' : r[0]).trim();
    if (v && out.length < cap) out.push(v);
  });
  return out;
}

/** 1 → "A", 27 → "AA". */
function columnLetter_(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = (n - m - 1) / 26;
  }
  return s;
}
