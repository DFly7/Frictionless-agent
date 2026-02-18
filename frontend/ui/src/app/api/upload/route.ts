import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64Content = Buffer.from(buffer).toString("base64");

        const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8080";

        const gatewayResponse = await fetch(`${gatewayUrl}/uploads`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Email": email,
            },
            body: JSON.stringify({
                files: [
                    {
                        name: file.name,
                        content_base64: base64Content,
                    },
                ],
            }),
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
        console.error("[Upload API] Internal error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
