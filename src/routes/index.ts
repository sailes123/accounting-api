import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import transactionsRouter from "./transactions";
import productsRouter from "./products";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import unitsRouter from "./units";
import vendorsRouter from "./vendor"
import documentsRouter from "./documents";
import paymentsRouter from "./payments";
import manufactureRouter from "./manufacture";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/customers", requireAuth, customersRouter);
router.use("/transactions", requireAuth, transactionsRouter);
router.use("/products", requireAuth, productsRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/categories", requireAuth, categoriesRouter);
router.use("/units", requireAuth, unitsRouter);
router.use("/vendors", requireAuth, vendorsRouter )
router.use("/documents", requireAuth, documentsRouter);
router.use("/payments", requireAuth, paymentsRouter);
router.use("/manufacture", requireAuth, manufactureRouter);

export default router;
