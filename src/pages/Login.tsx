import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="w-full max-w-sm border-sidebar-border bg-sidebar-accent">
          <CardContent className="p-8">
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-sidebar-accent-foreground">CollabHub</h1>
              <p className="text-sm text-sidebar-muted mt-1">Sign in to your workspace</p>
            </motion.div>

            <motion.form
              onSubmit={handleLogin}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <div>
                <Label className="text-sidebar-accent-foreground">Email</Label>
                <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sidebar-accent-foreground">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <div className="relative mt-1">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-muted hover:text-sidebar-accent-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">Sign In</Button>
            </motion.form>

            <p className="text-xs text-sidebar-muted text-center mt-6">
              Don't have an account? Contact your admin for an invite.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
