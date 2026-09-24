window.BUILDING_OPERATIONS_DATA = Object.freeze({
  views: [
    { id: "building", label: "Building overview", title: "North Campus / Building 01", subtitle: "Spatial facilities and safety reports", zones: ["Receiving", "Production", "Utilities", "Warehouse"] },
    { id: "machine", label: "Machine-level view", title: "Packaging Cell 04", subtitle: "Asset-level conditions and operator reports", zones: ["Infeed", "Sealer", "Conveyor", "Palletizer"] }
  ],
  reportTypes: ["Leak", "Safety", "Electrical", "Temperature", "Machine", "Quality"],
  reports: [
    { id:"OPS-1042", view:"building", zone:"Utilities", asset:"AHU-02", type:"Temperature", severity:"high", status:"Open", x:69, y:25, age:"18 min", owner:"Facilities", summary:"Supply-air temperature above operating band", detail:"Synthetic sensor observation plus a human-entered report. Verify locally before changing equipment." },
    { id:"OPS-1039", view:"building", zone:"Receiving", asset:"Dock 03", type:"Safety", severity:"critical", status:"Acknowledged", x:18, y:70, age:"31 min", owner:"EHS / Operations", summary:"Obstructed pedestrian path near dock", detail:"Immediate hazard flag routed to the response queue. Area control and direct notification remain human responsibilities." },
    { id:"OPS-1035", view:"building", zone:"Warehouse", asset:"Roof grid W-7", type:"Leak", severity:"medium", status:"Work requested", x:82, y:72, age:"1 hr", owner:"Facilities", summary:"Water observed below roof penetration", detail:"Map location, description, and evidence are retained with the report and follow-up record." },
    { id:"OPS-1028", view:"building", zone:"Production", asset:"Panel P-14", type:"Electrical", severity:"low", status:"Open", x:45, y:42, age:"2 hr", owner:"Maintenance", summary:"Indicator lamp not illuminated", detail:"No control action is available from this visualization. A qualified person must inspect the equipment." },
    { id:"MCH-221", view:"machine", zone:"Sealer", asset:"PKG-04-SL", type:"Machine", severity:"high", status:"Open", x:43, y:48, age:"9 min", owner:"Maintenance", summary:"Seal-jaw temperature deviation persisted for three cycles", detail:"A deterministic duration rule surfaces the condition for validation; it does not diagnose the failure." },
    { id:"MCH-218", view:"machine", zone:"Infeed", asset:"PKG-04-IN", type:"Quality", severity:"medium", status:"Acknowledged", x:18, y:34, age:"22 min", owner:"Quality / Operations", summary:"Container spacing variation reported by operator", detail:"Machine context and the operator observation are presented together for triage." },
    { id:"MCH-214", view:"machine", zone:"Conveyor", asset:"PKG-04-CV", type:"Safety", severity:"low", status:"Work requested", x:67, y:68, age:"54 min", owner:"Maintenance", summary:"Guard fastener requires review", detail:"The report remains open until the controlled work process is completed and verified." }
  ],
  architecture: [
    { name:"Report or signal", detail:"Human observation or validated condition" },
    { name:"Location + asset", detail:"Stable spatial and equipment identity" },
    { name:"Structured record", detail:"Type, severity, evidence, lifecycle" },
    { name:"Triage + work", detail:"Owner, exception, corrective action" },
    { name:"Verification + history", detail:"Closeout, trend, retained evidence" }
  ]
});
