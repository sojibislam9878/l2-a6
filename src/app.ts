import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { authRoute } from "./modules/auth/auth.route.js";
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
app.use("/api/v1/users", userRoute);

app.use(notFound);
app.use(globalErrorHandler);
