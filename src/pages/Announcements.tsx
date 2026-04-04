import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Plus, AlertCircle, Info, Bell, CheckCircle2, Loader2, X, Clock, User, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageShell, PageHero } from "@/components/shared/PageShell";
import { useToast } from "@/components/ui/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  targetType: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  isRead: boolean;
  creator?: {
    id: string;
    name: string;
  };
}

export default function Announcements() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    targetType: "all",
    expiresAt: "",
  });

  const canManageAnnouncements =
    !!user && ["org_owner", "admin", "manager"].includes((user.role || "").toLowerCase());

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Real-time WebSocket listeners for announcements
  useEffect(() => {
    const socket = getSocket();

    const handleAnnouncementCreated = (announcement: Announcement) => {
      console.log("[Announcements] Real-time: announcement created", announcement.id);
      setAnnouncements((prev) => {
        if (prev.some((a) => a.id === announcement.id)) return prev;
        return [announcement, ...prev];
      });
    };

    const handleAnnouncementUpdated = (announcement: Announcement) => {
      console.log("[Announcements] Real-time: announcement updated", announcement.id);
      setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? announcement : a)));
    };

    const handleAnnouncementDeleted = (announcementId: string) => {
      console.log("[Announcements] Real-time: announcement deleted", announcementId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    };

    socket.on("announcement:created", handleAnnouncementCreated);
    socket.on("announcement:updated", handleAnnouncementUpdated);
    socket.on("announcement:deleted", handleAnnouncementDeleted);

    return () => {
      socket.off("announcement:created", handleAnnouncementCreated);
      socket.off("announcement:updated", handleAnnouncementUpdated);
      socket.off("announcement:deleted", handleAnnouncementDeleted);
    };
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Announcement[]>("/announcements");
      // Ensure data is an array
      const announcementsList = Array.isArray(data) ? data : [];
      setAnnouncements(announcementsList);
      
      // If we got empty data, it might be due to an error (500, 429, etc.)
      // The API gracefully returns empty arrays for errors, so we don't show error toast
      // The UI will just show empty state which is acceptable
    } catch (error: any) {
      console.error("Failed to load announcements:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load announcements",
        variant: "destructive",
      });
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await apiPost("/announcements", {
        ...formData,
        expiresAt: formData.expiresAt || null,
      });
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
      setCreateDialogOpen(false);
      setFormData({
        title: "",
        content: "",
        priority: "normal",
        targetType: "all",
        expiresAt: "",
      });
      loadAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
      });
    }
  };

  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setViewDialogOpen(true);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "high":
        return <Bell className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm">ด่วนมาก</Badge>;
      case "high":
        return <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-sm">สำคัญ</Badge>;
      case "normal":
        return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">ปกติ</Badge>;
      case "low":
        return <Badge variant="outline">ต่ำ</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const activeAnnouncements = announcements.filter((a) => a.status === "active");
  const urgentAnnouncements = activeAnnouncements.filter((a) => a.priority === "urgent");
  const highPriorityAnnouncements = activeAnnouncements.filter((a) => a.priority === "high");

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Modern Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <Megaphone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Announcements</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    ข่าวสารบริษัท · แจ้งเตือนสำคัญ · อัปเดตนโยบาย · ประกาศทั่วไป
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                {canManageAnnouncements && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="h-9 gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">ประกาศใหม่</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {unreadCount > 0 && (
          <div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">{unreadCount}</span>
                  <span className="text-xs text-muted-foreground">ประกาศที่ยังไม่ได้อ่าน</span>
                </div>
                {urgentAnnouncements.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-sm font-semibold text-red-600">{urgentAnnouncements.length}</span>
                    <span className="text-xs text-muted-foreground">ด่วนมาก</span>
                  </div>
                )}
                {highPriorityAnnouncements.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-sm font-semibold text-orange-600">{highPriorityAnnouncements.length}</span>
                    <span className="text-xs text-muted-foreground">สำคัญ</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 h-full flex flex-col overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">กำลังโหลดประกาศ...</span>
                </div>
              </div>
            ) : activeAnnouncements.length === 0 ? (
              <Card className="border-border/50 bg-card/70">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Megaphone className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">ยังไม่มีประกาศ</h3>
                  <p className="text-sm text-muted-foreground mb-4">สร้างประกาศแรกเพื่อแจ้งข่าวสารให้กับทีม</p>
                  {canManageAnnouncements && (
                    <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      สร้างประกาศแรก
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {activeAnnouncements.map((announcement, index) => (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card
                        className={cn(
                          "cursor-pointer group border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300",
                          "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1",
                          "ring-0 hover:ring-1 hover:ring-primary/20",
                          !announcement.isRead && "ring-2 ring-primary/50 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
                        )}
                        onClick={() => handleView(announcement)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                                "group-hover:scale-110",
                                announcement.priority === "urgent" && "bg-red-100/70",
                                announcement.priority === "high" && "bg-orange-100/70",
                                announcement.priority === "normal" && "bg-primary/10",
                                announcement.priority === "low" && "bg-muted"
                              )}>
                                {getPriorityIcon(announcement.priority)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                    {announcement.title}
                                  </CardTitle>
                                  {!announcement.isRead && (
                                    <Badge className="bg-primary text-white shadow-sm animate-pulse-soft">ใหม่</Badge>
                                  )}
                                  {getPriorityBadge(announcement.priority)}
                                </div>
                                {announcement.creator && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <User className="w-3 h-3" />
                                    <span>{announcement.creator.name}</span>
                                    <span>•</span>
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(announcement.createdAt)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap line-clamp-3 text-muted-foreground">
                            {announcement.content.substring(0, 200)}...
                          </div>
                          {announcement.expiresAt && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                              <Clock className="w-3 h-3" />
                              <span>หมดอายุ: {formatDate(announcement.expiresAt)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">สร้างประกาศใหม่</DialogTitle>
              <DialogDescription>สร้างประกาศใหม่สำหรับบริษัท</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>หัวข้อ</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="หัวข้อประกาศ"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>เนื้อหา (Markdown)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="เนื้อหาประกาศในรูปแบบ Markdown"
                  rows={10}
                  className="font-mono text-sm mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ความสำคัญ</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">ด่วนมาก</SelectItem>
                      <SelectItem value="high">สำคัญ</SelectItem>
                      <SelectItem value="normal">ปกติ</SelectItem>
                      <SelectItem value="low">ต่ำ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>กลุ่มเป้าหมาย</Label>
                  <Select
                    value={formData.targetType}
                    onValueChange={(value) => setFormData({ ...formData, targetType: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกคน</SelectItem>
                      <SelectItem value="team">ทีม</SelectItem>
                      <SelectItem value="role">บทบาท</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>หมดอายุ (ไม่บังคับ)</Label>
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleCreate}>สร้างประกาศ</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedAnnouncement && (
              <>
                <DialogHeader className="pb-4 border-b border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl font-bold mb-2">{selectedAnnouncement.title}</DialogTitle>
                      <DialogDescription className="mt-2">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          {selectedAnnouncement.creator && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span>โดย {selectedAnnouncement.creator.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(selectedAnnouncement.createdAt)}</span>
                          </div>
                        </div>
                      </DialogDescription>
                    </div>
                    {getPriorityBadge(selectedAnnouncement.priority)}
                  </div>
                </DialogHeader>
                <ScrollArea className="flex-1 mt-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    <ReactMarkdown>{selectedAnnouncement.content}</ReactMarkdown>
                  </div>
                  {selectedAnnouncement.expiresAt && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-6 pt-6 border-t border-border/50">
                      <Clock className="w-4 h-4" />
                      <span>หมดอายุ: {formatDate(selectedAnnouncement.expiresAt)}</span>
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
