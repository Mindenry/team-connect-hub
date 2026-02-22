import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Calendar,
  User,
  Lock,
  Globe,
  ChevronRight,
  Filter,
  Grid3x3,
  List,
  Sparkles,
  TrendingUp,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell, PageHero } from "@/components/shared/PageShell";
import { useToast } from "@/components/ui/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  isPublic: boolean;
  teamId: string | null;
  createdBy: string;
  version: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

type ViewMode = "grid" | "list";

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    isPublic: true,
    teamId: "",
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await apiGet<WikiArticle[]>("/wiki/articles");
      // Ensure data is an array
      const articlesList = Array.isArray(data) ? data : [];
      setArticles(articlesList);
      const cats = Array.from(new Set(articlesList.map((a) => a.category).filter(Boolean))) as string[];
      setCategories(cats);
      
      // If we got empty data, it might be due to an error (500, 429, etc.)
      // The API gracefully returns empty arrays for errors, so we don't show error toast
      // The UI will just show empty state which is acceptable
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
      setArticles([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const tags = formData.tags.split(",").map((t) => t.trim()).filter(Boolean);
      await apiPost("/wiki/articles", {
        ...formData,
        tags,
        teamId: formData.teamId || null,
      });
      toast({
        title: "Success",
        description: "Article created successfully",
      });
      setCreateDialogOpen(false);
      setFormData({
        title: "",
        content: "",
        category: "",
        tags: "",
        isPublic: true,
        teamId: "",
      });
      loadArticles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      });
    }
  };

  const handleView = async (article: WikiArticle) => {
    setSelectedArticle(article);
    setViewDialogOpen(true);
    // Increment view count
    try {
      await apiPatch(`/wiki/articles/${article.id}/view`);
      loadArticles();
    } catch (error) {
      // Ignore view count errors
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      await apiDelete(`/wiki/articles/${id}`);
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
      loadArticles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      });
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stats = {
    total: articles.length,
    public: articles.filter((a) => a.isPublic).length,
    categories: categories.length,
    views: articles.reduce((sum, a) => sum + a.viewCount, 0),
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
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Knowledge Base</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    เอกสารบริษัท · SOP · FAQ · Best Practices · คลังความรู้ของทีม
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="h-9 gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">สร้างบทความ</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-foreground">{stats.total}</span>
                <span className="text-xs text-muted-foreground">บทความทั้งหมด</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{stats.public}</span>
                <span className="text-xs text-muted-foreground">สาธารณะ</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{stats.categories}</span>
                <span className="text-xs text-muted-foreground">หมวดหมู่</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{stats.views.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">ยอดดู</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-border/50 bg-background/50">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 w-full sm:max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาบทความ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 border-border/50 bg-background/50 hover:bg-background transition-colors"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] h-9 text-xs border-border/50 bg-background/50 hover:bg-background">
                    <SelectValue placeholder="หมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex border border-border/50 rounded-lg bg-muted/30 p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-7 w-7 p-0"
                      >
                        <Grid3x3 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ Grid</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="h-7 w-7 p-0"
                      >
                        <List className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ List</TooltipContent>
                  </Tooltip>
                </div>
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
                  <span className="text-sm text-muted-foreground font-medium">กำลังโหลดบทความ...</span>
                </div>
              </div>
            ) : filteredArticles.length === 0 ? (
              <Card className="border-border/50 bg-card/70">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">ไม่พบบทความ</h3>
                  <p className="text-sm text-muted-foreground mb-4">ลองค้นหาด้วยคำอื่นหรือสร้างบทความใหม่</p>
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    สร้างบทความแรก
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="wait">
                  {filteredArticles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card
                        className={cn(
                          "cursor-pointer group border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300",
                          "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1",
                          "ring-0 hover:ring-1 hover:ring-primary/20"
                        )}
                        onClick={() => handleView(article)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-bold line-clamp-2 group-hover:text-primary transition-colors">
                                {article.title}
                              </CardTitle>
                            </div>
                            <div className="shrink-0">
                              {article.isPublic ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <Globe className="w-4 h-4 text-primary" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>สาธารณะ</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                      <Lock className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>ส่วนตัว</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {article.content.substring(0, 150)}...
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {article.category && (
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-primary/10 text-primary border-primary/20">
                                {article.category}
                              </Badge>
                            )}
                            {article.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                {tag}
                              </Badge>
                            ))}
                            {article.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                +{article.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1.5">
                              <Eye className="w-3 h-3" />
                              <span className="font-medium">{article.viewCount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(article.updatedAt)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {filteredArticles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <Card
                        className={cn(
                          "cursor-pointer group border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300",
                          "hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5",
                          "ring-0 hover:ring-1 hover:ring-primary/20"
                        )}
                        onClick={() => handleView(article)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                                  {article.title}
                                </h3>
                                {article.isPublic ? (
                                  <Globe className="w-4 h-4 text-primary shrink-0" />
                                ) : (
                                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                {article.content.substring(0, 200)}...
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {article.category && (
                                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-primary/10 text-primary border-primary/20">
                                    {article.category}
                                  </Badge>
                                )}
                                {article.tags.slice(0, 5).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                    {tag}
                                  </Badge>
                                ))}
                                {article.tags.length > 5 && (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                    +{article.tags.length - 5}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="font-medium">{article.viewCount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(article.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
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
              <DialogTitle className="text-xl">สร้างบทความใหม่</DialogTitle>
              <DialogDescription>สร้างบทความใหม่ใน Knowledge Base</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>หัวข้อ</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="หัวข้อบทความ"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>เนื้อหา (Markdown)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="เนื้อหาบทความในรูปแบบ Markdown"
                  rows={15}
                  className="font-mono text-sm mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>หมวดหมู่</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="เช่น SOP, FAQ, Guide"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tags (คั่นด้วย comma)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
                <Label>สาธารณะ (ทุกคนสามารถดูได้)</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleCreate}>สร้างบทความ</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedArticle && (
              <>
                <DialogHeader className="pb-4 border-b border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl font-bold mb-2">{selectedArticle.title}</DialogTitle>
                      <DialogDescription className="mt-2">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>อัปเดต {formatDate(selectedArticle.updatedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{selectedArticle.viewCount.toLocaleString()} ครั้ง</span>
                          </div>
                          {selectedArticle.creator && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                <span>โดย {selectedArticle.creator.name}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedArticle.isPublic ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          <Globe className="w-3 h-3 mr-1" />
                          สาธารณะ
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Lock className="w-3 h-3 mr-1" />
                          ส่วนตัว
                        </Badge>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <ScrollArea className="flex-1 mt-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border/50">
                    {selectedArticle.category && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {selectedArticle.category}
                      </Badge>
                    )}
                    {selectedArticle.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
