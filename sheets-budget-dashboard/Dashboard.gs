/**
 * Dashboard.gs
 * ---------------------------------------------------------------------------
 * The visual layer. Everything here is formula-driven: pick a month in B2 and
 * every card, bar, sparkline and chart re-reads itself. No triggers, no
 * onEdit, nothing to go stale when Tiller syncs overnight.
 *
 * Columns are sized so the four big-number cards are exactly 300px each AND
 * the category table underneath still reads well:
 *   B Category · C Bucket · D Actual · E bar · F Budget · G Over/Under
 *   H 3-mo avg · I vs 3-mo avg · J Last 12 months
 */

function buildDashboard_(ss, src) {
  var sh = wipeOwnSheet_(ensureOwnSheet_(ss, TABS.dashboard));

  Object.keys(COL_WIDTHS).forEach(function (c) {
    sh.setColumnWidth(Number(c), COL_WIDTHS[c]);
  });
  sh.setHiddenGridlines(true);

  buildHeader_(sh, src);
  buildCards_(sh);
  buildGoals_(sh);
  buildStats_(sh);
  buildCategoryTable_(sh);
  buildNotes_(sh);
  applyDashboardFormatting_(sh);

  sh.setFrozenRows(2);
  return sh;
}


/* ---------------------------------------------------------------------------
 * Header + month picker
 * -------------------------------------------------------------------------*/

function buildHeader_(sh, src) {
  var ss = sh.getParent();

  sh.getRange('B1:E1').merge()
    .setValue('Money Dashboard')
    .setFontSize(20).setFontWeight('bold').setFontColor(INK.heading)
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);

  // Data-source badge — so you always know whether you are looking at mock
  // numbers or your real money.
  sh.getRange('H1:I1').merge()
    .setValue(sourceLabel_() + '  ·  ' + src.tx.sheet.getName())
    .setFontSize(9).setFontWeight('bold')
    .setHorizontalAlignment('right').setVerticalAlignment('middle')
    .setFontColor(USE_MOCK_DATA ? SIGNAL.warnText : SIGNAL.goodText)
    .setBackground(USE_MOCK_DATA ? SIGNAL.warnBg : SIGNAL.goodBg);

  // The month dropdown. Its source is a live UNIQUE() of every month present
  // in the data, so next month appears by itself.
  var monthCell = sh.getRange('B2');
  monthCell
    .setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInRange(ss.getRangeByName('MonthList'), true)
      .setAllowInvalid(true)
      .setHelpText('Every month with transactions, newest first.')
      .build())
    .setFontSize(12).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBackground('#FFFDF3')
    .setBorder(true, true, true, true, false, false,
               INK.heading, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(2, 28);

  sh.getRange('C2:D2').merge()
    .setFormula('=IFERROR(TEXT(SelMonthDate,"MMMM yyyy"),"")')
    .setFontSize(12).setFontColor(INK.body).setVerticalAlignment('middle');

  sh.getRange('E2:H2').merge()
    .setFormula('=IF(TEXT(TODAY(),"yyyy-mm")<>SelMonth&"","",' +
                '"⏳ month still in progress — day "&DAY(TODAY())&" of "&' +
                'DAY(EOMONTH(TODAY(),0))&", so the 3-month comparison is against full months")')
    .setFontSize(9).setFontColor(SIGNAL.warnText).setVerticalAlignment('middle');

  sh.getRange('I2')
    .setValue('built ' + nowStamp_(ss))
    .setFontSize(8).setFontColor(INK.muted)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');

  sh.setRowHeight(3, 8);
}


/* ---------------------------------------------------------------------------
 * The four big-number cards
 * -------------------------------------------------------------------------*/

