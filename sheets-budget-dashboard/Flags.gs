/**
 * Flags.gs
 * ---------------------------------------------------------------------------
 * The "nothing fell out of the totals" tab.
 *
 * Four blocks, each in its own column band so a spilling QUERY can grow as far
 * as it likes without colliding with its neighbour:
 *
 *   A  ① transactions that map to nothing
 *   G  ② categories seen in Transactions but missing from Budget Setup
 *   K  ③ Budget Setup rows that need attention
 *   O  ④ reconciliation: the parts, the whole, and the difference
 *
 * Block ④ is the important one. It adds up every slice of the selected month —
 * income, each bucket, the deliberately excluded, and the not-yet-mapped — and
 * compares that against the raw sum of every transaction in the month. If the
 * difference is not zero, something is being double-counted or dropped.
 */

function buildFlags_(ss) {
  var sh = wipeOwnSheet_(ensureOwnSheet_(ss, TABS.flags));

  sh.getRange('A1:H1').merge()
    .setValue('Flags')
    .setFontSize(16).setFontWeight('bold').setFontColor(INK.heading);
  sh.setRowHeight(1, 30);

  // Driven by the numeric checks in block ④, not by COUNTA over a QUERY that
  // writes "✓ none" into its own first cell when it finds nothing.
  sh.getRange('A2:M2').merge()
    .setFormula(
      '=IF(N($P$15)<>0,' +
        '"⚠ "&IFERROR(TEXT(SelMonthDate,"MMMM yyyy"),"This month")&' +
        '" does not reconcile — off by "&TEXT(ABS($P$15),"' + FMT.moneyBig + '")&' +
        '". See block ④.",' +
      'IF(N($P$22)=0,' +
        '"✓ Every transaction maps to a bucket, and "&' +
        'IFERROR(TEXT(SelMonthDate,"MMMM yyyy"),"the selected month")&" reconciles.",' +
        '"⚠ "&$P$22&" transaction"&IF($P$22=1,"","s")&" map to nothing — listed in ① below."&' +
        'IF(ABS(N($P$12))<0.005,"",' +
          '" "&TEXT(ABS($P$12),"' + FMT.moneyBig + '")&" of that lands in "&' +
          'IFERROR(TEXT(SelMonthDate,"MMMM yyyy"),"the selected month")&".")))')
    .setFontSize(11).setFontWeight('bold').setVerticalAlignment('middle');
  sh.setRowHeight(2, 26);

  sh.getRange('A3:M3').merge()
    .setFormula('="Selected month: "&IFERROR(TEXT(SelMonthDate,"MMMM yyyy"),"")&' +
                '"   ·   change it on the Dashboard   ·   source: ' + sourceLabel_() + '"')
    .setFontSize(9).setFontColor(INK.muted);

  blockUnmappedTransactions_(sh);
  blockMissingCategories_(sh);
  blockSetupProblems_(sh);
  blockReconciliation_(sh);

  [130, 230, 150, 100, 140, 24,
   180, 70, 110, 24,
   180, 100, 110, 24,
   220, 120, 260].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  sh.setFrozenRows(5);
  applyFlagsFormatting_(sh);
  return sh;
}


/* --- ① transactions that map to nothing ---------------------------------- */

function blockUnmappedTransactions_(sh) {
  flagHeader_(sh, 'A4:E4', '①  Transactions that map to nothing',
              'Blank category, or a category that is not on Budget Setup. ' +
              'These are excluded from every total until you map them.');
  sh.getRange('A5:E5').setValues([['Date', 'Description', 'Category', 'Amount', 'Account']]);
  styleFlagHeaderRow_(sh.getRange('A5:E5'));

  sh.getRange('A6').setFormula(
    '=IFERROR(QUERY({CalcDate,CalcDesc,CalcCat,CalcAmt,CalcAcct,CalcMapped},' +
    '"select Col1, Col2, Col3, Col4, Col5 ' +
    'where Col6 = 0 and Col1 > 0 ' +
    'order by Col1 desc limit 300 ' +
    'label Col1 \'\', Col2 \'\', Col3 \'\', Col4 \'\', Col5 \'\'",0),' +
    '"✓ none — every transaction maps to a bucket")');

  sh.getRange('A6:A305').setNumberFormat(FMT.date);
  sh.getRange('D6:D305').setNumberFormat(FMT.moneySigned);
}


/* --- ② categories Tiller uses that Budget Setup has never seen ----------- */

