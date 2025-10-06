import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export function assertResendClient(): Resend {
  if (!resend) {
    throw new Error("Resend client is not configured. Set RESEND_API_KEY env variable.");
  }

  return resend;
}

export function getResendFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }

  return from;
}
