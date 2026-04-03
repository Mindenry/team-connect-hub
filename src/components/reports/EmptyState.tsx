import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <FileBarChart className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">ไม่มีข้อมูลรายงาน</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
      </CardContent>
    </Card>
  );
}