function blockMissingCategories_(sh) {
  flagHeader_(sh, 'G4:I4', '②  Categories missing from Budget Setup',
              'Add these on the Budget Setup tab, or use 💰 Budget ▸ ' +
              'Add missing categories.');
  sh.getRange('G5:I5').setValues([['Category', 'Txns', 'Net amount']]);
  styleFlagHeaderRow_(sh.getRange('G5:I5'));

  // CalcSpend is deliberately 0 for anything that does not count, so summing
  // it here would report $0 for every unmapped category — exactly the money
  // this block exists to surface. Sum the raw signed amount instead.
  sh.getRange('G6').setFormula(
    '=IFERROR(QUERY({CalcCat,CalcMapped,CalcAmt,CalcDate},' +
    '"select Col1, count(Col4), sum(Col3) ' +
    'where Col2 = 0 and Col4 > 0 and Col1 is not null and Col1 != \'\' ' +
    'group by Col1 order by count(Col4) desc limit 200 ' +
    'label Col1 \'\', count(Col4) \'\', sum(Col3) \'\'",0),"✓ none")');

  sh.getRange('I6:I205').setNumberFormat(FMT.moneySigned);
}


/* --- ③ Budget Setup rows that need attention ----------------------------- */

function blockSetupProblems_(sh) {
  flagHeader_(sh, 'K4:M4', '③  Budget Setup rows to finish',
              'No bucket at all, or a spendable bucket with no monthly target ' +
              '(so its bar has nothing to measure against).');
  sh.getRange('K5:M5').setValues([['Category', 'Bucket', 'Target']]);
  styleFlagHeaderRow_(sh.getRange('K5:M5'));

  var spendable = VISIBLE_BUCKETS.map(function (b) { return "Col2 = '" + b + "'"; }).join(' or ');
  sh.getRange('K6').setFormula(
    '=IFERROR(QUERY({SetupCat,SetupBucket,SetupTarget},' +
    '"select Col1, Col2, Col3 ' +
    'where Col1 is not null and Col1 != \'\' and (' +
      'Col2 is null or Col2 = \'\' or ' +
      '((' + spendable + ') and (Col3 is null or Col3 = 0))' +
    ') order by Col2 limit 200 ' +
    'label Col1 \'\', Col2 \'\', Col3 \'\'",0),"✓ none")');

  sh.getRange('M6:M205').setNumberFormat(FMT.money);
}


/* --- ④ reconciliation ---------------------------------------------------- */

function blockReconciliation_(sh) {
  flagHeader_(sh, 'O4:Q4', '④  Reconciliation — the selected month',
              'Every slice of the month, then the raw total. The difference ' +
              'must be zero.');
  sh.getRange('O5:Q5').setValues([['Slice', 'Amount', 'What it is']]);
  styleFlagHeaderRow_(sh.getRange('O5:Q5'));

  var M = 'SelMonth';
  var rows = [
    ['①  Income',    '=IFERROR(' + fBucket_(M, 'income') + ',0)',
     'Categories you bucketed income.'],
    ['②  Fixed',     '=IFERROR(' + fBucket_(M, 'fixed') + ',0)',
     'Counts as money out.'],
    ['③  Variable',  '=IFERROR(' + fBucket_(M, 'variable') + ',0)',
     'Counts as money out.'],
    ['④  Debt',      '=IFERROR(' + fBucket_(M, 'debt') + ',0)',
     'Counts as money out.'],
    ['⑤  Savings',   '=IFERROR(' + fBucket_(M, 'savings') + ',0)',
     'Tracked separately — not money out.'],
    ['⑥  Excluded',  '=IFERROR(SUMIFS(CalcAmt,CalcMonth,' + M +
                     ',CalcCounts,0,CalcMapped,1),0)',
     'Transfers, Hide From Reports, and anything you set to ignore. ' +
     'This is what stops a card payment double-counting.'],
    ['⑦  Unmapped',  '=IFERROR(SUMIFS(CalcAmt,CalcMonth,' + M + ',CalcMapped,0),0)',
     'Not on Budget Setup yet. Listed in ① and ② to the left.']
  ];
  sh.getRange(6, 15, rows.length, 1).setValues(rows.map(function (r) { return [r[0]]; }));
  sh.getRange(6, 16, rows.length, 1).setFormulas(rows.map(function (r) { return [r[1]]; }));
  sh.getRange(6, 17, rows.length, 1).setValues(rows.map(function (r) { return [r[2]]; }));

  sh.getRange(13, 15, 3, 1).setValues([
    ['Sum of ① – ⑦'], ['Every transaction in the month'], ['Difference']]);
  sh.getRange(13, 16, 3, 1).setFormulas([
    ['=SUM($P$6:$P$12)'],
    ['=IFERROR(SUMIF(CalcMonth,' + M + ',CalcAmt),0)'],
    ['=ROUND($P$13-$P$14,2)']
  ]);
  sh.getRange(13, 17, 3, 1).setValues([
    ['The parts.'], ['The whole, straight off Tiller.'],
    ['Zero means nothing is dropped and nothing is counted twice.']
  ]);

  // Health checks that a straight sum cannot catch.
  flagHeader_(sh, 'O17:Q17', 'Health checks', '');
  var checks = [
    ['Categories with no bucket',
     '=IFERROR(SUMPRODUCT((SetupCat<>"")*(SetupBucket="")),0)',
     'Each one silently drops out of every total.'],
    ['Income categories not bucketed income',
     '=IFERROR(SUMPRODUCT((LOWER(SetupType&"")="income")*(LOWER(SetupBucket&"")<>"income")*' +
     '(SetupCat<>"")),0)',
     'Would land in a spend bucket and dent your net.'],
    ['Categories bucketed savings',
     '=IFERROR(SUMPRODUCT((LOWER(SetupBucket&"")="savings")*(SetupCat<>"")),0)',
     'Zero here means the tagged savings rate and the monthly goal bar read 0.'],
    ['Unmapped transactions, all time',
     '=IFERROR(SUMPRODUCT((CalcMapped=0)*(CalcDate>0)),0)',
     'Every one of them is listed in ① to the left.'],
    ['Refunds this month (positive amounts in a spend bucket)',
     '=IFERROR(SUMPRODUCT((CalcMonth=SelMonth)*(CalcCounts=1)*(CalcBucket<>"income")*' +
     '(CalcBucket<>"savings")*(CalcAmt>0)),0)',
     'Netted against their own category, not dropped.']
  ];
  sh.getRange(18, 15, checks.length, 1).setValues(checks.map(function (r) { return [r[0]]; }));
  sh.getRange(18, 16, checks.length, 1).setFormulas(checks.map(function (r) { return [r[1]]; }));
  sh.getRange(18, 17, checks.length, 1).setValues(checks.map(function (r) { return [r[2]]; }));

  sh.getRange('P6:P15').setNumberFormat(FMT.moneySigned);
  sh.getRange('P18:P22').setNumberFormat('0');
  sh.getRange('Q6:Q22').setFontSize(9).setFontColor(INK.muted).setWrap(true);
  sh.getRange('O13:Q15').setFontWeight('bold');
  sh.getRange('O13:Q13').setBorder(true, null, null, null, null, null,
                                   INK.hairline, SpreadsheetApp.BorderStyle.SOLID);
}


