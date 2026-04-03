import { motion } from "framer-motion";
import { Building, Image, Upload, X, Plus, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { OrgSettings } from "./types";

interface OrgSettingsPanelProps {
  orgSettings: OrgSettings;
  teams: { id: string; name: string }[];
  logoUploading: boolean;
  newDepartment: string;
  newPositionState: Record<string, string>;
  onOrgSettingsChange: (settings: OrgSettings) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNewDepartmentChange: (value: string) => void;
  onNewPositionChange: (deptName: string, value: string) => void;
  onAddDepartment: () => void;
  onAddPosition: (deptName: string) => void;
  onRemoveDepartment: (deptName: string) => void;
  onRemovePosition: (deptName: string, position: string) => void;
  onSave: () => void;
}

export function OrgSettingsPanel({
  orgSettings,
  teams,
  logoUploading,
  newDepartment,
  newPositionState,
  onOrgSettingsChange,
  onLogoUpload,
  onNewDepartmentChange,
  onNewPositionChange,
  onAddDepartment,
  onAddPosition,
  onRemoveDepartment,
  onRemovePosition,
  onSave,
}: OrgSettingsPanelProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl space-y-5">
      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Organization Settings</CardTitle>
          <CardDescription className="text-xs">Configure your organization's general settings and policies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Organization Logo */}
          <div>
            <Label className="flex items-center gap-2"><Image className="w-4 h-4" />Organization Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border/60 bg-muted/30 flex items-center justify-center overflow-hidden">
                {orgSettings.logo ? (
                  <img src={orgSettings.logo} alt="Org logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Building className="w-8 h-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} disabled={logoUploading} />
                  <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background/60 hover:bg-accent text-sm font-medium transition-colors", logoUploading && "opacity-50 pointer-events-none")}>
                    <Upload className="w-4 h-4" />
                    {logoUploading ? "Uploading..." : "Upload Logo"}
                  </div>
                </label>
                {orgSettings.logo && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => onOrgSettingsChange({ ...orgSettings, logo: "" })}>
                    <X className="w-3 h-3 mr-1" /> Remove
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground">Recommended: 200×200px, PNG or JPG, max 5MB</p>
              </div>
            </div>
          </div>
          <Separator className="opacity-50" />
          <div>
            <Label>Organization Name</Label>
            <Input
              value={orgSettings.name}
              onChange={(e) => onOrgSettingsChange({ ...orgSettings, name: e.target.value })}
              className="mt-1.5 bg-background/60 border-border/60"
              placeholder="Acme Corporation"
            />
          </div>
          <Separator className="opacity-50" />
          <div>
            <Label>Allowed Email Domains</Label>
            <Input
              value={orgSettings.allowedDomains}
              onChange={(e) => onOrgSettingsChange({ ...orgSettings, allowedDomains: e.target.value })}
              className="mt-1.5 bg-background/60 border-border/60"
              placeholder="@acme.com, @company.com"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Only emails from these domains can be invited. Separate with comma.
            </p>
          </div>
          <Separator className="opacity-50" />
          <div>
            <Label>Default Team for New Members</Label>
            <Select
              value={orgSettings.defaultTeam || "none"}
              onValueChange={(value) => onOrgSettingsChange({ ...orgSettings, defaultTeam: value === "none" ? "" : value })}
            >
              <SelectTrigger className="mt-1.5 bg-background/60 border-border/60">
                <SelectValue placeholder="No default team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator className="opacity-50" />

          {/* Departments & Positions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                Departments & Positions
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Define departments and specific positions for each.
              </p>
              <div className="flex gap-2">
                <Input
                  value={newDepartment}
                  onChange={(e) => onNewDepartmentChange(e.target.value)}
                  placeholder="e.g. Engineering, HR, Sales"
                  className="bg-background/60 border-border/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDepartment.trim()) {
                      e.preventDefault();
                      onAddDepartment();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={onAddDepartment}>
                  <Plus className="w-4 h-4 mr-1" /> Add Dept
                </Button>
              </div>
            </div>

            {orgSettings.departments.length === 0 ? (
              <div className="p-4 text-center border border-border/40 border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                No departments configured yet
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {orgSettings.departments.map((dept, deptIdx) => (
                  <div key={deptIdx} className="border border-border/50 rounded-lg bg-background/40 overflow-hidden">
                    <div className="py-2.5 px-3 flex items-center justify-between border-b border-border/30 bg-muted/20">
                      <span className="font-semibold text-sm">{dept.name}</span>
                      <button
                        type="button"
                        title="Delete Department"
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        onClick={() => onRemoveDepartment(dept.name)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Add position in ${dept.name}... (e.g. Senior Dev)`}
                          className="h-8 text-xs bg-background/60"
                          value={newPositionState[dept.name] || ""}
                          onChange={(e) => onNewPositionChange(dept.name, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newPositionState[dept.name]?.trim()) {
                              e.preventDefault();
                              onAddPosition(dept.name);
                            }
                          }}
                        />
                        <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={() => onAddPosition(dept.name)}>
                          <Plus className="w-3 h-3 mr-1" /> Add Position
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dept.positions.map((pos, pIdx) => (
                          <Badge key={pIdx} variant="outline" className="pl-2 pr-1 py-0.5 text-[10px] bg-background/50 flex items-center gap-1 shadow-sm">
                            {pos}
                            <button
                              type="button"
                              onClick={() => onRemovePosition(dept.name, pos)}
                              className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 ml-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                        {dept.positions.length === 0 && (
                          <span className="text-[10px] text-muted-foreground italic">No positions</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="opacity-50" />
          <Button onClick={onSave} className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 shadow-lg">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
