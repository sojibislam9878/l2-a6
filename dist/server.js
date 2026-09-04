
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name4 in all)
    __defProp(target, name4, { get: all[name4], enumerable: true });
};

// src/app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

// src/config/env.ts
import path from "path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });
var required = (hint) => z.string({ error: hint }).trim().min(1, { error: hint });
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5e3),
  APP_URL: z.url({ error: "APP_URL must be a full URL, e.g. http://localhost:5000" }),
  FRONTEND_URL: z.url({ error: "FRONTEND_URL must be a full URL" }),
  DATABASE_URL: required(
    "DATABASE_URL is empty \u2014 paste the DIRECT string (db.prisma.io) from console.prisma.io"
  ),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  JWT_ACCESS_SECRET: z.string().min(32, { error: "JWT_ACCESS_SECRET must be at least 32 characters" }),
  JWT_REFRESH_SECRET: z.string().min(32, { error: "JWT_REFRESH_SECRET must be at least 32 characters" }),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: required(
    "GOOGLE_CLIENT_ID is empty \u2014 GCP Console \u2192 APIs & Services \u2192 Credentials"
  ),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET is empty \u2014 same GCP OAuth client"),
  GOOGLE_REDIRECT_URI: z.url({
    error: "GOOGLE_REDIRECT_URI must be a full URL and must match the GCP client exactly"
  }),
  STRIPE_SECRET_KEY: required(
    "STRIPE_SECRET_KEY is empty \u2014 Stripe Dashboard \u2192 Developers \u2192 API keys (use the sk_test_ key)"
  ),
  STRIPE_WEBHOOK_SECRET: z.string().trim().default(""),
  DEMO_FX_RATE: z.coerce.number().positive().default(85e-4),
  REDIS_URL: required(
    "REDIS_URL is empty \u2014 console.upstash.com \u2192 Connect \u2192 ioredis (rediss://\u2026)"
  ),
  RESEND_API_KEY: required(
    "RESEND_API_KEY is empty \u2014 resend.com \u2192 API Keys \u2192 Create (starts re_). OTP emails cannot be sent without it."
  ),
  EMAIL_FROM: z.string().trim().min(1).default("AgroStore <onboarding@resend.dev>"),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5)
}).superRefine((val, ctx) => {
  if (val.DATABASE_URL.includes("pooled.db.prisma.io")) {
    ctx.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "DATABASE_URL is the POOLED string, and this project has no DIRECT_URL \u2014 prisma migrate will hang on the advisory lock. Use the direct string (db.prisma.io) from console.prisma.io"
    });
  }
  if (val.JWT_ACCESS_SECRET === val.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: "custom",
      path: ["JWT_REFRESH_SECRET"],
      message: "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET"
    });
  }
  if (val.NODE_ENV !== "production" && val.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
    ctx.addIssue({
      code: "custom",
      path: ["STRIPE_SECRET_KEY"],
      message: `Live Stripe key used with NODE_ENV=${val.NODE_ENV} \u2014 use the sk_test_ key locally`
    });
  }
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  \u2717 ${issue.path.join(".") || "(root)"} \u2014 ${issue.message}`).join("\n");
  console.error(
    [
      "",
      "\u2500".repeat(72),
      " Invalid environment configuration \u2014 the server will not start.",
      "\u2500".repeat(72),
      problems,
      "",
      " Fix these in .env, then run again.",
      "\u2500".repeat(72),
      ""
    ].join("\n")
  );
  throw new Error(`Invalid environment configuration (${parsed.error.issues.length} problem(s))`);
}
var env = Object.freeze(parsed.data);
var isStripeWebhookConfigured = env.STRIPE_WEBHOOK_SECRET.length > 0;
var isProduction = env.NODE_ENV === "production";
var isDevelopment = env.NODE_ENV === "development";
var isTest = env.NODE_ENV === "test";

// src/middlewares/globalErrorHandler.ts
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

// generated/prisma/client.ts
import "process";
import * as path2 from "path";
import { fileURLToPath } from "url";
import "@prisma/client/runtime/client";

// generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.10.0",
  "engineVersion": "0edf323efd1d98336f3f0a68684b56f689b900d3",
  "activeProvider": "postgresql",
  "inlineSchema": 'model AuditLog {\n  id         String   @id @default(uuid())\n  actorId    String?  @map("actor_id")\n  action     String\n  entityType String   @map("entity_type")\n  entityId   String   @map("entity_id")\n  before     Json?\n  after      Json?\n  ip         String?\n  createdAt  DateTime @default(now()) @map("created_at")\n\n  actor User? @relation(fields: [actorId], references: [id], onDelete: SetNull)\n\n  @@index([entityType, entityId])\n  @@index([actorId, createdAt])\n  @@map("audit_logs")\n}\n\nmodel Booking {\n  id              String        @id @default(uuid())\n  lotCode         String        @unique @map("lot_code")\n  farmerId        String        @map("farmer_id")\n  chamberId       String        @map("chamber_id")\n  cropTypeId      String        @map("crop_type_id")\n  quantityKg      Int           @map("quantity_kg")\n  startDate       DateTime      @map("start_date") @db.Date\n  endDate         DateTime      @map("end_date") @db.Date\n  ratePerKgPerDay Decimal       @map("rate_per_kg_per_day") @db.Decimal(10, 4)\n  estimatedCost   Decimal       @map("estimated_cost") @db.Decimal(12, 2)\n  finalCost       Decimal?      @map("final_cost") @db.Decimal(12, 2)\n  status          BookingStatus @default(PENDING_APPROVAL)\n  holdExpiresAt   DateTime?     @map("hold_expires_at")\n  storedAt        DateTime?     @map("stored_at")\n  withdrawnAt     DateTime?     @map("withdrawn_at")\n  cancelReason    String?       @map("cancel_reason")\n  deletedAt       DateTime?     @map("deleted_at")\n  createdAt       DateTime      @default(now()) @map("created_at")\n  updatedAt       DateTime      @updatedAt @map("updated_at")\n\n  farmer     User        @relation("FarmerBookings", fields: [farmerId], references: [id], onDelete: Cascade)\n  chamber    Chamber     @relation(fields: [chamberId], references: [id], onDelete: Cascade)\n  cropType   CropType    @relation(fields: [cropTypeId], references: [id])\n  payment    Payment?\n  inspection Inspection?\n  review     Review?\n\n  @@index([chamberId, status, startDate, endDate])\n  @@index([farmerId, status])\n  @@index([status, holdExpiresAt])\n  @@map("bookings")\n}\n\nmodel Chamber {\n  id          String    @id @default(uuid())\n  warehouseId String    @map("warehouse_id")\n  name        String\n  capacityKg  Int       @map("capacity_kg")\n  minTempC    Decimal   @map("min_temp_c") @db.Decimal(4, 1)\n  maxTempC    Decimal   @map("max_temp_c") @db.Decimal(4, 1)\n  isActive    Boolean   @default(true) @map("is_active")\n  deletedAt   DateTime? @map("deleted_at")\n  createdAt   DateTime  @default(now()) @map("created_at")\n  updatedAt   DateTime  @updatedAt @map("updated_at")\n\n  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)\n  bookings  Booking[]\n\n  @@unique([warehouseId, name])\n  @@index([warehouseId, isActive])\n  @@map("chambers")\n}\n\nmodel CropType {\n  id             String    @id @default(uuid())\n  name           String    @unique\n  idealMinTempC  Decimal   @map("ideal_min_temp_c") @db.Decimal(4, 1)\n  idealMaxTempC  Decimal   @map("ideal_max_temp_c") @db.Decimal(4, 1)\n  maxStorageDays Int       @map("max_storage_days")\n  deletedAt      DateTime? @map("deleted_at")\n  createdAt      DateTime  @default(now()) @map("created_at")\n  updatedAt      DateTime  @updatedAt @map("updated_at")\n\n  bookings Booking[]\n\n  @@map("crop_types")\n}\n\nenum Role {\n  FARMER\n  WAREHOUSE_OWNER\n  ADMIN\n}\n\nenum AccountStatus {\n  ACTIVE\n  BANNED\n}\n\nenum WarehouseStatus {\n  PENDING\n  APPROVED\n  REJECTED\n  SUSPENDED\n}\n\nenum BookingStatus {\n  PENDING_APPROVAL\n  APPROVED\n  REJECTED\n  CANCELLED\n  PAID\n  STORED\n  WITHDRAW_REQUESTED\n  COMPLETED\n  EXPIRED\n}\n\nenum PaymentStatus {\n  PENDING\n  SUCCEEDED\n  FAILED\n  REFUNDED\n}\n\nenum QualityGrade {\n  A\n  B\n  C\n  REJECTED\n}\n\nmodel FarmerProfile {\n  id           String   @id @default(uuid())\n  userId       String   @unique @map("user_id")\n  district     String\n  upazila      String?\n  nid          String?  @unique\n  farmSizeAcre Decimal? @map("farm_size_acre") @db.Decimal(8, 2)\n  createdAt    DateTime @default(now()) @map("created_at")\n  updatedAt    DateTime @updatedAt @map("updated_at")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("farmer_profiles")\n}\n\nmodel Inspection {\n  id          String       @id @default(uuid())\n  bookingId   String       @unique @map("booking_id")\n  inspectorId String       @map("inspector_id")\n  grade       QualityGrade\n  moisturePct Decimal?     @map("moisture_pct") @db.Decimal(5, 2)\n  actualQtyKg Int          @map("actual_qty_kg")\n  notes       String?\n  inspectedAt DateTime     @default(now()) @map("inspected_at")\n\n  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n  inspector User    @relation("InspectorInspections", fields: [inspectorId], references: [id])\n\n  @@index([grade])\n  @@map("inspections")\n}\n\nmodel OwnerProfile {\n  id             String   @id @default(uuid())\n  userId         String   @unique @map("user_id")\n  businessName   String   @map("business_name")\n  tradeLicenseNo String   @unique @map("trade_license_no")\n  nid            String   @unique\n  district       String\n  address        String\n  createdAt      DateTime @default(now()) @map("created_at")\n  updatedAt      DateTime @updatedAt @map("updated_at")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([district])\n  @@map("owner_profiles")\n}\n\nmodel Payment {\n  id                    String        @id @default(uuid())\n  bookingId             String        @unique @map("booking_id")\n  farmerId              String        @map("farmer_id")\n  amount                Decimal       @db.Decimal(12, 2)\n  currency              String        @default("usd")\n  amountBdt             Decimal       @map("amount_bdt") @db.Decimal(12, 2)\n  fxRate                Decimal       @map("fx_rate") @db.Decimal(12, 6)\n  provider              String        @default("stripe")\n  stripeSessionId       String?       @unique @map("stripe_session_id")\n  stripePaymentIntentId String?       @unique @map("stripe_payment_intent_id")\n  status                PaymentStatus @default(PENDING)\n  paidAt                DateTime?     @map("paid_at")\n  refundedAt            DateTime?     @map("refunded_at")\n  createdAt             DateTime      @default(now()) @map("created_at")\n  updatedAt             DateTime      @updatedAt @map("updated_at")\n\n  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n\n  @@index([farmerId, status])\n  @@map("payments")\n}\n\nmodel Review {\n  id          String    @id @default(uuid())\n  bookingId   String    @unique @map("booking_id")\n  farmerId    String    @map("farmer_id")\n  warehouseId String    @map("warehouse_id")\n  rating      Int\n  comment     String?\n  deletedAt   DateTime? @map("deleted_at")\n  createdAt   DateTime  @default(now()) @map("created_at")\n  updatedAt   DateTime  @updatedAt @map("updated_at")\n\n  booking   Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n  farmer    User      @relation(fields: [farmerId], references: [id], onDelete: Cascade)\n  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)\n\n  @@index([warehouseId, deletedAt])\n  @@map("reviews")\n}\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel User {\n  id              String        @id @default(uuid())\n  name            String\n  email           String        @unique\n  password        String?\n  googleId        String?       @unique @map("google_id")\n  phone           String?\n  role            Role          @default(FARMER)\n  status          AccountStatus @default(ACTIVE)\n  emailVerifiedAt DateTime?     @map("email_verified_at")\n  deletedAt       DateTime?     @map("deleted_at")\n  createdAt       DateTime      @default(now()) @map("created_at")\n  updatedAt       DateTime      @updatedAt @map("updated_at")\n\n  farmerProfile FarmerProfile?\n  ownerProfile  OwnerProfile?\n  warehouses    Warehouse[]\n  bookings      Booking[]      @relation("FarmerBookings")\n  inspections   Inspection[]   @relation("InspectorInspections")\n  reviews       Review[]\n  auditLogs     AuditLog[]\n\n  @@index([role, status])\n  @@index([deletedAt])\n  @@map("users")\n}\n\nmodel Warehouse {\n  id              String          @id @default(uuid())\n  ownerId         String          @map("owner_id")\n  name            String\n  district        String\n  address         String\n  licenseNo       String          @unique @map("license_no")\n  ratePerKgPerDay Decimal         @map("rate_per_kg_per_day") @db.Decimal(10, 4)\n  minBookingDays  Int             @default(7) @map("min_booking_days")\n  status          WarehouseStatus @default(PENDING)\n  avgRating       Decimal?        @map("avg_rating") @db.Decimal(3, 2)\n  reviewCount     Int             @default(0) @map("review_count")\n  deletedAt       DateTime?       @map("deleted_at")\n  createdAt       DateTime        @default(now()) @map("created_at")\n  updatedAt       DateTime        @updatedAt @map("updated_at")\n\n  owner    User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)\n  chambers Chamber[]\n  reviews  Review[]\n\n  @@index([district, status, deletedAt])\n  @@index([ownerId])\n  @@map("warehouses")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"AuditLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"actorId","kind":"scalar","type":"String","dbName":"actor_id"},{"name":"action","kind":"scalar","type":"String"},{"name":"entityType","kind":"scalar","type":"String","dbName":"entity_type"},{"name":"entityId","kind":"scalar","type":"String","dbName":"entity_id"},{"name":"before","kind":"scalar","type":"Json"},{"name":"after","kind":"scalar","type":"Json"},{"name":"ip","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"actor","kind":"object","type":"User","relationName":"AuditLogToUser"}],"dbName":"audit_logs","schema":null},"Booking":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"lotCode","kind":"scalar","type":"String","dbName":"lot_code"},{"name":"farmerId","kind":"scalar","type":"String","dbName":"farmer_id"},{"name":"chamberId","kind":"scalar","type":"String","dbName":"chamber_id"},{"name":"cropTypeId","kind":"scalar","type":"String","dbName":"crop_type_id"},{"name":"quantityKg","kind":"scalar","type":"Int","dbName":"quantity_kg"},{"name":"startDate","kind":"scalar","type":"DateTime","dbName":"start_date"},{"name":"endDate","kind":"scalar","type":"DateTime","dbName":"end_date"},{"name":"ratePerKgPerDay","kind":"scalar","type":"Decimal","dbName":"rate_per_kg_per_day"},{"name":"estimatedCost","kind":"scalar","type":"Decimal","dbName":"estimated_cost"},{"name":"finalCost","kind":"scalar","type":"Decimal","dbName":"final_cost"},{"name":"status","kind":"enum","type":"BookingStatus"},{"name":"holdExpiresAt","kind":"scalar","type":"DateTime","dbName":"hold_expires_at"},{"name":"storedAt","kind":"scalar","type":"DateTime","dbName":"stored_at"},{"name":"withdrawnAt","kind":"scalar","type":"DateTime","dbName":"withdrawn_at"},{"name":"cancelReason","kind":"scalar","type":"String","dbName":"cancel_reason"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"farmer","kind":"object","type":"User","relationName":"FarmerBookings"},{"name":"chamber","kind":"object","type":"Chamber","relationName":"BookingToChamber"},{"name":"cropType","kind":"object","type":"CropType","relationName":"BookingToCropType"},{"name":"payment","kind":"object","type":"Payment","relationName":"BookingToPayment"},{"name":"inspection","kind":"object","type":"Inspection","relationName":"BookingToInspection"},{"name":"review","kind":"object","type":"Review","relationName":"BookingToReview"}],"dbName":"bookings","schema":null},"Chamber":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"warehouseId","kind":"scalar","type":"String","dbName":"warehouse_id"},{"name":"name","kind":"scalar","type":"String"},{"name":"capacityKg","kind":"scalar","type":"Int","dbName":"capacity_kg"},{"name":"minTempC","kind":"scalar","type":"Decimal","dbName":"min_temp_c"},{"name":"maxTempC","kind":"scalar","type":"Decimal","dbName":"max_temp_c"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"warehouse","kind":"object","type":"Warehouse","relationName":"ChamberToWarehouse"},{"name":"bookings","kind":"object","type":"Booking","relationName":"BookingToChamber"}],"dbName":"chambers","schema":null},"CropType":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"idealMinTempC","kind":"scalar","type":"Decimal","dbName":"ideal_min_temp_c"},{"name":"idealMaxTempC","kind":"scalar","type":"Decimal","dbName":"ideal_max_temp_c"},{"name":"maxStorageDays","kind":"scalar","type":"Int","dbName":"max_storage_days"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"bookings","kind":"object","type":"Booking","relationName":"BookingToCropType"}],"dbName":"crop_types","schema":null},"FarmerProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"district","kind":"scalar","type":"String"},{"name":"upazila","kind":"scalar","type":"String"},{"name":"nid","kind":"scalar","type":"String"},{"name":"farmSizeAcre","kind":"scalar","type":"Decimal","dbName":"farm_size_acre"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"user","kind":"object","type":"User","relationName":"FarmerProfileToUser"}],"dbName":"farmer_profiles","schema":null},"Inspection":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String","dbName":"booking_id"},{"name":"inspectorId","kind":"scalar","type":"String","dbName":"inspector_id"},{"name":"grade","kind":"enum","type":"QualityGrade"},{"name":"moisturePct","kind":"scalar","type":"Decimal","dbName":"moisture_pct"},{"name":"actualQtyKg","kind":"scalar","type":"Int","dbName":"actual_qty_kg"},{"name":"notes","kind":"scalar","type":"String"},{"name":"inspectedAt","kind":"scalar","type":"DateTime","dbName":"inspected_at"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToInspection"},{"name":"inspector","kind":"object","type":"User","relationName":"InspectorInspections"}],"dbName":"inspections","schema":null},"OwnerProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"businessName","kind":"scalar","type":"String","dbName":"business_name"},{"name":"tradeLicenseNo","kind":"scalar","type":"String","dbName":"trade_license_no"},{"name":"nid","kind":"scalar","type":"String"},{"name":"district","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"user","kind":"object","type":"User","relationName":"OwnerProfileToUser"}],"dbName":"owner_profiles","schema":null},"Payment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String","dbName":"booking_id"},{"name":"farmerId","kind":"scalar","type":"String","dbName":"farmer_id"},{"name":"amount","kind":"scalar","type":"Decimal"},{"name":"currency","kind":"scalar","type":"String"},{"name":"amountBdt","kind":"scalar","type":"Decimal","dbName":"amount_bdt"},{"name":"fxRate","kind":"scalar","type":"Decimal","dbName":"fx_rate"},{"name":"provider","kind":"scalar","type":"String"},{"name":"stripeSessionId","kind":"scalar","type":"String","dbName":"stripe_session_id"},{"name":"stripePaymentIntentId","kind":"scalar","type":"String","dbName":"stripe_payment_intent_id"},{"name":"status","kind":"enum","type":"PaymentStatus"},{"name":"paidAt","kind":"scalar","type":"DateTime","dbName":"paid_at"},{"name":"refundedAt","kind":"scalar","type":"DateTime","dbName":"refunded_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToPayment"}],"dbName":"payments","schema":null},"Review":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String","dbName":"booking_id"},{"name":"farmerId","kind":"scalar","type":"String","dbName":"farmer_id"},{"name":"warehouseId","kind":"scalar","type":"String","dbName":"warehouse_id"},{"name":"rating","kind":"scalar","type":"Int"},{"name":"comment","kind":"scalar","type":"String"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToReview"},{"name":"farmer","kind":"object","type":"User","relationName":"ReviewToUser"},{"name":"warehouse","kind":"object","type":"Warehouse","relationName":"ReviewToWarehouse"}],"dbName":"reviews","schema":null},"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"googleId","kind":"scalar","type":"String","dbName":"google_id"},{"name":"phone","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"Role"},{"name":"status","kind":"enum","type":"AccountStatus"},{"name":"emailVerifiedAt","kind":"scalar","type":"DateTime","dbName":"email_verified_at"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"farmerProfile","kind":"object","type":"FarmerProfile","relationName":"FarmerProfileToUser"},{"name":"ownerProfile","kind":"object","type":"OwnerProfile","relationName":"OwnerProfileToUser"},{"name":"warehouses","kind":"object","type":"Warehouse","relationName":"UserToWarehouse"},{"name":"bookings","kind":"object","type":"Booking","relationName":"FarmerBookings"},{"name":"inspections","kind":"object","type":"Inspection","relationName":"InspectorInspections"},{"name":"reviews","kind":"object","type":"Review","relationName":"ReviewToUser"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToUser"}],"dbName":"users","schema":null},"Warehouse":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"ownerId","kind":"scalar","type":"String","dbName":"owner_id"},{"name":"name","kind":"scalar","type":"String"},{"name":"district","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"licenseNo","kind":"scalar","type":"String","dbName":"license_no"},{"name":"ratePerKgPerDay","kind":"scalar","type":"Decimal","dbName":"rate_per_kg_per_day"},{"name":"minBookingDays","kind":"scalar","type":"Int","dbName":"min_booking_days"},{"name":"status","kind":"enum","type":"WarehouseStatus"},{"name":"avgRating","kind":"scalar","type":"Decimal","dbName":"avg_rating"},{"name":"reviewCount","kind":"scalar","type":"Int","dbName":"review_count"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"owner","kind":"object","type":"User","relationName":"UserToWarehouse"},{"name":"chambers","kind":"object","type":"Chamber","relationName":"ChamberToWarehouse"},{"name":"reviews","kind":"object","type":"Review","relationName":"ReviewToWarehouse"}],"dbName":"warehouses","schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","user","farmerProfile","ownerProfile","orderBy","cursor","owner","warehouse","farmer","chamber","bookings","_count","cropType","booking","payment","inspector","inspection","review","chambers","reviews","warehouses","inspections","auditLogs","actor","AuditLog.findUnique","AuditLog.findUniqueOrThrow","AuditLog.findFirst","AuditLog.findFirstOrThrow","AuditLog.findMany","data","AuditLog.createOne","AuditLog.createMany","AuditLog.createManyAndReturn","AuditLog.updateOne","AuditLog.updateMany","AuditLog.updateManyAndReturn","create","update","AuditLog.upsertOne","AuditLog.deleteOne","AuditLog.deleteMany","having","_min","_max","AuditLog.groupBy","AuditLog.aggregate","Booking.findUnique","Booking.findUniqueOrThrow","Booking.findFirst","Booking.findFirstOrThrow","Booking.findMany","Booking.createOne","Booking.createMany","Booking.createManyAndReturn","Booking.updateOne","Booking.updateMany","Booking.updateManyAndReturn","Booking.upsertOne","Booking.deleteOne","Booking.deleteMany","_avg","_sum","Booking.groupBy","Booking.aggregate","Chamber.findUnique","Chamber.findUniqueOrThrow","Chamber.findFirst","Chamber.findFirstOrThrow","Chamber.findMany","Chamber.createOne","Chamber.createMany","Chamber.createManyAndReturn","Chamber.updateOne","Chamber.updateMany","Chamber.updateManyAndReturn","Chamber.upsertOne","Chamber.deleteOne","Chamber.deleteMany","Chamber.groupBy","Chamber.aggregate","CropType.findUnique","CropType.findUniqueOrThrow","CropType.findFirst","CropType.findFirstOrThrow","CropType.findMany","CropType.createOne","CropType.createMany","CropType.createManyAndReturn","CropType.updateOne","CropType.updateMany","CropType.updateManyAndReturn","CropType.upsertOne","CropType.deleteOne","CropType.deleteMany","CropType.groupBy","CropType.aggregate","FarmerProfile.findUnique","FarmerProfile.findUniqueOrThrow","FarmerProfile.findFirst","FarmerProfile.findFirstOrThrow","FarmerProfile.findMany","FarmerProfile.createOne","FarmerProfile.createMany","FarmerProfile.createManyAndReturn","FarmerProfile.updateOne","FarmerProfile.updateMany","FarmerProfile.updateManyAndReturn","FarmerProfile.upsertOne","FarmerProfile.deleteOne","FarmerProfile.deleteMany","FarmerProfile.groupBy","FarmerProfile.aggregate","Inspection.findUnique","Inspection.findUniqueOrThrow","Inspection.findFirst","Inspection.findFirstOrThrow","Inspection.findMany","Inspection.createOne","Inspection.createMany","Inspection.createManyAndReturn","Inspection.updateOne","Inspection.updateMany","Inspection.updateManyAndReturn","Inspection.upsertOne","Inspection.deleteOne","Inspection.deleteMany","Inspection.groupBy","Inspection.aggregate","OwnerProfile.findUnique","OwnerProfile.findUniqueOrThrow","OwnerProfile.findFirst","OwnerProfile.findFirstOrThrow","OwnerProfile.findMany","OwnerProfile.createOne","OwnerProfile.createMany","OwnerProfile.createManyAndReturn","OwnerProfile.updateOne","OwnerProfile.updateMany","OwnerProfile.updateManyAndReturn","OwnerProfile.upsertOne","OwnerProfile.deleteOne","OwnerProfile.deleteMany","OwnerProfile.groupBy","OwnerProfile.aggregate","Payment.findUnique","Payment.findUniqueOrThrow","Payment.findFirst","Payment.findFirstOrThrow","Payment.findMany","Payment.createOne","Payment.createMany","Payment.createManyAndReturn","Payment.updateOne","Payment.updateMany","Payment.updateManyAndReturn","Payment.upsertOne","Payment.deleteOne","Payment.deleteMany","Payment.groupBy","Payment.aggregate","Review.findUnique","Review.findUniqueOrThrow","Review.findFirst","Review.findFirstOrThrow","Review.findMany","Review.createOne","Review.createMany","Review.createManyAndReturn","Review.updateOne","Review.updateMany","Review.updateManyAndReturn","Review.upsertOne","Review.deleteOne","Review.deleteMany","Review.groupBy","Review.aggregate","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","User.upsertOne","User.deleteOne","User.deleteMany","User.groupBy","User.aggregate","Warehouse.findUnique","Warehouse.findUniqueOrThrow","Warehouse.findFirst","Warehouse.findFirstOrThrow","Warehouse.findMany","Warehouse.createOne","Warehouse.createMany","Warehouse.createManyAndReturn","Warehouse.updateOne","Warehouse.updateMany","Warehouse.updateManyAndReturn","Warehouse.upsertOne","Warehouse.deleteOne","Warehouse.deleteMany","Warehouse.groupBy","Warehouse.aggregate","AND","OR","NOT","id","ownerId","name","district","address","licenseNo","ratePerKgPerDay","minBookingDays","WarehouseStatus","status","avgRating","reviewCount","deletedAt","createdAt","updatedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","email","password","googleId","phone","Role","role","AccountStatus","emailVerifiedAt","every","some","none","bookingId","farmerId","warehouseId","rating","comment","amount","currency","amountBdt","fxRate","provider","stripeSessionId","stripePaymentIntentId","PaymentStatus","paidAt","refundedAt","userId","businessName","tradeLicenseNo","nid","inspectorId","QualityGrade","grade","moisturePct","actualQtyKg","notes","inspectedAt","upazila","farmSizeAcre","idealMinTempC","idealMaxTempC","maxStorageDays","capacityKg","minTempC","maxTempC","isActive","lotCode","chamberId","cropTypeId","quantityKg","startDate","endDate","estimatedCost","finalCost","BookingStatus","holdExpiresAt","storedAt","withdrawnAt","cancelReason","actorId","action","entityType","entityId","before","after","ip","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","warehouseId_name","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
  graph: "5QVtsAENFwAAgQMAINABAAD_AgAw0QEAACgAENIBAAD_AgAw0wEBAAAAAeABQADWAgAhqAIBANICACGpAgEA0QIAIaoCAQDRAgAhqwIBANECACGsAgAAgAMAIK0CAACAAwAgrgIBANICACEBAAAAAQAgFgIAANcCACADAADYAgAgCgAA2gIAIBMAANwCACAUAADZAgAgFQAA2wIAIBYAAN0CACDQAQAA0AIAMNEBAAADABDSAQAA0AIAMNMBAQDRAgAh1QEBANECACHcAQAA1AL0ASLfAUAA1QIAIeABQADWAgAh4QFAANYCACHtAQEA0QIAIe4BAQDSAgAh7wEBANICACHwAQEA0gIAIfIBAADTAvIBIvQBQADVAgAhAQAAAAMAIAwBAADpAgAg0AEAAO8CADDRAQAABQAQ0gEAAO8CADDTAQEA0QIAIdYBAQDRAgAh4AFAANYCACHhAUAA1gIAIYcCAQDRAgAhigIBANICACGSAgEA0gIAIZMCEADwAgAhAQAAAAUAIA0BAADpAgAg0AEAAOgCADDRAQAABwAQ0gEAAOgCADDTAQEA0QIAIdYBAQDRAgAh1wEBANECACHgAUAA1gIAIeEBQADWAgAhhwIBANECACGIAgEA0QIAIYkCAQDRAgAhigIBANECACEBAAAABwAgFAYAAOkCACASAACSAwAgEwAA3AIAINABAACQAwAw0QEAAAkAENIBAACQAwAw0wEBANECACHUAQEA0QIAIdUBAQDRAgAh1gEBANECACHXAQEA0QIAIdgBAQDRAgAh2QEQAOQCACHaAQIA8wIAIdwBAACRA9wBIt0BEADwAgAh3gECAPMCACHfAUAA1QIAIeABQADWAgAh4QFAANYCACEFBgAA4gQAIBIAAJYFACATAADOBAAg3QEAAJMDACDfAQAAkwMAIBQGAADpAgAgEgAAkgMAIBMAANwCACDQAQAAkAMAMNEBAAAJABDSAQAAkAMAMNMBAQAAAAHUAQEA0QIAIdUBAQDRAgAh1gEBANECACHXAQEA0QIAIdgBAQAAAAHZARAA5AIAIdoBAgDzAgAh3AEAAJED3AEi3QEQAPACACHeAQIA8wIAId8BQADVAgAh4AFAANYCACHhAUAA1gIAIQMAAAAJACAEAAAKADAFAAALACAPBwAAhQMAIAoAANoCACDQAQAAjgMAMNEBAAANABDSAQAAjgMAMNMBAQDRAgAh1QEBANECACHfAUAA1QIAIeABQADWAgAh4QFAANYCACH6AQEA0QIAIZcCAgDzAgAhmAIQAOQCACGZAhAA5AIAIZoCIACPAwAhAwcAAJAFACAKAADMBAAg3wEAAJMDACAQBwAAhQMAIAoAANoCACDQAQAAjgMAMNEBAAANABDSAQAAjgMAMNMBAQAAAAHVAQEA0QIAId8BQADVAgAh4AFAANYCACHhAUAA1gIAIfoBAQDRAgAhlwICAPMCACGYAhAA5AIAIZkCEADkAgAhmgIgAI8DACG1AgAAjQMAIAMAAAANACAEAAAOADAFAAAPACAcCAAA6QIAIAkAAIgDACAMAACJAwAgDgAAigMAIBAAAIsDACARAACMAwAg0AEAAIYDADDRAQAAEQAQ0gEAAIYDADDTAQEA0QIAIdkBEADkAgAh3AEAAIcDpAIi3wFAANUCACHgAUAA1gIAIeEBQADWAgAh-QEBANECACGbAgEA0QIAIZwCAQDRAgAhnQIBANECACGeAgIA8wIAIZ8CQADWAgAhoAJAANYCACGhAhAA5AIAIaICEADwAgAhpAJAANUCACGlAkAA1QIAIaYCQADVAgAhpwIBANICACEMCAAA4gQAIAkAAJEFACAMAACSBQAgDgAAkwUAIBAAAJQFACARAACVBQAg3wEAAJMDACCiAgAAkwMAIKQCAACTAwAgpQIAAJMDACCmAgAAkwMAIKcCAACTAwAgHAgAAOkCACAJAACIAwAgDAAAiQMAIA4AAIoDACAQAACLAwAgEQAAjAMAINABAACGAwAw0QEAABEAENIBAACGAwAw0wEBAAAAAdkBEADkAgAh3AEAAIcDpAIi3wFAANUCACHgAUAA1gIAIeEBQADWAgAh-QEBANECACGbAgEAAAABnAIBANECACGdAgEA0QIAIZ4CAgDzAgAhnwJAANYCACGgAkAA1gIAIaECEADkAgAhogIQAPACACGkAkAA1QIAIaUCQADVAgAhpgJAANUCACGnAgEA0gIAIQMAAAARACAEAAASADAFAAATACADAAAAEQAgBAAAEgAwBQAAEwAgAQAAABEAIBMNAADmAgAg0AEAAOMCADDRAQAAFwAQ0gEAAOMCADDTAQEA0QIAIdwBAADlAoUCIuABQADWAgAh4QFAANYCACH4AQEA0QIAIfkBAQDRAgAh_QEQAOQCACH-AQEA0QIAIf8BEADkAgAhgAIQAOQCACGBAgEA0QIAIYICAQDSAgAhgwIBANICACGFAkAA1QIAIYYCQADVAgAhAQAAABcAIA0NAADmAgAgDwAA6QIAINABAACCAwAw0QEAABkAENIBAACCAwAw0wEBANECACH4AQEA0QIAIYsCAQDRAgAhjQIAAIMDjQIijgIQAPACACGPAgIA8wIAIZACAQDSAgAhkQJAANYCACEBAAAAGQAgDwcAAIUDACAIAADpAgAgDQAA5gIAINABAACEAwAw0QEAABsAENIBAACEAwAw0wEBANECACHfAUAA1QIAIeABQADWAgAh4QFAANYCACH4AQEA0QIAIfkBAQDRAgAh-gEBANECACH7AQIA8wIAIfwBAQDSAgAhAQAAABsAIAEAAAARACAFBwAAkAUAIAgAAOIEACANAADcBAAg3wEAAJMDACD8AQAAkwMAIA8HAACFAwAgCAAA6QIAIA0AAOYCACDQAQAAhAMAMNEBAAAbABDSAQAAhAMAMNMBAQAAAAHfAUAA1QIAIeABQADWAgAh4QFAANYCACH4AQEAAAAB-QEBANECACH6AQEA0QIAIfsBAgDzAgAh_AEBANICACEDAAAAGwAgBAAAHgAwBQAAHwAgAQAAAA0AIAEAAAAbACADAAAAEQAgBAAAEgAwBQAAEwAgBA0AANwEACAPAADiBAAgjgIAAJMDACCQAgAAkwMAIA0NAADmAgAgDwAA6QIAINABAACCAwAw0QEAABkAENIBAACCAwAw0wEBAAAAAfgBAQAAAAGLAgEA0QIAIY0CAACDA40CIo4CEADwAgAhjwICAPMCACGQAgEA0gIAIZECQADWAgAhAwAAABkAIAQAACQAMAUAACUAIAMAAAAbACAEAAAeADAFAAAfACANFwAAgQMAINABAAD_AgAw0QEAACgAENIBAAD_AgAw0wEBANECACHgAUAA1gIAIagCAQDSAgAhqQIBANECACGqAgEA0QIAIasCAQDRAgAhrAIAAIADACCtAgAAgAMAIK4CAQDSAgAhBRcAAOIEACCoAgAAkwMAIKwCAACTAwAgrQIAAJMDACCuAgAAkwMAIAMAAAAoACAEAAApADAFAAABACABAAAACQAgAQAAABEAIAEAAAAZACABAAAAGwAgAQAAACgAIAEAAAABACADAAAAKAAgBAAAKQAwBQAAAQAgAwAAACgAIAQAACkAMAUAAAEAIAMAAAAoACAEAAApADAFAAABACAKFwAAjwUAINMBAQAAAAHgAUAAAAABqAIBAAAAAakCAQAAAAGqAgEAAAABqwIBAAAAAawCgAAAAAGtAoAAAAABrgIBAAAAAQEdAAA0ACAJ0wEBAAAAAeABQAAAAAGoAgEAAAABqQIBAAAAAaoCAQAAAAGrAgEAAAABrAKAAAAAAa0CgAAAAAGuAgEAAAABAR0AADYAMAEdAAA2ADABAAAAAwAgChcAAI4FACDTAQEAmQMAIeABQACfAwAhqAIBAK0DACGpAgEAmQMAIaoCAQCZAwAhqwIBAJkDACGsAoAAAAABrQKAAAAAAa4CAQCtAwAhAgAAAAEAIB0AADoAIAnTAQEAmQMAIeABQACfAwAhqAIBAK0DACGpAgEAmQMAIaoCAQCZAwAhqwIBAJkDACGsAoAAAAABrQKAAAAAAa4CAQCtAwAhAgAAACgAIB0AADwAIAIAAAAoACAdAAA8ACABAAAAAwAgAwAAAAEAICQAADQAICUAADoAIAEAAAABACABAAAAKAAgBwsAAIsFACAqAACNBQAgKwAAjAUAIKgCAACTAwAgrAIAAJMDACCtAgAAkwMAIK4CAACTAwAgDNABAAD8AgAw0QEAAEQAENIBAAD8AgAw0wEBAK8CACHgAUAAtQIAIagCAQDHAgAhqQIBAK8CACGqAgEArwIAIasCAQCvAgAhrAIAAP0CACCtAgAA_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_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-AEBAAAAAfkBAQDRAgAh_QEQAOQCACH-AQEA0QIAIf8BEADkAgAhgAIQAOQCACGBAgEA0QIAIYICAQAAAAGDAgEAAAABhQJAANUCACGGAkAA1QIAIQEAAADSAQAgAQAAANIBACAFDQAA3AQAIIICAACTAwAggwIAAJMDACCFAgAAkwMAIIYCAACTAwAgAwAAABcAIAQAANUBADAFAADSAQAgAwAAABcAIAQAANUBADAFAADSAQAgAwAAABcAIAQAANUBADAFAADSAQAgEA0AANsEACDTAQEAAAAB3AEAAACFAgLgAUAAAAAB4QFAAAAAAfgBAQAAAAH5AQEAAAAB_QEQAAAAAf4BAQAAAAH_ARAAAAABgAIQAAAAAYECAQAAAAGCAgEAAAABgwIBAAAAAYUCQAAAAAGGAkAAAAABAR0AANkBACAP0wEBAAAAAdwBAAAAhQIC4AFAAAAAAeEBQAAAAAH4AQEAAAAB-QEBAAAAAf0BEAAAAAH-AQEAAAAB_wEQAAAAAYACEAAAAAGBAgEAAAABggIBAAAAAYMCAQAAAAGFAkAAAAABhgJAAAAAAQEdAADbAQAwAR0AANsBADAQDQAA2gQAINMBAQCZAwAh3AEAAOYDhQIi4AFAAJ8DACHhAUAAnwMAIfgBAQCZAwAh-QEBAJkDACH9ARAAmgMAIf4BAQCZAwAh_wEQAJoDACGAAhAAmgMAIYECAQCZAwAhggIBAK0DACGDAgEArQMAIYUCQACeAwAhhgJAAJ4DACECAAAA0gEAIB0AAN4BACAP0wEBAJkDACHcAQAA5gOFAiLgAUAAnwMAIeEBQACfAwAh-AEBAJkDACH5AQEAmQMAIf0BEACaAwAh_gEBAJkDACH_ARAAmgMAIYACEACaAwAhgQIBAJkDACGCAgEArQMAIYMCAQCtAwAhhQJAAJ4DACGGAkAAngMAIQIAAAAXACAdAADgAQAgAgAAABcAIB0AAOABACADAAAA0gEAICQAANkBACAlAADeAQAgAQAAANIBACABAAAAFwAgCQsAANUEACAqAADYBAAgKwAA1wQAIDwAANYEACA9AADZBAAgggIAAJMDACCDAgAAkwMAIIUCAACTAwAghgIAAJMDACAS0AEAAN8CADDRAQAA5wEAENIBAADfAgAw0wEBAK8CACHcAQAA4AKFAiLgAUAAtQIAIeEBQAC1AgAh-AEBAK8CACH5AQEArwIAIf0BEACwAgAh_gEBAK8CACH_ARAAsAIAIYACEACwAgAhgQIBAK8CACGCAgEAxwIAIYMCAQDHAgAhhQJAALQCACGGAkAAtAIAIQMAAAAXACAEAADmAQAwKQAA5wEAIAMAAAAXACAEAADVAQAwBQAA0gEAIAEAAAAfACABAAAAHwAgAwAAABsAIAQAAB4AMAUAAB8AIAMAAAAbACAEAAAeADAFAAAfACADAAAAGwAgBAAAHgAwBQAAHwAgDAcAANgDACAIAACzAwAgDQAAsgMAINMBAQAAAAHfAUAAAAAB4AFAAAAAAeEBQAAAAAH4AQEAAAAB-QEBAAAAAfoBAQAAAAH7AQIAAAAB_AEBAAAAAQEdAADvAQAgCdMBAQAAAAHfAUAAAAAB4AFAAAAAAeEBQAAAAAH4AQEAAAAB-QEBAAAAAfoBAQAAAAH7AQIAAAAB_AEBAAAAAQEdAADxAQAwAR0AAPEBADAMBwAA1wMAIAgAALADACANAACvAwAg0wEBAJkDACHfAUAAngMAIeABQACfAwAh4QFAAJ8DACH4AQEAmQMAIfkBAQCZAwAh-gEBAJkDACH7AQIAmwMAIfwBAQCtAwAhAgAAAB8AIB0AAPQBACAJ0wEBAJkDACHfAUAAngMAIeABQACfAwAh4QFAAJ8DACH4AQEAmQMAIfkBAQCZAwAh-gEBAJkDACH7AQIAmwMAIfwBAQCtAwAhAgAAABsAIB0AAPYBACACAAAAGwAgHQAA9gEAIAMAAAAfACAkAADvAQAgJQAA9AEAIAEAAAAfACABAAAAGwAgBwsAANAEACAqAADTBAAgKwAA0gQAIDwAANEEACA9AADUBAAg3wEAAJMDACD8AQAAkwMAIAzQAQAA3gIAMNEBAAD9AQAQ0gEAAN4CADDTAQEArwIAId8BQAC0AgAh4AFAALUCACHhAUAAtQIAIfgBAQCvAgAh-QEBAK8CACH6AQEArwIAIfsBAgCxAgAh_AEBAMcCACEDAAAAGwAgBAAA_AEAMCkAAP0BACADAAAAGwAgBAAAHgAwBQAAHwAgFgIAANcCACADAADYAgAgCgAA2gIAIBMAANwCACAUAADZAgAgFQAA2wIAIBYAAN0CACDQAQAA0AIAMNEBAAADABDSAQAA0AIAMNMBAQAAAAHVAQEA0QIAIdwBAADUAvQBIt8BQADVAgAh4AFAANYCACHhAUAA1gIAIe0BAQAAAAHuAQEA0gIAIe8BAQAAAAHwAQEA0gIAIfIBAADTAvIBIvQBQADVAgAhAQAAAIACACABAAAAgAIAIAwCAADJBAAgAwAAygQAIAoAAMwEACATAADOBAAgFAAAywQAIBUAAM0EACAWAADPBAAg3wEAAJMDACDuAQAAkwMAIO8BAACTAwAg8AEAAJMDACD0AQAAkwMAIAMAAAADACAEAACDAgAwBQAAgAIAIAMAAAADACAEAACDAgAwBQAAgAIAIAMAAAADACAEAACDAgAwBQAAgAIAIBMCAADCBAAgAwAAwwQAIAoAAMUEACATAADHBAAgFAAAxAQAIBUAAMYEACAWAADIBAAg0wEBAAAAAdUBAQAAAAHcAQAAAPQBAt8BQAAAAAHgAUAAAAAB4QFAAAAAAe0BAQAAAAHuAQEAAAAB7wEBAAAAAfABAQAAAAHyAQAAAPIBAvQBQAAAAAEBHQAAhwIAIAzTAQEAAAAB1QEBAAAAAdwBAAAA9AEC3wFAAAAAAeABQAAAAAHhAUAAAAAB7QEBAAAAAe4BAQAAAAHvAQEAAAAB8AEBAAAAAfIBAAAA8gEC9AFAAAAAAQEdAACJAgAwAR0AAIkCADATAgAA9wMAIAMAAPgDACAKAAD6AwAgEwAA_AMAIBQAAPkDACAVAAD7AwAgFgAA_QMAINMBAQCZAwAh1QEBAJkDACHcAQAA9gP0ASLfAUAAngMAIeABQACfAwAh4QFAAJ8DACHtAQEAmQMAIe4BAQCtAwAh7wEBAK0DACHwAQEArQMAIfIBAAD1A_IBIvQBQACeAwAhAgAAAIACACAdAACMAgAgDNMBAQCZAwAh1QEBAJkDACHcAQAA9gP0ASLfAUAAngMAIeABQACfAwAh4QFAAJ8DACHtAQEAmQMAIe4BAQCtAwAh7wEBAK0DACHwAQEArQMAIfIBAAD1A_IBIvQBQACeAwAhAgAAAAMAIB0AAI4CACACAAAAAwAgHQAAjgIAIAMAAACAAgAgJAAAhwIAICUAAIwCACABAAAAgAIAIAEAAAADACAICwAA8gMAICoAAPQDACArAADzAwAg3wEAAJMDACDuAQAAkwMAIO8BAACTAwAg8AEAAJMDACD0AQAAkwMAIA_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_AgAg4gEAAADcAQLjAQAAANwBCOQBAAAA3AEI6QEAAL4C3AEiBOIBAAAA3AEC4wEAAADcAQjkAQAAANwBCOkBAAC_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_UBAAAJACD2AQAACQAg9wEAAAkAIAP1AQAAEQAg9gEAABEAIPcBAAARACAD9QEAABkAIPYBAAAZACD3AQAAGQAgA_UBAAAbACD2AQAAGwAg9wEAABsAIAP1AQAAKAAg9gEAACgAIPcBAAAoACAM0AEAAN4CADDRAQAA_QEAENIBAADeAgAw0wEBAK8CACHfAUAAtAIAIeABQAC1AgAh4QFAALUCACH4AQEArwIAIfkBAQCvAgAh-gEBAK8CACH7AQIAsQIAIfwBAQDHAgAhEtABAADfAgAw0QEAAOcBABDSAQAA3wIAMNMBAQCvAgAh3AEAAOAChQIi4AFAALUCACHhAUAAtQIAIfgBAQCvAgAh-QEBAK8CACH9ARAAsAIAIf4BAQCvAgAh_wEQALACACGAAhAAsAIAIYECAQCvAgAhggIBAMcCACGDAgEAxwIAIYUCQAC0AgAhhgJAALQCACEHCwAAtwIAICoAAOICACArAADiAgAg4gEAAACFAgLjAQAAAIUCCOQBAAAAhQII6QEAAOEChQIiBwsAALcCACAqAADiAgAgKwAA4gIAIOIBAAAAhQIC4wEAAACFAgjkAQAAAIUCCOkBAADhAoUCIgTiAQAAAIUCAuMBAAAAhQII5AEAAACFAgjpAQAA4gKFAiITDQAA5gIAINABAADjAgAw0QEAABcAENIBAADjAgAw0wEBANECACHcAQAA5QKFAiLgAUAA1gIAIeEBQADWAgAh-AEBANECACH5AQEA0QIAIf0BEADkAgAh_gEBANECACH_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_QIAIK4CAQDHAgAhDwsAALoCACAqAAD-AgAgKwAA_gIAIOIBgAAAAAHlAYAAAAAB5gGAAAAAAecBgAAAAAHoAYAAAAAB6QGAAAAAAa8CAQAAAAGwAgEAAAABsQIBAAAAAbICgAAAAAGzAoAAAAABtAKAAAAAAQziAYAAAAAB5QGAAAAAAeYBgAAAAAHnAYAAAAAB6AGAAAAAAekBgAAAAAGvAgEAAAABsAIBAAAAAbECAQAAAAGyAoAAAAABswKAAAAAAbQCgAAAAAENFwAAgQMAINABAAD_AgAw0QEAACgAENIBAAD_AgAw0wEBANECACHgAUAA1gIAIagCAQDSAgAhqQIBANECACGqAgEA0QIAIasCAQDRAgAhrAIAAIADACCtAgAAgAMAIK4CAQDSAgAhDOIBgAAAAAHlAYAAAAAB5gGAAAAAAecBgAAAAAHoAYAAAAAB6QGAAAAAAa8CAQAAAAGwAgEAAAABsQIBAAAAAbICgAAAAAGzAoAAAAABtAKAAAAAARgCAADXAgAgAwAA2AIAIAoAANoCACATAADcAgAgFAAA2QIAIBUAANsCACAWAADdAgAg0AEAANACADDRAQAAAwAQ0gEAANACADDTAQEA0QIAIdUBAQDRAgAh3AEAANQC9AEi3wFAANUCACHgAUAA1gIAIeEBQADWAgAh7QEBANECACHuAQEA0gIAIe8BAQDSAgAh8AEBANICACHyAQAA0wLyASL0AUAA1QIAIbYCAAADACC3AgAAAwAgDQ0AAOYCACAPAADpAgAg0AEAAIIDADDRAQAAGQAQ0gEAAIIDADDTAQEA0QIAIfgBAQDRAgAhiwIBANECACGNAgAAgwONAiKOAhAA8AIAIY8CAgDzAgAhkAIBANICACGRAkAA1gIAIQTiAQAAAI0CAuMBAAAAjQII5AEAAACNAgjpAQAA7QKNAiIPBwAAhQMAIAgAAOkCACANAADmAgAg0AEAAIQDADDRAQAAGwAQ0gEAAIQDADDTAQEA0QIAId8BQADVAgAh4AFAANYCACHhAUAA1gIAIfgBAQDRAgAh-QEBANECACH6AQEA0QIAIfsBAgDzAgAh_AEBANICACEWBgAA6QIAIBIAAJIDACATAADcAgAg0AEAAJADADDRAQAACQAQ0gEAAJADADDTAQEA0QIAIdQBAQDRAgAh1QEBANECACHWAQEA0QIAIdcBAQDRAgAh2AEBANECACHZARAA5AIAIdoBAgDzAgAh3AEAAJED3AEi3QEQAPACACHeAQIA8wIAId8BQADVAgAh4AFAANYCACHhAUAA1gIAIbYCAAAJACC3AgAACQAgHAgAAOkCACAJAACIAwAgDAAAiQMAIA4AAIoDACAQAACLAwAgEQAAjAMAINABAACGAwAw0QEAABEAENIBAACGAwAw0wEBANECACHZARAA5AIAIdwBAACHA6QCIt8BQADVAgAh4AFAANYCACHhAUAA1gIAIfkBAQDRAgAhmwIBANECACGcAgEA0QIAIZ0CAQDRAgAhngICAPMCACGfAkAA1gIAIaACQADWAgAhoQIQAOQCACGiAhAA8AIAIaQCQADVAgAhpQJAANUCACGmAkAA1QIAIacCAQDSAgAhBOIBAAAApAIC4wEAAACkAgjkAQAAAKQCCOkBAAD7AqQCIhEHAACFAwAgCgAA2gIAINABAACOAwAw0QEAAA0AENIBAACOAwAw0wEBANECACHVAQEA0QIAId8BQADVAgAh4AFAANYCACHhAUAA1gIAIfoBAQDRAgAhlwICAPMCACGYAhAA5AIAIZkCEADkAgAhmgIgAI8DACG2AgAADQAgtwIAAA0AIA4KAADaAgAg0AEAAPICADDRAQAAdgAQ0gEAAPICADDTAQEA0QIAIdUBAQDRAgAh3wFAANUCACHgAUAA1gIAIeEBQADWAgAhlAIQAOQCACGVAhAA5AIAIZYCAgDzAgAhtgIAAHYAILcCAAB2ACAVDQAA5gIAINABAADjAgAw0QEAABcAENIBAADjAgAw0wEBANECACHcAQAA5QKFAiLgAUAA1gIAIeEBQADWAgAh-AEBANECACH5AQEA0QIAIf0BEADkAgAh_gEBANECACH_ARAA5AIAIYACEADkAgAhgQIBANECACGCAgEA0gIAIYMCAQDSAgAhhQJAANUCACGGAkAA1QIAIbYCAAAXACC3AgAAFwAgDw0AAOYCACAPAADpAgAg0AEAAIIDADDRAQAAGQAQ0gEAAIIDADDTAQEA0QIAIfgBAQDRAgAhiwIBANECACGNAgAAgwONAiKOAhAA8AIAIY8CAgDzAgAhkAIBANICACGRAkAA1gIAIbYCAAAZACC3AgAAGQAgEQcAAIUDACAIAADpAgAgDQAA5gIAINABAACEAwAw0QEAABsAENIBAACEAwAw0wEBANECACHfAUAA1QIAIeABQADWAgAh4QFAANYCACH4AQEA0QIAIfkBAQDRAgAh-gEBANECACH7AQIA8wIAIfwBAQDSAgAhtgIAABsAILcCAAAbACAC1QEBAAAAAfoBAQAAAAEPBwAAhQMAIAoAANoCACDQAQAAjgMAMNEBAAANABDSAQAAjgMAMNMBAQDRAgAh1QEBANECACHfAUAA1QIAIeABQADWAgAh4QFAANYCACH6AQEA0QIAIZcCAgDzAgAhmAIQAOQCACGZAhAA5AIAIZoCIACPAwAhAuIBIAAAAAHpASAA9wIAIRQGAADpAgAgEgAAkgMAIBMAANwCACDQAQAAkAMAMNEBAAAJABDSAQAAkAMAMNMBAQDRAgAh1AEBANECACHVAQEA0QIAIdYBAQDRAgAh1wEBANECACHYAQEA0QIAIdkBEADkAgAh2gECAPMCACHcAQAAkQPcASLdARAA8AIAId4BAgDzAgAh3wFAANUCACHgAUAA1gIAIeEBQADWAgAhBOIBAAAA3AEC4wEAAADcAQjkAQAAANwBCOkBAAC_AtwBIgP1AQAADQAg9gEAAA0AIPcBAAANACAAAAAAAAABuwIBAAAAAQW7AhAAAAABwQIQAAAAAcICEAAAAAHDAhAAAAABxAIQAAAAAQW7AgIAAAABwQICAAAAAcICAgAAAAHDAgIAAAABxAICAAAAAQG7AgAAANwBAgW7AhAAAAABwQIQAAAAAcICEAAAAAHDAhAAAAABxAIQAAAAAQG7AkAAAAABAbsCQAAAAAEFJAAAwAUAICUAAOQFACC4AgAAwQUAILkCAADjBQAgvgIAAIACACALJAAAtAMAMCUAALkDADC4AgAAtQMAMLkCAAC2AwAwugIAALcDACC7AgAAuAMAMLwCAAC4AwAwvQIAALgDADC-AgAAuAMAML8CAAC6AwAwwAIAALsDADALJAAAowMAMCUAAKgDADC4AgAApAMAMLkCAAClAwAwugIAAKYDACC7AgAApwMAMLwCAACnAwAwvQIAAKcDADC-AgAApwMAML8CAACpAwAwwAIAAKoDADAKCAAAswMAIA0AALIDACDTAQEAAAAB3wFAAAAAAeABQAAAAAHhAUAAAAAB-AEBAAAAAfkBAQAAAAH7AQIAAAAB_AEBAAAAAQIAAAAfACAkAACxAwAgAwAAAB8AICQAALEDACAlAACuAwAgAR0AAOIFADAPBwAAhQMAIAgAAOkCACANAADmAgAg0AEAAIQDADDRAQAAGwAQ0gEAAIQDADDTAQEAAAAB3wFAANUCACHgAUAA1gIAIeEBQADWAgAh-AEBAAAAAfkBAQDRAgAh-gEBANECACH7AQIA8wIAIfwBAQDSAgAhAgAAAB8AIB0AAK4DACACAAAAqwMAIB0AAKwDACAM0AEAAKoDADDRAQAAqwMAENIBAACqAwAw0wEBANECACHfAUAA1QIAIeABQADWAgAh4QFAANYCACH4AQEA0QIAIfkBAQDRAgAh-gEBANECACH7AQIA8wIAIfwBAQDSAgAhDNABAACqAwAw0QEAAKsDABDSAQAAqgMAMNMBAQDRAgAh3wFAANUCACHgAUAA1gIAIeEBQADWAgAh-AEBANECACH5AQEA0QIAIfoBAQDRAgAh-wECAPMCACH8AQEA0gIAIQjTAQEAmQMAId8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIfgBAQCZAwAh-QEBAJkDACH7AQIAmwMAIfwBAQCtAwAhAbsCAQAAAAEKCAAAsAMAIA0AAK8DACDTAQEAmQMAId8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIfgBAQCZAwAh-QEBAJkDACH7AQIAmwMAIfwBAQCtAwAhBSQAANoFACAlAADgBQAguAIAANsFACC5AgAA3wUAIL4CAAATACAFJAAA2AUAICUAAN0FACC4AgAA2QUAILkCAADcBQAgvgIAAIACACAKCAAAswMAIA0AALIDACDTAQEAAAAB3wFAAAAAAeABQAAAAAHhAUAAAAAB-AEBAAAAAfkBAQAAAAH7AQIAAAAB_AEBAAAAAQMkAADaBQAguAIAANsFACC-AgAAEwAgAyQAANgFACC4AgAA2QUAIL4CAACAAgAgCgoAAO4DACDTAQEAAAAB1QEBAAAAAd8BQAAAAAHgAUAAAAAB4QFAAAAAAZcCAgAAAAGYAhAAAAABmQIQAAAAAZoCIAAAAAECAAAADwAgJAAA7QMAIAMAAAAPACAkAADtAwAgJQAAvwMAIAEdAADXBQAwEAcAAIUDACAKAADaAgAg0AEAAI4DADDRAQAADQAQ0gEAAI4DADDTAQEAAAAB1QEBANECACHfAUAA1QIAIeABQADWAgAh4QFAANYCACH6AQEA0QIAIZcCAgDzAgAhmAIQAOQCACGZAhAA5AIAIZoCIACPAwAhtQIAAI0DACACAAAADwAgHQAAvwMAIAIAAAC8AwAgHQAAvQMAIA3QAQAAuwMAMNEBAAC8AwAQ0gEAALsDADDTAQEA0QIAIdUBAQDRAgAh3wFAANUCACHgAUAA1gIAIeEBQADWAgAh-gEBANECACGXAgIA8wIAIZgCEADkAgAhmQIQAOQCACGaAiAAjwMAIQ3QAQAAuwMAMNEBAAC8AwAQ0gEAALsDADDTAQEA0QIAIdUBAQDRAgAh3wFAANUCACHgAUAA1gIAIeEBQADWAgAh-gEBANECACGXAgIA8wIAIZgCEADkAgAhmQIQAOQCACGaAiAAjwMAIQnTAQEAmQMAIdUBAQCZAwAh3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAhlwICAJsDACGYAhAAmgMAIZkCEACaAwAhmgIgAL4DACEBuwIgAAAAAQoKAADAAwAg0wEBAJkDACHVAQEAmQMAId8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIZcCAgCbAwAhmAIQAJoDACGZAhAAmgMAIZoCIAC-AwAhCyQAAMEDADAlAADGAwAwuAIAAMIDADC5AgAAwwMAMLoCAADEAwAguwIAAMUDADC8AgAAxQMAML0CAADFAwAwvgIAAMUDADC_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-QEBAJkDACH6AQEAmQMAIfsBAgCbAwAh_AEBAK0DACEFJAAAywUAICUAAM4FACC4AgAAzAUAILkCAADNBQAgvgIAAAsAIAMkAADLBQAguAIAAMwFACC-AgAACwAgCA8AAOADACDTAQEAAAABiwIBAAAAAY0CAAAAjQICjgIQAAAAAY8CAgAAAAGQAgEAAAABkQJAAAAAAQIAAAAlACAkAADZAwAgAwAAABkAICQAANkDACAlAADdAwAgCgAAABkAIA8AAN8DACAdAADdAwAg0wEBAJkDACGLAgEAmQMAIY0CAADeA40CIo4CEACdAwAhjwICAJsDACGQAgEArQMAIZECQACfAwAhCA8AAN8DACDTAQEAmQMAIYsCAQCZAwAhjQIAAN4DjQIijgIQAJ0DACGPAgIAmwMAIZACAQCtAwAhkQJAAJ8DACEBuwIAAACNAgIFJAAAxgUAICUAAMkFACC4AgAAxwUAILkCAADIBQAgvgIAAIACACADJAAAxgUAILgCAADHBQAgvgIAAIACACAO0wEBAAAAAdwBAAAAhQIC4AFAAAAAAeEBQAAAAAH5AQEAAAAB_QEQAAAAAf4BAQAAAAH_ARAAAAABgAIQAAAAAYECAQAAAAGCAgEAAAABgwIBAAAAAYUCQAAAAAGGAkAAAAABAgAAANIBACAkAADhAwAgAwAAABcAICQAAOEDACAlAADlAwAgEAAAABcAIB0AAOUDACDTAQEAmQMAIdwBAADmA4UCIuABQACfAwAh4QFAAJ8DACH5AQEAmQMAIf0BEACaAwAh_gEBAJkDACH_ARAAmgMAIYACEACaAwAhgQIBAJkDACGCAgEArQMAIYMCAQCtAwAhhQJAAJ4DACGGAkAAngMAIQ7TAQEAmQMAIdwBAADmA4UCIuABQACfAwAh4QFAAJ8DACH5AQEAmQMAIf0BEACaAwAh_gEBAJkDACH_ARAAmgMAIYACEACaAwAhgQIBAJkDACGCAgEArQMAIYMCAQCtAwAhhQJAAJ4DACGGAkAAngMAIQG7AgAAAIUCAhcIAADoAwAgDAAA6QMAIA4AAOoDACAQAADrAwAgEQAA7AMAINMBAQAAAAHZARAAAAAB3AEAAACkAgLfAUAAAAAB4AFAAAAAAeEBQAAAAAH5AQEAAAABmwIBAAAAAZ0CAQAAAAGeAgIAAAABnwJAAAAAAaACQAAAAAGhAhAAAAABogIQAAAAAaQCQAAAAAGlAkAAAAABpgJAAAAAAacCAQAAAAEDJAAAxAUAILgCAADFBQAgvgIAAIACACADJAAAwgUAILgCAADDBQAgvgIAAHMAIAMkAADhAwAguAIAAOIDACC-AgAA0gEAIAMkAADZAwAguAIAANoDACC-AgAAJQAgAyQAANIDACC4AgAA0wMAIL4CAAAfACAKCgAA7gMAINMBAQAAAAHVAQEAAAAB3wFAAAAAAeABQAAAAAHhAUAAAAABlwICAAAAAZgCEAAAAAGZAhAAAAABmgIgAAAAAQQkAADBAwAwuAIAAMIDADC6AgAAxAMAIL4CAADFAwAwAyQAAMAFACC4AgAAwQUAIL4CAACAAgAgBCQAALQDADC4AgAAtQMAMLoCAAC3AwAgvgIAALgDADAEJAAAowMAMLgCAACkAwAwugIAAKYDACC-AgAApwMAMAAAAAG7AgAAAPIBAgG7AgAAAPQBAgckAAC9BAAgJQAAwAQAILgCAAC-BAAguQIAAL8EACC8AgAABQAgvQIAAAUAIL4CAACMAQAgByQAALgEACAlAAC7BAAguAIAALkEACC5AgAAugQAILwCAAAHACC9AgAABwAgvgIAALoBACALJAAArAQAMCUAALEEADC4AgAArQQAMLkCAACuBAAwugIAAK8EACC7AgAAsAQAMLwCAACwBAAwvQIAALAEADC-AgAAsAQAML8CAACyBAAwwAIAALMEADALJAAAoQQAMCUAAKUEADC4AgAAogQAMLkCAACjBAAwugIAAKQEACC7AgAAxQMAMLwCAADFAwAwvQIAAMUDADC-AgAAxQMAML8CAACmBAAwwAIAAMgDADALJAAAkwQAMCUAAJgEADC4AgAAlAQAMLkCAACVBAAwugIAAJYEACC7AgAAlwQAMLwCAACXBAAwvQIAAJcEADC-AgAAlwQAML8CAACZBAAwwAIAAJoEADALJAAAigQAMCUAAI4EADC4AgAAiwQAMLkCAACMBAAwugIAAI0EACC7AgAApwMAMLwCAACnAwAwvQIAAKcDADC-AgAApwMAML8CAACPBAAwwAIAAKoDADALJAAA_gMAMCUAAIMEADC4AgAA_wMAMLkCAACABAAwugIAAIEEACC7AgAAggQAMLwCAACCBAAwvQIAAIIEADC-AgAAggQAML8CAACEBAAwwAIAAIUEADAI0wEBAAAAAeABQAAAAAGpAgEAAAABqgIBAAAAAasCAQAAAAGsAoAAAAABrQKAAAAAAa4CAQAAAAECAAAAAQAgJAAAiQQAIAMAAAABACAkAACJBAAgJQAAiAQAIAEdAAC_BQAwDRcAAIEDACDQAQAA_wIAMNEBAAAoABDSAQAA_wIAMNMBAQAAAAHgAUAA1gIAIagCAQDSAgAhqQIBANECACGqAgEA0QIAIasCAQDRAgAhrAIAAIADACCtAgAAgAMAIK4CAQDSAgAhAgAAAAEAIB0AAIgEACACAAAAhgQAIB0AAIcEACAM0AEAAIUEADDRAQAAhgQAENIBAACFBAAw0wEBANECACHgAUAA1gIAIagCAQDSAgAhqQIBANECACGqAgEA0QIAIasCAQDRAgAhrAIAAIADACCtAgAAgAMAIK4CAQDSAgAhDNABAACFBAAw0QEAAIYEABDSAQAAhQQAMNMBAQDRAgAh4AFAANYCACGoAgEA0gIAIakCAQDRAgAhqgIBANECACGrAgEA0QIAIawCAACAAwAgrQIAAIADACCuAgEA0gIAIQjTAQEAmQMAIeABQACfAwAhqQIBAJkDACGqAgEAmQMAIasCAQCZAwAhrAKAAAAAAa0CgAAAAAGuAgEArQMAIQjTAQEAmQMAIeABQACfAwAhqQIBAJkDACGqAgEAmQMAIasCAQCZAwAhrAKAAAAAAa0CgAAAAAGuAgEArQMAIQjTAQEAAAAB4AFAAAAAAakCAQAAAAGqAgEAAAABqwIBAAAAAawCgAAAAAGtAoAAAAABrgIBAAAAAQoHAADYAwAgDQAAsgMAINMBAQAAAAHfAUAAAAAB4AFAAAAAAeEBQAAAAAH4AQEAAAAB-gEBAAAAAfsBAgAAAAH8AQEAAAABAgAAAB8AICQAAJIEACADAAAAHwAgJAAAkgQAICUAAJEEACABHQAAvgUAMAIAAAAfACAdAACRBAAgAgAAAKsDACAdAACQBAAgCNMBAQCZAwAh3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAh-AEBAJkDACH6AQEAmQMAIfsBAgCbAwAh_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-AgAApwMAMAQkAAD-AwAwuAIAAP8DADC6AgAAgQQAIL4CAACCBAAwBAEAAOIEACCKAgAAkwMAIJICAACTAwAgkwIAAJMDACABAQAA4gQAIAAAAAAAAAAAAAAAAAAAAAUkAACsBQAgJQAArwUAILgCAACtBQAguQIAAK4FACC-AgAAEwAgAyQAAKwFACC4AgAArQUAIL4CAAATACAMCAAA4gQAIAkAAJEFACAMAACSBQAgDgAAkwUAIBAAAJQFACARAACVBQAg3wEAAJMDACCiAgAAkwMAIKQCAACTAwAgpQIAAJMDACCmAgAAkwMAIKcCAACTAwAgAAAABSQAAKcFACAlAACqBQAguAIAAKgFACC5AgAAqQUAIL4CAACAAgAgAyQAAKcFACC4AgAAqAUAIL4CAACAAgAgDAIAAMkEACADAADKBAAgCgAAzAQAIBMAAM4EACAUAADLBAAgFQAAzQQAIBYAAM8EACDfAQAAkwMAIO4BAACTAwAg7wEAAJMDACDwAQAAkwMAIPQBAACTAwAgAAAAAAAAAAAAAAUkAACiBQAgJQAApQUAILgCAACjBQAguQIAAKQFACC-AgAAgAIAIAMkAACiBQAguAIAAKMFACC-AgAAgAIAIAAAAAAACyQAAPUEADAlAAD5BAAwuAIAAPYEADC5AgAA9wQAMLoCAAD4BAAguwIAAMUDADC8AgAAxQMAML0CAADFAwAwvgIAAMUDADC_AgAA-gQAMMACAADIAwAwFwgAAOgDACAJAACrBAAgDgAA6gMAIBAAAOsDACARAADsAwAg0wEBAAAAAdkBEAAAAAHcAQAAAKQCAt8BQAAAAAHgAUAAAAAB4QFAAAAAAfkBAQAAAAGbAgEAAAABnAIBAAAAAZ4CAgAAAAGfAkAAAAABoAJAAAAAAaECEAAAAAGiAhAAAAABpAJAAAAAAaUCQAAAAAGmAkAAAAABpwIBAAAAAQIAAAATACAkAAD9BAAgAwAAABMAICQAAP0EACAlAAD8BAAgAR0AAKEFADACAAAAEwAgHQAA_AQAIAIAAADJAwAgHQAA-wQAIBLTAQEAmQMAIdkBEACaAwAh3AEAAMsDpAIi3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAh-QEBAJkDACGbAgEAmQMAIZwCAQCZAwAhngICAJsDACGfAkAAnwMAIaACQACfAwAhoQIQAJoDACGiAhAAnQMAIaQCQACeAwAhpQJAAJ4DACGmAkAAngMAIacCAQCtAwAhFwgAAM0DACAJAACpBAAgDgAAzwMAIBAAANADACARAADRAwAg0wEBAJkDACHZARAAmgMAIdwBAADLA6QCIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIfkBAQCZAwAhmwIBAJkDACGcAgEAmQMAIZ4CAgCbAwAhnwJAAJ8DACGgAkAAnwMAIaECEACaAwAhogIQAJ0DACGkAkAAngMAIaUCQACeAwAhpgJAAJ4DACGnAgEArQMAIRcIAADoAwAgCQAAqwQAIA4AAOoDACAQAADrAwAgEQAA7AMAINMBAQAAAAHZARAAAAAB3AEAAACkAgLfAUAAAAAB4AFAAAAAAeEBQAAAAAH5AQEAAAABmwIBAAAAAZwCAQAAAAGeAgIAAAABnwJAAAAAAaACQAAAAAGhAhAAAAABogIQAAAAAaQCQAAAAAGlAkAAAAABpgJAAAAAAacCAQAAAAEEJAAA9QQAMLgCAAD2BAAwugIAAPgEACC-AgAAxQMAMAAAAAAABSQAAJwFACAlAACfBQAguAIAAJ0FACC5AgAAngUAIL4CAAALACADJAAAnAUAILgCAACdBQAgvgIAAAsAIAAAAAAAAAAAByQAAJcFACAlAACaBQAguAIAAJgFACC5AgAAmQUAILwCAAADACC9AgAAAwAgvgIAAIACACADJAAAlwUAILgCAACYBQAgvgIAAIACACAFBgAA4gQAIBIAAJYFACATAADOBAAg3QEAAJMDACDfAQAAkwMAIAMHAACQBQAgCgAAzAQAIN8BAACTAwAgAgoAAMwEACDfAQAAkwMAIAUNAADcBAAgggIAAJMDACCDAgAAkwMAIIUCAACTAwAghgIAAJMDACAEDQAA3AQAIA8AAOIEACCOAgAAkwMAIJACAACTAwAgBQcAAJAFACAIAADiBAAgDQAA3AQAIN8BAACTAwAg_AEAAJMDACAAEgIAAMIEACADAADDBAAgCgAAxQQAIBMAAMcEACAUAADEBAAgFQAAxgQAINMBAQAAAAHVAQEAAAAB3AEAAAD0AQLfAUAAAAAB4AFAAAAAAeEBQAAAAAHtAQEAAAAB7gEBAAAAAe8BAQAAAAHwAQEAAAAB8gEAAADyAQL0AUAAAAABAgAAAIACACAkAACXBQAgAwAAAAMAICQAAJcFACAlAACbBQAgFAAAAAMAIAIAAPcDACADAAD4AwAgCgAA-gMAIBMAAPwDACAUAAD5AwAgFQAA-wMAIB0AAJsFACDTAQEAmQMAIdUBAQCZAwAh3AEAAPYD9AEi3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAh7QEBAJkDACHuAQEArQMAIe8BAQCtAwAh8AEBAK0DACHyAQAA9QPyASL0AUAAngMAIRICAAD3AwAgAwAA-AMAIAoAAPoDACATAAD8AwAgFAAA-QMAIBUAAPsDACDTAQEAmQMAIdUBAQCZAwAh3AEAAPYD9AEi3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAh7QEBAJkDACHuAQEArQMAIe8BAQCtAwAh8AEBAK0DACHyAQAA9QPyASL0AUAAngMAIRAGAADvAwAgEwAA8QMAINMBAQAAAAHUAQEAAAAB1QEBAAAAAdYBAQAAAAHXAQEAAAAB2AEBAAAAAdkBEAAAAAHaAQIAAAAB3AEAAADcAQLdARAAAAAB3gECAAAAAd8BQAAAAAHgAUAAAAAB4QFAAAAAAQIAAAALACAkAACcBQAgAwAAAAkAICQAAJwFACAlAACgBQAgEgAAAAkAIAYAAKADACATAACiAwAgHQAAoAUAINMBAQCZAwAh1AEBAJkDACHVAQEAmQMAIdYBAQCZAwAh1wEBAJkDACHYAQEAmQMAIdkBEACaAwAh2gECAJsDACHcAQAAnAPcASLdARAAnQMAId4BAgCbAwAh3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAhEAYAAKADACATAACiAwAg0wEBAJkDACHUAQEAmQMAIdUBAQCZAwAh1gEBAJkDACHXAQEAmQMAIdgBAQCZAwAh2QEQAJoDACHaAQIAmwMAIdwBAACcA9wBIt0BEACdAwAh3gECAJsDACHfAUAAngMAIeABQACfAwAh4QFAAJ8DACES0wEBAAAAAdkBEAAAAAHcAQAAAKQCAt8BQAAAAAHgAUAAAAAB4QFAAAAAAfkBAQAAAAGbAgEAAAABnAIBAAAAAZ4CAgAAAAGfAkAAAAABoAJAAAAAAaECEAAAAAGiAhAAAAABpAJAAAAAAaUCQAAAAAGmAkAAAAABpwIBAAAAARIDAADDBAAgCgAAxQQAIBMAAMcEACAUAADEBAAgFQAAxgQAIBYAAMgEACDTAQEAAAAB1QEBAAAAAdwBAAAA9AEC3wFAAAAAAeABQAAAAAHhAUAAAAAB7QEBAAAAAe4BAQAAAAHvAQEAAAAB8AEBAAAAAfIBAAAA8gEC9AFAAAAAAQIAAACAAgAgJAAAogUAIAMAAAADACAkAACiBQAgJQAApgUAIBQAAAADACADAAD4AwAgCgAA-gMAIBMAAPwDACAUAAD5AwAgFQAA-wMAIBYAAP0DACAdAACmBQAg0wEBAJkDACHVAQEAmQMAIdwBAAD2A_QBIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIe0BAQCZAwAh7gEBAK0DACHvAQEArQMAIfABAQCtAwAh8gEAAPUD8gEi9AFAAJ4DACESAwAA-AMAIAoAAPoDACATAAD8AwAgFAAA-QMAIBUAAPsDACAWAAD9AwAg0wEBAJkDACHVAQEAmQMAIdwBAAD2A_QBIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIe0BAQCZAwAh7gEBAK0DACHvAQEArQMAIfABAQCtAwAh8gEAAPUD8gEi9AFAAJ4DACESAgAAwgQAIAoAAMUEACATAADHBAAgFAAAxAQAIBUAAMYEACAWAADIBAAg0wEBAAAAAdUBAQAAAAHcAQAAAPQBAt8BQAAAAAHgAUAAAAAB4QFAAAAAAe0BAQAAAAHuAQEAAAAB7wEBAAAAAfABAQAAAAHyAQAAAPIBAvQBQAAAAAECAAAAgAIAICQAAKcFACADAAAAAwAgJAAApwUAICUAAKsFACAUAAAAAwAgAgAA9wMAIAoAAPoDACATAAD8AwAgFAAA-QMAIBUAAPsDACAWAAD9AwAgHQAAqwUAINMBAQCZAwAh1QEBAJkDACHcAQAA9gP0ASLfAUAAngMAIeABQACfAwAh4QFAAJ8DACHtAQEAmQMAIe4BAQCtAwAh7wEBAK0DACHwAQEArQMAIfIBAAD1A_IBIvQBQACeAwAhEgIAAPcDACAKAAD6AwAgEwAA_AMAIBQAAPkDACAVAAD7AwAgFgAA_QMAINMBAQCZAwAh1QEBAJkDACHcAQAA9gP0ASLfAUAAngMAIeABQACfAwAh4QFAAJ8DACHtAQEAmQMAIe4BAQCtAwAh7wEBAK0DACHwAQEArQMAIfIBAAD1A_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-AMAIAoAAPoDACATAAD8AwAgFAAA-QMAIBYAAP0DACAdAADKBQAg0wEBAJkDACHVAQEAmQMAIdwBAAD2A_QBIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIe0BAQCZAwAh7gEBAK0DACHvAQEArQMAIfABAQCtAwAh8gEAAPUD8gEi9AFAAJ4DACESAgAA9wMAIAMAAPgDACAKAAD6AwAgEwAA_AMAIBQAAPkDACAWAAD9AwAg0wEBAJkDACHVAQEAmQMAIdwBAAD2A_QBIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIe0BAQCZAwAh7gEBAK0DACHvAQEArQMAIfABAQCtAwAh8gEAAPUD8gEi9AFAAJ4DACEQBgAA7wMAIBIAAPADACDTAQEAAAAB1AEBAAAAAdUBAQAAAAHWAQEAAAAB1wEBAAAAAdgBAQAAAAHZARAAAAAB2gECAAAAAdwBAAAA3AEC3QEQAAAAAd4BAgAAAAHfAUAAAAAB4AFAAAAAAeEBQAAAAAECAAAACwAgJAAAywUAIAMAAAAJACAkAADLBQAgJQAAzwUAIBIAAAAJACAGAACgAwAgEgAAoQMAIB0AAM8FACDTAQEAmQMAIdQBAQCZAwAh1QEBAJkDACHWAQEAmQMAIdcBAQCZAwAh2AEBAJkDACHZARAAmgMAIdoBAgCbAwAh3AEAAJwD3AEi3QEQAJ0DACHeAQIAmwMAId8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIRAGAACgAwAgEgAAoQMAINMBAQCZAwAh1AEBAJkDACHVAQEAmQMAIdYBAQCZAwAh1wEBAJkDACHYAQEAmQMAIdkBEACaAwAh2gECAJsDACHcAQAAnAPcASLdARAAnQMAId4BAgCbAwAh3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAhAwAAAHYAICQAAMIFACAlAADSBQAgCgAAAHYAIB0AANIFACDTAQEAmQMAIdUBAQCZAwAh3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAhlAIQAJoDACGVAhAAmgMAIZYCAgCbAwAhCNMBAQCZAwAh1QEBAJkDACHfAUAAngMAIeABQACfAwAh4QFAAJ8DACGUAhAAmgMAIZUCEACaAwAhlgICAJsDACEDAAAAAwAgJAAAxAUAICUAANUFACAUAAAAAwAgAgAA9wMAIAMAAPgDACATAAD8AwAgFAAA-QMAIBUAAPsDACAWAAD9AwAgHQAA1QUAINMBAQCZAwAh1QEBAJkDACHcAQAA9gP0ASLfAUAAngMAIeABQACfAwAh4QFAAJ8DACHtAQEAmQMAIe4BAQCtAwAh7wEBAK0DACHwAQEArQMAIfIBAAD1A_IBIvQBQACeAwAhEgIAAPcDACADAAD4AwAgEwAA_AMAIBQAAPkDACAVAAD7AwAgFgAA_QMAINMBAQCZAwAh1QEBAJkDACHcAQAA9gP0ASLfAUAAngMAIeABQACfAwAh4QFAAJ8DACHtAQEAmQMAIe4BAQCtAwAh7wEBAK0DACHwAQEArQMAIfIBAAD1A_IBIvQBQACeAwAhEtMBAQAAAAHZARAAAAAB3AEAAACkAgLfAUAAAAAB4AFAAAAAAeEBQAAAAAH5AQEAAAABmwIBAAAAAZ0CAQAAAAGeAgIAAAABnwJAAAAAAaACQAAAAAGhAhAAAAABogIQAAAAAaQCQAAAAAGlAkAAAAABpgJAAAAAAacCAQAAAAEJ0wEBAAAAAdUBAQAAAAHfAUAAAAAB4AFAAAAAAeEBQAAAAAGXAgIAAAABmAIQAAAAAZkCEAAAAAGaAiAAAAABEgIAAMIEACADAADDBAAgCgAAxQQAIBQAAMQEACAVAADGBAAgFgAAyAQAINMBAQAAAAHVAQEAAAAB3AEAAAD0AQLfAUAAAAAB4AFAAAAAAeEBQAAAAAHtAQEAAAAB7gEBAAAAAe8BAQAAAAHwAQEAAAAB8gEAAADyAQL0AUAAAAABAgAAAIACACAkAADYBQAgGAgAAOgDACAJAACrBAAgDAAA6QMAIA4AAOoDACAQAADrAwAg0wEBAAAAAdkBEAAAAAHcAQAAAKQCAt8BQAAAAAHgAUAAAAAB4QFAAAAAAfkBAQAAAAGbAgEAAAABnAIBAAAAAZ0CAQAAAAGeAgIAAAABnwJAAAAAAaACQAAAAAGhAhAAAAABogIQAAAAAaQCQAAAAAGlAkAAAAABpgJAAAAAAacCAQAAAAECAAAAEwAgJAAA2gUAIAMAAAADACAkAADYBQAgJQAA3gUAIBQAAAADACACAAD3AwAgAwAA-AMAIAoAAPoDACAUAAD5AwAgFQAA-wMAIBYAAP0DACAdAADeBQAg0wEBAJkDACHVAQEAmQMAIdwBAAD2A_QBIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIe0BAQCZAwAh7gEBAK0DACHvAQEArQMAIfABAQCtAwAh8gEAAPUD8gEi9AFAAJ4DACESAgAA9wMAIAMAAPgDACAKAAD6AwAgFAAA-QMAIBUAAPsDACAWAAD9AwAg0wEBAJkDACHVAQEAmQMAIdwBAAD2A_QBIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIe0BAQCZAwAh7gEBAK0DACHvAQEArQMAIfABAQCtAwAh8gEAAPUD8gEi9AFAAJ4DACEDAAAAEQAgJAAA2gUAICUAAOEFACAaAAAAEQAgCAAAzQMAIAkAAKkEACAMAADOAwAgDgAAzwMAIBAAANADACAdAADhBQAg0wEBAJkDACHZARAAmgMAIdwBAADLA6QCIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIfkBAQCZAwAhmwIBAJkDACGcAgEAmQMAIZ0CAQCZAwAhngICAJsDACGfAkAAnwMAIaACQACfAwAhoQIQAJoDACGiAhAAnQMAIaQCQACeAwAhpQJAAJ4DACGmAkAAngMAIacCAQCtAwAhGAgAAM0DACAJAACpBAAgDAAAzgMAIA4AAM8DACAQAADQAwAg0wEBAJkDACHZARAAmgMAIdwBAADLA6QCIt8BQACeAwAh4AFAAJ8DACHhAUAAnwMAIfkBAQCZAwAhmwIBAJkDACGcAgEAmQMAIZ0CAQCZAwAhngICAJsDACGfAkAAnwMAIaACQACfAwAhoQIQAJoDACGiAhAAnQMAIaQCQACeAwAhpQJAAJ4DACGmAkAAngMAIacCAQCtAwAhCNMBAQAAAAHfAUAAAAAB4AFAAAAAAeEBQAAAAAH4AQEAAAAB-QEBAAAAAfsBAgAAAAH8AQEAAAABAwAAAAMAICQAAMAFACAlAADlBQAgFAAAAAMAIAIAAPcDACADAAD4AwAgCgAA-gMAIBMAAPwDACAVAAD7AwAgFgAA_QMAIB0AAOUFACDTAQEAmQMAIdUBAQCZAwAh3AEAAPYD9AEi3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAh7QEBAJkDACHuAQEArQMAIe8BAQCtAwAh8AEBAK0DACHyAQAA9QPyASL0AUAAngMAIRICAAD3AwAgAwAA-AMAIAoAAPoDACATAAD8AwAgFQAA-wMAIBYAAP0DACDTAQEAmQMAIdUBAQCZAwAh3AEAAPYD9AEi3wFAAJ4DACHgAUAAnwMAIeEBQACfAwAh7QEBAJkDACHuAQEArQMAIe8BAQCtAwAh8AEBAK0DACHyAQAA9QPyASL0AUAAngMAIQEXBAIIAgYDAwgECiMHCwAPEycMFAwFFSYLFioBAQEAAgEBAAIEBgACCwAOEhAGEyAMAwcABQoUBwsADQYIAAIJAAYMAAgOGAoQGgsRHAwCChUHCwAJAQoWAAENAAcCDQAHDwACAwcABQgAAg0ABwEKHQACEiEAEyIABQosABMuABQrABUtABYvAAABFzkCARc_AgMLABQqABUrABYAAAADCwAUKgAVKwAWAwgAAgkABgwACAMIAAIJAAYMAAgFCwAbKgAeKwAfPAAcPQAdAAAAAAAFCwAbKgAeKwAfPAAcPQAdAQcABQEHAAUFCwAkKgAnKwAoPAAlPQAmAAAAAAAFCwAkKgAnKwAoPAAlPQAmAAAFCwAtKgAwKwAxPAAuPQAvAAAAAAAFCwAtKgAwKwAxPAAuPQAvAQEAAgEBAAIFCwA2KgA5KwA6PAA3PQA4AAAAAAAFCwA2KgA5KwA6PAA3PQA4Ag0ABw8AAgINAAcPAAIFCwA_KgBCKwBDPABAPQBBAAAAAAAFCwA_KgBCKwBDPABAPQBBAQEAAgEBAAIDCwBIKgBJKwBKAAAAAwsASCoASSsASgENAAcBDQAHBQsATyoAUisAUzwAUD0AUQAAAAAABQsATyoAUisAUzwAUD0AUQMHAAUIAAINAAcDBwAFCAACDQAHBQsAWCoAWysAXDwAWT0AWgAAAAAABQsAWCoAWysAXDwAWT0AWgAAAwsAYSoAYisAYwAAAAMLAGEqAGIrAGMBBgACAQYAAgULAGgqAGsrAGw8AGk9AGoAAAAAAAULAGgqAGsrAGw8AGk9AGoYAgEZMAEaMQEbMgEcMwEeNQEfNxAgOBEhOwEiPRAjPhImQAEnQQEoQhAsRRMtRhcuRwcvSAcwSQcxSgcySwczTQc0TxA1UBg2Ugc3VBA4VRk5Vgc6Vwc7WBA-Wxo_XCBAXQZBXgZCXwZDYAZEYQZFYwZGZRBHZiFIaAZJahBKayJLbAZMbQZNbhBOcSNPcilQdAhRdQhSeAhTeQhUeghVfAhWfhBXfypYgQEIWYMBEFqEAStbhQEIXIYBCF2HARBeigEsX4sBMmCNAQNhjgEDYpABA2ORAQNkkgEDZZQBA2aWARBnlwEzaJkBA2mbARBqnAE0a50BA2yeAQNtnwEQbqIBNW-jATtwpAELcaUBC3KmAQtzpwELdKgBC3WqAQt2rAEQd60BPHivAQt5sQEQerIBPXuzAQt8tAELfbUBEH64AT5_uQFEgAG7AQSBAbwBBIIBvgEEgwG_AQSEAcABBIUBwgEEhgHEARCHAcUBRYgBxwEEiQHJARCKAcoBRosBywEEjAHMAQSNAc0BEI4B0AFHjwHRAUuQAdMBCpEB1AEKkgHWAQqTAdcBCpQB2AEKlQHaAQqWAdwBEJcB3QFMmAHfAQqZAeEBEJoB4gFNmwHjAQqcAeQBCp0B5QEQngHoAU6fAekBVKAB6gEMoQHrAQyiAewBDKMB7QEMpAHuAQylAfABDKYB8gEQpwHzAVWoAfUBDKkB9wEQqgH4AVarAfkBDKwB-gEMrQH7ARCuAf4BV68B_wFdsAGBAgKxAYICArIBhAICswGFAgK0AYYCArUBiAICtgGKAhC3AYsCXrgBjQICuQGPAhC6AZACX7sBkQICvAGSAgK9AZMCEL4BlgJgvwGXAmTAAZgCBcEBmQIFwgGaAgXDAZsCBcQBnAIFxQGeAgXGAaACEMcBoQJlyAGjAgXJAaUCEMoBpgJmywGnAgXMAagCBc0BqQIQzgGsAmfPAa0CbQ"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer: Buffer2 } = await import("buffer");
  const wasmArray = Buffer2.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// generated/prisma/internal/prismaNamespace.ts
var prismaNamespace_exports = {};
__export(prismaNamespace_exports, {
  AnyNull: () => AnyNull2,
  AuditLogScalarFieldEnum: () => AuditLogScalarFieldEnum,
  BookingScalarFieldEnum: () => BookingScalarFieldEnum,
  ChamberScalarFieldEnum: () => ChamberScalarFieldEnum,
  CropTypeScalarFieldEnum: () => CropTypeScalarFieldEnum,
  DbNull: () => DbNull2,
  Decimal: () => Decimal2,
  FarmerProfileScalarFieldEnum: () => FarmerProfileScalarFieldEnum,
  InspectionScalarFieldEnum: () => InspectionScalarFieldEnum,
  JsonNull: () => JsonNull2,
  JsonNullValueFilter: () => JsonNullValueFilter,
  ModelName: () => ModelName,
  NullTypes: () => NullTypes2,
  NullableJsonNullValueInput: () => NullableJsonNullValueInput,
  NullsOrder: () => NullsOrder,
  OwnerProfileScalarFieldEnum: () => OwnerProfileScalarFieldEnum,
  PaymentScalarFieldEnum: () => PaymentScalarFieldEnum,
  PrismaClientInitializationError: () => PrismaClientInitializationError2,
  PrismaClientKnownRequestError: () => PrismaClientKnownRequestError2,
  PrismaClientRustPanicError: () => PrismaClientRustPanicError2,
  PrismaClientUnknownRequestError: () => PrismaClientUnknownRequestError2,
  PrismaClientValidationError: () => PrismaClientValidationError2,
  QueryMode: () => QueryMode,
  ReviewScalarFieldEnum: () => ReviewScalarFieldEnum,
  SortOrder: () => SortOrder,
  Sql: () => Sql2,
  TransactionIsolationLevel: () => TransactionIsolationLevel,
  UserScalarFieldEnum: () => UserScalarFieldEnum,
  WarehouseScalarFieldEnum: () => WarehouseScalarFieldEnum,
  defineExtension: () => defineExtension,
  empty: () => empty2,
  getExtensionContext: () => getExtensionContext,
  join: () => join2,
  prismaVersion: () => prismaVersion,
  raw: () => raw2,
  sql: () => sql
});
import * as runtime2 from "@prisma/client/runtime/client";
var PrismaClientKnownRequestError2 = runtime2.PrismaClientKnownRequestError;
var PrismaClientUnknownRequestError2 = runtime2.PrismaClientUnknownRequestError;
var PrismaClientRustPanicError2 = runtime2.PrismaClientRustPanicError;
var PrismaClientInitializationError2 = runtime2.PrismaClientInitializationError;
var PrismaClientValidationError2 = runtime2.PrismaClientValidationError;
var sql = runtime2.sqltag;
var empty2 = runtime2.empty;
var join2 = runtime2.join;
var raw2 = runtime2.raw;
var Sql2 = runtime2.Sql;
var Decimal2 = runtime2.Decimal;
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var prismaVersion = {
  client: "7.10.0",
  engine: "0edf323efd1d98336f3f0a68684b56f689b900d3"
};
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var DbNull2 = runtime2.DbNull;
var JsonNull2 = runtime2.JsonNull;
var AnyNull2 = runtime2.AnyNull;
var ModelName = {
  AuditLog: "AuditLog",
  Booking: "Booking",
  Chamber: "Chamber",
  CropType: "CropType",
  FarmerProfile: "FarmerProfile",
  Inspection: "Inspection",
  OwnerProfile: "OwnerProfile",
  Payment: "Payment",
  Review: "Review",
  User: "User",
  Warehouse: "Warehouse"
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var AuditLogScalarFieldEnum = {
  id: "id",
  actorId: "actorId",
  action: "action",
  entityType: "entityType",
  entityId: "entityId",
  before: "before",
  after: "after",
  ip: "ip",
  createdAt: "createdAt"
};
var BookingScalarFieldEnum = {
  id: "id",
  lotCode: "lotCode",
  farmerId: "farmerId",
  chamberId: "chamberId",
  cropTypeId: "cropTypeId",
  quantityKg: "quantityKg",
  startDate: "startDate",
  endDate: "endDate",
  ratePerKgPerDay: "ratePerKgPerDay",
  estimatedCost: "estimatedCost",
  finalCost: "finalCost",
  status: "status",
  holdExpiresAt: "holdExpiresAt",
  storedAt: "storedAt",
  withdrawnAt: "withdrawnAt",
  cancelReason: "cancelReason",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var ChamberScalarFieldEnum = {
  id: "id",
  warehouseId: "warehouseId",
  name: "name",
  capacityKg: "capacityKg",
  minTempC: "minTempC",
  maxTempC: "maxTempC",
  isActive: "isActive",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var CropTypeScalarFieldEnum = {
  id: "id",
  name: "name",
  idealMinTempC: "idealMinTempC",
  idealMaxTempC: "idealMaxTempC",
  maxStorageDays: "maxStorageDays",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var FarmerProfileScalarFieldEnum = {
  id: "id",
  userId: "userId",
  district: "district",
  upazila: "upazila",
  nid: "nid",
  farmSizeAcre: "farmSizeAcre",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var InspectionScalarFieldEnum = {
  id: "id",
  bookingId: "bookingId",
  inspectorId: "inspectorId",
  grade: "grade",
  moisturePct: "moisturePct",
  actualQtyKg: "actualQtyKg",
  notes: "notes",
  inspectedAt: "inspectedAt"
};
var OwnerProfileScalarFieldEnum = {
  id: "id",
  userId: "userId",
  businessName: "businessName",
  tradeLicenseNo: "tradeLicenseNo",
  nid: "nid",
  district: "district",
  address: "address",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var PaymentScalarFieldEnum = {
  id: "id",
  bookingId: "bookingId",
  farmerId: "farmerId",
  amount: "amount",
  currency: "currency",
  amountBdt: "amountBdt",
  fxRate: "fxRate",
  provider: "provider",
  stripeSessionId: "stripeSessionId",
  stripePaymentIntentId: "stripePaymentIntentId",
  status: "status",
  paidAt: "paidAt",
  refundedAt: "refundedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var ReviewScalarFieldEnum = {
  id: "id",
  bookingId: "bookingId",
  farmerId: "farmerId",
  warehouseId: "warehouseId",
  rating: "rating",
  comment: "comment",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var UserScalarFieldEnum = {
  id: "id",
  name: "name",
  email: "email",
  password: "password",
  googleId: "googleId",
  phone: "phone",
  role: "role",
  status: "status",
  emailVerifiedAt: "emailVerifiedAt",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var WarehouseScalarFieldEnum = {
  id: "id",
  ownerId: "ownerId",
  name: "name",
  district: "district",
  address: "address",
  licenseNo: "licenseNo",
  ratePerKgPerDay: "ratePerKgPerDay",
  minBookingDays: "minBookingDays",
  status: "status",
  avgRating: "avgRating",
  reviewCount: "reviewCount",
  deletedAt: "deletedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var SortOrder = {
  asc: "asc",
  desc: "desc"
};
var NullableJsonNullValueInput = {
  DbNull: DbNull2,
  JsonNull: JsonNull2
};
var QueryMode = {
  default: "default",
  insensitive: "insensitive"
};
var JsonNullValueFilter = {
  DbNull: DbNull2,
  JsonNull: JsonNull2,
  AnyNull: AnyNull2
};
var NullsOrder = {
  first: "first",
  last: "last"
};
var defineExtension = runtime2.Extensions.defineExtension;

// generated/prisma/client.ts
globalThis["__dirname"] = path2.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// src/utils/AppError.ts
var AppError = class _AppError extends Error {
  statusCode;
  constructor(statusCode, message) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, _AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
};

// src/middlewares/globalErrorHandler.ts
var REQUEST_PARTS = /* @__PURE__ */ new Set(["body", "params", "query"]);
var toFieldPath = (segments) => {
  const parts = segments.map(String);
  const first = parts[0];
  return (first !== void 0 && REQUEST_PARTS.has(first) ? parts.slice(1) : parts).join(".");
};
var adapterCauseOf = (meta) => {
  const wrapper = meta?.driverAdapterError;
  return wrapper?.cause;
};
var targetOf = (meta) => {
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(", ");
  if (typeof target === "string") return target;
  const cause = adapterCauseOf(meta);
  if (cause?.constraint?.fields !== void 0) {
    return cause.constraint.fields.join(", ");
  }
  const index = cause?.constraint?.index;
  if (typeof index === "string") {
    const withoutTable = cause?.table !== void 0 && index.startsWith(`${cause.table}_`) ? index.slice(cause.table.length + 1) : index;
    return withoutTable.replace(/_key$/, "").split("_").join(" ");
  }
  return "value";
};
var globalErrorHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = "Internal server error";
  let errors = [];
  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = error.issues.map((issue) => ({
      path: toFieldPath(issue.path),
      message: issue.message
    }));
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof prismaNamespace_exports.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      const field = targetOf(error.meta);
      message = `Duplicate value: ${field} already exists`;
      errors = [{ path: field, message: "Must be unique" }];
    } else if (error.code === "P2025") {
      statusCode = 404;
      message = "Resource not found";
    } else if (error.code === "P2003") {
      statusCode = 400;
      message = "Invalid reference: related record does not exist";
    } else {
      statusCode = 400;
      message = `Database request failed (${error.code})`;
    }
  } else if (error instanceof prismaNamespace_exports.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid database query arguments";
  } else if (error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = "Session expired, please log in again";
  } else if (error instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid authentication token";
  } else if (error instanceof Error) {
    message = isProduction ? "Internal server error" : error.message;
  }
  if (statusCode >= 500 && !isProduction) {
    console.error(error);
  }
  const body = {
    success: false,
    message,
    errors
  };
  if (!isProduction && error instanceof Error && error.stack !== void 0) {
    body.stack = error.stack;
  }
  res.status(statusCode).json(body);
};

// src/middlewares/notFound.ts
var notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: []
  });
};

// src/middlewares/rateLimiter.ts
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

// src/lib/redis.ts
import { Redis } from "ioredis";
var redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
  lazyConnect: true
});
var connecting = null;
var connectRedis = async () => {
  if (redis.status === "ready") return;
  if (connecting === null) {
    connecting = redis.connect().catch((error) => {
      connecting = null;
      throw error;
    });
  }
  await connecting;
};
redis.on("error", (error) => {
  console.error("Redis error:", error.message);
});

// src/middlewares/rateLimiter.ts
var MINUTE = 60 * 1e3;
var FIFTEEN_MINUTES = 15 * MINUTE;
var createStore = (prefix) => new RedisStore({
  prefix: `ratelimit:${prefix}:`,
  sendCommand: async (...args) => {
    await connectRedis();
    const [command, ...rest] = args;
    return redis.call(command, ...rest);
  }
});
var perUserKey = (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown");
var buildLimiter = (config2) => rateLimit({
  windowMs: config2.windowMs,
  limit: config2.limit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  passOnStoreError: true,
  store: createStore(config2.prefix),
  ...config2.perUser ? { keyGenerator: perUserKey } : {},
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: `${config2.message} Limit is ${config2.limit} request(s) per ${Math.round(options.windowMs / MINUTE)} minute(s).`,
      errors: []
    });
  }
});
var globalLimiter = buildLimiter({
  prefix: "global",
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  message: "Too many requests from this address.",
  perUser: false
});
var authLimiter = buildLimiter({
  prefix: "auth",
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: "Too many authentication attempts from this address.",
  perUser: false
});
var otpLimiter = buildLimiter({
  prefix: "otp",
  windowMs: FIFTEEN_MINUTES,
  limit: 6,
  message: "Too many verification code requests from this address.",
  perUser: false
});
var bookingLimiter = buildLimiter({
  prefix: "booking",
  windowMs: MINUTE,
  limit: 10,
  message: "Too many booking attempts.",
  perUser: true
});
var paymentLimiter = buildLimiter({
  prefix: "payment",
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: "Too many payment session requests.",
  perUser: true
});

// src/modules/admin/admin.route.ts
import { Router } from "express";

// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
var adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
var prisma = new PrismaClient({ adapter });

// src/utils/catchAsync.ts
var catchAsync = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// src/utils/jwt.ts
import { randomUUID } from "crypto";
import jwt2 from "jsonwebtoken";
var asExpiry = (value) => value;
var createTokenPair = (subject) => {
  const jti = randomUUID();
  return {
    accessToken: jwt2.sign({ ...subject, jti }, env.JWT_ACCESS_SECRET, {
      expiresIn: asExpiry(env.JWT_ACCESS_EXPIRES_IN)
    }),
    refreshToken: jwt2.sign({ ...subject, jti }, env.JWT_REFRESH_SECRET, {
      expiresIn: asExpiry(env.JWT_REFRESH_EXPIRES_IN)
    })
  };
};
var verifyAccessToken = (token) => jwt2.verify(token, env.JWT_ACCESS_SECRET);
var verifyRefreshToken = (token) => jwt2.verify(token, env.JWT_REFRESH_SECRET);
var jwtUtils = {
  createTokenPair,
  verifyAccessToken,
  verifyRefreshToken
};

// src/utils/tokenDenylist.ts
var revokedKey = (jti) => `revoked:jti:${jti}`;
var revokeJti = async (jti, expiresAtEpochSeconds) => {
  const ttlSeconds = expiresAtEpochSeconds - Math.floor(Date.now() / 1e3);
  if (ttlSeconds <= 0) {
    return;
  }
  await connectRedis();
  await redis.set(revokedKey(jti), "1", "EX", ttlSeconds);
};
var isJtiRevoked = async (jti) => {
  try {
    await connectRedis();
    return await redis.exists(revokedKey(jti)) === 1;
  } catch (error) {
    const reason2 = error instanceof Error ? error.message : String(error);
    console.error(`Token denylist unreachable, allowing request: ${reason2}`);
    return false;
  }
};

// src/middlewares/auth.ts
var BEARER_PREFIX = "Bearer ";
var auth = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (header === void 0 || !header.startsWith(BEARER_PREFIX)) {
    throw new AppError(
      401,
      "Authentication required. Send an Authorization: Bearer <token> header."
    );
  }
  const token = header.slice(BEARER_PREFIX.length).trim();
  if (token.length === 0) {
    throw new AppError(401, "Authentication token is missing");
  }
  const decoded = jwtUtils.verifyAccessToken(token);
  if (await isJtiRevoked(decoded.jti)) {
    throw new AppError(401, "This session has been logged out. Please log in again.");
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, role: true, status: true, deletedAt: true }
  });
  if (!user || user.deletedAt !== null) {
    throw new AppError(401, "This account no longer exists");
  }
  if (user.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }
  req.user = { id: user.id, email: user.email, role: user.role };
  next();
});

// src/middlewares/authorize.ts
var authorize = (...allowed) => (req, _res, next) => {
  const current = req.user;
  if (current === void 0) {
    next(new AppError(401, "Authentication required"));
    return;
  }
  if (!allowed.includes(current.role)) {
    next(new AppError(403, `This action is restricted to: ${allowed.join(", ")}`));
    return;
  }
  next();
};

// src/middlewares/cache.ts
var cacheResponse = (ttlSeconds, buildKey) => {
  return (req, res, next) => {
    let key;
    try {
      key = buildKey(req);
    } catch {
      next();
      return;
    }
    void (async () => {
      try {
        await connectRedis();
        const cached = await redis.get(key);
        if (cached !== null) {
          res.setHeader("X-Cache", "HIT");
          res.type("application/json").send(cached);
          return;
        }
        res.setHeader("X-Cache", "MISS");
        const sendJson = res.json.bind(res);
        res.json = ((body) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            void redis.set(key, JSON.stringify(body), "EX", ttlSeconds).catch(() => void 0);
          }
          return sendJson(body);
        });
        next();
      } catch (error) {
        const reason2 = error instanceof Error ? error.message : String(error);
        console.error(`Cache bypassed, Redis unreachable: ${reason2}`);
        res.setHeader("X-Cache", "BYPASS");
        next();
      }
    })();
  };
};
var queryOf = (req) => {
  const url = req.originalUrl;
  const index = url.indexOf("?");
  return index === -1 ? "" : url.slice(index + 1);
};

// src/middlewares/validateRequest.ts
var validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });
  if (!result.success) {
    next(result.error);
    return;
  }
  const parsed2 = result.data;
  if (parsed2.body !== void 0) {
    req.body = parsed2.body;
  }
  res.locals.validated = parsed2;
  next();
};
var validatedQuery = (res) => res.locals.validated?.query ?? {};

// src/utils/cacheKeys.ts
import { createHash } from "crypto";
var fingerprint = (value) => createHash("sha1").update(value).digest("hex").slice(0, 16);
var CACHE_TTL = {
  cropTypes: 24 * 60 * 60,
  warehouseList: 60,
  warehouseDetail: 5 * 60,
  warehouseReviews: 5 * 60,
  adminStats: 5 * 60
};
var cacheKeys = {
  cropTypes: (query) => `cache:croptypes:${fingerprint(query)}`,
  warehouseList: (query) => `cache:warehouse:list:${fingerprint(query)}`,
  warehouseDetail: (id) => `cache:warehouse:detail:${id}`,
  warehouseReviews: (id, query) => `cache:warehouse:reviews:${id}:${fingerprint(query)}`,
  adminStats: () => "cache:admin:stats"
};
var deleteByPattern = async (pattern) => {
  let cursor = "0";
  let removed = 0;
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
    cursor = next;
    if (keys.length > 0) {
      removed += await redis.del(...keys);
    }
  } while (cursor !== "0");
  return removed;
};
var safeInvalidate = async (patterns) => {
  try {
    await connectRedis();
    for (const pattern of patterns) {
      await deleteByPattern(pattern);
    }
  } catch (error) {
    const reason2 = error instanceof Error ? error.message : String(error);
    console.error(`Cache invalidation skipped, Redis unreachable: ${reason2}`);
  }
};
var invalidateCropTypeCache = () => safeInvalidate(["cache:croptypes:*", "cache:warehouse:list:*"]);
var invalidateWarehouseCache = (warehouseId) => safeInvalidate([
  "cache:warehouse:list:*",
  warehouseId === void 0 ? "cache:warehouse:detail:*" : `cache:warehouse:detail:${warehouseId}`,
  "cache:admin:stats"
]);
var invalidateReviewCache = (warehouseId) => safeInvalidate([
  `cache:warehouse:reviews:${warehouseId}:*`,
  `cache:warehouse:detail:${warehouseId}`,
  "cache:warehouse:list:*"
]);

// src/utils/sendResponse.ts
var sendResponse = (res, payload) => {
  const body = {
    success: true,
    message: payload.message
  };
  if (payload.data !== void 0) {
    body.data = payload.data;
  }
  if (payload.meta !== void 0) {
    body.meta = payload.meta;
  }
  res.status(payload.statusCode).json(body);
};

// src/modules/booking/booking.service.ts
import { randomBytes } from "crypto";

// src/utils/auditLogger.ts
var writeAuditLog = async (client, entry) => {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ...entry.before === void 0 ? {} : { before: entry.before },
      ...entry.after === void 0 ? {} : { after: entry.after },
      ...entry.ip === void 0 ? {} : { ip: entry.ip }
    }
  });
};

// src/utils/capacity.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
var peakLoadKg = (bookings, from, to) => {
  const events = [];
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
var dailyLoad = (capacityKg2, bookings, from, to) => {
  const days = [];
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
      freeKg: Math.max(0, capacityKg2 - usedKg)
    });
  }
  return days;
};

// src/utils/paginate.ts
var buildPagination = (input, allowedSortFields, defaultSortBy) => {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  const sortBy = input.sortBy !== void 0 && allowedSortFields.includes(input.sortBy) ? input.sortBy : defaultSortBy;
  const sortOrder = input.sortOrder ?? "desc";
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
    orderBy: { [sortBy]: sortOrder }
  };
};
var buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit)
});

// src/utils/pricing.ts
var DAY_MS2 = 24 * 60 * 60 * 1e3;
var OVERSTAY_SURCHARGE_MULTIPLIER = 0.5;
var round2 = (value) => Math.round(value * 100) / 100;
var inclusiveDays = (start, end) => Math.floor((end.getTime() - start.getTime()) / DAY_MS2) + 1;
var estimateCost = (quantityKg, ratePerKgPerDay2, days) => round2(quantityKg * ratePerKgPerDay2 * days);
var settleBooking = (input) => {
  const billableDays = Math.max(input.actualDays, input.minBookingDays);
  const baseCost = round2(input.quantityKg * input.ratePerKgPerDay * billableDays);
  const overstayDays = Math.max(0, input.actualDays - input.bookedDays);
  const surcharge = round2(
    input.quantityKg * input.ratePerKgPerDay * overstayDays * OVERSTAY_SURCHARGE_MULTIPLIER
  );
  const finalCost = round2(baseCost + surcharge);
  return {
    billableDays,
    baseCost,
    overstayDays,
    surcharge,
    finalCost,
    balance: round2(finalCost - input.alreadyPaidBdt)
  };
};

// src/utils/stateMachine.ts
var ALLOWED_TRANSITIONS = {
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PAID", "EXPIRED", "CANCELLED"],
  PAID: ["STORED", "CANCELLED"],
  STORED: ["WITHDRAW_REQUESTED"],
  WITHDRAW_REQUESTED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: []
};
var canTransition = (from, to) => ALLOWED_TRANSITIONS[from].includes(to);
var assertTransition = (from, to) => {
  if (canTransition(from, to)) {
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  const detail = allowed.length === 0 ? `${from} is a final state` : `from ${from} you can only move to ${allowed.join(", ")}`;
  throw new AppError(409, `Cannot move this booking from ${from} to ${to} - ${detail}`);
};
var ACTIVE_BOOKING_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PAID",
  "STORED",
  "WITHDRAW_REQUESTED"
];

// src/modules/booking/booking.validation.ts
import { z as z2 } from "zod";
var BOOKING_SORT_FIELDS = ["createdAt", "startDate", "endDate", "quantityKg"];
var BOOKING_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "PAID",
  "STORED",
  "WITHDRAW_REQUESTED",
  "COMPLETED",
  "EXPIRED"
];
var isoDate = z2.string({ error: "date is required" }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: "date must be in YYYY-MM-DD format" }).transform((value) => /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`)).refine((date) => !Number.isNaN(date.getTime()), { error: "date is not a real calendar date" });
var reason = z2.string().trim().min(3, { error: "reason must be at least 3 characters" }).max(255, { error: "reason must be at most 255 characters" });
var createBookingSchema = z2.object({
  body: z2.object({
    chamberId: z2.uuid({ error: "chamberId must be a valid uuid" }),
    cropTypeId: z2.uuid({ error: "cropTypeId must be a valid uuid" }),
    quantityKg: z2.coerce.number({ error: "quantityKg must be a number" }).int({ error: "quantityKg must be a whole number" }).positive({ error: "quantityKg must be greater than zero" }).max(1e7, { error: "quantityKg is unrealistically large" }),
    startDate: isoDate,
    endDate: isoDate
  }).strict().refine((body) => body.endDate.getTime() >= body.startDate.getTime(), {
    error: "endDate must be on or after startDate",
    path: ["endDate"]
  })
});
var listBookingsSchema = z2.object({
  query: z2.object({
    status: z2.enum(BOOKING_STATUSES).optional(),
    sortBy: z2.enum(BOOKING_SORT_FIELDS).optional(),
    sortOrder: z2.enum(["asc", "desc"]).optional(),
    page: z2.coerce.number().int().positive().optional(),
    limit: z2.coerce.number().int().positive().max(100).optional()
  }).strict()
});
var warehouseBookingsSchema = z2.object({
  params: z2.object({ id: z2.uuid({ error: "id must be a valid uuid" }) }),
  query: z2.object({
    status: z2.enum(BOOKING_STATUSES).optional(),
    sortBy: z2.enum(BOOKING_SORT_FIELDS).optional(),
    sortOrder: z2.enum(["asc", "desc"]).optional(),
    page: z2.coerce.number().int().positive().optional(),
    limit: z2.coerce.number().int().positive().max(100).optional()
  }).strict()
});
var bookingIdSchema = z2.object({
  params: z2.object({ id: z2.uuid({ error: "id must be a valid uuid" }) })
});
var bookingReasonSchema = z2.object({
  params: z2.object({ id: z2.uuid({ error: "id must be a valid uuid" }) }),
  body: z2.object({ reason: reason.optional() }).strict()
});

