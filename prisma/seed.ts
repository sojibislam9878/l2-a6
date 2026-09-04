import bcrypt from "bcrypt";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const dayOffset = (offset: number): Date => {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + offset * DAY_MS);
};

const inclusiveDays = (start: Date, end: Date): number =>
  Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;

const round2 = (value: number): number => Math.round(value * 100) / 100;

let lotCounter = 0;
const nextLotCode = (): string => {
  lotCounter += 1;
  return `AS-${new Date().getUTCFullYear()}-${String(lotCounter).padStart(6, "0")}`;
};

const wipe = async (): Promise<void> => {
  await prisma.auditLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.chamber.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.cropType.deleteMany();
  await prisma.farmerProfile.deleteMany();
  await prisma.ownerProfile.deleteMany();
  await prisma.user.deleteMany();
};

const main = async (): Promise<void> => {
  console.log("Wiping existing data...");
  await wipe();

  const adminPassword = await bcrypt.hash("12345678", env.BCRYPT_SALT_ROUNDS);
  const farmerPassword = await bcrypt.hash("f12345678", env.BCRYPT_SALT_ROUNDS);
  const ownerPassword = await bcrypt.hash("w12345678", env.BCRYPT_SALT_ROUNDS);
  const verifiedAt = new Date();

  console.log("Creating users...");

  const admin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@gmail.com",
      password: adminPassword,
      phone: "01700000000",
      role: "ADMIN",
      emailVerifiedAt: verifiedAt,
    },
  });

  const farmerSeeds = [
    {
      email: "farmer1@gmail.com",
      name: "Rahim Uddin",
      phone: "01711111111",
      district: "Rangpur",
      upazila: "Pirgacha",
      nid: "1990111122223",
      farmSizeAcre: 12.5,
    },
    {
      email: "farmer2@gmail.com",
      name: "Karim Mia",
      phone: "01722222222",
      district: "Munshiganj",
      upazila: "Sreenagar",
      nid: "1988222233334",
      farmSizeAcre: 6,
    },
    {
      email: "farmer3@gmail.com",
      name: "Sultana Begum",
      phone: "01733333333",
      district: "Bogura",
      upazila: "Shibganj",
      nid: "1995333344445",
      farmSizeAcre: 20,
    },
    {
      email: "farmer4@gmail.com",
      name: "Jamal Hossain",
      phone: "01744444444",
      district: "Jashore",
      upazila: "Chougachha",
      nid: "1992444455556",
      farmSizeAcre: 4.5,
    },
  ];

  const farmers = [];

  for (const seed of farmerSeeds) {
    const isBanned = seed.email === "farmer4@gmail.com";

    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        password: farmerPassword,
        phone: seed.phone,
        role: "FARMER",
        status: isBanned ? "BANNED" : "ACTIVE",
        emailVerifiedAt: verifiedAt,
        farmerProfile: {
          create: {
            district: seed.district,
            upazila: seed.upazila,
            nid: seed.nid,
            farmSizeAcre: seed.farmSizeAcre,
          },
        },
      },
    });

    farmers.push(user);
  }

  const ownerSeeds = [
    {
      email: "warehouse1@gmail.com",
      name: "Karim Cold Storage Ltd",
      phone: "01811111111",
      businessName: "Karim Cold Storage Ltd",
      tradeLicenseNo: "TL-RANG-1001",
      nid: "1980111100001",
      district: "Rangpur",
      address: "Station Road, Rangpur Sadar",
    },
    {
      email: "warehouse2@gmail.com",
      name: "Bogura AgroChill",
      phone: "01822222222",
      businessName: "Bogura AgroChill",
      tradeLicenseNo: "TL-BOGU-2002",
      nid: "1982222200002",
      district: "Bogura",
      address: "Sherpur Road, Bogura",
    },
    {
      email: "warehouse3@gmail.com",
      name: "Padma Cold Chain",
      phone: "01833333333",
      businessName: "Padma Cold Chain",
      tradeLicenseNo: "TL-MUNS-3003",
      nid: "1984333300003",
      district: "Munshiganj",
      address: "Mawa Ghat Road, Munshiganj",
    },
  ];

  const owners = [];

  for (const seed of ownerSeeds) {
    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        password: ownerPassword,
        phone: seed.phone,
        role: "WAREHOUSE_OWNER",
        emailVerifiedAt: verifiedAt,
        ownerProfile: {
          create: {
            businessName: seed.businessName,
            tradeLicenseNo: seed.tradeLicenseNo,
            nid: seed.nid,
            district: seed.district,
            address: seed.address,
          },
        },
      },
    });

    owners.push(user);
  }

  console.log("Creating crop types...");

  const cropSeeds = [
    { name: "Potato", idealMinTempC: 2, idealMaxTempC: 4, maxStorageDays: 210 },
    { name: "Onion", idealMinTempC: 0, idealMaxTempC: 2, maxStorageDays: 180 },
    { name: "Carrot", idealMinTempC: 0, idealMaxTempC: 1, maxStorageDays: 150 },
    { name: "Cabbage", idealMinTempC: 0, idealMaxTempC: 2, maxStorageDays: 120 },
    { name: "Garlic", idealMinTempC: 0, idealMaxTempC: 1, maxStorageDays: 200 },
    { name: "Ginger", idealMinTempC: 12, idealMaxTempC: 14, maxStorageDays: 90 },
    { name: "Tomato", idealMinTempC: 10, idealMaxTempC: 13, maxStorageDays: 30 },
    { name: "Apple", idealMinTempC: 0, idealMaxTempC: 2, maxStorageDays: 240 },
  ];

  const crops: Record<
    string,
    { id: string; minTempC: number; maxTempC: number; maxStorageDays: number }
  > = {};

  for (const seed of cropSeeds) {
    const crop = await prisma.cropType.create({ data: seed });
    crops[seed.name] = {
      id: crop.id,
      minTempC: seed.idealMinTempC,
      maxTempC: seed.idealMaxTempC,
      maxStorageDays: seed.maxStorageDays,
    };
  }

  console.log("Creating warehouses and chambers...");

  const warehouseSeeds = [
    {
      owner: 0,
      name: "Rangpur Central Cold Store",
      district: "Rangpur",
      address: "Station Road, Rangpur Sadar",
      licenseNo: "WL-RANG-0001",
      ratePerKgPerDay: 0.04,
      minBookingDays: 7,
      status: "APPROVED" as const,
      chambers: [
        { name: "C-1", capacityKg: 40000, minTempC: 1, maxTempC: 5 },
        { name: "C-2", capacityKg: 25000, minTempC: -1, maxTempC: 3 },
        { name: "C-3", capacityKg: 12000, minTempC: 8, maxTempC: 14 },
      ],
    },
    {
      owner: 0,
      name: "Pirgacha Farmers Cold House",
      district: "Rangpur",
      address: "Pirgacha Bazar Road, Rangpur",
      licenseNo: "WL-RANG-0002",
      ratePerKgPerDay: 0.055,
      minBookingDays: 10,
      status: "APPROVED" as const,
      chambers: [
        { name: "A-1", capacityKg: 15000, minTempC: 0, maxTempC: 4 },
        { name: "A-2", capacityKg: 5000, minTempC: 0, maxTempC: 2 },
      ],
    },
    {
      owner: 1,
      name: "Bogura AgroChill Depot",
      district: "Bogura",
      address: "Sherpur Road, Bogura",
      licenseNo: "WL-BOGU-0003",
      ratePerKgPerDay: 0.048,
      minBookingDays: 7,
      status: "APPROVED" as const,
      chambers: [
        { name: "B-1", capacityKg: 30000, minTempC: 0, maxTempC: 4 },
        { name: "B-2", capacityKg: 18000, minTempC: 10, maxTempC: 14 },
      ],
    },
    {
      owner: 1,
      name: "Jashore Regional Cold Store",
      district: "Jashore",
      address: "Jhumjhumpur, Jashore",
      licenseNo: "WL-JASH-0004",
      ratePerKgPerDay: 0.06,
      minBookingDays: 14,
      status: "PENDING" as const,
      chambers: [{ name: "J-1", capacityKg: 20000, minTempC: 0, maxTempC: 4 }],
    },
    {
      owner: 2,
      name: "Padma Cold Chain Hub",
      district: "Munshiganj",
      address: "Mawa Ghat Road, Munshiganj",
      licenseNo: "WL-MUNS-0005",
      ratePerKgPerDay: 0.052,
      minBookingDays: 7,
      status: "APPROVED" as const,
      chambers: [
        { name: "P-1", capacityKg: 50000, minTempC: 1, maxTempC: 4 },
        { name: "P-2", capacityKg: 22000, minTempC: -1, maxTempC: 2 },
        { name: "P-3", capacityKg: 8000, minTempC: 9, maxTempC: 13 },
      ],
    },
    {
      owner: 2,
      name: "Sreenagar Village Cold Unit",
      district: "Munshiganj",
      address: "Sreenagar Bazar, Munshiganj",
      licenseNo: "WL-MUNS-0006",
      ratePerKgPerDay: 0.045,
      minBookingDays: 7,
      status: "SUSPENDED" as const,
      chambers: [{ name: "S-1", capacityKg: 10000, minTempC: 0, maxTempC: 4 }],
    },
  ];

  const chambers: Record<
    string,
    { id: string; capacityKg: number; rate: number; minBookingDays: number }
  > = {};
  const warehouseIds: string[] = [];

  for (const seed of warehouseSeeds) {
    const ownerId = owners[seed.owner]?.id;

    if (ownerId === undefined) {
      throw new Error(`Owner index ${seed.owner} missing`);
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        ownerId,
        name: seed.name,
        district: seed.district,
        address: seed.address,
        licenseNo: seed.licenseNo,
        ratePerKgPerDay: seed.ratePerKgPerDay,
        minBookingDays: seed.minBookingDays,
        status: seed.status,
        chambers: { create: seed.chambers },
      },
      include: { chambers: true },
    });

    warehouseIds.push(warehouse.id);

    for (const chamber of warehouse.chambers) {
      chambers[`${seed.licenseNo}/${chamber.name}`] = {
        id: chamber.id,
        capacityKg: chamber.capacityKg,
        rate: seed.ratePerKgPerDay,
        minBookingDays: seed.minBookingDays,
      };
    }
  }

  console.log("Creating bookings, payments, inspections and reviews...");

  type BookingSeed = {
    chamber: string;
    farmer: number;
    crop: string;
    quantityKg: number;
    startOffset: number;
    endOffset: number;
    status:
      | "PENDING_APPROVAL"
      | "APPROVED"
      | "REJECTED"
      | "CANCELLED"
      | "PAID"
      | "STORED"
      | "WITHDRAW_REQUESTED"
      | "COMPLETED"
      | "EXPIRED";
    payment?: "PENDING" | "SUCCEEDED" | "REFUNDED";
    inspection?: { grade: "A" | "B" | "C" | "REJECTED"; moisturePct?: number; notes?: string };
    review?: { rating: number; comment: string };
    cancelReason?: string;
  };

  const bookingSeeds: BookingSeed[] = [
    {
      chamber: "WL-RANG-0001/C-1",
      farmer: 0,
      crop: "Potato",
      quantityKg: 8000,
      startOffset: 5,
      endOffset: 65,
      status: "PENDING_APPROVAL",
    },
    {
      chamber: "WL-RANG-0001/C-1",
      farmer: 1,
      crop: "Potato",
      quantityKg: 6000,
      startOffset: 8,
      endOffset: 70,
      status: "PENDING_APPROVAL",
    },
    {
      chamber: "WL-RANG-0001/C-1",
      farmer: 2,
      crop: "Onion",
      quantityKg: 5000,
      startOffset: 3,
      endOffset: 45,
      status: "APPROVED",
    },
    {
      chamber: "WL-RANG-0001/C-2",
      farmer: 0,
      crop: "Carrot",
      quantityKg: 4000,
      startOffset: 2,
      endOffset: 40,
      status: "PAID",
      payment: "SUCCEEDED",
    },
    {
      chamber: "WL-RANG-0001/C-2",
      farmer: 1,
      crop: "Garlic",
      quantityKg: 3000,
      startOffset: -10,
      endOffset: 50,
      status: "STORED",
      payment: "SUCCEEDED",
      inspection: { grade: "A", moisturePct: 11.2, notes: "Well cured, no sprouting" },
    },
    {
      chamber: "WL-RANG-0001/C-3",
      farmer: 2,
      crop: "Ginger",
      quantityKg: 2500,
      startOffset: -20,
      endOffset: 40,
      status: "WITHDRAW_REQUESTED",
      payment: "SUCCEEDED",
      inspection: { grade: "B", moisturePct: 14.8 },
    },
    {
      chamber: "WL-RANG-0002/A-1",
      farmer: 0,
      crop: "Potato",
      quantityKg: 5000,
      startOffset: -70,
      endOffset: -40,
      status: "COMPLETED",
      payment: "SUCCEEDED",
      inspection: { grade: "A", moisturePct: 10.5 },
      review: {
        rating: 5,
        comment: "Zero spoilage across the whole season. Staff were helpful at intake.",
      },
    },
    {
      chamber: "WL-RANG-0002/A-1",
      farmer: 1,
      crop: "Onion",
      quantityKg: 3500,
      startOffset: -80,
      endOffset: -50,
      status: "COMPLETED",
      payment: "SUCCEEDED",
      inspection: { grade: "B" },
      review: { rating: 4, comment: "Good storage, but release paperwork took half a day." },
    },
    {
      chamber: "WL-RANG-0002/A-2",
      farmer: 2,
      crop: "Onion",
      quantityKg: 4500,
      startOffset: 4,
      endOffset: 44,
      status: "PAID",
      payment: "SUCCEEDED",
    },
    {
      chamber: "WL-BOGU-0003/B-1",
      farmer: 2,
      crop: "Cabbage",
      quantityKg: 9000,
      startOffset: -60,
      endOffset: -20,
      status: "COMPLETED",
      payment: "SUCCEEDED",
      inspection: { grade: "A" },
      review: {
        rating: 5,
        comment: "Best rate in Bogura and the chamber held temperature perfectly.",
      },
    },
    {
      chamber: "WL-BOGU-0003/B-1",
      farmer: 0,
      crop: "Apple",
      quantityKg: 6000,
      startOffset: 6,
      endOffset: 66,
      status: "APPROVED",
    },
    {
      chamber: "WL-BOGU-0003/B-2",
      farmer: 1,
      crop: "Tomato",
      quantityKg: 2000,
      startOffset: 5,
      endOffset: 25,
      status: "PAID",
      payment: "REFUNDED",
      inspection: {
        grade: "REJECTED",
        moisturePct: 22.4,
        notes: "Rot detected in 4 of 20 crates at intake",
      },
      cancelReason: "Failed intake quality inspection",
    },
    {
      chamber: "WL-MUNS-0005/P-1",
      farmer: 0,
      crop: "Potato",
      quantityKg: 20000,
      startOffset: 7,
      endOffset: 87,
      status: "PAID",
      payment: "SUCCEEDED",
    },
    {
      chamber: "WL-MUNS-0005/P-2",
      farmer: 2,
      crop: "Garlic",
      quantityKg: 8000,
      startOffset: -30,
      endOffset: 30,
      status: "STORED",
      payment: "SUCCEEDED",
      inspection: { grade: "C", moisturePct: 16.9, notes: "Acceptable but monitor for sprouting" },
    },
    {
      chamber: "WL-MUNS-0005/P-1",
      farmer: 1,
      crop: "Potato",
      quantityKg: 12000,
      startOffset: 10,
      endOffset: 70,
      status: "REJECTED",
      cancelReason: "Chamber committed to a bulk contract for that window",
    },
    {
      chamber: "WL-RANG-0002/A-1",
      farmer: 3,
      crop: "Potato",
      quantityKg: 1500,
      startOffset: 12,
      endOffset: 42,
      status: "CANCELLED",
      cancelReason: "Farmer changed harvest plan",
    },
    {
      chamber: "WL-BOGU-0003/B-1",
      farmer: 0,
      crop: "Cabbage",
      quantityKg: 4000,
      startOffset: 9,
      endOffset: 39,
      status: "EXPIRED",
    },
  ];

  let paymentCount = 0;
  let inspectionCount = 0;
  let reviewCount = 0;
  const touchedWarehouses = new Set<string>();

  for (const seed of bookingSeeds) {
    const chamber = chambers[seed.chamber];
    const crop = crops[seed.crop];
    const farmer = farmers[seed.farmer];

    if (chamber === undefined || crop === undefined || farmer === undefined) {
      throw new Error(
        `Bad booking seed reference: ${seed.chamber} / ${seed.crop} / ${seed.farmer}`,
      );
    }

    const startDate = dayOffset(seed.startOffset);
    const endDate = dayOffset(seed.endOffset);
    const bookedDays = inclusiveDays(startDate, endDate);
    const estimatedCost = round2(seed.quantityKg * chamber.rate * bookedDays);

    const isStored =
      seed.status === "STORED" ||
      seed.status === "WITHDRAW_REQUESTED" ||
      seed.status === "COMPLETED";
    const storedAt = isStored ? startDate : null;
    const withdrawnAt = seed.status === "COMPLETED" ? endDate : null;

    const finalCost =
      seed.status === "COMPLETED"
        ? round2(seed.quantityKg * chamber.rate * Math.max(bookedDays, chamber.minBookingDays))
        : null;

    const booking = await prisma.booking.create({
      data: {
        lotCode: nextLotCode(),
        farmerId: farmer.id,
        chamberId: chamber.id,
        cropTypeId: crop.id,
        quantityKg: seed.quantityKg,
        startDate,
        endDate,
        ratePerKgPerDay: chamber.rate,
        estimatedCost,
        finalCost,
        status:
          seed.status === "PAID" && seed.inspection?.grade === "REJECTED"
            ? "CANCELLED"
            : seed.status,
        holdExpiresAt: seed.status === "APPROVED" ? new Date(Date.now() + 30 * 60 * 1000) : null,
        storedAt,
        withdrawnAt,
        cancelReason: seed.cancelReason ?? null,
      },
      select: { id: true, chamber: { select: { warehouseId: true } } },
    });

    touchedWarehouses.add(booking.chamber.warehouseId);

    if (seed.payment !== undefined) {
      const amountBdt = finalCost ?? estimatedCost;
      const amountUsd = round2(amountBdt * env.DEMO_FX_RATE);

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          farmerId: farmer.id,
          amount: amountUsd,
          currency: "usd",
          amountBdt,
          fxRate: env.DEMO_FX_RATE,
          status: seed.payment,
          paidAt: seed.payment === "PENDING" ? null : dayOffset(seed.startOffset - 1),
          refundedAt: seed.payment === "REFUNDED" ? dayOffset(seed.startOffset) : null,
          stripeSessionId: `cs_test_seed_${booking.id.slice(0, 12)}`,
          stripePaymentIntentId:
            seed.payment === "PENDING" ? null : `pi_test_seed_${booking.id.slice(0, 12)}`,
        },
      });

      paymentCount += 1;
    }

    if (seed.inspection !== undefined) {
      await prisma.inspection.create({
        data: {
          bookingId: booking.id,
          inspectorId: admin.id,
          grade: seed.inspection.grade,
          actualQtyKg: Math.round(seed.quantityKg * 0.98),
          moisturePct: seed.inspection.moisturePct ?? null,
          notes: seed.inspection.notes ?? null,
          inspectedAt: dayOffset(seed.startOffset),
        },
      });

      inspectionCount += 1;
    }

    if (seed.review !== undefined) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          farmerId: farmer.id,
          warehouseId: booking.chamber.warehouseId,
          rating: seed.review.rating,
          comment: seed.review.comment,
          createdAt: dayOffset(seed.endOffset + 1),
        },
      });

      reviewCount += 1;
    }
  }

  console.log("Recomputing warehouse ratings...");

  for (const warehouseId of touchedWarehouses) {
    const stats = await prisma.review.aggregate({
      where: { warehouseId, deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.warehouse.update({
      where: { id: warehouseId },
      data: { avgRating: stats._avg.rating, reviewCount: stats._count },
    });
  }

  console.log("Writing audit trail...");

  const bannedFarmer = farmers[3];
  const pendingWarehouse = warehouseIds[3];
  const suspendedWarehouse = warehouseIds[5];

  if (bannedFarmer !== undefined) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "USER_BANNED",
        entityType: "User",
        entityId: bannedFarmer.id,
        before: { status: "ACTIVE" },
        after: { status: "BANNED", reason: "Repeated no-show on confirmed bookings" },
        ip: "127.0.0.1",
      },
    });
  }

  for (const [index, warehouseId] of warehouseIds.entries()) {
    const seed = warehouseSeeds[index];

    if (seed === undefined || seed.status === "PENDING") {
      continue;
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "WAREHOUSE_STATUS_CHANGED",
        entityType: "Warehouse",
        entityId: warehouseId,
        before: { status: "PENDING" },
        after: {
          status: seed.status,
          reason:
            seed.status === "SUSPENDED"
              ? "Cold-chain certificate expired, pending renewal"
              : "Trade licence and cold-chain certificate verified",
        },
        ip: "127.0.0.1",
      },
    });
  }

  if (pendingWarehouse !== undefined && suspendedWarehouse !== undefined) {
    console.log(`Left ${warehouseSeeds[3]?.name} PENDING for the admin-approval demo`);
  }

  const counts = {
    users: await prisma.user.count(),
    farmerProfiles: await prisma.farmerProfile.count(),
    ownerProfiles: await prisma.ownerProfile.count(),
    cropTypes: await prisma.cropType.count(),
    warehouses: await prisma.warehouse.count(),
    chambers: await prisma.chamber.count(),
    bookings: await prisma.booking.count(),
    payments: paymentCount,
    inspections: inspectionCount,
    reviews: reviewCount,
    auditLogs: await prisma.auditLog.count(),
  };

  const statuses = await prisma.booking.groupBy({ by: ["status"], _count: true });

  console.log("\n=============================================================");
  console.log("  SEED COMPLETE");
  console.log("=============================================================\n");

  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(16)} ${value}`);
  }

  console.log("\n  Booking statuses:");
  for (const row of statuses.sort((a, b) => a.status.localeCompare(b.status))) {
    console.log(`    ${row.status.padEnd(20)} ${row._count}`);
  }

  console.log("\n-------------------------------------------------------------");
  console.log("  DEMO CREDENTIALS  (all pre-verified, login works instantly)");
  console.log("-------------------------------------------------------------");
  console.log("  ADMIN            admin@gmail.com        12345678");
  console.log("  FARMER           farmer1@gmail.com      f12345678");
  console.log("  FARMER           farmer2@gmail.com      f12345678");
  console.log("  FARMER           farmer3@gmail.com      f12345678");
  console.log("  FARMER (BANNED)  farmer4@gmail.com      f12345678   -> 403 on login");
  console.log("  WAREHOUSE OWNER  warehouse1@gmail.com   w12345678");
  console.log("  WAREHOUSE OWNER  warehouse2@gmail.com   w12345678");
  console.log("  WAREHOUSE OWNER  warehouse3@gmail.com   w12345678");
  console.log("-------------------------------------------------------------\n");
};

try {
  await main();
} finally {
  await prisma.$disconnect();
}
