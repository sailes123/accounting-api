import { Router } from "express";
import { db, usersTable } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";
import { authRateLimit } from "../middlewares/rateLimit";
import { sendVerificationCode } from "../lib/email";

const router = Router();
router.use(authRateLimit);

const registerSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const emailSchema = z.object({ email: z.string().email() });
const codeSchema = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) });
const resetPasswordSchema = codeSchema.extend({ password: z.string().min(6) });

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

function createCode() {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { code, hash: createHash("sha256").update(code).digest("hex") };
}

function codeMatches(code: string, hash: string | null): boolean {
  if (!hash) return false;
  const supplied = Buffer.from(createHash("sha256").update(code).digest("hex"), "hex");
  const stored = Buffer.from(hash, "hex");
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

function expiry() {
  return new Date(Date.now() + 15 * 60 * 1000);
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
      if (existing.emailVerified) {
        res.status(409).json({ error: "Email already registered. Sign in instead." });
        return;
      }
      const { code, hash } = createCode();
      await db.update(usersTable).set({
        verificationCodeHash: hash,
        verificationCodeExpiresAt: expiry(),
      }).where(eq(usersTable.id, existing.id));
      await sendVerificationCode(existing.email, code, "verification");
      res.json({ message: "This account is awaiting verification. A new code has been sent.", email: existing.email });
      return;
    }

    const { code, hash } = createCode();
    await db.insert(usersTable).values({ fullName, email, password: await bcrypt.hash(password, 12), verificationCodeHash: hash, verificationCodeExpiresAt: expiry() });
    await sendVerificationCode(email, code, "verification");
    res.status(201).json({ message: "Verification code sent", email });
  } catch (err) {
    req.log.error({ err }, "Failed to register user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/verify-email", async (req, res) => {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
    if (!user || !user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date() || !codeMatches(parsed.data.code, user.verificationCodeHash)) return void res.status(400).json({ error: "Invalid or expired verification code" });
    const [verified] = await db.update(usersTable).set({ emailVerified: true, verificationCodeHash: null, verificationCodeExpiresAt: null }).where(eq(usersTable.id, user.id)).returning();
    res.json({ token: jwt.sign({ userId: verified.id }, getSecret(), { expiresIn: "7d" }), user: { id: verified.id, fullName: verified.fullName, email: verified.email } });
  } catch (err) {
    req.log.error({ err }, "Failed to verify email");
    res.status(500).json({ error: "Unable to verify email" });
  }
});

router.post("/resend-verification", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
    if (user && !user.emailVerified) {
      const { code, hash } = createCode();
      await db.update(usersTable).set({ verificationCodeHash: hash, verificationCodeExpiresAt: expiry() }).where(eq(usersTable.id, user.id));
      await sendVerificationCode(user.email, code, "verification");
    }
    res.json({ message: "If this account needs verification, a code has been sent." });
  } catch (err) {
    req.log.error({ err }, "Failed to resend verification code");
    res.status(500).json({ error: "Unable to send verification code" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
    if (user) {
      const { code, hash } = createCode();
      await db.update(usersTable).set({ passwordResetCodeHash: hash, passwordResetCodeExpiresAt: expiry() }).where(eq(usersTable.id, user.id));
      await sendVerificationCode(user.email, code, "password-reset");
    }
    res.json({ message: "If an account exists for this email, a reset code has been sent." });
  } catch (err) {
    req.log.error({ err }, "Failed to send password reset code");
    res.status(500).json({ error: "Unable to send password reset code" });
  }
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid request body" });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
    if (!user || !user.passwordResetCodeExpiresAt || user.passwordResetCodeExpiresAt < new Date() || !codeMatches(parsed.data.code, user.passwordResetCodeHash)) return void res.status(400).json({ error: "Invalid or expired reset code" });
    await db.update(usersTable).set({ password: await bcrypt.hash(parsed.data.password, 12), passwordResetCodeHash: null, passwordResetCodeExpiresAt: null }).where(eq(usersTable.id, user.id));
    res.json({ message: "Password updated. You can now sign in." });
  } catch (err) {
    req.log.error({ err }, "Failed to reset password");
    res.status(500).json({ error: "Unable to reset password" });
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
    if (!user.emailVerified) {
      res.status(403).json({ error: "Verify your email before signing in", code: "EMAIL_NOT_VERIFIED" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, getSecret(), { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    req.log.error({ err }, "Failed to login");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
