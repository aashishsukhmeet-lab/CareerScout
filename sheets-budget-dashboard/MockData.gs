/**
 * MockData.gs
 * ---------------------------------------------------------------------------
 * Generates "Mock Transactions", "Mock Categories", "Mock Balances" and
 * "Mock Balance History" using Tiller's own column names and sign conventions,
 * so you can build and test the whole dashboard before Tiller is connected.
 *
 * Flip USE_MOCK_DATA to false in Config.gs and re-run setup to point at the
 * real tabs. Nothing else changes.
 *
 * The data is seeded, so it is the same every time you regenerate it, and it
 * deliberately includes the awkward cases:
 *   · credit-card payments as Transfers (both sides), which must not
 *     double-count as spend
 *   · a "Reimbursable" category marked Hide From Reports
 *   · refunds — positive amounts sitting in expense categories
 *   · a handful of transactions with no category at all
 *   · one category that appears in Transactions but not in Categories
 */

var MOCK_MONTHS = 15;
var MOCK_SEED   = 20260826;

var MOCK_ACCOUNTS = {
  checking:  { name: 'Everyday Checking',   inst: 'Chase',        num: 'xxxx4417',
               id: 'acc_chk_4417',  type: 'Checking',   klass: 'Asset' },
  card:      { name: 'Rewards Card',        inst: 'Chase',        num: 'xxxx8802',
               id: 'acc_crd_8802',  type: 'Credit',     klass: 'Liability' },
  savings:   { name: 'High-Yield Savings',  inst: 'Ally',         num: 'xxxx2290',
               id: 'acc_sav_2290',  type: 'Savings',    klass: 'Asset' },
  brokerage: { name: 'Brokerage',           inst: 'Fidelity',     num: 'xxxx7731',
               id: 'acc_brk_7731',  type: 'Investment', klass: 'Asset' },
  student:   { name: 'Student Loan',        inst: 'Nelnet',       num: 'xxxx0155',
               id: 'acc_stu_0155',  type: 'Loan',       klass: 'Liability' },
  auto:      { name: 'Auto Loan',           inst: 'Capital One',  num: 'xxxx6620',
               id: 'acc_aut_6620',  type: 'Loan',       klass: 'Liability' }
};

/** [category, group, type, hideFromReports] — Tiller's Categories schema. */
var MOCK_CATEGORIES = [
  ['Paycheck',             'Income',         'Income',   ''],
  ['Freelance',            'Income',         'Income',   ''],
  ['Interest Income',      'Income',         'Income',   ''],

  ['Rent',                 'Housing',        'Expense',  ''],
  ['Electric',             'Utilities',      'Expense',  ''],
  ['Internet',             'Utilities',      'Expense',  ''],
  ['Phone',                'Utilities',      'Expense',  ''],
  ['Car Insurance',        'Insurance',      'Expense',  ''],
  ['Health Insurance',     'Insurance',      'Expense',  ''],
  ['Gym',                  'Health',         'Expense',  ''],
  ['Streaming',            'Entertainment',  'Expense',  ''],
  ['Childcare',            'Family',         'Expense',  ''],

  ['Groceries',            'Food',           'Expense',  ''],
  ['Restaurants',          'Food',           'Expense',  ''],
  ['Coffee',               'Food',           'Expense',  ''],
  ['Gas',                  'Transportation', 'Expense',  ''],
  ['Rideshare',            'Transportation', 'Expense',  ''],
  ['Shopping',             'Shopping',       'Expense',  ''],
  ['Home Supplies',        'Home',           'Expense',  ''],
  ['Pet',                  'Family',         'Expense',  ''],
  ['Medical',              'Health',         'Expense',  ''],
  ['Travel',               'Travel',         'Expense',  ''],
  ['Entertainment',        'Entertainment',  'Expense',  ''],
  ['Gifts',                'Gifts',          'Expense',  ''],

  ['Student Loan',         'Debt',           'Expense',  ''],
  ['Car Payment',          'Debt',           'Expense',  ''],
  ['Credit Card Interest', 'Debt',           'Expense',  ''],

  ['Emergency Fund',       'Savings',        'Expense',  ''],
  ['Brokerage Transfer',   'Savings',        'Expense',  ''],
  ['529 Contribution',     'Savings',        'Expense',  ''],

  ['Credit Card Payment',  'Transfers',      'Transfer', ''],
  ['Reimbursable',         'Work',           'Expense',  'Hide']
  // NOTE: "Mystery Subscription" is deliberately absent. It shows up in
  // Transactions so you can watch the Flags tab catch it.
];


/* ---------------------------------------------------------------------------
 * Entry point
 * -------------------------------------------------------------------------*/

