/**
 * BudgetSetup.gs
 * ---------------------------------------------------------------------------
 * The "Budget Setup" tab: your mapping from each Tiller category to a bucket
 * and a monthly target, plus a handful of settings.
 *
 * Rebuilds are non-destructive. Anything you have typed — buckets, targets,
 * settings — is read back in before the tab is rewritten and put back exactly
 * where it was.
 */

var SETUP_HEADERS = [
  'Category', 'Bucket', 'Monthly Budget Target',
  'Group (Tiller)', 'Type (Tiller)', 'Hidden From Reports', 'Counts in reports?'
];

var SETUP_SETTINGS = [
  ['Monthly savings target',   1000,                         FMT.money,
   'Fills the first savings-goal bar on the Dashboard.'],
  ['Cumulative savings goal',  35000,                        FMT.money,
   'Fills the second bar, measured against real account balances.'],
  ['Goal label',               'Emergency fund',             FMT.text,
   'Whatever you want the cumulative bar to be called.'],
  ['Savings accounts match',   'savings|emergency|hysa',     FMT.text,
   'Lower-case regex matched against account names in Balances.'],
  ['Target savings rate',      0.20,                         FMT.pctBig,
   'The savings-rate card turns green at or above this.']
];


/* ---------------------------------------------------------------------------
 * Build
 * -------------------------------------------------------------------------*/

