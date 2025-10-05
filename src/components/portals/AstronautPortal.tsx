import { useState } from "react";
import { Rocket, MessageSquare, Users, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ChatInterface from "@/components/chat/ChatInterface";
import MessagesCenter from "@/components/messages/MessagesCenter";
import ConnectionsManager from "@/components/connections/ConnectionsManager";

interface AstronautPortalProps {
  profile: any;
}

const AstronautPortal = ({ profile }: AstronautPortalProps) => {
  const [activeTab, setActiveTab] = useState<"chat" | "messages" | "connections">("chat");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="cosmic-card m-4 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="cosmic-glow p-2 rounded-full bg-primary/10">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.mission_name || "Astronaut"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </header>

      {/* Navigation */}
      <div className="flex gap-2 px-4">
        <Button
          variant={activeTab === "chat" ? "default" : "outline"}
          className={activeTab === "chat" ? "bg-gradient-to-r from-primary to-secondary" : ""}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          AI Companion
        </Button>
        <Button
          variant={activeTab === "messages" ? "default" : "outline"}
          className={activeTab === "messages" ? "bg-gradient-to-r from-primary to-secondary" : ""}
          onClick={() => setActiveTab("messages")}
        >
          <Mail className="w-4 h-4 mr-2" />
          Messages
        </Button>
        <Button
          variant={activeTab === "connections" ? "default" : "outline"}
          className={activeTab === "connections" ? "bg-gradient-to-r from-primary to-secondary" : ""}
          onClick={() => setActiveTab("connections")}
        >
          <Users className="w-4 h-4 mr-2" />
          Connections
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {activeTab === "chat" && <ChatInterface profile={profile} />}
        {activeTab === "messages" && <MessagesCenter profile={profile} />}
        {activeTab === "connections" && <ConnectionsManager profile={profile} />}
      </div>
    </div>
  );
};

export default AstronautPortal;
