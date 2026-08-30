export interface SampleRateConDoc {
  id: string;
  title: string;
  brokerName: string;
  lane: string;
  rate: number;
  equipment: string;
  description: string;
  rawText: string;
  simulatedFileName: string;
}

export const SAMPLE_RATE_CONFIRMATIONS: SampleRateConDoc[] = [
  {
    id: 'sample-apex-dryvan',
    title: 'Apex Freight — 53ft Dry Van (Dallas to Atlanta)',
    brokerName: 'Apex Freight Logistics [Demo]',
    lane: 'Dallas, TX → Atlanta, GA',
    rate: 2450.0,
    equipment: 'Dry Van (53ft)',
    description: 'High-value packaged electronics spot rate confirmation with security seal requirements and Net 30 terms.',
    simulatedFileName: 'Apex_RateCon_APX-77312.pdf',
    rawText: `================================================================================
RATE CONFIRMATION & CARRIER LOAD AGREEMENT
APEX FREIGHT LOGISTICS, LLC
MC: 084729 | DOT: 221458
200 West Madison St, Suite 1400, Chicago, IL 60606
Phone: (800) 555-0142 | Dispatch Email: dispatch@apex-demo-freight.test
Contact: Sarah Jenkins (Midwest Fleet Division)
================================================================================
LOAD / ORDER NUMBER: APX-77312
Date Issued: Today
Payment Terms: Net 30 Days (QuickPay available at 1.5%)

CARRIER AGREED RATE:
Linehaul Gross: $2,450.00 USD (All-In Flat)
Fuel Surcharge: INCLUDED
Total Agreed Pay: $2,450.00 USD

EQUIPMENT & COMMODITY:
Equipment: 53' Dry Van (Air-Ride, Clean & Odor Free)
Commodity: Packaged Consumer Electronics
Total Weight: 38,500 lbs
Pallet Count: 24 Standard 48x40 Pallets
Trailer Requirements: Padlocked & High-Security Bolt Seal #89921 required.

PICKUP (STOP 1 - ORIGIN):
Facility: Lone Star Logistics Distribution Center #3
Address: 3200 Regal Row, Dock 14-18
City/State/Zip: Dallas, TX 75207
Appointment / Window: Tomorrow at 09:00 AM - 13:00 PM CDT (Strict Window)
Pickup Notes: Check in with Broker PO #CH-88219 at Gate 4 guard shack.

DELIVERY (STOP 2 - DESTINATION):
Facility: Southeast Fulfillment Hub Gate 12
Address: 4100 Fulton Industrial Blvd
City/State/Zip: Atlanta, GA 30301
Appointment / Window: In 2 Days at 08:00 AM - 14:00 PM EDT
Delivery Notes: Liftgate not required. Receiver will unload. Signed clear POD required for payment.

SPECIAL INSTRUCTIONS & ACCESSORIAL TERMS:
- Detention: $60.00/hr after 2 hours free time. Must notify dispatcher 30 mins before 2hr mark with signed in/out times on BOL.
- Lumper: Reimbursed only with receipt and prior written broker authorization.
- Invoicing: Send signed POD & Rate Con to carrier-settlements@apex-demo-freight.test
================================================================================`,
  },
  {
    id: 'sample-horizon-reefer',
    title: 'Horizon Express — 53ft Reefer (Memphis to Charlotte)',
    brokerName: 'Horizon Express Logistics [Demo]',
    lane: 'Memphis, TN → Charlotte, NC',
    rate: 2850.0,
    equipment: 'Refrigerated Reefer (36°F)',
    description: 'Chilled dairy & yogurt freight with continuous 36°F reefer temperature monitoring log requirement.',
    simulatedFileName: 'Horizon_RateConfirmation_HZ-44910.pdf',
    rawText: `================================================================================
BROKER-CARRIER RATE CONFIRMATION
HORIZON EXPRESS LOGISTICS
MC: 561230 | USDOT: 774109
100 North Main Building, Memphis, TN 38103
Phone: (877) 555-0193 | Fax: (877) 555-0194
Dispatcher: Amanda Cross | Email: loads@horizon-demo.test
================================================================================
LOAD CONFIRMATION NUMBER: HZ-44910
Booking Date: Today
Payment Terms: 21 Days Standard

FINANCIAL COMPENSATION:
Flat Agreed Carrier Pay: $2,850.00 USD
Fuel Included: Yes
Total Rate: $2,850.00 USD

EQUIPMENT / SHIPMENT DETAILS:
Equipment Type: 53ft Refrigerated Trailer (Reefer)
Temperature Setting: MAINTAIN 36°F CONTINUOUS (NO CYCLE SENTRY)
Commodity: Chilled Dairy & Specialty Greek Yogurt
Total Gross Weight: 41,200 lbs
Count: 22 Chep Pallets

SHIPPER (ORIGIN):
Delta Cold Storage & Distribution
2200 Riverport Road, Door 8
Memphis, TN 38103
Pickup Date/Time: Tomorrow @ 08:00 - 12:00 CST
Contact: Receiving Office (901) 555-0177

RECEIVER (DESTINATION):
Piedmont Grocers Distribution Center
5400 Statesville Rd
Charlotte, NC 28202
Delivery Date/Time: Day After Tomorrow @ 06:00 - 10:00 EST
Contact: Produce Inbound Desk

SPECIAL PROVISIONS:
- Continuous Reefer mode mandatory. Temperature recorder must be downloaded upon arrival at receiver.
- MacroPoint or ELD automated tracking link must remain active throughout transit.
- Detention Rate: $65.00/hr after 2.0 hrs free time. Must request authorization within 1 hour.
================================================================================`,
  },
  {
    id: 'sample-blueridge-flatbed',
    title: 'Blue Ridge Freight — 48ft Flatbed (Chicago to Dallas)',
    brokerName: 'Blue Ridge Freight Brokerage [Demo]',
    lane: 'Chicago, IL → Dallas, TX',
    rate: 3200.0,
    equipment: 'Flatbed (48ft / Tarps & Chains)',
    description: 'Heavy structural steel beams with 8ft tarps and transport chains specification.',
    simulatedFileName: 'BlueRidge_RateCon_BR-89412.pdf',
    rawText: `================================================================================
RATE CONFIRMATION & DISPATCH INSTRUCTIONS
BLUE RIDGE FREIGHT BROKERAGE, INC.
MC #347592 | US DOT #556102
500 East Main St, Blue Ridge Building, Knoxville, TN 37902
Carrier Line: (800) 555-0188 | Ops Team 204: ops@blueridge-demo.test
Broker Agent: Brandon Cole
================================================================================
RATE CON / LOAD ID: BR-89412
Date: Today
Payment Terms: Net 30 Days

SETTLEMENT SUMMARY:
Agreed Rate: $3,200.00
Tarp Compensation: Included in Rate ($150 value)
Total Carrier Settlement: $3,200.00 USD

LOAD SPECIFICATIONS:
Trailer: 48' or 53' Flatbed
Commodity: Fabricated Structural Steel Beams & Angle Iron
Weight: 46,000 lbs (Heavy Haul - Scale ticket recommended)
Securement: Minimum 8 Grade-70 3/8" Transport Chains & Binders + 8ft Drop Tarps

ORIGIN PICKUP:
Midwest Steel Processing Plant #4
1400 Industrial Parkway, Bay B
Chicago, IL 60611
Pickup Appointment: In 36 Hours @ 07:00 AM - 14:00 PM CDT
PPE Required: Hard Hat, Safety Glasses, Steel Toe Boots, High-Vis Vest

DESTINATION UNLOAD:
Lone Star Commercial Construction Yard
8800 Trinity Blvd, Gate 3
Dallas, TX 75207
Delivery Window: In 3.5 Days @ 06:00 AM - 12:00 PM CDT
Crane Unload on Site - No driver assist required.

ACCESSORIAL CLAUSES:
- Tarp fee is fully factored into linehaul gross ($3,200).
- Detention is $75.00/hr after 2 hours free time with time-stamped BOL.
================================================================================`,
  },
];
