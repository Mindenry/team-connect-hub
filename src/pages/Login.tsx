import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  MessageSquare,
  Calendar,
  CheckSquare,
  Users,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/* ── Floating feature cards data ── */
const featureCards = [
  { icon: MessageSquare, label: "Team Chat", x: "12%", y: "18%", delay: 0 },
  { icon: Video, label: "Video Meetings", x: "58%", y: "12%", delay: 0.15 },
  { icon: Calendar, label: "Calendar", x: "8%", y: "58%", delay: 0.3 },
  { icon: CheckSquare, label: "Task Board", x: "62%", y: "52%", delay: 0.45 },
  { icon: Users, label: "Teams", x: "35%", y: "72%", delay: 0.6 },
];

/* ── Animated mesh dots for background ── */
function MeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div
        className="absolute rounded-full opacity-20 blur-[100px]"
        style={{
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, hsl(217 91% 55% / 0.5), transparent 70%)",
          top: "-10%",
          right: "-10%",
          animation: "float-orb 12s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full opacity-15 blur-[80px]"
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, hsl(260 80% 55% / 0.4), transparent 70%)",
          bottom: "-5%",
          left: "-5%",
          animation: "float-orb 15s ease-in-out infinite reverse",
        }}
      />

      {/* Grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400/20"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${8 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Invalid email or password" }));
        setError(error.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      const response = await res.json();
      console.log("Login response:", response);

      const data = response.data || response;

      if (!data || !data.user) {
        console.error("Invalid response structure:", { response, data });
        setError("Invalid response from server");
        setLoading(false);
        return;
      }

      if (!data.user.id || !data.accessToken) {
        console.error("Missing required fields:", {
          hasUserId: !!data.user?.id,
          hasAccessToken: !!data.accessToken,
          response,
          data,
        });
        setError("Invalid response format");
        setLoading(false);
        return;
      }

      let avatarUrl = data.user.avatar || undefined;
      if (avatarUrl && avatarUrl.startsWith("/")) {
        avatarUrl = `${API_BASE}${avatarUrl}`;
      }

      auth.setAuth(
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          organizationId: data.user.organizationId,
          avatar: avatarUrl,
        },
        data.accessToken,
        data.refreshToken
      );

      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (!res.ok) {
        throw new Error("เกิดข้อผิดพลาดในการส่งอีเมล");
      }

      toast({
        title: "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว",
        description:
          "กรุณาตรวจสอบกล่องจดหมายของคุณ (ดู token ใน console ตอนพัฒนา)",
      });
      setShowForgotPwd(false);
      setForgotEmail("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: err.message,
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      {/* Inline keyframes for custom animations */}
      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.2; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
        {/* ── Left Branding Panel ── */}
        <div
          className="hidden lg:flex lg:col-span-3 relative flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0b1120 0%, #0f172a 40%, #111827 100%)" }}
        >
          <MeshBackground />

          {/* Logo */}
          <motion.div
            className="absolute top-8 left-10 flex items-center gap-3 z-10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(260 80% 55%))",
                boxShadow: "0 0 20px hsl(217 91% 55% / 0.3)",
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/90 font-semibold text-lg tracking-tight">CollabHub</span>
          </motion.div>

          {/* Floating Feature Cards */}
          {featureCards.map((card, i) => (
            <motion.div
              key={i}
              className="absolute z-10"
              style={{ left: card.x, top: card.y }}
              initial={{ opacity: 0, scale: 0.5, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4 + card.delay, duration: 0.6, ease: "easeOut" }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] backdrop-blur-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                  animation: `float-card ${5 + i * 0.7}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsl(217 91% 55% / 0.2), hsl(260 80% 55% / 0.15))",
                    border: "1px solid hsl(217 91% 55% / 0.15)",
                  }}
                >
                  <card.icon className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-white/70">{card.label}</span>
              </div>
            </motion.div>
          ))}

          {/* Center Headline */}
          <motion.div
            className="relative z-10 text-center px-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
          >
            <h1
              className="text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Team<br />Connect
            </h1>
            <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
              Enterprise collaboration platform for teams that move fast and build together.
            </p>
          </motion.div>

          {/* Bottom stats strip */}
          <motion.div
            className="absolute bottom-10 left-10 right-10 flex items-center justify-center gap-12 z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "256-bit", label: "Encryption" },
              { value: "24/7", label: "Support" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-white/70 text-sm font-semibold">{stat.value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right Login Panel ── */}
        <div
          className="lg:col-span-2 flex flex-col items-center justify-center px-6 py-12 relative"
          style={{ background: "linear-gradient(180deg, #0f172a 0%, #0b1120 100%)" }}
        >
          {/* Mobile logo (visible only on small screens) */}
          <motion.div
            className="lg:hidden flex items-center gap-3 mb-10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(260 80% 55%))",
                boxShadow: "0 0 20px hsl(217 91% 55% / 0.3)",
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/90 font-semibold text-lg tracking-tight">CollabHub</span>
          </motion.div>

          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-slate-400 text-sm mt-2">Sign in to your workspace to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500/40 focus-visible:border-blue-500/40 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPwd(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500/40 focus-visible:border-blue-500/40 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div whileTap={{ scale: 0.98 }}>
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-white font-semibold text-sm relative overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    background: loading
                      ? "hsl(217 91% 35%)"
                      : "linear-gradient(135deg, hsl(217 91% 55%), hsl(245 80% 55%))",
                    boxShadow: loading
                      ? "none"
                      : "0 4px 15px hsl(217 91% 55% / 0.3), 0 1px 3px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Shimmer effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s infinite",
                    }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Invite */}
            <div className="space-y-3">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Don't have an account? Contact your admin for an invite.
              </p>
              <button
                id="login-invite-btn"
                type="button"
                onClick={() => navigate("/invite")}
                className="w-full h-10 rounded-xl text-sm font-medium text-slate-300 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                I have an invite
              </button>
            </div>

            {/* Footer */}
            <p className="text-[11px] text-slate-600 text-center mt-8">
              Secured with enterprise-grade encryption
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Forgot Password Dialog ── */}
      <Dialog open={showForgotPwd} onOpenChange={setShowForgotPwd}>
        <DialogContent
          className="sm:max-w-md border-white/[0.08] rounded-2xl"
          style={{ background: "#111827" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(217 91% 55% / 0.2), hsl(260 80% 55% / 0.15))",
                  border: "1px solid hsl(217 91% 55% / 0.15)",
                }}
              >
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              ลืมรหัสผ่าน?
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2 text-sm leading-relaxed">
              กรอกอีเมลที่เชื่อมโยงกับบัญชีของคุณ
              เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-slate-300">
                อีเมล
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="name@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500/40"
                required
              />
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail}
                className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(245 80% 55%))",
                  boxShadow: "0 4px 15px hsl(217 91% 55% / 0.3)",
                }}
              >
                {forgotLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    ส่งลิงก์รีเซ็ตรหัสผ่าน
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
