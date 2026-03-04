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
  Zap,
  ArrowUpRight,
  Layers,
  Star,
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
      const articlesList = Array.isArray(data) ? data : [];
      setArticles(articlesList);
      const cats = Array.from(new Set(articlesList.map((a) => a.category).filter(Boolean))) as string[];
      setCategories(cats);
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
        {/* Header - Same style as Meetings & Calendar */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse" />
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
                  size="sm"
                  className="h-9 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">สร้างบทความ</span>
                  <span className="sm:hidden">สร้าง</span>
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-6 space-y-4">
              {/* Search & Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาบทความ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] h-10 border-border/60 bg-background/50">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="ทุกหมวดหมู่" />
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
                        className="h-8 w-8 p-0"
                      >
                        <Grid3x3 className="w-4 h-4" />
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
                        className="h-8 w-8 p-0"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ List</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pb-6">
              {loading ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <span className="text-sm text-muted-foreground font-medium">กำลังโหลดบทความ...</span>
                  </CardContent>
                </Card>
              ) : filteredArticles.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
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
                            "cursor-pointer group h-full border-2 hover:border-primary/50 transition-all duration-300",
                            "hover:shadow-lg hover:-translate-y-1"
                          )}
                          onClick={() => handleView(article)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {article.isPublic ? (
                                    <Globe className="w-4 h-4 text-primary shrink-0" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                                  )}
                                  {article.category && (
                                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-primary/10 text-primary border-primary/20">
                                      {article.category}
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-base font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                                  {article.title}
                                </CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                              {article.content.substring(0, 150)}...
                            </p>
                            
                            {article.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {article.tags.slice(0, 4).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                    {tag}
                                  </Badge>
                                ))}
                                {article.tags.length > 4 && (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                    +{article.tags.length - 4}
                                  </Badge>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="font-medium">{article.viewCount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
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
                            "cursor-pointer group border-2 hover:border-primary/50 transition-all duration-300",
                            "hover:shadow-md hover:-translate-y-0.5"
                          )}
                          onClick={() => handleView(article)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  {article.isPublic ? (
                                    <Globe className="w-5 h-5 text-primary shrink-0" />
                                  ) : (
                                    <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                                  )}
                                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                                    {article.title}
                                  </h3>
                                  {article.category && (
                                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 bg-primary/10 text-primary border-primary/20">
                                      {article.category}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                  {article.content.substring(0, 200)}...
                                </p>
                                {article.tags.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {article.tags.slice(0, 6).map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {article.tags.length > 6 && (
                                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
                                        +{article.tags.length - 6}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <Eye className="w-4 h-4" />
                                  <span className="font-medium">{article.viewCount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
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
        </div>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">สร้างบทความใหม่</DialogTitle>
              <DialogDescription>สร้างบทความใหม่ใน Knowledge Base</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">หัวข้อ</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="หัวข้อบทความ"
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">เนื้อหา (Markdown)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="เนื้อหาบทความในรูปแบบ Markdown"
                  rows={18}
                  className="font-mono text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">หมวดหมู่</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="เช่น SOP, FAQ, Guide"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Tags (คั่นด้วย comma)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
                <div className="flex-1">
                  <Label className="text-sm font-semibold cursor-pointer">สาธารณะ</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">ทุกคนสามารถดูได้</p>
                </div>
                {formData.isPublic ? (
                  <Globe className="w-5 h-5 text-primary" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleCreate}>สร้างบทความ</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog - Enhanced Content Display */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedArticle && (
              <>
                <DialogHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl font-bold mb-3 leading-tight">
                        {selectedArticle.title}
                      </DialogTitle>
                      <DialogDescription>
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">อัปเดต {formatDate(selectedArticle.updatedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{selectedArticle.viewCount.toLocaleString()} ครั้ง</span>
                          </div>
                          {selectedArticle.creator && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">โดย {selectedArticle.creator.name}</span>
                            </div>
                          )}
                        </div>
                      </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedArticle.isPublic ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                          <Globe className="w-3.5 h-3.5 mr-1.5" />
                          สาธารณะ
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="px-3 py-1.5">
                          <Lock className="w-3.5 h-3.5 mr-1.5" />
                          ส่วนตัว
                        </Badge>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <ScrollArea className="flex-1 mt-6 pr-4">
                  <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert 
                    prose-headings:font-bold prose-headings:text-foreground
                    prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
                    prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
                    prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
                    prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
                    prose-li:mb-2 prose-li:text-foreground
                    prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                    prose-hr:border-border prose-hr:my-6
                    prose-table:border-collapse prose-table:w-full prose-table:mb-4
                    prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-th:text-left prose-th:font-semibold
                    prose-td:border prose-td:border-border prose-td:p-2">
                    <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                  </div>
                  {(selectedArticle.category || selectedArticle.tags.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t">
                      {selectedArticle.category && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                          {selectedArticle.category}
                        </Badge>
                      )}
                      {selectedArticle.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="px-3 py-1.5">
                          {tag}
                        </Badge>
                      ))}
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
