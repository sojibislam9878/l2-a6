import { z } from "zod";

export const USER_SORT_FIELDS = ["createdAt", "name", "email", "role"] as const;

export const updateWarehouseStatusSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"], {
        error: "status must be PENDING, APPROVED, REJECTED or SUSPENDED",
      }),
      reason: z.string().trim().min(3).max(255).optional(),
    })
    .strict(),
});

export const listUsersSchema = z.object({
  query: z
    .object({
      search: z.string().trim().min(1).optional(),
      role: z.enum(["FARMER", "WAREHOUSE_OWNER", "ADMIN"]).optional(),
      status: z.enum(["ACTIVE", "BANNED"]).optional(),
      verified: z.enum(["true", "false"]).optional(),
      includeDeleted: z.enum(["true", "false"]).optional(),
      sortBy: z.enum(USER_SORT_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});

export const userIdSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      status: z.enum(["ACTIVE", "BANNED"], { error: "status must be ACTIVE or BANNED" }),
      reason: z.string().trim().min(3).max(255).optional(),
    })
    .strict(),
});

export const updateUserRoleSchema = z.object({
  params: z.object({ id: z.uuid({ error: "id must be a valid uuid" }) }),
  body: z
    .object({
      role: z.enum(["FARMER", "WAREHOUSE_OWNER", "ADMIN"], {
        error: "role must be FARMER, WAREHOUSE_OWNER or ADMIN",
      }),
      reason: z.string().trim().min(3).max(255).optional(),
    })
    .strict(),
});

export const listAuditLogsSchema = z.object({
  query: z
    .object({
      entityType: z.string().trim().min(1).max(40).optional(),
      entityId: z.uuid({ error: "entityId must be a valid uuid" }).optional(),
      actorId: z.uuid({ error: "actorId must be a valid uuid" }).optional(),
      action: z.string().trim().min(1).max(60).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});
