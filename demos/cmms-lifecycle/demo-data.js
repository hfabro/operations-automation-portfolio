window.CMMS_DEMO_DATA = {
  assets: [
    {
      id: "FAC-AHU-014",
      name: "Air Handler 14",
      area: "Utilities North",
      cadence: "Monthly",
      due: "Oct 02",
      hours: 1.5,
      template: "AHU-M-04",
      revision: 3,
      criticality: "High",
      tasks: [
        { id: "T01", title: "Verify safe access and isolation conditions", type: "check", evidence: false },
        { id: "T02", title: "Inspect belts, guards, and drive alignment", type: "check", evidence: true },
        { id: "T03", title: "Record supply fan vibration", type: "reading", unit: "mm/s", min: 0, max: 4.5, target: 2.8 },
        { id: "T04", title: "Record filter differential pressure", type: "reading", unit: "in. w.c.", min: 0.1, max: 1.0, target: 0.62 }
      ]
    },
    {
      id: "PKG-CNV-022",
      name: "Packaging Conveyor 22",
      area: "Packaging Cell 2",
      cadence: "Weekly",
      due: "Oct 03",
      hours: 1.0,
      template: "CNV-W-07",
      revision: 5,
      criticality: "Medium",
      tasks: [
        { id: "T01", title: "Verify guarding and emergency-stop condition", type: "check", evidence: false },
        { id: "T02", title: "Inspect belt tracking and splice condition", type: "check", evidence: true },
        { id: "T03", title: "Record drive motor temperature", type: "reading", unit: "°C", min: 18, max: 72, target: 48 },
        { id: "T04", title: "Inspect bearings and lubrication points", type: "check", evidence: false }
      ]
    },
    {
      id: "UTIL-PMP-008",
      name: "Process Water Pump 8",
      area: "Utility Gallery",
      cadence: "Quarterly",
      due: "Oct 06",
      hours: 2.1,
      template: "PMP-Q-02",
      revision: 2,
      criticality: "High",
      tasks: [
        { id: "T01", title: "Verify isolation and inspect coupling guard", type: "check", evidence: false },
        { id: "T02", title: "Inspect for seal leakage or base movement", type: "check", evidence: true },
        { id: "T03", title: "Record pump vibration", type: "reading", unit: "mm/s", min: 0, max: 5.0, target: 3.1 },
        { id: "T04", title: "Record discharge pressure", type: "reading", unit: "bar", min: 3.2, max: 5.8, target: 4.6 }
      ]
    }
  ],
  capacity: [
    { week: "Sep 28", planned: 31, available: 40 },
    { week: "Oct 05", planned: 36, available: 40 },
    { week: "Oct 12", planned: 27, available: 40 }
  ],
  watchlist: [
    { asset: "FAC-AHU-014", condition: 3, criticality: 3, recurrence: 2, reason: "Two elevated vibration readings" },
    { asset: "UTIL-PMP-008", condition: 2, criticality: 3, recurrence: 2, reason: "Seal condition trend requires review" },
    { asset: "PKG-CNV-022", condition: 1, criticality: 2, recurrence: 1, reason: "Stable after prior alignment work" }
  ]
};