// src/modules/booking/booking.service.ts
var HOLD_MINUTES = 30;
var MAX_ADVANCE_DAYS = 90;
var bookingSelect = {
  id: true,
  lotCode: true,
  status: true,
  quantityKg: true,
  startDate: true,
  endDate: true,
  ratePerKgPerDay: true,
  estimatedCost: true,
  finalCost: true,
  holdExpiresAt: true,
  storedAt: true,
  withdrawnAt: true,
  cancelReason: true,
  createdAt: true,
  cropType: { select: { id: true, name: true } },
  farmer: { select: { id: true, name: true, phone: true } },
  chamber: {
    select: {
      id: true,
      name: true,
      minTempC: true,
      maxTempC: true,
      warehouse: { select: { id: true, name: true, district: true, ownerId: true } }
    }
  }
};
var toBooking = (row) => ({
  id: row.id,
  lotCode: row.lotCode,
  status: row.status,
  quantityKg: row.quantityKg,
  startDate: row.startDate,
  endDate: row.endDate,
  bookedDays: inclusiveDays(row.startDate, row.endDate),
  ratePerKgPerDay: Number(row.ratePerKgPerDay),
  estimatedCost: Number(row.estimatedCost),
  finalCost: row.finalCost === null ? null : Number(row.finalCost),
  holdExpiresAt: row.holdExpiresAt,
  storedAt: row.storedAt,
  withdrawnAt: row.withdrawnAt,
  cancelReason: row.cancelReason,
  createdAt: row.createdAt,
  cropType: row.cropType,
  chamber: {
    id: row.chamber.id,
    name: row.chamber.name,
    minTempC: Number(row.chamber.minTempC),
    maxTempC: Number(row.chamber.maxTempC)
  },
  warehouse: {
    id: row.chamber.warehouse.id,
    name: row.chamber.warehouse.name,
    district: row.chamber.warehouse.district
  },
  farmer: row.farmer
});
var generateLotCode = () => `AS-${(/* @__PURE__ */ new Date()).getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
var startOfToday = () => {
  const now = /* @__PURE__ */ new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
var expireStaleHolds = async (tx, chamberId) => {
  await tx.booking.updateMany({
    where: {
      chamberId,
      deletedAt: null,
      status: "APPROVED",
      holdExpiresAt: { lt: /* @__PURE__ */ new Date() }
    },
    data: { status: "EXPIRED" }
  });
};
var createBookingDb = async (farmerId, payload, ip) => {
  const { chamberId, cropTypeId, quantityKg, startDate, endDate } = payload;
  const today = startOfToday();
  const latestStart = new Date(today.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1e3);
  if (startDate < today) {
    throw new AppError(422, "startDate cannot be in the past");
  }
  if (startDate > latestStart) {
    throw new AppError(422, `startDate cannot be more than ${MAX_ADVANCE_DAYS} days ahead`);
  }
  const chamber = await prisma.chamber.findFirst({
    where: { id: chamberId, deletedAt: null },
    select: {
      id: true,
      name: true,
      capacityKg: true,
      minTempC: true,
      maxTempC: true,
      isActive: true,
      warehouse: {
        select: {
          id: true,
          name: true,
          status: true,
          deletedAt: true,
          minBookingDays: true,
          ratePerKgPerDay: true
        }
      }
    }
  });
  if (!chamber || chamber.warehouse.deletedAt !== null) {
    throw new AppError(404, "Chamber not found");
  }
  if (!chamber.isActive) {
    throw new AppError(409, "This chamber is not accepting lots right now");
  }
  if (chamber.warehouse.status !== "APPROVED") {
    throw new AppError(
      409,
      `This warehouse is ${chamber.warehouse.status} and cannot accept bookings yet`
    );
  }
  const cropType = await prisma.cropType.findFirst({
    where: { id: cropTypeId, deletedAt: null },
    select: {
      id: true,
      name: true,
      idealMinTempC: true,
      idealMaxTempC: true,
      maxStorageDays: true
    }
  });
  if (!cropType) {
    throw new AppError(404, "Crop type not found");
  }
  const cropMin = Number(cropType.idealMinTempC);
  const cropMax = Number(cropType.idealMaxTempC);
  const chamberMin = Number(chamber.minTempC);
  const chamberMax = Number(chamber.maxTempC);
  if (chamberMin > cropMin || chamberMax < cropMax) {
    throw new AppError(
      422,
      `${cropType.name} needs ${cropMin} to ${cropMax}C, but chamber ${chamber.name} runs ${chamberMin} to ${chamberMax}C`
    );
  }
  const days = inclusiveDays(startDate, endDate);
  if (days < chamber.warehouse.minBookingDays) {
    throw new AppError(
      422,
      `This warehouse requires a minimum booking of ${chamber.warehouse.minBookingDays} days, you requested ${days}`
    );
  }
  if (days > cropType.maxStorageDays) {
    throw new AppError(
      422,
      `${cropType.name} can be stored for at most ${cropType.maxStorageDays} days, you requested ${days}`
    );
  }
  const rate = Number(chamber.warehouse.ratePerKgPerDay);
  const estimate = estimateCost(quantityKg, rate, days);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM chambers WHERE id = ${chamberId} FOR UPDATE`;
    await expireStaleHolds(tx, chamberId);
    const competing = await tx.booking.findMany({
      where: {
        chamberId,
        deletedAt: null,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: { in: ACTIVE_BOOKING_STATUSES }
      },
      select: { startDate: true, endDate: true, quantityKg: true }
    });
    const peak = peakLoadKg(competing, startDate, endDate);
    const free = chamber.capacityKg - peak;
    if (quantityKg > free) {
      throw new AppError(
        409,
        `Only ${free}kg is available in chamber ${chamber.name} between ${startDate.toISOString().slice(0, 10)} and ${endDate.toISOString().slice(0, 10)}`
      );
    }
    const created = await tx.booking.create({
      data: {
        lotCode: generateLotCode(),
        farmerId,
        chamberId,
        cropTypeId,
        quantityKg,
        startDate,
        endDate,
        ratePerKgPerDay: rate,
        estimatedCost: estimate
      },
      select: bookingSelect
    });
    await writeAuditLog(tx, {
      actorId: farmerId,
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: created.id,
      after: { lotCode: created.lotCode, quantityKg, status: created.status },
      ip
    });
    return toBooking(created);
  });
};
var loadBookingForActor = async (bookingId, actor) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: bookingSelect
  });
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }
  const isFarmer = booking.farmer.id === actor.id;
  const isOwner = booking.chamber.warehouse.ownerId === actor.id;
  const isAdmin = actor.role === "ADMIN";
  if (!isFarmer && !isOwner && !isAdmin) {
    throw new AppError(403, "You do not have access to this booking");
  }
  return booking;
};
var getBookingByIdFromDb = async (bookingId, actor) => toBooking(await loadBookingForActor(bookingId, actor));
var getMyBookingsFromDb = async (farmerId, filters) => {
  const pagination = buildPagination(filters, BOOKING_SORT_FIELDS, "createdAt");
  const where = {
    farmerId,
    deletedAt: null,
    ...filters.status === void 0 ? {} : { status: filters.status }
  };
  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.booking.count({ where })
  ]);
  return { data: rows.map(toBooking), meta: buildMeta(pagination.page, pagination.limit, total) };
};
var getAllBookingsFromDb = async (filters) => {
  const pagination = buildPagination(filters, BOOKING_SORT_FIELDS, "createdAt");
  const where = {
    deletedAt: null,
    ...filters.status === void 0 ? {} : { status: filters.status }
  };
  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.booking.count({ where })
  ]);
  return { data: rows.map(toBooking), meta: buildMeta(pagination.page, pagination.limit, total) };
};
var getWarehouseBookingsFromDb = async (warehouseId, ownerId, filters) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { ownerId: true }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
  if (warehouse.ownerId !== ownerId) {
    throw new AppError(403, "You can only view bookings for warehouses that belong to you");
  }
  const pagination = buildPagination(filters, BOOKING_SORT_FIELDS, "createdAt");
  const where = {
    deletedAt: null,
    chamber: { warehouseId },
    ...filters.status === void 0 ? {} : { status: filters.status }
  };
  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: bookingSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.booking.count({ where })
  ]);
  return { data: rows.map(toBooking), meta: buildMeta(pagination.page, pagination.limit, total) };
};
var assertWarehouseOwner = (booking, actorId) => {
  if (booking.chamber.warehouse.ownerId !== actorId) {
    throw new AppError(403, "You can only manage bookings for warehouses that belong to you");
  }
};
var transition = async (booking, next, actorId, action, extraData, ip) => {
  assertTransition(booking.status, next);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: next, ...extraData },
      select: bookingSelect
    });
    await writeAuditLog(tx, {
      actorId,
      action,
      entityType: "Booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: { status: updated.status },
      ip
    });
    return toBooking(updated);
  });
};
var approveBookingDb = async (bookingId, actor, ip) => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1e3);
  return transition(booking, "APPROVED", actor.id, "BOOKING_APPROVED", { holdExpiresAt }, ip);
};
var rejectBookingDb = async (bookingId, actor, reason2, ip) => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);
  return transition(
    booking,
    "REJECTED",
    actor.id,
    "BOOKING_REJECTED",
    { cancelReason: reason2 ?? null },
    ip
  );
};
var cancelBookingDb = async (bookingId, actor, reason2, ip) => {
  const booking = await loadBookingForActor(bookingId, actor);
  if (booking.farmer.id !== actor.id) {
    throw new AppError(403, "Only the farmer who created this booking can cancel it");
  }
  return transition(
    booking,
    "CANCELLED",
    actor.id,
    "BOOKING_CANCELLED",
    { cancelReason: reason2 ?? null },
    ip
  );
};
var storeBookingDb = async (bookingId, actor, ip) => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);
  const inspection = await prisma.inspection.findUnique({
    where: { bookingId },
    select: { grade: true }
  });
  if (inspection?.grade === "REJECTED") {
    throw new AppError(
      409,
      "This lot failed quality inspection and cannot be stored. Cancel and refund it instead."
    );
  }
  return transition(booking, "STORED", actor.id, "BOOKING_STORED", { storedAt: /* @__PURE__ */ new Date() }, ip);
};
var requestWithdrawalDb = async (bookingId, actor, ip) => {
  const booking = await loadBookingForActor(bookingId, actor);
  if (booking.farmer.id !== actor.id) {
    throw new AppError(403, "Only the farmer who owns this lot can request withdrawal");
  }
  return transition(booking, "WITHDRAW_REQUESTED", actor.id, "BOOKING_WITHDRAW_REQUESTED", {}, ip);
};
var completeBookingDb = async (bookingId, actor, ip) => {
  const booking = await loadBookingForActor(bookingId, actor);
  assertWarehouseOwner(booking, actor.id);
  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { id: booking.chamber.warehouse.id },
    select: { minBookingDays: true }
  });
  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    select: { amountBdt: true, status: true }
  });
  const alreadyPaidBdt = payment !== null && payment.status === "SUCCEEDED" ? Number(payment.amountBdt) : 0;
  const withdrawnAt = /* @__PURE__ */ new Date();
  const storedAt = booking.storedAt ?? booking.startDate;
  const settlement = settleBooking({
    quantityKg: booking.quantityKg,
    ratePerKgPerDay: Number(booking.ratePerKgPerDay),
    bookedDays: inclusiveDays(booking.startDate, booking.endDate),
    actualDays: Math.max(1, inclusiveDays(storedAt, withdrawnAt)),
    minBookingDays: warehouse.minBookingDays,
    alreadyPaidBdt
  });
  return transition(
    booking,
    "COMPLETED",
    actor.id,
    "BOOKING_COMPLETED",
    { withdrawnAt, finalCost: settlement.finalCost },
    ip
  );
};
var getBookingInvoiceFromDb = async (bookingId, actor) => {
  const booking = await loadBookingForActor(bookingId, actor);
  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { id: booking.chamber.warehouse.id },
    select: { minBookingDays: true }
  });
  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    select: {
      id: true,
      status: true,
      amountBdt: true,
      amount: true,
      currency: true,
      fxRate: true,
      paidAt: true
    }
  });
  const paidBdt = payment !== null && payment.status === "SUCCEEDED" ? Number(payment.amountBdt) : 0;
  const bookedDays = inclusiveDays(booking.startDate, booking.endDate);
  const storedAt = booking.storedAt;
  const endedAt = booking.withdrawnAt ?? /* @__PURE__ */ new Date();
  const actualDays = storedAt === null ? null : Math.max(1, inclusiveDays(storedAt, endedAt));
  const settlement = actualDays === null ? null : settleBooking({
    quantityKg: booking.quantityKg,
    ratePerKgPerDay: Number(booking.ratePerKgPerDay),
    bookedDays,
    actualDays,
    minBookingDays: warehouse.minBookingDays,
    alreadyPaidBdt: paidBdt
  });
  return {
    booking: toBooking(booking),
    charges: {
      quantityKg: booking.quantityKg,
      ratePerKgPerDay: Number(booking.ratePerKgPerDay),
      bookedDays,
      minBookingDays: warehouse.minBookingDays,
      estimatedCostBdt: Number(booking.estimatedCost),
      actualDaysStored: actualDays,
      settlement,
      finalCostBdt: booking.finalCost === null ? null : Number(booking.finalCost)
    },
    payment: payment === null ? null : {
      id: payment.id,
      status: payment.status,
      amountBdt: Number(payment.amountBdt),
      amountCharged: Number(payment.amount),
      currency: payment.currency,
      fxRate: Number(payment.fxRate),
      paidAt: payment.paidAt
    },
    balanceBdt: (() => {
      if (booking.finalCost !== null) {
        return Number(booking.finalCost) - paidBdt;
      }
      if (settlement !== null) {
        return settlement.balance;
      }
      return Number(booking.estimatedCost) - paidBdt;
    })()
  };
};
var bookingService = {
  getBookingInvoiceFromDb,
  createBookingDb,
  getBookingByIdFromDb,
  getMyBookingsFromDb,
  getAllBookingsFromDb,
  getWarehouseBookingsFromDb,
  approveBookingDb,
  rejectBookingDb,
  cancelBookingDb,
  storeBookingDb,
  requestWithdrawalDb,
  completeBookingDb
};

