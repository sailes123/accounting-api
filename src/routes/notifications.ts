import { Router } from "express";
import { db, notificationsTable, productsTable } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import type { AuthRequest } from "../middlewares/auth";

const router = Router();

const idParamsSchema = z.object({ id: z.coerce.number() });

async function reconcileLowStockNotifications(userId: number): Promise<void> {
  const lowStockProducts = await db
    .select()
    .from(productsTable)
    .where(
      sql`${productsTable.userId} = ${userId}
        AND reorder_point IS NOT NULL
        AND reorder_point::numeric > 0
        AND stock::numeric <= reorder_point::numeric`,
    );
  const lowStockIds = new Set(lowStockProducts.map((p) => p.id));

  const existing = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.type, "low_stock")));

  const stillLowIds = new Set<number>();
  for (const n of existing) {
    if (n.productId != null) {
      if (lowStockIds.has(n.productId)) {
        stillLowIds.add(n.productId);
      } else {
        // Product was restocked above its reorder point — clear the stale alert.
        await db.delete(notificationsTable).where(eq(notificationsTable.id, n.id));
      }
    }
  }

  for (const p of lowStockProducts) {
    if (!stillLowIds.has(p.id)) {
      await db.insert(notificationsTable).values({
        userId,
        type: "low_stock",
        productId: p.id,
        title: "Low stock alert",
        message: `${p.name} is low on stock (${p.stock} left, reorder at ${p.reorderPoint}).`,
        isRead: false,
      });
    }
  }
}

function fmt(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    type: n.type,
    productId: n.productId,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    await reconcileLowStockNotifications(userId);
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json(rows.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/unread-count", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    await reconcileLowStockNotifications(userId);
    const [result] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
    res.json({ count: Number(result?.count ?? 0) });
  } catch (err) {
    req.log.error({ err }, "Failed to get unread notification count");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/read-all", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/read", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = idParamsSchema.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [row] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, parsed.data.id), eq(notificationsTable.userId, userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(fmt(row));
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
