import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Eye, EyeOff, Check, ChevronRight, User, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function InviteSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    selectedTeam: "",
  });

  const teams = [
    { id: "1", name: "Engineering", members: 8, icon: "🛠️" },
    { id: "2", name: "Design", members: 4, icon: "🎨" },
    { id: "3", name: "Operations", members: 5, icon: "📋" },
  ];

  const handleComplete = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-md border-sidebar-border bg-sidebar-accent">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-sidebar-accent-foreground">Welcome to CollabHub</h1>
            <p className="text-sm text-sidebar-muted mt-1">You've been invited to join Acme Corp</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > s ? "bg-success text-success-foreground" :
                  step === s ? "bg-primary text-primary-foreground" :
                  "bg-sidebar-border text-sidebar-muted"
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-success" : "bg-sidebar-border"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-sidebar-accent-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> Set up your profile
              </h2>
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary/20 text-primary text-lg">
                      {formData.firstName?.[0] || "?"}{formData.lastName?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">+</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sidebar-accent-foreground text-xs">First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First name"
                    className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted"
                  />
                </div>
                <div>
                  <Label className="text-sidebar-accent-foreground text-xs">Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                    className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted"
                  />
                </div>
              </div>
              <div className="bg-sidebar/50 rounded-lg p-3 border border-sidebar-border">
                <p className="text-xs text-sidebar-muted">Invited email</p>
                <p className="text-sm text-sidebar-accent-foreground font-medium">newuser@acme.com</p>
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-sidebar-accent-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" /> Create your password
              </h2>
              <div>
                <Label className="text-sidebar-accent-foreground text-xs">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted pr-10"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-muted">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sidebar-accent-foreground text-xs">Confirm Password</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="mt-1 bg-sidebar border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-muted"
                />
              </div>
              {/* Password requirements */}
              <div className="space-y-1.5">
                {[
                  { label: "At least 8 characters", met: formData.password.length >= 8 },
                  { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
                  { label: "Contains special character", met: /[!@#$%^&*]/.test(formData.password) },
                  { label: "Passwords match", met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 },
                ].map((req) => (
                  <div key={req.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? "bg-success" : "bg-sidebar-border"}`}>
                      {req.met && <Check className="w-3 h-3 text-success-foreground" />}
                    </div>
                    <span className={`text-xs ${req.met ? "text-success" : "text-sidebar-muted"}`}>{req.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-sidebar-border text-sidebar-accent-foreground" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Team */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-sidebar-accent-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Join a team
              </h2>
              <p className="text-xs text-sidebar-muted">Select your initial team. You can join more teams later.</p>
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setFormData({ ...formData, selectedTeam: team.id })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      formData.selectedTeam === team.id
                        ? "border-primary bg-primary/10"
                        : "border-sidebar-border hover:border-sidebar-muted bg-sidebar"
                    }`}
                  >
                    <span className="text-2xl">{team.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-sidebar-accent-foreground">{team.name}</p>
                      <p className="text-xs text-sidebar-muted">{team.members} members</p>
                    </div>
                    {formData.selectedTeam === team.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-sidebar-border text-sidebar-accent-foreground" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={handleComplete}>
                  Get Started 🚀
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