function buildCards_(sh) {
  // The "sub" line under each card is where the second savings-rate number
  // (tagged contributions) and the 3-month averages live.
  var cards = [
    { title: 'MONEY IN',      colour: PALETTE.income,
      value: '=IFERROR(MIn,0)',  fmt: FMT.moneyBig,
      delta: '=IFERROR(MIn-Avg3In,0)', deltaFmt: FMT.delta,
      sub:   '="3-mo avg  "&TEXT(IFERROR(Avg3In,0),"' + FMT.moneyBig + '")',
      good:  'up' },

    { title: 'MONEY OUT',     colour: PALETTE.debt,
      value: '=IFERROR(MOut,0)', fmt: FMT.moneyBig,
      delta: '=IFERROR(MOut-Avg3Out,0)', deltaFmt: FMT.delta,
      sub:   '="fixed + variable + debt   ·   3-mo avg  "&' +
             'TEXT(IFERROR(Avg3Out,0),"' + FMT.moneyBig + '")',
      good:  'down' },

    { title: 'NET',           colour: PALETTE.fixed,
      value: '=IFERROR(MNet,0)', fmt: FMT.moneyBig,
      delta: '=IFERROR(MNet-Avg3Net,0)', deltaFmt: FMT.delta,
      sub:   '="leftover after savings  "&TEXT(IFERROR(MLeftover,0),"' + FMT.moneyBig + '")',
      good:  'up' },

    { title: 'SAVINGS RATE',  colour: PALETTE.savings,
      value: '=IFERROR(MRate,"")', fmt: FMT.pctBig,
      delta: '=IFERROR((N(MRate)-N(Avg3Rate))*100,0)', deltaFmt: FMT.pctDelta,
      sub:   '="tagged  "&TEXT(IFERROR(IF(N(MIn)<=0,0,MSavings/MIn),0),"0%")&' +
             '"   ·   target  "&TEXT(IFERROR(CfgTargetSavingsRate,0),"0%")',
      good:  'up' }
  ];

  sh.setRowHeight(DASH.cardTitleRow, 22);
  sh.setRowHeight(DASH.cardValueRow, 30);
  sh.setRowHeight(DASH.cardValueRow + 1, 26);
  sh.setRowHeight(DASH.cardDeltaRow, 20);
  sh.setRowHeight(DASH.cardSubRow, 18);

  cards.forEach(function (card, i) {
    var c0 = DASH.cardCols[i][0], c1 = DASH.cardCols[i][1];

    sh.getRange(DASH.cardTitleRow, c0, 1, 2).merge()
      .setValue(card.title)
      .setFontSize(10).setFontWeight('bold').setFontColor('#FFFFFF')
      .setBackground(card.colour)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    sh.getRange(DASH.cardValueRow, c0, 2, 2).merge()
      .setFormula(card.value).setNumberFormat(card.fmt)
      .setFontSize(28).setFontWeight('bold').setFontColor(INK.heading)
      .setBackground(INK.card)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    sh.getRange(DASH.cardDeltaRow, c0, 1, 2).merge()
      .setFormula(card.delta).setNumberFormat(card.deltaFmt)
      .setFontSize(10).setFontWeight('bold')
      .setBackground(INK.card)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    sh.getRange(DASH.cardSubRow, c0, 1, 2).merge()
      .setFormula(card.sub)
      .setFontSize(9).setFontColor(INK.muted)
      .setBackground(INK.card)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    sh.getRange(DASH.cardTitleRow, c0, 5, 2)
      .setBorder(true, true, true, true, false, false,
                 INK.hairline, SpreadsheetApp.BorderStyle.SOLID);
  });

  sh.setRowHeight(DASH.cardSubRow + 1, 8);
}

/* ---------------------------------------------------------------------------
 * Savings goals — two REPT() progress bars
 * -------------------------------------------------------------------------*/

