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
import { Loader2, Plus, File, Search, Download, MoreHorizontal } from "lucide-react";

export default function VouchersPage() {
  // 권한 확인
  const canWrite = usePermission("vouchers", "write");
  const canDelete = usePermission("vouchers", "delete");
  const canExport = usePermission("vouchers", "export");
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState("vouchers");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const pageSize = 10;
  
  // 날짜 범위 상태
  const defaultDateRange = {
    from: addDays(new Date(), -30),
    to: new Date()
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  
  // 전표 데이터 조회
  const { data: vouchers, isLoading } = useQuery({
    queryKey: ["/api/vouchers", dateRange, selectedType, selectedStatus],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || "";
      const to = dateRange?.to?.toISOString() || "";
      
      let url = `/api/vouchers?`;
      if (dateRange?.from) url += `&from=${from}`;
      if (dateRange?.to) url += `&to=${to}`;
      if (selectedType) url += `&type=${selectedType}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("전표 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 계정 데이터 조회
  const { data: accounts } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      
      if (!response.ok) {
        throw new Error("계정 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 검색 기능
  const filteredVouchers = vouchers?.filter((voucher: any) => {
    const query = searchQuery.toLowerCase();
    return (
      voucher.code.toLowerCase().includes(query) ||
      voucher.description.toLowerCase().includes(query)
    );
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredVouchers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVouchers = filteredVouchers.slice(startIndex, startIndex + pageSize);
  
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
      case "approved": return "승인됨";
      case "pending": return "대기";
      case "rejected": return "거부됨";
      default: return status;
    }
  };
  
  // 유형 텍스트 변환
  const getTypeText = (type: string) => {
    switch (type) {
      case "income": return "수입";
      case "expense": return "지출";
      case "transfer": return "대체";
      default: return type;
    }
  };
  
  // 상태 스타일 클래스
  const getStatusClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-primary bg-opacity-10 text-primary";
      case "pending":
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
      case "rejected":
        return "bg-destructive bg-opacity-10 text-destructive";
      default:
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
    }
  };
  
  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  // 유형 필터 변경 핸들러
  const handleTypeFilterChange = (value: string) => {
    setSelectedType(value === "all" ? null : value);
    setCurrentPage(1);
  };
  
  // 상태 필터 변경 핸들러
  const handleStatusFilterChange = (value: string) => {
    setSelectedStatus(value === "all" ? null : value);
    setCurrentPage(1);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 페이지 헤더 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">전표 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="전표번호, 적요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button type="submit" variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </form>
              
              {/* 전표 등록 버튼 */}
              {canWrite && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      전표 등록
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>전표 등록</DialogTitle>
                      <DialogDescription>
                        새로운 전표 정보를 입력하세요.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date">거래일자</Label>
                          <Input id="date" type="date" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">전표유형</Label>
                          <Select>
                            <SelectTrigger id="type">
                              <SelectValue placeholder="유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">수입</SelectItem>
                              <SelectItem value="expense">지출</SelectItem>
                              <SelectItem value="transfer">대체</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">금액</Label>
                          <Input id="amount" type="number" placeholder="0" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>계정 정보</Label>
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>계정과목</TableHead>
                                <TableHead>차변</TableHead>
                                <TableHead>대변</TableHead>
                                <TableHead>적요</TableHead>
                                <TableHead>관리</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">
                                  계정 정보를 추가하세요
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          계정 추가
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">적요</Label>
                        <Textarea id="description" placeholder="적요를 입력하세요" />
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
          
          {/* 탭 컨텐츠 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="vouchers">전표 목록</TabsTrigger>
              <TabsTrigger value="templates">전표 템플릿</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              {/* 날짜 범위 선택 */}
              <DatePickerWithRange 
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
              
              <div className="flex gap-2">
                {/* 유형 필터 */}
                <Select 
                  value={selectedType || "all"}
                  onValueChange={handleTypeFilterChange}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="모든 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    <SelectItem value="income">수입</SelectItem>
                    <SelectItem value="expense">지출</SelectItem>
                    <SelectItem value="transfer">대체</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 상태 필터 */}
                <Select 
                  value={selectedStatus || "all"}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="모든 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="approved">승인됨</SelectItem>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="rejected">거부됨</SelectItem>
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
            </div>
            
            <TabsContent value="vouchers">
              {/* 전표 목록 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>전표번호</TableHead>
                      <TableHead>거래일자</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>계정과목</TableHead>
                      <TableHead>적요</TableHead>
                      <TableHead>금액</TableHead>
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
                    ) : paginatedVouchers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {searchQuery || selectedType || selectedStatus ? "검색 결과가 없습니다." : "전표 데이터가 없습니다."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVouchers.map((voucher: any) => (
                        <TableRow key={voucher.id}>
                          <TableCell>{voucher.code}</TableCell>
                          <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                          <TableCell>{getTypeText(voucher.type)}</TableCell>
                          <TableCell>{voucher.mainAccount}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{voucher.description}</TableCell>
                          <TableCell className="font-mono">
                            {new Intl.NumberFormat('ko-KR').format(voucher.amount)}원
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(voucher.status)}`}>
                              {getStatusText(voucher.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <File className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* 페이지네이션 */}
              {paginatedVouchers.length > 0 && (
                <div className="flex justify-center mt-4">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      이전
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage - 2 + i;
                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}
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
            </TabsContent>
            
            <TabsContent value="templates">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium mb-4">전표 템플릿</h3>
                <p className="text-muted-foreground mb-4">자주 사용하는 전표를 템플릿으로 저장하여 효율적으로 관리하세요.</p>
                
                {/* 템플릿 목록 (예시) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">월세 지급</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>지출 전표</p>
                        <p>계정: 임차료, 현금</p>
                        <p>금액: 500,000원</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">급여 지급</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>지출 전표</p>
                        <p>계정: 급여, 현금</p>
                        <p>금액: 2,000,000원</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-dashed flex items-center justify-center h-32 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Button variant="ghost">
                      <Plus className="h-5 w-5 mr-2" />
                      템플릿 추가
                    </Button>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}