import { Router } from "express";
import { db, unitsTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateUnitBody,
  UpdateUnitBody,
  GetUnitParams,
  UpdateUnitParams,
  DeleteUnitParams,
} from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmt(u: typeof unitsTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    shortName: u.shortName,
    description: u.description,
    acceptFraction: u.acceptFraction,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const units = await db
      .select()
      .from(unitsTable)
      .where(eq(unitsTable.userId, userId))
      .orderBy(desc(unitsTable.createdAt));
    res.json(units.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list units");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateUnitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, shortName, description, acceptFraction } = parsed.data;
  try {
    const [unit] = await db
      .insert(unitsTable)
      .values({ userId, name, shortName, description, acceptFraction })
      .returning();
    res.status(201).json(fmt(unit));
  } catch (err) {
    req.log.error({ err }, "Failed to create unit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetUnitParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [unit] = await db
      .select()
      .from(unitsTable)
      .where(and(eq(unitsTable.id, parsed.data.id), eq(unitsTable.userId, userId)));
    if (!unit) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(unit));
  } catch (err) {
    req.log.error({ err }, "Failed to get unit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdateUnitParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateUnitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.shortName !== undefined) updates.shortName = parsed.data.shortName;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.acceptFraction !== undefined) updates.acceptFraction = parsed.data.acceptFraction;
  try {
    const [unit] = await db
      .update(unitsTable)
      .set(updates)
      .where(and(eq(unitsTable.id, idParsed.data.id), eq(unitsTable.userId, userId)))
      .returning();
    if (!unit) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(unit));
  } catch (err) {
    req.log.error({ err }, "Failed to update unit");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeleteUnitParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(unitsTable)
      .where(and(eq(unitsTable.id, parsed.data.id), eq(unitsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete unit");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
