// Akzentfarbe nach dem Rennkalender: Rosa bis Ende Giro, Giallo bis Ende Tour,
// Rosso bis Ende Vuelta, danach wieder Rosa. Gewechselt wird am Tag nach der
// Schlussetappe. Läuft synchron im <head>, damit die Seite nicht erst gelb aufblitzt.
// Test: ?akzent=rosa|giallo|rosso oder #akzent-rosso
(function () {
  'use strict';
  // Schlussetappen [Giro, Tour, Vuelta] – jedes Jahr nachtragen, sobald der UCI-Kalender steht
  var ENDE = {
    2026: ['2026-05-31', '2026-07-26', '2026-09-13'],
    2027: ['2027-05-30', '2027-07-25', '2027-09-26']
  };
  var FARBEN = ['rosa', 'giallo', 'rosso'];

  function farbeAm(d) {
    var y = d.getFullYear();
    var e = ENDE[y] || [y + '-05-31', y + '-07-27', y + '-09-20']; // Näherung, falls nicht gepflegt
    var tag = y + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (tag <= e[0]) return 'rosa';
    if (tag <= e[1]) return 'giallo';
    if (tag <= e[2]) return 'rosso';
    return 'rosa';
  }

  var test = (location.search.match(/[?&]akzent=(rosa|giallo|rosso)/) ||
              location.hash.match(/^#akzent-(rosa|giallo|rosso)$/) || [])[1];
  var farbe = test || farbeAm(new Date());
  document.documentElement.setAttribute('data-akzent', farbe);

  // Favicons tauschen: Standard im HTML ist Giallo (gilt auch ohne JavaScript)
  var links = document.querySelectorAll('link[data-akzent]');
  for (var i = 0; i < links.length; i++) {
    links[i].href = links[i].href.replace(/(favicon|apple-touch-icon)-(rosa|giallo|rosso)\./, '$1-' + farbe + '.');
  }
  window.WB_AKZENT = { farbe: farbe, farbeAm: farbeAm, farben: FARBEN };
})();
