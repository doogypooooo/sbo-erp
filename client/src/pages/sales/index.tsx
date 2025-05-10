import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
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
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Loader2, Plus, File, Search, Download, MoreHorizontal, Barcode } from "lucide-react";

export default function SalesPage() {
  // 권한 확인
  const canWrite = usePermission("sales", "write");
  const canDelete = usePermission("sales", "delete");
  const canExport = usePermission("sales", "export");
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState("sales");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const pageSize = 10;
  
  // 날짜 범위 상태
  const defaultDateRange = {
    from: addDays(new Date(), -30),
    to: new Date()
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  
  // 바코드 스캔 모드 상태
  const [isScanMode, setIsScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // 판매 데이터 조회
  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/transactions", "sale", dateRange, selectedStatus],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || "";
      const to = dateRange?.to?.toISOString() || "";
      
      let url = `/api/transactions?type=sale`;
      if (dateRange?.from) url += `&from=${from}`;
      if (dateRange?.to) url += `&to=${to}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("판매 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 거래처 목록 조회
  const { data: partners } = useQuery({
    queryKey: ["/api/partners", "customer"],
    queryFn: async () => {
      const response = await fetch("/api/partners?type=customer");
      
      if (!response.ok) {
        throw new Error("거래처 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 품목 목록 조회
  const { data: items } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await fetch("/api/items");
      
      if (!response.ok) {
        throw new Error("품목 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 검색 기능
  const filteredSales = sales?.filter((sale: any) => {
    const query = searchQuery.toLowerCase();
    return (
      sale.code.toLowerCase().includes(query) ||
      sale.partnerName.toLowerCase().includes(query) ||
      (sale.notes && sale.notes.toLowerCase().includes(query))
    );
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + pageSize);
  
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
  
  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "완료";
      case "pending": return "대기";
      case "unpaid": return "미수금";
      case "canceled": return "취소";
      default: return status;
    }
  };
  
  // 상태 스타일 클래스
  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-primary bg-opacity-10 text-primary";
      case "pending":
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
      case "unpaid":
        return "bg-secondary bg-opacity-10 text-secondary";
      case "canceled":
        return "bg-destructive bg-opacity-10 text-destructive";
      default:
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
    }
  };
  
  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  // 상태 필터 변경 핸들러
  const handleStatusFilterChange = (value: string) => {
    setSelectedStatus(value === "all" ? null : value);
    setCurrentPage(1);
  };
  
  // 바코드 스캔 핸들러
  const handleBarcodeScan = async () => {
    if (!barcodeInput) return;
    
    try {
      const response = await fetch(`/api/items/barcode/${barcodeInput}`);
      
      if (!response.ok) {
        throw new Error("등록되지 않은 바코드입니다.");
      }
      
      const data = await response.json();
      
      alert(`품목 조회 결과: ${data.item.name} (코드: ${data.item.code}, 재고: ${data.stock})`);
      
      // 입력값 초기화
      setBarcodeInput("");
    } catch (error) {
      console.error("바코드 스캔 오류:", error);
      alert("등록되지 않은 바코드입니다.");
    }
  };
  
  // 바코드 입력 필드에서 엔터 처리
  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeScan();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 페이지 헤더 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">판매/출고 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="판매번호, 거래처, 메모"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button type="submit" variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </form>
              
              {/* 바코드 스캔/등록 버튼 */}
              <div className="flex gap-2">
                <Button 
                  variant={isScanMode ? "default" : "outline"} 
                  onClick={() => setIsScanMode(!isScanMode)}
                >
                  <Barcode className="h-4 w-4 mr-2" />
                  바코드 스캔
                </Button>
                
                {canWrite && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        판매 등록
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>판매/출고 등록</DialogTitle>
                        <DialogDescription>
                          새로운 판매/출고 정보를 입력하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">출고일자</Label>
                            <Input id="date" type="date" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="partner">거래처</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="거래처 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {partners?.map((partner: any) => (
                                  <SelectItem key={partner.id} value={partner.id.toString()}>
                                    {partner.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>품목 목록</Label>
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>품목</TableHead>
                                  <TableHead>수량</TableHead>
                                  <TableHead>단가</TableHead>
                                  <TableHead>공급가액</TableHead>
                                  <TableHead>세액</TableHead>
                                  <TableHead>관리</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-4">
                                    품목을 추가하세요
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <Button variant="outline" size="sm" className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            품목 추가
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="notes">메모</Label>
                            <Textarea id="notes" placeholder="메모" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="status">상태</Label>
                            <Select defaultValue="completed">
                              <SelectTrigger id="status">
                                <SelectValue placeholder="상태 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="completed">완료</SelectItem>
                                <SelectItem value="unpaid">미수금</SelectItem>
                                <SelectItem value="pending">대기</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">취소</Button>
                        <Button type="submit">저장</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
          
          {/* 바코드 스캔 카드 */}
          {isScanMode && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>바코드 스캔</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="barcodeInput">바코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="barcodeInput"
                      placeholder="바코드를 입력하거나 스캔하세요"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeInputKeyDown}
                      autoFocus
                    />
                    <Button 
                      onClick={handleBarcodeScan}
                      disabled={!barcodeInput}
                    >
                      스캔
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 탭 컨텐츠 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="sales">판매/출고 내역</TabsTrigger>
              <TabsTrigger value="estimates">견적 내역</TabsTrigger>
              <TabsTrigger value="orders">주문 내역</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              {/* 날짜 범위 선택 */}
              <DatePickerWithRange 
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
              
              {/* 상태 필터 */}
              <Select 
                value={selectedStatus || "all"}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="모든 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="unpaid">미수금</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="canceled">취소</SelectItem>
                </SelectContent>
              </Select>
              
              {/* 엑셀 다운로드 버튼 */}
              {canExport && (
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              )}
            </div>
            
            <TabsContent value="sales">
              {/* 판매/출고 내역 목록 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>판매번호</TableHead>
                      <TableHead>거래처</TableHead>
                      <TableHead>품목</TableHead>
                      <TableHead>공급가액</TableHead>
                      <TableHead>세액</TableHead>
                      <TableHead>합계</TableHead>
                      <TableHead>출고일자</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          {searchQuery ? "검색 결과가 없습니다." : "판매/출고 내역이 없습니다."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSales.map((sale: any) => (
                        <TableRow key={sale.id}>
                          <TableCell>{sale.code}</TableCell>
                          <TableCell className="font-medium">{sale.partnerName}</TableCell>
                          <TableCell>{sale.itemSummary || "여러 품목"}</TableCell>
                          <TableCell className="font-mono">{(sale.totalAmount - (sale.taxAmount || 0)).toLocaleString()}원</TableCell>
                          <TableCell className="font-mono">{(sale.taxAmount || 0).toLocaleString()}원</TableCell>
                          <TableCell className="font-mono">{sale.totalAmount.toLocaleString()}원</TableCell>
                          <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(sale.status)}`}>
                              {getStatusText(sale.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">상세</Button>
                              {canWrite && sale.status !== "completed" && sale.status !== "canceled" && (
                                <Button variant="outline" size="sm">수정</Button>
                              )}
                              {canDelete && sale.status !== "completed" && (
                                <Button variant="destructive" size="sm">취소</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* 페이지네이션 */}
                {filteredSales.length > 0 && (
                  <div className="px-6 py-3 flex items-center justify-between border-t">
                    <div className="text-xs text-neutral-300">
                      총 <span className="font-medium">{filteredSales.length}</span>건 중 <span className="font-medium">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredSales.length)}</span>건 표시
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
            
            <TabsContent value="estimates">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium mb-2">견적 내역</h3>
                <p className="text-muted-foreground">
                  견적 관리 기능은 추후 업데이트될 예정입니다.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="orders">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium mb-2">주문 내역</h3>
                <p className="text-muted-foreground">
                  주문 관리 기능은 추후 업데이트될 예정입니다.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
