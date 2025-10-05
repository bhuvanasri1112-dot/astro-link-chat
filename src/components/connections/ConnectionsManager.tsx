import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check, X, Loader2, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConnectionsManagerProps {
  profile: any;
}

const ConnectionsManager = ({ profile }: ConnectionsManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConnections();
    subscribeToPendingRequests();
  }, [profile.id]);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("connections")
        .select(
          `
          *,
          requester:profiles!connections_requester_id_fkey(id, full_name, role, mission_name, relationship),
          requested:profiles!connections_requested_id_fkey(id, full_name, role, mission_name, relationship)
        `
        )
        .or(`requester_id.eq.${profile.id},requested_id.eq.${profile.id}`);

      if (error) throw error;

      const approved = data?.filter((c) => c.status === "approved") || [];
      const pending = data?.filter(
        (c) => c.status === "pending" && c.requested_id === profile.id
      ) || [];

      setConnections(approved);
      setPendingRequests(pending);
    } catch (error: any) {
      console.error("Error loading connections:", error);
    }
  };

  const subscribeToPendingRequests = () => {
    const channel = supabase
      .channel("connection-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "connections",
          filter: `requested_id=eq.${profile.id}`,
        },
        () => {
          toast({
            title: "New connection request!",
            description: "Someone wants to connect with you",
          });
          loadConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", profile.id)
        .ilike("full_name", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendConnectionRequest = async (targetId: string) => {
    try {
      const { error } = await supabase.from("connections").insert({
        requester_id: profile.id,
        requested_id: targetId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request sent!",
        description: "Connection request sent successfully",
      });
      setSearchResults([]);
      setSearchQuery("");
    } catch (error: any) {
      toast({
        title: "Failed to send request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRequest = async (connectionId: string, action: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: action })
        .eq("id", connectionId);

      if (error) throw error;

      toast({
        title: action === "approved" ? "Request accepted!" : "Request rejected",
        description:
          action === "approved"
            ? "You can now exchange messages"
            : "The request has been declined",
      });
      loadConnections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="cosmic-card h-[calc(100vh-250px)] flex flex-col">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Connections</h3>
          <Badge variant="secondary" className="ml-auto">
            {connections.length} connected
          </Badge>
        </div>

        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for astronauts or relatives..."
            className="bg-background/50"
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
          />
          <Button onClick={searchUsers} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Search Results</h4>
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3 rounded-lg border border-border/30 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role === "astronaut" ? user.mission_name : user.relationship}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendConnectionRequest(user.id)}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Pending Requests</h4>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-lg border border-primary/30 bg-primary/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{req.requester.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.requester.role === "astronaut"
                          ? req.requester.mission_name
                          : req.requester.relationship}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequest(req.id, "approved")}
                      className="flex-1 bg-gradient-to-r from-primary to-secondary"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequest(req.id, "rejected")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Users */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Your Connections</h4>
          {connections.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No connections yet</p>
              <p className="text-sm">Search and connect with others to start messaging</p>
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((conn) => {
                const otherUser =
                  conn.requester_id === profile.id ? conn.requested : conn.requester;
                return (
                  <div
                    key={conn.id}
                    className="p-3 rounded-lg border border-border/30 flex items-center justify-between hover:border-primary/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{otherUser.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {otherUser.role === "astronaut"
                          ? otherUser.mission_name || "Astronaut"
                          : otherUser.relationship || "Family Member"}
                      </p>
                    </div>
                    <Badge>{otherUser.role}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConnectionsManager;
