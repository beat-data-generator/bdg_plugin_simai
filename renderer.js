/// <reference path="plugin-api.d.ts" />
window.__bdgPluginRegister(function activate(api) {
  "use strict";

  var MEASURE_BEATS = 4;
  var FINE_PER_BEAT = 96;
  var MEASURE_FINE = MEASURE_BEATS * FINE_PER_BEAT;
  var DEFAULT_POS = 1;

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function formatTempo(value) {
    if (!isFinite(value) || value <= 0) value = 120;
    var rounded = Math.round(value * 1000) / 1000;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
      return String(Math.round(rounded));
    }
    return String(rounded);
  }

  function readPosition(attrs) {
    if (!attrs) return DEFAULT_POS;
    var raw = attrs.pos;
    if (raw === undefined) raw = attrs.position;
    if (raw === undefined) raw = attrs.button;
    if (raw === undefined) raw = attrs.key;
    if (raw === undefined) return DEFAULT_POS;
    if (typeof raw === "string") {
      var token = raw.trim();
      if (/^A[1-8]$/i.test(token)) return token.toUpperCase();
    }
    var num = parseInt(raw, 10);
    if (isFinite(num) && num >= 1 && num <= 8) return String(num);
    return DEFAULT_POS;
  }

  function bucketPush(buckets, measure, item) {
    if (!buckets[measure]) buckets[measure] = [];
    buckets[measure].push(item);
  }

  function buildChart(snapshot) {
    var tapBuckets = {};
    var bpmBuckets = {};
    var maxFine = 0;

    var baseBpm = Number(snapshot.baseBpm);
    if (!isFinite(baseBpm) || baseBpm <= 0) baseBpm = 120;

    var initialBpm = api.project.bpmAtBeat(1e-6);
    if (!isFinite(initialBpm) || initialBpm <= 0) initialBpm = baseBpm;
    bucketPush(bpmBuckets, 0, { fine: 0, bpm: initialBpm });

    var markers = snapshot.markers || [];
    for (var i = 0; i < markers.length; i++) {
      var beat = Number(markers[i].beat);
      if (!isFinite(beat) || beat < 0) continue;
      var fi = Math.round(beat * FINE_PER_BEAT);
      var measure = Math.floor(fi / MEASURE_FINE);
      bucketPush(tapBuckets, measure, {
        fine: fi - measure * MEASURE_FINE,
        pos: readPosition(markers[i].attrs),
      });
      if (fi > maxFine) maxFine = fi;
    }

    var points = snapshot.bpmPoints || [];
    for (var j = 0; j < points.length; j++) {
      var pBeat = Number(points[j].beat);
      if (!isFinite(pBeat) || pBeat <= 0) continue;
      var pf = Math.round(pBeat * FINE_PER_BEAT);
      var pm = Math.floor(pf / MEASURE_FINE);
      var bpm = api.project.bpmAtBeat(pBeat + 1e-6);
      if (!isFinite(bpm) || bpm <= 0) continue;
      bucketPush(bpmBuckets, pm, { fine: pf - pm * MEASURE_FINE, bpm: bpm });
      if (pf > maxFine) maxFine = pf;
    }

    var lastMeasure = Math.floor(maxFine / MEASURE_FINE);
    var lines = [];
    var totalNotes = 0;

    for (var m = 0; m <= lastMeasure; m++) {
      var notes = tapBuckets[m] || [];
      var tempos = bpmBuckets[m] || [];
      notes.sort(function (a, b) {
        return a.fine - b.fine;
      });
      tempos.sort(function (a, b) {
        return a.fine - b.fine;
      });

      var g = MEASURE_FINE;
      for (var ni = 0; ni < notes.length; ni++) g = gcd(g, notes[ni].fine);
      for (var ti = 0; ti < tempos.length; ti++) g = gcd(g, tempos[ti].fine);
      if (g <= 0) g = MEASURE_FINE;

      var n = MEASURE_FINE / g;
      var slotNote = new Array(n);
      var slotBpm = new Array(n);

      for (var na = 0; na < notes.length; na++) {
        var noteSlot = notes[na].fine / g;
        if (!slotNote[noteSlot]) {
          slotNote[noteSlot] = notes[na].pos;
          totalNotes++;
        }
      }
      for (var tb = 0; tb < tempos.length; tb++) {
        var bpmSlot = tempos[tb].fine / g;
        var token = "(" + formatTempo(tempos[tb].bpm) + ")";
        slotBpm[bpmSlot] = slotBpm[bpmSlot] ? slotBpm[bpmSlot] + token : token;
      }

      var slots = [];
      for (var si = 0; si < n; si++) {
        slots.push((slotBpm[si] || "") + (slotNote[si] || ""));
      }

      var prefix = slotBpm[0] || "";
      if (prefix) slots[0] = slotNote[0] || "";

      lines.push(prefix + "{" + n + "}" + slots.join(",") + ",");
    }

    var text = (lines.length ? lines.join("\n") : "") + "\nE\n";
    return { text: text, noteCount: totalNotes, measureCount: lines.length };
  }

  function sanitizeFileName(name) {
    var base = String(name || "chart")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .trim();
    return base || "chart";
  }

  function runExport() {
    var snapshot = api.project.snapshot();
    var result = buildChart(snapshot);
    if (result.noteCount === 0) {
      api.log("Simai export: no markers found, exporting an empty chart");
    }
    return api.system
      .saveFile({
        title: "导出舞萌 Simai 谱面",
        defaultPath: sanitizeFileName(snapshot.name) + ".simai.txt",
        filters: [
          { name: "Simai chart", extensions: ["txt", "simai"] },
          { name: "All files", extensions: ["*"] },
        ],
      })
      .then(function (res) {
        if (res.canceled || !res.filePath) return;
        return api.system
          .writeText(res.filePath, result.text)
          .then(function (ok) {
            api.log(
              "Simai export:",
              ok ? "saved" : "write failed",
              res.filePath,
              "notes=" + result.noteCount,
              "measures=" + result.measureCount,
            );
          });
      })
      .catch(function (err) {
        api.log("Simai export error:", err);
      });
  }

  api.ui.registerExporter({
    label: { zh: "舞萌 Simai 谱面", en: "maimai Simai chart" },
    run: runExport,
  });

  api.ui.registerAction({
    label: { zh: "导出舞萌 Simai 谱面", en: "Export maimai Simai chart" },
    run: runExport,
  });

  api.log("Simai exporter ready");

  return function dispose() {
    api.log("Simai exporter disposed");
  };
});
