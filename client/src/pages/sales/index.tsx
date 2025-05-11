import { useState, useRef } from "react";
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
import { Loader2, Plus, File, Search, Download, MoreHorizontal, Barcode, Upload, Eye, Pencil, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import * as XLSX from "xlsx";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
  
  // 재고 있는 품목만
  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("재고 데이터를 불러올 수 없습니다.");
      return res.json();
    }
  });
  const availableItems = (inventory || []).filter((item: any) => item.quantity > 0);
  
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
        return "bg-primary bg-opacity-10 text-white";
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

  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<string>("pending");
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 재고 초과 체크 함수
  function isStockExceeded(item: any) {
    const stock = inventory?.find((inv: any) => String(inv.itemId) === String(item.itemId))?.quantity ?? 0;
    return Number(item.quantity) > stock;
  }
  const anyStockExceeded = itemsList.some(item => isStockExceeded(item));

  // 엑셀 다운로드
  async function handleExcelDownload() {
    try {
      const res = await fetch("/api/transactions/export?type=sale");
      if (!res.ok) throw new Error("엑셀 다운로드 실패");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sales.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "엑셀 다운로드 실패", description: "엑셀 파일을 다운로드할 수 없습니다." });
    }
  }

  // 엑셀 업로드
  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/transactions/import?type=sale", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("엑셀 업로드 실패");
      toast({ title: "엑셀 업로드 완료", description: "판매/출고 데이터가 업로드되었습니다." });
      window.location.reload();
    } catch (err) {
      toast({ title: "엑셀 업로드 실패", description: "엑셀 파일을 업로드할 수 없습니다." });
    }
  }

  // 품목 추가/변경/삭제 핸들러
  function handleAddItem() {
    setItemsList([
      ...itemsList,
      { itemId: '', quantity: 1, purchasePrice: 0, salePrice: 0, taxRate: 10 }
    ]);
  }
  function handleItemChange(idx: number, field: string, value: any) {
    const newList = [...itemsList];
    if (field === 'itemId') {
      const selected = availableItems.find((i: any) => i.itemId.toString() === value);
      newList[idx].itemId = value;
      newList[idx].purchasePrice = selected?.unitPrice || 0;
      newList[idx].salePrice = selected?.unitPrice || 0;
      newList[idx].taxRate = 10;
    } else {
      newList[idx][field] = value;
    }
    setItemsList(newList);
  }
  function handleItemDelete(idx: number) {
    setItemsList(itemsList.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 유효성 검사
    if (!partnerId || itemsList.length === 0 || itemsList.some(item => !item.itemId)) {
      toast({ title: "필수 정보를 입력하세요." });
      return;
    }
    if (anyStockExceeded) {
      toast({ title: "재고를 초과한 품목이 있습니다." });
      return;
    }
    // 데이터 변환
    const items = itemsList.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.salePrice,
      amount: item.quantity * item.salePrice,
      taxAmount: Math.round(item.quantity * item.salePrice * (item.taxRate / 100)),
      taxRate: item.taxRate,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    const taxAmount = items.reduce((sum, i) => sum + i.taxAmount, 0);

    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sale",
        partnerId,
        date,
        status,
        notes,
        totalAmount,
        taxAmount,
        created_by: user?.id,
        items,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 400 && err.message && err.message.includes('재고 부족')) {
            toast({ title: "재고 부족", description: err.message });
            return;
          }
          throw new Error("등록 실패");
        }
        toast({ title: "등록 완료" });
        setIsDialogOpen(false);
        window.location.reload();
      })
      .catch(() => toast({ title: "등록 실패" }));
  }

  // 상세/수정/취소 핸들러 추가
  async function handleViewDetail(sale: any) {
    setSelectedSale(sale);
    setIsDetailOpen(true);
    // 품목 목록 fetch
    try {
      const res = await fetch(`/api/transactions/${sale.id}/items`);
      if (res.ok) {
        const items = await res.json();
        setSelectedItems(items);
      } else {
        setSelectedItems([]);
      }
    } catch {
      setSelectedItems([]);
    }
  }

  // 수정 모달 저장 핸들러
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSale) return;
    if (!partnerId || itemsList.length === 0 || itemsList.some(item => !item.itemId)) {
      toast({ title: "필수 정보를 입력하세요." });
      return;
    }
    if (anyStockExceeded) {
      toast({ title: "재고를 초과한 품목이 있습니다." });
      return;
    }
    const items = itemsList.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.salePrice,
      amount: item.quantity * item.salePrice,
      taxAmount: Math.round(item.quantity * item.salePrice * (item.taxRate / 100)),
      taxRate: item.taxRate,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    const taxAmount = items.reduce((sum, i) => sum + i.taxAmount, 0);
    fetch(`/api/transactions/${selectedSale.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sale",
        partnerId,
        date,
        status,
        notes,
        totalAmount,
        taxAmount,
        items,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 400 && err.message && err.message.includes('재고 부족')) {
            toast({ title: "재고 부족", description: err.message });
            return;
          }
          throw new Error("수정 실패");
        }
        toast({ title: "수정 완료" });
        setIsEditOpen(false);
        window.location.reload();
      })
      .catch(() => toast({ title: "수정 실패" }));
  }

  async function handleDelete(sale: any) {
    if (!window.confirm("정말 취소하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/transactions/${sale.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "취소 완료", description: "판매/출고가 취소되었습니다." });
        window.location.reload();
      } else {
        toast({ title: "취소 실패", description: "취소에 실패했습니다." });
      }
    } catch {
      toast({ title: "취소 오류", description: "취소 중 오류가 발생했습니다." });
    }
  }

  // handleEdit 복원
  async function handleEdit(sale: any) {
    setSelectedSale(sale);
    setIsEditOpen(true);
    setPartnerId(String(sale.partnerId));
    setDate(sale.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setStatus(sale.status || "pending");
    setNotes(sale.notes || "");
    // 품목 목록 fetch
    try {
      const res = await fetch(`/api/transactions/${sale.id}/items`);
      if (res.ok) {
        const itemsData = await res.json();
        setItemsList(
          itemsData.map((item: any) => {
            const selectedItem = availableItems?.find((it: any) => it.itemId.toString() === item.itemId?.toString());
            return {
              ...item,
              itemId: item.itemId?.toString() ?? "",
              itemName: selectedItem?.itemName ?? item.itemName,
              purchasePrice: Number(selectedItem?.unitPrice ?? item.purchasePrice ?? item.unitPrice ?? item.price) || 0,
              salePrice: Number(item.unitPrice ?? item.salePrice ?? selectedItem?.unitPrice ?? 0),
              taxRate: selectedItem?.taxRate ?? item.taxRate ?? 10,
            };
          })
        );
      } else {
        setItemsList([]);
      }
    } catch {
      setItemsList([]);
    }
  }

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
                      <form onSubmit={handleSubmit}>
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
                              <Select value={partnerId} onValueChange={setPartnerId}>
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
                                    <TableHead>구매단가</TableHead>
                                    <TableHead>판매단가</TableHead>
                                    <TableHead>세율(%)</TableHead>
                                    <TableHead>공급가액</TableHead>
                                    <TableHead>세액</TableHead>
                                    <TableHead>관리</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {itemsList.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={8} className="text-center py-4">
                                        {availableItems.length === 0 ? '재고가 있는 품목이 없습니다' : '품목을 추가하세요'}
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    itemsList.map((item, idx) => {
                                      const amount = Number(item.quantity) * Number(item.salePrice);
                                      const tax = Math.round(amount * Number(item.taxRate) / 100);
                                      const stock = inventory?.find((inv: any) => String(inv.itemId) === String(item.itemId))?.quantity ?? 0;
                                      const exceeded = Number(item.quantity) > stock;
                                      return (
                                        <TableRow key={idx}>
                                          <TableCell>
                                            <Select
                                              value={item.itemId}
                                              onValueChange={value => handleItemChange(idx, 'itemId', value)}
                                            >
                                              <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
                                              <SelectContent>
                                                {availableItems.map((i: any) => (
                                                  <SelectItem key={i.itemId} value={i.itemId.toString()}>
                                                    {i.itemName} (재고: {i.quantity})
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </TableCell>
                                          <TableCell>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                              <Input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                                style={exceeded ? { borderColor: 'red' } : {}}
                                              />
                                              <span style={{ fontSize: 12, color: exceeded ? 'red' : '#888' }}>
                                                재고: {stock}
                                              </span>
                                            </div>
                                            {exceeded && (
                                              <div style={{ color: 'red', fontSize: 12 }}>재고를 초과할 수 없습니다.</div>
                                            )}
                                          </TableCell>
                                          <TableCell className="font-mono">
                                            {Number(item.purchasePrice).toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            <Input
                                              type="number"
                                              min={0}
                                              value={item.salePrice}
                                              onChange={e => handleItemChange(idx, 'salePrice', Number(e.target.value))}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Input
                                              type="number"
                                              min={0}
                                              value={item.taxRate}
                                              onChange={e => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                                            />
                                          </TableCell>
                                          <TableCell className="font-mono">
                                            {amount.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="font-mono">
                                            {tax.toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleItemDelete(idx)}>
                                              <Trash className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem} disabled={availableItems.length === 0}>
                              <Plus className="h-4 w-4 mr-2" />
                              품목 추가
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="notes">메모</Label>
                              <Textarea id="notes" placeholder="메모" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="status">상태</Label>
                              <Select defaultValue="pending">
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
                          <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>취소</Button>
                          <Button type="submit" disabled={anyStockExceeded}>저장</Button>
                        </DialogFooter>
                      </form>
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
              
              {/* 엑셀 다운로드/업로드 아이콘 버튼 */}
              {canExport && (
                <div className="flex gap-2 items-center">
                  <Button type="button" variant="outline" size="icon" onClick={handleExcelDownload}>
                    <Download className="h-5 w-5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-5 w-5" />
                  </Button>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleExcelUpload}
                  />
                </div>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-5 h-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(sale)}>
                                  <Eye className="w-4 h-4 mr-2" /> 상세보기
                                </DropdownMenuItem>
                                {canWrite && sale.status !== "completed" && sale.status !== "canceled" && (
                                  <DropdownMenuItem onClick={() => handleEdit(sale)}>
                                    <Pencil className="w-4 h-4 mr-2" /> 수정
                                  </DropdownMenuItem>
                                )}
                                {canDelete && sale.status !== "completed" && (
                                  <DropdownMenuItem onClick={() => handleDelete(sale)} className="text-destructive">
                                    <Trash className="w-4 h-4 mr-2" /> 취소
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* 상세 모달 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>판매/출고 상세</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div>
              <div>판매번호: {selectedSale.code}</div>
              <div>거래처: {selectedSale.partnerName}</div>
              <div>출고일자: {selectedSale.date}</div>
              <div>상태: {getStatusText(selectedSale.status)}</div>
              <div>합계: {selectedSale.totalAmount?.toLocaleString()}원</div>
              <div>세액: {selectedSale.taxAmount?.toLocaleString()}원</div>
              <div>메모: {selectedSale.notes ? selectedSale.notes : "없음"}</div>
              {selectedItems.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>품목 목록</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>품목명</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>구매단가</TableHead>
                        <TableHead>판매단가</TableHead>
                        <TableHead>공급가액</TableHead>
                        <TableHead>세액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.itemName || item.name || item.itemId}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.purchasePrice?.toLocaleString() || item.unitPrice?.toLocaleString()}</TableCell>
                          <TableCell>{item.salePrice?.toLocaleString() || item.unitPrice?.toLocaleString()}</TableCell>
                          <TableCell>{item.amount?.toLocaleString()}</TableCell>
                          <TableCell>{item.taxAmount?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 모달 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>판매/출고 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-edit">출고일자</Label>
                  <Input id="date-edit" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-edit">거래처</Label>
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger id="partner-edit">
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
                        <TableHead>구매단가</TableHead>
                        <TableHead>판매단가</TableHead>
                        <TableHead>세율(%)</TableHead>
                        <TableHead>공급가액</TableHead>
                        <TableHead>세액</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            품목을 추가하세요
                          </TableCell>
                        </TableRow>
                      ) :
                        itemsList.map((item, idx) => {
                          const amount = Number(item.quantity) * Number(item.salePrice);
                          const tax = Math.round(amount * Number(item.taxRate) / 100);
                          const stock = inventory?.find((inv: any) => String(inv.itemId) === String(item.itemId))?.quantity ?? 0;
                          const exceeded = Number(item.quantity) > stock;
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <Select
                                  value={item.itemId}
                                  onValueChange={value => handleItemChange(idx, 'itemId', value)}
                                >
                                  <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
                                  <SelectContent>
                                    {availableItems.map((i: any) => (
                                      <SelectItem key={i.itemId} value={i.itemId.toString()}>
                                        {i.itemName} (재고: {i.quantity})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                    style={exceeded ? { borderColor: 'red' } : {}}
                                  />
                                  <span style={{ fontSize: 12, color: exceeded ? 'red' : '#888' }}>
                                    재고: {stock}
                                  </span>
                                </div>
                                {exceeded && (
                                  <div style={{ color: 'red', fontSize: 12 }}>재고를 초과할 수 없습니다.</div>
                                )}
                              </TableCell>
                              <TableCell className="font-mono">
                                {Number(item.purchasePrice).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.salePrice}
                                  onChange={e => handleItemChange(idx, 'salePrice', Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.taxRate}
                                  onChange={e => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell className="font-mono">
                                {amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-mono">
                                {tax.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleItemDelete(idx)}>
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      }
                    </TableBody>
                  </Table>
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem} disabled={availableItems.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  품목 추가
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notes-edit">메모</Label>
                  <Textarea id="notes-edit" placeholder="메모" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-edit">상태</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status-edit">
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
              <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>취소</Button>
              <Button type="submit" disabled={anyStockExceeded}>저장</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
