import { Router } from "express";
import { db, paymentsTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreatePaymentBody,
  UpdatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  DeletePaymentParams,
  ListPaymentsQueryParams,
} from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmt(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    direction: p.direction,
    receiptNo: p.receiptNo,
    date: p.date,
    customerId: p.customerId,
    vendorId: p.vendorId,
    partyName: p.partyName,
    amount: Number(p.amount),
    method: p.method,
    remarks: p.remarks,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = ListPaymentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  try {
    const conditions = [eq(paymentsTable.userId, userId)];
    if (parsed.data.direction) conditions.push(eq(paymentsTable.direction, parsed.data.direction));
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(and(...conditions))
      .orderBy(desc(paymentsTable.createdAt));
    res.json(payments.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { amount, ...rest } = parsed.data;
  try {
    const [payment] = await db
      .insert(paymentsTable)
      .values({ userId, ...rest, amount: String(amount) })
      .returning();
    res.status(201).json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to create payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetPaymentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(and(eq(paymentsTable.id, parsed.data.id), eq(paymentsTable.userId, userId)));
    if (!payment) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to get payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdatePaymentParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.receiptNo !== undefined) updates.receiptNo = d.receiptNo;
  if (d.date !== undefined) updates.date = d.date;
  if (d.customerId !== undefined) updates.customerId = d.customerId;
  if (d.vendorId !== undefined) updates.vendorId = d.vendorId;
  if (d.partyName !== undefined) updates.partyName = d.partyName;
  if (d.amount !== undefined) updates.amount = String(d.amount);
  if (d.method !== undefined) updates.method = d.method;
  if (d.remarks !== undefined) updates.remarks = d.remarks;
  try {
    const [payment] = await db
      .update(paymentsTable)
      .set(updates)
      .where(and(eq(paymentsTable.id, idParsed.data.id), eq(paymentsTable.userId, userId)))
      .returning();
    if (!payment) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to update payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeletePaymentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(paymentsTable)
      .where(and(eq(paymentsTable.id, parsed.data.id), eq(paymentsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
