import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Eye, EyeOff, Check, ChevronRight, User, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function InviteSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", password: "", confirmPassword: "", selectedTeam: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      return;
    }

    // Fetch invite data
    fetch(`${API_BASE}/auth/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setInviteData(data);
        // Fetch teams if teamId is provided
        if (data.teamId) {
          fetch(`${API_BASE}/teams`)
            .then((r) => r.json())
            .then((teamsData) => setTeams(teamsData));
        }
      })
      .catch((err) => {
        setError("Failed to load invite data");
        console.error(err);
      });
  }, [token]);

  const handleComplete = async () => {
    if (!token) {
      setError("Invalid invite token");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[!@#$%^&*]/.test(formData.password)) {
      setError("Password does not meet requirements");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/invite/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          password: formData.password,
          teamId: formData.selectedTeam || inviteData?.teamId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Setup failed" }));
        setError(errorData.message || "Failed to complete setup");
        setLoading(false);
        return;
      }

      const data = await response.json();
      auth.setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
      });

      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -30, transition: { duration: 0.15 } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <Card className="w-full max-w-md border-sidebar-border bg-sidebar-accent">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-sidebar-accent-foreground">Welcome to CollabHub</h1>
              <p className="text-sm text-sidebar-muted mt-1">You've been invited to join {inviteData?.organization || "the organization"}</p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <motion.div
                    animate={{
                      backgroundColor: step > s ? "hsl(var(--success))" : step === s ? "hsl(var(--primary))" : "hsl(var(--sidebar-border))",
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ color: step >= s ? "white" : "hsl(var(--sidebar-muted))" }}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </motion.div>
                  {s < 3 && <motion.div animate={{ backgroundColor: step > s ? "hsl(var(--success))" : "hsl(var(--sidebar-border))" }} className="w-8 h-0.5" />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  <h2 className="text-base font-semibold text-sidebar-accent-foreground flex items-center gap-2"><User className="w-4 h-4" /> Set up your profile</h2>
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20"><AvatarFallback className="bg-primary/20 text-primary text-lg">{formData.firstName?.[0] || "?"}{formData.lastName?.[0] || ""}</AvatarFallback></Avatar>
                      <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-sidebar-accent-foreground text-xs">First Name</Label><Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="First name" className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted" /></div>
                    <div><Label className="text-sidebar-accent-foreground text-xs">Last Name</Label><Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Last name" className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted" /></div>
                  </div>
                  <div className="bg-sidebar/50 rounded-lg p-3 border border-sidebar-border"><p className="text-xs text-sidebar-muted">Invited email</p><p className="text-sm text-sidebar-accent-foreground font-medium">{inviteData?.email || "Loading..."}</p></div>
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </div>
                  )}
                  <Button className="w-full" onClick={() => setStep(2)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  <h2 className="text-base font-semibold text-sidebar-accent-foreground flex items-center gap-2"><Lock className="w-4 h-4" /> Create your password</h2>
                  <div>
                    <Label className="text-sidebar-accent-foreground text-xs">Password</Label>
                    <div className="relative mt-1">
                      <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Min 8 characters" className="bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted pr-10" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-muted">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div><Label className="text-sidebar-accent-foreground text-xs">Confirm Password</Label><Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Re-enter password" className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted" /></div>
                  <div className="space-y-1.5">
                    {[
                      { label: "At least 8 characters", met: formData.password.length >= 8 },
                      { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
                      { label: "Contains special character", met: /[!@#$%^&*]/.test(formData.password) },
                      { label: "Passwords match", met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 },
                    ].map((req) => (
                      <motion.div key={req.label} className="flex items-center gap-2" animate={{ opacity: 1 }}>
                        <motion.div animate={{ scale: req.met ? 1 : 0.8, backgroundColor: req.met ? "hsl(var(--success))" : "hsl(var(--sidebar-border))" }} className="w-4 h-4 rounded-full flex items-center justify-center">
                          {req.met && <Check className="w-3 h-3 text-success-foreground" />}
                        </motion.div>
                        <span className={`text-xs ${req.met ? "text-success" : "text-sidebar-muted"}`}>{req.label}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-sidebar-border text-sidebar-accent-foreground" onClick={() => setStep(1)}>Back</Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  <h2 className="text-base font-semibold text-sidebar-accent-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Join a team</h2>
                  <p className="text-xs text-sidebar-muted">Select your initial team. You can join more teams later.</p>
                  <div className="space-y-2">
                    {teams.map((team, i) => (
                      <motion.button
                        key={team.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => setFormData({ ...formData, selectedTeam: team.id })}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${formData.selectedTeam === team.id ? "border-primary bg-primary/10" : "border-sidebar-border hover:border-sidebar-muted bg-sidebar"}`}
                      >
                        <span className="text-2xl">{team.icon}</span>
                        <div className="flex-1"><p className="text-sm font-medium text-sidebar-accent-foreground">{team.name}</p><p className="text-xs text-sidebar-muted">{team.members} members</p></div>
                        {formData.selectedTeam === team.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-primary-foreground" /></motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-sidebar-border text-sidebar-accent-foreground" onClick={() => setStep(2)}>Back</Button>
                    <Button className="flex-1" onClick={handleComplete} disabled={loading || !formData.selectedTeam}>
                      {loading ? "Setting up..." : "Get Started 🚀"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
