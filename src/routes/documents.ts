import { Router } from "express";
import { db, documentsTable, documentItemsTable } from "../db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import {
  CreateDocumentBody,
  UpdateDocumentBody,
  GetDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  ListDocumentsQueryParams,
} from "../lib/api";
import { resolvePagination, buildMeta } from "../lib/pagination";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmtItem(i: typeof documentItemsTable.$inferSelect) {
  return {
    id: i.id,
    name: i.name,
    batch: i.batch,
    hsCode: i.hsCode,
    quantity: Number(i.quantity),
    price: Number(i.price),
  };
}

function fmt(d: typeof documentsTable.$inferSelect, items: (typeof documentItemsTable.$inferSelect)[]) {
  return {
    id: d.id,
    docType: d.docType,
    sn: d.sn,
    docNo: d.docNo,
    docDate: d.docDate,
    dueDate: d.dueDate,
    supplyDate: d.supplyDate,
    reference: d.reference,
    customerId: d.customerId,
    vendorId: d.vendorId,
    taxPct: Number(d.taxPct),
    discountPct: Number(d.discountPct),
    advance: Number(d.advance),
    remarks: d.remarks,
    reason: d.reason,
    status: d.status,
    linkedDocNo: d.linkedDocNo,
    paymentSplit: d.paymentSplit ? (JSON.parse(d.paymentSplit) as Record<string, number>) : undefined,
    items: items.map(fmtItem),
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  try {
    const conditions = [eq(documentsTable.userId, userId)];
    if (parsed.data.docType) conditions.push(eq(documentsTable.docType, parsed.data.docType));

    const { page, limit, offset } = resolvePagination(parsed.data.page, parsed.data.limit);

    const [{ total }] = await db
      .select({ total: sql<string>`count(*)` })
      .from(documentsTable)
      .where(and(...conditions));

    const docs = await db
      .select()
      .from(documentsTable)
      .where(and(...conditions))
      .orderBy(desc(documentsTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (docs.length === 0) {
      res.json({ data: [], meta: buildMeta(page, limit, Number(total)) });
      return;
    }

    const items = await db
      .select()
      .from(documentItemsTable)
      .where(inArray(documentItemsTable.documentId, docs.map((d) => d.id)));

    const itemsByDoc = new Map<number, (typeof documentItemsTable.$inferSelect)[]>();
    for (const item of items) {
      const list = itemsByDoc.get(item.documentId) ?? [];
      list.push(item);
      itemsByDoc.set(item.documentId, list);
    }

    res.json({
      data: docs.map((d) => fmt(d, itemsByDoc.get(d.id) ?? [])),
      meta: buildMeta(page, limit, Number(total)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { items, paymentSplit, ...rest } = parsed.data;
  try {
    const result = await db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(documentsTable)
        .values({
          userId,
          ...rest,
          taxPct: rest.taxPct === undefined ? undefined : String(rest.taxPct),
          discountPct: rest.discountPct === undefined ? undefined : String(rest.discountPct),
          advance: rest.advance === undefined ? undefined : String(rest.advance),
          paymentSplit: paymentSplit ? JSON.stringify(paymentSplit) : undefined,
        })
        .returning();
      const insertedItems = await tx
        .insert(documentItemsTable)
        .values(items.map((it) => ({
          documentId: doc.id,
          name: it.name,
          batch: it.batch,
          hsCode: it.hsCode,
          quantity: String(it.quantity),
          price: String(it.price),
        })))
        .returning();
      return { doc, insertedItems };
    });
    res.status(201).json(fmt(result.doc, result.insertedItems));
  } catch (err) {
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, parsed.data.id), eq(documentsTable.userId, userId)));
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const items = await db
      .select()
      .from(documentItemsTable)
      .where(eq(documentItemsTable.documentId, doc.id));
    res.json(fmt(doc, items));
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdateDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { items, paymentSplit, ...rest } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (rest.docType !== undefined) updates.docType = rest.docType;
  if (rest.sn !== undefined) updates.sn = rest.sn;
  if (rest.docNo !== undefined) updates.docNo = rest.docNo;
  if (rest.docDate !== undefined) updates.docDate = rest.docDate;
  if (rest.dueDate !== undefined) updates.dueDate = rest.dueDate;
  if (rest.supplyDate !== undefined) updates.supplyDate = rest.supplyDate;
  if (rest.reference !== undefined) updates.reference = rest.reference;
  if (rest.customerId !== undefined) updates.customerId = rest.customerId;
  if (rest.vendorId !== undefined) updates.vendorId = rest.vendorId;
  if (rest.taxPct !== undefined) updates.taxPct = String(rest.taxPct);
  if (rest.discountPct !== undefined) updates.discountPct = String(rest.discountPct);
  if (rest.advance !== undefined) updates.advance = String(rest.advance);
  if (rest.remarks !== undefined) updates.remarks = rest.remarks;
  if (rest.reason !== undefined) updates.reason = rest.reason;
  if (rest.status !== undefined) updates.status = rest.status;
  if (rest.linkedDocNo !== undefined) updates.linkedDocNo = rest.linkedDocNo;
  if (paymentSplit !== undefined) updates.paymentSplit = JSON.stringify(paymentSplit);

  try {
    const result = await db.transaction(async (tx) => {
      const [doc] = await tx
        .update(documentsTable)
        .set(updates)
        .where(and(eq(documentsTable.id, idParsed.data.id), eq(documentsTable.userId, userId)))
        .returning();
      if (!doc) return null;

      if (items) {
        await tx.delete(documentItemsTable).where(eq(documentItemsTable.documentId, doc.id));
        const insertedItems = await tx
          .insert(documentItemsTable)
          .values(items.map((it) => ({
            documentId: doc.id,
            name: it.name,
            batch: it.batch,
            hsCode: it.hsCode,
            quantity: String(it.quantity),
            price: String(it.price),
          })))
          .returning();
        return { doc, docItems: insertedItems };
      }
      const docItems = await tx.select().from(documentItemsTable).where(eq(documentItemsTable.documentId, doc.id));
      return { doc, docItems };
    });
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(result.doc, result.docItems));
  } catch (err) {
    req.log.error({ err }, "Failed to update document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeleteDocumentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      await tx.delete(documentItemsTable).where(eq(documentItemsTable.documentId, parsed.data.id));
      await tx
        .delete(documentsTable)
        .where(and(eq(documentsTable.id, parsed.data.id), eq(documentsTable.userId, userId)));
    });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
