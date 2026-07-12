import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiRateLimit } from "./middlewares/rateLimit";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler";

const app: Express = express();

const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
  }),
);
app.use(compression());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiRateLimit);

app.use("/api/v1", router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
