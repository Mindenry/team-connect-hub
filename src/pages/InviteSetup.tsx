import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  User,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Shield,
  UserPlus,
  Rocket,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/* ── Animated mesh background (shared with Login) ── */
function MeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid-invite" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-invite)" />
      </svg>
      {Array.from({ length: 15 }).map((_, i) => (
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

/* ── Step definitions (only 2 steps now) ── */
const stepDefs = [
  { num: 1, label: "Verify Email", icon: Search },
  { num: 2, label: "Set Up Account", icon: User },
];

/* ── Step indicator (vertical - desktop) ── */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col gap-3">
      {stepDefs.map((s) => (
        <div key={s.num} className="flex items-center gap-3">
          <motion.div
            animate={{
              background:
                currentStep > s.num
                  ? "linear-gradient(135deg, hsl(152 69% 39%), hsl(152 69% 45%))"
                  : currentStep === s.num
                    ? "linear-gradient(135deg, hsl(217 91% 55%), hsl(245 80% 55%))"
                    : "rgba(255,255,255,0.06)",
              boxShadow:
                currentStep === s.num
                  ? "0 0 20px hsl(217 91% 55% / 0.3)"
                  : "none",
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              color: currentStep >= s.num ? "white" : "rgba(148,163,184,0.6)",
              border:
                currentStep < s.num
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "none",
            }}
          >
            {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
          </motion.div>
          <p
            className={`text-sm font-medium ${currentStep >= s.num ? "text-white" : "text-slate-500"}`}
          >
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Step indicator (horizontal - mobile) ── */
function MobileStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
      {stepDefs.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <motion.div
            animate={{
              background:
                currentStep > s.num
                  ? "hsl(152 69% 39%)"
                  : currentStep === s.num
                    ? "linear-gradient(135deg, hsl(217 91% 55%), hsl(245 80% 55%))"
                    : "rgba(255,255,255,0.06)",
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              color: currentStep >= s.num ? "white" : "rgba(148,163,184,0.5)",
              border:
                currentStep < s.num
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "none",
            }}
          >
            {currentStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
          </motion.div>
          {i < stepDefs.length - 1 && (
            <motion.div
              animate={{
                background:
                  currentStep > s.num
                    ? "hsl(152 69% 39%)"
                    : "rgba(255,255,255,0.06)",
              }}
              className="w-8 h-0.5 rounded-full"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function InviteSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(token);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [email, setEmail] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Token from URL → auto-verify invite, skip to step 2
    fetch(`${API_BASE}/api/auth/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setInviteData(data);
        setInviteToken(token);
        if (data.email) setEmail(data.email);
        setStep(2);
      })
      .catch((err) => {
        setError("Failed to load invite data");
        console.error(err);
      });
  }, [token]);

  /* Step 1: Look up invite by email */
  const handleLookupInvite = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    setCheckingInvite(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/invite/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "No active invite for this email" }));
        setError(errorData.message || "No active invite for this email");
        return;
      }

      const responseData = await response.json();
      const wrapped =
        responseData && typeof responseData === "object" && "data" in responseData
          ? (responseData as any).data
          : responseData;

      setInviteData(wrapped);
      setInviteToken(wrapped.token);
      setStep(2);
    } catch (err: any) {
      setError(err.message ?? "Failed to look up invite");
    } finally {
      setCheckingInvite(false);
    }
  };

  const validatePassword = (): string | null => {
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }
    if (
      formData.password.length < 8 ||
      !/[A-Z]/.test(formData.password) ||
      !/[!@#$%^&*]/.test(formData.password)
    ) {
      return "Password does not meet requirements";
    }
    return null;
  };

  /* Step 2 complete → directly accept invite */
  const handleComplete = async () => {
    if (!inviteToken) {
      setError("Invalid invite token");
      return;
    }
    if (!formData.firstName.trim()) {
      setError("Please enter your first name");
      return;
    }
    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteToken,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          teamId: inviteData?.teamId,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Setup failed" }));
        setError(errorData.message || "Failed to complete setup");
        setLoading(false);
        return;
      }

      const responseData = await response.json();
      const wrapped =
        responseData && typeof responseData === "object" && "data" in responseData
          ? responseData.data
          : responseData;

      if (!wrapped || !wrapped.user || !wrapped.accessToken) {
        setError("Invalid response from server");
        setLoading(false);
        return;
      }

      auth.setAuth(
        {
          id: wrapped.user.id,
          email: wrapped.user.email,
          name: wrapped.user.name,
          role: wrapped.user.role,
        },
        wrapped.accessToken,
        wrapped.refreshToken
      );

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

  const inputCls =
    "h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500/40 focus-visible:border-blue-500/40 transition-all duration-200";
  const inputWithIconCls = `pl-10 ${inputCls}`;
  const labelCls = "text-slate-300 text-xs font-medium";

  const passwordReqs = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "Contains special character", met: /[!@#$%^&*]/.test(formData.password) },
    {
      label: "Passwords match",
      met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
    },
  ];

  /* ── Shared gradient button ── */
  const GradientButton = ({
    onClick,
    disabled,
    children,
    className = "",
    type = "button",
  }: {
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    type?: "button" | "submit";
  }) => (
    <motion.div whileTap={{ scale: 0.98 }} className={className}>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="w-full h-11 rounded-xl text-white font-semibold text-sm relative overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
        style={{
          background: disabled
            ? "hsl(217 91% 35%)"
            : "linear-gradient(135deg, hsl(217 91% 55%), hsl(245 80% 55%))",
          boxShadow: disabled
            ? "none"
            : "0 4px 15px hsl(217 91% 55% / 0.3), 0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite",
          }}
        />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    </motion.div>
  );

  const OutlineButton = ({
    onClick,
    children,
    className = "",
  }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl text-sm font-medium text-slate-300 border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <>
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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
        {/* ── Left Branding Panel ── */}
        <div
          className="hidden lg:flex lg:col-span-2 relative flex-col justify-between overflow-hidden p-10"
          style={{
            background: "linear-gradient(135deg, #0b1120 0%, #0f172a 40%, #111827 100%)",
          }}
        >
          <MeshBackground />

          {/* Logo */}
          <motion.div
            className="flex items-center gap-3 z-10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-9 h-9 flex items-center justify-center bg-[#2563eb] rounded-lg shadow-md border border-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M16 8h-6a2 2 0 0 0 -2 2v6" />
                <path d="M16 8v6a2 2 0 0 1 -2 2h-6" />
                <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Team Connect</span>
          </motion.div>

          {/* Center */}
          <motion.div
            className="relative z-10 flex-1 flex flex-col items-start justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                style={{
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.15)",
                  color: "rgb(147,197,253)",
                }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                You're invited!
              </div>
              <h1
                className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Join your
                <br />
                team today
              </h1>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Verify your invite, set up your account, and start collaborating with your team.
              </p>
            </div>

            <StepIndicator currentStep={step} />
          </motion.div>

          {/* Bottom */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <p className="text-[11px] text-slate-600">
              Secured with enterprise-grade encryption
            </p>
          </motion.div>
        </div>

        {/* ── Right Form Panel ── */}
        <div
          className="lg:col-span-3 flex flex-col items-center justify-center px-6 py-10 relative overflow-y-auto"
          style={{
            background: "linear-gradient(180deg, #0f172a 0%, #0b1120 100%)",
          }}
        >
          {/* Mobile logo */}
          <motion.div
            className="lg:hidden flex items-center gap-3 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-9 h-9 flex items-center justify-center bg-[#2563eb] rounded-lg shadow-md border border-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M16 8h-6a2 2 0 0 0 -2 2v6" />
                <path d="M16 8v6a2 2 0 0 1 -2 2h-6" />
                <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Team Connect</span>
          </motion.div>

          <MobileStepIndicator currentStep={step} />

          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {/* ════════════════════════════════════════════
                  STEP 1 — Verify Email
                  ════════════════════════════════════════════ */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Verify your invite
                    </h2>
                    <p className="text-slate-400 text-sm mt-1.5">
                      Enter the email address that received the invitation.
                    </p>
                  </div>

                  <form onSubmit={handleLookupInvite} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Work Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="invite-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className={inputWithIconCls}
                          autoFocus
                        />
                      </div>
                    </div>

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

                    <GradientButton type="submit" disabled={checkingInvite || !email.trim()}>
                      {checkingInvite ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Verify Invite
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </GradientButton>
                  </form>

                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-xs text-slate-500 leading-relaxed">
                      💡 Use the same email address your admin used to send the
                      invitation. If you haven't received one, please contact your admin.
                    </p>
                  </div>

                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Already have an account?{" "}
                      <span className="text-blue-400">Sign in</span>
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════
                  STEP 2 — Name + Password → Complete
                  ════════════════════════════════════════════ */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Set up your account
                    </h2>
                    <p className="text-slate-400 text-sm mt-1.5">
                      Tell us your name and create a password to get started.
                    </p>
                  </div>

                  {/* Verified email badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                    style={{
                      background: "rgba(74, 222, 128, 0.06)",
                      border: "1px solid rgba(74, 222, 128, 0.12)",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "hsl(152 69% 39%)" }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-400/70">Verified invite</p>
                      <p className="text-sm text-white font-medium">
                        {inviteData?.email || email}
                      </p>
                    </div>
                  </motion.div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white/[0.08] shrink-0">
                      <AvatarFallback
                        className="text-lg font-bold"
                        style={{
                          background: "linear-gradient(135deg, hsl(217 91% 55% / 0.2), hsl(260 80% 55% / 0.15))",
                          color: "rgb(147,197,253)",
                        }}
                      >
                        {formData.firstName?.[0] || "?"}
                        {formData.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div className="space-y-1.5">
                        <Label className={labelCls}>First Name</Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                          placeholder="First name"
                          className={inputCls}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelCls}>Last Name</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                          placeholder="Last name"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <Shield className="w-3.5 h-3.5 text-slate-600" />
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        placeholder="Min 8 characters"
                        className={`${inputWithIconCls} pr-10`}
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

                  <div className="space-y-1.5">
                    <Label className={labelCls}>Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        placeholder="Re-enter password"
                        className={inputWithIconCls}
                      />
                    </div>
                  </div>

                  {/* Password requirements */}
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {passwordReqs.map((req) => (
                      <motion.div key={req.label} className="flex items-center gap-2.5">
                        <motion.div
                          animate={{
                            scale: req.met ? 1 : 0.8,
                            background: req.met
                              ? "hsl(152 69% 39%)"
                              : "rgba(255,255,255,0.06)",
                          }}
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            border: req.met ? "none" : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {req.met && <Check className="w-3 h-3 text-white" />}
                        </motion.div>
                        <span className={`text-xs ${req.met ? "text-emerald-400" : "text-slate-500"}`}>
                          {req.label}
                        </span>
                      </motion.div>
                    ))}
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

                  <div className="flex gap-3">
                    {!token && (
                      <OutlineButton
                        onClick={() => {
                          setError(null);
                          setStep(1);
                        }}
                        className="flex-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </OutlineButton>
                    )}
                    <GradientButton
                      onClick={handleComplete}
                      disabled={loading}
                      className={token ? "w-full" : "flex-[2]"}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Get Started
                        </>
                      )}
                    </GradientButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
}
