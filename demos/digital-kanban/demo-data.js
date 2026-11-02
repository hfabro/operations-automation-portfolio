window.DIGITAL_KANBAN_DATA = Object.freeze({
  stockPoints:[
    {id:"SP-101",route:"breakroom-east",name:"East Break Room",location:"Building 01 · Level 1",mode:"storefront",items:[
      {id:"SPI-101-A",name:"Paper cups",unit:"sleeve",standardQty:4,trigger:"Two-bin empty",requestType:"Replenishment"},
      {id:"SPI-101-B",name:"Disposable utensils",unit:"case",standardQty:1,trigger:"Reorder card exposed",requestType:"Replenishment"},
      {id:"SPI-101-C",name:"Coffee filters",unit:"box",standardQty:2,trigger:"Minimum reached",requestType:"Replenishment"}
    ]},
    {id:"SP-204",route:"cell-04-towels",name:"Packaging Cell 04",location:"Production · South aisle",mode:"direct",items:[
      {id:"SPI-204-A",name:"Shop towels",unit:"bundle",standardQty:3,trigger:"Second bin opened",requestType:"Replenishment"}
    ]},
    {id:"SP-309",route:"janitorial-north",name:"North Janitorial Point",location:"Warehouse · North wall",mode:"storefront",items:[
      {id:"SPI-309-A",name:"Liner bags",unit:"case",standardQty:1,trigger:"Minimum reached",requestType:"Replenishment"},
      {id:"SPI-309-B",name:"Surface wipes",unit:"case",standardQty:2,trigger:"Reorder card exposed",requestType:"Replenishment"}
    ]}
  ],
  initialRequests:[
    {id:"REQ-6021",stockPointId:"SP-101",stockPointItemId:"SPI-101-B",requestType:"Replenishment",itemName:"Disposable utensils",stockPointName:"East Break Room",location:"Building 01 · Level 1",quantity:"1 case",status:"Requested",requested:"08:42"},
    {id:"REQ-6018",stockPointId:"SP-309",stockPointItemId:"SPI-309-A",requestType:"Replenishment",itemName:"Liner bags",stockPointName:"North Janitorial Point",location:"Warehouse · North wall",quantity:"1 case",status:"Requested",requested:"08:18"}
  ],
  architecture:[
    {name:"Physical trigger",detail:"Two-bin, card, or minimum signal"},
    {name:"QR route",detail:"Stock point or direct item identity"},
    {name:"Duplicate control",detail:"One open request per item and type"},
    {name:"Restocker queue",detail:"Owned fulfillment visibility"},
    {name:"Complete + history",detail:"Close signal and retain audit record"}
  ]
});
