import { Router } from "express";
import { db, customersTable } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  DeleteCustomerParams,
} from "../lib/api";

const router = Router();

function fmt(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    balance: Number(c.balance),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
    res.json(customers.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, phone, address, balance } = parsed.data;
  try {
    const [customer] = await db.insert(customersTable).values({
      name,
      phone,
      address,
      balance: String(balance ?? 0),
    }).returning();
    res.status(201).json(fmt(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const parsed = GetCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, parsed.data.id));
    if (!customer) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const idParsed = UpdateCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.balance !== undefined) updates.balance = String(parsed.data.balance);
  try {
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, idParsed.data.id)).returning();
    if (!customer) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(customersTable).where(eq(customersTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
