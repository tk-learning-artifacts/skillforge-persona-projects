// Census of Population 2020: resident students aged 5 and over, by planning
// area of residence and usual mode of transport to school. Singapore
// Department of Statistics, via data.gov.sg dataset
// d_9eaccc6cc0f257cfd74d5c1ceb0fb663 (SingStat table CT/17589).
// Columns: area, total, bus only, MRT/LRT only, MRT/LRT and bus only,
// MRT/LRT or bus with other modes, taxi or private hire car only, car only,
// private chartered bus or van only, lorry or pickup only,
// motorcycle or scooter only, others, no transport required.
// null is a "-" in the source: a value the table does not show.
var CENSUS = 
[["Total",715209,157002,54685,171218,7946,4806,96498,44046,964,3134,5866,169044],
  ["Ang Mo Kio",24559,6740,1453,5578,178,110,3095,1527,27,111,207,5535],
  ["Bedok",43667,9837,2484,9447,764,458,8128,3615,null,63,572,8299],
  ["Bishan",15369,2837,1345,4031,153,118,3073,931,37,19,54,2771],
  ["Bukit Batok",27271,7312,1915,6528,253,141,3444,1800,120,100,93,5566],
  ["Bukit Merah",22017,5321,1794,4900,261,213,2867,2221,null,80,56,4303],
  ["Bukit Panjang",27319,6340,2438,6648,315,102,3159,1342,46,129,143,6659],
  ["Bukit Timah",16698,2547,1011,2406,119,234,5697,1872,null,7,133,2672],
  ["Choa Chu Kang",38478,6500,3690,12659,384,201,3119,1982,77,335,170,9361],
  ["Clementi",15747,4368,576,2958,170,128,2990,1363,16,52,72,3054],
  ["Downtown Core",223,33,52,54,null,null,25,16,5,null,null,39],
  ["Geylang",16109,3640,1911,3926,172,84,1916,1059,10,87,139,3164],
  ["Hougang",36576,9819,1838,9387,358,310,4888,1612,51,153,318,7841],
  ["Jurong East",12359,4174,519,3396,93,53,1168,724,23,68,58,2083],
  ["Jurong West",51547,13306,2584,13009,740,161,5166,2211,74,351,493,13449],
  ["Kallang",14090,2482,1733,3785,86,113,1678,1515,null,null,99,2599],
  ["Marine Parade",8159,1940,229,1163,64,117,1937,927,4,null,76,1701],
  ["Novena",8466,1679,263,1499,49,107,2354,1047,5,null,44,1419],
  ["Outram",2270,389,316,472,11,14,236,245,5,5,10,567],
  ["Pasir Ris",29067,6691,1157,8448,408,170,4399,1569,10,166,220,5830],
  ["Punggol",37071,6066,3889,6668,309,165,4992,1623,85,136,259,12879],
  ["Queenstown",14233,3338,1361,2807,94,136,2091,1161,9,9,123,3104],
  ["River Valley",1952,180,63,334,11,41,564,447,null,null,32,281],
  ["Sembawang",21005,2941,3008,5758,182,80,2239,871,36,104,144,5642],
  ["Sengkang",53458,11197,5052,10324,540,273,5855,2506,83,192,487,16950],
  ["Serangoon",18855,3423,1515,5265,267,184,4014,1350,null,53,94,2690],
  ["Tampines",43175,11416,2914,9568,785,246,4644,3205,74,288,444,9591],
  ["Tanglin",4084,451,179,397,26,85,1487,728,null,3,43,685],
  ["Toa Payoh",18961,4215,1735,4661,136,191,2466,1080,20,100,153,4203],
  ["Woodlands",49665,9383,4210,14871,529,309,3428,1457,99,255,305,14819],
  ["Yishun",38156,7903,2858,9663,412,200,4109,1519,47,244,756,10444],
  ["Others",4601,531,594,609,78,61,1270,522,null,24,70,843]]
;

