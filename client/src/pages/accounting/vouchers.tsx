import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePermission, useAuth } from "@/hooks/use-auth";
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
import { Loader2, Plus, File, Search, Download, MoreHorizontal, Minus, Trash, Pencil, Eye, Trash2, Upload, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

// 템플릿 타입 정의
type TemplateType = {
  id: string;
  title: string;
  type: string;
  amount: number;
  items: { accountId: string; debit: number; credit: number; description: string }[];
  description: string;
};

export default function VouchersPage() {
  // 권한 확인
  const canWrite = usePermission("vouchers", "write");
  const canDelete = usePermission("vouchers", "delete");
  const canExport = usePermission("vouchers", "export");
  const { user } = useAuth();
  
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
    queryKey: ["/api/accounting/vouchers", dateRange, selectedType, selectedStatus],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || "";
      const to = dateRange?.to?.toISOString() || "";
      
      let url = `/api/accounting/vouchers?`;
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
    queryKey: ["/api/accounting/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounting/accounts");
      
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
        return "bg-primary bg-opacity-10 text-white";
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

  // 전표 등록 모달 내부
  const [accountRows, setAccountRows] = useState<any[]>([]);
  const [voucherDate, setVoucherDate] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [voucherDescription, setVoucherDescription] = useState("");
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voucherStatus, setVoucherStatus] = useState("pending");

  function handleAddAccountRow() {
    setAccountRows([...accountRows, { accountId: "", debit: 0, credit: 0, description: "" }]);
  }

  async function handleVoucherSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!voucherDate || !voucherType || !voucherAmount || accountRows.length === 0) {
      alert("필수 정보를 입력하세요.");
      return;
    }
    // 차변/대변 합계 계산
    const debitTotal = accountRows.reduce((sum, row) => sum + Number(row.debit), 0);
    const creditTotal = accountRows.reduce((sum, row) => sum + Number(row.credit), 0);
    if (debitTotal !== creditTotal) {
      alert("차변과 대변의 합계가 일치해야 합니다.");
      return;
    }
    if (debitTotal !== Number(voucherAmount)) {
      alert("전표 금액과 차변 합계가 일치해야 합니다.");
      return;
    }
    // 계정행 -> 전표 항목 변환 (차변은 양수, 대변은 음수)
    const items = accountRows.map(row => ({
      accountId: Number(row.accountId),
      amount: Number(row.debit) > 0 ? Number(row.debit) : -Number(row.credit),
      description: row.description || ""
    }));
    setSaving(true);
    const payload = {
      voucher: {
        date: voucherDate,
        type: voucherType,
        amount: Number(voucherAmount),
        status: voucherStatus,
        description: voucherDescription,
        createdBy: user?.id
      },
      items
    };
    const res = await fetch("/api/accounting/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    if (res.ok) {
      setIsVoucherDialogOpen(false);
      setAccountRows([]);
      setVoucherDate("");
      setVoucherType("");
      setVoucherAmount(0);
      setVoucherDescription("");
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "저장 실패");
    }
  }

  // 1. 상태 추가
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [editRows, setEditRows] = useState<any[]>([]);
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // 2. 수정 버튼 클릭 핸들러
  function handleEditClick(voucher: any) {
    setSelectedVoucher(voucher);
    setEditRows(
      voucher.items
        ? voucher.items.map((item: any) => ({
            ...item,
            debit: item.amount > 0 ? item.amount : "",
            credit: item.amount < 0 ? -item.amount : "",
          }))
        : []
    );
    setEditDate(voucher.date?.slice(0, 10) || "");
    setEditType(voucher.type || "");
    setEditAmount(voucher.amount || 0);
    setEditDescription(voucher.items?.[0]?.description || "");
    setEditStatus(voucher.status || "pending");
    setIsEditDialogOpen(true);
  }

  // 3. 수정 저장 핸들러
  async function handleEditVoucherSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVoucher) return;
    // 차변/대변 합계 계산
    const debitTotal = editRows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
    const creditTotal = editRows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
    if (debitTotal !== creditTotal) {
      alert("차변과 대변의 합계가 일치해야 합니다.");
      return;
    }
    if (debitTotal !== Number(editAmount)) {
      alert("전표 금액과 차변 합계가 일치해야 합니다.");
      return;
    }
    // 계정행 -> 전표 항목 변환 (차변은 양수, 대변은 음수)
    const items = editRows.map(row => ({
      id: row.id,
      accountId: Number(row.accountId),
      amount: Number(row.amount),
      description: row.description || ""
    }));
    const payload = {
      date: editDate,
      type: editType,
      amount: Number(editAmount),
      status: editStatus,
      items,
    };
    const res = await fetch(`/api/accounting/vouchers/${selectedVoucher.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setIsEditDialogOpen(false);
      setSelectedVoucher(null);
      setEditRows([]);
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "수정 실패");
    }
  }

  // 상세 다이얼로그 상태 추가
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailVoucher, setDetailVoucher] = useState<any>(null);

  // 상세보기 핸들러
  function handleViewDetail(voucher: any) {
    setDetailVoucher(voucher);
    setIsDetailDialogOpen(true);
  }

  // 삭제 핸들러
  async function handleDeleteVoucher(voucher: any) {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/accounting/vouchers/${voucher.id}`, { method: "DELETE" });
    if (res.ok) {
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "삭제 실패");
    }
  }

  // 엑셀 다운로드 함수
  function handleExcelDownload() {
    if (!vouchers || vouchers.length === 0) return;
    const data = vouchers.map((voucher: any) => ({
      전표번호: voucher.code,
      거래일자: voucher.date,
      유형: getTypeText(voucher.type),
      상태: getStatusText(voucher.status),
      금액: voucher.amount,
      계정정보: (voucher.items || []).map((item: any) => `${item.accountName} (${item.amount > 0 ? '' : '-'}${Math.abs(item.amount)})`).join(", "),
      적요: (voucher.items || []).map((item: any) => item.description).join(", ")
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vouchers");
    XLSX.writeFile(wb, "vouchers.xlsx");
  }

  // 템플릿 상태 및 로컬스토리지 연동
  const [templates, setTemplates] = useState<TemplateType[]>(() => {
    const saved = localStorage.getItem('voucherTemplates');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('voucherTemplates', JSON.stringify(templates));
  }, [templates]);

  // 템플릿 추가/삭제/적용
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Omit<TemplateType, 'id'>>({
    title: '',
    type: '',
    amount: 0,
    items: [],
    description: ''
  });
  function handleAddTemplate() {
    setTemplates(prev => [...prev, { ...templateForm, id: crypto.randomUUID() }]);
    setIsTemplateDialogOpen(false);
    setTemplateForm({ title: '', type: '', amount: 0, items: [], description: '' });
  }
  function handleDeleteTemplate(id: string) {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }
  function handleApplyTemplate(template: TemplateType) {
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setVoucherType(template.type);
    setVoucherAmount(template.amount);
    setVoucherStatus('pending');
    setAccountRows(template.items);
    setVoucherDescription(template.description);
    setIsVoucherDialogOpen(true);
  }

  // 템플릿 Export/Import
  function handleExportTemplates() {
    const dataStr = JSON.stringify(templates, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voucher-templates.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function handleImportTemplates(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setTemplates(imported.map(t => ({ ...t, id: t.id || crypto.randomUUID() })));
        } else {
          alert("잘못된 템플릿 파일입니다.");
        }
      } catch {
        alert("템플릿 파일을 읽을 수 없습니다.");
      }
    };
    reader.readAsText(file);
    // 파일 input 초기화
    e.target.value = '';
  }
  const importInputRef = useRef<HTMLInputElement>(null);

  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);

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
                <Dialog
                  open={isVoucherDialogOpen}
                  onOpenChange={open => {
                    setIsVoucherDialogOpen(open);
                    if (!open) setAccountRows([]);
                  }}
                >
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
                    <form onSubmit={handleVoucherSubmit}>
                      <div className="grid gap-6 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsTemplateSelectOpen(v => !v)}>
                            <File className="h-4 w-4 mr-1" /> 템플릿에서 불러오기 <ChevronDown className="h-4 w-4 ml-1" />
                          </Button>
                          {isTemplateSelectOpen && templates.length > 0 && (
                            <div className="absolute z-50 mt-2 bg-white border rounded shadow p-2 w-64">
                              <div className="font-semibold mb-1 text-sm">템플릿 선택</div>
                              <ul>
                                {templates.map(tpl => (
                                  <li key={tpl.id}>
                                    <Button type="button" variant="ghost" className="w-full justify-start text-left px-2 py-1 text-sm" onClick={() => {
                                      setVoucherDate(new Date().toISOString().slice(0, 10));
                                      setVoucherType(tpl.type);
                                      setVoucherAmount(tpl.amount);
                                      setVoucherStatus('pending');
                                      setAccountRows(tpl.items);
                                      setVoucherDescription(tpl.description);
                                      setIsTemplateSelectOpen(false);
                                    }}>
                                      {tpl.title}
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">거래일자</Label>
                            <Input id="date" type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="type">전표유형</Label>
                            <Select value={voucherType} onValueChange={setVoucherType} required>
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
                            <Input id="amount" type="number" placeholder="0" value={voucherAmount} onChange={e => setVoucherAmount(Number(e.target.value))} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="status">상태</Label>
                            <Select value={voucherStatus} onValueChange={setVoucherStatus} required>
                              <SelectTrigger id="status">
                                <SelectValue placeholder="상태 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">대기</SelectItem>
                                <SelectItem value="approved">확정</SelectItem>
                                <SelectItem value="canceled">취소</SelectItem>
                              </SelectContent>
                            </Select>
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
                                {accountRows.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">
                                      계정 정보를 추가하세요
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  accountRows.map((row, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>
                                        <Select
                                          value={row.accountId}
                                          onValueChange={val => {
                                            const newRows = [...accountRows];
                                            newRows[idx].accountId = val;
                                            setAccountRows(newRows);
                                          }}
                                        >
                                          <SelectTrigger><SelectValue placeholder="계정 선택" /></SelectTrigger>
                                          <SelectContent>
                                            {(accounts ?? []).map((acc: any) => (
                                              <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" value={row.debit} onChange={e => {
                                          const newRows = [...accountRows];
                                          newRows[idx].debit = Number(e.target.value);
                                          setAccountRows(newRows);
                                        }} />
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" value={row.credit} onChange={e => {
                                          const newRows = [...accountRows];
                                          newRows[idx].credit = Number(e.target.value);
                                          setAccountRows(newRows);
                                        }} />
                                      </TableCell>
                                      <TableCell>
                                        <Input value={row.description} onChange={e => {
                                          const newRows = [...accountRows];
                                          newRows[idx].description = e.target.value;
                                          setAccountRows(newRows);
                                        }} />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setAccountRows(accountRows.filter((_, i) => i !== idx));
                                          }}
                                          disabled={accountRows.length === 1}
                                          aria-label="계정행 삭제"
                                        >
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          <Button variant="outline" size="sm" className="mt-2" onClick={handleAddAccountRow} type="button">
                            <Plus className="h-4 w-4 mr-2" />
                            계정 추가
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">적요</Label>
                          <Textarea id="description" placeholder="적요를 입력하세요" value={voucherDescription} onChange={e => setVoucherDescription(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsVoucherDialogOpen(false)}>취소</Button>
                        <Button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
                      </DialogFooter>
                    </form>
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
                  <Button variant="ghost" size="icon" onClick={handleExcelDownload} title="엑셀 다운로드">
                    <Download className="h-5 w-5" />
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
                      <TableHead className="w-[150px] min-w-[120px]">계정과목</TableHead>
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
                          <TableCell>
                            {voucher.items?.map((item: any) => (
                              <div key={item.id}>{item.accountName} ({item.amount.toLocaleString()}원)</div>
                            ))}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {voucher.items?.map((item: any) => (
                              <div key={item.id}>{item.description}</div>
                            ))}
                          </TableCell>
                          <TableCell className="font-mono">
                            {voucher.items?.map((item: any) => (
                              <div key={item.id}>{new Intl.NumberFormat('ko-KR').format(item.amount)}원</div>
                            ))}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(voucher.status)}`}>
                              {getStatusText(voucher.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetail(voucher)}>
                                  <Eye className="h-4 w-4 mr-2" /> 상세보기
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(voucher)}>
                                  <Pencil className="h-4 w-4 mr-2" /> 수정
                                </DropdownMenuItem>
                                {voucher.status !== "approved" && (
                                  <DropdownMenuItem onClick={() => handleDeleteVoucher(voucher)} className="text-destructive">
                                    <Trash className="h-4 w-4 mr-2" /> 삭제
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">전표 템플릿</h3>
                    <p className="text-muted-foreground text-sm">자주 사용하는 전표를 템플릿으로 저장하여 효율적으로 관리하세요.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={handleExportTemplates} title="템플릿 내보내기">
                      <Download className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => importInputRef.current?.click()} title="템플릿 가져오기">
                      <Upload className="h-5 w-5" />
                    </Button>
                    <input type="file" accept="application/json" ref={importInputRef} style={{ display: 'none' }} onChange={handleImportTemplates} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tpl) => (
                    <Card key={tpl.id} className="hover:bg-gray-50 cursor-pointer transition-colors relative group" onClick={() => handleApplyTemplate(tpl)}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">{tpl.title}</CardTitle>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} title="삭제">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          <p>{getTypeText(tpl.type)} 전표</p>
                          <p>계정: {(tpl.items || []).map(i => {
                            const acc = (accounts || []).find((a: any) => String(a.id) === String(i.accountId));
                            return acc ? acc.name : i.accountId;
                          }).join(', ')}</p>
                          <p>금액: {Number(tpl.amount).toLocaleString()}원</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="border-dashed flex items-center justify-center h-32 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Button variant="ghost" onClick={() => setIsTemplateDialogOpen(true)}>
                      <Plus className="h-5 w-5 mr-2" />
                      템플릿 추가
                    </Button>
                  </Card>
                </div>
                {/* 템플릿 추가 다이얼로그 */}
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>템플릿 추가</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={e => { e.preventDefault(); handleAddTemplate(); }}>
                      <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tpl-title">제목</Label>
                            <Input id="tpl-title" value={templateForm.title} onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))} required />
                          </div>
                          <div>
                            <Label htmlFor="tpl-type">전표유형</Label>
                            <Select value={templateForm.type} onValueChange={val => setTemplateForm(f => ({ ...f, type: val }))} required>
                              <SelectTrigger id="tpl-type">
                                <SelectValue placeholder="유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">수입</SelectItem>
                                <SelectItem value="expense">지출</SelectItem>
                                <SelectItem value="transfer">대체</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tpl-amount">금액</Label>
                            <Input id="tpl-amount" type="number" value={templateForm.amount} onChange={e => setTemplateForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
                          </div>
                          <div>
                            <Label htmlFor="tpl-description">적요</Label>
                            <Input id="tpl-description" value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <Label>계정 정보</Label>
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
                              {templateForm.items.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">계정 정보를 추가하세요</TableCell>
                                </TableRow>
                              ) : (
                                templateForm.items.map((row, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Select
                                        value={row.accountId}
                                        onValueChange={val => {
                                          const newRows = [...templateForm.items];
                                          newRows[idx].accountId = val;
                                          setTemplateForm(f => ({ ...f, items: newRows }));
                                        }}
                                      >
                                        <SelectTrigger><SelectValue placeholder="계정 선택" /></SelectTrigger>
                                        <SelectContent>
                                          {(accounts ?? []).map((acc: any) => (
                                            <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" value={row.debit} onChange={e => {
                                        const newRows = [...templateForm.items];
                                        newRows[idx].debit = Number(e.target.value);
                                        setTemplateForm(f => ({ ...f, items: newRows }));
                                      }} />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" value={row.credit} onChange={e => {
                                        const newRows = [...templateForm.items];
                                        newRows[idx].credit = Number(e.target.value);
                                        setTemplateForm(f => ({ ...f, items: newRows }));
                                      }} />
                                    </TableCell>
                                    <TableCell>
                                      <Input value={row.description} onChange={e => {
                                        const newRows = [...templateForm.items];
                                        newRows[idx].description = e.target.value;
                                        setTemplateForm(f => ({ ...f, items: newRows }));
                                      }} />
                                    </TableCell>
                                    <TableCell>
                                      <Button variant="ghost" size="icon" onClick={() => {
                                        setTemplateForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
                                      }} aria-label="계정행 삭제">
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                          <Button variant="outline" size="sm" className="mt-2" type="button" onClick={() => setTemplateForm(f => ({ ...f, items: [...f.items, { accountId: '', debit: 0, credit: 0, description: '' }] }))}>
                            <Plus className="h-4 w-4 mr-2" /> 계정 추가
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsTemplateDialogOpen(false)}>취소</Button>
                        <Button type="submit">저장</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        <Footer />
      </div>

      {/* 수정 다이얼로그 추가 (렌더링 하단에) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>전표 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditVoucherSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-date">거래일자</Label>
                  <Input id="edit-date" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="edit-type">유형</Label>
                  <Select value={editType} onValueChange={setEditType} required>
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">수입</SelectItem>
                      <SelectItem value="expense">지출</SelectItem>
                      <SelectItem value="transfer">대체</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">상태</Label>
                  <Select value={editStatus} onValueChange={setEditStatus} required>
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="approved">확정</SelectItem>
                      <SelectItem value="canceled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-amount">금액</Label>
                  <Input id="edit-amount" type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} required />
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            계정 정보를 추가하세요
                          </TableCell>
                        </TableRow>
                      ) : (
                        editRows.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select
                                value={String(row.accountId)}
                                onValueChange={val => {
                                  const newRows = [...editRows];
                                  newRows[idx].accountId = val;
                                  setEditRows(newRows);
                                }}
                              >
                                <SelectTrigger className="min-w-[120px] w-[150px] max-w-[200px]">
                                  <SelectValue placeholder="계정 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(accounts ?? []).map((acc: any) => (
                                    <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={row.debit}
                                onChange={e => {
                                  const newRows = [...editRows];
                                  newRows[idx].debit = e.target.value;
                                  newRows[idx].credit = "";
                                  newRows[idx].amount = Number(e.target.value) || 0;
                                  setEditRows(newRows);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={row.credit}
                                onChange={e => {
                                  const newRows = [...editRows];
                                  newRows[idx].credit = e.target.value;
                                  newRows[idx].debit = "";
                                  newRows[idx].amount = -Number(e.target.value) || 0;
                                  setEditRows(newRows);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.description || ""}
                                onChange={e => {
                                  const newRows = [...editRows];
                                  newRows[idx].description = e.target.value;
                                  setEditRows(newRows);
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">적요</Label>
                <Textarea id="edit-description" placeholder="적요를 입력하세요" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>취소</Button>
              <Button type="submit">저장</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 상세 다이얼로그 추가 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>전표 상세</DialogTitle>
          </DialogHeader>
          {detailVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>전표번호</Label>
                  <div>{detailVoucher.code}</div>
                </div>
                <div>
                  <Label>거래일자</Label>
                  <div>{new Date(detailVoucher.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label>유형</Label>
                  <div>{getTypeText(detailVoucher.type)}</div>
                </div>
                <div>
                  <Label>상태</Label>
                  <div>{getStatusText(detailVoucher.status)}</div>
                </div>
                <div className="col-span-2">
                  <Label>적요</Label>
                  <div>{detailVoucher.items?.map((item: any) => item.description).join(", ")}</div>
                </div>
              </div>
              <div>
                <Label>계정 정보</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>계정과목</TableHead>
                      <TableHead>차변</TableHead>
                      <TableHead>대변</TableHead>
                      <TableHead>적요</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailVoucher.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.accountName}</TableCell>
                        <TableCell>{item.amount > 0 ? item.amount.toLocaleString() : ""}</TableCell>
                        <TableCell>{item.amount < 0 ? (-item.amount).toLocaleString() : ""}</TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}