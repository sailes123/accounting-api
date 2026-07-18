import { Router } from "express";
import { db, manufactureRecordsTable, manufactureMaterialsTable } from "../db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import {
  CreateManufactureBody,
  UpdateManufactureBody,
  GetManufactureParams,
  UpdateManufactureParams,
  DeleteManufactureParams,
  ListManufactureQueryParams,
} from "../lib/api";
import { resolvePagination, buildMeta } from "../lib/pagination";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmtMaterial(m: typeof manufactureMaterialsTable.$inferSelect) {
  return {
    id: m.id,
    item: m.item,
    batch: m.batch,
    quantity: Number(m.quantity),
    cost: Number(m.cost),
  };
}

function fmt(r: typeof manufactureRecordsTable.$inferSelect, materials: (typeof manufactureMaterialsTable.$inferSelect)[]) {
  return {
    id: r.id,
    product: r.product,
    batch: r.batch,
    quantity: Number(r.quantity),
    unit: r.unit,
    createdDate: r.createdDate,
    expiryDate: r.expiryDate,
    laborCost: Number(r.laborCost),
    otherExpenses: Number(r.otherExpenses),
    note: r.note,
    materials: materials.map(fmtMaterial),
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = ListManufactureQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  try {
    const { page, limit, offset } = resolvePagination(parsed.data.page, parsed.data.limit);

    const [{ total }] = await db
      .select({ total: sql<string>`count(*)` })
      .from(manufactureRecordsTable)
      .where(eq(manufactureRecordsTable.userId, userId));

    const records = await db
      .select()
      .from(manufactureRecordsTable)
      .where(eq(manufactureRecordsTable.userId, userId))
      .orderBy(desc(manufactureRecordsTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (records.length === 0) {
      res.json({ data: [], meta: buildMeta(page, limit, Number(total)) });
      return;
    }

    const materials = await db
      .select()
      .from(manufactureMaterialsTable)
      .where(inArray(manufactureMaterialsTable.recordId, records.map((r) => r.id)));

    const materialsByRecord = new Map<number, (typeof manufactureMaterialsTable.$inferSelect)[]>();
    for (const m of materials) {
      const list = materialsByRecord.get(m.recordId) ?? [];
      list.push(m);
      materialsByRecord.set(m.recordId, list);
    }

    res.json({
      data: records.map((r) => fmt(r, materialsByRecord.get(r.id) ?? [])),
      meta: buildMeta(page, limit, Number(total)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list manufacture records");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateManufactureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { materials, quantity, laborCost, otherExpenses, ...rest } = parsed.data;
  try {
    const result = await db.transaction(async (tx) => {
      const [record] = await tx
        .insert(manufactureRecordsTable)
        .values({
          userId,
          ...rest,
          quantity: String(quantity),
          laborCost: laborCost === undefined ? undefined : String(laborCost),
          otherExpenses: otherExpenses === undefined ? undefined : String(otherExpenses),
        })
        .returning();
      const insertedMaterials = materials && materials.length > 0
        ? await tx
            .insert(manufactureMaterialsTable)
            .values(materials.map((m) => ({
              recordId: record.id,
              item: m.item,
              batch: m.batch,
              quantity: String(m.quantity),
              cost: String(m.cost),
            })))
            .returning()
        : [];
      return { record, insertedMaterials };
    });
    res.status(201).json(fmt(result.record, result.insertedMaterials));
  } catch (err) {
    req.log.error({ err }, "Failed to create manufacture record");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetManufactureParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [record] = await db
      .select()
      .from(manufactureRecordsTable)
      .where(and(eq(manufactureRecordsTable.id, parsed.data.id), eq(manufactureRecordsTable.userId, userId)));
    if (!record) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const materials = await db
      .select()
      .from(manufactureMaterialsTable)
      .where(eq(manufactureMaterialsTable.recordId, record.id));
    res.json(fmt(record, materials));
  } catch (err) {
    req.log.error({ err }, "Failed to get manufacture record");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdateManufactureParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateManufactureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { materials, ...rest } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (rest.product !== undefined) updates.product = rest.product;
  if (rest.batch !== undefined) updates.batch = rest.batch;
  if (rest.quantity !== undefined) updates.quantity = String(rest.quantity);
  if (rest.unit !== undefined) updates.unit = rest.unit;
  if (rest.createdDate !== undefined) updates.createdDate = rest.createdDate;
  if (rest.expiryDate !== undefined) updates.expiryDate = rest.expiryDate;
  if (rest.laborCost !== undefined) updates.laborCost = String(rest.laborCost);
  if (rest.otherExpenses !== undefined) updates.otherExpenses = String(rest.otherExpenses);
  if (rest.note !== undefined) updates.note = rest.note;

  try {
    const result = await db.transaction(async (tx) => {
      const [record] = await tx
        .update(manufactureRecordsTable)
        .set(updates)
        .where(and(eq(manufactureRecordsTable.id, idParsed.data.id), eq(manufactureRecordsTable.userId, userId)))
        .returning();
      if (!record) return null;

      if (materials) {
        await tx.delete(manufactureMaterialsTable).where(eq(manufactureMaterialsTable.recordId, record.id));
        const insertedMaterials = materials.length > 0
          ? await tx
              .insert(manufactureMaterialsTable)
              .values(materials.map((m) => ({
                recordId: record.id,
                item: m.item,
                batch: m.batch,
                quantity: String(m.quantity),
                cost: String(m.cost),
              })))
              .returning()
          : [];
        return { record, recordMaterials: insertedMaterials };
      }
      const recordMaterials = await tx
        .select()
        .from(manufactureMaterialsTable)
        .where(eq(manufactureMaterialsTable.recordId, record.id));
      return { record, recordMaterials };
    });
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(result.record, result.recordMaterials));
  } catch (err) {
    req.log.error({ err }, "Failed to update manufacture record");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeleteManufactureParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      await tx.delete(manufactureMaterialsTable).where(eq(manufactureMaterialsTable.recordId, parsed.data.id));
      await tx
        .delete(manufactureRecordsTable)
        .where(and(eq(manufactureRecordsTable.id, parsed.data.id), eq(manufactureRecordsTable.userId, userId)));
    });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete manufacture record");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
