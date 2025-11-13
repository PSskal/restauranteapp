import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    return NextResponse.json({
      authenticated: !!session,
      session: session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error checking session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
