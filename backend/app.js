import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { createCorsOptions } from "./config/corsOptions.js";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

export const createApp = ({ routes = {} } = {}) => {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests": isProduction ? [] : null,
        },
      },
    }),
  );

  app.use(cors(createCorsOptions()));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "marketplace-api",
      environment: process.env.NODE_ENV || "development",
    });
  });

  if (routes.webhookRoutes) {
    app.use("/api/webhooks", routes.webhookRoutes);
  }

  if (routes.userRoutes) {
    app.use("/api/users", routes.userRoutes);
  }

  if (routes.categoryRoutes) {
    app.use("/api/category", routes.categoryRoutes);
  }

  if (routes.productRoutes) {
    app.use("/api/products", routes.productRoutes);
  }

  if (routes.orderRoutes) {
    app.use("/api/orders", routes.orderRoutes);
  }

  if (routes.favoriteRoutes) {
    app.use("/api/favorites", routes.favoriteRoutes);
  }

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
