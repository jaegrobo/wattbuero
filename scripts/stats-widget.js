/*
 * Wattbüro – rendert Strava-Trainingsdaten aus data/strava-stats.json.
 * Zwei mögliche Ziel-Elemente auf einer Seite, beide optional:
 *   #wattbuero-mini-stats     -> abgespeckte Ansicht (auf Training-Posts)
 *   #wattbuero-full-dashboard -> volle Ansicht inkl. letzter Aktivitäten (Über-Seite)
 * <body data-root="."> bzw. data-root=".."> gibt an, wo data/ relativ liegt.
 * Kein Framework, keine Abhängigkeiten – läuft überall, wo die Seite liegt.
 */
(function () {
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("de-DE");
  }

  function renderMiniHtml(stats) {
    var s = stats.rolling_28_days;
    return (
      '<div class="mini-stats">' +
      "<div><strong>" + s.ride_count + "</strong><span>Fahrten (28 Tage)</span></div>" +
      "<div><strong>" + s.distance_km + " km</strong><span>Distanz</span></div>" +
      "<div><strong>" + s.elevation_gain_m + " m</strong><span>Höhenmeter</span></div>" +
      (s.average_watts
        ? "<div><strong>" + s.average_watts + " W</strong><span>Ø Leistung</span></div>"
        : "") +
      "</div>"
    );
  }

  function renderFullHtml(stats) {
    var rows = (stats.recent_activities || [])
      .map(function (a) {
        return (
          "<tr><td>" + fmtDate(a.date) + "</td><td>" + a.name + "</td><td>" +
          a.distance_km + " km</td><td>" + a.elevation_gain_m + " m</td><td>" +
          a.moving_time_min + " min</td><td>" + (a.average_watts || "–") + "</td></tr>"
        );
      })
      .join("");

    return (
      renderMiniHtml(stats) +
      '<table class="activity-table">' +
      "<thead><tr><th>Datum</th><th>Aktivität</th><th>Distanz</th><th>Höhenmeter</th><th>Dauer</th><th>Ø Watt</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table>" +
      '<p class="stats-updated">Stand: ' + fmtDate(stats.generated_at) + ", automatisch jeden Montag aktualisiert.</p>"
    );
  }

  function init() {
    var mini = document.getElementById("wattbuero-mini-stats");
    var full = document.getElementById("wattbuero-full-dashboard");
    if (!mini && !full) return;

    var root = document.body.getAttribute("data-root") || ".";
    fetch(root + "/data/strava-stats.json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (stats) {
        if (mini) mini.innerHTML = renderMiniHtml(stats);
        if (full) full.innerHTML = renderFullHtml(stats);
      })
      .catch(function () {
        var msg = "Trainingsdaten aktuell nicht verfügbar.";
        if (mini) mini.textContent = msg;
        if (full) full.textContent = msg;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