function generateMockData() {
  var ss = SpreadsheetApp.getActive();
  var rnd = seededRandom_(MOCK_SEED);
  var today = new Date();
  var anchor = new Date(today.getFullYear(), today.getMonth(), 1);

  writeGrid_(ss, MOCK_TABS.categories,
    ['Category', 'Group', 'Type', 'Hide From Reports'],
    MOCK_CATEGORIES);

  var tx = buildMockTransactions_(rnd, anchor, today);
  writeGrid_(ss, MOCK_TABS.transactions,
    ['Date', 'Description', 'Category', 'Amount', 'Account', 'Institution',
     'Month', 'Week', 'Full Description', 'Transaction ID'],
    tx);

  var balHeaders = ['Date', 'Time', 'Account', 'Account #', 'Account ID',
                    'Institution', 'Type', 'Class', 'Balance', 'Last Updated'];
  var history = buildMockBalances_(anchor, today);
  writeGrid_(ss, MOCK_TABS.balanceHistory, balHeaders, history);

  // "Balances" in Tiller is today's snapshot only.
  var latestDate = history.length ? history[history.length - 1][0] : today;
  var latest = history.filter(function (r) {
    return r[0].getTime() === latestDate.getTime();
  });
  writeGrid_(ss, MOCK_TABS.balances, balHeaders, latest);

  formatMockTabs_(ss);
  ss.toast(tx.length + ' transactions across ' + MOCK_MONTHS + ' months, ' +
           history.length + ' balance snapshots. Now run Set up / refresh everything.',
           'Mock data generated', 8);
  return tx.length;
}


/* ---------------------------------------------------------------------------
 * Transactions
 * -------------------------------------------------------------------------*/

