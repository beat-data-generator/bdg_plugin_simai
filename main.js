module.exports = function activate(ctx) {
  ctx.log("simai exporter main entry activated", ctx.id);
  ctx.registerHandler("info", function () {
    return { id: ctx.id, kind: "simai-exporter", version: "0.1.0" };
  });
  ctx.onDispose(function () {
    ctx.log("simai exporter main entry disposed");
  });
};
