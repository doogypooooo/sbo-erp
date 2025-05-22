import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Loader2, Plus, Search, MoreHorizontal, Eye, Pencil, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ItemsPage() {
  // 권한 확인
  const canWrite = usePermission("items", "write");
  const canDelete = usePermission("items", "delete");
  
  // 상태 관리
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    categoryId: "",
    unitPrice: "",
    costPrice: "",
    unit: "",
    barcode: "",
    description: ""
  });
  const [createSaving, setCreateSaving] = useState(false);
  
  const queryClient = useQueryClient();
  
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
  
  // 품목 데이터 조회
  const { data: items, isLoading } = useQuery({
    queryKey: ["/api/items", categoryFilter],
    queryFn: async () => {
      const url = `/api/items${categoryFilter ? `?categoryId=${categoryFilter}` : ""}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("품목 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 검색 기능
  const filteredItems = items?.filter((item: any) => {
    const query = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);
  
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
  
  // 카테고리 필터 변경 핸들러
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === "all" ? null : parseInt(value));
    setCurrentPage(1);
  };
  
  // 카테고리명 가져오기
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "-";
    const category = categories?.find((c: any) => c.id === categoryId);
    return category ? category.name : "-";
  };

  function handleViewClick(item: any) {
    setViewItem(item);
    setViewOpen(true);
  }

  function handleEditClick(item: any) {
    setEditItem(item);
    setEditOpen(true);
  }

  // 엑셀 다운로드 함수
  function handleExcelDownload() {
    const data = filteredItems.map((item: any) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      categoryId: item.categoryId,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      unit: item.unit,
      barcode: item.barcode,
      description: item.description,
      isActive: item.isActive,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");
    XLSX.writeFile(wb, "items.xlsx");
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
      const { id, ...rowWithoutId } = row;
      if (!rowWithoutId.code || !rowWithoutId.name) continue;
      if (id && !isNaN(Number(id))) {
        // 수정 시도
        const res = await fetch(`/api/items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rowWithoutId)
        });
        if (res.status === 404) {
          // 없는 id면 새로 추가 (id는 빈값으로 전달)
          await fetch(`/api/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...rowWithoutId, id: "" })
          });
        }
      } else {
        await fetch(`/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...rowWithoutId, id: "" })
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    window.location.reload();
  }

  // 등록 폼 입력 핸들러
  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateForm({ ...createForm, [e.target.id]: e.target.value });
  };
  const handleCreateCategoryChange = (value: string) => {
    setCreateForm({ ...createForm, categoryId: value });
  };
  // 등록 폼 제출 핸들러
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    const payload = {
      ...createForm,
      unitPrice: createForm.unitPrice ? Number(createForm.unitPrice) : 0,
      costPrice: createForm.costPrice ? Number(createForm.costPrice) : 0,
      categoryId: createForm.categoryId ? Number(createForm.categoryId) : null
    };
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setCreateSaving(false);
    if (res.ok) {
      setCreateOpen(false);
      setCreateForm({ code: "", name: "", categoryId: "", unitPrice: "", costPrice: "", unit: "", barcode: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    } else {
      alert("품목 등록에 실패했습니다.");
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
            <h2 className="text-2xl font-bold">품목 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="품목코드, 품명, 설명"
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
              
              {/* 품목 등록 버튼 */}
              {canWrite && (
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      품목 등록
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>품목 등록</DialogTitle>
                      <DialogDescription>
                        새로운 품목 정보를 입력하세요.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">
                          품목코드
                        </Label>
                        <Input id="code" placeholder="품목코드" className="col-span-3" value={createForm.code} onChange={handleCreateChange} required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          품명
                        </Label>
                        <Input id="name" placeholder="품명" className="col-span-3" value={createForm.name} onChange={handleCreateChange} required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                          분류
                        </Label>
                        <Select value={createForm.categoryId} onValueChange={handleCreateCategoryChange} required>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="분류 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unitPrice" className="text-right">
                          단가(원)
                        </Label>
                        <Input id="unitPrice" type="number" placeholder="0" className="col-span-3" value={createForm.unitPrice} onChange={handleCreateChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="costPrice" className="text-right">
                          원가(원)
                        </Label>
                        <Input id="costPrice" type="number" placeholder="0" className="col-span-3" value={createForm.costPrice} onChange={handleCreateChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">
                          단위
                        </Label>
                        <Input id="unit" placeholder="EA" className="col-span-3" value={createForm.unit} onChange={handleCreateChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="barcode" className="text-right">
                          바코드
                        </Label>
                        <Input id="barcode" placeholder="바코드 (선택)" className="col-span-3" value={createForm.barcode} onChange={handleCreateChange} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          설명
                        </Label>
                        <Input id="description" placeholder="설명" className="col-span-3" value={createForm.description} onChange={handleCreateChange} />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createSaving}>저장</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          {/* 필터 옵션 */}
          <div className="mb-4 flex items-center gap-2">
            <Label htmlFor="categoryFilter" className="mr-2">분류:</Label>
            <Select onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="전체 분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 품목 목록 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품목코드</TableHead>
                  <TableHead>품명</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead>단가(원)</TableHead>
                  <TableHead>원가(원)</TableHead>
                  <TableHead>단위</TableHead>
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
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {searchQuery ? "검색 결과가 없습니다." : "등록된 품목이 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getCategoryName(item.categoryId)}</TableCell>
                      <TableCell className="font-mono">{item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="font-mono">{item.costPrice.toLocaleString()}</TableCell>
                      <TableCell>{item.unit || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? 'bg-success bg-opacity-10 text-success' : 'bg-destructive bg-opacity-10 text-white'}`}>
                          {item.isActive ? "활성" : "비활성"}
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
                            <DropdownMenuItem onClick={() => handleViewClick(item)}>
                              <Eye className="h-4 w-4 mr-2" /> 상세보기
                            </DropdownMenuItem>
                            {canWrite && (
                              <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                <Pencil className="h-4 w-4 mr-2" /> 수정
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
            {filteredItems.length > 0 && (
              <div className="px-6 py-3 flex items-center justify-between border-t">
                <div className="text-xs text-neutral-300">
                  총 <span className="font-medium">{filteredItems.length}</span>건 중 <span className="font-medium">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredItems.length)}</span>건 표시
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

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>품목 상세정보</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <div><b>품목코드:</b> {viewItem?.code}</div>
            <div><b>품명:</b> {viewItem?.name}</div>
            <div><b>분류:</b> {getCategoryName(viewItem?.categoryId)}</div>
            <div><b>단가(원):</b> {viewItem?.unitPrice?.toLocaleString()}</div>
            <div><b>원가(원):</b> {viewItem?.costPrice?.toLocaleString()}</div>
            <div><b>단위:</b> {viewItem?.unit}</div>
            <div><b>현재고:</b> {viewItem?.stock}</div>
            <div><b>설명:</b> {viewItem?.description}</div>
            <div><b>상태:</b> {viewItem?.isActive ? '활성' : '비활성'}</div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>품목 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">품목코드</Label>
              <Input
                id="edit-code"
                value={editItem?.code || ""}
                onChange={e => setEditItem({ ...editItem, code: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">품명</Label>
              <Input
                id="edit-name"
                value={editItem?.name || ""}
                onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">분류</Label>
              <Select
                value={editItem?.categoryId ? String(editItem.categoryId) : ""}
                onValueChange={v => setEditItem({ ...editItem, categoryId: v ? Number(v) : null })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category: any) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-unitPrice" className="text-right">단가(원)</Label>
              <Input
                id="edit-unitPrice"
                type="number"
                value={editItem?.unitPrice || 0}
                onChange={e => setEditItem({ ...editItem, unitPrice: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-costPrice" className="text-right">원가(원)</Label>
              <Input
                id="edit-costPrice"
                type="number"
                value={editItem?.costPrice || 0}
                onChange={e => setEditItem({ ...editItem, costPrice: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-unit" className="text-right">단위</Label>
              <Input
                id="edit-unit"
                value={editItem?.unit || ""}
                onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-barcode" className="text-right">바코드</Label>
              <Input
                id="edit-barcode"
                value={editItem?.barcode || ""}
                onChange={e => setEditItem({ ...editItem, barcode: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">설명</Label>
              <Input
                id="edit-description"
                value={editItem?.description || ""}
                onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isActive" className="text-right">상태</Label>
              <Select
                value={editItem?.isActive ? "true" : "false"}
                onValueChange={v => setEditItem({ ...editItem, isActive: v === "true" })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">활성</SelectItem>
                  <SelectItem value="false">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!editItem) return;
                await fetch(`/api/items/${editItem.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(editItem)
                });
                setEditOpen(false);
                setEditItem(null);
                queryClient.invalidateQueries({ queryKey: ["/api/items"] });
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