function buildGoals_(sh) {
  styleSectionHeader_(sh.getRange(DASH.goalHeaderRow, 2, 1, 8), 'SAVINGS GOALS');
  sh.setRowHeight(DASH.goalHeaderRow, 22);

  var rows = [
    { row: DASH.goalMonthRow,
      label: '="This month vs target"',
      bar:   '=' + fBar_('MSavings', 'CfgMonthlySavingsTarget', LIMITS.goalBarChars),
      text:  '="   "&TEXT(IFERROR(MSavings,0),"' + FMT.moneyBig + '")&" of "&' +
             'TEXT(IFERROR(CfgMonthlySavingsTarget,0),"' + FMT.moneyBig + '")&' +
             'IF(N(CfgMonthlySavingsTarget)<=0,"   (set a monthly savings target on Budget Setup)",' +
             '"   ("&TEXT(MSavings/CfgMonthlySavingsTarget,"0%")&")")&' +
             '"   ·   counts categories bucketed savings"' },
    { row: DASH.goalTotalRow,
      label: '="Toward "&IFERROR(CfgSavingsGoalLabel,"goal")',
      bar:   '=' + fBar_('SavingsBalance', 'CfgSavingsGoal', LIMITS.goalBarChars),
      text:  '="   "&TEXT(IFERROR(SavingsBalance,0),"' + FMT.moneyBig + '")&" of "&' +
             'TEXT(IFERROR(CfgSavingsGoal,0),"' + FMT.moneyBig + '")&' +
             'IF(N(CfgSavingsGoal)<=0,"   (set a cumulative goal on Budget Setup)",' +
             '"   ("&TEXT(SavingsBalance/CfgSavingsGoal,"0%")&")")&' +
             '"   ·   real balances as of "&IFERROR(TEXT(SelMonthDate,"MMM yyyy"),"")' }
  ];

  rows.forEach(function (r) {
    sh.setRowHeight(r.row, 22);
    sh.getRange(r.row, 2, 1, 2).merge()
      .setFormula(r.label).setFontColor(INK.body).setVerticalAlignment('middle');
    sh.getRange(r.row, 4, 1, 2).merge()
      .setFormula(r.bar)
      .setFontFamily('Roboto Mono').setFontSize(11)
      .setFontColor(PALETTE.savings).setVerticalAlignment('middle');
    sh.getRange(r.row, 6, 1, 4).merge()
      .setFormula(r.text).setFontSize(9).setFontColor(INK.muted)
      .setVerticalAlignment('middle');
  });
}


/* ---------------------------------------------------------------------------
 * Net worth / debt / savings mini-stats
 * -------------------------------------------------------------------------*/

function buildStats_(sh) {
  var stats = [
    ['NET WORTH',        '=IFERROR(NetWorth,0)',       FMT.moneyBig, INK.heading],
    ['TOTAL DEBT',       '=IFERROR(TotalDebt,0)',      FMT.moneyBig, PALETTE.debt],
    ['SAVINGS BALANCE',  '=IFERROR(SavingsBalance,0)', FMT.moneyBig, PALETTE.savings],
    ['LEFTOVER THIS MONTH', '=IFERROR(MLeftover,0)',   FMT.moneyBig, PALETTE.leftover]
  ];
  sh.setRowHeight(DASH.statLabelRow, 16);
  sh.setRowHeight(DASH.statValueRow, 24);

  stats.forEach(function (s, i) {
    var c0 = DASH.cardCols[i][0];
    styleMutedLabel_(sh.getRange(DASH.statLabelRow, c0, 1, 2).merge(), s[0])
      .setHorizontalAlignment('center');
    sh.getRange(DASH.statValueRow, c0, 1, 2).merge()
      .setFormula(s[1]).setNumberFormat(s[2])
      .setFontSize(14).setFontWeight('bold').setFontColor(s[3])
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });
  sh.setRowHeight(DASH.statValueRow + 1, 8);

  styleSectionHeader_(sh.getRange(DASH.trendHeaderRow, 2, 1, 8),
    'TRENDS')
    .setFormula('="TRENDS   ·   12 months ending "&IFERROR(TEXT(SelMonthDate,"MMM yyyy"),"")');
  sh.setRowHeight(DASH.trendHeaderRow, 22);
}


/* ---------------------------------------------------------------------------
 * The category table: REPT bar, over/under, 3-month comparison, sparkline
 * -------------------------------------------------------------------------*/

