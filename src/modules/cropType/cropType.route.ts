import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { cacheResponse, queryOf } from "../../middlewares/cache.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { CACHE_TTL, cacheKeys } from "../../utils/cacheKeys.js";
import { cropTypeController } from "./cropType.controller.js";
import {
  createCropTypeSchema,
  cropTypeIdSchema,
  listCropTypesSchema,
  updateCropTypeSchema,
} from "./cropType.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest(listCropTypesSchema),
  cacheResponse(CACHE_TTL.cropTypes, (req) => cacheKeys.cropTypes(queryOf(req))),
  cropTypeController.getCropTypes,
);
router.get("/:id", validateRequest(cropTypeIdSchema), cropTypeController.getCropTypeById);

router.post(
  "/",
  auth,
  authorize("ADMIN"),
  validateRequest(createCropTypeSchema),
  cropTypeController.createCropType,
);

router.patch(
  "/:id",
  auth,
  authorize("ADMIN"),
  validateRequest(updateCropTypeSchema),
  cropTypeController.updateCropType,
);

router.delete(
  "/:id",
  auth,
  authorize("ADMIN"),
  validateRequest(cropTypeIdSchema),
  cropTypeController.deleteCropType,
);

export const cropTypeRoute = router;
