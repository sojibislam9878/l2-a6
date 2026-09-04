export type BookingWindow = {
  startDate: Date;
  endDate: Date;
  quantityKg: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const peakLoadKg = (bookings: BookingWindow[], from: Date, to: Date): number => {
  const events: { at: number; delta: number }[] = [];

  for (const booking of bookings) {
    const start = Math.max(booking.startDate.getTime(), from.getTime());
    const end = Math.min(booking.endDate.getTime(), to.getTime());

    if (start > end) {
      continue;
    }

    events.push({ at: start, delta: booking.quantityKg });
    events.push({ at: end + DAY_MS, delta: -booking.quantityKg });
  }

  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  let running = 0;
  let peak = 0;

  for (const event of events) {
    running += event.delta;
    if (running > peak) {
      peak = running;
    }
  }

  return peak;
};

export const availableCapacityKg = (
  capacityKg: number,
  bookings: BookingWindow[],
  from: Date,
  to: Date,
): number => Math.max(0, capacityKg - peakLoadKg(bookings, from, to));

export type DailyLoad = {
  date: string;
  usedKg: number;
  freeKg: number;
};

export const dailyLoad = (
  capacityKg: number,
  bookings: BookingWindow[],
  from: Date,
  to: Date,
): DailyLoad[] => {
  const days: DailyLoad[] = [];

  for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += DAY_MS) {
    let usedKg = 0;

    for (const booking of bookings) {
      if (booking.startDate.getTime() <= cursor && booking.endDate.getTime() >= cursor) {
        usedKg += booking.quantityKg;
      }
    }

    days.push({
      date: new Date(cursor).toISOString().slice(0, 10),
      usedKg,
      freeKg: Math.max(0, capacityKg - usedKg),
    });
  }

  return days;
};
