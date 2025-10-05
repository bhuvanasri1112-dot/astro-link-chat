import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Users } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"astronaut" | "relative">("astronaut");
  const [missionName, setMissionName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Connecting to Stellar Link..." });
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              role: role,
              mission_name: role === "astronaut" ? missionName : null,
              relationship: role === "relative" ? relationship : null,
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Welcome to Stellar Link. Redirecting...",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="cosmic-card w-full max-w-md p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="cosmic-glow p-4 rounded-full bg-primary/10">
              <Rocket className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Stellar Link</h1>
          <p className="text-muted-foreground">
            Bridging hearts across the cosmos
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-3">
                <Label>I am a</Label>
                <RadioGroup value={role} onValueChange={(v: any) => setRole(v)}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="astronaut" id="astronaut" />
                    <Label htmlFor="astronaut" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Rocket className="w-4 h-4 text-primary" />
                      Astronaut
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border/50 hover:border-secondary/50 transition-colors">
                    <RadioGroupItem value="relative" id="relative" />
                    <Label htmlFor="relative" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Users className="w-4 h-4 text-secondary" />
                      Relative
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {role === "astronaut" && (
                <div className="space-y-2">
                  <Label htmlFor="mission">Mission Name</Label>
                  <Input
                    id="mission"
                    placeholder="e.g., ISS Expedition 70"
                    value={missionName}
                    onChange={(e) => setMissionName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              )}

              {role === "relative" && (
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    placeholder="e.g., Mother, Spouse, Sibling"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-background/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
