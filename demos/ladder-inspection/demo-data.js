window.LADDER_DEMO_DATA = Object.freeze({
  asset: {
    assetId: "LAD-017",
    location: "Shipping",
    department: "Operations",
    assetType: "6 ft fiberglass step ladder",
    inspectionFrequency: "Monthly",
    operatingStatus: "Active",
    lastInspection: "Aug 02, 2026"
  },
  inspection: {
    inspectionId: "INS-DEMO-0048",
    inspector: "Demo Inspector",
    inspectionType: "Monthly ladder inspection"
  },
  checklist: [
    { id: "sideRails", label: "Side rails free of damage", options: ["Pass", "Fail"], safe: "Pass", exception: "Fail", critical: true },
    { id: "steps", label: "Steps / rungs secure", options: ["Pass", "Fail"], safe: "Pass", exception: "Fail", critical: true },
    { id: "feet", label: "Feet intact", options: ["Pass", "Fail"], safe: "Pass", exception: "Fail", critical: true },
    { id: "labels", label: "Labels legible", options: ["Pass", "Review", "Fail"], safe: "Pass", exception: "Review", critical: false },
    { id: "hardware", label: "Hardware secure", options: ["Pass", "Fail"], safe: "Pass", exception: "Fail", critical: true },
    { id: "removeFromService", label: "Remove from service?", options: ["No", "Yes"], safe: "No", exception: "Yes", critical: true }
  ],
  previousHistory: [
    { id: "INS-2026-0034", date: "Aug 02, 2026", status: "Passed", note: "Six required responses captured." },
    { id: "INS-2026-0021", date: "Jul 05, 2026", status: "Follow-up closed", note: "Label condition reviewed and documented." }
  ],
  architecture: [
    { name: "QR identity", detail: "Resolves LAD-017" },
    { name: "Inspection UI", detail: "Structured responses" },
    { name: "Asset + occurrence", detail: "Separate records" },
    { name: "Workflow rules", detail: "Exceptions + actions" },
    { name: "History + reporting", detail: "Evidence retained" }
  ]
});
