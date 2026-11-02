window.SMART_FACTORY_DATA = {
  domains: [
    { id: "strategy", label: "Strategy", question: "Are priorities, funding, ownership, and benefits governed as one portfolio?" },
    { id: "process", label: "Process", question: "Are the target processes stable, measured, and owned before digitization?" },
    { id: "connectivity", label: "Connectivity", question: "Are equipment interfaces reliable, supportable, and approved?" },
    { id: "data", label: "Data", question: "Are identity, definitions, time, quality, and lineage governed?" },
    { id: "architecture", label: "Architecture", question: "Are IT/OT boundaries, integrations, and lifecycle ownership explicit?" },
    { id: "security", label: "Security", question: "Are access, segmentation, vendors, monitoring, and recovery controlled?" },
    { id: "people", label: "People", question: "Can frontline teams adopt, operate, troubleshoot, and sustain the change?" },
    { id: "value", label: "Value", question: "Are baselines, expected outcomes, costs, and benefit owners defined?" }
  ],
  plants: [
    {
      id: "packaging", name: "Northstar Packaging Plant", context: "High-volume packaging with repeated short stops and fragmented loss reasons.",
      maturity: { strategy: 3.1, process: 3.5, connectivity: 2.8, data: 2.4, architecture: 2.2, security: 2.6, people: 3.4, value: 3.0 }
    },
    {
      id: "batch", name: "Riverbend Batch Operations", context: "Recipe-driven production with strong quality controls but limited cross-system context.",
      maturity: { strategy: 3.6, process: 4.0, connectivity: 3.2, data: 3.1, architecture: 2.7, security: 3.0, people: 3.5, value: 3.3 }
    },
    {
      id: "legacy", name: "Lakeside Legacy Plant", context: "Mixed-age assets, local knowledge, manual records, and limited connectivity readiness.",
      maturity: { strategy: 2.3, process: 2.7, connectivity: 1.8, data: 1.9, architecture: 1.7, security: 2.0, people: 3.2, value: 2.4 }
    }
  ],
  priorities: {
    reliability: { title: "Reliability and flow", note: "Reduce chronic stops and improve response quality." },
    quality: { title: "Quality and yield", note: "Improve detection, traceability, and controlled response." },
    capacity: { title: "Capacity and throughput", note: "Recover constrained time before adding complexity or equipment." },
    sustainability: { title: "Energy and sustainability", note: "Connect consumption to operating context and controllable behavior." }
  },
  useCases: [
    { id: "loss", name: "Automated loss classification", summary: "Contextualize machine states and reason codes for OEE and constraint review.", value: 5, effort: 3, risk: 2, requires: ["connectivity", "data", "process"], alignment: { reliability: 5, quality: 3, capacity: 5, sustainability: 2 } },
    { id: "condition", name: "Condition-signal maintenance workflow", summary: "Route validated duration-based equipment signals into human-reviewed maintenance action.", value: 4, effort: 3, risk: 3, requires: ["connectivity", "data", "architecture"], alignment: { reliability: 5, quality: 3, capacity: 4, sustainability: 2 } },
    { id: "quality", name: "Digital quality checks and genealogy", summary: "Structure quality evidence, exceptions, product context, and follow-up.", value: 5, effort: 4, risk: 3, requires: ["process", "data", "security"], alignment: { reliability: 2, quality: 5, capacity: 3, sustainability: 2 } },
    { id: "andon", name: "Digital Andon and escalation", summary: "Turn controlled production exceptions into visible, owned response paths.", value: 4, effort: 2, risk: 2, requires: ["process", "people", "data"], alignment: { reliability: 5, quality: 4, capacity: 4, sustainability: 1 } },
    { id: "schedule", name: "Schedule-versus-actual visibility", summary: "Align production orders, rates, counts, and downtime for actionable shift review.", value: 4, effort: 3, risk: 2, requires: ["data", "architecture", "process"], alignment: { reliability: 3, quality: 2, capacity: 5, sustainability: 2 } },
    { id: "energy", name: "Contextualized energy analytics", summary: "Relate interval consumption and demand to asset, state, product, and schedule.", value: 4, effort: 3, risk: 2, requires: ["connectivity", "data", "value"], alignment: { reliability: 2, quality: 1, capacity: 2, sustainability: 5 } },
    { id: "worker", name: "Connected-worker standard work", summary: "Deliver controlled instructions, evidence, and exceptions at the point of work.", value: 4, effort: 2, risk: 2, requires: ["process", "people", "security"], alignment: { reliability: 4, quality: 4, capacity: 3, sustainability: 2 } },
    { id: "twin", name: "Constraint-focused digital twin", summary: "Model a defined process decision only after trustworthy inputs and validation criteria exist.", value: 4, effort: 5, risk: 5, requires: ["connectivity", "data", "architecture", "people"], alignment: { reliability: 3, quality: 3, capacity: 5, sustainability: 3 } }
  ]
};
