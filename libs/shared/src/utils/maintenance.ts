import {
  MAINTENANCE_CHECKLIST,
  MAINTENANCE_READINGS,
  MAINTENANCE_VISIT_COUNT,
  MAINTENANCE_VISIT_INTERVAL_MONTHS,
} from '../constants/maintenance';
import type { MaintenanceChecklist } from '../types/interfaces/service-ticket-maintenance.interface';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * `YYYY-MM-DD` plus 3×visit calendar months. A day the target month does not
 * have becomes its last day: 2026-11-30 visit 1 is 2027-02-28.
 */
export function maintenanceVisitDueDate(endDate: string, visit: number): string {
  const [year, month, day] = endDate.slice(0, 10).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const monthIndex = month - 1 + visit * MAINTENANCE_VISIT_INTERVAL_MONTHS;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(Math.min(day, lastDay))}`;
}

/**
 * The first visit due today or later, or null after visit 20. A project
 * completed 13 months ago gets visit 5 — earlier visits are never made.
 * Both arguments are `YYYY-MM-DD`, which compare correctly as strings.
 */
export function nextMaintenanceVisit(
  endDate: string,
  today: string,
): { visitNumber: number; dueDate: string } | null {
  for (let visit = 1; visit <= MAINTENANCE_VISIT_COUNT; visit += 1) {
    const dueDate = maintenanceVisitDueDate(endDate, visit);
    if (dueDate >= today) return { visitNumber: visit, dueDate };
  }
  return null;
}

export function addDaysToIsoDate(date: string, days: number): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Today's date in India as `YYYY-MM-DD`. The server runs on UTC. */
export function indiaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** The hour (0–23) in India right now. */
export function indiaHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
}

export function emptyMaintenanceChecklist(): MaintenanceChecklist {
  return { items: {}, readings: { generationKwh: null, netMeterReading: null } };
}

/** Labels of everything not answered yet, in screen order. */
export function missingMaintenanceChecklist(list: MaintenanceChecklist | null): string[] {
  const missing: string[] = [];
  for (const group of MAINTENANCE_CHECKLIST) {
    for (const item of group.items) {
      if (!list?.items[item.key]?.result) missing.push(item.label);
    }
  }
  for (const reading of MAINTENANCE_READINGS) {
    const value = list?.readings[reading.key];
    if (typeof value !== 'number' || !Number.isFinite(value)) missing.push(reading.label);
  }
  return missing;
}

export function isMaintenanceChecklistComplete(list: MaintenanceChecklist | null): boolean {
  return missingMaintenanceChecklist(list).length === 0;
}

export function maintenanceChecklistDoneCount(list: MaintenanceChecklist | null): number {
  const total =
    MAINTENANCE_CHECKLIST.reduce((sum, group) => sum + group.items.length, 0) +
    MAINTENANCE_READINGS.length;
  return total - missingMaintenanceChecklist(list).length;
}
