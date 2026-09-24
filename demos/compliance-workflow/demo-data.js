window.COMPLIANCE_DEMO_DATA = Object.freeze({
  requirement: {
    requirementId: "REQ-DEMO-0143",
    title: "Annual fire system inspection",
    category: "Life safety",
    frequency: "Annual",
    defaultOwner: "Facilities",
    evidenceRequired: true,
    active: true
  },
  occurrence: {
    occurrenceId: "OCC-DEMO-0912",
    dueDate: "Sep 12, 2026",
    generatedFrom: "REQ-DEMO-0143"
  },
  owners: ["Facilities", "EHS", "Operations"],
  previousOccurrences: [
    { id: "OCC-2025-0088", due: "Sep 14, 2025", status: "Complete", evidence: "Inspection report retained" },
    { id: "OCC-2024-0074", due: "Sep 16, 2024", status: "Complete", evidence: "Inspection report retained" }
  ],
  architecture: [
    { name: "Requirement master", detail: "Stable obligation" },
    { name: "Occurrence generator", detail: "Distinct due record" },
    { name: "Owner + lifecycle", detail: "Execution control" },
    { name: "Evidence + exception", detail: "Audit-ready state" },
    { name: "Management view", detail: "Status + risk" }
  ]
});
