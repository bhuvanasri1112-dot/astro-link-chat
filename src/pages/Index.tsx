import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, Heart, Sparkles, MessageCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-40 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        <div className="inline-block floating">
          <div className="cosmic-glow p-6 rounded-full bg-primary/10 mb-6">
            <Rocket className="w-20 h-20 text-primary" />
          </div>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold gradient-text mb-4">
          Stellar Link
        </h1>
        
        <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto">
          An empathetic AI companion bridging hearts across the cosmos
        </p>

        <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2 cosmic-card px-4 py-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span>Natural Conversations</span>
          </div>
          <div className="flex items-center gap-2 cosmic-card px-4 py-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span>Message Routing</span>
          </div>
          <div className="flex items-center gap-2 cosmic-card px-4 py-2">
            <Heart className="w-4 h-4 text-accent" />
            <span>Empathetic Support</span>
          </div>
        </div>

        <div className="pt-8">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity text-lg px-8 py-6 cosmic-glow"
          >
            Get Started
          </Button>
        </div>

        <div className="pt-12 space-y-6 cosmic-card p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold gradient-text">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Rocket className="w-5 h-5" />
                <h3 className="font-semibold">For Astronauts</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Stay connected with loved ones through AI-mediated communication. 
                Send messages naturally and get emotional support during missions.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-secondary">
                <Heart className="w-5 h-5" />
                <h3 className="font-semibold">For Relatives</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Send messages of love and support to your astronaut. 
                The AI ensures timely delivery and provides compassionate companionship.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
