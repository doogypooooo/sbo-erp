import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth, usePermission } from "@/hooks/use-auth";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Download, Pencil, Trash2, KeyRound, Shield } from "lucide-react";

// 사용자 등록 스키마
const userSchema = z.object({
  username: z.string().min(4, "아이디는 최소 4자 이상이어야 합니다."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.string().email("유효한 이메일 주소를 입력해주세요").optional().or(z.literal('')),
  role: z.string(),
  isActive: z.boolean().default(true),
});

// 사용자 수정 스키마 (비밀번호 선택적)
const userEditSchema = userSchema.extend({
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다.").optional().or(z.literal('')),
});

// 권한 설정 스키마
const permissionSchema = z.object({
  userId: z.number(),
  resource: z.string(),
  canRead: z.boolean().default(true),
  canWrite: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  canExport: z.boolean().default(false),
});

export default function UsersPage() {
  // 현재 사용자 및 권한 확인
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("users");
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const pageSize = 10;
  
  const { toast } = useToast();
  
  // 사용자 목록 조회
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error("사용자 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    },
    enabled: isAdmin // 관리자만 조회 가능
  });
  
  // 선택한 사용자의 권한 조회
  const { data: permissions, isLoading: isPermissionLoading } = useQuery({
    queryKey: ["/api/users", selectedUser?.id, "permissions"],
    queryFn: async () => {
      if (!selectedUser) return null;
      
      const response = await fetch(`/api/users/${selectedUser.id}/permissions`);
      
      if (!response.ok) {
        throw new Error("권한 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    },
    enabled: isAdmin && !!selectedUser && isPermissionDialogOpen
  });
  
  // 새 사용자 추가 폼
  const addUserForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "staff",
      isActive: true
    }
  });
  
  // 사용자 수정 폼
  const editUserForm = useForm<z.infer<typeof userEditSchema>>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "staff",
      isActive: true
    }
  });
  
  // 새 사용자 추가 뮤테이션
  const addUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      return await apiRequest("POST", "/api/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      addUserForm.reset();
      toast({
        title: "사용자 추가 완료",
        description: "새로운 사용자가 추가되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "사용자 추가 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // 사용자 수정 뮤테이션
  const editUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/users/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "사용자 수정 완료",
        description: "사용자 정보가 수정되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "사용자 수정 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // 권한 설정 뮤테이션
  const setPermissionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof permissionSchema>) => {
      return await apiRequest("POST", `/api/users/${data.userId}/permissions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser?.id, "permissions"] });
      toast({
        title: "권한 설정 완료",
        description: "사용자 권한이 수정되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "권한 설정 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // 필터링 및 검색
  const filteredUsers = users?.filter((user: any) => {
    const query = searchQuery.toLowerCase();
    
    // 검색어 필터링
    const searchMatch = (
      user.username.toLowerCase().includes(query) ||
      user.name.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query))
    );
    
    // 활성화 상태 필터링
    const activeMatch = showInactive ? true : user.isActive;
    
    return searchMatch && activeMatch;
  }) || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);
  
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
  
  // 새 사용자 추가 핸들러
  const handleAddUser = (data: z.infer<typeof userSchema>) => {
    addUserMutation.mutate(data);
  };
  
  // 사용자 수정 핸들러
  const handleEditUser = (data: z.infer<typeof userEditSchema>) => {
    if (!selectedUser) return;
    
    // 빈 비밀번호 필드는 제거
    const userData = { ...data, id: selectedUser.id };
    if (!userData.password) {
      delete userData.password;
    }
    
    editUserMutation.mutate(userData);
  };
  
  // 사용자 수정 다이얼로그 열기 핸들러
  const handleOpenEditDialog = (user: any) => {
    setSelectedUser(user);
    editUserForm.reset({
      username: user.username,
      name: user.name,
      email: user.email || "",
      role: user.role,
      isActive: user.isActive
    });
    setIsEditDialogOpen(true);
  };
  
  // 권한 설정 다이얼로그 열기 핸들러
  const handleOpenPermissionDialog = (user: any) => {
    setSelectedUser(user);
    setIsPermissionDialogOpen(true);
  };
  
  // 권한 설정 핸들러
  const handleSetPermission = (resource: string, action: string, value: boolean) => {
    if (!selectedUser) return;
    
    // 현재 권한 찾기
    const existingPermission = permissions?.find((p: any) => p.resource === resource);
    const permissionData = {
      userId: selectedUser.id,
      resource,
      canRead: existingPermission?.canRead || false,
      canWrite: existingPermission?.canWrite || false,
      canDelete: existingPermission?.canDelete || false,
      canExport: existingPermission?.canExport || false
    };
    
    // 해당 액션 권한 업데이트
    switch (action) {
      case "read":
        permissionData.canRead = value;
        break;
      case "write":
        permissionData.canWrite = value;
        break;
      case "delete":
        permissionData.canDelete = value;
        break;
      case "export":
        permissionData.canExport = value;
        break;
    }
    
    setPermissionMutation.mutate(permissionData);
  };
  
  // 권한 리소스 목록
  const resourceList = [
    { id: "dashboard", name: "대시보드" },
    { id: "partners", name: "거래처 관리" },
    { id: "items", name: "품목 관리" },
    { id: "barcodes", name: "바코드 관리" },
    { id: "purchases", name: "구매/입고 관리" },
    { id: "sales", name: "판매/출고 관리" },
    { id: "inventory", name: "재고 관리" },
    { id: "vouchers", name: "전표 관리" },
    { id: "accounts", name: "계정과목 관리" },
    { id: "payments", name: "수금/지급 관리" },
    { id: "tax", name: "세금계산서 관리" },
    { id: "users", name: "사용자 관리" },
    { id: "settings", name: "시스템 설정" }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 접근 제한 메시지 */}
          {!isAdmin && (
            <div className="bg-destructive bg-opacity-10 p-4 rounded-lg text-destructive mb-6">
              <p className="font-medium">접근 권한이 없습니다.</p>
              <p>관리자 권한이 필요한 페이지입니다.</p>
            </div>
          )}
          
          {isAdmin && (
            <>
              {/* 페이지 헤더 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold">사용자 관리</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  {/* 검색 폼 */}
                  <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder="아이디, 이름, 이메일"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64"
                    />
                    <Button type="submit" variant="secondary">
                      <Search className="h-4 w-4 mr-2" />
                      검색
                    </Button>
                  </form>
                  
                  {/* 사용자 추가 버튼 */}
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        사용자 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>사용자 추가</DialogTitle>
                        <DialogDescription>
                          새로운 사용자 정보를 입력하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...addUserForm}>
                        <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-6">
                          <FormField
                            control={addUserForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>아이디</FormLabel>
                                <FormControl>
                                  <Input placeholder="아이디를 입력하세요 (최소 4자)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={addUserForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>비밀번호</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="비밀번호를 입력하세요 (최소 6자)" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={addUserForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>이름</FormLabel>
                                <FormControl>
                                  <Input placeholder="이름을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={addUserForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>이메일 (선택)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="이메일을 입력하세요" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={addUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>권한</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="권한을 선택하세요" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">관리자</SelectItem>
                                    <SelectItem value="staff">일반 사용자</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={addUserForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>활성화</FormLabel>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              disabled={addUserMutation.isPending}
                            >
                              {addUserMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              추가
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* 탭 영역 */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList>
                  <TabsTrigger value="users">사용자 목록</TabsTrigger>
                  <TabsTrigger value="activities">활동 로그</TabsTrigger>
                </TabsList>
                
                {/* 필터 영역 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="showInactive" className="whitespace-nowrap">비활성 사용자 표시:</Label>
                    <Switch
                      id="showInactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                  </div>
                </div>
                
                <TabsContent value="users">
                  {/* 사용자 목록 */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>아이디</TableHead>
                          <TableHead>이름</TableHead>
                          <TableHead>이메일</TableHead>
                          <TableHead>권한</TableHead>
                          <TableHead>마지막 로그인</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="flex justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              {searchQuery ? "검색 결과가 없습니다." : "사용자 데이터가 없습니다."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedUsers.map((user: any) => (
                            <TableRow key={user.id} className={!user.isActive ? "bg-gray-50 text-gray-400" : undefined}>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email || "-"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${user.role === "admin" ? "bg-primary bg-opacity-10 text-primary font-medium" : "bg-neutral-300 bg-opacity-10 text-neutral-300"}`}>
                                  {user.role === "admin" ? "관리자" : "일반 사용자"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "-"}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? "bg-success bg-opacity-10 text-success" : "bg-neutral-300 bg-opacity-10 text-neutral-300"}`}>
                                  {user.isActive ? "활성" : "비활성"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleOpenEditDialog(user)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleOpenPermissionDialog(user)}
                                  >
                                    <Shield className="h-4 w-4" />
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
                  {paginatedUsers.length > 0 && (
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
                
                <TabsContent value="activities">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium mb-4">활동 로그</h3>
                    <p className="text-muted-foreground mb-4">사용자들의 시스템 활동 기록입니다.</p>
                    
                    {/* 활동 로그 예시 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 pb-4 border-b">
                        <div className="flex-1">
                          <p className="font-medium">관리자</p>
                          <p className="text-sm text-muted-foreground">사용자 '홍길동' 추가</p>
                        </div>
                        <p className="text-sm text-muted-foreground">2023-12-10 15:30</p>
                      </div>
                      
                      <div className="flex items-center gap-4 pb-4 border-b">
                        <div className="flex-1">
                          <p className="font-medium">홍길동</p>
                          <p className="text-sm text-muted-foreground">거래처 '(주)가나상사' 수정</p>
                        </div>
                        <p className="text-sm text-muted-foreground">2023-12-09 10:15</p>
                      </div>
                      
                      <div className="flex items-center gap-4 pb-4 border-b">
                        <div className="flex-1">
                          <p className="font-medium">관리자</p>
                          <p className="text-sm text-muted-foreground">시스템 설정 변경</p>
                        </div>
                        <p className="text-sm text-muted-foreground">2023-12-08 16:45</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* 사용자 수정 다이얼로그 */}
              {selectedUser && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>사용자 수정</DialogTitle>
                      <DialogDescription>
                        사용자 정보를 수정하세요.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...editUserForm}>
                      <form onSubmit={editUserForm.handleSubmit(handleEditUser)} className="space-y-6">
                        <FormField
                          control={editUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>아이디</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  disabled 
                                  className="bg-gray-50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>비밀번호 (변경 시에만 입력)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="새 비밀번호를 입력하세요" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>이름</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>이메일 (선택)</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>권한</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="권한을 선택하세요" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">관리자</SelectItem>
                                  <SelectItem value="staff">일반 사용자</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>활성화</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            disabled={editUserMutation.isPending}
                          >
                            {editUserMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            저장
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              
              {/* 권한 설정 다이얼로그 */}
              {selectedUser && (
                <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>권한 설정</DialogTitle>
                      <DialogDescription>
                        사용자 '{selectedUser.name}'의 권한을 설정하세요.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {isPermissionLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-5 gap-2 font-medium py-2 px-4 bg-gray-100 rounded-md">
                          <div>리소스</div>
                          <div className="text-center">읽기</div>
                          <div className="text-center">쓰기</div>
                          <div className="text-center">삭제</div>
                          <div className="text-center">내보내기</div>
                        </div>
                        
                        {resourceList.map((resource) => {
                          const permission = permissions?.find((p: any) => p.resource === resource.id) || {
                            canRead: false,
                            canWrite: false,
                            canDelete: false,
                            canExport: false
                          };
                          
                          return (
                            <div key={resource.id} className="grid grid-cols-5 gap-2 items-center py-2 px-4 border-b">
                              <div>{resource.name}</div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.canRead}
                                  onCheckedChange={(checked) => 
                                    handleSetPermission(resource.id, "read", checked === true)
                                  }
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.canWrite}
                                  onCheckedChange={(checked) => 
                                    handleSetPermission(resource.id, "write", checked === true)
                                  }
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.canDelete}
                                  onCheckedChange={(checked) => 
                                    handleSetPermission(resource.id, "delete", checked === true)
                                  }
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={permission.canExport}
                                  onCheckedChange={(checked) => 
                                    handleSetPermission(resource.id, "export", checked === true)
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <DialogFooter>
                      <Button onClick={() => setIsPermissionDialogOpen(false)}>
                        닫기
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}