function buildMockTransactions_(rnd, anchor, today) {
  var A = MOCK_ACCOUNTS;
  var rows = [];
  var seq = 0;

  var add = function (date, desc, category, amount, account, fullDesc) {
    if (date > today) return;                       // never invent the future
    seq++;
    rows.push([
      date, desc, category, round2_(amount), account.name, account.inst,
      new Date(date.getFullYear(), date.getMonth(), 1),
      weekStart_(date),
      fullDesc || (desc.toUpperCase() + ' ' + account.inst.toUpperCase()),
      'mock-' + String(20000 + seq)
    ]);
  };

  for (var m = MOCK_MONTHS - 1; m >= 0; m--) {
    var first = new Date(anchor.getFullYear(), anchor.getMonth() - m, 1);
    var y = first.getFullYear(), mo = first.getMonth();
    var lastDay = new Date(y, mo + 1, 0).getDate();
    var isRecent = m < 3;
    var monthIndex = MOCK_MONTHS - 1 - m;           // 0 = oldest
    var D = function (day) { return new Date(y, mo, Math.min(day, lastDay)); };

    /* --- income ---------------------------------------------------------- */
    var raise = 1 + 0.03 * Math.floor(monthIndex / 12);
    add(D(15), 'Northwind Payroll', 'Paycheck', 4150 * raise + rnd.range(-40, 40),
        A.checking, 'NORTHWIND LABS DIRECT DEP PPD');
    add(D(lastDay - (lastDay > 29 ? 1 : 0)), 'Northwind Payroll', 'Paycheck',
        4150 * raise + rnd.range(-40, 40), A.checking, 'NORTHWIND LABS DIRECT DEP PPD');
    if (rnd.next() < 0.35) {
      add(D(rnd.int(6, 24)), 'Consulting invoice', 'Freelance',
          rnd.range(400, 1800), A.checking, 'ACH CREDIT CLIENT INVOICE');
    }
    add(D(lastDay), 'Interest paid', 'Interest Income', rnd.range(8, 35), A.savings);
    if (mo === 11) {
      add(D(18), 'Year-end bonus', 'Paycheck', rnd.range(1800, 3200), A.checking);
    }

    /* --- fixed ----------------------------------------------------------- */
    add(D(1),  'Ridgeline Property Mgmt', 'Rent',             -1975, A.checking);
    add(D(1),  'Meridian Health',         'Health Insurance', -320,  A.checking);
    add(D(2),  'Bright Start Childcare',  'Childcare',        -640,  A.checking);
    add(D(3),  'Ironside Fitness',        'Gym',              -49,   A.card);
    add(D(5),  'Fiberline Internet',      'Internet',         -75,   A.checking);
    add(D(7),  'Metro Power & Light',     'Electric',
        -seasonalElectric_(mo, rnd), A.checking);
    add(D(12), 'Cellcom Wireless',        'Phone',            -95,   A.checking);
    add(D(20), 'Harborline Auto Ins',     'Car Insurance',    -142,  A.checking);
    ['Streamly', 'Tunebox', 'Cinehaus'].forEach(function (svc, i) {
      add(D(4 + i * 6), svc, 'Streaming', -rnd.range(8.99, 18.99), A.card);
    });
    // Present in Transactions, absent from Categories — the Flags tab's canary.
    add(D(9), 'Mystery Subscription', 'Mystery Subscription', -14.99, A.card);

    /* --- variable -------------------------------------------------------- */
    spread_(rnd, add, D, rnd.int(6, 11), ['Greenfield Market', 'Corner Grocer',
      'Harvest Foods'], 'Groceries', 28, 165, A.card);
    spread_(rnd, add, D, rnd.int(5, 12), ['Bao House', 'Trattoria Sole',
      'Curry & Co', 'Blue Diner'], 'Restaurants', 14, 95, A.card);
    spread_(rnd, add, D, rnd.int(8, 18), ['Third Wave Coffee', 'Daily Grind'],
      'Coffee', 4.25, 8.75, A.card);
    spread_(rnd, add, D, rnd.int(3, 5), ['Fuelworks', 'QuickFill'], 'Gas', 32, 68, A.card);
    spread_(rnd, add, D, rnd.int(0, 4), ['Citydrive'], 'Rideshare', 9, 38, A.card);
    spread_(rnd, add, D, rnd.int(2, 5), ['Lumen Goods', 'Northline Outfitters'],
      'Shopping', 18, 170, A.card);
    spread_(rnd, add, D, rnd.int(1, 4), ['Hardware Depot'], 'Home Supplies', 12, 95, A.card);
    spread_(rnd, add, D, rnd.int(1, 2), ['Paws & Claws'], 'Pet', 22, 140, A.card);
    spread_(rnd, add, D, rnd.int(0, 2), ['Lakeside Clinic'], 'Medical', 25, 320, A.checking);
    spread_(rnd, add, D, rnd.int(1, 4), ['Orpheum Theatre', 'Riverbend Cinema'],
      'Entertainment', 12, 85, A.card);
    if (rnd.next() < 0.2) {
      add(D(rnd.int(5, 22)), 'Skybound Airlines', 'Travel', -rnd.range(300, 1400), A.card);
    }
    if (mo === 10 || mo === 11) {
      spread_(rnd, add, D, rnd.int(2, 6), ['Giftworks'], 'Gifts', 20, 150, A.card);
    } else if (rnd.next() < 0.3) {
      add(D(rnd.int(3, 26)), 'Giftworks', 'Gifts', -rnd.range(20, 90), A.card);
    }

    /* --- debt ------------------------------------------------------------ */
    add(D(10), 'Capital One Auto Pay', 'Car Payment',   -412, A.checking);
    add(D(18), 'Nelnet Loan Payment',  'Student Loan',  -385, A.checking);
    if (rnd.next() < 0.4) {
      add(D(22), 'Interest charge', 'Credit Card Interest', -rnd.range(6, 38), A.card);
    }

    /* --- savings --------------------------------------------------------- */
    add(D(16), 'Transfer to Ally',      'Emergency Fund',     -400, A.checking);
    add(D(16), 'Fidelity contribution', 'Brokerage Transfer', -500, A.checking);
    add(D(16), '529 contribution',      '529 Contribution',   -150, A.checking);

    /* --- transfers: the card payment, both sides. Net zero, and it must not
           read as spend on top of the purchases it is already paying for. --- */
    var cardBill = round2_(rnd.range(900, 2100));
    add(D(21), 'Payment to Rewards Card', 'Credit Card Payment', -cardBill, A.checking);
    add(D(21), 'Payment received',        'Credit Card Payment',  cardBill, A.card);

    /* --- hidden from reports: expensed at work, then reimbursed ---------- */
    if (rnd.next() < 0.45) {
      var claim = round2_(rnd.range(60, 420));
      add(D(8),  'Client dinner',     'Reimbursable', -claim, A.card);
      add(D(26), 'Expense reimbursed','Reimbursable',  claim, A.checking);
    }

    /* --- refunds: positive amounts sitting in an expense category -------- */
    if (rnd.next() < 0.5) {
      add(D(rnd.int(8, 25)), 'Return — Lumen Goods', 'Shopping',
          rnd.range(18, 140), A.card);
    }
    if (rnd.next() < 0.25) {
      add(D(rnd.int(8, 25)), 'Price adjustment', 'Groceries', rnd.range(6, 40), A.card);
    }

    /* --- uncategorized, in the last few months only ---------------------- */
    if (isRecent) {
      var n = rnd.int(2, 4);
      for (var u = 0; u < n; u++) {
        add(D(rnd.int(2, 27)), ['SQ *UNKNOWN VENDOR', 'PAYPAL *RETAIL',
             'ACH DEBIT 8829', 'POS PURCHASE 4471'][u % 4], '',
            -rnd.range(11, 210), rnd.next() < 0.5 ? A.card : A.checking);
      }
    }
  }

  rows.sort(function (a, b) { return a[0] - b[0]; });
  return rows;
}

