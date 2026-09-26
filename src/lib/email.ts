type EmailPurpose = "verification" | "password-reset";

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }
  return { apiKey, from };
}

export async function sendVerificationCode(to: string, code: string, purpose: EmailPurpose): Promise<void> {
  const { apiKey, from } = emailConfig();
  const isReset = purpose === "password-reset";
  const action = isReset ? "reset your password" : "verify your email address";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: isReset ? "Reset your AI Karobar password" : "Verify your AI Karobar email",
      text: `Your AI Karobar verification code is: ${code}\n\nUse this code to ${action}. It expires in 15 minutes. If you did not request this, you can ignore this email.`,
    }),
  });
  if (!response.ok) throw new Error(`Resend email request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
}