// src/modules/booking/booking.controller.ts
var actorOf = (req) => ({
  id: req.user.id,
  role: req.user.role
});
var createBooking = catchAsync(async (req, res) => {
  const data = await bookingService.createBookingDb(
    req.user.id,
    req.body,
    req.ip
  );
  sendResponse(res, {
    statusCode: 201,
    message: "Booking created. The warehouse owner must approve it before payment.",
    data
  });
});
var getMyBookings = catchAsync(async (req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await bookingService.getMyBookingsFromDb(req.user.id, filters);
  sendResponse(res, { statusCode: 200, message: "Bookings retrieved successfully", data, meta });
});
var getAllBookings = catchAsync(async (_req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await bookingService.getAllBookingsFromDb(filters);
  sendResponse(res, {
    statusCode: 200,
    message: "All bookings retrieved successfully",
    data,
    meta
  });
});
var getBookingById = catchAsync(async (req, res) => {
  const data = await bookingService.getBookingByIdFromDb(String(req.params.id), actorOf(req));
  sendResponse(res, { statusCode: 200, message: "Booking retrieved successfully", data });
});
var getWarehouseBookings = catchAsync(async (req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await bookingService.getWarehouseBookingsFromDb(
    String(req.params.id),
    req.user.id,
    filters
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse bookings retrieved successfully",
    data,
    meta
  });
});
var approveBooking = catchAsync(async (req, res) => {
  const data = await bookingService.approveBookingDb(String(req.params.id), actorOf(req), req.ip);
  sendResponse(res, {
    statusCode: 200,
    message: "Booking approved. The farmer must pay before the hold expires.",
    data
  });
});
var rejectBooking = catchAsync(async (req, res) => {
  const { reason: reason2 } = req.body;
  const data = await bookingService.rejectBookingDb(
    String(req.params.id),
    actorOf(req),
    reason2,
    req.ip
  );
  sendResponse(res, { statusCode: 200, message: "Booking rejected", data });
});
var cancelBooking = catchAsync(async (req, res) => {
  const { reason: reason2 } = req.body;
  const data = await bookingService.cancelBookingDb(
    String(req.params.id),
    actorOf(req),
    reason2,
    req.ip
  );
  sendResponse(res, { statusCode: 200, message: "Booking cancelled", data });
});
var storeBooking = catchAsync(async (req, res) => {
  const data = await bookingService.storeBookingDb(String(req.params.id), actorOf(req), req.ip);
  sendResponse(res, { statusCode: 200, message: "Lot marked as stored", data });
});
var requestWithdrawal = catchAsync(async (req, res) => {
  const data = await bookingService.requestWithdrawalDb(
    String(req.params.id),
    actorOf(req),
    req.ip
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Withdrawal requested. The warehouse owner will confirm release.",
    data
  });
});
var completeBooking = catchAsync(async (req, res) => {
  const data = await bookingService.completeBookingDb(String(req.params.id), actorOf(req), req.ip);
  sendResponse(res, {
    statusCode: 200,
    message: `Lot released. Final cost is ${data.finalCost} BDT.`,
    data
  });
});
var getBookingInvoice = catchAsync(async (req, res) => {
  const data = await bookingService.getBookingInvoiceFromDb(String(req.params.id), actorOf(req));
  sendResponse(res, { statusCode: 200, message: "Invoice retrieved successfully", data });
});
var bookingController = {
  getBookingInvoice,
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  getWarehouseBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  storeBooking,
  requestWithdrawal,
  completeBooking
};

