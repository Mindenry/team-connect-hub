import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileBarChart, TrendingUp, Users, Calendar, CheckSquare, Clock, Loader2, X, Zap, Activity, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell, PageHero } from "@/components/shared/PageShell";
import { useToast } from "@/components/ui/use-toast";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ReportData {
  tasksCompleted?: number;
  meetingsAttended?: number;
  hoursWorked?: number;
  productivityScore?: number;
  teamMetrics?: {
    teamName: string;
    tasksCompleted?: number;
    meetingsAttended?: number;
    hoursWorked?: number;
  }[];
}

export default function Reports() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await apiGet<ReportData>(`/reports?range=${dateRange}`);
      // Handle response format: could be {success: true, data: {...}} or direct object
      let reportData = data;
      if (data && typeof data === 'object' && 'data' in data && !('tasksCompleted' in data)) {
        // If response has 'data' property but not the expected fields, extract data
        reportData = (data as any).data || data;
      }
      
      // Check if we got empty object (which might indicate an error)
      // If reportData is empty object {}, set to null to show empty state
      if (reportData && typeof reportData === 'object' && Object.keys(reportData).length === 0) {
        reportData = null;
      }
      
      setReportData(reportData as ReportData);
      
      // If we got empty/null data, it might be due to an error (500, 429, etc.)
      // The API gracefully returns empty objects for errors, so we don't show error toast
      // The UI will just show empty state which is acceptable
    } catch (error: any) {
      console.error("Failed to load report data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load report data",
        variant: "destructive",
      });
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case "week":
        return "สัปดาห์ที่ผ่านมา";
      case "month":
        return "เดือนที่ผ่านมา";
      case "quarter":
        return "ไตรมาสที่ผ่านมา";
      case "year":
        return "ปีที่ผ่านมา";
      default:
        return range;
    }
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getProductivityGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-cyan-600";
    if (score >= 40) return "from-orange-500 to-amber-600";
    return "from-red-500 to-rose-600";
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Modern Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <FileBarChart className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Reports & Analytics</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    รายงานผลงาน · วิเคราะห์ประสิทธิภาพ · สถิติทีม · ข้อมูลเชิงลึก
                  </p>
                </div>
              </div>

              {/* Right: Date Range Selector */}
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px] h-9 border-border/50 bg-background/50 hover:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">สัปดาห์ที่ผ่านมา</SelectItem>
                    <SelectItem value="month">เดือนที่ผ่านมา</SelectItem>
                    <SelectItem value="quarter">ไตรมาสที่ผ่านมา</SelectItem>
                    <SelectItem value="year">ปีที่ผ่านมา</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6 h-full flex flex-col overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">กำลังโหลดรายงาน...</span>
                </div>
              </div>
            ) : reportData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`tasks-${dateRange}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">งานที่เสร็จแล้ว</CardTitle>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <CheckSquare className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-foreground mb-1">{reportData.tasksCompleted ?? 0}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>งาน</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div
                      key={`meetings-${dateRange}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                    >
                      <Card className="border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">การประชุมที่เข้าร่วม</CardTitle>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-foreground mb-1">{reportData.meetingsAttended ?? 0}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>การประชุม</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div
                      key={`hours-${dateRange}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <Card className="border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">ชั่วโมงทำงาน</CardTitle>
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-orange-600" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-foreground mb-1">{(reportData.hoursWorked ?? 0).toFixed(1)}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>ชั่วโมง</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div
                      key={`productivity-${dateRange}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15 }}
                    >
                      <Card className={cn(
                        "border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                        "bg-gradient-to-br from-background via-background to-primary/5"
                      )}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">คะแนนประสิทธิภาพ</CardTitle>
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              "bg-gradient-to-br",
                              getProductivityGradient(reportData.productivityScore ?? 0)
                            )}>
                              <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={cn("text-3xl font-bold mb-2", getProductivityColor(reportData.productivityScore ?? 0))}>
                            {Math.round(reportData.productivityScore ?? 0)}%
                          </div>
                          <Progress value={reportData.productivityScore ?? 0} className="h-2" />
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <Activity className="w-3 h-3" />
                            <span>ประสิทธิภาพ</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Team Metrics */}
                {reportData.teamMetrics && reportData.teamMetrics.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card className="border-border/50 bg-card/70">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            สถิติทีม
                          </CardTitle>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            {reportData.teamMetrics.length} ทีม
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <AnimatePresence mode="wait">
                            {reportData.teamMetrics.map((team, index) => (
                              <motion.div
                                key={team.teamName}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                              >
                                <Card className="border-border/50 bg-muted/30 hover:bg-muted/50 transition-all duration-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                          <Users className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                          <h3 className="font-semibold text-foreground">{team.teamName}</h3>
                                          <p className="text-xs text-muted-foreground mt-0.5">{getDateRangeLabel(dateRange)}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-6">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-foreground">{team.tasksCompleted ?? 0}</div>
                                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <CheckSquare className="w-3 h-3" />
                                                งาน
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>งานที่เสร็จแล้ว</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-foreground">{team.meetingsAttended ?? 0}</div>
                                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                การประชุม
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>การประชุมที่เข้าร่วม</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-foreground">{(team.hoursWorked ?? 0).toFixed(1)}</div>
                                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3" />
                                                ชั่วโมง
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>ชั่วโมงทำงาน</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </>
            ) : (
              <Card className="border-border/50 bg-card/70">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileBarChart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">ไม่มีข้อมูลรายงาน</h3>
                  <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
