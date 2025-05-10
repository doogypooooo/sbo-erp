import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, usePermission } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Table,
  TableBody,
  TableCaption,
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
import { Loader2, Plus, Search, Download, Upload, MoreHorizontal, Eye, Pencil } from "lucide-react";
import * as XLSX from "xlsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";

// 거래처 타입 필터
type PartnerTypeFilter = "all" | "customer" | "supplier" | "both";

export default function PartnersPage() {
  // 권한 확인
  const canWrite = usePermission("partners", "write");
  const canDelete = usePermission("partners", "delete");
  
  // 상태 관리
  const [typeFilter, setTypeFilter] = useState<PartnerTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // 거래처 등록 폼 상태
  const [form, setForm] = useState({
    name: "",
    type: "",
    businessNumber: "",
    contactName: "",
    phone: "",
    email: "",
    address: ""
  });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 거래처 수정 폼 상태
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    businessNumber: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    isActive: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  
  // 거래처 데이터 조회
  const { data: partners, isLoading } = useQuery({
    queryKey: ["/api/partners", typeFilter],
    queryFn: async () => {
      const url = `/api/partners${typeFilter !== "all" ? `?type=${typeFilter}` : ""}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("거래처 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 검색 기능
  const filteredPartners = partners?.filter((partner: any) => {
    const query = searchQuery.toLowerCase();
    return (
      partner.name.toLowerCase().includes(query) ||
      (partner.businessNumber && partner.businessNumber.includes(query)) ||
      (partner.contactName && partner.contactName.toLowerCase().includes(query))
    );
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredPartners.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPartners = filteredPartners.slice(startIndex, startIndex + pageSize);
  
  // 거래처 타입 텍스트 변환
  const getTypeText = (type: string) => {
    switch (type) {
      case "customer": return "고객";
      case "supplier": return "공급사";
      case "both": return "고객/공급사";
      default: return type;
    }
  };
  
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

  // 거래처 등록 핸들러
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };
  const handleTypeChange = (value: string) => {
    setForm({ ...form, type: value });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", type: "", businessNumber: "", contactName: "", phone: "", email: "", address: "" });
      // 목록 새로고침
      window.location.reload();
    } else {
      alert("거래처 등록에 실패했습니다.");
    }
  };

  const handleEditClick = (partner: any) => {
    setEditForm({
      name: partner.name || "",
      type: partner.type || "",
      businessNumber: partner.businessNumber || "",
      contactName: partner.contactName || "",
      phone: partner.phone || "",
      email: partner.email || "",
      address: partner.address || "",
      isActive: partner.isActive
    });
    setEditingId(partner.id);
    setEditOpen(true);
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.id]: e.target.value });
  };
  const handleEditTypeChange = (value: string) => {
    setEditForm({ ...editForm, type: value });
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    const res = await fetch(`/api/partners/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    setEditSaving(false);
    if (res.ok) {
      setEditOpen(false);
      setEditingId(null);
      window.location.reload();
    } else {
      alert("거래처 수정에 실패했습니다.");
    }
  };

  // 엑셀 다운로드 함수
  function handleExcelDownload() {
    const data = filteredPartners.map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      businessNumber: p.businessNumber,
      contactName: p.contactName,
      phone: p.phone,
      email: p.email,
      address: p.address,
      isActive: p.isActive,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Partners");
    XLSX.writeFile(wb, "partners.xlsx");
  }

  // 엑셀 업로드 함수
  const fileInputRef = useRef<HTMLInputElement>(null);
  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    for (const row of rows as any[]) {
      // 데이터 정제
      const { id, createdBy, ...rowWithoutId } = row;

      // isActive 변환
      if (typeof rowWithoutId.isActive === "string") {
        rowWithoutId.isActive = rowWithoutId.isActive.toLowerCase() === "true";
      }

      // phone, email, address: 숫자면 빈 문자열, null/undefined도 빈 문자열
      ["phone", "email", "address"].forEach(key => {
        if (typeof rowWithoutId[key] === "number") rowWithoutId[key] = "";
        if (rowWithoutId[key] == null) rowWithoutId[key] = "";
      });

      // name/type 필수 체크
      if (!rowWithoutId.name || !rowWithoutId.type) continue;

      if (id && !isNaN(Number(id))) {
        // 수정 시도
        const res = await fetch(`/api/partners/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...rowWithoutId })
        });
        if (res.status === 404) {
          await fetch(`/api/partners`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rowWithoutId)
          });
        }
      } else {
        await fetch(`/api/partners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rowWithoutId)
        });
      }
    }
    window.location.reload();
  }

  const [viewOpen, setViewOpen] = useState(false);
  const [viewPartner, setViewPartner] = useState<any>(null);
  function handleViewClick(partner: any) {
    setViewPartner(partner);
    setViewOpen(true);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 페이지 헤더 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">거래처 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="거래처명, 사업자번호, 담당자"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button type="submit" variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </form>
              {/* 엑셀 다운로드/업로드 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleExcelDownload()}>
                      <Download className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>엑셀 다운로드</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>엑셀 업로드</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleExcelUpload}
              />
              {/* 거래처 등록 버튼 */}
              {canWrite && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      거래처 등록
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>거래처 등록</DialogTitle>
                      <DialogDescription>
                        새로운 거래처 정보를 입력하세요.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          거래처명
                        </Label>
                        <Input id="name" placeholder="거래처명" className="col-span-3" value={form.name} onChange={handleFormChange} required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                          구분
                        </Label>
                        <Select value={form.type} onValueChange={handleTypeChange} required>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="거래처 유형" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">고객</SelectItem>
                            <SelectItem value="supplier">공급사</SelectItem>
                            <SelectItem value="both">고객/공급사</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="businessNumber" className="text-right">
                          사업자번호
                        </Label>
                        <Input id="businessNumber" placeholder="000-00-00000" className="col-span-3" value={form.businessNumber} onChange={handleFormChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactName" className="text-right">
                          담당자
                        </Label>
                        <Input id="contactName" placeholder="담당자 이름" className="col-span-3" value={form.contactName} onChange={handleFormChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                          연락처
                        </Label>
                        <Input id="phone" placeholder="연락처" className="col-span-3" value={form.phone} onChange={handleFormChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          이메일
                        </Label>
                        <Input id="email" type="email" placeholder="이메일" className="col-span-3" value={form.email} onChange={handleFormChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">
                          주소
                        </Label>
                        <Input id="address" placeholder="주소" className="col-span-3" value={form.address} onChange={handleFormChange} />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          {/* 필터 옵션 */}
          <div className="mb-4 flex gap-2">
            <Button 
              variant={typeFilter === "all" ? "default" : "outline"} 
              onClick={() => setTypeFilter("all")}
            >
              전체
            </Button>
            <Button 
              variant={typeFilter === "customer" ? "default" : "outline"} 
              onClick={() => setTypeFilter("customer")}
            >
              고객
            </Button>
            <Button 
              variant={typeFilter === "supplier" ? "default" : "outline"} 
              onClick={() => setTypeFilter("supplier")}
            >
              공급사
            </Button>
            <Button 
              variant={typeFilter === "both" ? "default" : "outline"} 
              onClick={() => setTypeFilter("both")}
            >
              고객/공급사
            </Button>
          </div>
          
          {/* 거래처 목록 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래처명</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>사업자번호</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>이메일</TableHead>
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
                ) : paginatedPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {searchQuery ? "검색 결과가 없습니다." : "등록된 거래처가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPartners.map((partner: any) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell>{getTypeText(partner.type)}</TableCell>
                      <TableCell>{partner.businessNumber || "-"}</TableCell>
                      <TableCell>{partner.contactName || "-"}</TableCell>
                      <TableCell>{partner.phone || "-"}</TableCell>
                      <TableCell>{partner.email || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${partner.isActive ? 'bg-success bg-opacity-10 text-success' : 'bg-destructive text-white'}`}>
                          {partner.isActive ? "활성" : "비활성"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewClick(partner)}>
                              <Eye className="h-4 w-4 mr-2" /> 상세보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(partner)}>
                              <Pencil className="h-4 w-4 mr-2" /> 수정
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* 페이지네이션 */}
            {filteredPartners.length > 0 && (
              <div className="px-6 py-3 flex items-center justify-between border-t">
                <div className="text-xs text-neutral-300">
                  총 <span className="font-medium">{filteredPartners.length}</span>건 중 <span className="font-medium">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredPartners.length)}</span>건 표시
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
        </main>
        
        <Footer />
      </div>

      {/* 거래처 수정 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>거래처 수정</DialogTitle>
            <DialogDescription>거래처 정보를 수정하세요.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">거래처명</Label>
              <Input id="name" placeholder="거래처명" className="col-span-3" value={editForm.name} onChange={handleEditChange} required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">구분</Label>
              <Select value={editForm.type} onValueChange={handleEditTypeChange} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="거래처 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">고객</SelectItem>
                  <SelectItem value="supplier">공급사</SelectItem>
                  <SelectItem value="both">고객/공급사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="businessNumber" className="text-right">사업자번호</Label>
              <Input id="businessNumber" placeholder="000-00-00000" className="col-span-3" value={editForm.businessNumber} onChange={handleEditChange} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactName" className="text-right">담당자</Label>
              <Input id="contactName" placeholder="담당자 이름" className="col-span-3" value={editForm.contactName} onChange={handleEditChange} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">연락처</Label>
              <Input id="phone" placeholder="연락처" className="col-span-3" value={editForm.phone} onChange={handleEditChange} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">이메일</Label>
              <Input id="email" type="email" placeholder="이메일" className="col-span-3" value={editForm.email} onChange={handleEditChange} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">주소</Label>
              <Input id="address" placeholder="주소" className="col-span-3" value={editForm.address} onChange={handleEditChange} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">상태</Label>
              <Select value={editForm.isActive ? "active" : "inactive"} onValueChange={v => setEditForm({ ...editForm, isActive: v === "active" })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editSaving}>{editSaving ? "저장 중..." : "저장"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>거래처 상세정보</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <div><b>거래처명:</b> {viewPartner?.name}</div>
            <div><b>구분:</b> {getTypeText(viewPartner?.type)}</div>
            <div><b>사업자번호:</b> {viewPartner?.businessNumber}</div>
            <div><b>담당자:</b> {viewPartner?.contactName}</div>
            <div><b>연락처:</b> {viewPartner?.phone}</div>
            <div><b>이메일:</b> {viewPartner?.email}</div>
            <div><b>주소:</b> {viewPartner?.address}</div>
            <div><b>상태:</b> {viewPartner?.isActive ? '활성' : '비활성'}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
