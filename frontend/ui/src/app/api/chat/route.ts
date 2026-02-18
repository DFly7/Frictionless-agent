import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // 1. Authenticate user
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

        // 2. Parse request body
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "No messages provided" },
                { status: 400 }
            );
        }

        // Extract the last user message
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== "user") {
            return NextResponse.json(
                { error: "Last message must be from user" },
                { status: 400 }
            );
        }

        // 3. Determine Agent ID
        // Logic: Map user email to agent ID (1 or 2)
        // If email contains "user2", use "2", else default to "1"
        const email = user.email || "";
        let agentId = "1";
        if (email.includes("user2")) {
            agentId = "2";
        }
        // You can expand this logic or use a database mapping later

        // 4. Proxy to Gateway
        const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8080";

        const gatewayResponse = await fetch(`${gatewayUrl}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-ID": agentId,
            },
            body: JSON.stringify({
                message: lastMessage.content,
            }),
        });

        if (!gatewayResponse.ok) {
            const errorText = await gatewayResponse.text();
            console.error("[Chat API] Gateway error:", gatewayResponse.status, errorText);
            return NextResponse.json(
                { error: `Gateway error (${gatewayResponse.status}): ${errorText}` },
                { status: gatewayResponse.status }
            );
        }

        const data = await gatewayResponse.json();

        // 5. Return response
        // The Gateway returns { "response": "..." }
        // We return it as a simple text response for useChat to consume (or as a stream if we wanted to get fancy)
        // For simplicity with useChat non-streaming mode, we can just return the text.
        // However, useChat expects a stream by default.
        // We can simulate a stream or just return the text.
        // If we return a simple Response with the text body, useChat handles it.

        return new Response(data.response);

    } catch (error: any) {
        console.error("[Chat API] Internal error:", error);
        const errorMsg = error.message || "Internal Server Error";
        return NextResponse.json(
            { error: errorMsg },
            { status: 500 }
        );
    }
}
