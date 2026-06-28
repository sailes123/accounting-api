import { Router } from "express";
import { db, salesOrdersTable, salesOrderItemsTable, customersTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { createSalesOrderSchema } from "../db/schema/sales-orders";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function calcTotals(
  items: { quantity: number; price: number }[],
  taxPct: number,
  discountPct: number
) {
  const sum = items.reduce((acc, i) => acc + i.quantity * i.price, 0);
  const taxAmt = Math.round((sum * taxPct) / 100);
  const discountAmt = Math.round((sum * discountPct) / 100);
  return { sum, taxAmt, discountAmt, grandTotal: sum + taxAmt - discountAmt };
}

function fmtOrder(
  order: typeof salesOrdersTable.$inferSelect,
  items: typeof salesOrderItemsTable.$inferSelect[],
  customerName?: string | null
) {
  const taxPct = Number(order.taxPct);
  const discountPct = Number(order.discountPct);
  const fmtItems = items.map((i) => ({
    id: i.id,
    name: i.name,
    hsCode: i.hsCode,
    quantity: i.quantity,
    price: Number(i.price),
    amount: i.quantity * Number(i.price),
  }));
  const { sum, taxAmt, discountAmt, grandTotal } = calcTotals(fmtItems, taxPct, discountPct);
  return {
    id: order.id,
    sn: order.sn,
    orderNo: order.orderNo,
    orderDate: order.orderDate,
    supplyDate: order.supplyDate,
    customerId: order.customerId ?? null,
    customerName: customerName ?? null,
    taxPct,
    discountPct,
    remarks: order.remarks,
    sum,
    taxAmt,
    discountAmt,
    grandTotal,
    items: fmtItems,
    createdAt: order.createdAt.toISOString(),
  };
}

// GET /sales-orders
router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const orders = await db
      .select({
        order: salesOrdersTable,
        customerName: customersTable.name,
      })
      .from(salesOrdersTable)
      .leftJoin(
        customersTable,
        and(eq(salesOrdersTable.customerId, customersTable.id), eq(customersTable.userId, userId))
      )
      .where(eq(salesOrdersTable.userId, userId))
      .orderBy(desc(salesOrdersTable.createdAt));

    const results = await Promise.all(
      orders.map(async ({ order, customerName }) => {
        const items = await db
          .select()
          .from(salesOrderItemsTable)
          .where(eq(salesOrderItemsTable.orderId, order.id));
        return fmtOrder(order, items, customerName);
      })
    );

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to list sales orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /sales-orders
router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = createSalesOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const { sn, orderNo, orderDate, supplyDate, customerId, taxPct, discountPct, remarks, items } = parsed.data;

  try {
    const [order] = await db
      .insert(salesOrdersTable)
      .values({
        userId,
        sn,
        orderNo,
        orderDate,
        supplyDate,
        customerId: customerId ?? null,
        taxPct: String(taxPct),
        discountPct: String(discountPct),
        remarks,
      })
      .returning();

    const insertedItems = await db
      .insert(salesOrderItemsTable)
      .values(items.map((item) => ({
        orderId: order.id,
        name: item.name,
        hsCode: item.hsCode,
        quantity: item.quantity,
        price: String(item.price),
      })))
      .returning();

    let customerName: string | null = null;
    if (order.customerId) {
      const [c] = await db
        .select()
        .from(customersTable)
        .where(and(eq(customersTable.id, order.customerId), eq(customersTable.userId, userId)));
      if (c) customerName = c.name;
    }

    res.status(201).json(fmtOrder(order, insertedItems, customerName));
  } catch (err) {
    req.log.error({ err }, "Failed to create sales order");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /sales-orders/:id
router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [row] = await db
      .select({ order: salesOrdersTable, customerName: customersTable.name })
      .from(salesOrdersTable)
      .leftJoin(
        customersTable,
        and(eq(salesOrdersTable.customerId, customersTable.id), eq(customersTable.userId, userId))
      )
      .where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.userId, userId)));

    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    const items = await db
      .select()
      .from(salesOrderItemsTable)
      .where(eq(salesOrderItemsTable.orderId, id));

    res.json(fmtOrder(row.order, items, row.customerName));
  } catch (err) {
    req.log.error({ err }, "Failed to get sales order");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /sales-orders/:id
router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(salesOrderItemsTable).where(eq(salesOrderItemsTable.orderId, id));
    await db.delete(salesOrdersTable).where(and(eq(salesOrdersTable.id, id), eq(salesOrdersTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete sales order");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
