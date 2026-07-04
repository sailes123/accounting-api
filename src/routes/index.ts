import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import transactionsRouter from "./transactions";
import productsRouter from "./products";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import salesOrdersRouter from "./sales-orders";
import categoriesRouter from "./categories";
import unitsRouter from "./units";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/customers", requireAuth, customersRouter);
router.use("/transactions", requireAuth, transactionsRouter);
router.use("/products", requireAuth, productsRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/sales-orders", requireAuth, salesOrdersRouter);
router.use("/categories", requireAuth, categoriesRouter);
router.use("/units", requireAuth, unitsRouter);

export default router;