// src/modules/inspection/inspection.service.ts
var inspectionSelect = {
  id: true,
  grade: true,
  moisturePct: true,
  actualQtyKg: true,
  notes: true,
  inspectedAt: true,
  inspector: { select: { id: true, name: true } },
  booking: {
    select: {
      id: true,
      lotCode: true,
      status: true,
      quantityKg: true,
      farmer: { select: { id: true, name: true } },
      chamber: {
        select: { warehouse: { select: { id: true, name: true, ownerId: true } } }
      }
    }
  }
};
var toInspection = (row) => ({
  id: row.id,
  grade: row.grade,
  moisturePct: row.moisturePct === null ? null : Number(row.moisturePct),
  actualQtyKg: row.actualQtyKg,
  notes: row.notes,
  inspectedAt: row.inspectedAt,
  inspector: row.inspector,
  booking: {
    id: row.booking.id,
    lotCode: row.booking.lotCode,
    status: row.booking.status,
    quantityKg: row.booking.quantityKg,
    farmer: row.booking.farmer,
    warehouse: {
      id: row.booking.chamber.warehouse.id,
      name: row.booking.chamber.warehouse.name
    }
  }
});
var createInspectionDb = async (bookingId, inspectorId, payload, ip) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: { id: true, lotCode: true, status: true, quantityKg: true }
  });
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }
  if (booking.status !== "PAID") {
    throw new AppError(
      409,
      `Intake inspection is only possible on a PAID booking. This one is ${booking.status}.`
    );
  }
  const existing = await prisma.inspection.findUnique({
    where: { bookingId },
    select: { id: true }
  });
  if (existing) {
    throw new AppError(409, "This lot has already been inspected");
  }
  if (payload.grade === "REJECTED") {
    assertTransition(booking.status, "CANCELLED");
  }
  return prisma.$transaction(async (tx) => {
    if (payload.grade === "REJECTED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelReason: "Failed intake quality inspection"
        }
      });
    }
    const created = await tx.inspection.create({
      data: {
        bookingId,
        inspectorId,
        grade: payload.grade,
        actualQtyKg: payload.actualQtyKg,
        ...payload.moisturePct === void 0 ? {} : { moisturePct: payload.moisturePct },
        ...payload.notes === void 0 ? {} : { notes: payload.notes }
      },
      select: inspectionSelect
    });
    await writeAuditLog(tx, {
      actorId: inspectorId,
      action: "INSPECTION_RECORDED",
      entityType: "Booking",
      entityId: bookingId,
      after: {
        grade: payload.grade,
        actualQtyKg: payload.actualQtyKg,
        declaredQtyKg: booking.quantityKg
      },
      ip
    });
    if (payload.grade === "REJECTED") {
      await writeAuditLog(tx, {
        actorId: inspectorId,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: bookingId,
        before: { status: booking.status },
        after: { status: "CANCELLED", reason: "Failed intake quality inspection" },
        ip
      });
    }
    return toInspection(created);
  });
};
var getInspectionsFromDb = async (filters) => {
  const pagination = buildPagination(filters, ["inspectedAt"], "inspectedAt");
  const where = {};
  if (filters.grade !== void 0) where.grade = filters.grade;
  if (filters.bookingId !== void 0) where.bookingId = filters.bookingId;
  const [rows, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      select: inspectionSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.inspection.count({ where })
  ]);
  return {
    data: rows.map(toInspection),
    meta: buildMeta(pagination.page, pagination.limit, total)
  };
};
var getInspectionByIdFromDb = async (id, actor) => {
  const row = await prisma.inspection.findUnique({
    where: { id },
    select: inspectionSelect
  });
  if (!row) {
    throw new AppError(404, "Inspection not found");
  }
  const isAdmin = actor.role === "ADMIN";
  const isFarmer = row.booking.farmer.id === actor.id;
  const isOwner = row.booking.chamber.warehouse.ownerId === actor.id;
  if (!isAdmin && !isFarmer && !isOwner) {
    throw new AppError(403, "You do not have access to this inspection");
  }
  return toInspection(row);
};
var inspectionService = {
  createInspectionDb,
  getInspectionsFromDb,
  getInspectionByIdFromDb
};

