import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Inbox, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessagesCenterProps {
  profile: any;
}

interface RoutedMessage {
  id: string;
  sender: { full_name: string; role: string };
  recipient: { full_name: string };
  content: string;
  read_at: string | null;
  created_at: string;
}

const MessagesCenter = ({ profile }: MessagesCenterProps) => {
  const [messages, setMessages] = useState<RoutedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, [profile.id]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("routed_messages")
        .select(
          `
          *,
          sender:profiles!routed_messages_sender_id_fkey(full_name, role),
          recipient:profiles!routed_messages_recipient_id_fkey(full_name)
        `
        )
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("routed-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "routed_messages",
          filter: `recipient_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast({
              title: "New message received!",
              description: "You have a new message from your connection",
            });
            loadMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from("routed_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId);
      loadMessages();
    } catch (error: any) {
      console.error("Error marking message as read:", error);
    }
  };

  if (loading) {
    return (
      <div className="cosmic-card h-[calc(100vh-250px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="cosmic-card h-[calc(100vh-250px)] flex flex-col">
      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <Inbox className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Message Center</h3>
        <Badge variant="secondary" className="ml-auto">
          {messages.filter((m) => !m.read_at && m.recipient.full_name === profile.full_name).length} unread
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Messages routed through your AI companion will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isReceived = message.recipient.full_name === profile.full_name;
              const isUnread = isReceived && !message.read_at;

              return (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border ${
                    isUnread ? "border-primary/50 bg-primary/5" : "border-border/30"
                  } hover:border-primary/30 transition-colors cursor-pointer`}
                  onClick={() => isUnread && markAsRead(message.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {isReceived ? message.sender.full_name : message.recipient.full_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {isReceived ? "From" : "To"}
                      </Badge>
                      {isUnread && <Badge className="text-xs">New</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{message.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MessagesCenter;
