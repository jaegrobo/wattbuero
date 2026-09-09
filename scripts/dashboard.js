/*
 * Wattbüro – interaktives Trainingsdashboard (Startseite + Training).
 * Nutzt dieselbe data/strava-stats.json wie stats-widget.js, zeigt aber
 * mehr: Stat-Gauges, Zeitfilter und Tab-Wechsel (Volumen/Sportart/Cadence/
 * Bestleistungen). Volumen, Sportart und Cadence sind an monthly/sport_split
 * aus strava_sync.py gebunden - fehlen diese Felder (alter JSON-Stand vor
 * dem ersten Sync-Lauf mit dem erweiterten Skript), zeigt der jeweilige Tab
 * einen Hinweis statt falscher Daten. Bestleistungen ist bewusst noch ein
 * reiner Platzhalter (siehe Kommentar unten).
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

  var RANGES = [
    { key: "all", label: "Gesamt", months: null },
    { key: "6m", label: "6 Monate", months: 6 },
    { key: "3m", label: "3 Monate", months: 3 },
  ];

  var SPORT_COLORS = {
    "Rennrad": "#c8ff4d",
    "Gravel": "#4fa8a0",
    "Virtual": "#7c7fd1",
    "Mountainbike": "#e0a458",
    "E-Bike": "#d17a7a",
    "Sonstige": "#666",
  };

  var MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  var state = { stats: null, tab: "volumen", range: "all" };
  var chartInstance = null;

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  function monthLabel(ym) {
    var parts = ym.split("-");
    var idx = parseInt(parts[1], 10) - 1;
    return (MONTH_NAMES[idx] || ym) + " " + parts[0].slice(2);
  }

  function gaugeHtml(label, value, unit) {
    return (
      '<div><div class="g-label">' + label + "</div>" +
      '<div class="g-value">' + value + (unit ? "<span>" + unit + "</span>" : "") + "</div></div>"
    );
  }

  function filteredMonthly() {
    var monthly = (state.stats && state.stats.monthly) || [];
    var r = RANGES.filter(function (x) { return x.key === state.range; })[0];
    if (!r || !r.months) return monthly;
    return monthly.slice(-r.months);
  }

  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function missingDataNote(label) {
    return (
      '<div class="dashboard-note">Für "' + label + '" fehlen die nötigen Felder in ' +
      "data/strava-stats.json noch. Das passiert, wenn der Sync seit der Erweiterung " +
      "von scripts/strava_sync.py noch nicht gelaufen ist – im Repo unter Actions → " +
      '"Strava Sync" → "Run workflow" einmal manuell auslösen, danach ist der Tab da.</div>'
    );
  }

  function render(root, stats) {
    state.stats = stats;
    var s = stats.rolling_28_days || {};
    var gauges =
      gaugeHtml("Distanz", s.distance_km != null ? s.distance_km : "–", "km") +
      gaugeHtml("Zeit im Sattel", s.moving_time_hours != null ? s.moving_time_hours : "–", "h") +
      gaugeHtml("Höhenmeter", s.elevation_gain_m != null ? s.elevation_gain_m : "–", "hm") +
      gaugeHtml("Ausfahrten", s.ride_count != null ? s.ride_count : "–", "") +
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
      '<div class="dashboard-ranges">' +
      RANGES.map(function (r) {
        return '<button data-range="' + r.key + '" class="' + (r.key === "all" ? "active" : "") + '">' + r.label + "</button>";
      }).join("") +
      "</div>" +
      '<div class="dashboard-panel-body"></div>' +
      "</div>";

    root.querySelectorAll(".dashboard-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.tab = b.getAttribute("data-tab");
        root.querySelectorAll(".dashboard-tabs button").forEach(function (x) {
          x.classList.toggle("active", x === b);
        });
        root.querySelector(".dashboard-ranges").style.display =
          state.tab === "volumen" || state.tab === "cadence" ? "flex" : "none";
        showTab(root);
      });
    });

    root.querySelectorAll(".dashboard-ranges button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.range = b.getAttribute("data-range");
        root.querySelectorAll(".dashboard-ranges button").forEach(function (x) {
          x.classList.toggle("active", x === b);
        });
        showTab(root);
      });
    });

    showTab(root);
  }

  function showTab(root) {
    var body = root.querySelector(".dashboard-panel-body");
    destroyChart();
    if (state.tab === "volumen") renderVolumen(body);
    else if (state.tab === "sportart") renderSportart(body);
    else if (state.tab === "cadence") renderCadence(body);
    else renderBestleistungen(body);
  }

  function renderVolumen(body) {
    var monthly = state.stats.monthly;
    if (!monthly) {
      body.innerHTML = missingDataNote("Volumen");
      return;
    }
    var rows = filteredMonthly();
    if (!rows.length) {
      body.innerHTML = '<div class="dashboard-note">Noch keine Monatsdaten im gewählten Zeitraum.</div>';
      return;
    }
    body.innerHTML =
      '<div class="dashboard-chart-wrap"><canvas></canvas></div>' +
      '<div class="dashboard-caption">Monatliches Volumen – Outdoor / Indoor / Pendeln (km), aus dem Strava-Sync.</div>';

    if (typeof Chart === "undefined") return;
    var canvas = body.querySelector("canvas");
    chartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels: rows.map(function (m) { return monthLabel(m.ym); }),
        datasets: [
          { label: "Outdoor", data: rows.map(function (m) { return m.outdoor_km; }), backgroundColor: "#c8ff4d", stack: "s" },
          { label: "Indoor", data: rows.map(function (m) { return m.indoor_km; }), backgroundColor: "#7c7fd1", stack: "s" },
          { label: "Pendeln", data: rows.map(function (m) { return m.commute_km; }), backgroundColor: "#4fa8a0", stack: "s" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } } },
          tooltip: { backgroundColor: "#000", titleColor: "#f2f2ee", bodyColor: "#f2f2ee" },
        },
        scales: {
          x: { stacked: true, ticks: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } }, grid: { display: false } },
          y: { stacked: true, ticks: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "#2c2c2c" } },
        },
      },
    });
  }

  function renderSportart(body) {
    var split = state.stats.sport_split;
    if (!split) {
      body.innerHTML = missingDataNote("Sportart");
      return;
    }
    if (!split.length) {
      body.innerHTML = '<div class="dashboard-note">Keine Sportart-Daten vorhanden.</div>';
      return;
    }
    var total = split.reduce(function (s, x) { return s + x.km; }, 0);
    var legend = split.map(function (x) {
      var color = SPORT_COLORS[x.name] || "#9a9a9a";
      var pct = total ? Math.round((x.km / total) * 100) : 0;
      return (
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--wb-border)">' +
        '<span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:2px;background:' + color + ';display:inline-block"></span>' + x.name + "</span>" +
        '<span style="font-family:var(--font-mono);color:var(--wb-muted);font-size:0.85rem">' + x.km.toLocaleString("de-DE") + " km · " + pct + "%</span>" +
        "</div>"
      );
    }).join("");

    body.innerHTML =
      '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center">' +
      '<div class="dashboard-chart-wrap" style="flex:0 0 220px;height:220px;width:220px"><canvas></canvas></div>' +
      '<div style="flex:1;min-width:220px">' + legend + "</div>" +
      "</div>" +
      '<div class="dashboard-caption">Sportart-Verteilung über den gesamten Sync-Zeitraum (reagiert nicht auf den Zeitfilter oben).</div>';

    if (typeof Chart === "undefined") return;
    var canvas = body.querySelector("canvas");
    chartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: split.map(function (x) { return x.name; }),
        datasets: [{ data: split.map(function (x) { return x.km; }), backgroundColor: split.map(function (x) { return SPORT_COLORS[x.name] || "#9a9a9a"; }), borderColor: "#1a1a1a", borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#000", titleColor: "#f2f2ee", bodyColor: "#f2f2ee", callbacks: { label: function (ctx) { return ctx.label + ": " + ctx.parsed + " km"; } } },
        },
      },
    });
  }

  function renderCadence(body) {
    var monthly = state.stats.monthly;
    if (!monthly) {
      body.innerHTML = missingDataNote("Cadence");
      return;
    }
    var rows = filteredMonthly();
    if (!rows.some(function (m) { return m.avg_cadence != null; })) {
      body.innerHTML = '<div class="dashboard-note">Keine Kadenzdaten im gewählten Zeitraum (braucht einen Kadenzsensor).</div>';
      return;
    }
    body.innerHTML =
      '<div class="dashboard-chart-wrap"><canvas></canvas></div>' +
      '<div class="dashboard-caption">Ø Kadenz pro Monat (rpm), nur Aktivitäten mit Kadenzsensor.</div>';

    if (typeof Chart === "undefined") return;
    var canvas = body.querySelector("canvas");
    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: rows.map(function (m) { return monthLabel(m.ym); }),
        datasets: [{ label: "Ø Kadenz", data: rows.map(function (m) { return m.avg_cadence; }), borderColor: "#c8ff4d", backgroundColor: "#c8ff4d", spanGaps: true, tension: 0.25 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#000", titleColor: "#f2f2ee", bodyColor: "#f2f2ee", callbacks: { label: function (ctx) { return ctx.parsed.y + " rpm"; } } },
        },
        scales: {
          x: { ticks: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } }, grid: { display: false } },
          y: { ticks: { color: "#9a9a9a", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "#2c2c2c" } },
        },
      },
    });
  }

  // Bestleistungen (Watt-/Geschwindigkeits-Bestwerte) sind bewusst noch nicht
  // angebunden: Strava liefert Best-Effort-Leistungskurven über die
  // öffentliche REST-API nur für Laufaktivitäten, nicht fürs Rad. Um das für
  // Radfahrten zu bekommen, müsste man pro Aktivität die Watt-Zeitreihe
  // abrufen (/activities/{id}/streams) und selbst Rolling-Max-Werte je
  // Zeitfenster berechnen - eigenes, größeres Vorhaben.
  function renderBestleistungen(body) {
    body.innerHTML =
      '<div class="dashboard-note">Watt-/Geschwindigkeits-Bestleistungen sind über die normale Strava-API für Radfahrten nicht verfügbar (nur für Läufe). Das bräuchte einen eigenen Baustein (Watt-Zeitreihen je Aktivität + eigene Rolling-Max-Berechnung) – bislang zurückgestellt.</div>';
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