// src/modules/inspection/inspection.controller.ts
var createInspection = catchAsync(async (req, res) => {
  const data = await inspectionService.createInspectionDb(
    String(req.params.id),
    req.user.id,
    req.body,
    req.ip
  );
  const message = data.grade === "REJECTED" ? "Inspection recorded. The lot failed and the booking has been cancelled for refund." : `Inspection recorded with grade ${data.grade}. The lot can now be stored.`;
  sendResponse(res, { statusCode: 201, message, data });
});
var getInspections = catchAsync(async (_req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await inspectionService.getInspectionsFromDb(filters);
  sendResponse(res, { statusCode: 200, message: "Inspections retrieved successfully", data, meta });
});
var getInspectionById = catchAsync(async (req, res) => {
  const data = await inspectionService.getInspectionByIdFromDb(String(req.params.id), {
    id: req.user.id,
    role: req.user.role
  });
  sendResponse(res, { statusCode: 200, message: "Inspection retrieved successfully", data });
});
var inspectionController = {
  createInspection,
  getInspections,
  getInspectionById
};

// src/modules/inspection/inspection.validation.ts
import { z as z3 } from "zod";
var INSPECTION_GRADES = ["A", "B", "C", "REJECTED"];
var createInspectionSchema = z3.object({
  params: z3.object({ id: z3.uuid({ error: "id must be a valid uuid" }) }),
  body: z3.object({
    grade: z3.enum(INSPECTION_GRADES, {
      error: "grade must be A, B, C or REJECTED"
    }),
    actualQtyKg: z3.coerce.number({ error: "actualQtyKg must be a number" }).int({ error: "actualQtyKg must be a whole number" }).positive({ error: "actualQtyKg must be greater than zero" }).max(1e7, { error: "actualQtyKg is unrealistically large" }),
    moisturePct: z3.coerce.number({ error: "moisturePct must be a number" }).min(0, { error: "moisturePct cannot be negative" }).max(100, { error: "moisturePct cannot exceed 100" }).optional(),
    notes: z3.string().trim().min(3).max(500).optional()
  }).strict()
});
var listInspectionsSchema = z3.object({
  query: z3.object({
    grade: z3.enum(INSPECTION_GRADES).optional(),
    bookingId: z3.uuid({ error: "bookingId must be a valid uuid" }).optional(),
    sortOrder: z3.enum(["asc", "desc"]).optional(),
    page: z3.coerce.number().int().positive().optional(),
    limit: z3.coerce.number().int().positive().max(100).optional()
  }).strict()
});
var inspectionIdSchema = z3.object({
  params: z3.object({ id: z3.uuid({ error: "id must be a valid uuid" }) })
});

// src/modules/admin/admin.validation.ts
import { z as z4 } from "zod";
var USER_SORT_FIELDS = ["createdAt", "name", "email", "role"];
var updateWarehouseStatusSchema = z4.object({
  params: z4.object({ id: z4.uuid({ error: "id must be a valid uuid" }) }),
  body: z4.object({
    status: z4.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"], {
      error: "status must be PENDING, APPROVED, REJECTED or SUSPENDED"
    }),
    reason: z4.string().trim().min(3).max(255).optional()
  }).strict()
});
var listUsersSchema = z4.object({
  query: z4.object({
    search: z4.string().trim().min(1).optional(),
    role: z4.enum(["FARMER", "WAREHOUSE_OWNER", "ADMIN"]).optional(),
    status: z4.enum(["ACTIVE", "BANNED"]).optional(),
    verified: z4.enum(["true", "false"]).optional(),
    includeDeleted: z4.enum(["true", "false"]).optional(),
    sortBy: z4.enum(USER_SORT_FIELDS).optional(),
    sortOrder: z4.enum(["asc", "desc"]).optional(),
    page: z4.coerce.number().int().positive().optional(),
    limit: z4.coerce.number().int().positive().max(100).optional()
  }).strict()
});
var userIdSchema = z4.object({
  params: z4.object({ id: z4.uuid({ error: "id must be a valid uuid" }) })
});
var updateUserStatusSchema = z4.object({
  params: z4.object({ id: z4.uuid({ error: "id must be a valid uuid" }) }),
  body: z4.object({
    status: z4.enum(["ACTIVE", "BANNED"], { error: "status must be ACTIVE or BANNED" }),
    reason: z4.string().trim().min(3).max(255).optional()
  }).strict()
});
var updateUserRoleSchema = z4.object({
  params: z4.object({ id: z4.uuid({ error: "id must be a valid uuid" }) }),
  body: z4.object({
    role: z4.enum(["FARMER", "WAREHOUSE_OWNER", "ADMIN"], {
      error: "role must be FARMER, WAREHOUSE_OWNER or ADMIN"
    }),
    reason: z4.string().trim().min(3).max(255).optional()
  }).strict()
});
var listAuditLogsSchema = z4.object({
  query: z4.object({
    entityType: z4.string().trim().min(1).max(40).optional(),
    entityId: z4.uuid({ error: "entityId must be a valid uuid" }).optional(),
    actorId: z4.uuid({ error: "actorId must be a valid uuid" }).optional(),
    action: z4.string().trim().min(1).max(60).optional(),
    sortOrder: z4.enum(["asc", "desc"]).optional(),
    page: z4.coerce.number().int().positive().optional(),
    limit: z4.coerce.number().int().positive().max(100).optional()
  }).strict()
});

// src/modules/admin/admin.service.ts
var adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  password: true,
  googleId: true,
  emailVerifiedAt: true,
  deletedAt: true,
  createdAt: true,
  ownerProfile: { select: { id: true } }
};
var toAdminUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  status: row.status,
  emailVerified: row.emailVerifiedAt !== null,
  hasPassword: row.password !== null,
  linkedGoogle: row.googleId !== null,
  profileComplete: row.role === "WAREHOUSE_OWNER" ? row.ownerProfile !== null : true,
  deletedAt: row.deletedAt,
  createdAt: row.createdAt
});
var updateWarehouseStatusDb = async (warehouseId, adminId, payload, ip) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true, name: true, status: true }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
  if (warehouse.status === payload.status) {
    throw new AppError(409, `This warehouse is already ${payload.status}`);
  }
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.warehouse.update({
      where: { id: warehouseId },
      data: { status: payload.status },
      select: { id: true, name: true, status: true }
    });
    await writeAuditLog(tx, {
      actorId: adminId,
      action: "WAREHOUSE_STATUS_CHANGED",
      entityType: "Warehouse",
      entityId: warehouseId,
      before: { status: warehouse.status },
      after: { status: next.status, reason: payload.reason ?? null },
      ip
    });
    return next;
  });
  await invalidateWarehouseCache(warehouseId);
  return updated;
};
var getUsersFromDb = async (filters) => {
  const pagination = buildPagination(filters, USER_SORT_FIELDS, "createdAt");
  const where = {};
  if (filters.includeDeleted !== "true") {
    where.deletedAt = null;
  }
  if (filters.role !== void 0) where.role = filters.role;
  if (filters.status !== void 0) where.status = filters.status;
  if (filters.verified !== void 0) {
    where.emailVerifiedAt = filters.verified === "true" ? { not: null } : null;
  }
  if (filters.search !== void 0) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } }
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.user.count({ where })
  ]);
  return {
    data: rows.map(toAdminUser),
    meta: buildMeta(pagination.page, pagination.limit, total)
  };
};
var getUserByIdFromDb = async (id) => {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      ...adminUserSelect,
      farmerProfile: {
        select: { district: true, upazila: true, nid: true, farmSizeAcre: true }
      },
      ownerProfile: {
        select: {
          id: true,
          businessName: true,
          tradeLicenseNo: true,
          nid: true,
          district: true,
          address: true
        }
      },
      _count: { select: { warehouses: true, bookings: true } }
    }
  });
  if (!row) {
    throw new AppError(404, "User not found");
  }
  const { farmerProfile, ownerProfile, _count, ...base } = row;
  return {
    ...toAdminUser({
      ...base,
      ownerProfile: ownerProfile === null ? null : { id: ownerProfile.id }
    }),
    farmerProfile: farmerProfile === null ? null : {
      district: farmerProfile.district,
      upazila: farmerProfile.upazila,
      nid: farmerProfile.nid,
      farmSizeAcre: farmerProfile.farmSizeAcre === null ? null : Number(farmerProfile.farmSizeAcre)
    },
    ownerProfile: ownerProfile === null ? null : {
      businessName: ownerProfile.businessName,
      tradeLicenseNo: ownerProfile.tradeLicenseNo,
      nid: ownerProfile.nid,
      district: ownerProfile.district,
      address: ownerProfile.address
    },
    counts: { warehouses: _count.warehouses, bookings: _count.bookings }
  };
};
var loadTargetUser = async (id, adminId) => {
  if (id === adminId) {
    throw new AppError(403, "You cannot change your own account through the admin API");
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true, deletedAt: true }
  });
  if (!target || target.deletedAt !== null) {
    throw new AppError(404, "User not found");
  }
  if (target.role === "ADMIN") {
    throw new AppError(403, "Admin accounts cannot be modified through this API");
  }
  return target;
};
var updateUserStatusDb = async (id, adminId, payload, ip) => {
  const target = await loadTargetUser(id, adminId);
  if (target.status === payload.status) {
    throw new AppError(409, `This account is already ${payload.status}`);
  }
  return prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id },
      data: { status: payload.status },
      select: { id: true, name: true, email: true, role: true, status: true }
    });
    await writeAuditLog(tx, {
      actorId: adminId,
      action: payload.status === "BANNED" ? "USER_BANNED" : "USER_UNBANNED",
      entityType: "User",
      entityId: id,
      before: { status: target.status },
      after: { status: next.status, reason: payload.reason ?? null },
      ip
    });
    return next;
  });
};
var updateUserRoleDb = async (id, adminId, payload, ip) => {
  const target = await loadTargetUser(id, adminId);
  if (target.role === payload.role) {
    throw new AppError(409, `This account is already a ${payload.role}`);
  }
  if (target.role === "WAREHOUSE_OWNER") {
    const warehouses = await prisma.warehouse.count({
      where: { ownerId: id, deletedAt: null }
    });
    if (warehouses > 0) {
      throw new AppError(
        409,
        `Cannot change this role while the account still owns ${warehouses} warehouse(s)`
      );
    }
  }
  if (target.role === "FARMER") {
    const activeBookings = await prisma.booking.count({
      where: {
        farmerId: id,
        deletedAt: null,
        status: { in: ["PENDING_APPROVAL", "APPROVED", "PAID", "STORED", "WITHDRAW_REQUESTED"] }
      }
    });
    if (activeBookings > 0) {
      throw new AppError(
        409,
        `Cannot change this role while the account has ${activeBookings} active booking(s)`
      );
    }
  }
  return prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id },
      data: { role: payload.role },
      select: { id: true, name: true, email: true, role: true, status: true }
    });
    await writeAuditLog(tx, {
      actorId: adminId,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: id,
      before: { role: target.role },
      after: { role: next.role, reason: payload.reason ?? null },
      ip
    });
    return next;
  });
};
var getAuditLogsFromDb = async (filters) => {
  const pagination = buildPagination(filters, ["createdAt"], "createdAt");
  const where = {};
  if (filters.entityType !== void 0) where.entityType = filters.entityType;
  if (filters.entityId !== void 0) where.entityId = filters.entityId;
  if (filters.actorId !== void 0) where.actorId = filters.actorId;
  if (filters.action !== void 0) {
    where.action = { contains: filters.action, mode: "insensitive" };
  }
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        ip: true,
        createdAt: true,
        actor: { select: { id: true, name: true, role: true } }
      },
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.auditLog.count({ where })
  ]);
  return {
    data: rows,
    meta: buildMeta(pagination.page, pagination.limit, total)
  };
};
var getPlatformStatsFromDb = async () => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    deletedUsers,
    unverifiedUsers,
    usersByRole,
    totalWarehouses,
    warehousesByStatus,
    chambers,
    totalBookings,
    bookingsByStatus,
    payments,
    districts
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.user.count({ where: { deletedAt: null, status: "BANNED" } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { deletedAt: null, emailVerifiedAt: null } }),
    prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: true }),
    prisma.warehouse.count({ where: { deletedAt: null } }),
    prisma.warehouse.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    prisma.chamber.aggregate({
      where: { deletedAt: null },
      _count: true,
      _sum: { capacityKg: true }
    }),
    prisma.booking.count({ where: { deletedAt: null } }),
    prisma.booking.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _count: true,
      _sum: { amountBdt: true }
    }),
    prisma.warehouse.groupBy({
      by: ["district"],
      where: { deletedAt: null, status: "APPROVED" },
      _count: true
    })
  ]);
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      banned: bannedUsers,
      deleted: deletedUsers,
      unverified: unverifiedUsers,
      byRole: Object.fromEntries(usersByRole.map((row) => [row.role, row._count]))
    },
    warehouses: {
      total: totalWarehouses,
      byStatus: Object.fromEntries(warehousesByStatus.map((row) => [row.status, row._count]))
    },
    chambers: {
      total: chambers._count,
      totalCapacityKg: chambers._sum.capacityKg ?? 0
    },
    bookings: {
      total: totalBookings,
      byStatus: Object.fromEntries(bookingsByStatus.map((row) => [row.status, row._count]))
    },
    payments: {
      succeeded: payments._count,
      revenueBdt: Number(payments._sum.amountBdt ?? 0)
    },
    topDistricts: districts.map((row) => ({ district: row.district, warehouses: row._count })).sort((a, b) => b.warehouses - a.warehouses).slice(0, 5)
  };
};
var adminService = {
  updateWarehouseStatusDb,
  getUsersFromDb,
  getUserByIdFromDb,
  updateUserStatusDb,
  updateUserRoleDb,
  getAuditLogsFromDb,
  getPlatformStatsFromDb
};

// src/modules/admin/admin.controller.ts
var updateWarehouseStatus = catchAsync(async (req, res) => {
  const data = await adminService.updateWarehouseStatusDb(
    String(req.params.id),
    req.user.id,
    req.body,
    req.ip
  );
  sendResponse(res, {
    statusCode: 200,
    message: `Warehouse status changed to ${data.status}`,
    data
  });
});
var getUsers = catchAsync(async (_req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await adminService.getUsersFromDb(filters);
  sendResponse(res, {
    statusCode: 200,
    message: "Users retrieved successfully",
    data,
    meta
  });
});
var getUserById = catchAsync(async (req, res) => {
  const data = await adminService.getUserByIdFromDb(String(req.params.id));
  sendResponse(res, {
    statusCode: 200,
    message: "User retrieved successfully",
    data
  });
});
var updateUserStatus = catchAsync(async (req, res) => {
  const data = await adminService.updateUserStatusDb(
    String(req.params.id),
    req.user.id,
    req.body,
    req.ip
  );
  sendResponse(res, {
    statusCode: 200,
    message: `Account is now ${data.status}`,
    data
  });
});
var updateUserRole = catchAsync(async (req, res) => {
  const data = await adminService.updateUserRoleDb(
    String(req.params.id),
    req.user.id,
    req.body,
    req.ip
  );
  sendResponse(res, {
    statusCode: 200,
    message: `Role changed to ${data.role}`,
    data
  });
});
var getAuditLogs = catchAsync(async (_req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await adminService.getAuditLogsFromDb(filters);
  sendResponse(res, {
    statusCode: 200,
    message: "Audit logs retrieved successfully",
    data,
    meta
  });
});
var getStats = catchAsync(async (_req, res) => {
  const data = await adminService.getPlatformStatsFromDb();
  sendResponse(res, {
    statusCode: 200,
    message: "Platform statistics retrieved successfully",
    data
  });
});
var adminController = {
  updateWarehouseStatus,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getAuditLogs,
  getStats
};

// src/modules/admin/admin.route.ts
var router = Router();
router.use(auth, authorize("ADMIN"));
router.get(
  "/stats",
  cacheResponse(CACHE_TTL.adminStats, () => cacheKeys.adminStats()),
  adminController.getStats
);
router.get("/bookings", validateRequest(listBookingsSchema), bookingController.getAllBookings);
router.post(
  "/bookings/:id/inspection",
  validateRequest(createInspectionSchema),
  inspectionController.createInspection
);
router.get("/audit-logs", validateRequest(listAuditLogsSchema), adminController.getAuditLogs);
router.get("/users", validateRequest(listUsersSchema), adminController.getUsers);
router.get("/users/:id", validateRequest(userIdSchema), adminController.getUserById);
router.patch(
  "/users/:id/status",
  validateRequest(updateUserStatusSchema),
  adminController.updateUserStatus
);
router.patch(
  "/users/:id/role",
  validateRequest(updateUserRoleSchema),
  adminController.updateUserRole
);
router.patch(
  "/warehouses/:id/status",
  validateRequest(updateWarehouseStatusSchema),
  adminController.updateWarehouseStatus
);
var adminRoute = router;

// src/modules/auth/auth.route.ts
import { Router as Router2 } from "express";

// src/modules/auth/auth.service.ts
import { randomUUID as randomUUID2 } from "crypto";
import bcrypt from "bcrypt";

// src/lib/google.ts
import { OAuth2Client } from "google-auth-library";
var googleClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI
});
var GOOGLE_SCOPES = ["openid", "email", "profile"];

// src/lib/mailer.ts
import { Resend } from "resend";
var resend = new Resend(env.RESEND_API_KEY);
var sendEmail = async ({ to, subject, html, text }) => {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  });
  if (error) {
    console.error("Resend send failed:", error);
    throw new AppError(502, `Could not send email to ${to}. Please try again shortly.`);
  }
};

