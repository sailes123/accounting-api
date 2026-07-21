import { Router, type IRouter } from "express";
import express from "express";
import healthRouter from "./health";
import partiesRouter from "./parties";
import transactionsRouter from "./transactions";
import productsRouter from "./products";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import unitsRouter from "./units";
import documentsRouter from "./documents";
import paymentsRouter from "./payments";
import manufactureRouter from "./manufacture";
import companySettingsRouter from "./companySettings";
import { requireAuth } from "../middlewares/auth";
import { UPLOADS_ROOT } from "../lib/uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(
  "/uploads",
  (_req, res, next) => {
    // Uploaded assets (e.g. company logos) are fetched cross-origin by the
    // frontend's own domain, so relax helmet's default same-origin CORP.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(UPLOADS_ROOT),
);
router.use("/parties", requireAuth, partiesRouter);
router.use("/transactions", requireAuth, transactionsRouter);
router.use("/products", requireAuth, productsRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/categories", requireAuth, categoriesRouter);
router.use("/units", requireAuth, unitsRouter);
router.use("/documents", requireAuth, documentsRouter);
router.use("/payments", requireAuth, paymentsRouter);
router.use("/manufacture", requireAuth, manufactureRouter);
router.use("/company-settings", requireAuth, companySettingsRouter);

export default router;
