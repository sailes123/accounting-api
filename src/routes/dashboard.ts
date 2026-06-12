import { Router } from "express";
import { db, customersTable, transactionsTable } from "../db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

const TYPE_PREFIX: Record<string, string> = { income: "SA", expense: "PU", udharo: "UD" };
function billNo(type: string, id: number) {
  return `${TYPE_PREFIX[type] ?? "TX"}${100 + id}`;
}

router.get("/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

    const [todayResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'income' AND date = ${today}`);

    const [monthResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'income' AND date >= ${monthStart}`);

    const [todayPurchaseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date = ${today}`);

    const [monthPurchaseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date >= ${monthStart}`);

    const [todayExpenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date = ${today}`);

    const [monthExpenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date >= ${monthStart}`);

    const [udharoResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'udharo'`);

    const [customerCount] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(customersTable);

    res.json({
      todaySales: Number(todayResult?.total ?? 0),
      monthlySales: Number(monthResult?.total ?? 0),
      todayPurchase: Number(todayPurchaseResult?.total ?? 0),
      monthlyPurchase: Number(monthPurchaseResult?.total ?? 0),
      todayExpenses: Number(todayExpenseResult?.total ?? 0),
      monthlyExpenses: Number(monthExpenseResult?.total ?? 0),
      totalUdharo: Number(udharoResult?.total ?? 0),
      totalCustomers: Number(customerCount?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-transactions", async (req, res) => {
  try {
    const rows = await db
      .select({
        transaction: transactionsTable,
        customerName: customersTable.name,
        customerPhone: customersTable.phone,
      })
      .from(transactionsTable)
      .leftJoin(customersTable, eq(transactionsTable.customerId, customersTable.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    res.json(
      rows.map((r) => ({
        id: r.transaction.id,
        billNo: billNo(r.transaction.type, r.transaction.id),
        title: r.transaction.title,
        amount: Number(r.transaction.amount),
        type: r.transaction.type,
        date: r.transaction.date,
        customerId: r.transaction.customerId ?? null,
        customerName: r.customerName ?? null,
        customerPhone: r.customerPhone ?? null,
        paymentMode: r.transaction.paymentMode ?? null,
        createdAt: r.transaction.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/top-customers", async (req, res) => {
  try {
    const customers = await db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.balance))
      .limit(5);

    res.json(
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        balance: Number(c.balance),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get top customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
