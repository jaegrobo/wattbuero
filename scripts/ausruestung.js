// Ausrüstung: Kilometer je Rad im laufenden Jahr aus data/garmin-stats.json.
// Ohne Daten bleibt die Zeile unsichtbar.
(function () {
  'use strict';
  var root = document.body.getAttribute('data-root') || '.';
  fetch(root + '/data/garmin-stats.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      var y = d.year || {}, km = y.rad_km || {};
      document.querySelectorAll('.geraeteliste .km[data-rad]').forEach(function (el) {
        var v = km[el.getAttribute('data-rad')];
        if (!v) return;
        el.innerHTML = '';
        var b = document.createElement('b'); b.textContent = v.toLocaleString('de-DE') + ' km';
        el.append(y.jahr + ': ', b, el.getAttribute('data-rad') === 'rolle' ? ' auf der Rolle' : '');
        el.hidden = false;
      });
    })
    .catch(function () {});
})();
