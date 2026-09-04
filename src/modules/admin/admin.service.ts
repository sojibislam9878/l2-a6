import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { writeAuditLog } from "../../utils/auditLogger.js";
import type { IUpdateWarehouseStatusPayload } from "./admin.interface.js";

const updateWarehouseStatusDb = async (
  warehouseId: string,
  adminId: string,
  payload: IUpdateWarehouseStatusPayload,
  ip: string | undefined,
) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, deletedAt: null },
    select: { id: true, name: true, status: true },
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
      select: { id: true, name: true, status: true },
    });

    await writeAuditLog(tx, {
      actorId: adminId,
      action: "WAREHOUSE_STATUS_CHANGED",
      entityType: "Warehouse",
      entityId: warehouseId,
      before: { status: warehouse.status },
      after: { status: next.status, reason: payload.reason ?? null },
      ip,
    });

    return next;
  });

  return updated;
};

export const adminService = {
  updateWarehouseStatusDb,
};
