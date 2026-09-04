const DAY_MS = 24 * 60 * 60 * 1000;

const OVERSTAY_SURCHARGE_MULTIPLIER = 0.5;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const inclusiveDays = (start: Date, end: Date): number =>
  Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;

export const estimateCost = (
  quantityKg: number,
  ratePerKgPerDay: number,
  days: number,
): number => round2(quantityKg * ratePerKgPerDay * days);

export type SettlementInput = {
  quantityKg: number;
  ratePerKgPerDay: number;
  bookedDays: number;
  actualDays: number;
  minBookingDays: number;
  alreadyPaidBdt: number;
};

export type Settlement = {
  billableDays: number;
  baseCost: number;
  overstayDays: number;
  surcharge: number;
  finalCost: number;
  balance: number;
};

export const settleBooking = (input: SettlementInput): Settlement => {
  const billableDays = Math.max(input.actualDays, input.minBookingDays);
  const baseCost = round2(input.quantityKg * input.ratePerKgPerDay * billableDays);

  const overstayDays = Math.max(0, input.actualDays - input.bookedDays);
  const surcharge = round2(
    input.quantityKg * input.ratePerKgPerDay * overstayDays * OVERSTAY_SURCHARGE_MULTIPLIER,
  );

  const finalCost = round2(baseCost + surcharge);

  return {
    billableDays,
    baseCost,
    overstayDays,
    surcharge,
    finalCost,
    balance: round2(finalCost - input.alreadyPaidBdt),
  };
};
