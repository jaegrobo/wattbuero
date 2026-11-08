// Nur zum Testen: Mit ?daten=extrem | leer | eins (oder #daten-extrem …) in der Adresse lädt die Seite
// Grenzfall-Daten statt data/strava-stats.json und zeigt unten einen Umschalter.
// Ohne den Parameter tut diese Datei nichts.
(function () {
  'use strict';
  var modus = new URLSearchParams(location.search).get('daten') || (location.hash.match(/^#daten-(extrem|leer|eins)$/) || [])[1] || null;
  window.addEventListener('hashchange', function () { if (/^#daten-|^#?$/.test(location.hash)) location.reload(); });
  var monat = function (ym, a, i, p) { return { ym: ym, outdoor_km: a, indoor_km: i, commute_km: p || 0, elevation_m: 0, rides: 0, hours: 0 }; };
  var monate = function (werte) {
    var yms = ['2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'];
    return yms.map(function (ym, n) { return monat(ym, werte[n][0], werte[n][1], werte[n][2]); });
  };
  var SAETZE = {
    extrem: {
      generated_at: '2026-11-02T15:05:03Z',
      rolling_28_days: { ride_count: 47, distance_km: 3412.6, elevation_gain_m: 48230, moving_time_hours: 131.4, average_watts: 238, commute: { count: 22, km_rounded: 200 } },
      monthly: monate([[0,0],[0,1204.5],[12.3,0],[2480.2,610.4,96.2],[3104.7,0],[0,0],[87.1,0],[1543.9,402.7],[0,0],[999.9,0.1],[2201.4,0,180],[3412.6,0,200]]),
      recent_activities: [
        { name: 'ROUVY - Passo dello Stelvio von Bormio | Italia (Granfondo Stelvio Santini, komplette Auffahrt mit allen 40 Kehren)', date: '2026-10-31T05:02:00Z', distance_km: 312.4, elevation_gain_m: 5210, moving_time_min: 731, average_watts: 201.7 },
        { name: 'Morgenrunde', date: '2026-10-30T06:00:00Z', distance_km: 0.1, elevation_gain_m: 0, moving_time_min: 0, average_watts: null },
        { name: 'Ötztaler Radmarathon – Sölden · Kühtai · Brenner · Jaufen · Timmelsjoch', date: '2026-10-29T06:45:00Z', distance_km: 227.3, elevation_gain_m: 5500, moving_time_min: 659, average_watts: 1234.5 },
        { name: 'R', date: '2026-10-28T18:00:00Z', distance_km: 45, elevation_gain_m: 12, moving_time_min: 90, average_watts: 150 },
        { name: 'Ride 🚴‍♂️🔥 #FTP #Vatertag', date: '2026-10-27T17:00:00Z', distance_km: 1009.9, elevation_gain_m: 12345, moving_time_min: 3001, average_watts: 99 }
      ]
    },
    leer: {
      generated_at: '2026-11-02T15:05:03Z',
      rolling_28_days: { ride_count: 0, distance_km: 0, elevation_gain_m: 0, moving_time_hours: 0, average_watts: null, commute: { count: 0, km_rounded: 0 } },
      monthly: [],
      recent_activities: []
    },
    eins: {
      generated_at: '2026-11-02T15:05:03Z',
      rolling_28_days: { ride_count: 1, distance_km: 1, elevation_gain_m: 1, moving_time_hours: 0.1, average_watts: 1, commute: { count: 1, km_rounded: 10 } },
      monthly: [monat('2026-10', 1, 0, 0)],
      recent_activities: [{ name: 'Einzige Fahrt', date: '2026-10-31T10:00:00Z', distance_km: 1, elevation_gain_m: 1, moving_time_min: 1, average_watts: null }]
    }
  };
  // Garmin-Felder für 02/03/04: Extremwerte, nichts, ein einziger Tag
  var serie = function (n, f) { var a = []; for (var i = 0; i < n; i++) { var d = new Date(2026, 7, 16 + i); a.push(Object.assign({ d: d.toISOString().slice(0, 10) }, f(i))); } return a; };
  SAETZE.extrem.source = 'garmin';
  SAETZE.extrem.load = { ctl: 142.6, atl: 198.3, tsb: -55.7, zustand: 'Überlastet', eingeschwungen: true, abdeckung_28: { mit_tss: 3, fahrten: 47 },
    serie_84: serie(84, function (i) { return { ctl: 40 + i * 1.2, atl: 30 + (i % 9) * 19, tsb: 25 - (i % 9) * 11 }; }) };
  SAETZE.extrem.power_curve = { seconds: [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 18000],
    season: { 1: 1999, 5: 1650, 60: 610, 300: 402, 1200: 351, 3600: 320, 18000: 248 }, all_time: { 1: 2104, 5: 1702, 60: 640, 300: 420, 1200: 365, 3600: 331, 7200: 300, 18000: 260 } };
  SAETZE.extrem.year = { jahr: 2026, distance_km: 31415.9, rides: 999, laengste_fahrt: { distance_km: 412.7, date: '2026-06-21' }, rad_km: {} };
  SAETZE.leer.source = 'garmin';
  SAETZE.leer.load = null; SAETZE.leer.power_curve = { seconds: [], season: {}, all_time: {} };
  SAETZE.leer.year = { jahr: 2026, distance_km: 0, rides: 0, laengste_fahrt: null, rad_km: {} };
  SAETZE.eins.source = 'garmin';
  SAETZE.eins.load = { ctl: 0.4, atl: 2.6, tsb: 0, zustand: 'Produktiv', eingeschwungen: false, abdeckung_28: { mit_tss: 1, fahrten: 1 }, serie_84: serie(1, function () { return { ctl: 0.4, atl: 2.6, tsb: 0 }; }) };
  SAETZE.eins.power_curve = { seconds: [1, 5, 60], season: { 1: 150 }, all_time: { 1: 150 } };
  SAETZE.eins.year = { jahr: 2026, distance_km: 1, rides: 1, laengste_fahrt: { distance_km: 1, date: '2026-10-31' }, rad_km: {} };
  window.WB_TESTDATEN = SAETZE[modus] || null;
  if (!modus) return;
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.setAttribute('style', 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99;display:flex;gap:2px;padding:3px;background:#3a3a3a;border-radius:999px;font:13px system-ui,sans-serif');
    [['', 'Echt'], ['extrem', 'Extrem'], ['leer', 'Leer'], ['eins', 'Eins']].forEach(function (o) {
      var a = document.createElement('a'); a.textContent = o[1];
      a.href = o[0] ? '#daten-' + o[0] : '#echt';
      if (!o[0]) a.addEventListener('click', function (ev) { ev.preventDefault(); location.hash = ''; location.reload(); });
      var aktiv = (modus || '') === o[0];
      a.setAttribute('style', 'padding:6px 12px;border-radius:999px;text-decoration:none;' + (aktiv ? 'background:#fff;color:#111' : 'color:#ddd'));
      bar.appendChild(a);
    });
    document.body.appendChild(bar);
  });
})();
