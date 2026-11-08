// Startseite: Kerninfos aus data/garmin-stats.json (Rückfall: Strava), Countdown zum Saisonziel.
// Ohne JavaScript oder ohne Daten bleiben die Platzhalter „–" stehen.
(function () {
  'use strict';
  var ZIEL = new Date('2027-06-06T00:00:00+02:00'); // Granfondo Milano–Sanremo 2027 (laut Veranstalter-Kalender, prüfen)
  var root = document.body.getAttribute('data-root') || '.';
  var fmt = function (n, d) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };

  var heute = new Date(); heute.setHours(0, 0, 0, 0);
  var tage = Math.ceil((ZIEL - heute) / 86400000);
  var elTage = document.getElementById('ki-tage');
  if (elTage && tage >= 0) elTage.textContent = fmt(tage);

  var laden = function (datei) {
    return fetch(root + '/data/' + datei, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  };
  (window.WB_TESTDATEN ? Promise.resolve(window.WB_TESTDATEN) :
   laden('garmin-stats.json').catch(function () { return laden('strava-stats.json'); }))
    .then(function (d) {
      var r28 = d.rolling_28_days || {};
      var elKm = document.getElementById('ki-km');
      if (elKm && typeof r28.distance_km === 'number') { elKm.textContent = fmt(Math.round(r28.distance_km)); elKm.classList.add('wert-neu'); }
      var elStand = document.getElementById('ki-stand');
      if (elStand && d.generated_at) {
        var g = new Date(d.generated_at);
        elStand.textContent = (d.source === 'garmin' ? 'Garmin' : 'Strava') + ' · Stand ' + String(g.getDate()).padStart(2, '0') + '.' +
          String(g.getMonth() + 1).padStart(2, '0') + '.' + g.getFullYear();
      }
      var ld = d.load;
      if (ld && typeof ld.tsb === 'number') {
        var tsb = Math.round(ld.tsb), elF = document.getElementById('ki-form');
        if (elF) { elF.textContent = (tsb > 0 ? '+' : '') + fmt(tsb).replace('-', '−'); elF.classList.remove('leer'); elF.classList.add('wert-neu'); }
        var elH = document.getElementById('ki-form-hinweis');
        if (elH) elH.textContent = '· ' + ld.zustand;
      }
    })
    .catch(function () { /* Platzhalter bleiben stehen */ });
})();