function buildBudgetSetup_(ss, src) {
  var sh = ensureOwnSheet_(ss, TABS.setup);
  var keep = readExistingSetup_(sh);         // never lose typed-in work
  wipeOwnSheet_(sh);

  var firstRow = 5;
  var lastRow  = LIMITS.setupRows + 4;

  // --- title ---------------------------------------------------------------
  sh.getRange('A1:G1').merge()
    .setValue('Budget Setup')
    .setFontSize(16).setFontWeight('bold').setFontColor(INK.heading);
  sh.getRange('A2:G2').merge()
    .setValue('You own this tab. Map every Tiller category to a bucket and a monthly ' +
              'target. Columns D–G are read from Tiller and are not editable — leave them alone.')
    .setFontSize(9).setFontColor(INK.muted).setWrap(true);
  sh.setRowHeight(2, 30);

  // --- header row ----------------------------------------------------------
  sh.getRange(4, 1, 1, SETUP_HEADERS.length)
    .setValues([SETUP_HEADERS])
    .setFontWeight('bold').setFontColor('#FFFFFF')
    .setBackground(INK.heading).setVerticalAlignment('middle');
  sh.setRowHeight(4, 26);
  sh.setFrozenRows(4);

  // --- category column -----------------------------------------------------
  var seeded = seedCategories_(src, keep);
  var n = Math.min(seeded.length, LIMITS.setupRows);
  if (n > 0) {
    sh.getRange(firstRow, 1, n, 1)
      .setValues(seeded.slice(0, n).map(function (r) { return [r.category]; }));
    sh.getRange(firstRow, 2, n, 1)
      .setValues(seeded.slice(0, n).map(function (r) { return [r.bucket]; }));
    sh.getRange(firstRow, 3, n, 1)
      .setValues(seeded.slice(0, n).map(function (r) { return [r.target]; }));
  }

  // Live dropdown straight off Tiller's Categories column: anything Tiller
  // adds shows up in this list without re-running setup.
  sh.getRange(firstRow, 1, LIMITS.setupRows, 1)
    .setDataValidation(categoryValidation_(src));

  sh.getRange(firstRow, 2, LIMITS.setupRows, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(BUCKETS, true).setAllowInvalid(false)
      .setHelpText('fixed · variable · debt · savings — plus income (auto) and ' +
                   'ignore (drop this category from every total).')
      .build());

  // --- derived columns D–G -------------------------------------------------
  var d = [], e = [], fcol = [], g = [];
  for (var r = firstRow; r <= lastRow; r++) {
    d.push(['=IF($A' + r + '="","",IFERROR(VLOOKUP($A' + r +
            ',{CatName,CatGroup},2,FALSE),"⚠ not in Tiller Categories"))']);
    e.push(['=IF($A' + r + '="","",IFERROR(VLOOKUP($A' + r +
            ',{CatName,CatType},2,FALSE),""))']);
    fcol.push(['=IF($A' + r + '="","",IFERROR(REGEXMATCH(LOWER(TRIM(VLOOKUP($A' + r +
               ',{CatName,CatHide},2,FALSE)&"")),"^(true|hide|yes|y|x|1)$"),FALSE))']);
    // A category counts toward the dashboard unless Tiller hides it, Tiller
    // calls it a Transfer, or you left the bucket blank / set it to ignore.
    g.push(['=IF($A' + r + '="","",IF(OR($F' + r + '=TRUE,LOWER($E' + r +
            ')="transfer",$B' + r + '="",LOWER($B' + r + ')="ignore"),0,1))']);
  }
  sh.getRange(firstRow, 4, d.length, 1).setFormulas(d);
  sh.getRange(firstRow, 5, e.length, 1).setFormulas(e);
  sh.getRange(firstRow, 6, fcol.length, 1).setFormulas(fcol);
  sh.getRange(firstRow, 7, g.length, 1).setFormulas(g);

  sh.getRange(firstRow, 3, LIMITS.setupRows, 1).setNumberFormat(FMT.money);
  sh.getRange(firstRow, 7, LIMITS.setupRows, 1)
    .setNumberFormat('"✓ counts";;"— excluded"').setHorizontalAlignment('center');
  sh.getRange(firstRow, 4, LIMITS.setupRows, 4).setFontColor(INK.muted);

  // --- settings block ------------------------------------------------------
  sh.getRange('I2:K2').merge().setValue('SETTINGS')
    .setFontWeight('bold').setFontColor(INK.heading).setBackground(INK.panel);
  for (var i = 0; i < SETUP_SETTINGS.length; i++) {
    var row = 3 + i, def = SETUP_SETTINGS[i];
    sh.getRange(row, 9).setValue(def[0]).setFontColor(INK.body);
    var cell = sh.getRange(row, 10);
    cell.setValue(keep.settings[def[0]] !== undefined ? keep.settings[def[0]] : def[1]);
    cell.setNumberFormat(def[2]).setFontWeight('bold')
        .setBackground('#FFFDF3').setBorder(true, true, true, true, false, false,
                                            INK.hairline, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(row, 11).setValue(def[3]).setFontSize(9).setFontColor(INK.muted);
  }

  // --- bucket legend -------------------------------------------------------
  sh.getRange('I9:K9').merge().setValue('BUCKETS')
    .setFontWeight('bold').setFontColor(INK.heading).setBackground(INK.panel);
  var legend = [
    ['income',   'Auto-seeded onto every Tiller category whose Type is Income.'],
    ['fixed',    'Same-ish every month: rent, insurance, utilities, subscriptions.'],
    ['variable', 'You can move it week to week: groceries, dining, shopping.'],
    ['debt',     'Loan and card payments that reduce a balance you owe.'],
    ['savings',  'Money moved to savings or investments. Not counted as spend.'],
    ['ignore',   'Drop this category from every total on the dashboard.']
  ];
  sh.getRange(10, 9, legend.length, 1)
    .setValues(legend.map(function (r) { return [r[0]]; }))
    .setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(10, 10, legend.length, 2)
    .setValues(legend.map(function (r) { return [r[1], '']; }))
    .setFontSize(9).setFontColor(INK.muted);
  for (var k = 0; k < legend.length; k++) {
    var c = PALETTE[legend[k][0]] || INK.muted;
    sh.getRange(10 + k, 9).setBackground(c)
      .setFontColor(legend[k][0] === 'savings' ? INK.heading : '#FFFFFF');
  }

  // --- cosmetics -----------------------------------------------------------
  [220, 100, 150, 160, 110, 130, 130, 24, 190, 130, 340].forEach(function (w, i) {
    sh.setColumnWidth(i + 1, w);
  });
  sh.getRange(firstRow, 1, LIMITS.setupRows, 7)
    .setBorder(null, null, null, null, true, true, INK.hairline,
               SpreadsheetApp.BorderStyle.SOLID);

  applySetupFormatting_(sh, firstRow, lastRow);
  return sh;
}


/** Bucket chips, plus a gentle flag on rows that are not yet mapped. */
function applySetupFormatting_(sh, firstRow, lastRow) {
  var rules = [];
  var bucketRange = sh.getRange(firstRow, 2, LIMITS.setupRows, 1);

  VISIBLE_BUCKETS.concat(['income']).forEach(function (b) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(b)
      .setBackground(PALETTE[b])
      .setFontColor(b === 'savings' ? INK.heading : '#FFFFFF')
      .setBold(true)
      .setRanges([bucketRange]).build());
  });
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('ignore')
    .setBackground(SIGNAL.flatBg).setFontColor(SIGNAL.flatText)
    .setRanges([bucketRange]).build());

  // Category present but no bucket yet → it would silently vanish from totals.
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A' + firstRow + '<>"",$B' + firstRow + '="")')
    .setBackground(SIGNAL.warnBg).setFontColor(SIGNAL.warnText)
    .setRanges([sh.getRange(firstRow, 1, LIMITS.setupRows, 7)]).build());

  // Counted, spendable, but no target → the bar has nothing to measure against.
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($G' + firstRow + '=1,LOWER($B' + firstRow +
                          ')<>"income",N($C' + firstRow + ')=0)')
    .setBackground(SIGNAL.warnBg).setFontColor(SIGNAL.warnText)
    .setRanges([sh.getRange(firstRow, 3, LIMITS.setupRows, 1)]).build());

  sh.setConditionalFormatRules(rules);
}


