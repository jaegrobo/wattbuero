// Trainingsseite: füllt die Kette 01–04 aus data/strava-stats.json.
// Ohne JavaScript oder ohne Daten bleiben die Platzhalter „–" stehen.
(function () {
  'use strict';
  var ZIEL = new Date('2027-06-06T00:00:00+02:00'); // Granfondo Milano–Sanremo 2027, Datum prüfen
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  var root = document.body.getAttribute('data-root') || '.';
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n, d) {
    return Number(n).toLocaleString('de-DE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  var set = function (id, v) {
    var e = $(id); if (!e || v === undefined || v === null) return;
    var war = e.textContent; e.textContent = v;
    if (war === '–' && v !== '–') { e.classList.remove('wert-neu'); void e.offsetWidth; e.classList.add('wert-neu'); }
  };
  var el = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var txt = function (parent, x, y, s, attrs) {
    var t = el('text', Object.assign({ x: x, y: y }, attrs || {}), parent); t.textContent = s; return t;
  };
  var datum = function (iso) {
    var d = new Date(iso);
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  };

  // 04 Countdown, unabhängig von den Daten
  var heute = new Date(); heute.setHours(0, 0, 0, 0);
  var tage = Math.ceil((ZIEL - heute) / 86400000);
  if (tage >= 0) set('t-tage', fmt(tage));

  // Kettennavigation: aktive Station beim Scrollen
  var stationen = [].slice.call(document.querySelectorAll('.station'));
  function markiere() {
    var aktiv = stationen[0] && stationen[0].id;
    stationen.forEach(function (s) { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) aktiv = s.id; });
    document.querySelectorAll('[data-s]').forEach(function (a) { a.classList.toggle('aktiv', a.getAttribute('data-s') === aktiv); });
  }
  window.addEventListener('scroll', markiere, { passive: true });
  markiere();

  function monatsDiagramm(monate, stand) {
    var s = $('c-monat'); if (!s) return;
    var schmal = window.matchMedia('(max-width: 600px)').matches;
    if (schmal) { monate = monate.slice(-6); s.setAttribute('viewBox', '0 0 380 280'); }
    var L = schmal ? 50 : 48, R = schmal ? 372 : 744, T = schmal ? 34 : 24, B = schmal ? 240 : 262;
    var summe = function (m) { return (m.outdoor_km || 0) + (m.indoor_km || 0) + (m.commute_km || 0); };
    var max = Math.max.apply(null, monate.map(summe));
    var top = Math.ceil(max * 1.12 / 400) * 400 || 400; // Luft über dem höchsten Balken für die Beschriftung
    var y = function (v) { return B - v / top * (B - T); };
    for (var v = 0; v <= top; v += 400) {
      el('line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: 'var(--line-soft)' }, s);
      txt(s, L - 10, y(v) + 4, fmt(v), { 'text-anchor': 'end' });
    }
    var defs = el('defs', {}, s);
    var pat = el('pattern', { id: 'schraffur', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--ink-dim)', 'stroke-width': 2 }, pat);
    var w = (R - L) / monate.length, bw = Math.min(w * 0.58, 56);
    var heuteYm = stand ? stand.slice(0, 7) : '';
    monate.forEach(function (m, i) {
      var x = L + i * w + (w - bw) / 2;
      var aussen = m.outdoor_km || 0, rolle = m.indoor_km || 0;
      el('rect', { x: x, y: y(aussen), width: bw, height: B - y(aussen), fill: 'var(--ink-faint)', 'fill-opacity': 0.75 }, s);
      if (rolle > 0) el('rect', { x: x, y: y(aussen + rolle), width: bw, height: y(aussen) - y(aussen + rolle), fill: 'url(#schraffur)', stroke: 'var(--ink-dim)', 'stroke-width': 1 }, s);
      var pendel = m.commute_km || 0;
      if (pendel > 0) el('rect', { x: x + 0.5, y: y(aussen + rolle + pendel), width: bw - 1, height: y(aussen + rolle) - y(aussen + rolle + pendel), fill: 'none', stroke: 'var(--ink-dim)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }, s);
      var mo = +m.ym.slice(5) - 1;
      txt(s, x + bw / 2, B + 20, MON[mo] + (mo === 0 ? ' ’' + m.ym.slice(2, 4) : ''), { 'text-anchor': 'middle' });
      if (i === monate.length - 1) {
        // aktueller Monat: Wert direkt am Balken, Marker als Linie
        el('line', { x1: x, x2: x + bw, y1: y(summe(m)) - 6, y2: y(summe(m)) - 6, stroke: 'var(--marker)', 'stroke-width': 2 }, s);
        txt(s, x + bw / 2, y(summe(m)) - 12, fmt(Math.round(summe(m))), { 'text-anchor': 'middle' }).style.fill = 'var(--ink)';
      }
    });
    var letzterTeil = heuteYm && monate[monate.length - 1].ym === heuteYm; // laufender Monat zählt nicht in den Schnitt
    var voll = letzterTeil ? monate.slice(0, -1) : monate, schnitt = voll.reduce(function (a, m) { return a + summe(m); }, 0) / (voll.length || 1);
    el('line', { x1: L, x2: R, y1: y(schnitt), y2: y(schnitt), stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '5 5' }, s);
    txt(s, L + 4, y(schnitt) - 8, 'Ø ' + fmt(Math.round(schnitt)) + ' km' + (schmal ? '' : ' je Monat')).style.fill = 'var(--ink)';
    // Legende als direkte Beschriftung
    txt(s, R, T - (schmal ? 14 : 6), schmal ? 'gefüllt draußen · schraffiert Rolle · gepunktet Pendeln' : 'gefüllt: draußen · schraffiert: Rolle · gepunktet: Pendeln', { 'text-anchor': 'end' });
  }

  (window.WB_TESTDATEN ? Promise.resolve(window.WB_TESTDATEN) :
   fetch(root + '/data/strava-stats.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }))
    .then(function (d) {
      var r28 = d.rolling_28_days || {};
      if (typeof r28.distance_km === 'number') set('t-km', fmt(Math.round(r28.distance_km)));
      if (typeof r28.ride_count === 'number') {
        set('t-n', fmt(r28.ride_count));
        set('t-n-l', r28.ride_count === 1 ? 'Fahrt' : 'Fahrten');
      }
      if (typeof r28.elevation_gain_m === 'number') set('t-hm', fmt(r28.elevation_gain_m));
      if (typeof r28.moving_time_hours === 'number') set('t-h', fmt(r28.moving_time_hours, 1) + ' h');
      if (r28.commute && r28.commute.count > 0) {
        var pk = r28.commute.km_rounded;
        set('t-pendel', pk >= 10 && pk <= r28.distance_km ? '≈ ' + fmt(pk) + ' km' : 'unter 10 km');
        var p = $('t-pendel-w'); if (p) p.hidden = false;
      }
      if (typeof r28.average_watts === 'number') set('t-w', fmt(Math.round(r28.average_watts)));
      if (d.generated_at) set('q1', 'Strava · Stand ' + datum(d.generated_at));

      var monate = (d.monthly || []).slice(-12);
      if (monate.length) monatsDiagramm(monate, d.generated_at);
      else { var c = $('c-monat'); if (c) { c.setAttribute('viewBox', '0 0 760 60'); txt(c, 0, 30, 'Noch keine Monatswerte vorhanden.'); } }

      var jahr = String(new Date().getFullYear());
      var km = (d.monthly || []).filter(function (m) { return m.ym.indexOf(jahr) === 0; })
        .reduce(function (a, m) { return a + (m.outdoor_km || 0) + (m.indoor_km || 0); }, 0);
      if (km) set('t-jahr', fmt(Math.round(km)));

      var tb = $('t-fahrten');
      if (tb && !(d.recent_activities && d.recent_activities.length)) {
        tb.innerHTML = '<tr><td colspan="6" class="leer">In den letzten Wochen keine Fahrten.</td></tr>';
      }
      if (tb && d.recent_activities && d.recent_activities.length) {
        tb.replaceChildren();
        d.recent_activities.slice(0, 5).forEach(function (a) {
          var tr = document.createElement('tr');
          var zellen = [
            datum(a.date).slice(0, 6),
            a.name,
            fmt(a.distance_km, 1),
            fmt(a.elevation_gain_m),
            Math.floor(a.moving_time_min / 60) + ':' + String(a.moving_time_min % 60).padStart(2, '0'),
            a.average_watts ? fmt(Math.round(a.average_watts)) : '–'
          ];
          zellen.forEach(function (z, i) {
            var td = document.createElement('td'); td.textContent = z;
            if (i === 5 && !a.average_watts) td.className = 'leer';
            tr.appendChild(td);
          });
          tb.appendChild(tr);
        });
      }
    })
    .catch(function () {
      var tb = $('t-fahrten');
      if (tb) tb.innerHTML = '<tr><td colspan="6" class="leer">Daten gerade nicht erreichbar.</td></tr>';
    });
})();