function buildCategoryTable_(sh) {
  var hr = DASH.tableHeaderRow, r0 = DASH.tableFirstRow, n = LIMITS.categoryRows;

  styleSectionHeader_(sh.getRange(hr - 1, 2, 1, 8), 'CATEGORIES')
    .setFormula('="CATEGORIES   ·   "&IFERROR(TEXT(SelMonthDate,"MMMM yyyy"),"")&' +
                '"   ·   biggest spend first"');
  sh.setRowHeight(hr - 1, 22);

  sh.getRange(hr, 2, 1, 9).setValues([[
    'Category', 'Bucket', 'Actual', '▮ vs target', 'Budget',
    'Over / Under', '3-mo avg', 'vs 3-mo avg', 'Last 12 months'
  ]])
    .setFontWeight('bold').setFontSize(9).setFontColor('#FFFFFF')
    .setBackground(INK.heading).setVerticalAlignment('middle');
  sh.getRange(hr, 4, 1, 1).setHorizontalAlignment('right');
  sh.setRowHeight(hr, 24);

  var rows = [];
  for (var i = 1; i <= n; i++) {
    var r = r0 + i - 1;
    var blank = 'IF($B' + r + '="","",';
    rows.push([
      '=IFERROR(INDEX(CatTable,' + i + ',1),"")',                        // B Category
      '=' + blank + 'IFERROR(INDEX(CatTable,' + i + ',3),""))',          // C Bucket
      '=' + blank + 'IFERROR(INDEX(CatTable,' + i + ',2),0))',           // D Actual
      '=' + blank + fBar_('$D' + r, '$F' + r, LIMITS.barChars) + ')',    // E bar
      '=' + blank + 'IFERROR(INDEX(CatTable,' + i + ',4),0))',           // F Budget
      '=' + blank + 'IF(N($F' + r + ')<=0,"",$F' + r + '-$D' + r + '))', // G Over/Under
      '=' + blank + 'IFERROR(INDEX(CatTable,' + i + ',5),0))',           // H 3-mo avg
      '=' + blank + '$D' + r + '-$H' + r + ')',                          // I vs 3-mo avg
      '=' + blank + 'IFERROR(SPARKLINE(INDEX(SparkMatrix,' + i + ',0),' +
        '{"charttype","column";' +
        '"color",IFERROR(VLOOKUP($C' + r + ',BucketColors,2,FALSE),"' + PALETTE.fixed + '");' +
        '"negcolor","' + PALETTE.leftover + '";' +
        '"empty","zero"}),""))'                                          // J sparkline
    ]);
  }
  sh.getRange(r0, 2, n, 9).setFormulas(rows);

  sh.getRange(r0, 3, n, 1).setHorizontalAlignment('center').setFontSize(9);
  sh.getRange(r0, 4, n, 1).setNumberFormat(FMT.money);
  sh.getRange(r0, 5, n, 1)
    .setFontFamily('Roboto Mono').setFontSize(9)
    .setHorizontalAlignment('left').setFontColor(INK.body);
  sh.getRange(r0, 6, n, 1).setNumberFormat(FMT.money).setFontColor(INK.muted);
  sh.getRange(r0, 7, n, 1).setNumberFormat(FMT.overUnder).setFontSize(9);
  sh.getRange(r0, 8, n, 1).setNumberFormat(FMT.money).setFontColor(INK.muted);
  sh.getRange(r0, 9, n, 1).setNumberFormat(FMT.delta).setFontSize(9);
  sh.getRange(r0, 2, n, 9)
    .setBorder(null, null, null, null, false, true,
               INK.hairline, SpreadsheetApp.BorderStyle.SOLID);
  for (var rr = r0; rr < r0 + n; rr++) sh.setRowHeight(rr, 21);
}


/* ---------------------------------------------------------------------------
 * Legend + footnotes
 * -------------------------------------------------------------------------*/

function buildNotes_(sh) {
  var r = DASH.notesRow;
  styleSectionHeader_(sh.getRange(r - 1, 2, 1, 8), 'HOW TO READ THIS');
  sh.setRowHeight(r - 1, 22);

  var notes = [
    '▮ vs target  —  ' + BAR.full + ' filled to your monthly budget_target, ' +
      BAR.over + ' means you have gone past it. Colour is doubled with ▲/▼ so it ' +
      'never depends on hue alone.',
    'Money out is fixed + variable + debt. Savings contributions are tracked ' +
      'separately, so moving money to savings does not read as spending.',
    'Transfers and anything Tiller marks Hide From Reports are excluded — that is ' +
      'why a credit-card payment does not double-count against the spend it already covered.',
    'Refunds net against the category they landed in, so a returned purchase ' +
      'reduces that month rather than disappearing. A category can go negative; that is a ' +
      'net refund, not a bug.',
    'Every total is a SUMIFS or QUERY over full-column named ranges. Tiller can ' +
      'append rows every morning without moving a single formula.',
    'Anything that does not map to a bucket lands on the Flags tab, and the ' +
      'reconciliation block there proves nothing fell out of the totals.'
  ];
  notes.forEach(function (t, i) {
    sh.getRange(r + i, 2, 1, 8).merge()
      .setValue('·  ' + t)
      .setFontSize(9).setFontColor(INK.muted).setWrap(true)
      .setVerticalAlignment('middle');
    sh.setRowHeight(r + i, 28);
  });
}