/* ---------------------------------------------------------------------------
 * Preserving your work across rebuilds
 * -------------------------------------------------------------------------*/

function readExistingSetup_(sh) {
  var out = { rows: {}, settings: {} };
  if (sh.getLastRow() < 5) return out;

  var n = Math.min(sh.getLastRow() - 4, LIMITS.setupRows);
  if (n > 0) {
    var vals = sh.getRange(5, 1, n, 3).getValues();
    vals.forEach(function (r) {
      var cat = String(r[0] || '').trim();
      if (cat) out.rows[cat] = { bucket: String(r[1] || '').trim(), target: r[2] };
    });
  }
  // Settings live in I3:J7 — read them by their label, not their position, so
  // reordering the block later cannot silently reset someone's numbers.
  var block = sh.getRange(2, 9, 8, 2).getValues();
  block.forEach(function (r) {
    var label = String(r[0] || '').trim();
    if (label && r[1] !== '' && r[1] !== null) out.settings[label] = r[1];
  });
  return out;
}


/**
 * The category list: every category Tiller knows about, plus any category that
 * shows up in Transactions but is missing from Tiller's Categories tab, plus
 * anything already in Budget Setup. Existing buckets and targets win.
 */
function seedCategories_(src, keep) {
  var known = {};
  var order = [];
  var push = function (cat, meta) {
    cat = String(cat || '').trim();
    if (!cat || known[cat]) return;
    known[cat] = meta || {};
    order.push(cat);
  };

  // From Tiller's Categories tab.
  var ch = readHeaders_(src.cat.sheet, ['Category', 'Group', 'Type', 'Hide From Reports']);
  var cCat  = ch.cols[normHeader_('Category')];
  var cGrp  = ch.cols[normHeader_('Group')];
  var cType = ch.cols[normHeader_('Type')];
  var cHide = ch.cols[normHeader_('Hide From Reports')] || ch.cols[normHeader_('Hide')];
  var lastCatRow = src.cat.sheet.getLastRow();
  if (cCat && lastCatRow > ch.row) {
    var grid = src.cat.sheet.getRange(ch.row + 1, 1, lastCatRow - ch.row,
                                      src.cat.sheet.getLastColumn()).getValues();
    grid.forEach(function (r) {
      push(r[cCat - 1], {
        group: cGrp  ? r[cGrp - 1]  : '',
        type:  cType ? r[cType - 1] : '',
        hide:  cHide ? r[cHide - 1] : ''
      });
    });
  }

  // Anything that appears in Transactions but Tiller has never heard of.
  var th = readHeaders_(src.tx.sheet, ['Date', 'Category', 'Amount']);
  var tCat = th.cols[normHeader_('Category')];
  var lastTxRow = src.tx.sheet.getLastRow();
  if (tCat && lastTxRow > th.row) {
    var col = src.tx.sheet.getRange(th.row + 1, tCat, lastTxRow - th.row, 1).getValues();
    col.forEach(function (r) { push(r[0], { orphan: true }); });
  }

  // Anything you added by hand last time.
  Object.keys(keep.rows).forEach(function (cat) { push(cat, { manual: true }); });

  return order.map(function (cat) {
    var prior = keep.rows[cat];
    return {
      category: cat,
      bucket: (prior && prior.bucket) ? prior.bucket : guessBucket_(cat, known[cat]),
      target: (prior && prior.target !== '' && prior.target != null) ? prior.target : ''
    };
  });
}


/** First-pass bucket guess from Tiller's own Type/Group plus the category name. */
function guessBucket_(category, meta) {
  meta = meta || {};
  var type = String(meta.type || '').trim().toLowerCase();
  var hide = String(meta.hide || '').trim().toLowerCase();

  if (type === 'income')   return 'income';
  if (type === 'transfer') return 'ignore';
  if (/^(true|hide|yes|y|x|1)$/.test(hide)) return 'ignore';

  var hay = (category + ' ' + (meta.group || '')).toLowerCase();
  var DEBT    = /(loan|debt|interest|mortgage principal|card payment|payoff)/;
  var SAVINGS = /(saving|invest|brokerage|401|ira|529|emergency|retire)/;
  var FIXED   = new RegExp(
    'rent|mortgage|insurance|utilit|electric|water|gas bill|internet|phone|' +
    'subscription|streaming|tuition|childcare|daycare|gym|membership|hoa');

  if (DEBT.test(hay))    return 'debt';
  if (SAVINGS.test(hay)) return 'savings';
  if (FIXED.test(hay))   return 'fixed';
  return 'variable';
}


