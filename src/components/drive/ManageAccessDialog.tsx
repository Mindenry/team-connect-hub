import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Folder, File as FileIcon, Users, UserPlus, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { DriveEntry } from "./types";

interface ManageAccessDialogProps {
  entry: DriveEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function ManageAccessDialog({
  entry,
  open,
  onOpenChange,
  teamId,
}: ManageAccessDialogProps) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState<string>("");
  const [addingPerm, setAddingPerm] = useState<string>("view");
  const { toast } = useToast();

  useEffect(() => {
    if (open && entry && teamId) {
      loadData();
    }
  }, [open, entry, teamId]);

  const loadData = async () => {
    if (!entry) return;
    setLoading(true);
    try {
      const permsRes = await apiGet<any[]>(`/drive/entries/${entry.id}/permissions`).catch(() => []);
      const mbsRes = await apiGet<any>(`/teams/${teamId}/members`).catch(() => []);

      setPermissions(Array.isArray(permsRes) ? permsRes : []);

      const mbsList = Array.isArray(mbsRes) ? mbsRes : mbsRes?.data || [];
      const formattedMembers = mbsList.map((m: any) => m.user || m);
      setMembers(formattedMembers);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async () => {
    if (!entry || !addingUser) return;
    try {
      await apiPost(`/drive/entries/${entry.id}/permissions`, {
        userId: addingUser,
        permission: addingPerm,
      });
      toast({ title: "เพิ่มสิทธิ์สำเร็จ" });
      setAddingUser("");
      await loadData();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "แก้ไขสิทธิ์ไม่สำเร็จ",
        description: e.message,
      });
    }
  };

  const handleRemovePermission = async (userId: string) => {
    if (!entry) return;
    try {
      await apiDelete(`/drive/entries/${entry.id}/permissions/${userId}`);
      toast({ title: "ลบสิทธิ์สำเร็จ" });
      await loadData();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "ลบสิทธิ์ไม่สำเร็จ",
        description: e.message,
      });
    }
  };

  const availableMembers = members.filter(
    (m) => !permissions.find((p) => p.userId === m.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>จัดการสิทธิ์การเข้าถึง</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mb-3" />
            <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</span>
          </div>
        ) : (
          <div className="space-y-6 py-2 pb-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                  {entry?.isFolder ? (
                    <Folder className="w-5 h-5 text-primary" />
                  ) : (
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{entry?.name}</p>
                  <p className="text-xs text-muted-foreground">ใครก็ตามที่ได้รับสิทธิ์จะสามารถเห็นโฟลเดอร์/ไฟล์นี้ได้</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">เพิ่มสมาชิก (ให้สิทธิ์)</label>
              <div className="flex items-center gap-2">
                <Select value={addingUser} onValueChange={setAddingUser}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="ค้นหาสมาชิกในทีม..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <SelectItem value="none" disabled>ไม่มีสมาชิกให้เพิ่ม</SelectItem>
                    ) : (
                      availableMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Select value={addingPerm} onValueChange={setAddingPerm}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">ดูได้ (View)</SelectItem>
                    <SelectItem value="edit">แก้ไข (Edit)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  disabled={!addingUser || addingUser === "none"}
                  onClick={handleAddPermission}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">ผู้ที่มีสิทธิ์ ({permissions.length})</label>
              <ScrollArea className="max-h-[250px] pr-3">
                {permissions.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">ไม่มีผู้ได้รับสิทธิ์ส่วนตัว</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {permissions.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={p.user?.avatar || ""} />
                            <AvatarFallback>{p.user?.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.user?.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{p.user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-2">
                          <Select
                            value={p.permission}
                            onValueChange={async (newPerm) => {
                              try {
                                await apiPost(`/drive/entries/${entry!.id}/permissions`, {
                                  userId: p.userId,
                                  permission: newPerm,
                                });
                                await loadData();
                                toast({ title: "อัปเดตสิทธิ์สำเร็จ" });
                              } catch {
                                toast({ variant: "destructive", title: "อัปเดตไม่สำเร็จ" });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs w-[80px] border-0 shadow-none bg-transparent hover:bg-muted focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemovePermission(p.userId)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