/* ---------------------------------------------------------------------------
 * Conditional formatting
 * -------------------------------------------------------------------------*/

function applyDashboardFormatting_(sh) {
  var rules = [];
  var r0 = DASH.tableFirstRow, n = LIMITS.categoryRows;

  var actual  = sh.getRange(r0, 4, n, 1);
  var bar     = sh.getRange(r0, 5, n, 1);
  var overUnd = sh.getRange(r0, 7, n, 1);
  var vsAvg   = sh.getRange(r0, 9, n, 1);
  var bucket  = sh.getRange(r0, 3, n, 1);

  var overFormula  = '=AND($B' + r0 + '<>"",N($F' + r0 + ')>0,$D' + r0 + '>$F' + r0 + ')';
  var underFormula = '=AND($B' + r0 + '<>"",N($F' + r0 + ')>0,$D' + r0 + '<=$F' + r0 + ')';
  var refundFormula= '=AND($B' + r0 + '<>"",$D' + r0 + '<0)';

  // Refund rows win: a category that nets negative for the month is neither
  // "over" nor "under", it is money coming back.
  rules.push(cf_(refundFormula, SIGNAL.goodBg, PALETTE.savings, [actual, overUnd, bar]));
  rules.push(cf_(overFormula,  SIGNAL.badBg,  SIGNAL.badText,  [actual, overUnd]));
  rules.push(cf_(underFormula, SIGNAL.goodBg, SIGNAL.goodText, [actual, overUnd]));
  rules.push(cf_(overFormula,  null, SIGNAL.badText,  [bar]));
  rules.push(cf_(underFormula, null, SIGNAL.goodText, [bar]));

  // Spending more than your own 3-month average reads as a warning, not a failure.
  rules.push(cf_('=AND($B' + r0 + '<>"",$I' + r0 + '>0)', null, SIGNAL.badText,  [vsAvg]));
  rules.push(cf_('=AND($B' + r0 + '<>"",$I' + r0 + '<0)', null, SIGNAL.goodText, [vsAvg]));

  VISIBLE_BUCKETS.forEach(function (b) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(b)
      .setBackground(PALETTE[b])
      .setFontColor(b === 'savings' ? INK.heading : '#FFFFFF')
      .setBold(true).setRanges([bucket]).build());
  });

  // Cards.
  var net  = sh.getRange(DASH.cardValueRow, 6, 2, 2);
  var rate = sh.getRange(DASH.cardValueRow, 8, 2, 2);
  rules.push(cf_('=N($F$' + DASH.cardValueRow + ')<0',  null, SIGNAL.badText,  [net]));
  rules.push(cf_('=N($F$' + DASH.cardValueRow + ')>=0', null, SIGNAL.goodText, [net]));
  rules.push(cf_('=N($H$' + DASH.cardValueRow + ')<0',  null, SIGNAL.badText,  [rate]));
  rules.push(cf_('=AND(N($H$' + DASH.cardValueRow + ')>=0,N($H$' + DASH.cardValueRow +
                 ')<CfgTargetSavingsRate)', null, SIGNAL.warnText, [rate]));
  rules.push(cf_('=N($H$' + DASH.cardValueRow + ')>=CfgTargetSavingsRate',
                 null, SIGNAL.goodText, [rate]));

  // Deltas: "good" direction differs per card, so each gets its own pair.
  var d = DASH.cardDeltaRow;
  [[2, 'up'], [4, 'down'], [6, 'up'], [8, 'up']].forEach(function (pair) {
    var col = columnLetter_(pair[0]);
    var cell = sh.getRange(d, pair[0], 1, 2);
    var upGood = pair[1] === 'up';
    rules.push(cf_('=N($' + col + '$' + d + ')>0', null,
                   upGood ? SIGNAL.goodText : SIGNAL.badText, [cell]));
    rules.push(cf_('=N($' + col + '$' + d + ')<0', null,
                   upGood ? SIGNAL.badText : SIGNAL.goodText, [cell]));
  });

  sh.setConditionalFormatRules(rules);
}

/** Small wrapper: custom-formula rule with optional background. */
function cf_(formula, bg, fontColour, ranges) {
  var rule = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula);
  if (bg) rule.setBackground(bg);
  if (fontColour) rule.setFontColor(fontColour);
  return rule.setRanges(ranges).build();
}