/** Live dropdown sourced from Tiller's Categories column. */
function categoryValidation_(src) {
  var ch = readHeaders_(src.cat.sheet, ['Category', 'Group', 'Type']);
  var col = ch.cols[normHeader_('Category')] || 1;
  var rng = src.cat.sheet.getRange(ch.row + 1, col,
                                   Math.max(1, src.cat.sheet.getMaxRows() - ch.row), 1);
  return SpreadsheetApp.newDataValidation()
    .requireValueInRange(rng, true)
    .setAllowInvalid(true)   // a category Tiller dropped should warn, not block
    .setHelpText('Pulled live from the ' + src.cat.sheet.getName() + ' tab.')
    .build();
}


/* ---------------------------------------------------------------------------
 * Incremental refresh — append new categories, touch nothing else.
 * -------------------------------------------------------------------------*/

function refreshBudgetSetupCategories_(ss, src) {
  var sh = ss.getSheetByName(TABS.setup);
  if (!sh) return 0;
  assertWritable_(sh.getName());

  var keep = readExistingSetup_(sh);
  var wanted = seedCategories_(src, keep);
  var existing = {};
  Object.keys(keep.rows).forEach(function (c) { existing[c] = true; });

  var added = wanted.filter(function (r) { return !existing[r.category]; });
  if (!added.length) return 0;

  var startRow = Math.max(5, sh.getLastRow() + 1);
  if (startRow + added.length - 1 > LIMITS.setupRows + 4) {
    throw new Error('Budget Setup is full (' + LIMITS.setupRows +
                    ' categories). Raise LIMITS.setupRows in Config.gs and re-run setup.');
  }
  sh.getRange(startRow, 1, added.length, 3).setValues(
    added.map(function (r) { return [r.category, r.bucket, r.target]; }));
  return added.length;
}


/** Menu action: fill any blank target with that category's 3-month average. */
function seedTargetsFromHistory() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TABS.setup);
  if (!sh) throw new Error('Run setup first.');
  assertWritable_(sh.getName());

  var n = Math.max(0, Math.min(sh.getLastRow() - 4, LIMITS.setupRows));
  if (!n) return;

  var cats    = sh.getRange(5, 1, n, 1).getValues();
  var buckets = sh.getRange(5, 2, n, 1).getValues();
  var targets = sh.getRange(5, 3, n, 1).getValues();

  var filled = 0;
  var formulas = [];
  for (var i = 0; i < n; i++) {
    var cat = String(cats[i][0] || '').trim();
    var bucket = String(buckets[i][0] || '').trim().toLowerCase();
    var blank = targets[i][0] === '' || targets[i][0] === null || targets[i][0] === 0;
    if (cat && blank && VISIBLE_BUCKETS.indexOf(bucket) >= 0) {
      formulas.push(['=ROUND(IFERROR((' +
        'SUMIFS(CalcSpend,CalcCat,$A' + (5 + i) + ',CalcMonth,' + monthKey_(-1) + ',CalcCounts,1)+' +
        'SUMIFS(CalcSpend,CalcCat,$A' + (5 + i) + ',CalcMonth,' + monthKey_(-2) + ',CalcCounts,1)+' +
        'SUMIFS(CalcSpend,CalcCat,$A' + (5 + i) + ',CalcMonth,' + monthKey_(-3) + ',CalcCounts,1)' +
        ')/3,0),-1)']);
      filled++;
    } else {
      formulas.push([targets[i][0]]);
    }
  }
  sh.getRange(5, 3, n, 1).setValues(formulas);

  // Freeze them into plain numbers so a later month change cannot move your budget.
  SpreadsheetApp.flush();
  var computed = sh.getRange(5, 3, n, 1).getValues();
  sh.getRange(5, 3, n, 1).setValues(computed);

  var sel = ss.getRangeByName('SelMonth');
  ss.toast('Seeded ' + filled + ' target' + (filled === 1 ? '' : 's') +
           ' from the 3 months before ' +
           ((sel && sel.getValue()) || 'the selected month') +
           '. They are plain numbers now — edit any of them freely.',
           'Targets seeded', 6);
}