(function () {
  var MODES = [
    { key: 'bus', label: 'Public bus only', colour: 'var(--m2)', cols: [2] },
    { key: 'mrt', label: 'MRT or LRT only', colour: 'var(--m3)', cols: [3] },
    { key: 'mrtbus', label: 'MRT or LRT and bus', colour: 'var(--m1)', cols: [4] },
    { key: 'car', label: 'Car, taxi or private hire car', colour: 'var(--m4)', cols: [6, 7] },
    { key: 'van', label: 'Chartered bus or van', colour: 'var(--m5)', cols: [8] },
    { key: 'none', label: 'No transport needed', colour: 'var(--m7)', cols: [12] },
    { key: 'other', label: 'Other or mixed', colour: 'var(--m6)', cols: [5, 9, 10, 11] }
  ];
  function row(name) { return CENSUS.filter(function (r) { return r[0] === name; })[0]; }
  function share(r, m) {
    var n = m.cols.reduce(function (s, c) { return s + (r[c] || 0); }, 0);
    return { n: n, pct: n / r[1] * 100 };
  }
  function pct(v) { return v.toFixed(1) + '%'; }
  function fmt(n) { return n.toLocaleString('en-SG'); }

  var a = document.getElementById('area-a');
  var b = document.getElementById('area-b');
  CENSUS.forEach(function (r) {
    if (r[0] === 'Total') return;
    [a, b].forEach(function (sel) {
      var o = document.createElement('option');
      o.value = r[0]; o.textContent = r[0];
      sel.appendChild(o);
    });
  });
  a.value = 'Tampines';
  b.value = 'Bukit Timah';

  document.getElementById('legend').innerHTML = MODES.map(function (m) {
    return '<li><span style="background:' + m.colour + ';border:1px solid var(--ink-2)"></span>' + m.label + '</li>';
  }).join('');

  function stack(name, label) {
    var r = row(name);
    var parts = MODES.map(function (m) {
      var s = share(r, m);
      return '<div style="width:' + s.pct + '%;background:' + m.colour + '" title="' + m.label + ': ' + pct(s.pct) + '"></div>';
    }).join('');
    return '<p class="stack-name">' + label + ' <span class="small">(' + fmt(r[1]) + ' students)</span></p>' +
      '<div class="stack" role="img" aria-label="' + label + ': ' + MODES.map(function (m) {
        return m.label + ' ' + pct(share(r, m).pct);
      }).join(', ') + '">' + parts + '</div>';
  }

  function draw() {
    var ra = row(a.value), rb = row(b.value), rt = row('Total');
    document.getElementById('stacks').innerHTML =
      stack(a.value, a.value) + stack(b.value, b.value) + stack('Total', 'All of Singapore');
    document.getElementById('compare').innerHTML = MODES.map(function (m) {
      var sa = share(ra, m), sb = share(rb, m), st = share(rt, m);
      return '<tr><td>' + m.label + '</td><td class="num">' + fmt(sa.n) + '<br><strong>' + pct(sa.pct) + '</strong></td>' +
        '<td class="num">' + fmt(sb.n) + '<br><strong>' + pct(sb.pct) + '</strong></td>' +
        '<td class="num">' + pct(st.pct) + '</td></tr>';
    }).join('');
    document.getElementById('col-a').textContent = a.value;
    document.getElementById('col-b').textContent = b.value;
    var gaps = [ra, rb].filter(function (r) { return r.slice(2).indexOf(null) >= 0; }).map(function (r) { return r[0]; });
    document.getElementById('gaps').textContent = gaps.length
      ? gaps.join(' and ') + ': some small cells show "-" in the source. I count them as 0 here.'
      : '';
    rank();
  }

  var rankMode = 'none';
  function rank() {
    var m = MODES.filter(function (x) { return x.key === rankMode; })[0];
    var list = CENSUS.filter(function (r) { return r[0] !== 'Total' && r[0] !== 'Others'; })
      .map(function (r) { return { name: r[0], pct: share(r, m).pct }; })
      .sort(function (x, y) { return y.pct - x.pct; });
    var top = list[0].pct;
    document.getElementById('rank').innerHTML = list.map(function (x) {
      var mine = x.name === a.value || x.name === b.value;
      return '<div class="bar-row"><span' + (mine ? ' style="font-weight:700"' : '') + '>' + x.name + '</span>' +
        '<div class="bar-track"><div class="bar-fill' + (mine ? ' warn' : '') + '" style="width:' + (x.pct / top * 100) + '%"></div>' +
        '<span class="bar-val">' + pct(x.pct) + '</span></div></div>';
    }).join('');
    document.getElementById('rank-title').textContent = 'Share of students: ' + m.label.toLowerCase();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-rank]'), function (btn) {
    btn.addEventListener('click', function () {
      rankMode = btn.getAttribute('data-rank');
      Array.prototype.forEach.call(document.querySelectorAll('[data-rank]'), function (x) {
        x.setAttribute('aria-pressed', String(x === btn));
      });
      rank();
    });
  });
  a.addEventListener('change', draw);
  b.addEventListener('change', draw);
  draw();
})();