// src/utils/emailTemplates.ts
var buildOtpEmail = (name4, code) => {
  const minutes = env.OTP_EXPIRY_MINUTES;
  return {
    subject: `${code} is your AgroStore verification code`,
    text: `Hello ${name4},

Your AgroStore verification code is ${code}.
It expires in ${minutes} minutes.

If you did not create an AgroStore account, ignore this email.`,
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f4;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1b2a1b">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px">Verify your email</h1>
      <p style="margin:0 0 24px;color:#5a6b5a;font-size:14px">Hello ${name4}, use this code to finish creating your AgroStore account.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#eef4ee;border-radius:8px">${code}</div>
      <p style="margin:24px 0 0;color:#5a6b5a;font-size:13px">This code expires in ${minutes} minutes.</p>
      <p style="margin:8px 0 0;color:#8a9a8a;font-size:12px">If you did not create an AgroStore account, you can ignore this email.</p>
    </div>
  </body>
</html>`
  };
};

// src/utils/otp.ts
import { createHash as createHash2, randomInt, timingSafeEqual } from "crypto";
var codeKey = (email) => `otp:email-verify:${email}`;
var attemptsKey = (email) => `otp:email-verify:attempts:${email}`;
var cooldownKey = (email) => `otp:email-verify:cooldown:${email}`;
var RESEND_COOLDOWN_SECONDS = 60;
var hashCode = (code) => createHash2("sha256").update(code).digest("hex");
var matches = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
var generateOtp = () => {
  const max = 10 ** env.OTP_LENGTH;
  return String(randomInt(0, max)).padStart(env.OTP_LENGTH, "0");
};
var issueOtp = async (email) => {
  await connectRedis();
  const cooldown = await redis.ttl(cooldownKey(email));
  if (cooldown > 0) {
    throw new AppError(429, `Please wait ${cooldown} seconds before requesting another code`);
  }
  const code = generateOtp();
  const ttlSeconds = env.OTP_EXPIRY_MINUTES * 60;
  await redis.multi().set(codeKey(email), hashCode(code), "EX", ttlSeconds).del(attemptsKey(email)).set(cooldownKey(email), "1", "EX", RESEND_COOLDOWN_SECONDS).exec();
  return code;
};
var consumeOtp = async (email, submitted) => {
  await connectRedis();
  const stored = await redis.get(codeKey(email));
  if (stored === null) {
    throw new AppError(410, "This code has expired or was already used. Request a new one.");
  }
  const attempts = await redis.incr(attemptsKey(email));
  await redis.expire(attemptsKey(email), env.OTP_EXPIRY_MINUTES * 60);
  if (attempts > env.OTP_MAX_ATTEMPTS) {
    await redis.del(codeKey(email), attemptsKey(email));
    throw new AppError(429, "Too many incorrect attempts. Request a new code.");
  }
  if (!matches(stored, hashCode(submitted))) {
    const remaining = env.OTP_MAX_ATTEMPTS - attempts;
    throw new AppError(400, `Incorrect code. ${remaining} attempt(s) remaining.`);
  }
  await redis.del(codeKey(email), attemptsKey(email), cooldownKey(email));
};

// src/utils/publicUser.ts
var publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  ownerProfile: { select: { id: true } }
};
var isProfileComplete = (role, ownerProfile) => role !== "WAREHOUSE_OWNER" || ownerProfile !== null;
var toPublicUser = (user) => {
  const { ownerProfile, ...rest } = user;
  return { ...rest, profileComplete: isProfileComplete(user.role, ownerProfile) };
};

// src/modules/auth/auth.validation.ts
import { z as z5 } from "zod";
var SELF_SERVICE_ROLES = ["FARMER", "WAREHOUSE_OWNER"];
var BANGLADESHI_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;
var signupSchema = z5.object({
  body: z5.object({
    name: z5.string({ error: "name is required" }).trim().min(2, { error: "name must be at least 2 characters" }).max(80, { error: "name must be at most 80 characters" }),
    email: z5.email({ error: "email must be a valid email address" }).trim().toLowerCase().max(255, { error: "email must be at most 255 characters" }),
    password: z5.string({ error: "password is required" }).min(8, { error: "password must be at least 8 characters" }).max(72, { error: "password must be at most 72 characters" }).regex(/[A-Za-z]/, { error: "password must contain at least one letter" }).regex(/\d/, { error: "password must contain at least one number" }),
    phone: z5.string().trim().regex(BANGLADESHI_PHONE, {
      error: "phone must be a valid Bangladeshi number, e.g. 01712345678"
    }).optional(),
    role: z5.enum(SELF_SERVICE_ROLES, {
      error: "role must be either FARMER or WAREHOUSE_OWNER. ADMIN accounts cannot be created through the API."
    })
  }).strict()
});
var loginSchema = z5.object({
  body: z5.object({
    email: z5.email({ error: "email must be a valid email address" }).trim().toLowerCase(),
    password: z5.string({ error: "password is required" }).min(1, {
      error: "password is required"
    })
  }).strict()
});
var strongPassword = z5.string({ error: "password is required" }).min(8, { error: "password must be at least 8 characters" }).max(72, { error: "password must be at most 72 characters" }).regex(/[A-Za-z]/, { error: "password must contain at least one letter" }).regex(/\d/, { error: "password must contain at least one number" });
var setPasswordSchema = z5.object({
  body: z5.object({
    newPassword: strongPassword
  }).strict()
});
var changePasswordSchema = z5.object({
  body: z5.object({
    currentPassword: z5.string({ error: "currentPassword is required" }).min(1, {
      error: "currentPassword is required"
    }),
    newPassword: strongPassword
  }).strict()
});
var verifyOtpSchema = z5.object({
  body: z5.object({
    email: z5.email({ error: "email must be a valid email address" }).trim().toLowerCase(),
    otp: z5.string({ error: "otp is required" }).trim().regex(/^\d+$/, { error: "otp must contain digits only" })
  }).strict()
});
var resendOtpSchema = z5.object({
  body: z5.object({
    email: z5.email({ error: "email must be a valid email address" }).trim().toLowerCase()
  }).strict()
});
var refreshTokenSchema = z5.object({
  body: z5.object({
    refreshToken: z5.string().trim().min(1).optional()
  }).strict()
});

// src/modules/auth/auth.service.ts
var credentialsSelect = {
  ...publicUserSelect,
  password: true,
  deletedAt: true,
  emailVerifiedAt: true
};
var VERIFY_EMAIL_HINT = "Email not verified. Submit the code sent to your email at POST /api/v1/auth/verify-otp";
var deliverOtp = async (email, name4) => {
  const code = await issueOtp(email);
  const { subject, html, text } = buildOtpEmail(name4, code);
  await sendEmail({ to: email, subject, html, text });
};
var INVALID_CREDENTIALS = "Invalid email or password";
var decoyHash = null;
var equalizeTimingForMissingUser = async () => {
  if (decoyHash === null) {
    decoyHash = await bcrypt.hash(randomUUID2(), env.BCRYPT_SALT_ROUNDS);
  }
  await bcrypt.compare(randomUUID2(), decoyHash);
};
var issueAuthResult = (user) => {
  const { accessToken, refreshToken: refreshToken2 } = jwtUtils.createTokenPair({
    sub: user.id,
    email: user.email,
    role: user.role
  });
  return { accessToken, refreshToken: refreshToken2, user: toPublicUser(user) };
};
var registerUserDb = async (payload) => {
  if (!SELF_SERVICE_ROLES.includes(payload.role)) {
    throw new AppError(403, "ADMIN accounts cannot be created through the API");
  }
  const email = payload.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }
  const hashedPassword = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      password: hashedPassword,
      phone: payload.phone ?? null,
      role: payload.role
    },
    select: publicUserSelect
  });
  await deliverOtp(user.email, user.name);
  return toPublicUser(user);
};
var verifyEmailOtpDb = async (rawEmail, code) => {
  const email = rawEmail.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...publicUserSelect, deletedAt: true, emailVerifiedAt: true }
  });
  if (!user || user.deletedAt !== null) {
    throw new AppError(404, "No account found for this email");
  }
  if (user.emailVerifiedAt !== null) {
    throw new AppError(409, "This email is already verified. You can log in.");
  }
  await consumeOtp(email, code);
  const { deletedAt: _deletedAt, emailVerifiedAt: _verifiedAt, ...publicFields } = user;
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: /* @__PURE__ */ new Date() }
  });
  return toPublicUser(publicFields);
};
var resendEmailOtpDb = async (rawEmail) => {
  const email = rawEmail.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, deletedAt: true, emailVerifiedAt: true }
  });
  if (!user || user.deletedAt !== null) {
    return;
  }
  if (user.emailVerifiedAt !== null) {
    return;
  }
  await deliverOtp(email, user.name);
};
var loginUserDb = async (payload) => {
  const email = payload.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: credentialsSelect
  });
  if (!user || user.deletedAt !== null) {
    await equalizeTimingForMissingUser();
    throw new AppError(401, INVALID_CREDENTIALS);
  }
  if (user.password === null) {
    throw new AppError(
      409,
      "This account was created with Google sign-in. Continue with Google instead."
    );
  }
  const passwordMatches = await bcrypt.compare(payload.password, user.password);
  if (!passwordMatches) {
    throw new AppError(401, INVALID_CREDENTIALS);
  }
  if (user.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }
  if (user.emailVerifiedAt === null) {
    throw new AppError(403, VERIFY_EMAIL_HINT);
  }
  const {
    password: _password,
    deletedAt: _deletedAt,
    emailVerifiedAt: _verifiedAt,
    ...publicFields
  } = user;
  return issueAuthResult(publicFields);
};
var refreshTokensDb = async (refreshToken2) => {
  const decoded = jwtUtils.verifyRefreshToken(refreshToken2);
  if (await isJtiRevoked(decoded.jti)) {
    throw new AppError(401, "This session has been logged out. Please log in again.");
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: credentialsSelect
  });
  if (!user || user.deletedAt !== null) {
    throw new AppError(401, "Session is no longer valid, please log in again");
  }
  if (user.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }
  if (user.emailVerifiedAt === null) {
    throw new AppError(403, VERIFY_EMAIL_HINT);
  }
  const {
    password: _password,
    deletedAt: _deletedAt,
    emailVerifiedAt: _verifiedAt,
    ...publicFields
  } = user;
  await revokeJti(decoded.jti, decoded.exp);
  return issueAuthResult(publicFields);
};
var logoutDb = async (refreshToken2) => {
  if (refreshToken2 === void 0 || refreshToken2.length === 0) {
    return;
  }
  try {
    const decoded = jwtUtils.verifyRefreshToken(refreshToken2);
    await revokeJti(decoded.jti, decoded.exp);
  } catch {
    return;
  }
};
var setPasswordDb = async (userId, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });
  if (!user) {
    throw new AppError(404, "Account not found");
  }
  if (user.password !== null) {
    throw new AppError(
      409,
      "This account already has a password. Use POST /api/v1/auth/change-password instead."
    );
  }
  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
};
var changePasswordDb = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });
  if (!user) {
    throw new AppError(404, "Account not found");
  }
  if (user.password === null) {
    throw new AppError(
      409,
      "This account signs in with Google and has no password yet. Use POST /api/v1/auth/set-password instead."
    );
  }
  const currentMatches = await bcrypt.compare(currentPassword, user.password);
  if (!currentMatches) {
    throw new AppError(401, "Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, "New password must be different from the current password");
  }
  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
};
var GOOGLE_STATE_TTL_SECONDS = 300;
var stateKey = (state) => `oauth:google:state:${state}`;
var createGoogleAuthUrl = async (mode) => {
  await connectRedis();
  const state = randomUUID2();
  await redis.set(stateKey(state), mode, "EX", GOOGLE_STATE_TTL_SECONDS);
  return googleClient.generateAuthUrl({
    scope: GOOGLE_SCOPES,
    state,
    prompt: "select_account"
  });
};
var consumeGoogleState = async (state) => {
  await connectRedis();
  const stored = await redis.get(stateKey(state));
  if (stored === null) {
    throw new AppError(400, "This sign-in link has expired or was already used. Start again.");
  }
  await redis.del(stateKey(state));
  return stored === "json" ? "json" : "redirect";
};
var googleAuthDb = async (code) => {
  const { tokens } = await googleClient.getToken(code);
  if (!tokens.id_token) {
    throw new AppError(401, "Google did not return an identity token");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID
  });
  const profile = ticket.getPayload();
  if (!profile?.email) {
    throw new AppError(401, "Google did not share an email address for this account");
  }
  if (profile.email_verified !== true) {
    throw new AppError(403, "This Google account does not have a verified email address");
  }
  const email = profile.email.toLowerCase();
  const googleId = profile.sub;
  const name4 = profile.name ?? email;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    select: { ...credentialsSelect, googleId: true }
  });
  if (!existing) {
    const created = await prisma.user.create({
      data: {
        name: name4,
        email,
        googleId,
        role: "FARMER",
        emailVerifiedAt: /* @__PURE__ */ new Date()
      },
      select: publicUserSelect
    });
    return issueAuthResult(created);
  }
  if (existing.deletedAt !== null) {
    throw new AppError(403, "This account has been deleted");
  }
  if (existing.status === "BANNED") {
    throw new AppError(403, "This account has been banned. Contact support for help.");
  }
  if (existing.role !== "FARMER") {
    throw new AppError(
      403,
      "Google sign-in is available to farmers only. Log in with your email and password instead."
    );
  }
  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      googleId,
      emailVerifiedAt: existing.emailVerifiedAt ?? /* @__PURE__ */ new Date()
    },
    select: publicUserSelect
  });
  return issueAuthResult(updated);
};
var authService = {
  registerUserDb,
  loginUserDb,
  refreshTokensDb,
  verifyEmailOtpDb,
  resendEmailOtpDb,
  logoutDb,
  setPasswordDb,
  changePasswordDb,
  createGoogleAuthUrl,
  consumeGoogleState,
  googleAuthDb
};

// src/modules/auth/auth.controller.ts
var REFRESH_COOKIE = "refreshToken";
var REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
var refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/v1/auth",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS
};
var setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
};
var signup = catchAsync(async (req, res) => {
  const user = await authService.registerUserDb(req.body);
  const message = user.role === "WAREHOUSE_OWNER" ? "Account created successfully. Complete your warehouse owner profile before you can list warehouses." : "Account created successfully";
  sendResponse(res, { statusCode: 201, message, data: user });
});
var verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const user = await authService.verifyEmailOtpDb(email, otp);
  sendResponse(res, {
    statusCode: 200,
    message: "Email verified successfully. You can now log in.",
    data: user
  });
});
var resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.resendEmailOtpDb(email);
  sendResponse(res, {
    statusCode: 200,
    message: "If that account exists and is unverified, a new code has been sent."
  });
});
var login = catchAsync(async (req, res) => {
  const { accessToken, refreshToken: refreshToken2, user } = await authService.loginUserDb(
    req.body
  );
  setRefreshCookie(res, refreshToken2);
  sendResponse(res, {
    statusCode: 200,
    message: "Logged in successfully",
    data: { accessToken, user }
  });
});
var refreshToken = catchAsync(async (req, res) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  const fromBody = req.body?.refreshToken;
  const token = fromCookie ?? fromBody;
  if (token === void 0 || token.length === 0) {
    throw new AppError(401, "No refresh token provided, please log in again");
  }
  const result = await authService.refreshTokensDb(token);
  setRefreshCookie(res, result.refreshToken);
  sendResponse(res, {
    statusCode: 200,
    message: "Token refreshed successfully",
    data: { accessToken: result.accessToken, user: result.user }
  });
});
var logout = catchAsync(async (req, res) => {
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  const fromBody = req.body?.refreshToken;
  await authService.logoutDb(fromCookie ?? fromBody);
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: void 0 });
  sendResponse(res, { statusCode: 200, message: "Logged out successfully" });
});
var googleRedirect = catchAsync(async (req, res) => {
  const mode = req.query.mode === "json" ? "json" : "redirect";
  const url = await authService.createGoogleAuthUrl(mode);
  res.redirect(url);
});
var googleCallback = catchAsync(async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const denied = typeof req.query.error === "string" ? req.query.error : "";
  const mode = state.length > 0 ? await authService.consumeGoogleState(state) : "redirect";
  const fail = (status, message) => {
    if (mode === "json") {
      res.status(status).json({ success: false, message, errors: [] });
      return;
    }
    res.redirect(`${env.FRONTEND_URL}/?error=${encodeURIComponent(message)}`);
  };
  if (denied.length > 0) {
    fail(401, `Google sign-in was cancelled (${denied})`);
    return;
  }
  if (code.length === 0) {
    fail(400, "Google did not return an authorization code");
    return;
  }
  let result;
  try {
    result = await authService.googleAuthDb(code);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Google sign-in failed";
    fail(status, message);
    return;
  }
  setRefreshCookie(res, result.refreshToken);
  if (mode === "json") {
    sendResponse(res, {
      statusCode: 200,
      message: "Signed in with Google successfully",
      data: { accessToken: result.accessToken, user: result.user }
    });
    return;
  }
  const params = new URLSearchParams({
    accessToken: result.accessToken,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role
  });
  res.redirect(`${env.FRONTEND_URL}/?${params.toString()}`);
});
var setPassword = catchAsync(async (req, res) => {
  const { newPassword } = req.body;
  await authService.setPasswordDb(req.user.id, newPassword);
  sendResponse(res, {
    statusCode: 200,
    message: "Password set successfully. You can now log in with your email and password too."
  });
});
var changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePasswordDb(req.user.id, currentPassword, newPassword);
  sendResponse(res, { statusCode: 200, message: "Password changed successfully" });
});
var authController = {
  verifyOtp,
  resendOtp,
  signup,
  login,
  refreshToken,
  logout,
  setPassword,
  changePassword,
  googleRedirect,
  googleCallback
};

// src/modules/auth/auth.route.ts
var router2 = Router2();
router2.post("/signup", authLimiter, validateRequest(signupSchema), authController.signup);
router2.post("/verify-otp", otpLimiter, validateRequest(verifyOtpSchema), authController.verifyOtp);
router2.post("/resend-otp", otpLimiter, validateRequest(resendOtpSchema), authController.resendOtp);
router2.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router2.post("/refresh-token", validateRequest(refreshTokenSchema), authController.refreshToken);
router2.post("/logout", validateRequest(refreshTokenSchema), authController.logout);
router2.post("/set-password", auth, validateRequest(setPasswordSchema), authController.setPassword);
router2.post(
  "/change-password",
  auth,
  validateRequest(changePasswordSchema),
  authController.changePassword
);
router2.get("/google", authController.googleRedirect);
router2.get("/google/callback", authController.googleCallback);
var authRoute = router2;

// src/modules/booking/booking.route.ts
import { Router as Router3 } from "express";

// src/middlewares/requireCompleteProfile.ts
var requireCompleteProfile = catchAsync(async (req, _res, next) => {
  const current = req.user;
  if (current === void 0) {
    throw new AppError(401, "Authentication required");
  }
  if (current.role !== "WAREHOUSE_OWNER") {
    next();
    return;
  }
  const profile = await prisma.ownerProfile.findUnique({
    where: { userId: current.id },
    select: { id: true }
  });
  if (profile === null) {
    throw new AppError(
      403,
      "Complete your warehouse owner profile before using this feature. Submit POST /api/v1/users/me/owner-profile with businessName, tradeLicenseNo, nid, district and address."
    );
  }
  next();
});

// src/modules/booking/booking.route.ts
var router3 = Router3();
router3.post(
  "/",
  auth,
  authorize("FARMER"),
  bookingLimiter,
  validateRequest(createBookingSchema),
  bookingController.createBooking
);
router3.get(
  "/me",
  auth,
  authorize("FARMER"),
  validateRequest(listBookingsSchema),
  bookingController.getMyBookings
);
router3.get("/:id", auth, validateRequest(bookingIdSchema), bookingController.getBookingById);
router3.get(
  "/:id/invoice",
  auth,
  validateRequest(bookingIdSchema),
  bookingController.getBookingInvoice
);
router3.patch(
  "/:id/approve",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingIdSchema),
  bookingController.approveBooking
);
router3.patch(
  "/:id/reject",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingReasonSchema),
  bookingController.rejectBooking
);
router3.patch(
  "/:id/cancel",
  auth,
  authorize("FARMER"),
  validateRequest(bookingReasonSchema),
  bookingController.cancelBooking
);
router3.patch(
  "/:id/store",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingIdSchema),
  bookingController.storeBooking
);
router3.patch(
  "/:id/withdraw-request",
  auth,
  authorize("FARMER"),
  validateRequest(bookingIdSchema),
  bookingController.requestWithdrawal
);
router3.patch(
  "/:id/complete",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(bookingIdSchema),
  bookingController.completeBooking
);
var bookingRoute = router3;

// src/modules/chamber/chamber.route.ts
import { Router as Router4 } from "express";

// src/modules/warehouse/availability.service.ts
var DAILY_BREAKDOWN_MAX_DAYS = 92;
var loadCropRange = async (cropTypeId) => {
  const crop = await prisma.cropType.findFirst({
    where: { id: cropTypeId, deletedAt: null },
    select: {
      id: true,
      name: true,
      idealMinTempC: true,
      idealMaxTempC: true,
      maxStorageDays: true
    }
  });
  if (!crop) {
    throw new AppError(404, "Crop type not found");
  }
  return {
    id: crop.id,
    name: crop.name,
    minTempC: Number(crop.idealMinTempC),
    maxTempC: Number(crop.idealMaxTempC),
    maxStorageDays: crop.maxStorageDays
  };
};
var competingBookings = async (chamberIds, startDate, endDate) => {
  const rows = await prisma.booking.findMany({
    where: {
      chamberId: { in: chamberIds },
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      status: { in: ACTIVE_BOOKING_STATUSES }
    },
    select: { chamberId: true, startDate: true, endDate: true, quantityKg: true }
  });
  const grouped = /* @__PURE__ */ new Map();
  for (const id of chamberIds) {
    grouped.set(id, []);
  }
  for (const row of rows) {
    grouped.get(row.chamberId)?.push({
      startDate: row.startDate,
      endDate: row.endDate,
      quantityKg: row.quantityKg
    });
  }
  return grouped;
};
var getWarehouseAvailability = async (warehouseId, window2) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      minBookingDays: true,
      ratePerKgPerDay: true,
      chambers: {
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, capacityKg: true, minTempC: true, maxTempC: true },
        orderBy: { name: "asc" }
      }
    }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
  const crop = window2.cropTypeId === void 0 ? null : await loadCropRange(window2.cropTypeId);
  const days = inclusiveDays(window2.startDate, window2.endDate);
  const bookings = await competingBookings(
    warehouse.chambers.map((chamber) => chamber.id),
    window2.startDate,
    window2.endDate
  );
  const chambers = warehouse.chambers.map((chamber) => {
    const chamberMin = Number(chamber.minTempC);
    const chamberMax = Number(chamber.maxTempC);
    const windows = bookings.get(chamber.id) ?? [];
    const peakUsedKg = peakLoadKg(windows, window2.startDate, window2.endDate);
    const fitsCrop = crop === null ? null : chamberMin <= crop.minTempC && chamberMax >= crop.maxTempC;
    return {
      id: chamber.id,
      name: chamber.name,
      capacityKg: chamber.capacityKg,
      minTempC: chamberMin,
      maxTempC: chamberMax,
      peakUsedKg,
      availableKg: Math.max(0, chamber.capacityKg - peakUsedKg),
      fitsCrop
    };
  });
  const bookable = chambers.filter((chamber) => chamber.fitsCrop !== false);
  return {
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
      status: warehouse.status,
      minBookingDays: warehouse.minBookingDays,
      ratePerKgPerDay: Number(warehouse.ratePerKgPerDay)
    },
    window: {
      startDate: window2.startDate.toISOString().slice(0, 10),
      endDate: window2.endDate.toISOString().slice(0, 10),
      days
    },
    cropType: crop,
    meetsMinBookingDays: days >= warehouse.minBookingDays,
    withinCropMaxStorageDays: crop === null ? null : days <= crop.maxStorageDays,
    totalAvailableKg: bookable.reduce((sum, chamber) => sum + chamber.availableKg, 0),
    chambers
  };
};
var getChamberAvailability = async (chamberId, window2) => {
  const chamber = await prisma.chamber.findFirst({
    where: { id: chamberId, deletedAt: null },
    select: {
      id: true,
      name: true,
      capacityKg: true,
      minTempC: true,
      maxTempC: true,
      isActive: true,
      warehouse: {
        select: { id: true, name: true, status: true, minBookingDays: true, ratePerKgPerDay: true }
      }
    }
  });
  if (!chamber) {
    throw new AppError(404, "Chamber not found");
  }
  const crop = window2.cropTypeId === void 0 ? null : await loadCropRange(window2.cropTypeId);
  const days = inclusiveDays(window2.startDate, window2.endDate);
  const windows = (await competingBookings([chamberId], window2.startDate, window2.endDate)).get(chamberId) ?? [];
  const peakUsedKg = peakLoadKg(windows, window2.startDate, window2.endDate);
  const availableKg = Math.max(0, chamber.capacityKg - peakUsedKg);
  const chamberMin = Number(chamber.minTempC);
  const chamberMax = Number(chamber.maxTempC);
  return {
    chamber: {
      id: chamber.id,
      name: chamber.name,
      capacityKg: chamber.capacityKg,
      minTempC: chamberMin,
      maxTempC: chamberMax,
      isActive: chamber.isActive
    },
    warehouse: {
      id: chamber.warehouse.id,
      name: chamber.warehouse.name,
      status: chamber.warehouse.status,
      minBookingDays: chamber.warehouse.minBookingDays,
      ratePerKgPerDay: Number(chamber.warehouse.ratePerKgPerDay)
    },
    window: {
      startDate: window2.startDate.toISOString().slice(0, 10),
      endDate: window2.endDate.toISOString().slice(0, 10),
      days
    },
    cropType: crop,
    fitsCrop: crop === null ? null : chamberMin <= crop.minTempC && chamberMax >= crop.maxTempC,
    peakUsedKg,
    availableKg,
    overlappingBookings: windows.length,
    dailyBreakdown: days <= DAILY_BREAKDOWN_MAX_DAYS ? dailyLoad(chamber.capacityKg, windows, window2.startDate, window2.endDate) : null
  };
};
var availabilityService = {
  getWarehouseAvailability,
  getChamberAvailability
};

// src/modules/warehouse/availability.controller.ts
var getWarehouseAvailability2 = catchAsync(async (req, res) => {
  const query = validatedQuery(res);
  const data = await availabilityService.getWarehouseAvailability(String(req.params.id), query);
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse availability retrieved successfully",
    data
  });
});
var getChamberAvailability2 = catchAsync(async (req, res) => {
  const query = validatedQuery(res);
  const data = await availabilityService.getChamberAvailability(String(req.params.id), query);
  sendResponse(res, {
    statusCode: 200,
    message: "Chamber availability retrieved successfully",
    data
  });
});
var availabilityController = {
  getWarehouseAvailability: getWarehouseAvailability2,
  getChamberAvailability: getChamberAvailability2
};

// src/modules/warehouse/availability.validation.ts
import { z as z6 } from "zod";
var isoDate2 = z6.string({ error: "date is required" }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: "date must be in YYYY-MM-DD format" }).transform((value) => /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`)).refine((date) => !Number.isNaN(date.getTime()), { error: "date is not a real calendar date" });
var window = z6.object({
  startDate: isoDate2,
  endDate: isoDate2,
  cropTypeId: z6.uuid({ error: "cropTypeId must be a valid uuid" }).optional()
}).strict().refine((query) => query.endDate.getTime() >= query.startDate.getTime(), {
  error: "endDate must be on or after startDate",
  path: ["endDate"]
}).refine(
  (query) => (query.endDate.getTime() - query.startDate.getTime()) / (24 * 60 * 60 * 1e3) <= 365,
  { error: "the availability window cannot exceed 365 days", path: ["endDate"] }
);
var warehouseAvailabilitySchema = z6.object({
  params: z6.object({ id: z6.uuid({ error: "id must be a valid uuid" }) }),
  query: window
});
var chamberAvailabilitySchema = z6.object({
  params: z6.object({ id: z6.uuid({ error: "id must be a valid uuid" }) }),
  query: window
});

// src/modules/chamber/chamber.service.ts
var chamberSelect = {
  id: true,
  warehouseId: true,
  name: true,
  capacityKg: true,
  minTempC: true,
  maxTempC: true,
  isActive: true,
  createdAt: true
};
var toChamber = (row) => ({
  id: row.id,
  warehouseId: row.warehouseId,
  name: row.name,
  capacityKg: row.capacityKg,
  minTempC: Number(row.minTempC),
  maxTempC: Number(row.maxTempC),
  isActive: row.isActive,
  createdAt: row.createdAt
});
var assertWarehouseExists = async (warehouseId) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
};
var assertWarehouseOwnership = async (warehouseId, ownerId) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { ownerId: true }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
  if (warehouse.ownerId !== ownerId) {
    throw new AppError(403, "You can only manage chambers in warehouses that belong to you");
  }
};
var getChambersFromDb = async (warehouseId, filters) => {
  await assertWarehouseExists(warehouseId);
  const rows = await prisma.chamber.findMany({
    where: {
      warehouseId,
      deletedAt: null,
      ...filters.isActive === void 0 ? {} : { isActive: filters.isActive === "true" }
    },
    select: chamberSelect,
    orderBy: { name: "asc" }
  });
  return rows.map(toChamber);
};
var getChamberByIdFromDb = async (id) => {
  const row = await prisma.chamber.findFirst({
    where: { id, deletedAt: null },
    select: chamberSelect
  });
  if (!row) {
    throw new AppError(404, "Chamber not found");
  }
  return toChamber(row);
};
var createChamberDb = async (warehouseId, ownerId, payload) => {
  await assertWarehouseOwnership(warehouseId, ownerId);
  const row = await prisma.chamber.create({
    data: {
      warehouseId,
      name: payload.name,
      capacityKg: payload.capacityKg,
      minTempC: payload.minTempC,
      maxTempC: payload.maxTempC
    },
    select: chamberSelect
  });
  await invalidateWarehouseCache(warehouseId);
  return toChamber(row);
};
var updateChamberDb = async (id, ownerId, payload) => {
  const existing = await prisma.chamber.findFirst({
    where: { id, deletedAt: null },
    select: { warehouseId: true, minTempC: true, maxTempC: true }
  });
  if (!existing) {
    throw new AppError(404, "Chamber not found");
  }
  await assertWarehouseOwnership(existing.warehouseId, ownerId);
  const nextMin = payload.minTempC ?? Number(existing.minTempC);
  const nextMax = payload.maxTempC ?? Number(existing.maxTempC);
  if (nextMax < nextMin) {
    throw new AppError(422, "maxTempC must be greater than or equal to minTempC");
  }
  const data = {};
  if (payload.name !== void 0) data.name = payload.name;
  if (payload.capacityKg !== void 0) data.capacityKg = payload.capacityKg;
  if (payload.minTempC !== void 0) data.minTempC = payload.minTempC;
  if (payload.maxTempC !== void 0) data.maxTempC = payload.maxTempC;
  if (payload.isActive !== void 0) data.isActive = payload.isActive;
  const row = await prisma.chamber.update({ where: { id }, data, select: chamberSelect });
  await invalidateWarehouseCache(existing.warehouseId);
  return toChamber(row);
};
var softDeleteChamberDb = async (id, ownerId) => {
  const existing = await prisma.chamber.findFirst({
    where: { id, deletedAt: null },
    select: { warehouseId: true }
  });
  if (!existing) {
    throw new AppError(404, "Chamber not found");
  }
  await assertWarehouseOwnership(existing.warehouseId, ownerId);
  const activeLots = await prisma.booking.count({
    where: {
      chamberId: id,
      deletedAt: null,
      status: { in: ["PAID", "STORED", "WITHDRAW_REQUESTED"] }
    }
  });
  if (activeLots > 0) {
    throw new AppError(
      409,
      `Cannot delete this chamber while ${activeLots} lot(s) are still stored in it`
    );
  }
  await prisma.chamber.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date() } });
  await invalidateWarehouseCache(existing.warehouseId);
};
var chamberService = {
  getChambersFromDb,
  getChamberByIdFromDb,
  createChamberDb,
  updateChamberDb,
  softDeleteChamberDb
};

