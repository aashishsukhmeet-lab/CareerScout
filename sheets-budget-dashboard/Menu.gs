/**
 * Menu.gs
 * ---------------------------------------------------------------------------
 * The 💰 Budget menu. Every heavy action lives behind a menu item; onOpen only
 * draws the menu, so opening the spreadsheet stays instant.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💰 Budget')
      .addItem('Set up / refresh everything', 'menuSetupAll')
      .addItem('Refresh dashboard', 'menuRefresh')
      .addSeparator()
      .addItem('Add missing categories to Budget Setup', 'menuAddMissing')
      .addItem('Seed budget targets from 3-month average', 'menuSeedTargets')
      .addSeparator()
      .addItem('Money Flow (sidebar)', 'showSankeySidebar')
      .addItem('Money Flow (large window)', 'showSankeyDialog')
      .addSeparator()
      .addItem('Generate mock Tiller data', 'menuGenerateMock')
      .addItem('Which data am I reading?', 'menuShowSource')
    .addToUi();
}


/* ---------------------------------------------------------------------------
 * Handlers. Each one turns a thrown Error into something readable rather than
 * a raw stack trace in a yellow bar.
 * -------------------------------------------------------------------------*/

function menuSetupAll()     { guard_(setupAll, 'Set up'); }
function menuRefresh()      { guard_(refreshDashboard, 'Refresh'); }
function menuAddMissing()   { guard_(addMissingCategories, 'Add missing categories'); }
function menuSeedTargets()  { guard_(seedTargetsFromHistory, 'Seed targets'); }

function menuGenerateMock() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();
  var existing = Object.keys(MOCK_TABS)
    .map(function (k) { return MOCK_TABS[k]; })
    .filter(function (n) { return !!ss.getSheetByName(n); });

  if (existing.length) {
    var answer = ui.alert(
      'Regenerate mock data?',
      'This overwrites ' + existing.join(', ') + '.\n\n' +
      'Your Budget Setup, Dashboard and Flags tabs are untouched, and no ' +
      'Tiller tab is written to either way.',
      ui.ButtonSet.OK_CANCEL);
    if (answer !== ui.Button.OK) return;
  }
  guard_(function () {
    generateMockData();
    if (!USE_MOCK_DATA) {
      ui.alert('Mock data generated',
        'USE_MOCK_DATA is currently false, so the dashboard is still pointed at ' +
        'your Tiller tabs. Set it to true in Config.gs and run ' +
        '"Set up / refresh everything" to use the mock tabs instead.',
        ui.ButtonSet.OK);
    }
  }, 'Generate mock data');
}

function menuShowSource() {
  var ss = SpreadsheetApp.getActive();
  var t = sourceTabs_();
  var line = function (label, name) {
    return '  ' + label + ': ' + name + (ss.getSheetByName(name) ? '' : '   (missing)');
  };
  var bal = ss.getSheetByName(t.balanceHistory) ? t.balanceHistory : t.balances;

  SpreadsheetApp.getUi().alert(
    'Reading: ' + sourceLabel_(),
    'USE_MOCK_DATA is ' + USE_MOCK_DATA + ' in Config.gs.\n\n' +
    line('Transactions', t.transactions) + '\n' +
    line('Categories', t.categories) + '\n' +
    line('Balances', bal) + '\n\n' +
    'To switch, change that one line and run "Set up / refresh everything". ' +
    'Every formula points at named ranges, so setup just re-aims them — no ' +
    'formula, chart or conditional format has to change.\n\n' +
    'Tiller\'s own tabs are read-only to this script: ' +
    PROTECTED_TABS.slice(0, 5).join(', ') + '.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}


function guard_(fn, what) {
  try {
    fn();
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      what + ' failed',
      String(e && e.message ? e.message : e),
      SpreadsheetApp.getUi().ButtonSet.OK);
    throw e;   // still record it in the execution log
  }
}
