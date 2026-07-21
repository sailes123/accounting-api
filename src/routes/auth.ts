import { Router } from "express";
import crypto from "crypto";
import { db, usersTable, passwordResetTokensTable } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod/v4";
import { authRateLimit } from "../middlewares/rateLimit";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendPasswordResetEmail } from "../lib/mailer";

const router = Router();
router.use(authRateLimit);

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const registerSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { fullName, email, password } = parsed.data;

  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({ fullName, email, password: hashed }).returning();

    const token = jwt.sign({ userId: user.id }, getSecret(), { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    req.log.error({ err }, "Failed to register user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, getSecret(), { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    req.log.error({ err }, "Failed to login");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/password", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to change password");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const genericResponse = { message: "If that email is registered, a password reset link has been sent." };

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      await db.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      const resetUrl = `${getFrontendUrl()}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
  } catch (err) {
    // Never leak whether the email exists or whether sending failed; just log it.
    req.log.error({ err }, "Failed to process forgot-password request");
  }

  res.json(genericResponse);
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { token, newPassword } = parsed.data;
  const tokenHash = hashToken(token);

  try {
    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.tokenHash, tokenHash));

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, record.userId));
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, record.id));

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to reset password");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
