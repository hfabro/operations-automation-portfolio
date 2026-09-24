window.TELEMETRY_DEMO_DATA = Object.freeze({
  intervals: ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
  peakWindow: { startIndex: 16, endIndex: 23, label: "14:00–18:00 modeled peak window" },
  equipment: [
    { id: "FLT-01", label: "Forklift 01", initialSoc: 94, activeRanges: [[0, 5], [7, 12], [14, 17]], chargeRange: [19, 23], utilization: 68, chargingEnergy: 18.4, peakDemand: 8.6, offPeakOpportunity: "Medium", note: "Charging begins late in the modeled peak window." },
    { id: "FLT-02", label: "Forklift 02", initialSoc: 88, activeRanges: [[1, 7], [10, 15], [18, 20]], chargeRange: [21, 24], utilization: 74, chargingEnergy: 21.1, peakDemand: 4.2, offPeakOpportunity: "Low", note: "Most charging occurs after the modeled peak window." },
    { id: "FLT-03", label: "Forklift 03", initialSoc: 97, activeRanges: [[0, 4], [6, 11], [13, 18]], chargeRange: [17, 22], utilization: 71, chargingEnergy: 23.7, peakDemand: 11.8, offPeakOpportunity: "High", note: "Charging overlaps the modeled peak window and creates the clearest scheduling opportunity." },
    { id: "FLT-04", label: "Forklift 04", initialSoc: 82, activeRanges: [[2, 6], [9, 13], [16, 21]], chargeRange: [0, 2], utilization: 63, chargingEnergy: 13.5, peakDemand: 1.6, offPeakOpportunity: "Low", note: "Early charging avoids the modeled facility peak window." },
    { id: "FLT-05", label: "Forklift 05", initialSoc: 91, activeRanges: [[0, 3], [5, 10], [12, 16]], chargeRange: [18, 23], utilization: 59, chargingEnergy: 19.8, peakDemand: 10.1, offPeakOpportunity: "High", note: "A long late-day charge session overlaps the modeled peak window." }
  ],
  architecture: [
    { name: "REST API", detail: "Synthetic JSON telemetry" },
    { name: "Transformation", detail: "Time grain + state logic" },
    { name: "Telemetry model", detail: "Equipment + intervals" },
    { name: "Utility context", detail: "Peak-window overlay" },
    { name: "Decision support", detail: "Fleet + energy insights" }
  ]
});
