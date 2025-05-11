import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Partner, Payment, Transaction } from "@shared/schema";
import { Calendar as CalendarIcon, Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import React from "react";

// InsertPayment 타입 확장 (프론트엔드에서만 사용)
type InsertPaymentEx = {
  code: string;
  reference?: string;
  notes?: string;
  status: string;
  description?: string;
} & Omit<Payment, 'id' | 'createdAt' | 'createdBy'>;

export default function PaymentsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentData, setPaymentData] = useState<Partial<InsertPaymentEx>>({
    code: "",
    date: new Date().toISOString().split('T')[0],
    partnerId: 0,
    amount: 0,
    method: "cash",
    reference: "",
    notes: "",
    transactionId: null,
    status: "planned",
    description: ""
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState<Partial<InsertPaymentEx> | null>(null);
  
  // 수금/지급 내역 조회
  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['/api/accounting/payments'],
    select: (data) => data as Payment[]
  });
  
  // 거래처 목록 조회
  const { data: partners = [] } = useQuery({
    queryKey: ['/api/partners'],
    select: (data) => data as Partner[]
  });
  
  // 미결제 거래 목록 조회
  const { data: unpaidTransactions = [] } = useQuery({
    queryKey: ['/api/transactions', 'pending'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/transactions?status=pending");
      return await res.json();
    },
    select: (data) => data as Transaction[]
  });
  
  // 수금/지급 생성 뮤테이션
  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertPaymentEx) => {
      const res = await apiRequest("POST", "/api/accounting/payments", data);
      return await res.json();
    },
    onSuccess: () => {
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "등록 완료",
        description: "수금/지급 내역이 성공적으로 등록되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "등록 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 검색된 수금/지급 내역
  const filteredPayments = payments.filter(payment => {
    const code = typeof (payment as any).code === 'string' ? (payment as any).code : '';
    const partnerName = (() => {
      const partner = partners.find(p => p.id === payment.partnerId);
      return partner && typeof partner.name === 'string' ? partner.name : '';
    })();
    const method = typeof payment.method === 'string' ? payment.method : '';
    return (
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // 거래 선택 핸들러
  const handleSelectTransaction = (transactionId: number | null) => {
    if (!transactionId) {
      setPaymentData({
        ...paymentData,
        transactionId: null,
        amount: 0
      });
      return;
    }
    const transaction = unpaidTransactions.find(t => t.id === transactionId);
    if (transaction) {
      setPaymentData({
        ...paymentData,
        transactionId,
        amount: transaction.type === 'purchase' ? -transaction.totalAmount : transaction.totalAmount,
        partnerId: transaction.partnerId
      });
    }
  };
  
  // 거래처 선택 핸들러
  const handleSelectPartner = (partnerId: number) => {
    setPaymentData({
      ...paymentData,
      partnerId
    });
  };
  
  // 날짜 선택 핸들러
  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setPaymentData({
        ...paymentData,
        date: date.toISOString().split('T')[0]
      });
    }
  };
  
  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: name === 'amount' ? parseInt(value) || 0 : value
    });
  };
  
  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.partnerId || !paymentData.amount || !paymentData.code) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    createPaymentMutation.mutate(paymentData as InsertPaymentEx);
    setSearchTerm(""); // 등록 후 검색어 초기화
    setActiveTab("all"); // 등록 후 탭 초기화(전체)
  };
  
  // 폼 초기화
  const resetForm = () => {
    setPaymentData({
      code: "",
      date: new Date().toISOString().split('T')[0],
      partnerId: 0,
      amount: 0,
      method: "cash",
      reference: "",
      notes: "",
      transactionId: null,
      status: "planned",
      description: ""
    });
    setSelectedDate(new Date());
  };
  
  // 코드 생성
  const generateCode = () => {
    const type = paymentData.amount! > 0 ? "수금" : "지급";
    const today = new Date();
    const yearMonth = format(today, 'yyMM');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${type}-${yearMonth}-${randomNum}`;
    
    setPaymentData({
      ...paymentData,
      code
    });
  };

  // 상세보기 핸들러
  const handleViewDetail = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailOpen(true);
  };

  // 수정 모달 오픈 시 기존 데이터로 초기화
  const openEditModal = (payment: Payment) => {
    setSelectedPayment(payment);
    const { description, ...rest } = payment;
    setEditPaymentData({
      ...rest,
      reference: payment.reference ?? '',
      description: payment.description ?? '',
    });
    setIsEditOpen(true);
  };

  // 수정 입력 핸들러
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editPaymentData) return;
    const { name, value } = e.target;
    setEditPaymentData({
      ...editPaymentData,
      [name]: name === 'amount' ? parseInt(value) || 0 : value
    });
  };

  // 수정 저장 핸들러
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !editPaymentData) return;
    try {
      await apiRequest("PUT", `/api/accounting/payments/${selectedPayment.id}`, editPaymentData);
      toast({ title: "수정 완료", description: "수금/지급 내역이 수정되었습니다." });
      setIsEditOpen(false);
      setSelectedPayment(null);
      setEditPaymentData(null);
      refetchPayments();
    } catch (err: any) {
      toast({ title: "수정 실패", description: err?.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  // 삭제 핸들러
  const handleDelete = async (id: number) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await apiRequest("DELETE", `/api/accounting/payments/${id}`);
      refetchPayments();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">수금/지급 관리</h1>
              <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                신규 등록
              </Button>
            </div>
            
            <div className="relative">
              <Input
                placeholder="검색어를 입력하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="h-4 w-4 absolute top-3 left-3 text-gray-400" />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="income">수금</TabsTrigger>
                <TabsTrigger value="expense">지급</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <PaymentsTable 
                  payments={filteredPayments} 
                  isLoading={isLoadingPayments} 
                  partners={partners}
                  onViewDetail={handleViewDetail}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              </TabsContent>
              
              <TabsContent value="income">
                <PaymentsTable 
                  payments={filteredPayments.filter(p => p.amount > 0)} 
                  isLoading={isLoadingPayments} 
                  partners={partners}
                  onViewDetail={handleViewDetail}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              </TabsContent>
              
              <TabsContent value="expense">
                <PaymentsTable 
                  payments={filteredPayments.filter(p => p.amount < 0)} 
                  isLoading={isLoadingPayments} 
                  partners={partners}
                  onViewDetail={handleViewDetail}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              </TabsContent>
            </Tabs>
            
            {/* 수금/지급 등록 다이얼로그 */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>수금/지급 등록</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="space-y-2 flex-grow">
                      <Label htmlFor="code">코드</Label>
                      <div className="flex gap-2">
                        <Input
                          id="code"
                          name="code"
                          placeholder="코드를 입력하세요"
                          value={paymentData.code}
                          onChange={handleInputChange}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateCode}
                        >
                          자동생성
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 w-40">
                      <Label>날짜</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "PPP", { locale: ko })
                            ) : (
                              <span>날짜 선택</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleSelectDate}
                            initialFocus
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="transaction">관련 거래</Label>
                    <Select 
                      onValueChange={(value) => handleSelectTransaction(value === "none" ? null : parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="관련 거래 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">거래 없음</SelectItem>
                        {unpaidTransactions.map(transaction => (
                          <SelectItem key={transaction.id} value={transaction.id.toString()}>
                            {transaction.code} - {transaction.type === 'sale' ? '판매' : '구매'} ({transaction.totalAmount.toLocaleString()}원)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partnerId">거래처</Label>
                    <Select 
                      onValueChange={(value) => handleSelectPartner(parseInt(value))}
                      defaultValue={paymentData.partnerId?.toString()}
                      disabled={paymentData.transactionId !== null}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="거래처 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {partners.map(partner => (
                          <SelectItem key={partner.id} value={partner.id.toString()}>
                            {partner.name} ({partner.type === 'customer' ? '고객' : '공급사'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">금액</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        placeholder="금액을 입력하세요"
                        value={paymentData.amount || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="method">결제 방법</Label>
                      <Select 
                        defaultValue={paymentData.method}
                        onValueChange={(value) => setPaymentData({...paymentData, method: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">현금</SelectItem>
                          <SelectItem value="bank">계좌이체</SelectItem>
                          <SelectItem value="card">카드</SelectItem>
                          <SelectItem value="check">수표</SelectItem>
                          <SelectItem value="other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reference">참조번호</Label>
                    <Input
                      id="reference"
                      name="reference"
                      placeholder="입금자명, 계좌번호, 영수증 번호 등"
                      value={paymentData.reference || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">비고</Label>
                    <Input
                      id="notes"
                      name="notes"
                      placeholder="추가 정보 입력"
                      value={paymentData.notes || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select
                      value={paymentData.status}
                      onValueChange={val => setPaymentData({ ...paymentData, status: val })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">예정</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit" disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending ? "처리 중..." : "등록"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
        
        <Footer />
      </div>

      {/* 상세보기 모달 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수금/지급 상세보기</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div>
              <div>코드: {selectedPayment.code}</div>
              <div>거래처: {partners.find(p => p.id === selectedPayment.partnerId)?.name || '-'}</div>
              <div>금액: {selectedPayment.amount}</div>
              <div>결제수단: {selectedPayment.method}</div>
              <div>참조번호: {selectedPayment.reference}</div>
              <div>비고: {selectedPayment.description || '-'}</div>
              <div>날짜: {selectedPayment.date}</div>
              <div>상태: {selectedPayment.status === 'planned' ? '예정' : selectedPayment.status === 'completed' ? '완료' : selectedPayment.status}</div>
              {/* 필요시 추가 정보 표시 */}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 모달 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>수금/지급 수정</DialogTitle>
          </DialogHeader>
          {editPaymentData && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="space-y-2 flex-grow">
                  <Label htmlFor="edit-code">코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-code"
                      name="code"
                      placeholder="코드를 입력하세요"
                      value={editPaymentData.code || ''}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2 w-40">
                  <Label>날짜</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editPaymentData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editPaymentData.date ? (
                          format(new Date(editPaymentData.date), "PPP", { locale: ko })
                        ) : (
                          <span>날짜 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editPaymentData.date ? new Date(editPaymentData.date) : undefined}
                        onSelect={date => setEditPaymentData({ ...editPaymentData, date: date ? date.toISOString().split('T')[0] : '' })}
                        initialFocus
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-transaction">관련 거래</Label>
                <Select
                  onValueChange={value => setEditPaymentData({ ...editPaymentData, transactionId: value === "none" ? null : parseInt(value) })}
                  value={editPaymentData.transactionId ? String(editPaymentData.transactionId) : "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="관련 거래 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">거래 없음</SelectItem>
                    {unpaidTransactions.map(transaction => (
                      <SelectItem key={transaction.id} value={transaction.id.toString()}>
                        {transaction.code} - {transaction.type === 'sale' ? '판매' : '구매'} ({transaction.totalAmount.toLocaleString()}원)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-partnerId">거래처</Label>
                <Select
                  onValueChange={value => setEditPaymentData({ ...editPaymentData, partnerId: parseInt(value) })}
                  value={editPaymentData.partnerId ? String(editPaymentData.partnerId) : ''}
                  disabled={!!editPaymentData.transactionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="거래처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id.toString()}>
                        {partner.name} ({partner.type === 'customer' ? '고객' : '공급사'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">금액</Label>
                  <Input
                    id="edit-amount"
                    name="amount"
                    type="number"
                    placeholder="금액을 입력하세요"
                    value={editPaymentData.amount || ''}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-method">결제 방법</Label>
                  <Select
                    value={editPaymentData.method || ''}
                    onValueChange={value => setEditPaymentData({ ...editPaymentData, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">현금</SelectItem>
                      <SelectItem value="bank">계좌이체</SelectItem>
                      <SelectItem value="card">카드</SelectItem>
                      <SelectItem value="check">수표</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reference">참조번호</Label>
                <Input
                  id="edit-reference"
                  name="reference"
                  placeholder="입금자명, 계좌번호, 영수증 번호 등"
                  value={editPaymentData.reference || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">비고</Label>
                <Input
                  id="edit-description"
                  name="description"
                  placeholder="추가 정보 입력"
                  value={editPaymentData.description || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">상태</Label>
                <Select
                  value={editPaymentData.status || ''}
                  onValueChange={val => setEditPaymentData({ ...editPaymentData, status: val })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">예정</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">저장</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>닫기</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  partners: Partner[];
  onViewDetail: (payment: Payment) => void;
  onEdit: (payment: Payment) => void;
  onDelete: (id: number) => void;
}

function PaymentsTable({ payments, isLoading, partners, onViewDetail, onEdit, onDelete }: PaymentsTableProps) {
  // 금액이 양수이면 수금, 음수이면 지급으로 구분
  const getTypeText = (amount: number) => amount > 0 ? '수금' : '지급';
  
  // 거래처 이름 조회
  const getPartnerName = (partnerId: number) => {
    const partner = partners.find(p => p.id === partnerId);
    return partner ? partner.name : '-';
  };
  
  // 결제 방법 한글 표시
  const getMethodText = (method: string) => {
    const methods: Record<string, string> = {
      cash: '현금',
      bank: '계좌이체',
      card: '카드',
      check: '수표',
      other: '기타'
    };
    return methods[method] || method;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>코드</TableHead>
            <TableHead>거래처</TableHead>
            <TableHead>구분</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>결제수단</TableHead>
            <TableHead>참조번호</TableHead>
            <TableHead>날짜</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10">
                데이터를 불러오는 중...
              </TableCell>
            </TableRow>
          ) : payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10">
                등록된 수금/지급 내역이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => {
              const p = payment as any;
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.code || '-'}</TableCell>
                  <TableCell>{getPartnerName(p.partnerId)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${p.amount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                      {getTypeText(p.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Math.abs(p.amount).toLocaleString()}원
                  </TableCell>
                  <TableCell>{getMethodText(p.method)}</TableCell>
                  <TableCell>{p.reference || '-'}</TableCell>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell>{p.status === 'planned' ? '예정' : p.status === 'completed' ? '완료' : p.status}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded" title="더보기">
                          <span className="sr-only">더보기</span>
                          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="4" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/></svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => onViewDetail(p)}>
                          <Eye className="w-4 h-4 mr-2" /> 상세보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Pencil className="w-4 h-4 mr-2" /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(p.id)} className="text-red-500 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatsCard({ title, value, label, icon }: { title: string, value: string, label?: string, icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </CardContent>
    </Card>
  );
}