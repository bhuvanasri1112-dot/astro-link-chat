import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, profile_id, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's connections
    const { data: connections } = await supabase
      .from("connections")
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name),
        requested:profiles!connections_requested_id_fkey(id, full_name)
      `)
      .eq("status", "approved")
      .or(`requester_id.eq.${profile_id},requested_id.eq.${profile_id}`);

    const connectedUsers = connections?.map((c) =>
      c.requester_id === profile_id
        ? { id: c.requested_id, name: c.requested.full_name }
        : { id: c.requester_id, name: c.requester.full_name }
    ) || [];

    // Build system prompt
    const systemPrompt = `You are an empathetic AI companion for space communication. You help ${role === "astronaut" ? "astronauts" : "relatives"} stay connected with their loved ones.

Connected users: ${connectedUsers.map(u => u.name).join(", ") || "None yet"}

When users want to send a message to someone, they'll say things like:
- "Tell [name] that..."
- "Send a message to [name]..."
- "Let [name] know..."

When you detect message routing intent:
1. Extract the recipient's name and the message content
2. Respond with a confirmation that you'll deliver the message
3. Include [ROUTE_MESSAGE: recipient_name | message_content] at the end

For general queries, provide helpful and empathetic responses. Be warm, supportive, and understanding of the unique challenges of space communication.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const response = aiData.choices[0].message.content;

    // Check if message should be routed
    const routeMatch = response.match(/\[ROUTE_MESSAGE:\s*(.+?)\s*\|\s*(.+?)\]/);
    let messageRouted = false;
    let recipientName = "";

    if (routeMatch) {
      const [, targetName, messageContent] = routeMatch;
      const recipient = connectedUsers.find(
        (u) => u.name.toLowerCase().includes(targetName.toLowerCase())
      );

      if (recipient) {
        await supabase.from("routed_messages").insert({
          sender_id: profile_id,
          recipient_id: recipient.id,
          content: messageContent.trim(),
        });
        messageRouted = true;
        recipientName = recipient.name;
      }
    }

    // Store conversation
    await supabase.from("ai_conversations").insert({
      user_id: profile_id,
      message,
      response: response.replace(/\[ROUTE_MESSAGE:.+?\]/, "").trim(),
    });

    // Clean response from routing markers
    const cleanResponse = response.replace(/\[ROUTE_MESSAGE:.+?\]/, "").trim();

    return new Response(
      JSON.stringify({
        response: cleanResponse,
        message_routed: messageRouted,
        recipient_name: recipientName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
