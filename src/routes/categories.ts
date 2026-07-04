import { Router } from "express";
import { db, categoriesTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmt(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    parentCategoryId: c.parentCategoryId,
    description: c.description,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .orderBy(desc(categoriesTable.createdAt));
    res.json(categories.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, parentCategoryId, description } = parsed.data;
  try {
    const [category] = await db
      .insert(categoriesTable)
      .values({ userId, name, parentCategoryId, description })
      .returning();
    res.status(201).json(fmt(category));
  } catch (err) {
    req.log.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, parsed.data.id), eq(categoriesTable.userId, userId)));
    if (!category) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(category));
  } catch (err) {
    req.log.error({ err }, "Failed to get category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdateCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.parentCategoryId !== undefined) updates.parentCategoryId = parsed.data.parentCategoryId;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  try {
    const [category] = await db
      .update(categoriesTable)
      .set(updates)
      .where(and(eq(categoriesTable.id, idParsed.data.id), eq(categoriesTable.userId, userId)))
      .returning();
    if (!category) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(category));
  } catch (err) {
    req.log.error({ err }, "Failed to update category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeleteCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(categoriesTable)
      .where(and(eq(categoriesTable.id, parsed.data.id), eq(categoriesTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
