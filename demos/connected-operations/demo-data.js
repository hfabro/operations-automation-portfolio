window.CONNECTED_OPERATIONS_DATA = Object.freeze({
  intervals: ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  assets: [
    { id: "PKG-04", label: "Packaging Cell 04", area: "Packaging", product: "Demo SKU A", targetRate: 120, rateUnit: "units/hr", signalLabel: "Drive vibration", signalUnit: "mm/s", signalScale: 0.1, signalThreshold: 6.2 },
    { id: "PRS-02", label: "Forming Press 02", area: "Forming", product: "Demo Part B", targetRate: 80, rateUnit: "cycles/hr", signalLabel: "Bearing temperature", signalUnit: "°C", signalScale: 1, signalThreshold: 62 }
  ],
  scenarios: [
    {
      id: "stable", label: "Stable run", code: "NOMINAL", availability: 93.5, performance: 96.2, quality: 99.1,
      states: ["planned", "run", "run", "run", "run", "run", "idle", "run", "run", "run", "run", "run"],
      rates: [0, 92, 97, 99, 96, 95, 62, 98, 96, 94, 97, 93], signals: [34, 36, 37, 36, 38, 39, 35, 37, 38, 39, 38, 37],
      losses: [{ name: "Planned startup", minutes: 18 }, { name: "Material wait", minutes: 7 }, { name: "Minor stops", minutes: 5 }, { name: "Quality hold", minutes: 2 }],
      events: [{ time: "06:00", type: "Planned", text: "Startup verification linked to product and shift." }, { time: "08:58", type: "Idle", text: "Short material wait classified at cell level." }, { time: "09:31", type: "Run", text: "Target-rate recovery confirmed after restart." }],
      title: "Controlled operating pattern", text: "The shift remains near the modeled rate with one contextualized material wait.", ruleType: "signal", ruleStatus: "No escalation", ruleNote: "The threshold is not met. No work request is created.", question: "Is the seven-minute material wait worth a process change?", decision: "Compare frequency and cumulative duration across more shifts before adding automation or escalation."
    },
    {
      id: "microstops", label: "Microstops", code: "LOSS-PERF", availability: 86.4, performance: 82.8, quality: 98.9,
      states: ["planned", "run", "stop", "run", "stop", "run", "run", "stop", "run", "stop", "run", "run"],
      rates: [0, 91, 28, 84, 41, 79, 82, 35, 88, 46, 86, 90], signals: [35, 39, 48, 42, 53, 46, 49, 58, 47, 61, 50, 46],
      losses: [{ name: "Minor stops", minutes: 34 }, { name: "Reduced speed", minutes: 21 }, { name: "Planned startup", minutes: 18 }, { name: "Material wait", minutes: 6 }],
      events: [{ time: "07:03", type: "Stop", text: "Photoeye interruption grouped into a microstop event." }, { time: "08:04", type: "Stop", text: "Second interruption matched to the same reason family." }, { time: "09:32", type: "Pattern", text: "Repeated short stops exceed the review frequency threshold." }, { time: "10:31", type: "Stop", text: "Fourth event preserves duration and selected reason." }],
      title: "Repeated short-duration loss", text: "Availability alone understates the impact; repeated interruptions also reduce effective production rate.", ruleType: "microstops", ruleStatus: "Review triggered", ruleNote: "Create a human-owned loss review—not an automatic equipment change.", question: "Is the dominant loss mechanical, sensor-related, material-related, or procedural?", decision: "Validate event reasons at the cell and examine the sequence before selecting a countermeasure."
    },
    {
      id: "quality", label: "Quality drift", code: "LOSS-QUAL", availability: 92.1, performance: 93.4, quality: 94.8,
      states: ["planned", "run", "run", "run", "run", "run", "run", "run", "idle", "run", "run", "run"],
      rates: [0, 93, 95, 96, 94, 92, 91, 89, 60, 88, 86, 84], signals: [34, 36, 37, 39, 42, 47, 53, 58, 63, 67, 69, 71],
      losses: [{ name: "Quality rejects", minutes: 25 }, { name: "Planned startup", minutes: 18 }, { name: "Adjustment", minutes: 14 }, { name: "Inspection hold", minutes: 8 }],
      events: [{ time: "08:32", type: "Signal", text: "Condition signal begins a sustained upward trend." }, { time: "09:34", type: "Quality", text: "Reject rate crosses the modeled review threshold." }, { time: "10:02", type: "Hold", text: "Human quality review requested before continuation." }, { time: "11:03", type: "Signal", text: "Third high interval satisfies deterministic escalation logic." }],
      title: "Correlated drift requires validation", text: "The signal and reject trend overlap, but correlation does not establish root cause.", ruleType: "signal", ruleStatus: "Inspection review triggered", ruleNote: "The rule routes evidence to maintenance and quality for validation.", question: "Does the signal reflect a developing equipment condition or a process/product change?", decision: "Check measurement validity, product context, tooling, and inspection results before authorizing maintenance."
    },
    {
      id: "starved", label: "Material starvation", code: "LOSS-FLOW", availability: 78.6, performance: 88.2, quality: 99.3,
      states: ["planned", "run", "run", "idle", "idle", "run", "run", "idle", "idle", "run", "run", "idle"],
      rates: [0, 90, 94, 31, 18, 86, 90, 27, 22, 89, 92, 36], signals: [33, 35, 36, 32, 31, 34, 35, 30, 29, 34, 35, 32],
      losses: [{ name: "Starved / no material", minutes: 57 }, { name: "Planned startup", minutes: 18 }, { name: "Recovery ramp", minutes: 12 }, { name: "Minor stops", minutes: 5 }],
      events: [{ time: "07:31", type: "Starved", text: "Upstream material absence starts a classified idle event." }, { time: "08:29", type: "Recovery", text: "Flow resumes; recovery time remains separate from starvation." }, { time: "09:31", type: "Starved", text: "Second material interruption confirms a recurring flow loss." }, { time: "11:33", type: "Starved", text: "Third occurrence routes a cross-functional review." }],
      title: "Constraint outside the machine", text: "The equipment is available but cannot run consistently because material flow is interrupted.", ruleType: "starved", ruleStatus: "Flow review triggered", ruleNote: "Route the issue to production and material-flow ownership; do not create a maintenance fault.", question: "What upstream condition repeatedly removes material from the cell?", decision: "Review replenishment timing, handoff signals, changeover overlap, and source-system timestamps."
    }
  ],
  architecture: [
    { name: "Machine / PLC", detail: "Tags, counts, states" },
    { name: "Edge + buffer", detail: "Reliable collection" },
    { name: "Event model", detail: "Time + state + reason" },
    { name: "Operations context", detail: "Asset + product + shift" },
    { name: "Analytics + workflow", detail: "Loss + owned response" }
  ]
});
