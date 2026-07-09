import { Router } from "express";
import { db, productsTable } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "../lib/api";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

function fmt(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    category: p.category,
    subCategory: p.subCategory,
    hsnCode: p.hsnCode,
    sku: p.sku,
    reorderPoint: p.reorderPoint === null ? null : Number(p.reorderPoint),
    description: p.description,
    unit: p.unit,
    subUnit: p.subUnit,
    unitConvFrom: p.unitConvFrom === null ? null : Number(p.unitConvFrom),
    unitConvTo: p.unitConvTo === null ? null : Number(p.unitConvTo),
    stock: Number(p.stock),
    sellingPrice: Number(p.sellingPrice),
    purchasePrice: Number(p.purchasePrice),
    secondarySellingPrice: p.secondarySellingPrice === null ? null : Number(p.secondarySellingPrice),
    size: p.size,
    expiryDate: p.expiryDate,
    customerId: p.customerId,
    purchaseNonTaxable: p.purchaseNonTaxable,
    salesNonTaxable: p.salesNonTaxable,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.userId, userId))
      .orderBy(desc(productsTable.createdAt));
    res.json(products.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const {
    type, name, category, subCategory, hsnCode, sku, reorderPoint, description,
    unit, subUnit, unitConvFrom, unitConvTo, stock, sellingPrice, purchasePrice,
    secondarySellingPrice, size, expiryDate, customerId, purchaseNonTaxable, salesNonTaxable,
  } = parsed.data;
  try {
    const [product] = await db
      .insert(productsTable)
      .values({
        userId,
        type,
        name,
        category,
        subCategory,
        hsnCode,
        sku,
        reorderPoint: reorderPoint === undefined ? undefined : String(reorderPoint),
        description,
        unit,
        subUnit,
        unitConvFrom: unitConvFrom === undefined ? undefined : String(unitConvFrom),
        unitConvTo: unitConvTo === undefined ? undefined : String(unitConvTo),
        stock: String(stock),
        sellingPrice: String(sellingPrice),
        purchasePrice: String(purchasePrice),
        secondarySellingPrice: secondarySellingPrice === undefined ? undefined : String(secondarySellingPrice),
        size,
        expiryDate,
        customerId,
        purchaseNonTaxable,
        salesNonTaxable,
      })
      .returning();
    res.status(201).json(fmt(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, parsed.data.id), eq(productsTable.userId, userId)));
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(product));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const idParsed = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.type !== undefined) updates.type = d.type;
  if (d.name !== undefined) updates.name = d.name;
  if (d.category !== undefined) updates.category = d.category;
  if (d.subCategory !== undefined) updates.subCategory = d.subCategory;
  if (d.hsnCode !== undefined) updates.hsnCode = d.hsnCode;
  if (d.sku !== undefined) updates.sku = d.sku;
  if (d.reorderPoint !== undefined) updates.reorderPoint = String(d.reorderPoint);
  if (d.description !== undefined) updates.description = d.description;
  if (d.unit !== undefined) updates.unit = d.unit;
  if (d.subUnit !== undefined) updates.subUnit = d.subUnit;
  if (d.unitConvFrom !== undefined) updates.unitConvFrom = String(d.unitConvFrom);
  if (d.unitConvTo !== undefined) updates.unitConvTo = String(d.unitConvTo);
  if (d.stock !== undefined) updates.stock = String(d.stock);
  if (d.sellingPrice !== undefined) updates.sellingPrice = String(d.sellingPrice);
  if (d.purchasePrice !== undefined) updates.purchasePrice = String(d.purchasePrice);
  if (d.secondarySellingPrice !== undefined) updates.secondarySellingPrice = String(d.secondarySellingPrice);
  if (d.size !== undefined) updates.size = d.size;
  if (d.expiryDate !== undefined) updates.expiryDate = d.expiryDate;
  if (d.customerId !== undefined) updates.customerId = d.customerId;
  if (d.purchaseNonTaxable !== undefined) updates.purchaseNonTaxable = d.purchaseNonTaxable;
  if (d.salesNonTaxable !== undefined) updates.salesNonTaxable = d.salesNonTaxable;
  try {
    const [product] = await db
      .update(productsTable)
      .set(updates)
      .where(and(eq(productsTable.id, idParsed.data.id), eq(productsTable.userId, userId)))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(product));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db
      .delete(productsTable)
      .where(and(eq(productsTable.id, parsed.data.id), eq(productsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
