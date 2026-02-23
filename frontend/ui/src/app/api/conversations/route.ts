import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const email = user.email || "";
    const sessionId = req.headers.get("X-Session-ID") || undefined;
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8080";

    const headers: Record<string, string> = {
      "X-User-Email": email,
    };
    if (sessionId) {
      headers["X-Session-ID"] = sessionId;
    }

    const gatewayResponse = await fetch(`${gatewayUrl}/conversations`, {
      method: "DELETE",
      headers,
    });

    if (!gatewayResponse.ok) {
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      );
    }

    const data = await gatewayResponse.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[Conversations API] Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
