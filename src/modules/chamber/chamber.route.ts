import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { requireCompleteProfile } from "../../middlewares/requireCompleteProfile.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { chamberController } from "./chamber.controller.js";
import {
  chamberIdSchema,
  createChamberSchema,
  listChambersSchema,
  updateChamberSchema,
} from "./chamber.validation.js";

const nestedRouter = Router({ mergeParams: true });

nestedRouter.get("/", validateRequest(listChambersSchema), chamberController.getChambers);
nestedRouter.post(
  "/",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(createChamberSchema),
  chamberController.createChamber,
);

const router = Router();

router.get("/:id", validateRequest(chamberIdSchema), chamberController.getChamberById);
router.patch(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(updateChamberSchema),
  chamberController.updateChamber,
);
router.delete(
  "/:id",
  auth,
  authorize("WAREHOUSE_OWNER"),
  requireCompleteProfile,
  validateRequest(chamberIdSchema),
  chamberController.deleteChamber,
);

export const warehouseChamberRoute = nestedRouter;
export const chamberRoute = router;
