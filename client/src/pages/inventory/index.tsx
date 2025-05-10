import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Download, AlertCircle, History, RotateCw, ChevronDown, ChevronUp } from "lucide-react";

export default function InventoryPage() {
  // 권한 확인
  const canWrite = usePermission("inventory", "write");
  const canExport = usePermission("inventory", "export");
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number | "">("");
  const [adjustNote, setAdjustNote] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showLowStock, setShowLowStock] = useState(false);
  const pageSize = 10;
  
  const { toast } = useToast();
  
  // 카테고리 데이터 조회
  const { data: categories } = useQuery({
    queryKey: ["/api/items/categories"],
    queryFn: async () => {
      const response = await fetch("/api/items/categories");
      
      if (!response.ok) {
        throw new Error("카테고리 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 재고 데이터 조회
  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const response = await fetch("/api/inventory");
      
      if (!response.ok) {
        throw new Error("재고 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 부족 재고 알림 조회
  const { data: lowStockItems } = useQuery({
    queryKey: ["/api/inventory/alerts/low"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/alerts/low");
      
      if (!response.ok) {
        throw new Error("부족 재고 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 선택된 품목의 재고 이력 조회
  const { data: itemHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["/api/inventory", selectedItem, "history"],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      const response = await fetch(`/api/inventory/${selectedItem}/history`);
      
      if (!response.ok) {
        throw new Error("재고 이력 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    },
    enabled: !!selectedItem
  });
  
  // 필터 및 정렬 적용
  const filteredInventory = inventory?.filter((item: any) => {
    // 검색어 필터링
    const searchMatch = !searchQuery || 
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 카테고리 필터링
    const categoryMatch = !categoryFilter || (item.categoryId === categoryFilter);
    
    // 부족 재고 필터링
    const lowStockMatch = !showLowStock || item.isLow;
    
    return searchMatch && categoryMatch && lowStockMatch;
  }) || [];
  
  // 정렬 적용
  const sortedInventory = [...filteredInventory].sort((a: any, b: any) => {
    let valA, valB;
    
    // 필드에 따라 적절한 값 가져오기
    if (sortField === "name") {
      valA = a.itemName.toLowerCase();
      valB = b.itemName.toLowerCase();
    } else if (sortField === "code") {
      valA = a.itemCode.toLowerCase();
      valB = b.itemCode.toLowerCase();
    } else if (sortField === "quantity") {
      valA = a.quantity;
      valB = b.quantity;
    } else {
      valA = a.itemName.toLowerCase();
      valB = b.itemName.toLowerCase();
    }
    
    // 오름차순/내림차순 정렬
    if (sortOrder === "asc") {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedInventory.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInventory = sortedInventory.slice(startIndex, startIndex + pageSize);
  
  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색 시 첫 페이지로 이동
    setCurrentPage(1);
  };
  
  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 정렬 방향 변경
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // 다른 필드를 클릭하면 해당 필드로 오름차순 정렬
      setSortField(field);
      setSortOrder("asc");
    }
  };
  
  // 카테고리 필터 변경 핸들러
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === "all" ? null : parseInt(value));
    setCurrentPage(1);
  };
  
  // 재고 조정 핸들러
  const handleInventoryAdjust = async () => {
    if (!selectedItem || adjustQuantity === "") return;
    
    try {
      const response = await apiRequest("POST", `/api/inventory/${selectedItem}/adjust`, {
        quantity: Number(adjustQuantity),
        notes: adjustNote
      });
      
      if (!response.ok) {
        throw new Error("재고 조정에 실패했습니다");
      }
      
      // 재고 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      
      // 다이얼로그 닫고 입력값 초기화
      setIsAdjustDialogOpen(false);
      setAdjustQuantity("");
      setAdjustNote("");
      
      toast({
        title: "재고 조정 완료",
        description: "재고가 성공적으로 조정되었습니다.",
      });
    } catch (error) {
      console.error("재고 조정 오류:", error);
      toast({
        title: "재고 조정 실패",
        description: "재고 조정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 재고 이력 보기 핸들러
  const handleViewHistory = (itemId: number) => {
    setSelectedItem(itemId);
    setActiveTab("history");
  };
  
  // 다이얼로그 열기 핸들러
  const openAdjustDialog = (itemId: number, currentQuantity: number) => {
    setSelectedItem(itemId);
    setAdjustQuantity(currentQuantity);
    setIsAdjustDialogOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 페이지 헤더 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">재고 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="품목코드, 품명"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button type="submit" variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </form>
              
              {/* 부족 재고 필터 버튼 */}
              <Button 
                variant={showLowStock ? "default" : "outline"} 
                onClick={() => setShowLowStock(!showLowStock)}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                부족 재고만
              </Button>
              
              {/* 재고 새로고침 버튼 */}
              <Button variant="outline" onClick={() => refetch()}>
                <RotateCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
              
              {/* 엑셀 다운로드 버튼 */}
              {canExport && (
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              )}
            </div>
          </div>
          
          {/* 낮은 재고 알림 카드 */}
          {lowStockItems && lowStockItems.length > 0 && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardHeader className="py-4">
                <CardTitle className="text-orange-700 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  재고 부족 알림
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockItems.slice(0, 3).map((item: any) => (
                    <div 
                      key={item.itemId} 
                      className="p-3 bg-white rounded-md border border-orange-200 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          현재: <span className="text-orange-600 font-medium">{item.quantity}</span> {item.unit} / 
                          최소: {item.minStockLevel} {item.unit}
                        </p>
                      </div>
                      {canWrite && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openAdjustDialog(item.itemId, item.quantity)}
                        >
                          조정
                        </Button>
                      )}
                    </div>
                  ))}
                  {lowStockItems.length > 3 && (
                    <div className="p-3 bg-white rounded-md border border-orange-200 flex justify-center items-center">
                      <p className="text-sm text-muted-foreground">
                        외 {lowStockItems.length - 3}건의 부족 재고가 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 탭 컨텐츠 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="inventory">재고 현황</TabsTrigger>
              <TabsTrigger value="history">재고 이력</TabsTrigger>
              <TabsTrigger value="adjust">재고 실사</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              {/* 카테고리 필터 */}
              <div className="flex items-center gap-2">
                <Label htmlFor="categoryFilter" className="whitespace-nowrap">분류:</Label>
                <Select 
                  value={categoryFilter ? categoryFilter.toString() : "all"}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger id="categoryFilter" className="w-48">
                    <SelectValue placeholder="모든 분류" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 분류</SelectItem>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="inventory">
              {/* 재고 현황 목록 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("code")}>
                        품목코드 
                        {sortField === "code" && (
                          sortOrder === "asc" ? 
                          <ChevronUp className="inline h-4 w-4 ml-1" /> : 
                          <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                        품명
                        {sortField === "name" && (
                          sortOrder === "asc" ? 
                          <ChevronUp className="inline h-4 w-4 ml-1" /> : 
                          <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("quantity")}>
                        현재고
                        {sortField === "quantity" && (
                          sortOrder === "asc" ? 
                          <ChevronUp className="inline h-4 w-4 ml-1" /> : 
                          <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead>단위</TableHead>
                      <TableHead>최소재고</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {searchQuery || categoryFilter || showLowStock ? "검색 결과가 없습니다." : "재고 데이터가 없습니다."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedInventory.map((item: any) => (
                        <TableRow key={item.itemId} className={item.isLow ? "bg-orange-50" : ""}>
                          <TableCell>{item.itemCode}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.categoryName || "-"}</TableCell>
                          <TableCell className={`font-mono ${item.isLow ? "text-orange-600 font-bold" : ""}`}>
                            {item.quantity}
                          </TableCell>
                          <TableCell>{item.unit || "개"}</TableCell>
                          <TableCell className="font-mono">{item.minStockLevel || 0}</TableCell>
                          <TableCell>
                            {item.isLow ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
                                부족
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-success bg-opacity-10 text-success">
                                정상
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewHistory(item.itemId)}
                              >
                                <History className="h-4 w-4 mr-1" />
                                이력
                              </Button>
                              {canWrite && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openAdjustDialog(item.itemId, item.quantity)}
                                >
                                  조정
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* 페이지네이션 */}
                {filteredInventory.length > 0 && (
                  <div className="px-6 py-3 flex items-center justify-between border-t">
                    <div className="text-xs text-neutral-300">
                      총 <span className="font-medium">{filteredInventory.length}</span>건 중 <span className="font-medium">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredInventory.length)}</span>건 표시
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        이전
                      </Button>
                      
                      {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = index + 1;
                        } else if (currentPage <= 3) {
                          pageNum = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + index;
                        } else {
                          pageNum = currentPage - 2 + index;
                        }
                        
                        return (
                          <Button 
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"} 
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <Button variant="outline" size="sm" disabled>...</Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="history">
              {/* 재고 이력 내역 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {!selectedItem ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">이력을 확인할 품목을 선택하세요.</p>
                  </div>
                ) : isHistoryLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">재고 이력을 불러오는 중입니다...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b">
                      <h3 className="font-medium">
                        {inventory?.find((item: any) => item.itemId === selectedItem)?.itemName || '선택한 품목'} 재고 이력
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>일시</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead>변경 전</TableHead>
                          <TableHead>변경 후</TableHead>
                          <TableHead>변화량</TableHead>
                          <TableHead>문서번호</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>비고</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!itemHistory || itemHistory.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              재고 이력이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          itemHistory.map((history: any) => (
                            <TableRow key={history.id}>
                              <TableCell>{new Date(history.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                {history.transactionType === 'purchase' && '입고'}
                                {history.transactionType === 'sale' && '출고'}
                                {history.transactionType === 'adjustment' && '조정'}
                              </TableCell>
                              <TableCell className="font-mono">{history.quantityBefore}</TableCell>
                              <TableCell className="font-mono">{history.quantityAfter}</TableCell>
                              <TableCell className={`font-mono ${history.change > 0 ? 'text-success' : history.change < 0 ? 'text-destructive' : ''}`}>
                                {history.change > 0 ? `+${history.change}` : history.change}
                              </TableCell>
                              <TableCell>{history.transactionId || '-'}</TableCell>
                              <TableCell>{history.createdByName || '-'}</TableCell>
                              <TableCell>{history.notes || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="adjust">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium mb-2">재고 실사</h3>
                <p className="text-muted-foreground">
                  재고 실사 기능은 추후 업데이트될 예정입니다.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* 재고 조정 다이얼로그 */}
          <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>재고 조정</DialogTitle>
                <DialogDescription>
                  현재 재고 수량을 수정할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">수량</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustNote">메모</Label>
                  <Textarea
                    id="adjustNote"
                    placeholder="재고 조정 사유를 입력하세요"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleInventoryAdjust}
                  disabled={adjustQuantity === ""}
                >
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
