import { Router } from "express";
import { db, transactionsTable, customersTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateTransactionBody,
  UpdateTransactionBody,
  GetTransactionParams,
  UpdateTransactionParams,
  DeleteTransactionParams,
  ListTransactionsQueryParams,
} from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

const TYPE_PREFIX: Record<string, string> = {
  income: "SA",
  expense: "PU",
  udharo: "UD",
};

function billNo(type: string, id: number) {
  return `${TYPE_PREFIX[type] ?? "TX"}${100 + id}`;
}

function fmt(
  t: typeof transactionsTable.$inferSelect,
  customerName?: string | null,
  customerPhone?: string | null
) {
  return {
    id: t.id,
    billNo: billNo(t.type, t.id),
    title: t.title,
    amount: Number(t.amount),
    type: t.type,
    date: t.date,
    customerId: t.customerId ?? null,
    customerName: customerName ?? null,
    customerPhone: customerPhone ?? null,
    paymentMode: t.paymentMode ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  try {
    let rows = await db
      .select({
        transaction: transactionsTable,
        customerName: customersTable.name,
        customerPhone: customersTable.phone,
      })
      .from(transactionsTable)
      .leftJoin(customersTable, and(
        eq(transactionsTable.customerId, customersTable.id),
        eq(customersTable.userId, userId)
      ))
      .where(eq(transactionsTable.userId, userId))
      .orderBy(desc(transactionsTable.createdAt));

    if (parsed.data.type) {
      rows = rows.filter((r) => r.transaction.type === parsed.data.type);
    }
    if (parsed.data.customerId) {
      rows = rows.filter((r) => r.transaction.customerId === parsed.data.customerId);
    }
    res.json(rows.map((r) => fmt(r.transaction, r.customerName, r.customerPhone)));
  } catch (err) {
    req.log.error({ err }, "Failed to list transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title, amount, type, date, customerId, paymentMode } = parsed.data;
  try {
    const [transaction] = await db
      .insert(transactionsTable)
      .values({
        userId,
        title,
        amount: String(amount),
        type,
        date,
        customerId: customerId ?? null,
        paymentMode: paymentMode ?? null,
      })
      .returning();

    let customerName: string | null = null;
    let customerPhone: string | null = null;
    if (transaction.customerId) {
      const [c] = await db
        .select()
        .from(customersTable)
        .where(and(eq(customersTable.id, transaction.customerId), eq(customersTable.userId, userId)));
      if (c) { customerName = c.name; customerPhone = c.phone; }
    }
    res.status(201).json(fmt(transaction, customerName, customerPhone));
  } catch (err) {
    req.log.error({ err }, "Failed to create transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetTransactionParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [row] = await db
      .select({
        transaction: transactionsTable,
        customerName: customersTable.name,
        customerPhone: customersTable.phone,
      })
      .from(transactionsTable)
      .leftJoin(customersTable, and(
        eq(transactionsTable.customerId, customersTable.id),
        eq(customersTable.userId, userId)
      ))
      .where(and(eq(transactionsTable.id, parsed.data.id), eq(transactionsTable.userId, userId)));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(row.transaction, row.customerName, row.customerPhone));
  } catch (err) {
    req.log.error({ err }, "Failed to get transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdateTransactionParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.amount !== undefined) updates.amount = String(parsed.data.amount);
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.customerId !== undefined) updates.customerId = parsed.data.customerId;
  if (parsed.data.paymentMode !== undefined) updates.paymentMode = parsed.data.paymentMode;
  try {
    const [transaction] = await db
      .update(transactionsTable)
      .set(updates)
      .where(and(eq(transactionsTable.id, idParsed.data.id), eq(transactionsTable.userId, userId)))
      .returning();
    if (!transaction) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    let customerName: string | null = null;
    let customerPhone: string | null = null;
    if (transaction.customerId) {
      const [c] = await db
        .select()
        .from(customersTable)
        .where(and(eq(customersTable.id, transaction.customerId), eq(customersTable.userId, userId)));
      if (c) { customerName = c.name; customerPhone = c.phone; }
    }
    res.json(fmt(transaction, customerName, customerPhone));
  } catch (err) {
    req.log.error({ err }, "Failed to update transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeleteTransactionParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(transactionsTable)
      .where(and(eq(transactionsTable.id, parsed.data.id), eq(transactionsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete transaction");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
