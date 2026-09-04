import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { authRoute } from "./modules/auth/auth.route.js";
import { adminRoute } from "./modules/admin/admin.route.js";
import { chamberRoute, warehouseChamberRoute } from "./modules/chamber/chamber.route.js";
import { cropTypeRoute } from "./modules/cropType/cropType.route.js";
import { farmerRoute } from "./modules/farmer/farmer.route.js";
import { warehouseReviewRoute } from "./modules/review/review.route.js";
import { warehouseRoute } from "./modules/warehouse/warehouse.route.js";
import { ownerRoute } from "./modules/owner/owner.route.js";
import { userRoute } from "./modules/user/user.route.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("server running....");
});

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/crop-types", cropTypeRoute);
app.use("/api/v1/warehouses/:warehouseId/chambers", warehouseChamberRoute);
app.use("/api/v1/warehouses/:warehouseId/reviews", warehouseReviewRoute);
app.use("/api/v1/warehouses", warehouseRoute);
app.use("/api/v1/chambers", chamberRoute);
app.use("/api/v1/users/me/farmer-profile", farmerRoute);
app.use("/api/v1/users/me/owner-profile", ownerRoute);
app.use("/api/v1/users", userRoute);

app.use(notFound);
app.use(globalErrorHandler);
