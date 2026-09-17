/**
 * Routine maintenance: one checkup every 3 months for 5 years after a project
 * is completed. The job makes each ticket 14 days before it is due.
 */
export const MAINTENANCE_VISIT_COUNT = 20;
export const MAINTENANCE_VISIT_INTERVAL_MONTHS = 3;
export const MAINTENANCE_LEAD_DAYS = 14;

export interface MaintenanceChecklistItemDef {
  key: string;
  label: string;
}

export interface MaintenanceChecklistGroupDef {
  key: string;
  title: string;
  items: readonly MaintenanceChecklistItemDef[];
}

/**
 * The fixed inspection list. Keys are stored in the database: never rename or
 * reuse one. Labels can change freely.
 */
export const MAINTENANCE_CHECKLIST: readonly MaintenanceChecklistGroupDef[] = [
  {
    key: 'panels',
    title: 'Panels',
    items: [
      { key: 'panels.cleaned', label: 'Panels cleaned' },
      { key: 'panels.no_cracks', label: 'No cracked or broken glass' },
      { key: 'panels.no_hotspots', label: 'No burn marks, brown spots, or hot spots' },
      { key: 'panels.no_new_shade', label: 'No new shade (trees, new buildings, water tank)' },
      { key: 'panels.no_birds', label: 'No bird nests or droppings under panels' },
    ],
  },
  {
    key: 'structure',
    title: 'Structure',
    items: [
      { key: 'structure.no_rust', label: 'No rust on mounting structure' },
      { key: 'structure.bolts_tight', label: 'Bolts and clamps tight' },
      { key: 'structure.no_roof_leak', label: 'No roof leak near the structure legs' },
    ],
  },
  {
    key: 'dc',
    title: 'DC side',
    items: [
      { key: 'dc.connectors', label: 'MC4 connectors: no heat or burn marks' },
      { key: 'dc.cables', label: 'DC cables: no cuts, no rat damage, tied properly' },
      { key: 'dc.dcdb', label: 'DCDB fuses and surge protector OK' },
    ],
  },
  {
    key: 'inverter',
    title: 'Inverter',
    items: [
      { key: 'inverter.no_errors', label: 'No error code on display or app' },
      { key: 'inverter.vents_clean', label: 'Vents and fan clean' },
      { key: 'inverter.monitoring_online', label: 'Monitoring app is online' },
    ],
  },
  {
    key: 'ac',
    title: 'AC side and safety',
    items: [
      { key: 'ac.acdb', label: 'ACDB MCB and surge protector OK' },
      { key: 'ac.earthing', label: 'Earthing connections tight, no rust' },
      { key: 'ac.lightning_arrester', label: 'Lightning arrester connected' },
      { key: 'ac.warning_stickers', label: 'Warning stickers present' },
    ],
  },
] as const;

export const MAINTENANCE_READINGS = [
  { key: 'generationKwh', label: 'Total generation (kWh)' },
  { key: 'netMeterReading', label: 'Net meter reading' },
] as const;

export const MAINTENANCE_CHECKLIST_ITEM_KEYS: readonly string[] = MAINTENANCE_CHECKLIST.flatMap(
  (group) => group.items.map((item) => item.key),
);

/** 18 items + 2 readings. */
export const MAINTENANCE_CHECKLIST_TOTAL =
  MAINTENANCE_CHECKLIST_ITEM_KEYS.length + MAINTENANCE_READINGS.length;
