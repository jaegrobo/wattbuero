// Trainingsseite: füllt die Kette 01–04 aus data/garmin-stats.json (Rückfall: data/strava-stats.json).
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
    var d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T12:00:00') : new Date(iso);
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
    txt(s, R, T - (schmal ? 14 : 6), schmal ? 'Rad voll · Rolle schraffiert · Pendeln gepunktet' : 'gefüllt: draußen · schraffiert: Rolle · gepunktet: Pendeln', { 'text-anchor': 'end' });
  }

  // 02 Formverlauf: Fitness, Ermüdung, Form über 12 Wochen
  function formDiagramm(serie) {
    var s = $('c-form'); if (!s || !serie.length) return;
    var schmal = window.matchMedia('(max-width: 600px)').matches;
    if (schmal) s.setAttribute('viewBox', '0 0 380 280');
    var L = schmal ? 40 : 48, R = schmal ? 372 : 744, T = schmal ? 40 : 30, B = schmal ? 240 : 262;
    var werte = []; serie.forEach(function (p) { werte.push(p.ctl, p.atl, p.tsb); });
    var wMin = Math.min(0, Math.min.apply(null, werte)), wMax = Math.max(10, Math.max.apply(null, werte) * 1.1);
    var schritt = [10, 20, 25, 50, 100, 200].filter(function (st) { return (wMax - wMin) / st <= (schmal ? 5 : 8); })[0] || 200;
    var lo = Math.floor(wMin / schritt) * schritt, hi = Math.ceil(wMax / schritt) * schritt; // Raster läuft immer durch 0
    var y = function (v) { return B - (v - lo) / (hi - lo) * (B - T); };
    var x = function (i) { return L + i / (serie.length - 1 || 1) * (R - L); };
    for (var v = lo; v <= hi; v += schritt) {
      el('line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: v === 0 ? 'var(--ink-faint)' : 'var(--line-soft)' }, s);
      txt(s, L - 10, y(v) + 4, (v > 0 ? '+' : '') + fmt(v).replace('-', '−'), { 'text-anchor': 'end' });
    }
    var linie = function (key, attrs) {
      var d = serie.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1); }).join('');
      el('path', Object.assign({ d: d, fill: 'none', 'stroke-linejoin': 'round' }, attrs), s);
    };
    linie('atl', { stroke: 'var(--ink-faint)', 'stroke-width': 1.5 });
    linie('ctl', { stroke: 'var(--ink)', 'stroke-width': 2 });
    linie('tsb', { stroke: 'var(--marker)', 'stroke-width': 2 });
    // Monatsanfänge als Achse
    serie.forEach(function (p, i) {
      if (p.d.slice(8) === '01') txt(s, x(i), B + 20, MON[+p.d.slice(5, 7) - 1], { 'text-anchor': 'middle' });
    });
    var letzt = serie[serie.length - 1];
    if (!schmal) {
      // Endbeschriftungen rechts, bei dichten Linien auseinandergeschoben
      var lab = [['ctl', 'Fitness', 'var(--ink)'], ['atl', 'Ermüdung', 'var(--ink-dim)'], ['tsb', 'Form', 'var(--marker)']]
        .map(function (l) { return { y: y(letzt[l[0]]) + 4, t: l[1], f: l[2] }; })
        .sort(function (a, b) { return a.y - b.y; });
      for (var k = 1; k < lab.length; k++) if (lab[k].y - lab[k - 1].y < 16) lab[k].y = lab[k - 1].y + 16;
      lab.forEach(function (l) { txt(s, R + 8, l.y, l.t).style.fill = l.f; });
      s.setAttribute('viewBox', '0 0 840 300');
    }
    else txt(s, R, T - 18, 'hell Fitness · grau Ermüdung · Akzent Form', { 'text-anchor': 'end' });
  }

  // 03 Leistungskurve: logarithmische Zeitachse
  var DAUER = { 1: '1 s', 5: '5 s', 30: '30 s', 60: '1 min', 300: '5 min', 1200: '20 min', 3600: '1 h', 18000: '5 h' };
  function kurvenDiagramm(pc) {
    var s = $('c-kurve'); if (!s) return;
    var schmal = window.matchMedia('(max-width: 600px)').matches;
    if (schmal) s.setAttribute('viewBox', '0 0 380 280');
    var L = schmal ? 56 : 56, R = schmal ? 362 : 744, T = schmal ? 40 : 30, B = schmal ? 240 : 262;
    var sek = (pc.seconds || []).filter(function (t) { return pc.all_time[t] || pc.season[t]; });
    if (sek.length < 2) return false;
    var alle = sek.map(function (t) { return pc.all_time[t] || 0; }).concat(sek.map(function (t) { return pc.season[t] || 0; }));
    var hi = Math.ceil(Math.max.apply(null, alle) * 1.08 / 200) * 200;
    var lmin = Math.log(sek[0]), lmax = Math.log(sek[sek.length - 1]);
    var x = function (t) { return L + (Math.log(t) - lmin) / (lmax - lmin) * (R - L); };
    var y = function (v) { return B - v / hi * (B - T); };
    for (var v = 0; v <= hi; v += 200) {
      el('line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: 'var(--line-soft)' }, s);
      txt(s, L - 10, y(v) + 4, fmt(v), { 'text-anchor': 'end' });
    }
    Object.keys(DAUER).forEach(function (t) {
      t = +t; if (t < sek[0] || t > sek[sek.length - 1] || (schmal && [1, 30, 300, 3600].indexOf(t) >= 0)) return;
      el('line', { x1: x(t), x2: x(t), y1: B, y2: B + 6, stroke: 'var(--ink-faint)' }, s);
      txt(s, x(t), B + 22, DAUER[t], { 'text-anchor': t === sek[sek.length - 1] ? 'end' : t === sek[0] ? 'start' : 'middle' });
    });
    var linie = function (werte, attrs) {
      var pkt = sek.filter(function (t) { return werte[t]; });
      if (pkt.length < 2) return;
      el('path', Object.assign({ d: pkt.map(function (t, i) { return (i ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(werte[t]).toFixed(1); }).join(''), fill: 'none', 'stroke-linejoin': 'round' }, attrs), s);
    };
    var gleich = sek.every(function (t) { return (pc.all_time[t] || 0) === (pc.season[t] || 0); });
    if (!gleich) linie(pc.all_time, { stroke: 'var(--ink-faint)', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
    linie(pc.season, { stroke: 'var(--marker)', 'stroke-width': 2 });
    var jahr = new Date().getFullYear();
    txt(s, R, T - (schmal ? 18 : 10), gleich ? 'Saison ' + jahr + ' = Bestwerte seit Beginn des Abrufs'
      : (schmal ? 'Akzent Saison · gestrichelt alle Zeiten' : 'Akzent: Saison ' + jahr + ' · gestrichelt: alle Zeiten'), { 'text-anchor': 'end' });
    return true;
  }

  // 02 Wochenbelastung: TSS je Woche als Balken
  function wochenDiagramm(wochen) {
    var s = $('c-wochen'); if (!s || wochen.length < 2) return false;
    var schmal = window.matchMedia('(max-width: 600px)').matches;
    if (schmal) { wochen = wochen.slice(-13); s.setAttribute('viewBox', '0 0 380 240'); }
    var L = schmal ? 40 : 48, R = schmal ? 372 : 744, T = 20, B = 200;
    var voll = wochen.slice(0, -1).map(function (w) { return w.tss; });
    var schnitt = voll.reduce(function (a, b) { return a + b; }, 0) / (voll.length || 1);
    var max = Math.max.apply(null, wochen.map(function (w) { return w.tss; }).concat([schnitt, 10]));
    var schritt = [50, 100, 200, 250, 500].filter(function (st) { return max / st <= 4; })[0] || 500;
    var hi = Math.ceil(max * 1.1 / schritt) * schritt;
    var y = function (v) { return B - v / hi * (B - T); };
    for (var v = 0; v <= hi; v += schritt) {
      el('line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: 'var(--line-soft)' }, s);
      txt(s, L - 10, y(v) + 4, fmt(v), { 'text-anchor': 'end' });
    }
    var slot = (R - L) / wochen.length, bw = Math.min(slot * 0.7, 22);
    wochen.forEach(function (w, i) {
      var x = L + slot * i + (slot - bw) / 2, letzte = i === wochen.length - 1;
      if (w.tss > 0) el('rect', { x: x, y: y(w.tss), width: bw, height: B - y(w.tss), fill: letzte ? 'none' : 'var(--ink-dim)', stroke: letzte ? 'var(--marker)' : 'none', 'stroke-width': 1.5 }, s);
      var d = new Date(w.start + 'T12:00:00');
      if (d.getDate() <= 7) txt(s, x + bw / 2, B + 20, MON[d.getMonth()], { 'text-anchor': 'middle' });
    });
    el('line', { x1: L, x2: R, y1: y(schnitt), y2: y(schnitt), stroke: 'var(--ink)', 'stroke-dasharray': '5 4' }, s);
    return true;
  }

  // 03 Zählerstand: Ziffern wie am Stromzähler
  function zaehler(kwh) {
    var t = kwh.toFixed(1).padStart(6, '0'), z = $('z-ziffern'); if (!z) return;
    z.innerHTML = '';
    t.split('').forEach(function (c, i) {
      if (c === '.') return;
      var e = document.createElement('i'); e.textContent = c;
      if (i === t.length - 1) e.className = 'nk';
      z.appendChild(e);
    });
    set('z-text', fmt(kwh, 1) + ' kWh');
  }

  var laden = function (datei) {
    return fetch(root + '/data/' + datei, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  };

  (window.WB_TESTDATEN ? Promise.resolve(window.WB_TESTDATEN) :
   laden('garmin-stats.json').catch(function () { return laden('strava-stats.json'); }))
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
      var quelle = (d.source === 'garmin' ? 'Garmin' : 'Strava') + ' · Stand ' + (d.generated_at ? datum(d.generated_at) : '–');
      ['q1', 'q2', 'q3'].forEach(function (q) { set(q, quelle); });

      // 02 Zustand
      var ld = d.load;
      if (ld && typeof ld.tsb === 'number') {
        var tsb = Math.round(ld.tsb);
        set('f-tsb', (tsb > 0 ? '+' : '') + fmt(tsb).replace('-', '−'));
        set('f-zustand', 'Form heute · ' + ld.zustand);
        set('f-ctl', fmt(ld.ctl, 1)); set('f-atl', fmt(ld.atl, 1));
        if (ld.abdeckung_28) set('f-abdeckung', ld.abdeckung_28.mit_tss + ' von ' + ld.abdeckung_28.fahrten);
        // Skala: Frisch | Produktiv | Ermüdet | Überlastet, Grenzen +5 / −10 / −30
        var pos = tsb > 5 ? 25 * (1 - Math.min(tsb - 5, 20) / 20) : tsb >= -10 ? 25 + 25 * (5 - tsb) / 15
                : tsb >= -30 ? 50 + 25 * (-10 - tsb) / 20 : 75 + 25 * Math.min(-30 - tsb, 20) / 20;
        var zg = $('f-zeiger'); if (zg) { zg.style.left = pos.toFixed(1) + '%'; zg.hidden = false; }
        document.querySelectorAll('#f-skala li').forEach(function (li) { li.classList.toggle('aktiv', li.getAttribute('data-z') === ld.zustand); });
        var fl = $('f-leer'); if (fl) fl.hidden = true;
        var ff = $('f-fig'); if (ff && ld.serie_84 && ld.serie_84.length > 1) { ff.hidden = false; formDiagramm(ld.serie_84); }
        if (!ld.eingeschwungen) set('f-zustand', 'Form heute · ' + ld.zustand + ' (noch unter 6 Wochen Daten)');
      }

      // 01 Woche im Blick
      var wk = d.weekly || [];
      if (wk.length >= 2) {
        var zeile = function (w) { return fmt(Math.round(w.km)) + ' km · ' + fmt(w.hours, 1) + ' h · ' + fmt(w.elevation_m) + ' hm'; };
        var jetzt = wk[wk.length - 1], vor = wk[wk.length - 2], zwoelf = wk.slice(-13, -1);
        var mittel = function (k) { return zwoelf.reduce(function (a, w) { return a + w[k]; }, 0) / zwoelf.length; };
        set('w-jetzt', zeile(jetzt));
        set('w-vor', zeile(vor));
        set('w-schnitt', zeile({ km: mittel('km'), hours: mittel('hours'), elevation_m: Math.round(mittel('elevation_m')) }));
        var wb = $('w-block'); if (wb) wb.hidden = false;
      }

      // 02 Aufbautempo und Wochenbelastung
      if (ld && ld.serie_84 && ld.serie_84.length > 7) {
        var se = ld.serie_84, ramp = se[se.length - 1].ctl - se[se.length - 8].ctl;
        set('f-ramp', (ramp >= 0 ? '+' : '−') + fmt(Math.abs(ramp), 1) + ' / Woche');
      }
      if (wk.length >= 2) { var wf = $('wk-fig'); if (wf && wochenDiagramm(wk)) wf.hidden = false; }

      // 03 Leistung
      var pc = d.power_curve;
      if (pc && pc.season && Object.keys(pc.season).length) {
        ['5', '60', '300', '1200', '3600'].forEach(function (t) { if (pc.season[t]) set('p-' + t, fmt(pc.season[t]) + ' W'); });
        var pw = $('p-werte'); if (pw) pw.hidden = false;
        var pf = $('p-fig'); if (pf) { pf.hidden = false; if (!kurvenDiagramm(pc)) pf.hidden = true; }
        var pl = $('p-leer'); if (pl) pl.hidden = true;
        if (pc.season['1200']) set('p-ftp', '≈ ' + fmt(Math.round(pc.season['1200'] * 0.95)) + ' W');
      }
      var en = d.energie;
      if (en && en.jahr_kwh > 0) {
        zaehler(en.jahr_kwh);
        set('z-jahr', d.year ? d.year.jahr : '');
        var info = 'Aus ' + en.abdeckung.mit_leistung + ' von ' + en.abdeckung.fahrten + ' Fahrten mit Leistungsmesser.';
        if (en.vorjahr_bis_heute_kwh) info += ' Vorjahr bis heute: ' + fmt(en.vorjahr_bis_heute_kwh, 1) + ' kWh.';
        set('z-info', info);
        var zb = $('z-block'); if (zb) zb.hidden = false;
      }

      // 04 Langstrecken-Logbuch
      var lr = d.long_rides || [];
      if (lr.length) {
        var tb = $('l-fahrten'); tb.innerHTML = '';
        lr.forEach(function (r) {
          var std = Math.floor(r.moving_h), min = Math.round((r.moving_h - std) * 60);
          var tr = document.createElement('tr');
          [datum(r.date), fmt(r.distance_km, 1), fmt(r.elevation_gain_m), std + ':' + String(min).padStart(2, '0') + ' h',
           r.pause_anteil != null ? fmt(Math.round(r.pause_anteil * 100)) + ' %' : '–', r.np ? fmt(r.np) + ' W' : '–']
            .forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
          tb.appendChild(tr);
        });
        var lb = $('l-block'); if (lb) lb.hidden = false;
      }

      // 04 längste Fahrt im Verhältnis zur Renndistanz
      var lf = d.year && d.year.laengste_fahrt;
      if (lf && lf.distance_km) {
        var anteil = Math.min(lf.distance_km / 299 * 100, 100);
        var fu = $('d-fuell'), mk = $('d-marke');
        if (fu) fu.style.width = anteil.toFixed(1) + '%';
        if (mk) mk.style.left = anteil.toFixed(1) + '%';
        set('d-text', 'längste Fahrt ' + fmt(lf.distance_km, 1) + ' km' + (window.matchMedia('(max-width: 600px)').matches ? '' : ' · ' + datum(lf.date).slice(0, 6)));
      }

      var monate = (d.monthly || []).slice(-12);
      if (monate.length) monatsDiagramm(monate, d.generated_at);
      else { var c = $('c-monat'); if (c) { c.setAttribute('viewBox', '0 0 760 60'); txt(c, 0, 30, 'Noch keine Monatswerte vorhanden.'); } }

      var jahr = String(new Date().getFullYear());
      var km = (d.monthly || []).filter(function (m) { return m.ym.indexOf(jahr) === 0; })
        .reduce(function (a, m) { return a + (m.outdoor_km || 0) + (m.indoor_km || 0); }, 0);
      if (d.year && typeof d.year.distance_km === 'number') km = d.year.distance_km;
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
