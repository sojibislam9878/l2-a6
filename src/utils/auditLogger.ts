import type { Prisma } from "../../generated/prisma/client.js";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | undefined;
  after?: Record<string, unknown> | undefined;
  ip?: string | undefined;
};

export const writeAuditLog = async (
  client: Prisma.TransactionClient,
  entry: AuditEntry,
): Promise<void> => {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ...(entry.before === undefined ? {} : { before: entry.before as Prisma.InputJsonValue }),
      ...(entry.after === undefined ? {} : { after: entry.after as Prisma.InputJsonValue }),
      ...(entry.ip === undefined ? {} : { ip: entry.ip }),
    },
  });
};