/** Scatter n transactions across a month from a pool of merchant names. */
function spread_(rnd, add, D, n, merchants, category, lo, hi, account) {
  for (var i = 0; i < n; i++) {
    add(D(rnd.int(1, 28)), merchants[rnd.int(0, merchants.length - 1)],
        category, -rnd.range(lo, hi), account);
  }
}

/** Heating and cooling both cost money; spring and autumn do not. */
function seasonalElectric_(monthIndex, rnd) {
  var peak = [1.55, 1.45, 1.10, 0.92, 0.90, 1.20, 1.60, 1.65, 1.25, 0.95, 1.05, 1.40];
  return round2_(96 * peak[monthIndex] + rnd.range(-12, 18));
}


/* ---------------------------------------------------------------------------
 * Balances
 * -------------------------------------------------------------------------*/

function buildMockBalances_(anchor, today) {
  var rnd = seededRandom_(MOCK_SEED + 7);
  var A = MOCK_ACCOUNTS;
  var rows = [];

  var snap = function (date, acct, balance) {
    rows.push([
      date, '06:15:00', acct.name, acct.num, acct.id, acct.inst,
      acct.type, acct.klass, round2_(balance), date
    ]);
  };

  for (var m = MOCK_MONTHS - 1; m >= 0; m--) {
    var first = new Date(anchor.getFullYear(), anchor.getMonth() - m, 1);
    var monthEnd = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    var date = monthEnd > today ? new Date(today.getFullYear(), today.getMonth(),
                                           today.getDate()) : monthEnd;
    var i = MOCK_MONTHS - 1 - m;                     // 0 = oldest

    snap(date, A.checking,  3800 + rnd.range(-900, 900));
    snap(date, A.savings,   12000 + 1050 * i + rnd.range(-120, 120));
    snap(date, A.brokerage, 38000 + 640 * i + rnd.range(-1800, 1800));
    snap(date, A.card,      -(1150 + rnd.range(0, 900)));
    snap(date, A.student,   -(24000 - 350 * i));
    snap(date, A.auto,      -(18000 - 402 * i));
  }
  return rows;
}


/* ---------------------------------------------------------------------------
 * Writing + formatting
 * -------------------------------------------------------------------------*/

function writeGrid_(ss, name, headers, rows) {
  assertWritable_(name);                             // mock tabs only
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  if (sh.getMaxRows() < rows.length + 10) {
    sh.insertRowsAfter(sh.getMaxRows(), rows.length + 10 - sh.getMaxRows());
  }
  if (sh.getMaxColumns() < headers.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  }
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3B4A54');
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sh.setFrozenRows(1);
  return sh;
}

function formatMockTabs_(ss) {
  var tx = ss.getSheetByName(MOCK_TABS.transactions);
  if (tx) {
    tx.getRange('A:A').setNumberFormat(FMT.date);
    tx.getRange('D:D').setNumberFormat(FMT.moneySigned);
    tx.getRange('G:G').setNumberFormat('yyyy-mm');
    tx.getRange('H:H').setNumberFormat(FMT.date);
    [95, 210, 160, 105, 160, 110, 85, 95, 260, 120]
      .forEach(function (w, i) { tx.setColumnWidth(i + 1, w); });
  }
  [MOCK_TABS.balances, MOCK_TABS.balanceHistory].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (!sh) return;
    sh.getRange('A:A').setNumberFormat(FMT.date);
    sh.getRange('I:I').setNumberFormat(FMT.moneySigned);
    sh.getRange('J:J').setNumberFormat(FMT.date);
    [95, 75, 165, 95, 115, 110, 95, 85, 115, 95]
      .forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  });
  var cat = ss.getSheetByName(MOCK_TABS.categories);
  if (cat) [175, 130, 95, 140].forEach(function (w, i) { cat.setColumnWidth(i + 1, w); });
}


/* ---------------------------------------------------------------------------
 * Deterministic randomness — regenerating gives you the same numbers back
 * -------------------------------------------------------------------------*/

function seededRandom_(seed) {
  var s = seed >>> 0;
  var next = function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next: next,
    range: function (lo, hi) { return lo + next() * (hi - lo); },
    int:   function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); }
  };
}

function round2_(n) { return Math.round(n * 100) / 100; }

function weekStart_(d) {
  var s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}