/* --- shared styling ------------------------------------------------------ */

function flagHeader_(sh, a1, title, subtitle) {
  var r = sh.getRange(a1);
  r.merge().setValue(title)
   .setFontWeight('bold').setFontSize(11).setFontColor(INK.heading)
   .setBackground(INK.panel).setVerticalAlignment('middle');
  if (subtitle) r.setNote(subtitle);
  sh.setRowHeight(r.getRow(), 24);
  return r;
}

function styleFlagHeaderRow_(range) {
  return range.setFontWeight('bold').setFontSize(9).setFontColor('#FFFFFF')
              .setBackground(INK.heading);
}

function applyFlagsFormatting_(sh) {
  var diff = sh.getRange('P15');
  var rules = [
    cf_('=ABS(N($P$15))<0.005', SIGNAL.goodBg, SIGNAL.goodText, [diff]),
    cf_('=ABS(N($P$15))>=0.005', SIGNAL.badBg, SIGNAL.badText, [diff]),
    cf_('=N($P$18)>0', SIGNAL.warnBg, SIGNAL.warnText, [sh.getRange('O18:Q18')]),
    cf_('=N($P$19)>0', SIGNAL.warnBg, SIGNAL.warnText, [sh.getRange('O19:Q19')]),
    cf_('=N($P$20)=0', SIGNAL.warnBg, SIGNAL.warnText, [sh.getRange('O20:Q20')]),
    cf_('=ABS(N($P$12))>0.005', SIGNAL.warnBg, SIGNAL.warnText,
        [sh.getRange('O12:Q12')])
  ];
  sh.setConditionalFormatRules(rules);
}


/* --- menu action --------------------------------------------------------- */

/** Append every category the Flags tab is complaining about to Budget Setup. */
function addMissingCategories() {
  var ss = SpreadsheetApp.getActive();
  var src = resolveSources_(ss);
  var added = refreshBudgetSetupCategories_(ss, src);
  SpreadsheetApp.flush();
  buildChartData_(ss);
  ss.toast(added === 0
      ? 'Nothing to add — every category is already on Budget Setup.'
      : 'Added ' + added + ' categor' + (added === 1 ? 'y' : 'ies') +
        ' to Budget Setup with a best-guess bucket. Check them and set targets.',
    'Budget Setup', 6);
}