// src/modules/chamber/chamber.controller.ts
var getChambers = catchAsync(async (req, res) => {
  const filters = validatedQuery(res);
  const data = await chamberService.getChambersFromDb(String(req.params.warehouseId), filters);
  sendResponse(res, {
    statusCode: 200,
    message: "Chambers retrieved successfully",
    data
  });
});
var getChamberById = catchAsync(async (req, res) => {
  const data = await chamberService.getChamberByIdFromDb(String(req.params.id));
  sendResponse(res, {
    statusCode: 200,
    message: "Chamber retrieved successfully",
    data
  });
});
var createChamber = catchAsync(async (req, res) => {
  const data = await chamberService.createChamberDb(
    String(req.params.warehouseId),
    req.user.id,
    req.body
  );
  sendResponse(res, {
    statusCode: 201,
    message: "Chamber created successfully",
    data
  });
});
var updateChamber = catchAsync(async (req, res) => {
  const data = await chamberService.updateChamberDb(
    String(req.params.id),
    req.user.id,
    req.body
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Chamber updated successfully",
    data
  });
});
var deleteChamber = catchAsync(async (req, res) => {
  await chamberService.softDeleteChamberDb(String(req.params.id), req.user.id);
  sendResponse(res, {
    statusCode: 200,
    message: "Chamber deleted successfully"
  });
});
var chamberController = {
  getChambers,
  getChamberById,
  createChamber,
  updateChamber,
  deleteChamber
};

// src/modules/chamber/chamber.validation.ts
import { z as z7 } from "zod";
var name = z7.string({ error: "name is required" }).trim().min(1, { error: "name is required" }).max(60, { error: "name must be at most 60 characters" });
var capacityKg = z7.coerce.number({ error: "capacityKg must be a number" }).int({ error: "capacityKg must be a whole number" }).positive({ error: "capacityKg must be greater than zero" }).max(1e7, { error: "capacityKg is unrealistically large" });
var temperature = z7.coerce.number({ error: "temperature must be a number" }).min(-40, { error: "temperature must be at least -40C" }).max(40, { error: "temperature must be at most 40C" });
var listChambersSchema = z7.object({
  params: z7.object({ warehouseId: z7.uuid({ error: "warehouseId must be a valid uuid" }) }),
  query: z7.object({
    isActive: z7.enum(["true", "false"]).optional()
  }).strict()
});
var createChamberSchema = z7.object({
  params: z7.object({ warehouseId: z7.uuid({ error: "warehouseId must be a valid uuid" }) }),
  body: z7.object({
    name,
    capacityKg,
    minTempC: temperature,
    maxTempC: temperature
  }).strict().refine((body) => body.maxTempC >= body.minTempC, {
    error: "maxTempC must be greater than or equal to minTempC",
    path: ["maxTempC"]
  })
});
var updateChamberSchema = z7.object({
  params: z7.object({ id: z7.uuid({ error: "id must be a valid uuid" }) }),
  body: z7.object({
    name: name.optional(),
    capacityKg: capacityKg.optional(),
    minTempC: temperature.optional(),
    maxTempC: temperature.optional(),
    isActive: z7.boolean().optional()
  }).strict().refine((body) => Object.values(body).some((value) => value !== void 0), {
    error: "Provide at least one field to update"
  })
});
var chamberIdSchema = z7.object({
  params: z7.object({ id: z7.uuid({ error: "id must be a valid uuid" }) })
});

// src/modules/chamber/chamber.route.ts
var nestedRouter = Router4({ mergeParams: true });
nestedRouter.get("/", validateRequest(listChambersSchema), chamberController.getChambers);
nestedRouter.post(
  "/",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(createChamberSchema),
  chamberController.createChamber
);
var router4 = Router4();
router4.get(
  "/:id/availability",
  validateRequest(chamberAvailabilitySchema),
  availabilityController.getChamberAvailability
);
router4.get("/:id", validateRequest(chamberIdSchema), chamberController.getChamberById);
router4.patch(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(updateChamberSchema),
  chamberController.updateChamber
);
router4.delete(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(chamberIdSchema),
  chamberController.deleteChamber
);
var warehouseChamberRoute = nestedRouter;
var chamberRoute = router4;

// src/modules/cropType/cropType.route.ts
import { Router as Router5 } from "express";

// src/modules/cropType/cropType.service.ts
var cropTypeSelect = {
  id: true,
  name: true,
  idealMinTempC: true,
  idealMaxTempC: true,
  maxStorageDays: true
};
var toCropType = (row) => ({
  id: row.id,
  name: row.name,
  idealMinTempC: Number(row.idealMinTempC),
  idealMaxTempC: Number(row.idealMaxTempC),
  maxStorageDays: row.maxStorageDays
});
var ACTIVE_BOOKING_STATUSES2 = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PAID",
  "STORED",
  "WITHDRAW_REQUESTED"
];
var getCropTypesFromDb = async (filters) => {
  const rows = await prisma.cropType.findMany({
    where: {
      deletedAt: null,
      ...filters.search === void 0 ? {} : { name: { contains: filters.search, mode: "insensitive" } }
    },
    select: cropTypeSelect,
    orderBy: { name: "asc" }
  });
  return rows.map(toCropType);
};
var getCropTypeByIdFromDb = async (id) => {
  const row = await prisma.cropType.findFirst({
    where: { id, deletedAt: null },
    select: cropTypeSelect
  });
  if (!row) {
    throw new AppError(404, "Crop type not found");
  }
  return toCropType(row);
};
var createCropTypeDb = async (payload) => {
  const row = await prisma.cropType.create({ data: payload, select: cropTypeSelect });
  await invalidateCropTypeCache();
  return toCropType(row);
};
var updateCropTypeDb = async (id, payload) => {
  const existing = await prisma.cropType.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, idealMinTempC: true, idealMaxTempC: true }
  });
  if (!existing) {
    throw new AppError(404, "Crop type not found");
  }
  const nextMin = payload.idealMinTempC ?? Number(existing.idealMinTempC);
  const nextMax = payload.idealMaxTempC ?? Number(existing.idealMaxTempC);
  if (nextMax < nextMin) {
    throw new AppError(422, "idealMaxTempC must be greater than or equal to idealMinTempC");
  }
  const data = {};
  if (payload.name !== void 0) data.name = payload.name;
  if (payload.idealMinTempC !== void 0) data.idealMinTempC = payload.idealMinTempC;
  if (payload.idealMaxTempC !== void 0) data.idealMaxTempC = payload.idealMaxTempC;
  if (payload.maxStorageDays !== void 0) data.maxStorageDays = payload.maxStorageDays;
  const row = await prisma.cropType.update({ where: { id }, data, select: cropTypeSelect });
  await invalidateCropTypeCache();
  return toCropType(row);
};
var softDeleteCropTypeDb = async (id) => {
  const existing = await prisma.cropType.findFirst({
    where: { id, deletedAt: null },
    select: { id: true }
  });
  if (!existing) {
    throw new AppError(404, "Crop type not found");
  }
  const activeBookings = await prisma.booking.count({
    where: {
      cropTypeId: id,
      deletedAt: null,
      status: { in: [...ACTIVE_BOOKING_STATUSES2] }
    }
  });
  if (activeBookings > 0) {
    throw new AppError(
      409,
      `Cannot delete this crop type while ${activeBookings} active booking(s) still reference it`
    );
  }
  await prisma.cropType.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date() } });
  await invalidateCropTypeCache();
};
var cropTypeService = {
  getCropTypesFromDb,
  getCropTypeByIdFromDb,
  createCropTypeDb,
  updateCropTypeDb,
  softDeleteCropTypeDb
};

// src/modules/cropType/cropType.controller.ts
var getCropTypes = catchAsync(async (_req, res) => {
  const filters = validatedQuery(res);
  const data = await cropTypeService.getCropTypesFromDb(filters);
  sendResponse(res, {
    statusCode: 200,
    message: "Crop types retrieved successfully",
    data
  });
});
var getCropTypeById = catchAsync(async (req, res) => {
  const data = await cropTypeService.getCropTypeByIdFromDb(String(req.params.id));
  sendResponse(res, {
    statusCode: 200,
    message: "Crop type retrieved successfully",
    data
  });
});
var createCropType = catchAsync(async (req, res) => {
  const data = await cropTypeService.createCropTypeDb(req.body);
  sendResponse(res, {
    statusCode: 201,
    message: "Crop type created successfully",
    data
  });
});
var updateCropType = catchAsync(async (req, res) => {
  const data = await cropTypeService.updateCropTypeDb(
    String(req.params.id),
    req.body
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Crop type updated successfully",
    data
  });
});
var deleteCropType = catchAsync(async (req, res) => {
  await cropTypeService.softDeleteCropTypeDb(String(req.params.id));
  sendResponse(res, {
    statusCode: 200,
    message: "Crop type deleted successfully"
  });
});
var cropTypeController = {
  getCropTypes,
  getCropTypeById,
  createCropType,
  updateCropType,
  deleteCropType
};

// src/modules/cropType/cropType.validation.ts
import { z as z8 } from "zod";
var name2 = z8.string({ error: "name is required" }).trim().min(2, { error: "name must be at least 2 characters" }).max(60, { error: "name must be at most 60 characters" });
var temperature2 = z8.coerce.number({ error: "temperature must be a number" }).min(-40, { error: "temperature must be at least -40C" }).max(40, { error: "temperature must be at most 40C" });
var maxStorageDays = z8.coerce.number({ error: "maxStorageDays must be a number" }).int({ error: "maxStorageDays must be a whole number" }).positive({ error: "maxStorageDays must be greater than zero" }).max(730, { error: "maxStorageDays cannot exceed 730" });
var listCropTypesSchema = z8.object({
  query: z8.object({
    search: z8.string().trim().min(1).optional()
  }).strict()
});
var createCropTypeSchema = z8.object({
  body: z8.object({
    name: name2,
    idealMinTempC: temperature2,
    idealMaxTempC: temperature2,
    maxStorageDays
  }).strict().refine((body) => body.idealMaxTempC >= body.idealMinTempC, {
    error: "idealMaxTempC must be greater than or equal to idealMinTempC",
    path: ["idealMaxTempC"]
  })
});
var updateCropTypeSchema = z8.object({
  params: z8.object({ id: z8.uuid({ error: "id must be a valid uuid" }) }),
  body: z8.object({
    name: name2.optional(),
    idealMinTempC: temperature2.optional(),
    idealMaxTempC: temperature2.optional(),
    maxStorageDays: maxStorageDays.optional()
  }).strict().refine((body) => Object.values(body).some((value) => value !== void 0), {
    error: "Provide at least one field to update"
  })
});
var cropTypeIdSchema = z8.object({
  params: z8.object({ id: z8.uuid({ error: "id must be a valid uuid" }) })
});

// src/modules/cropType/cropType.route.ts
var router5 = Router5();
router5.get(
  "/",
  validateRequest(listCropTypesSchema),
  cacheResponse(CACHE_TTL.cropTypes, (req) => cacheKeys.cropTypes(queryOf(req))),
  cropTypeController.getCropTypes
);
router5.get("/:id", validateRequest(cropTypeIdSchema), cropTypeController.getCropTypeById);
router5.post(
  "/",
  auth,
  authorize("ADMIN"),
  validateRequest(createCropTypeSchema),
  cropTypeController.createCropType
);
router5.patch(
  "/:id",
  auth,
  authorize("ADMIN"),
  validateRequest(updateCropTypeSchema),
  cropTypeController.updateCropType
);
router5.delete(
  "/:id",
  auth,
  authorize("ADMIN"),
  validateRequest(cropTypeIdSchema),
  cropTypeController.deleteCropType
);
var cropTypeRoute = router5;

// src/modules/farmer/farmer.route.ts
import { Router as Router6 } from "express";

// src/modules/farmer/farmer.service.ts
var farmerProfileSelect = {
  id: true,
  district: true,
  upazila: true,
  nid: true,
  farmSizeAcre: true,
  createdAt: true,
  updatedAt: true
};
var toFarmerProfile = (row) => ({
  id: row.id,
  district: row.district,
  upazila: row.upazila,
  nid: row.nid,
  farmSizeAcre: row.farmSizeAcre === null ? null : Number(row.farmSizeAcre),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});
var assertFarmer = (role) => {
  if (role !== "FARMER") {
    throw new AppError(403, "Only farmers have a farming profile");
  }
};
var createFarmerProfileDb = async (userId, role, payload) => {
  assertFarmer(role);
  const existing = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (existing) {
    throw new AppError(
      409,
      "Your farming profile already exists. Use PATCH /api/v1/users/me/farmer-profile to update it."
    );
  }
  const created = await prisma.farmerProfile.create({
    data: {
      userId,
      district: payload.district,
      upazila: payload.upazila ?? null,
      nid: payload.nid ?? null,
      farmSizeAcre: payload.farmSizeAcre ?? null
    },
    select: farmerProfileSelect
  });
  return toFarmerProfile(created);
};
var getFarmerProfileFromDb = async (userId, role) => {
  assertFarmer(role);
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: farmerProfileSelect
  });
  if (!profile) {
    throw new AppError(404, "You have not created your farming profile yet");
  }
  return toFarmerProfile(profile);
};
var updateFarmerProfileDb = async (userId, role, payload) => {
  assertFarmer(role);
  const existing = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!existing) {
    throw new AppError(
      404,
      "You have not created your farming profile yet. Use POST /api/v1/users/me/farmer-profile first."
    );
  }
  const data = {};
  if (payload.district !== void 0) data.district = payload.district;
  if (payload.upazila !== void 0) data.upazila = payload.upazila;
  if (payload.nid !== void 0) data.nid = payload.nid;
  if (payload.farmSizeAcre !== void 0) data.farmSizeAcre = payload.farmSizeAcre;
  const updated = await prisma.farmerProfile.update({
    where: { userId },
    data,
    select: farmerProfileSelect
  });
  return toFarmerProfile(updated);
};
var farmerService = {
  createFarmerProfileDb,
  getFarmerProfileFromDb,
  updateFarmerProfileDb
};

// src/modules/farmer/farmer.controller.ts
var createFarmerProfile = catchAsync(async (req, res) => {
  const current = req.user;
  const profile = await farmerService.createFarmerProfileDb(
    current.id,
    current.role,
    req.body
  );
  sendResponse(res, {
    statusCode: 201,
    message: "Farming profile created successfully",
    data: profile
  });
});
var getFarmerProfile = catchAsync(async (req, res) => {
  const current = req.user;
  const profile = await farmerService.getFarmerProfileFromDb(current.id, current.role);
  sendResponse(res, {
    statusCode: 200,
    message: "Farming profile retrieved successfully",
    data: profile
  });
});
var updateFarmerProfile = catchAsync(async (req, res) => {
  const current = req.user;
  const profile = await farmerService.updateFarmerProfileDb(
    current.id,
    current.role,
    req.body
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Farming profile updated successfully",
    data: profile
  });
});
var farmerController = {
  createFarmerProfile,
  getFarmerProfile,
  updateFarmerProfile
};

// src/modules/farmer/farmer.validation.ts
import { z as z9 } from "zod";
var district = z9.string({ error: "district is required" }).trim().min(2, { error: "district must be at least 2 characters" }).max(60, { error: "district must be at most 60 characters" });
var upazila = z9.string().trim().min(2, { error: "upazila must be at least 2 characters" }).max(60, { error: "upazila must be at most 60 characters" });
var nid = z9.string().trim().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, {
  error: "nid must be a valid Bangladeshi NID number (10, 13 or 17 digits)"
});
var farmSizeAcre = z9.coerce.number({ error: "farmSizeAcre must be a number" }).positive({ error: "farmSizeAcre must be greater than zero" }).max(999999, { error: "farmSizeAcre is unrealistically large" });
var createFarmerProfileSchema = z9.object({
  body: z9.object({
    district,
    upazila: upazila.optional(),
    nid: nid.optional(),
    farmSizeAcre: farmSizeAcre.optional()
  }).strict()
});
var updateFarmerProfileSchema = z9.object({
  body: z9.object({
    district: district.optional(),
    upazila: upazila.optional(),
    nid: nid.optional(),
    farmSizeAcre: farmSizeAcre.optional()
  }).strict().refine((body) => Object.values(body).some((value) => value !== void 0), {
    error: "Provide at least one field to update"
  })
});

// src/modules/farmer/farmer.route.ts
var router6 = Router6();
router6.post(
  "/",
  auth,
  validateRequest(createFarmerProfileSchema),
  farmerController.createFarmerProfile
);
router6.get("/", auth, farmerController.getFarmerProfile);
router6.patch(
  "/",
  auth,
  validateRequest(updateFarmerProfileSchema),
  farmerController.updateFarmerProfile
);
var farmerRoute = router6;

// src/modules/inspection/inspection.route.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get(
  "/",
  auth,
  authorize("ADMIN"),
  validateRequest(listInspectionsSchema),
  inspectionController.getInspections
);
router7.get(
  "/:id",
  auth,
  validateRequest(inspectionIdSchema),
  inspectionController.getInspectionById
);
var inspectionRoute = router7;

// src/modules/owner/owner.route.ts
import { Router as Router8 } from "express";

// src/modules/owner/owner.service.ts
var ownerProfileSelect = {
  id: true,
  businessName: true,
  tradeLicenseNo: true,
  nid: true,
  district: true,
  address: true,
  createdAt: true,
  updatedAt: true
};
var assertWarehouseOwner2 = (role) => {
  if (role !== "WAREHOUSE_OWNER") {
    throw new AppError(403, "Only warehouse owners have a business profile");
  }
};
var createOwnerProfileDb = async (userId, role, payload) => {
  assertWarehouseOwner2(role);
  const existing = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (existing) {
    throw new AppError(
      409,
      "Your warehouse owner profile already exists. Use PATCH /api/v1/users/me/owner-profile to update it."
    );
  }
  return prisma.ownerProfile.create({
    data: { userId, ...payload },
    select: ownerProfileSelect
  });
};
var getOwnerProfileFromDb = async (userId, role) => {
  assertWarehouseOwner2(role);
  const profile = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: ownerProfileSelect
  });
  if (!profile) {
    throw new AppError(404, "You have not created your warehouse owner profile yet");
  }
  return profile;
};
var updateOwnerProfileDb = async (userId, role, payload) => {
  assertWarehouseOwner2(role);
  const existing = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!existing) {
    throw new AppError(
      404,
      "You have not created your warehouse owner profile yet. Use POST /api/v1/users/me/owner-profile first."
    );
  }
  const data = {};
  if (payload.businessName !== void 0) data.businessName = payload.businessName;
  if (payload.tradeLicenseNo !== void 0) data.tradeLicenseNo = payload.tradeLicenseNo;
  if (payload.nid !== void 0) data.nid = payload.nid;
  if (payload.district !== void 0) data.district = payload.district;
  if (payload.address !== void 0) data.address = payload.address;
  return prisma.ownerProfile.update({
    where: { userId },
    data,
    select: ownerProfileSelect
  });
};
var ownerService = {
  createOwnerProfileDb,
  getOwnerProfileFromDb,
  updateOwnerProfileDb
};

// src/modules/owner/owner.controller.ts
var createOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user;
  const profile = await ownerService.createOwnerProfileDb(
    current.id,
    current.role,
    req.body
  );
  sendResponse(res, {
    statusCode: 201,
    message: "Warehouse owner profile created. You can now list warehouses.",
    data: profile
  });
});
var getOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user;
  const profile = await ownerService.getOwnerProfileFromDb(current.id, current.role);
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse owner profile retrieved successfully",
    data: profile
  });
});
var updateOwnerProfile = catchAsync(async (req, res) => {
  const current = req.user;
  const profile = await ownerService.updateOwnerProfileDb(
    current.id,
    current.role,
    req.body
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse owner profile updated successfully",
    data: profile
  });
});
var ownerController = {
  createOwnerProfile,
  getOwnerProfile,
  updateOwnerProfile
};

// src/modules/owner/owner.validation.ts
import { z as z10 } from "zod";
var businessName = z10.string({ error: "businessName is required" }).trim().min(2, { error: "businessName must be at least 2 characters" }).max(120, { error: "businessName must be at most 120 characters" });
var tradeLicenseNo = z10.string({ error: "tradeLicenseNo is required" }).trim().min(4, { error: "tradeLicenseNo must be at least 4 characters" }).max(40, { error: "tradeLicenseNo must be at most 40 characters" });
var nid2 = z10.string({ error: "nid is required" }).trim().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, {
  error: "nid must be a valid Bangladeshi NID number (10, 13 or 17 digits)"
});
var district2 = z10.string({ error: "district is required" }).trim().min(2, { error: "district must be at least 2 characters" }).max(60, { error: "district must be at most 60 characters" });
var address = z10.string({ error: "address is required" }).trim().min(5, { error: "address must be at least 5 characters" }).max(255, { error: "address must be at most 255 characters" });
var createOwnerProfileSchema = z10.object({
  body: z10.object({ businessName, tradeLicenseNo, nid: nid2, district: district2, address }).strict()
});
var updateOwnerProfileSchema = z10.object({
  body: z10.object({
    businessName: businessName.optional(),
    tradeLicenseNo: tradeLicenseNo.optional(),
    nid: nid2.optional(),
    district: district2.optional(),
    address: address.optional()
  }).strict().refine((body) => Object.values(body).some((value) => value !== void 0), {
    error: "Provide at least one field to update"
  })
});

// src/modules/owner/owner.route.ts
var router8 = Router8();
router8.post(
  "/",
  auth,
  validateRequest(createOwnerProfileSchema),
  ownerController.createOwnerProfile
);
router8.get("/", auth, ownerController.getOwnerProfile);
router8.patch(
  "/",
  auth,
  validateRequest(updateOwnerProfileSchema),
  ownerController.updateOwnerProfile
);
var ownerRoute = router8;

// src/lib/stripe.ts
import Stripe from "stripe";
var stripe = new Stripe(env.STRIPE_SECRET_KEY);

// src/modules/payment/payment.service.ts
var STRIPE_MINIMUM_USD_CENTS = 50;
var paymentSelect = {
  id: true,
  bookingId: true,
  amount: true,
  currency: true,
  amountBdt: true,
  fxRate: true,
  provider: true,
  status: true,
  paidAt: true,
  refundedAt: true,
  createdAt: true,
  farmerId: true,
  stripePaymentIntentId: true,
  booking: { select: { lotCode: true } }
};
var toPayment = (row) => ({
  id: row.id,
  bookingId: row.bookingId,
  lotCode: row.booking.lotCode,
  amount: Number(row.amount),
  currency: row.currency,
  amountBdt: Number(row.amountBdt),
  fxRate: Number(row.fxRate),
  provider: row.provider,
  status: row.status,
  paidAt: row.paidAt,
  refundedAt: row.refundedAt,
  createdAt: row.createdAt
});
var toUsdCents = (amountBdt) => Math.round(amountBdt * env.DEMO_FX_RATE * 100);
var createCheckoutSessionDb = async (farmerId, bookingId) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      id: true,
      lotCode: true,
      status: true,
      farmerId: true,
      quantityKg: true,
      estimatedCost: true,
      holdExpiresAt: true,
      cropType: { select: { name: true } },
      chamber: { select: { name: true, warehouse: { select: { name: true } } } }
    }
  });
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }
  if (booking.farmerId !== farmerId) {
    throw new AppError(403, "You can only pay for your own bookings");
  }
  if (booking.status !== "APPROVED") {
    throw new AppError(
      409,
      `Only an APPROVED booking can be paid for. This one is ${booking.status}.`
    );
  }
  if (booking.holdExpiresAt !== null && booking.holdExpiresAt.getTime() < Date.now()) {
    throw new AppError(409, "The payment hold on this booking has expired. Ask for re-approval.");
  }
  const existing = await prisma.payment.findUnique({
    where: { bookingId },
    select: { id: true, status: true }
  });
  if (existing?.status === "SUCCEEDED") {
    throw new AppError(409, "This booking has already been paid for");
  }
  const amountBdt = Number(booking.estimatedCost);
  const usdCents = toUsdCents(amountBdt);
  if (usdCents < STRIPE_MINIMUM_USD_CENTS) {
    throw new AppError(
      422,
      `This booking is too small to charge. Stripe requires at least ${STRIPE_MINIMUM_USD_CENTS} cents, this is ${usdCents}.`
    );
  }
  const payment = existing === null ? await prisma.payment.create({
    data: {
      bookingId,
      farmerId,
      amount: usdCents / 100,
      currency: "usd",
      amountBdt,
      fxRate: env.DEMO_FX_RATE
    },
    select: { id: true }
  }) : await prisma.payment.update({
    where: { id: existing.id },
    data: {
      amount: usdCents / 100,
      amountBdt,
      fxRate: env.DEMO_FX_RATE,
      status: "PENDING"
    },
    select: { id: true }
  });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: usdCents,
          product_data: {
            name: `Cold storage - Lot ${booking.lotCode}`,
            description: `${booking.quantityKg}kg of ${booking.cropType.name} in ${booking.chamber.warehouse.name} / ${booking.chamber.name}`
          }
        }
      }
    ],
    metadata: { bookingId, paymentId: payment.id },
    success_url: `${env.APP_URL}/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/api/v1/payments/cancel`
  });
  if (session.url === null) {
    throw new AppError(502, "Stripe did not return a checkout URL");
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id }
  });
  return {
    paymentId: payment.id,
    sessionId: session.id,
    checkoutUrl: session.url,
    amountBdt,
    amountUsd: usdCents / 100,
    fxRate: env.DEMO_FX_RATE,
    expiresAt: session.expires_at === null ? null : new Date(session.expires_at * 1e3)
  };
};
var constructWebhookEvent = (rawBody, signature) => {
  if (!isStripeWebhookConfigured) {
    throw new AppError(
      503,
      "Stripe webhook secret is not configured, so payment events cannot be verified"
    );
  }
  if (signature === void 0) {
    throw new AppError(400, "Missing stripe-signature header");
  }
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new AppError(400, `Invalid webhook signature: ${message}`);
  }
};
var markPaymentSucceeded = async (session) => {
  const paymentId = session.metadata?.paymentId;
  const bookingId = session.metadata?.bookingId;
  if (paymentId === void 0 || bookingId === void 0) {
    return;
  }
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: {
        status: "SUCCEEDED",
        paidAt: /* @__PURE__ */ new Date(),
        ...paymentIntentId === null ? {} : { stripePaymentIntentId: paymentIntentId }
      }
    });
    if (updated.count === 0) {
      return;
    }
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { status: true }
    });
    if (booking?.status === "APPROVED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "PAID" }
      });
      await writeAuditLog(tx, {
        actorId: null,
        action: "PAYMENT_SUCCEEDED",
        entityType: "Booking",
        entityId: bookingId,
        before: { status: booking.status },
        after: { status: "PAID", paymentId }
      });
      return;
    }
    await writeAuditLog(tx, {
      actorId: null,
      action: "PAYMENT_SUCCEEDED_WITHOUT_BOOKING",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking?.status ?? "MISSING" },
      after: { paymentId, needsManualRefund: true }
    });
  });
};
var markPaymentFailed = async (paymentId, bookingId, reason2) => {
  if (paymentId === void 0) {
    return;
  }
  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "FAILED" }
    });
    if (updated.count === 0 || bookingId === void 0) {
      return;
    }
    await writeAuditLog(tx, {
      actorId: null,
      action: "PAYMENT_FAILED",
      entityType: "Booking",
      entityId: bookingId,
      after: { paymentId, reason: reason2 }
    });
  });
};
var handleWebhookEvent = async (event) => {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      await markPaymentSucceeded(session);
      return "payment recorded";
    }
    return "session completed but not paid";
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await markPaymentFailed(
      session.metadata?.paymentId,
      session.metadata?.bookingId,
      "Checkout session expired"
    );
    return "session expiry recorded";
  }
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    await markPaymentFailed(
      intent.metadata?.paymentId,
      intent.metadata?.bookingId,
      intent.last_payment_error?.message ?? "Payment failed"
    );
    return "payment failure recorded";
  }
  return `ignored ${event.type}`;
};
var getPaymentStatusBySessionId = async (sessionId) => {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    select: paymentSelect
  });
  if (!payment) {
    throw new AppError(404, "No payment found for that checkout session");
  }
  return toPayment(payment);
};
var getMyPaymentsFromDb = async (farmerId, filters) => {
  const pagination = buildPagination(filters, ["createdAt"], "createdAt");
  const where = {
    farmerId,
    ...filters.status === void 0 ? {} : { status: filters.status }
  };
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.payment.count({ where })
  ]);
  return { data: rows.map(toPayment), meta: buildMeta(pagination.page, pagination.limit, total) };
};
var getPaymentByIdFromDb = async (id, actor) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: paymentSelect
  });
  if (!payment) {
    throw new AppError(404, "Payment not found");
  }
  if (actor.role !== "ADMIN" && payment.farmerId !== actor.id) {
    throw new AppError(403, "You do not have access to this payment");
  }
  return toPayment(payment);
};
var refundPaymentDb = async (paymentId, adminId, reason2, ip) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: paymentSelect
  });
  if (!payment) {
    throw new AppError(404, "Payment not found");
  }
  if (payment.status === "REFUNDED") {
    throw new AppError(409, "This payment has already been refunded");
  }
  if (payment.status !== "SUCCEEDED") {
    throw new AppError(
      409,
      `Only a SUCCEEDED payment can be refunded. This one is ${payment.status}.`
    );
  }
  if (payment.stripePaymentIntentId === null) {
    throw new AppError(
      409,
      "This payment has no Stripe payment intent recorded and cannot be refunded automatically"
    );
  }
  try {
    await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe error";
    throw new AppError(502, `Stripe refused the refund: ${message}`);
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED", refundedAt: /* @__PURE__ */ new Date() },
      select: paymentSelect
    });
    await writeAuditLog(tx, {
      actorId: adminId,
      action: "PAYMENT_REFUNDED",
      entityType: "Payment",
      entityId: paymentId,
      before: { status: payment.status },
      after: { status: updated.status, reason: reason2 ?? null },
      ip
    });
    return toPayment(updated);
  });
};
var paymentService = {
  createCheckoutSessionDb,
  constructWebhookEvent,
  handleWebhookEvent,
  getPaymentStatusBySessionId,
  getMyPaymentsFromDb,
  getPaymentByIdFromDb,
  refundPaymentDb
};

// src/modules/payment/payment.controller.ts
var createCheckoutSession = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const data = await paymentService.createCheckoutSessionDb(req.user.id, bookingId);
  sendResponse(res, {
    statusCode: 201,
    message: "Checkout session created. Open checkoutUrl to pay.",
    data
  });
});
var handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const event = paymentService.constructWebhookEvent(
    req.body,
    typeof signature === "string" ? signature : void 0
  );
  const outcome = await paymentService.handleWebhookEvent(event);
  res.status(200).json({ received: true, type: event.type, outcome });
});
var paymentSuccess = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new AppError(400, "session_id is required");
  }
  const data = await paymentService.getPaymentStatusBySessionId(sessionId);
  const message = data.status === "SUCCEEDED" ? "Payment confirmed. Your lot is booked." : "Payment received by Stripe. Waiting for confirmation, refresh in a moment.";
  sendResponse(res, { statusCode: 200, message, data });
});
var paymentCancel = catchAsync(async (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    message: "Payment cancelled. The booking is still held until the hold expires."
  });
});
var getMyPayments = catchAsync(async (req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await paymentService.getMyPaymentsFromDb(req.user.id, filters);
  sendResponse(res, { statusCode: 200, message: "Payments retrieved successfully", data, meta });
});
var getPaymentById = catchAsync(async (req, res) => {
  const data = await paymentService.getPaymentByIdFromDb(String(req.params.id), {
    id: req.user.id,
    role: req.user.role
  });
  sendResponse(res, { statusCode: 200, message: "Payment retrieved successfully", data });
});
var refundPayment = catchAsync(async (req, res) => {
  const { reason: reason2 } = req.body;
  const data = await paymentService.refundPaymentDb(
    String(req.params.id),
    req.user.id,
    reason2,
    req.ip
  );
  sendResponse(res, {
    statusCode: 200,
    message: `Payment refunded. ${data.amountBdt} BDT will return to the farmer.`,
    data
  });
});
var paymentController = {
  createCheckoutSession,
  handleWebhook,
  paymentSuccess,
  paymentCancel,
  getMyPayments,
  getPaymentById,
  refundPayment
};

