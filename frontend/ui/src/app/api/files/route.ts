import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
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

    // Determine Agent ID (same logic as chat route)
    const email = user.email || "";
    let agentId = "1";
    if (email.includes("user2")) {
      agentId = "2";
    }

    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8080";

    const gatewayResponse = await fetch(`${gatewayUrl}/files`, {
      method: "GET",
      headers: {
        "X-User-ID": agentId,
      },
    });

    if (!gatewayResponse.ok) {
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      );
    }

    const data = await gatewayResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Files API] Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
