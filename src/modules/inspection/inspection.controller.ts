import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  ICreateInspectionPayload,
  IInspectionFilters,
} from "./inspection.interface.js";
import { inspectionService } from "./inspection.service.js";

const createInspection = catchAsync(async (req, res) => {
  const data = await inspectionService.createInspectionDb(
    String(req.params.id),
    req.user!.id,
    req.body as ICreateInspectionPayload,
    req.ip,
  );

  const message =
    data.grade === "REJECTED"
      ? "Inspection recorded. The lot failed and the booking has been cancelled for refund."
      : `Inspection recorded with grade ${data.grade}. The lot can now be stored.`;

  sendResponse(res, { statusCode: 201, message, data });
});

const getInspections = catchAsync(async (_req, res) => {
  const filters = validatedQuery<IInspectionFilters>(res);
  const { data, meta } = await inspectionService.getInspectionsFromDb(filters);

  sendResponse(res, { statusCode: 200, message: "Inspections retrieved successfully", data, meta });
});

const getInspectionById = catchAsync(async (req, res) => {
  const data = await inspectionService.getInspectionByIdFromDb(String(req.params.id), {
    id: req.user!.id,
    role: req.user!.role,
  });

  sendResponse(res, { statusCode: 200, message: "Inspection retrieved successfully", data });
});

export const inspectionController = {
  createInspection,
  getInspections,
  getInspectionById,
};
