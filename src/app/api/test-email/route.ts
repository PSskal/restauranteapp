import { NextResponse } from "next/server";
import { assertResendClient, getResendFromAddress } from "@/lib/resend";

export async function POST() {
  try {
    const resend = assertResendClient();
    const from = getResendFromAddress();

    console.log("Testing Resend configuration:", { from });

    const result = await resend.emails.send({
      from,
      to: "ricpascual29@gmail.com", // Tu email para testing
      subject: "Test Email from Restaurant App - passkal.com verified!",
      html: "<p>This is a test email to verify Resend configuration.</p>",
      text: "This is a test email to verify Resend configuration.",
    });

    console.log("Resend test result:", result);

    if (result.error) {
      return NextResponse.json(
        { error: "Resend API error", details: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
