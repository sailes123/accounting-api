import { Router } from "express";
import { db, partiesTable, transactionsTable } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

const TYPE_PREFIX: Record<string, string> = { income: "SA", expense: "PU", udharo: "UD" };
function billNo(type: string, id: number) {
  return `${TYPE_PREFIX[type] ?? "TX"}${100 + id}`;
}

function trend(current: number, previous: number): { pct: number; up: boolean } {
  if (previous === 0) {
    return { pct: current === 0 ? 0 : 100, up: current >= previous };
  }
  return { pct: Math.round(Math.abs(((current - previous) / previous) * 100)), up: current >= previous };
}

router.get("/summary", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 10);
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), daysInPrevMonth))
      .toISOString()
      .slice(0, 10);

    const [todayResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'income' AND date = ${today} AND user_id = ${userId}`);

    const [monthResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'income' AND date >= ${monthStart} AND user_id = ${userId}`);

    const [todayPurchaseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date = ${today} AND user_id = ${userId}`);

    const [monthPurchaseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date >= ${monthStart} AND user_id = ${userId}`);

    const [todayExpenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date = ${today} AND user_id = ${userId}`);

    const [monthExpenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date >= ${monthStart} AND user_id = ${userId}`);

    const [udharoResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'udharo' AND user_id = ${userId}`);

    const [customerCount] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(partiesTable)
      .where(and(eq(partiesTable.userId, userId), eq(partiesTable.partyType, "customer")));

    const [yesterdayIncomeResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'income' AND date = ${yesterday} AND user_id = ${userId}`);

    const [prevMonthIncomeResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'income' AND date >= ${prevMonthStart} AND date <= ${prevMonthEnd} AND user_id = ${userId}`);

    const [yesterdayExpenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date = ${yesterday} AND user_id = ${userId}`);

    const [prevMonthExpenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactionsTable)
      .where(sql`type = 'expense' AND date >= ${prevMonthStart} AND date <= ${prevMonthEnd} AND user_id = ${userId}`);

    const todaySales = Number(todayResult?.total ?? 0);
    const monthlySales = Number(monthResult?.total ?? 0);
    const todayPurchase = Number(todayPurchaseResult?.total ?? 0);
    const monthlyPurchase = Number(monthPurchaseResult?.total ?? 0);
    const todayExpenses = Number(todayExpenseResult?.total ?? 0);
    const monthlyExpenses = Number(monthExpenseResult?.total ?? 0);
    const yesterdayIncome = Number(yesterdayIncomeResult?.total ?? 0);
    const prevMonthIncome = Number(prevMonthIncomeResult?.total ?? 0);
    const yesterdayExpense = Number(yesterdayExpenseResult?.total ?? 0);
    const prevMonthExpense = Number(prevMonthExpenseResult?.total ?? 0);

    res.json({
      todaySales,
      monthlySales,
      todayPurchase,
      monthlyPurchase,
      todayExpenses,
      monthlyExpenses,
      trends: {
        todaySales: trend(todaySales, yesterdayIncome),
        monthlySales: trend(monthlySales, prevMonthIncome),
        todayPurchase: trend(todayPurchase, yesterdayExpense),
        monthlyPurchase: trend(monthlyPurchase, prevMonthExpense),
        todayExpenses: trend(todayExpenses, yesterdayExpense),
        monthlyExpenses: trend(monthlyExpenses, prevMonthExpense),
      },
      totalUdharo: Number(udharoResult?.total ?? 0),
      totalCustomers: Number(customerCount?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-transactions", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const rows = await db
      .select({
        transaction: transactionsTable,
        customerName: partiesTable.name,
        customerPhone: partiesTable.phone,
      })
      .from(transactionsTable)
      .leftJoin(partiesTable, and(
        eq(transactionsTable.customerId, partiesTable.id),
        eq(partiesTable.userId, userId),
        eq(partiesTable.partyType, "customer")
      ))
      .where(eq(transactionsTable.userId, userId))
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
  const userId = (req as AuthRequest).userId!;
  try {
    const customers = await db
      .select()
      .from(partiesTable)
      .where(and(eq(partiesTable.userId, userId), eq(partiesTable.partyType, "customer")))
      .orderBy(desc(partiesTable.balance))
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
