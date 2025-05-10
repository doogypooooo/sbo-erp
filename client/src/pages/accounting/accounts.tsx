import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Search, Download, Pencil, MoreHorizontal } from "lucide-react";

export default function AccountsPage() {
  // 권한 확인
  const canWrite = usePermission("accounts", "write");
  const canDelete = usePermission("accounts", "delete");
  const canExport = usePermission("accounts", "export");
  
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAccountType, setSelectedAccountType] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const pageSize = 10;
  
  const { toast } = useToast();
  
  // 계정과목 데이터 조회
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      
      if (!response.ok) {
        throw new Error("계정과목 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 새 계정과목 추가 뮤테이션
  const addAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsAddDialogOpen(false);
      toast({
        title: "계정과목 추가 완료",
        description: "새로운 계정과목이 추가되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "계정과목 추가 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // 계정과목 수정 뮤테이션
  const editAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/accounts/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsEditDialogOpen(false);
      setSelectedAccount(null);
      toast({
        title: "계정과목 수정 완료",
        description: "계정과목이 수정되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "계정과목 수정 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // 필터링 및 검색
  const filteredAccounts = accounts?.filter((account: any) => {
    const query = searchQuery.toLowerCase();
    
    // 검색어 필터링
    const searchMatch = (
      account.code.toLowerCase().includes(query) ||
      account.name.toLowerCase().includes(query)
    );
    
    // 계정 유형 필터링
    const typeMatch = !selectedAccountType || account.type === selectedAccountType;
    
    // 활성화 상태 필터링
    const activeMatch = showInactive ? true : account.isActive;
    
    return searchMatch && typeMatch && activeMatch;
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAccounts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + pageSize);
  
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
  
  // 계정 유형 변경 핸들러
  const handleAccountTypeChange = (value: string) => {
    setSelectedAccountType(value === "all" ? null : value);
    setCurrentPage(1);
  };
  
  // 계정 유형 텍스트 변환
  const getAccountTypeText = (type: string) => {
    switch (type) {
      case "asset": return "자산";
      case "liability": return "부채";
      case "equity": return "자본";
      case "revenue": return "수익";
      case "expense": return "비용";
      default: return type;
    }
  };
  
  // 새 계정과목 추가 핸들러
  const handleAddAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      isActive: true
    };
    
    addAccountMutation.mutate(data);
  };
  
  // 계정과목 수정 핸들러
  const handleEditAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAccount) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      id: selectedAccount.id,
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      isActive: formData.get("isActive") === "on"
    };
    
    editAccountMutation.mutate(data);
  };
  
  // 계정과목 수정 다이얼로그 열기 핸들러
  const handleOpenEditDialog = (account: any) => {
    setSelectedAccount(account);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 페이지 헤더 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">계정과목 관리</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="계정코드, 계정명"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button type="submit" variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </form>
              
              {/* 계정과목 추가 버튼 */}
              {canWrite && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      계정과목 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>계정과목 추가</DialogTitle>
                      <DialogDescription>
                        새로운 계정과목 정보를 입력하세요.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAccount}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="code" className="text-right">계정코드</Label>
                          <Input
                            id="code"
                            name="code"
                            placeholder="101"
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">계정명</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="현금"
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="type" className="text-right">계정유형</Label>
                          <Select name="type" defaultValue="asset" required>
                            <SelectTrigger id="type" className="col-span-3">
                              <SelectValue placeholder="계정유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asset">자산</SelectItem>
                              <SelectItem value="liability">부채</SelectItem>
                              <SelectItem value="equity">자본</SelectItem>
                              <SelectItem value="revenue">수익</SelectItem>
                              <SelectItem value="expense">비용</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={addAccountMutation.isPending}>
                          {addAccountMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          추가
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          {/* 필터 영역 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="accountType">계정유형:</Label>
                <Select
                  value={selectedAccountType || "all"}
                  onValueChange={handleAccountTypeChange}
                >
                  <SelectTrigger id="accountType" className="w-40">
                    <SelectValue placeholder="모든 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    <SelectItem value="asset">자산</SelectItem>
                    <SelectItem value="liability">부채</SelectItem>
                    <SelectItem value="equity">자본</SelectItem>
                    <SelectItem value="revenue">수익</SelectItem>
                    <SelectItem value="expense">비용</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="showInactive" className="whitespace-nowrap">비활성 표시:</Label>
                <Switch
                  id="showInactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
              </div>
            </div>
            
            {/* 엑셀 다운로드 버튼 */}
            {canExport && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
            )}
          </div>
          
          {/* 계정과목 목록 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계정코드</TableHead>
                  <TableHead>계정명</TableHead>
                  <TableHead>계정유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchQuery || selectedAccountType ? "검색 결과가 없습니다." : "계정과목 데이터가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccounts.map((account: any) => (
                    <TableRow key={account.id} className={!account.isActive ? "bg-gray-50 text-gray-400" : undefined}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{getAccountTypeText(account.type)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${account.isActive ? 'bg-primary bg-opacity-10 text-primary' : 'bg-neutral-300 bg-opacity-10 text-neutral-300'}`}>
                          {account.isActive ? "활성" : "비활성"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canWrite && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleOpenEditDialog(account)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
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
          {paginatedAccounts.length > 0 && (
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
          
          {/* 수정 다이얼로그 */}
          {selectedAccount && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>계정과목 수정</DialogTitle>
                  <DialogDescription>
                    계정과목 정보를 수정하세요.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditAccount}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">계정코드</Label>
                      <div className="col-span-3 font-mono">{selectedAccount.code}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">계정명</Label>
                      <Input
                        id="edit-name"
                        name="name"
                        defaultValue={selectedAccount.name}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-type" className="text-right">계정유형</Label>
                      <Select name="type" defaultValue={selectedAccount.type}>
                        <SelectTrigger id="edit-type" className="col-span-3">
                          <SelectValue placeholder="계정유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">자산</SelectItem>
                          <SelectItem value="liability">부채</SelectItem>
                          <SelectItem value="equity">자본</SelectItem>
                          <SelectItem value="revenue">수익</SelectItem>
                          <SelectItem value="expense">비용</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-active" className="text-right">활성화</Label>
                      <div className="col-span-3 flex items-center gap-2">
                        <Switch
                          id="edit-active"
                          name="isActive"
                          defaultChecked={selectedAccount.isActive}
                        />
                        <Label htmlFor="edit-active" className="cursor-pointer">
                          {selectedAccount.isActive ? "활성" : "비활성"}
                        </Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={editAccountMutation.isPending}>
                      {editAccountMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      저장
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}