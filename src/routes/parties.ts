import { Router } from "express";
import { db, partiesTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreatePartyBody,
  UpdatePartyBody,
  GetPartyParams,
  UpdatePartyParams,
  DeletePartyParams,
  ListPartiesQueryParams,
} from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmt(p: typeof partiesTable.$inferSelect) {
  return {
    id: p.id,
    partyType: p.partyType,
    name: p.name,
    email: p.email,
    phone: p.phone,
    address: p.address,
    panType: p.panType,
    panNumber: p.panNumber,
    remarks: p.remarks,
    balance: Number(p.balance),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const queryParsed = ListPartiesQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  try {
    const conditions = [eq(partiesTable.userId, userId)];
    if (queryParsed.data.type) {
      conditions.push(eq(partiesTable.partyType, queryParsed.data.type));
    }
    const parties = await db
      .select()
      .from(partiesTable)
      .where(and(...conditions))
      .orderBy(desc(partiesTable.createdAt));
    res.json(parties.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list parties");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreatePartyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { partyType, name, email, phone, address, panType, panNumber, remarks, balance } = parsed.data;
  try {
    const [party] = await db
      .insert(partiesTable)
      .values({ userId, partyType, name, email, phone, address, panType, panNumber, remarks, balance: String(balance ?? 0) })
      .returning();
    res.status(201).json(fmt(party));
  } catch (err) {
    req.log.error({ err }, "Failed to create party");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetPartyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [party] = await db
      .select()
      .from(partiesTable)
      .where(and(eq(partiesTable.id, parsed.data.id), eq(partiesTable.userId, userId)));
    if (!party) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(party));
  } catch (err) {
    req.log.error({ err }, "Failed to get party");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdatePartyParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdatePartyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.panType !== undefined) updates.panType = parsed.data.panType;
  if (parsed.data.panNumber !== undefined) updates.panNumber = parsed.data.panNumber;
  if (parsed.data.remarks !== undefined) updates.remarks = parsed.data.remarks;
  if (parsed.data.balance !== undefined) updates.balance = String(parsed.data.balance);
  try {
    const [party] = await db
      .update(partiesTable)
      .set(updates)
      .where(and(eq(partiesTable.id, idParsed.data.id), eq(partiesTable.userId, userId)))
      .returning();
    if (!party) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(party));
  } catch (err) {
    req.log.error({ err }, "Failed to update party");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeletePartyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(partiesTable)
      .where(and(eq(partiesTable.id, parsed.data.id), eq(partiesTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete party");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
