/*
 * Wattbüro – interaktives Trainingsdashboard (Startseite + Training).
 * Nutzt dieselbe data/strava-stats.json wie stats-widget.js, zeigt aber
 * mehr: Stat-Gauges + Tab-Wechsel (Volumen/Sportart/Cadence/Bestleistungen).
 * Sportart, Cadence und Bestleistungen sind Platzhalter, bis der Sync
 * (GitHub Action) die dafür nötigen Daten liefert.
 * Voraussetzung im HTML: <div id="wattbuero-dashboard"></div> + Chart.js
 * per CDN VOR diesem Script eingebunden.
 */
(function () {
  var TABS = [
    { key: "volumen", label: "Volumen" },
    { key: "sportart", label: "Sportart" },
    { key: "cadence", label: "Cadence" },
    { key: "bestleistungen", label: "Bestleistungen" },
  ];

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  function gaugeHtml(label, value, unit) {
    return (
      '<div><div class="g-label">' + label + "</div>" +
      '<div class="g-value">' + value + (unit ? '<span>' + unit + "</span>" : "") + "</div></div>"
    );
  }

  function render(root, stats) {
    var s = stats.rolling_28_days;
    var gauges =
      gaugeHtml("Distanz", s.distance_km, "km") +
      gaugeHtml("Zeit im Sattel", s.moving_time_hours, "h") +
      gaugeHtml("Höhenmeter", s.elevation_gain_m, "hm") +
      gaugeHtml("Ausfahrten", s.ride_count, "") +
      (s.average_watts ? gaugeHtml("Ø Leistung", s.average_watts, "W") : "");

    root.innerHTML =
      '<div class="dashboard-panel">' +
      '<div class="dashboard-header"><h3>Trainingsdashboard · letzte 28 Tage</h3>' +
      '<div class="dashboard-tabs">' +
      TABS.map(function (t, i) {
        return '<button data-tab="' + t.key + '" class="' + (i === 0 ? "active" : "") + '">' + t.label + "</button>";
      }).join("") +
      "</div></div>" +
      '<div class="dashboard-gauges">' + gauges + "</div>" +
      '<div class="dashboard-panel-body"></div>' +
      "</div>";

    var body = root.querySelector(".dashboard-panel-body");
    var buttons = root.querySelectorAll(".dashboard-tabs button");

    function showTab(key) {
      buttons.forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-tab") === key);
      });
      if (key === "volumen") {
        renderVolumen(body, stats);
      } else {
        var tab = TABS.filter(function (t) { return t.key === key; })[0];
        body.innerHTML =
          '<div class="dashboard-note">Diese Auswertung (' + tab.label +
          ") braucht mehr Rohdaten aus Strava, als der wöchentliche Sync aktuell abruft " +
          "(z. B. Sportart-Klassifizierung, Kadenzverlauf, Best-Effort-Kurven). " +
          "Folgt, sobald der Sync entsprechend erweitert ist.</div>";
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        showTab(b.getAttribute("data-tab"));
      });
    });

    showTab("volumen");
  }

  function renderVolumen(body, stats) {
    var acts = (stats.recent_activities || []).slice().reverse();
    body.innerHTML =
      '<div class="dashboard-chart-wrap"><canvas></canvas></div>' +
      '<div class="dashboard-caption">Distanz der letzten ' + acts.length +
      " Aktivitäten aus Strava (kein Monatsvolumen – dafür fehlt noch die Datenhistorie im Sync).</div>";

    if (typeof Chart === "undefined" || !acts.length) return;

    var canvas = body.querySelector("canvas");
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: acts.map(function (a) { return fmtDate(a.date); }),
        datasets: [
          {
            label: "km",
            data: acts.map(function (a) { return a.distance_km; }),
            backgroundColor: "#c8ff4d",
            borderRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#000",
            titleColor: "#f2f2ee",
            bodyColor: "#f2f2ee",
            callbacks: {
              afterLabel: function (ctx) {
                return acts[ctx.dataIndex].name;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } }, grid: { display: false } },
          y: { ticks: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "#2c2c2c" } },
        },
      },
    });
  }

  function init() {
    var root = document.getElementById("wattbuero-dashboard");
    if (!root) return;
    var pageRoot = document.body.getAttribute("data-root") || ".";
    fetch(pageRoot + "/data/strava-stats.json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (stats) {
        render(root, stats);
      })
      .catch(function () {
        root.innerHTML = '<div class="dashboard-note">Trainingsdashboard aktuell nicht verfügbar.</div>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
