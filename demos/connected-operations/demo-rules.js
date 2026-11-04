(function (root) {
  "use strict";
  var unavailable = { status: "Insufficient data", note: "The example does not contain enough valid data to evaluate this rule." };
  function result(triggered, explanation) {
    return { status: triggered ? "Review triggered" : "No escalation", note: explanation + " This is an illustrative review, not an equipment command or a created work order." };
  }
  function timeInMinutes(value) {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return null;
    var parts = value.split(":").map(Number);
    return parts[0] < 24 && parts[1] < 60 ? parts[0] * 60 + parts[1] : null;
  }
  function evaluate(asset, scenario, intervalCount) {
    if (!asset || !scenario) return unavailable;
    if (scenario.ruleType === "signal") {
      if (!Array.isArray(scenario.signals) || !Number.isInteger(intervalCount) || intervalCount < 3 || scenario.signals.length !== intervalCount ||
          !Number.isFinite(asset.signalScale) || asset.signalScale <= 0 || !Number.isFinite(asset.signalThreshold) ||
          scenario.signals.some(function (value) { return !Number.isFinite(value); })) return unavailable;
      var consecutive = 0;
      var exceeded = scenario.signals.some(function (value) {
        consecutive = value * asset.signalScale > asset.signalThreshold ? consecutive + 1 : 0;
        return consecutive >= 3;
      });
      return result(exceeded, exceeded ? "Three consecutive samples exceed the threshold." : "Three consecutive samples do not exceed the threshold.");
    }
    if (scenario.ruleType === "microstops") {
      if (scenario.ruleEvidenceComplete !== true || !Array.isArray(scenario.events)) return unavailable;
      if (scenario.events.some(function (event) { return !event || typeof event.type !== "string" || !event.type.trim() || timeInMinutes(event.time) === null; })) return unavailable;
      var eventTimes = scenario.events.map(function (event) { return timeInMinutes(event.time); });
      if (eventTimes.some(function (time, index) { return index > 0 && time < eventTimes[index - 1]; })) return unavailable;
      var allStops = scenario.events.filter(function (event) { return event.type === "Stop"; });
      if (allStops.some(function (event) { return event.category !== "microstop" && event.category !== "other"; })) return unavailable;
      var stops = allStops.filter(function (event) { return event.category === "microstop"; });
      var times = stops.map(function (event) { return timeInMinutes(event.time); });
      if (times.some(function (time) { return time === null; })) return unavailable;
      times.sort(function (a, b) { return a - b; });
      var frequent = times.some(function (time, index) { return index >= 2 && time - times[index - 2] <= 240; });
      return result(frequent, frequent ? "At least three classified microstops occur within four hours." : "The classified microstops do not reach three within four hours.");
    }
    if (scenario.ruleType === "starved") {
      if (scenario.ruleEvidenceComplete !== true || !Array.isArray(scenario.losses)) return unavailable;
      var losses = scenario.losses.filter(function (loss) { return loss && loss.name === "Starved / no material"; });
      if (losses.length !== 1 || !Number.isFinite(losses[0].minutes) || losses[0].minutes < 0) return unavailable;
      var minutes = losses[0].minutes;
      return result(minutes > 30, "The example records " + minutes + " starved minutes against a threshold of more than 30.");
    }
    return unavailable;
  }
  root.CONNECTED_OPERATIONS_RULES = Object.freeze({ evaluate: evaluate });
})(window);
