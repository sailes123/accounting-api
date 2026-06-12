import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import transactionsRouter from "./transactions";
import productsRouter from "./products";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/customers", customersRouter);
router.use("/transactions", transactionsRouter);
router.use("/products", productsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
