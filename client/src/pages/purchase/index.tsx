import { useState, useMemo, useRef } from "react";
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
  CardFooter,
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
import { Loader2, Plus, File, Search, Download, MoreHorizontal, Barcode, Eye, Pencil, Trash, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import * as XLSX from "xlsx";

export default function PurchasePage() {
  // 권한 확인
  const canWrite = usePermission("purchases", "write");
  const canDelete = usePermission("purchases", "delete");
  const canExport = usePermission("purchases", "export");
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState("purchases");
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
  
  // 품목 목록 상태 (모달용)
  const [itemsList, setItemsList] = useState<any[]>([]);
  // 품목 검색 상태 (모달용)
  const [itemSearch, setItemSearch] = useState("");
  // 거래처 선택 상태
  const [partnerId, setPartnerId] = useState<string>("");
  // 입고일자 상태
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  // 상태 선택 상태
  const [status, setStatus] = useState<string>("pending");
  // 메모 상태
  const [notes, setNotes] = useState<string>("");
  
  // 구매 데이터 조회
  const { data: purchases, isLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ["/api/transactions", "purchase", dateRange, selectedStatus],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || "";
      const to = dateRange?.to?.toISOString() || "";
      
      let url = `/api/transactions?type=purchase`;
      if (dateRange?.from) url += `&from=${from}`;
      if (dateRange?.to) url += `&to=${to}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("구매 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 거래처 목록 조회
  const { data: partners } = useQuery({
    queryKey: ["/api/partners", "supplier"],
    queryFn: async () => {
      const response = await fetch("/api/partners?type=supplier");
      
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
  
  // 거래처 id → 이름 매핑
  const partnerMap = useMemo(() => {
    const map: Record<string, string> = {};
    (partners || []).forEach((p: any) => {
      map[String(p.id)] = p.name;
    });
    return map;
  }, [partners]);
  
  // 검색 기능
  const filteredPurchases = purchases?.filter((purchase: any) => {
    const query = (searchQuery ?? "").toLowerCase();
    return (
      (purchase.code ?? "").toLowerCase().includes(query) ||
      (purchase.partnerName ?? "").toLowerCase().includes(query) ||
      ((purchase.notes ?? "").toLowerCase().includes(query))
    );
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredPurchases.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPurchases = filteredPurchases.slice(startIndex, startIndex + pageSize);
  
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
      case "partial": return "부분입고";
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
      case "partial":
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

  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { user } = useAuth();

  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // 엑셀 다운로드
  async function handleExcelDownload() {
    try {
      const res = await fetch("/api/transactions/export");
      if (!res.ok) throw new Error("엑셀 다운로드 실패");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "purchases.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "엑셀 다운로드 실패", description: "엑셀 파일을 다운로드할 수 없습니다." });
    }
  }

  // 엑셀 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("엑셀 업로드 실패");
      toast({ title: "엑셀 업로드 완료", description: "구매/입고 데이터가 업로드되었습니다." });
      await refetchPurchases();
    } catch (err) {
      toast({ title: "엑셀 업로드 실패", description: "엑셀 파일을 업로드할 수 없습니다." });
    }
  }

  async function handlePurchaseSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!partnerId) {
      toast({ title: "거래처를 선택하세요." });
      return;
    }
    if (!date) {
      toast({ title: "입고일자를 입력하세요." });
      return;
    }
    if (!status) {
      toast({ title: "상태를 선택하세요." });
      return;
    }

    // 입력값 수집
    const notes = (document.getElementById('notes') as HTMLInputElement)?.value;

    // 총액, 세액 계산
    const items = itemsList.map(item => {
      const amount = Number(item.quantity) * Number(item.price);
      const tax = Math.round(amount * Number(item.taxRate) / 100);
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        tax_rate: item.taxRate,    
        unitPrice:  Number(item.price),
        amount: Number(amount),
        taxAmount: Number(tax),
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

    console.log("계산값" , totalAmount, taxAmount);

    const payload = {
      type: "purchase",
      partnerId,
      date,
      status,
      notes,
      totalAmount: Number(totalAmount),
      taxAmount: Number(taxAmount),
      created_by: user?.id,
      items,
    };

    console.log("payload" , payload);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: '저장 완료', description: '구매/입고 정보가 저장되었습니다.' });
        setIsDialogOpen(false);
        await refetchPurchases();
      } else {
        let errorMsg = '저장에 실패했습니다.';
        try {
          const error = await res.json();
          if (error && error.message) errorMsg = error.message;
        } catch {}
        toast({ title: '저장 실패', description: errorMsg });
      }
    } catch (err) {
      toast({ title: '저장 오류', description: '저장 중 오류가 발생했습니다.' });
    }
  }

  function handleAddItem() {
    setItemsList([
      ...itemsList,
      { itemId: '', quantity: 1, price: 0, taxRate: 10 }
    ]);
  }

  async function handleDelete(purchase: any) {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/transactions/${purchase.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "삭제 완료", description: "거래가 삭제되었습니다." });
        // 목록 새로고침
        await refetchPurchases();
      } else {
        toast({ title: "삭제 실패", description: "삭제에 실패했습니다." });
      }
    } catch {
      toast({ title: "삭제 오류", description: "삭제 중 오류가 발생했습니다." });
    }
  }

  async function handleViewDetail(purchase: any) {
    setSelectedPurchase(purchase);
    setIsDetailOpen(true);
    // 품목 목록 fetch
    try {
      const res = await fetch(`/api/transactions/${purchase.id}/items`);
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

  async function handleEdit(purchase: any) {
    setSelectedPurchase(purchase);
    setIsEditOpen(true);
    setPartnerId(String(purchase.partnerId));
    setDate(purchase.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setStatus(purchase.status || "pending");
    setNotes(purchase.notes || "");
    // 품목 목록 fetch
    try {
      const res = await fetch(`/api/transactions/${purchase.id}/items`);
      if (res.ok) {
        const itemsData = await res.json();
        setItemsList(
          itemsData.map((item: any) => {
            const selectedItem = items?.find((it: any) => it.id.toString() === item.itemId?.toString());
            return {
              ...item,
              itemId: item.itemId?.toString() ?? "",
              name: selectedItem?.name ?? item.name,
              price: Number(selectedItem?.price ?? selectedItem?.unitPrice ?? selectedItem?.cost ?? item.price) || 0,
              taxRate: selectedItem?.taxRate ?? item.taxRate ?? 10,
              code: selectedItem?.code ?? item.code,
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

  // 수정 저장 핸들러(임시, 실제 저장 로직 필요)
  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedPurchase) return;

    // 총액, 세액 계산
    const items = itemsList.map(item => {
      const amount = Number(item.quantity) * Number(item.price);
      const tax = Math.round(amount * Number(item.taxRate) / 100);
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        tax_rate: item.taxRate,
        unitPrice: Number(item.price),
        amount: Number(amount),
        taxAmount: Number(tax),
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

    const payload = {
      type: "purchase",
      partnerId,
      date,
      status,
      notes,
      totalAmount: Number(totalAmount),
      taxAmount: Number(taxAmount),
      items,
    };

    try {
      const res = await fetch(`/api/transactions/${selectedPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ title: '수정 완료', description: '구매/입고 정보가 수정되었습니다.' });
        setIsEditOpen(false);
        await refetchPurchases();
      } else {
        let errorMsg = '수정에 실패했습니다.';
        try {
          const error = await res.json();
          if (error && error.message) errorMsg = error.message;
        } catch {}
        toast({ title: '수정 실패', description: errorMsg });
      }
    } catch (err) {
      toast({ title: '수정 오류', description: '수정 중 오류가 발생했습니다.' });
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
            <h2 className="text-2xl font-bold">구매/입고 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="구매번호, 거래처, 메모"
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
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (open) {
                      setPartnerId("");
                      setDate(new Date().toISOString().slice(0, 10));
                      setStatus("pending");
                      setNotes("");
                      setItemsList([]);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        구매 등록
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>구매/입고 등록</DialogTitle>
                        <DialogDescription>
                          새로운 구매/입고 정보를 입력하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePurchaseSubmit}>
                        <div className="grid gap-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="date">입고일자</Label>
                              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="partner">거래처</Label>
                              <Select value={partnerId} onValueChange={setPartnerId}>
                                <SelectTrigger id="partner">
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
                                    <TableHead>세율(%)</TableHead>
                                    <TableHead>세액</TableHead>
                                    <TableHead>관리</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {itemsList.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={7} className="text-center py-4">
                                        품목을 추가하세요
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    itemsList.map((item, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          <Select
                                            value={item.itemId}
                                            onValueChange={value => {
                                              const selectedItem = items?.find((it: any) => it.id.toString() === value);
                                              const newList = [...itemsList];
                                              newList[idx].itemId = value;
                                              if (selectedItem) {
                                                newList[idx].name = selectedItem.name;
                                                newList[idx].price = Number(selectedItem.price ?? selectedItem.unitPrice ?? selectedItem.cost) || 0;
                                                newList[idx].taxRate = 10;
                                                newList[idx].code = selectedItem.code;
                                              }
                                              setItemsList(newList);
                                              setItemSearch("");
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="품목 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <div className="px-2 py-2">
                                                <Input
                                                  value={itemSearch}
                                                  onChange={e => setItemSearch(e.target.value)}
                                                  placeholder="품목 검색..."
                                                  autoFocus
                                                />
                                              </div>
                                              {(items || [])
                                                .filter((it: any) =>
                                                  (it.name ?? "").toLowerCase().includes(itemSearch.toLowerCase())
                                                )
                                                .map((it: any) => (
                                                  <SelectItem key={it.id} value={it.id.toString()}>
                                                    {it.name}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            value={item.quantity}
                                            min={1}
                                            onChange={e => {
                                              const newList = [...itemsList];
                                              newList[idx].quantity = Number(e.target.value);
                                              setItemsList(newList);
                                            }}
                                            placeholder="수량"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            value={item.price ?? 0}
                                            min={0}
                                            onChange={e => {
                                              const newList = [...itemsList];
                                              newList[idx].price = Number(e.target.value);
                                              setItemsList(newList);
                                            }}
                                            placeholder="단가"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price))
                                            ? (Number(item.quantity) * Number(item.price)).toLocaleString() + "원"
                                            : "-"}
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            value={item.taxRate ?? 10}
                                            min={0}
                                            max={100}
                                            onChange={e => {
                                              const newList = [...itemsList];
                                              newList[idx].taxRate = Number(e.target.value);
                                              setItemsList(newList);
                                            }}
                                            placeholder="세율(%)"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price)) && Number.isFinite(Number(item.taxRate))
                                            ? Math.round(Number(item.quantity) * Number(item.price) * Number(item.taxRate) / 100).toLocaleString() + "원"
                                            : "-"}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                              const newList = itemsList.filter((_, i) => i !== idx);
                                              setItemsList(newList);
                                            }}
                                          >
                                            삭제
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem} type="button">
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
                              <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger id="status">
                                  <SelectValue placeholder="상태 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">대기</SelectItem>
                                  <SelectItem value="completed">완료</SelectItem>
                                  <SelectItem value="partial">부분입고</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" type="button">취소</Button>
                          <Button type="submit">저장</Button>
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
              <TabsTrigger value="purchases">구매/입고 내역</TabsTrigger>
              <TabsTrigger value="orders">발주 내역</TabsTrigger>
              <TabsTrigger value="requests">요청 내역</TabsTrigger>
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
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="partial">부분입고</SelectItem>
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
            
            <TabsContent value="purchases">
              {/* 구매/입고 내역 목록 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>구매번호</TableHead>
                      <TableHead>거래처</TableHead>
                      <TableHead>품목</TableHead>
                      <TableHead>공급가액</TableHead>
                      <TableHead>세액</TableHead>
                      <TableHead>합계</TableHead>
                      <TableHead>입고일자</TableHead>
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
                    ) : paginatedPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          {searchQuery ? "검색 결과가 없습니다." : "구매/입고 내역이 없습니다."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPurchases.map((purchase: any) => (
                        <TableRow key={purchase.id}>
                          <TableCell>{purchase.code}</TableCell>
                          <TableCell className="font-medium">{partnerMap[String(purchase.partnerId)] || purchase.partnerName || "-"}</TableCell>
                          <TableCell>{purchase.itemSummary || "여러 품목"}</TableCell>
                          <TableCell className="font-mono">{(purchase.totalAmount - (purchase.taxAmount || 0)).toLocaleString()}원</TableCell>
                          <TableCell className="font-mono">{(purchase.taxAmount || 0).toLocaleString()}원</TableCell>
                          <TableCell className="font-mono">
                            {Number.isFinite(Number(purchase.totalAmount))
                              ? Number(purchase.totalAmount).toLocaleString() + "원"
                              : "-"}
                          </TableCell>
                          <TableCell>{new Date(purchase.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(purchase.status)}`}>
                              {getStatusText(purchase.status)}
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
                                <DropdownMenuItem onClick={() => handleViewDetail(purchase)}>
                                  <Eye className="w-4 h-4 mr-2" /> 상세보기
                                </DropdownMenuItem>
                                {canWrite && purchase.status !== "completed" && purchase.status !== "canceled" && (
                                  <DropdownMenuItem onClick={() => handleEdit(purchase)}>
                                    <Pencil className="w-4 h-4 mr-2" /> 수정
                                  </DropdownMenuItem>
                                )}
                                {canDelete && purchase.status !== "completed" && (
                                  <DropdownMenuItem onClick={() => handleDelete(purchase)} className="text-destructive">
                                    <Trash className="w-4 h-4 mr-2" /> 삭제
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
                {filteredPurchases.length > 0 && (
                  <div className="px-6 py-3 flex items-center justify-between border-t">
                    <div className="text-xs text-neutral-300">
                      총 <span className="font-medium">{filteredPurchases.length}</span>건 중 <span className="font-medium">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredPurchases.length)}</span>건 표시
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
            
            <TabsContent value="orders">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium mb-2">발주 내역</h3>
                <p className="text-muted-foreground">
                  발주 관리 기능은 추후 업데이트될 예정입니다.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="requests">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium mb-2">요청 내역</h3>
                <p className="text-muted-foreground">
                  구매 요청 관리 기능은 추후 업데이트될 예정입니다.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <Footer />
      </div>

      {/* 상세보기 모달 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구매/입고 상세</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div>
              <div>구매번호: {selectedPurchase.code}</div>
              <div>거래처: {partnerMap[String(selectedPurchase.partnerId)] || selectedPurchase.partnerName || "-"}</div>
              <div>입고일자: {selectedPurchase.date}</div>
              <div>상태: {getStatusText(selectedPurchase.status)}</div>
              <div>합계: {selectedPurchase.totalAmount?.toLocaleString()}원</div>
              <div>세액: {selectedPurchase.taxAmount?.toLocaleString()}원</div>
              <div>메모: {selectedPurchase.notes}</div>
              {selectedItems.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>품목 목록</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>품목명</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>단가</TableHead>
                        <TableHead>공급가액</TableHead>
                        <TableHead>세액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{item.name || item.itemName || item.itemId}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitPrice?.toLocaleString() || item.price?.toLocaleString()}</TableCell>
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

      {/* 수정 모달 (기존 폼 재활용) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>구매/입고 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-edit">입고일자</Label>
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
                        <TableHead>단가</TableHead>
                        <TableHead>공급가액</TableHead>
                        <TableHead>세율(%)</TableHead>
                        <TableHead>세액</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            품목을 추가하세요
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemsList.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select
                                value={item.itemId}
                                onValueChange={value => {
                                  const selectedItem = items?.find((it: any) => it.id.toString() === value);
                                  const newList = [...itemsList];
                                  newList[idx].itemId = value;
                                  if (selectedItem) {
                                    newList[idx].name = selectedItem.name;
                                    newList[idx].price = Number(selectedItem.price ?? selectedItem.unitPrice ?? selectedItem.cost) || 0;
                                    newList[idx].taxRate = 10;
                                    newList[idx].code = selectedItem.code;
                                  }
                                  setItemsList(newList);
                                  setItemSearch("");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="품목 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <div className="px-2 py-2">
                                    <Input
                                      value={itemSearch}
                                      onChange={e => setItemSearch(e.target.value)}
                                      placeholder="품목 검색..."
                                      autoFocus
                                    />
                                  </div>
                                  {(items || [])
                                    .filter((it: any) =>
                                      (it.name ?? "").toLowerCase().includes(itemSearch.toLowerCase())
                                    )
                                    .map((it: any) => (
                                      <SelectItem key={it.id} value={it.id.toString()}>
                                        {it.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                min={1}
                                onChange={e => {
                                  const newList = [...itemsList];
                                  newList[idx].quantity = Number(e.target.value);
                                  setItemsList(newList);
                                }}
                                placeholder="수량"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.price ?? 0}
                                min={0}
                                onChange={e => {
                                  const newList = [...itemsList];
                                  newList[idx].price = Number(e.target.value);
                                  setItemsList(newList);
                                }}
                                placeholder="단가"
                              />
                            </TableCell>
                            <TableCell>
                              {Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price))
                                ? (Number(item.quantity) * Number(item.price)).toLocaleString() + "원"
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.taxRate ?? 10}
                                min={0}
                                max={100}
                                onChange={e => {
                                  const newList = [...itemsList];
                                  newList[idx].taxRate = Number(e.target.value);
                                  setItemsList(newList);
                                }}
                                placeholder="세율(%)"
                              />
                            </TableCell>
                            <TableCell>
                              {Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price)) && Number.isFinite(Number(item.taxRate))
                                ? Math.round(Number(item.quantity) * Number(item.price) * Number(item.taxRate) / 100).toLocaleString() + "원"
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const newList = itemsList.filter((_, i) => i !== idx);
                                  setItemsList(newList);
                                }}
                              >
                                삭제
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem} type="button">
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
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="partial">부분입고</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>취소</Button>
              <Button type="submit">저장</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
