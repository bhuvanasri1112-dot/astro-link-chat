// supabase/functions/chat/index.ts
import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

// Import Google Generative AI SDK for Deno
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1';

serve(async (req) => {
  try {
    const { message, profile_id, role } = await req.json();

    if (!message || !profile_id) {
      return new Response(
        JSON.stringify({ error: 'Missing message or profile_id' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_GEMINI_API_KEY') ?? '');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Empathetic and routing-aware prompt
    const prompt = `
You are an empathetic AI companion in the "Stellar Link" app, designed for astronauts on space missions and their relatives on Earth. 
The user is a ${role} (astronaut or relative). Respond warmly, supportively, and empathetically to their message, acknowledging their feelings or situation.

Key rules:
1. If the message is a general question or statement (e.g., "How are you?", "I feel lonely", "What's the mission like?"), provide a helpful, empathetic response. Do not route it.
2. If the message seems directed to a specific family member (e.g., "Tell my mom I love her", "Send a message to my dad saying I'm safe", "I want to tell John about my day"), 
   - Extract the intended recipient's name or relationship (e.g., "mom", "dad", "John").
   - Respond empathetically confirming you'll route the message (e.g., "That's wonderful to hear. I'll make sure your mom gets that message.").
   - In your JSON output, set "intended_recipient_name" to the extracted name (e.g., "mom").
3. Always keep responses concise (under 150 words), positive, and relevant to space travel/family bonds.
4. Output ONLY valid JSON in this exact format: 
   {
     "ai_reply": "Your empathetic response here",
     "intended_recipient_name": "extracted name or null"
   }
   Do not add extra text.

User message: "${message}"
    `;

    // Generate response from Gemini
    let aiOutput;
    try {
      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();
      aiOutput = JSON.parse(responseText);  // Parse the JSON from Gemini's output
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      // Fallback response if Gemini fails
      aiOutput = {
        ai_reply: "I'm here for you. It sounds like you're going through something—tell me more, and I'll listen.",
        intended_recipient_name: null
      };
    }

    const aiResponseContent = aiOutput.ai_reply;
    const potentialRecipientName = aiOutput.intended_recipient_name;

    let messageRouted = false;
    let recipientName = null;

    // --- Message Routing Logic (unchanged from before) ---
    if (potentialRecipientName) {
      // Search for the intended recipient among approved connections
      const { data: connectionsData, error: connectionsError } = await supabaseClient
        .from("connections")
        .select(
          `
          id,
          status,
          requester:profiles!connections_requester_id_fkey(id, full_name, role, relationship, mission_name),
          requested:profiles!connections_requested_id_fkey(id, full_name, role, relationship, mission_name)
        `
        )
        .or(`requester_id.eq.${profile_id},requested_id.eq.${profile_id}`);

      if (connectionsError) {
        console.error("Error fetching connections:", connectionsError);
        // Adjust AI response for error
        aiResponseContent = "I understand what you're trying to say, but I had trouble checking your connections. Let's try again soon.";
      } else {
        let foundRecipientProfile = null;

        for (const conn of connectionsData || []) {
          if (conn.status === "approved") {
            const otherUser  = conn.requester.id === profile_id ? conn.requested : conn.requester;

            // Match by name or relationship
            const nameMatch = otherUser .full_name.toLowerCase().includes(potentialRecipientName.toLowerCase());
            const relationshipMatch = otherUser .relationship?.toLowerCase().includes(potentialRecipientName.toLowerCase());

            if (nameMatch || relationshipMatch) {
              foundRecipientProfile = otherUser ;
              break;
            }
          }
        }

        if (foundRecipientProfile) {
          const recipientId = foundRecipientProfile.id;

          // Insert routed message
          const { error: insertError } = await supabaseClient
            .from("routed_messages")
            .insert({
              sender_id: profile_id,
              recipient_id: recipientId,
              content: message,
            });

          if (insertError) {
            console.error("Error inserting routed message:", insertError);
            aiResponseContent = "I hear you, and your words mean a lot. There was a small glitch sending it—I'll help you try again.";
          } else {
            messageRouted = true;
            recipientName = foundRecipientProfile.full_name;
            // Gemini already crafted a confirming response, but we can enhance if needed
            aiResponseContent = `${aiResponseContent} Your message has been sent to ${recipientName}. They'll see it soon.`;
          }
        } else {
          aiResponseContent = `${aiResponseContent} I couldn't find a connection for "${potentialRecipientName}". Let's build that link together first.`;
        }
      }
    }

    // --- Save AI Conversation ---
    await supabaseClient.from("ai_conversations").insert({
      user_id: profile_id,  // Note: This is profile_id, as per multi-profile setup
      message: message,
      response: aiResponseContent,
    });

    return new Response(
      JSON.stringify({
        response: aiResponseContent,
        message_routed: messageRouted,
        recipient_name: recipientName,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred." }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