// src/modules/payment/payment.route.ts
import { Router as Router9 } from "express";

// src/modules/payment/payment.validation.ts
import { z as z11 } from "zod";
var PAYMENT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"];
var createCheckoutSessionSchema = z11.object({
  body: z11.object({
    bookingId: z11.uuid({ error: "bookingId must be a valid uuid" })
  }).strict()
});
var listPaymentsSchema = z11.object({
  query: z11.object({
    status: z11.enum(PAYMENT_STATUSES).optional(),
    sortOrder: z11.enum(["asc", "desc"]).optional(),
    page: z11.coerce.number().int().positive().optional(),
    limit: z11.coerce.number().int().positive().max(100).optional()
  }).strict()
});
var paymentIdSchema = z11.object({
  params: z11.object({ id: z11.uuid({ error: "id must be a valid uuid" }) })
});
var refundPaymentSchema = z11.object({
  params: z11.object({ id: z11.uuid({ error: "id must be a valid uuid" }) }),
  body: z11.object({
    reason: z11.string().trim().min(3).max(255).optional()
  }).strict()
});

// src/modules/payment/payment.route.ts
var router9 = Router9();
router9.get("/success", paymentController.paymentSuccess);
router9.get("/cancel", paymentController.paymentCancel);
router9.post(
  "/checkout-session",
  auth,
  authorize("FARMER"),
  paymentLimiter,
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession
);
router9.get(
  "/me",
  auth,
  authorize("FARMER"),
  validateRequest(listPaymentsSchema),
  paymentController.getMyPayments
);
router9.get("/:id", auth, validateRequest(paymentIdSchema), paymentController.getPaymentById);
router9.post(
  "/:id/refund",
  auth,
  authorize("ADMIN"),
  validateRequest(refundPaymentSchema),
  paymentController.refundPayment
);
var paymentRoute = router9;

// src/modules/review/review.route.ts
import { Router as Router10 } from "express";

// src/modules/warehouse/warehouse.validation.ts
import { z as z12 } from "zod";
var WAREHOUSE_SORT_FIELDS = ["createdAt", "name", "ratePerKgPerDay", "avgRating"];
var name3 = z12.string({ error: "name is required" }).trim().min(3, { error: "name must be at least 3 characters" }).max(120, { error: "name must be at most 120 characters" });
var district3 = z12.string({ error: "district is required" }).trim().min(2, { error: "district must be at least 2 characters" }).max(60, { error: "district must be at most 60 characters" });
var address2 = z12.string({ error: "address is required" }).trim().min(5, { error: "address must be at least 5 characters" }).max(255, { error: "address must be at most 255 characters" });
var licenseNo = z12.string({ error: "licenseNo is required" }).trim().min(4, { error: "licenseNo must be at least 4 characters" }).max(40, { error: "licenseNo must be at most 40 characters" });
var ratePerKgPerDay = z12.coerce.number({ error: "ratePerKgPerDay must be a number" }).positive({ error: "ratePerKgPerDay must be greater than zero" }).max(1e3, { error: "ratePerKgPerDay is unrealistically high" });
var minBookingDays = z12.coerce.number({ error: "minBookingDays must be a number" }).int({ error: "minBookingDays must be a whole number" }).min(1, { error: "minBookingDays must be at least 1" }).max(365, { error: "minBookingDays cannot exceed 365" });
var listWarehousesSchema = z12.object({
  query: z12.object({
    search: z12.string().trim().min(1).optional(),
    district: z12.string().trim().min(1).optional(),
    cropTypeId: z12.uuid({ error: "cropTypeId must be a valid uuid" }).optional(),
    minCapacityKg: z12.coerce.number().int().positive().optional(),
    minRate: z12.coerce.number().nonnegative().optional(),
    maxRate: z12.coerce.number().positive().optional(),
    minRating: z12.coerce.number().min(1).max(5).optional(),
    sortBy: z12.enum(WAREHOUSE_SORT_FIELDS).optional(),
    sortOrder: z12.enum(["asc", "desc"]).optional(),
    page: z12.coerce.number().int().positive().optional(),
    limit: z12.coerce.number().int().positive().max(100).optional()
  }).strict().refine(
    (query) => query.minRate === void 0 || query.maxRate === void 0 || query.maxRate >= query.minRate,
    { error: "maxRate must be greater than or equal to minRate", path: ["maxRate"] }
  )
});
var createWarehouseSchema = z12.object({
  body: z12.object({
    name: name3,
    district: district3,
    address: address2,
    licenseNo,
    ratePerKgPerDay,
    minBookingDays: minBookingDays.optional()
  }).strict()
});
var updateWarehouseSchema = z12.object({
  params: z12.object({ id: z12.uuid({ error: "id must be a valid uuid" }) }),
  body: z12.object({
    name: name3.optional(),
    district: district3.optional(),
    address: address2.optional(),
    licenseNo: licenseNo.optional(),
    ratePerKgPerDay: ratePerKgPerDay.optional(),
    minBookingDays: minBookingDays.optional(),
    status: z12.undefined({
      error: "Warehouse status is set by an admin, not by the owner"
    }).optional()
  }).strict().refine((body) => Object.values(body).some((value) => value !== void 0), {
    error: "Provide at least one field to update"
  })
});
var warehouseIdSchema = z12.object({
  params: z12.object({ id: z12.uuid({ error: "id must be a valid uuid" }) })
});
var listMyWarehousesSchema = z12.object({
  query: z12.object({
    status: z12.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
    sortBy: z12.enum(WAREHOUSE_SORT_FIELDS).optional(),
    sortOrder: z12.enum(["asc", "desc"]).optional(),
    page: z12.coerce.number().int().positive().optional(),
    limit: z12.coerce.number().int().positive().max(100).optional()
  }).strict()
});
var warehouseReviewsSchema = z12.object({
  params: z12.object({ warehouseId: z12.uuid({ error: "warehouseId must be a valid uuid" }) }),
  query: z12.object({
    page: z12.coerce.number().int().positive().optional(),
    limit: z12.coerce.number().int().positive().max(100).optional(),
    sortOrder: z12.enum(["asc", "desc"]).optional()
  }).strict()
});

// src/modules/review/review.service.ts
var reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  farmer: { select: { id: true, name: true } }
};
var recomputeWarehouseRating = async (tx, warehouseId) => {
  const stats = await tx.review.aggregate({
    where: { warehouseId, deletedAt: null },
    _avg: { rating: true },
    _count: true
  });
  await tx.warehouse.update({
    where: { id: warehouseId },
    data: {
      avgRating: stats._avg.rating,
      reviewCount: stats._count
    }
  });
};
var getWarehouseReviewsFromDb = async (warehouseId, filters) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
  const pagination = buildPagination(filters, ["createdAt"], "createdAt");
  const where = { warehouseId, deletedAt: null };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: reviewSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.review.count({ where })
  ]);
  return {
    data: rows,
    meta: buildMeta(pagination.page, pagination.limit, total)
  };
};
var createReviewDb = async (farmerId, payload, ip) => {
  const booking = await prisma.booking.findFirst({
    where: { id: payload.bookingId, deletedAt: null },
    select: {
      id: true,
      status: true,
      farmerId: true,
      chamber: { select: { warehouseId: true } }
    }
  });
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }
  if (booking.farmerId !== farmerId) {
    throw new AppError(403, "You can only review your own bookings");
  }
  if (booking.status !== "COMPLETED") {
    throw new AppError(
      409,
      `You can only review a COMPLETED booking. This one is ${booking.status}.`
    );
  }
  const existing = await prisma.review.findUnique({
    where: { bookingId: payload.bookingId },
    select: { id: true, deletedAt: true }
  });
  if (existing !== null && existing.deletedAt === null) {
    throw new AppError(409, "You have already reviewed this booking");
  }
  const warehouseId = booking.chamber.warehouseId;
  const created = await prisma.$transaction(async (tx) => {
    const review = existing === null ? await tx.review.create({
      data: {
        bookingId: payload.bookingId,
        farmerId,
        warehouseId,
        rating: payload.rating,
        comment: payload.comment ?? null
      },
      select: reviewSelect
    }) : await tx.review.update({
      where: { id: existing.id },
      data: {
        rating: payload.rating,
        comment: payload.comment ?? null,
        deletedAt: null
      },
      select: reviewSelect
    });
    await recomputeWarehouseRating(tx, warehouseId);
    await writeAuditLog(tx, {
      actorId: farmerId,
      action: "REVIEW_CREATED",
      entityType: "Review",
      entityId: review.id,
      after: { rating: payload.rating, warehouseId, bookingId: payload.bookingId },
      ip
    });
    return review;
  });
  await invalidateReviewCache(warehouseId);
  return created;
};
var updateReviewDb = async (reviewId, actor, payload, ip) => {
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, deletedAt: null },
    select: { id: true, farmerId: true, warehouseId: true, rating: true }
  });
  if (!existing) {
    throw new AppError(404, "Review not found");
  }
  if (existing.farmerId !== actor.id) {
    throw new AppError(403, "You can only edit your own review");
  }
  const data = {};
  if (payload.rating !== void 0) data.rating = payload.rating;
  if (payload.comment !== void 0) data.comment = payload.comment;
  const updated = await prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: { id: reviewId },
      data,
      select: reviewSelect
    });
    await recomputeWarehouseRating(tx, existing.warehouseId);
    await writeAuditLog(tx, {
      actorId: actor.id,
      action: "REVIEW_UPDATED",
      entityType: "Review",
      entityId: reviewId,
      before: { rating: existing.rating },
      after: { rating: review.rating },
      ip
    });
    return review;
  });
  await invalidateReviewCache(existing.warehouseId);
  return updated;
};
var softDeleteReviewDb = async (reviewId, actor, ip) => {
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, deletedAt: null },
    select: { id: true, farmerId: true, warehouseId: true, rating: true }
  });
  if (!existing) {
    throw new AppError(404, "Review not found");
  }
  if (actor.role !== "ADMIN" && existing.farmerId !== actor.id) {
    throw new AppError(403, "You can only delete your own review");
  }
  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: reviewId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
    await recomputeWarehouseRating(tx, existing.warehouseId);
    await writeAuditLog(tx, {
      actorId: actor.id,
      action: "REVIEW_DELETED",
      entityType: "Review",
      entityId: reviewId,
      before: { rating: existing.rating },
      ip
    });
  });
  await invalidateReviewCache(existing.warehouseId);
};
var reviewService = {
  getWarehouseReviewsFromDb,
  createReviewDb,
  updateReviewDb,
  softDeleteReviewDb
};

// src/modules/review/review.controller.ts
var getWarehouseReviews = catchAsync(async (req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await reviewService.getWarehouseReviewsFromDb(
    String(req.params.warehouseId),
    filters
  );
  sendResponse(res, { statusCode: 200, message: "Reviews retrieved successfully", data, meta });
});
var createReview = catchAsync(async (req, res) => {
  const data = await reviewService.createReviewDb(
    req.user.id,
    req.body,
    req.ip
  );
  sendResponse(res, { statusCode: 201, message: "Review submitted successfully", data });
});
var updateReview = catchAsync(async (req, res) => {
  const data = await reviewService.updateReviewDb(
    String(req.params.id),
    { id: req.user.id, role: req.user.role },
    req.body,
    req.ip
  );
  sendResponse(res, { statusCode: 200, message: "Review updated successfully", data });
});
var deleteReview = catchAsync(async (req, res) => {
  await reviewService.softDeleteReviewDb(
    String(req.params.id),
    { id: req.user.id, role: req.user.role },
    req.ip
  );
  sendResponse(res, { statusCode: 200, message: "Review deleted successfully" });
});
var reviewController = {
  getWarehouseReviews,
  createReview,
  updateReview,
  deleteReview
};

// src/modules/review/review.validation.ts
import { z as z13 } from "zod";
var rating = z13.coerce.number({ error: "rating must be a number" }).int({ error: "rating must be a whole number" }).min(1, { error: "rating must be between 1 and 5" }).max(5, { error: "rating must be between 1 and 5" });
var comment = z13.string().trim().min(3, { error: "comment must be at least 3 characters" }).max(1e3, { error: "comment must be at most 1000 characters" });
var createReviewSchema = z13.object({
  body: z13.object({
    bookingId: z13.uuid({ error: "bookingId must be a valid uuid" }),
    rating,
    comment: comment.optional()
  }).strict()
});
var updateReviewSchema = z13.object({
  params: z13.object({ id: z13.uuid({ error: "id must be a valid uuid" }) }),
  body: z13.object({
    rating: rating.optional(),
    comment: comment.optional()
  }).strict().refine((body) => body.rating !== void 0 || body.comment !== void 0, {
    error: "Provide at least one field to update: rating or comment"
  })
});
var reviewIdSchema = z13.object({
  params: z13.object({ id: z13.uuid({ error: "id must be a valid uuid" }) })
});

// src/modules/review/review.route.ts
var nestedRouter2 = Router10({ mergeParams: true });
nestedRouter2.get(
  "/",
  validateRequest(warehouseReviewsSchema),
  cacheResponse(
    CACHE_TTL.warehouseReviews,
    (req) => cacheKeys.warehouseReviews(String(req.params.warehouseId), queryOf(req))
  ),
  reviewController.getWarehouseReviews
);
var router10 = Router10();
router10.post(
  "/",
  auth,
  authorize("FARMER"),
  validateRequest(createReviewSchema),
  reviewController.createReview
);
router10.patch(
  "/:id",
  auth,
  authorize("FARMER"),
  validateRequest(updateReviewSchema),
  reviewController.updateReview
);
router10.delete(
  "/:id",
  auth,
  authorize("FARMER", "ADMIN"),
  validateRequest(reviewIdSchema),
  reviewController.deleteReview
);
var warehouseReviewRoute = nestedRouter2;
var reviewRoute = router10;

// src/modules/user/user.route.ts
import { Router as Router11 } from "express";

// src/modules/user/user.service.ts
import bcrypt2 from "bcrypt";
var getMeFromDb = async (userId) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: publicUserSelect
  });
  if (!user) {
    throw new AppError(404, "Account not found");
  }
  return toPublicUser(user);
};
var updateMeDb = async (userId, payload) => {
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true }
  });
  if (!existing) {
    throw new AppError(404, "Account not found");
  }
  const data = {};
  if (payload.name !== void 0) {
    data.name = payload.name;
  }
  if (payload.phone !== void 0) {
    data.phone = payload.phone;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: publicUserSelect
  });
  return toPublicUser(user);
};
var deleteMeDb = async (userId, password) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, password: true }
  });
  if (!user) {
    throw new AppError(404, "Account not found");
  }
  if (user.password !== null) {
    if (password === void 0) {
      throw new AppError(400, "Confirm your password to delete this account");
    }
    const matches2 = await bcrypt2.compare(password, user.password);
    if (!matches2) {
      throw new AppError(401, "Password is incorrect");
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: /* @__PURE__ */ new Date() }
  });
};
var getDashboardFromDb = async (userId, role) => {
  if (role === "FARMER") {
    const [totalBookings2, activeBookings, completedBookings, payments, profile] = await Promise.all(
      [
        prisma.booking.count({ where: { farmerId: userId, deletedAt: null } }),
        prisma.booking.count({
          where: { farmerId: userId, deletedAt: null, status: { in: ["PAID", "STORED"] } }
        }),
        prisma.booking.count({ where: { farmerId: userId, deletedAt: null, status: "COMPLETED" } }),
        prisma.payment.aggregate({
          where: { farmerId: userId, status: "SUCCEEDED" },
          _sum: { amountBdt: true }
        }),
        prisma.farmerProfile.findUnique({ where: { userId }, select: { id: true } })
      ]
    );
    return {
      role,
      profileComplete: profile !== null,
      totalBookings: totalBookings2,
      activeBookings,
      completedBookings,
      totalSpentBdt: Number(payments._sum.amountBdt ?? 0)
    };
  }
  if (role === "WAREHOUSE_OWNER") {
    const [totalWarehouses, approvedWarehouses, totalChambers, pendingBookings, profile] = await Promise.all([
      prisma.warehouse.count({ where: { ownerId: userId, deletedAt: null } }),
      prisma.warehouse.count({
        where: { ownerId: userId, deletedAt: null, status: "APPROVED" }
      }),
      prisma.chamber.count({
        where: { deletedAt: null, warehouse: { ownerId: userId, deletedAt: null } }
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: "PENDING_APPROVAL",
          chamber: { warehouse: { ownerId: userId } }
        }
      }),
      prisma.ownerProfile.findUnique({ where: { userId }, select: { id: true } })
    ]);
    return {
      role,
      profileComplete: profile !== null,
      totalWarehouses,
      approvedWarehouses,
      totalChambers,
      bookingsAwaitingApproval: pendingBookings
    };
  }
  const [totalUsers, pendingWarehouses, totalBookings, revenue] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.warehouse.count({ where: { deletedAt: null, status: "PENDING" } }),
    prisma.booking.count({ where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountBdt: true } })
  ]);
  return {
    role,
    profileComplete: true,
    totalUsers,
    warehousesAwaitingApproval: pendingWarehouses,
    totalBookings,
    platformRevenueBdt: Number(revenue._sum.amountBdt ?? 0)
  };
};
var userService = {
  getMeFromDb,
  updateMeDb,
  deleteMeDb,
  getDashboardFromDb
};

// src/modules/user/user.controller.ts
var getMe = catchAsync(async (req, res) => {
  const user = await userService.getMeFromDb(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    message: "Profile retrieved successfully",
    data: user
  });
});
var updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateMeDb(req.user.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    message: "Profile updated successfully",
    data: user
  });
});
var deleteMe = catchAsync(async (req, res) => {
  const { password } = req.body ?? {};
  await userService.deleteMeDb(req.user.id, password);
  sendResponse(res, {
    statusCode: 200,
    message: "Account deleted successfully"
  });
});
var getDashboard = catchAsync(async (req, res) => {
  const current = req.user;
  const data = await userService.getDashboardFromDb(current.id, current.role);
  sendResponse(res, {
    statusCode: 200,
    message: "Dashboard retrieved successfully",
    data
  });
});
var userController = {
  getMe,
  updateMe,
  deleteMe,
  getDashboard
};

// src/modules/user/user.validation.ts
import { z as z14 } from "zod";
var BANGLADESHI_PHONE2 = /^(?:\+?880|0)1[3-9]\d{8}$/;
var updateMeSchema = z14.object({
  body: z14.object({
    name: z14.string().trim().min(2, { error: "name must be at least 2 characters" }).max(80, { error: "name must be at most 80 characters" }).optional(),
    phone: z14.string().trim().regex(BANGLADESHI_PHONE2, {
      error: "phone must be a valid Bangladeshi number, e.g. 01712345678"
    }).optional(),
    email: z14.undefined({
      error: "Email cannot be changed. It is the permanent identifier for your account."
    }).optional(),
    role: z14.undefined({ error: "Role cannot be changed through this endpoint" }).optional(),
    status: z14.undefined({ error: "Account status can only be changed by an admin" }).optional()
  }).strict().refine((body) => body.name !== void 0 || body.phone !== void 0, {
    error: "Provide at least one field to update: name or phone"
  })
});
var deleteMeSchema = z14.object({
  body: z14.object({
    password: z14.string().min(1, { error: "password is required to delete your account" }).optional()
  }).strict()
});

// src/modules/user/user.route.ts
var router11 = Router11();
router11.get("/me", auth, userController.getMe);
router11.patch("/me", auth, validateRequest(updateMeSchema), userController.updateMe);
router11.delete("/me", auth, validateRequest(deleteMeSchema), userController.deleteMe);
router11.get("/me/dashboard", auth, userController.getDashboard);
var userRoute = router11;

// src/modules/warehouse/warehouse.route.ts
import { Router as Router12 } from "express";

// src/modules/warehouse/warehouse.service.ts
var warehouseSelect = {
  id: true,
  name: true,
  district: true,
  address: true,
  licenseNo: true,
  ratePerKgPerDay: true,
  minBookingDays: true,
  status: true,
  avgRating: true,
  reviewCount: true,
  createdAt: true,
  chambers: {
    where: { deletedAt: null, isActive: true },
    select: { capacityKg: true }
  }
};
var toSummary = (row) => ({
  id: row.id,
  name: row.name,
  district: row.district,
  address: row.address,
  ratePerKgPerDay: Number(row.ratePerKgPerDay),
  minBookingDays: row.minBookingDays,
  status: row.status,
  avgRating: row.avgRating === null ? null : Number(row.avgRating),
  reviewCount: row.reviewCount,
  chamberCount: row.chambers.length,
  totalCapacityKg: row.chambers.reduce((sum, chamber) => sum + chamber.capacityKg, 0),
  createdAt: row.createdAt
});
var buildChamberFilter = async (filters) => {
  const chamberWhere = { deletedAt: null, isActive: true };
  let applied = false;
  if (filters.minCapacityKg !== void 0) {
    chamberWhere.capacityKg = { gte: filters.minCapacityKg };
    applied = true;
  }
  if (filters.cropTypeId !== void 0) {
    const crop = await prisma.cropType.findFirst({
      where: { id: filters.cropTypeId, deletedAt: null },
      select: { idealMinTempC: true, idealMaxTempC: true }
    });
    if (!crop) {
      throw new AppError(404, "Crop type not found");
    }
    chamberWhere.minTempC = { lte: crop.idealMinTempC };
    chamberWhere.maxTempC = { gte: crop.idealMaxTempC };
    applied = true;
  }
  return applied ? chamberWhere : void 0;
};
var getWarehousesFromDb = async (filters) => {
  const pagination = buildPagination(filters, WAREHOUSE_SORT_FIELDS, "createdAt");
  const where = { deletedAt: null, status: "APPROVED" };
  if (filters.district !== void 0) {
    where.district = { equals: filters.district, mode: "insensitive" };
  }
  if (filters.search !== void 0) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { address: { contains: filters.search, mode: "insensitive" } }
    ];
  }
  if (filters.minRate !== void 0 || filters.maxRate !== void 0) {
    where.ratePerKgPerDay = {
      ...filters.minRate === void 0 ? {} : { gte: filters.minRate },
      ...filters.maxRate === void 0 ? {} : { lte: filters.maxRate }
    };
  }
  if (filters.minRating !== void 0) {
    where.avgRating = { gte: filters.minRating };
  }
  const chamberFilter = await buildChamberFilter(filters);
  if (chamberFilter !== void 0) {
    where.chambers = { some: chamberFilter };
  }
  const [rows, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      select: warehouseSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.warehouse.count({ where })
  ]);
  return {
    data: rows.map(toSummary),
    meta: buildMeta(pagination.page, pagination.limit, total)
  };
};
var getMyWarehousesFromDb = async (ownerId, filters) => {
  const pagination = buildPagination(filters, WAREHOUSE_SORT_FIELDS, "createdAt");
  const where = {
    ownerId,
    deletedAt: null,
    ...filters.status === void 0 ? {} : { status: filters.status }
  };
  const [rows, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      select: warehouseSelect,
      orderBy: pagination.orderBy,
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.warehouse.count({ where })
  ]);
  return {
    data: rows.map(toSummary),
    meta: buildMeta(pagination.page, pagination.limit, total)
  };
};
var getWarehouseByIdFromDb = async (id) => {
  const row = await prisma.warehouse.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...warehouseSelect,
      owner: {
        select: {
          id: true,
          name: true,
          ownerProfile: { select: { businessName: true } }
        }
      }
    }
  });
  if (!row) {
    throw new AppError(404, "Warehouse not found");
  }
  const { owner, ...rest } = row;
  return {
    ...toSummary(rest),
    licenseNo: rest.licenseNo,
    owner: {
      id: owner.id,
      name: owner.name,
      businessName: owner.ownerProfile?.businessName ?? null
    }
  };
};
var assertOwnership = async (warehouseId, ownerId) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { ownerId: true }
  });
  if (!warehouse) {
    throw new AppError(404, "Warehouse not found");
  }
  if (warehouse.ownerId !== ownerId) {
    throw new AppError(403, "You can only manage warehouses that belong to you");
  }
};
var createWarehouseDb = async (ownerId, payload) => {
  const created = await prisma.warehouse.create({
    data: {
      ownerId,
      name: payload.name,
      district: payload.district,
      address: payload.address,
      licenseNo: payload.licenseNo,
      ratePerKgPerDay: payload.ratePerKgPerDay,
      ...payload.minBookingDays === void 0 ? {} : { minBookingDays: payload.minBookingDays }
    },
    select: { id: true }
  });
  await invalidateWarehouseCache();
  return getWarehouseByIdFromDb(created.id);
};
var updateWarehouseDb = async (id, ownerId, payload) => {
  await assertOwnership(id, ownerId);
  const data = {};
  if (payload.name !== void 0) data.name = payload.name;
  if (payload.district !== void 0) data.district = payload.district;
  if (payload.address !== void 0) data.address = payload.address;
  if (payload.licenseNo !== void 0) data.licenseNo = payload.licenseNo;
  if (payload.ratePerKgPerDay !== void 0) data.ratePerKgPerDay = payload.ratePerKgPerDay;
  if (payload.minBookingDays !== void 0) data.minBookingDays = payload.minBookingDays;
  await prisma.warehouse.update({ where: { id }, data });
  await invalidateWarehouseCache(id);
  return getWarehouseByIdFromDb(id);
};
var softDeleteWarehouseDb = async (id, ownerId) => {
  await assertOwnership(id, ownerId);
  const activeLots = await prisma.booking.count({
    where: {
      deletedAt: null,
      status: { in: ["PAID", "STORED", "WITHDRAW_REQUESTED"] },
      chamber: { warehouseId: id }
    }
  });
  if (activeLots > 0) {
    throw new AppError(
      409,
      `Cannot delete this warehouse while ${activeLots} lot(s) are still stored in it`
    );
  }
  const deletedAt = /* @__PURE__ */ new Date();
  await prisma.$transaction([
    prisma.chamber.updateMany({ where: { warehouseId: id, deletedAt: null }, data: { deletedAt } }),
    prisma.warehouse.update({ where: { id }, data: { deletedAt } })
  ]);
  await invalidateWarehouseCache(id);
};
var warehouseService = {
  getWarehousesFromDb,
  getMyWarehousesFromDb,
  getWarehouseByIdFromDb,
  createWarehouseDb,
  updateWarehouseDb,
  softDeleteWarehouseDb
};

// src/modules/warehouse/warehouse.controller.ts
var getWarehouses = catchAsync(async (_req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await warehouseService.getWarehousesFromDb(filters);
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouses retrieved successfully",
    data,
    meta
  });
});
var getMyWarehouses = catchAsync(async (req, res) => {
  const filters = validatedQuery(res);
  const { data, meta } = await warehouseService.getMyWarehousesFromDb(req.user.id, filters);
  sendResponse(res, {
    statusCode: 200,
    message: "Your warehouses retrieved successfully",
    data,
    meta
  });
});
var getWarehouseById = catchAsync(async (req, res) => {
  const data = await warehouseService.getWarehouseByIdFromDb(String(req.params.id));
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse retrieved successfully",
    data
  });
});
var createWarehouse = catchAsync(async (req, res) => {
  const data = await warehouseService.createWarehouseDb(
    req.user.id,
    req.body
  );
  sendResponse(res, {
    statusCode: 201,
    message: "Warehouse created. An admin must approve it before farmers can book.",
    data
  });
});
var updateWarehouse = catchAsync(async (req, res) => {
  const data = await warehouseService.updateWarehouseDb(
    String(req.params.id),
    req.user.id,
    req.body
  );
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse updated successfully",
    data
  });
});
var deleteWarehouse = catchAsync(async (req, res) => {
  await warehouseService.softDeleteWarehouseDb(String(req.params.id), req.user.id);
  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse deleted successfully"
  });
});
var warehouseController = {
  getWarehouses,
  getMyWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
};

// src/modules/warehouse/warehouse.route.ts
var router12 = Router12();
router12.get(
  "/",
  validateRequest(listWarehousesSchema),
  cacheResponse(CACHE_TTL.warehouseList, (req) => cacheKeys.warehouseList(queryOf(req))),
  warehouseController.getWarehouses
);
router12.get(
  "/me",
  auth,
  authorize("WAREHOUSE_OWNER"),
  validateRequest(listMyWarehousesSchema),
  warehouseController.getMyWarehouses
);
router12.post(
  "/",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(createWarehouseSchema),
  warehouseController.createWarehouse
);
router12.get(
  "/:id/bookings",
  auth,
  authorize("WAREHOUSE_OWNER"),
  validateRequest(warehouseBookingsSchema),
  bookingController.getWarehouseBookings
);
router12.get(
  "/:id/availability",
  validateRequest(warehouseAvailabilitySchema),
  availabilityController.getWarehouseAvailability
);
router12.get(
  "/:id",
  validateRequest(warehouseIdSchema),
  cacheResponse(
    CACHE_TTL.warehouseDetail,
    (req) => cacheKeys.warehouseDetail(String(req.params.id))
  ),
  warehouseController.getWarehouseById
);
router12.patch(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(updateWarehouseSchema),
  warehouseController.updateWarehouse
);
router12.delete(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(warehouseIdSchema),
  warehouseController.deleteWarehouse
);
var warehouseRoute = router12;

// src/app.ts
var app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/", (_req, res) => {
  res.send("server running....");
});
app.use("/api/v1", globalLimiter);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/bookings", bookingRoute);
app.use("/api/v1/crop-types", cropTypeRoute);
app.use("/api/v1/inspections", inspectionRoute);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/reviews", reviewRoute);
app.use("/api/v1/warehouses/:warehouseId/chambers", warehouseChamberRoute);
app.use("/api/v1/warehouses/:warehouseId/reviews", warehouseReviewRoute);
app.use("/api/v1/warehouses", warehouseRoute);
app.use("/api/v1/chambers", chamberRoute);
app.use("/api/v1/users/me/farmer-profile", farmerRoute);
app.use("/api/v1/users/me/owner-profile", ownerRoute);
app.use("/api/v1/users", userRoute);
app.use(notFound);
app.use(globalErrorHandler);

// src/server.ts
async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
    app.listen(env.PORT, () => {
      console.log(`This server is running on port number ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
startServer();
//# sourceMappingURL=server.js.map