import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, ArrowRight, Lock } from "lucide-react";
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

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
        body: JSON.stringify({ email, password, rememberMe }),
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
        data.refreshToken,
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
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes aurora {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(40px, -30px) rotate(3deg) scale(1.05); }
          50% { transform: translate(-20px, 20px) rotate(-2deg) scale(0.97); }
          75% { transform: translate(30px, 10px) rotate(1deg) scale(1.02); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(-30px, 20px) rotate(-3deg) scale(1.03); }
          50% { transform: translate(25px, -15px) rotate(2deg) scale(0.98); }
          75% { transform: translate(-15px, -25px) rotate(-1deg) scale(1.04); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes line-draw {
          from { stroke-dashoffset: 600; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* ── Left Branding Panel ── */}
        <div
          className="hidden lg:flex relative flex-col overflow-hidden"
          style={{ background: "#050a18" }}
        >
          {/* ─ Aurora gradient blobs ─ */}
          <div
            className="absolute w-[700px] h-[700px] rounded-full blur-[160px]"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.15), transparent 65%)",
              top: "-15%",
              right: "-20%",
              animation: "aurora 20s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[140px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.12), transparent 65%)",
              bottom: "-10%",
              left: "-15%",
              animation: "aurora2 25s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(6,182,212,0.08), transparent 65%)",
              top: "40%",
              left: "30%",
              animation: "aurora 18s ease-in-out infinite reverse",
            }}
          />

          {/* ─ Animated circuit lines SVG overlay ─ */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="40%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="60%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Horizontal lines */}
            <line
              x1="0"
              y1="25%"
              x2="100%"
              y2="25%"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              strokeDasharray="8 12"
              style={{ animation: "line-draw 8s linear infinite" }}
            />
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              strokeDasharray="12 8"
              style={{ animation: "line-draw 12s linear infinite" }}
            />
            <line
              x1="0"
              y1="75%"
              x2="100%"
              y2="75%"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              strokeDasharray="6 14"
              style={{ animation: "line-draw 10s linear infinite" }}
            />
            {/* Vertical lines */}
            <line
              x1="25%"
              y1="0"
              x2="25%"
              y2="100%"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              strokeDasharray="10 10"
              style={{ animation: "line-draw 9s linear infinite" }}
            />
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              strokeDasharray="14 6"
              style={{ animation: "line-draw 11s linear infinite" }}
            />
            <line
              x1="75%"
              y1="0"
              x2="75%"
              y2="100%"
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              strokeDasharray="8 12"
              style={{ animation: "line-draw 7s linear infinite" }}
            />
            {/* Diagonal accent */}
            <line
              x1="10%"
              y1="100%"
              x2="90%"
              y2="0"
              stroke="url(#lineGrad)"
              strokeWidth="0.3"
              strokeDasharray="20 20"
              style={{ animation: "line-draw 15s linear infinite" }}
            />
          </svg>

          {/* ─ Dot intersection nodes ─ */}
          {[
            { x: "25%", y: "25%" },
            { x: "50%", y: "25%" },
            { x: "75%", y: "25%" },
            { x: "25%", y: "50%" },
            { x: "50%", y: "50%" },
            { x: "75%", y: "50%" },
            { x: "25%", y: "75%" },
            { x: "50%", y: "75%" },
            { x: "75%", y: "75%" },
          ].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/30"
              style={{
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -50%)",
              }}
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}

          {/* ─ Top Logo ─ */}
          <motion.div
            className="flex items-center gap-3 px-10 pt-8 z-10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-9 h-9 flex items-center justify-center bg-[#2563eb] rounded-lg shadow-lg shadow-blue-500/20 border border-white/10">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M16 8h-6a2 2 0 0 0 -2 2v6" />
                <path d="M16 8v6a2 2 0 0 1 -2 2h-6" />
                <circle
                  cx="8"
                  cy="8"
                  r="2.5"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="2.5"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </div>
            <span className="text-white/90 font-bold text-lg tracking-tight">
              Team Connect
            </span>
          </motion.div>

          {/* ─ Center Hero Content ─ */}
          <div className="flex-1 flex flex-col items-center justify-center px-12 z-10">
            {/* Glowing badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-8"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))",
                  border: "1px solid rgba(59,130,246,0.2)",
                  color: "rgba(147,197,253,0.9)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
                />
                Enterprise Collaboration
              </div>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              className="text-center mb-6"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            >
              <span
                className="block text-6xl xl:text-7xl font-extrabold tracking-tight leading-[0.95]"
                style={{
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #e2e8f0 25%, #60a5fa 60%, #a78bfa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Where Teams
              </span>
              <span
                className="block text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] mt-1"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #f0abfc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Build Together
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              className="text-slate-400 text-base max-w-md text-center leading-relaxed mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              Meetings, chat, tasks, file sharing, and team management — unified
              in one powerful workspace.
            </motion.p>

            {/* Feature pills row */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-2.5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {[
                "Real-time Chat",
                "Video Meetings",
                "Task Management",
                "File Sharing",
                "Team Channels",
                "Notifications",
              ].map((feature, i) => (
                <motion.span
                  key={feature}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(203,213,225,0.8)",
                    animation: `float-slow ${4 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                  whileHover={{
                    background: "rgba(59,130,246,0.1)",
                    borderColor: "rgba(59,130,246,0.25)",
                    color: "rgba(147,197,253,1)",
                    scale: 1.05,
                  }}
                >
                  {feature}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* ─ Bottom trust bar ─ */}
          <motion.div
            className="flex items-center justify-between px-10 pb-8 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <div className="flex items-center gap-6">
              {[
                { value: "99.9%", label: "Uptime" },
                { value: "E2E", label: "Encrypted" },
                { value: "Real-time", label: "Sync" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-white/40 text-[11px] font-bold tracking-wide">
                    {stat.value}
                  </div>
                  <div className="text-slate-600 text-[9px] mt-0.5 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-slate-700 text-[10px] tracking-wide">
              © 2026 Team Connect
            </div>
          </motion.div>
        </div>

        {/* ── Right Login Panel ── */}
        <div
          className="flex flex-col items-center justify-center px-6 py-12 relative"
          style={{
            background: "linear-gradient(180deg, #0f172a 0%, #0b1120 100%)",
          }}
        >
          {/* Mobile logo (visible only on small screens) */}
          <motion.div
            className="lg:hidden flex items-center gap-3 mb-10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-9 h-9 flex items-center justify-center bg-[#2563eb] rounded-lg shadow-md border border-white/10">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M16 8h-6a2 2 0 0 0 -2 2v6" />
                <path d="M16 8v6a2 2 0 0 1 -2 2h-6" />
                <circle
                  cx="8"
                  cy="8"
                  r="2.5"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="2.5"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              Team Connect
            </span>
          </motion.div>

          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome back
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Sign in to your workspace to continue
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="username"
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
                  <Label className="text-slate-300 text-sm font-medium">
                    Password
                  </Label>
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
                    name="password"
                    autoComplete="current-password"
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

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/[0.15] bg-white/[0.04] text-blue-500 focus:ring-blue-500/40 focus:ring-offset-0 cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm text-slate-400 cursor-pointer select-none"
                >
                  Remember me for 7 days
                </label>
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
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                or
              </span>
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
                <Mail className="w-3.5 h-3.5" />I have an invite
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
                  background:
                    "linear-gradient(135deg, hsl(217 91% 55% / 0.2), hsl(260 80% 55% / 0.15))",
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
                  background:
                    "linear-gradient(135deg, hsl(217 91% 55%), hsl(245 80% 55%))",
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
