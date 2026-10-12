import type { Order, OrderStatus } from '@/types/database';

const PROGRESS_BY_STATUS: Partial<Record<OrderStatus, number>> = {
  pending_payment: 0.05,
  placed: 0.15,
  accepted: 0.3,
  preparing: 0.45,
  ready_for_pickup: 0.6,
  courier_assigned: 0.7,
  picked_up: 0.8,
  delivering: 0.9,
  delivered: 1,
};

export const etaProgress = (status: OrderStatus | undefined): number => {
  if (!status) return 0;
  return PROGRESS_BY_STATUS[status] ?? 0;
};

const clockOf = (value: string, locale?: string): string =>
  new Date(value).toLocaleTimeString(locale ? [locale] : [], {
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatEtaWindow = (
  from: string | null | undefined,
  to: string | null | undefined,
  locale?: string
): string | null => {
  if (!from && !to) return null;

  const start = from ?? to;
  const end = to ?? from;
  if (!start || !end) return null;

  const startClock = clockOf(start, locale);
  const endClock = clockOf(end, locale);

  return startClock === endClock ? startClock : `${startClock}–${endClock}`;
};

export const minutesUntil = (value: string | null | undefined, now = Date.now()): number | null => {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.round((target - now) / 60000);
};

export interface OrderEta {
  window: string | null;
  minutes: number | null;
  isLate: boolean;
  progress: number;
}

export const orderEta = (order: Order | undefined, now = Date.now()): OrderEta => {
  const window = formatEtaWindow(order?.eta_min_at, order?.eta_max_at);
  const minutes = minutesUntil(order?.eta_max_at, now);

  return {
    window,
    minutes: minutesUntil(order?.eta_at, now),
    isLate: minutes !== null && minutes < 0,
    progress: etaProgress(order?.status),
  };
};

export const describeQuote = (
  minMinutes: number | null | undefined,
  maxMinutes: number | null | undefined
): string | null => {
  if (minMinutes == null || maxMinutes == null) return null;
  if (minMinutes === maxMinutes) return `${minMinutes} min`;
  return `${minMinutes}–${maxMinutes} min`;
};
