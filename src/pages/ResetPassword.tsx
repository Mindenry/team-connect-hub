import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validation states
  const [validations, setValidations] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    match: false,
  });

  useEffect(() => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "ลิงก์ไม่ถูกต้อง",
        description: "ไม่มีข้อมูล Token สำหรับรีเซ็ตรหัสผ่าน",
      });
      navigate("/login");
    }
  }, [token, navigate, toast]);

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*]/.test(password),
      match: password === confirmPassword && password.length > 0,
    });
  }, [password, confirmPassword]);

  const allValid = Object.values(validations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid || !token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
      }

      setSuccess(true);
      toast({
        title: "สำเร็จ",
        description: "รหัสผ่านของคุณถูกตั้งใหม่เรียบร้อยแล้ว",
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ลิงก์อาจหมดอายุ หรือไม่ถูกต้อง",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border/50 relative z-10">
          <CardContent className="pt-8 sm:pt-10 pb-6 sm:pb-8 px-6 sm:px-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-success" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">ตั้งรหัสผ่านใหม่สำเร็จ</h2>
            <p className="text-muted-foreground mb-8">
              คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
              ระบบจะพากลับไปยังหน้าเข้าสู่ระบบในอีกสักครู่...
            </p>
            <Button className="w-full" onClick={() => navigate("/login")}>
              ไปที่หน้าเข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-secondary/10 to-transparent rounded-full blur-3xl opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-1 sm:px-0 relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              ตั้งรหัสผ่านใหม่
            </span>
          </div>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-6 sm:px-8">
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                กรุณากำหนดรหัสผ่านใหม่ของคุณ รหัสผ่านที่ดีควรประกอบด้วยตัวอักษรและตัวเลข
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">รหัสผ่านใหม่</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background/50 h-11"
                    placeholder="ขั้นต่ำ 8 ตัวอักษร"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background/50 h-11"
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-xs">
                <p className="font-medium text-foreground mb-1">รหัสผ่านต้องประกอบด้วย:</p>
                <div className="grid grid-cols-2 gap-2">
                  <ReqItem met={validations.length} text="อย่างน้อย 8 ตัวอักษร" />
                  <ReqItem met={validations.upper} text="ตัวพิมพ์ใหญ่ (A-Z)" />
                  <ReqItem met={validations.lower} text="ตัวพิมพ์เล็ก (a-z)" />
                  <ReqItem met={validations.number} text="ตัวเลข (0-9)" />
                  <ReqItem met={validations.special} text="อักขระพิเศษ (!@#...)" />
                  <ReqItem met={validations.match} text="รหัสผ่านตรงกัน" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={!allValid || loading}
              >
                {loading ? "กำลังบันทึก..." : "อัปเดตรหัสผ่าน"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function ReqItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${met ? "text-success" : "text-muted-foreground"}`}>
      {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      <span>{text}</span>
    </div>
  );
}
