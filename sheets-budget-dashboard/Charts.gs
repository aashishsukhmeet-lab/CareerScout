/**
 * Charts.gs
 * ---------------------------------------------------------------------------
 * The four native Sheets charts. Native (not HTML) on purpose: these are the
 * ones that render in the Sheets mobile app.
 *
 * Every chart reads a contiguous block on `_ChartData` whose cells are
 * formulas keyed off the month dropdown — so changing the month redraws all
 * four without a single line of script running.
 *
 * Colours come from PALETTE and are identical per bucket across charts 1 and 3,
 * the in-cell bars, the sparklines and the Sankey.
 */

function buildCharts_(ss) {
  var dash  = ss.getSheetByName(TABS.dashboard);
  var cdata = ss.getSheetByName(TABS.chartData);
  assertWritable_(dash.getName());

  dash.getCharts().forEach(function (c) { dash.removeChart(c); });

  var N = LIMITS.trendMonths;
  var lastTrendRow = 1 + N;

  var base = {
    backgroundColor: '#FFFFFF',
    fontName: 'Roboto',
    titleTextStyle: { color: INK.heading, fontSize: 12, bold: true },
    legend: { position: 'top', alignment: 'start',
              textStyle: { color: INK.body, fontSize: 10 } },
    chartArea: { left: 64, top: 48, width: '80%', height: '68%' },
    hAxis: { textStyle: { color: INK.muted, fontSize: 10 },
             gridlines: { color: '#EDF1F3' } },
    vAxis: { textStyle: { color: INK.muted, fontSize: 10 },
             gridlines: { color: '#EDF1F3' }, format: FMT.moneyBig,
             baselineColor: INK.hairline }
  };

  /* --- 1. Stacked column: spend by bucket, last 12 months ---------------- */
  var c1 = dash.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(cdata.getRange(1, 1, lastTrendRow, 5))
    .setPosition(DASH.chartRow1, 2, 0, 0)
    .setOption('title', 'Where the money goes, by bucket')
    .setOption('isStacked', true)
    .setOption('width', 560).setOption('height', 320)
    .setOption('colors', VISIBLE_BUCKETS.map(function (b) { return PALETTE[b]; }))
    .setOption('bar', { groupWidth: '68%' });
  applyBase_(c1, base);
  dash.insertChart(c1.build());

  /* --- 2. Line: income vs spend vs savings rate -------------------------- */
  var c2 = dash.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(cdata.getRange(1, 8, lastTrendRow, 4))
    .setPosition(DASH.chartRow1, 6, 0, 0)
    .setOption('title', 'Money in vs money out, and what stuck')
    .setOption('width', 560).setOption('height', 320)
    .setOption('curveType', 'none')
    .setOption('pointSize', 4)
    .setOption('series', {
      0: { color: PALETTE.income,   lineWidth: 3, targetAxisIndex: 0 },
      1: { color: PALETTE.debt,     lineWidth: 3, targetAxisIndex: 0 },
      2: { color: PALETTE.leftover, lineWidth: 2, lineDashStyle: [6, 3],
           targetAxisIndex: 1 }
    })
    .setOption('vAxes', {
      0: { format: FMT.moneyBig, textStyle: { color: INK.muted, fontSize: 10 },
           gridlines: { color: '#EDF1F3' } },
      1: { format: 'percent', textStyle: { color: PALETTE.leftover, fontSize: 10 },
           gridlines: { color: 'transparent' } }
    })
    .setOption('chartArea', { left: 64, right: 62, top: 48, width: '70%', height: '68%' });
  applyBase_(c2, base, ['vAxis', 'chartArea']);
  dash.insertChart(c2.build());

  /* --- 3. Bar: the selected month by category, biggest first ------------- */
  var c3 = dash.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(cdata.getRange(1, 13, 1 + LIMITS.barCategories, 5))
    .setPosition(DASH.chartRow2, 2, 0, 0)
    .setOption('title', 'This month by category — biggest first')
    .setOption('isStacked', true)     // one value per row, so each bar takes
    .setOption('width', 560)          // its bucket's colour
    .setOption('height', 640)
    .setOption('colors', VISIBLE_BUCKETS.map(function (b) { return PALETTE[b]; }))
    .setOption('bar', { groupWidth: '76%' })
    .setOption('chartArea', { left: 150, top: 48, width: '62%', height: '88%' })
    .setOption('hAxis', { format: FMT.moneyBig,
                          textStyle: { color: INK.muted, fontSize: 10 },
                          gridlines: { color: '#EDF1F3' } })
    .setOption('vAxis', { textStyle: { color: INK.body, fontSize: 10 } });
  applyBase_(c3, base, ['chartArea', 'hAxis', 'vAxis']);
  dash.insertChart(c3.build());

  /* --- 4. Line: debt balances over time ---------------------------------- */
  var lastCol = Number(PropertiesService.getDocumentProperties()
                       .getProperty('debtLastCol')) || 20;
  var width = Math.max(2, lastCol - 19 + 1);           // month column + series
  var accountColours = [
    PALETTE.debt, PALETTE.variable, PALETTE.fixed, PALETTE.savings,
    PALETTE.income, PALETTE.leftover, '#7F5F00', '#5A5A5A'
  ];
  var series = {};
  for (var s = 0; s < width - 2; s++) {
    series[s] = { color: accountColours[s % accountColours.length], lineWidth: 2 };
  }
  series[width - 2] = { color: PALETTE.total, lineWidth: 4 };   // the total line

  var c4 = dash.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(cdata.getRange(1, 19, lastTrendRow, width))
    .setPosition(DASH.chartRow2, 6, 0, 0)
    .setOption('title', 'What you owe, over time')
    .setOption('width', 560).setOption('height', 320)
    .setOption('curveType', 'none')
    .setOption('pointSize', 3)
    .setOption('series', series)
    .setOption('legend', { position: 'bottom',
                           textStyle: { color: INK.body, fontSize: 9 } });
  applyBase_(c4, base, ['legend']);
  dash.insertChart(c4.build());
}


/** Apply the shared option set, skipping any keys the chart overrides itself. */
function applyBase_(builder, base, skip) {
  skip = skip || [];
  Object.keys(base).forEach(function (k) {
    if (skip.indexOf(k) < 0) builder.setOption(k, base[k]);
  });
  return builder;
}
