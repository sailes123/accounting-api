import { Router } from "express";
import { db, productsTable } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "../lib/api";

const router = Router();

function fmt(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    stock: p.stock,
    sellingPrice: Number(p.sellingPrice),
    purchasePrice: Number(p.purchasePrice),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));
    res.json(products.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, stock, sellingPrice, purchasePrice } = parsed.data;
  try {
    const [product] = await db
      .insert(productsTable)
      .values({ name, stock, sellingPrice: String(sellingPrice), purchasePrice: String(purchasePrice) })
      .returning();
    res.status(201).json(fmt(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.id));
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
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.stock !== undefined) updates.stock = parsed.data.stock;
  if (parsed.data.sellingPrice !== undefined) updates.sellingPrice = String(parsed.data.sellingPrice);
  if (parsed.data.purchasePrice !== undefined) updates.purchasePrice = String(parsed.data.purchasePrice);
  try {
    const [product] = await db
      .update(productsTable)
      .set(updates)
      .where(eq(productsTable.id, idParsed.data.id))
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
  const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(productsTable).where(eq(productsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
