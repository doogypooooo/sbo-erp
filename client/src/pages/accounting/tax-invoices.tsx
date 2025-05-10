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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Partner, Transaction, InsertTaxInvoice, TaxInvoice } from "@shared/schema";
import { CalendarIcon, Download, Plus, Printer, Search, Send } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useReactToPrint } from 'react-to-print';
import { useRef } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function TaxInvoicesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [invoiceData, setInvoiceData] = useState<Partial<InsertTaxInvoice>>({
    code: "",
    type: "sales",
    date: new Date().toISOString().split('T')[0],
    partnerId: 0,
    amount: 0,
    taxAmount: 0,
    status: "draft",
    issuedAt: null,
    transactionId: null
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [issuedDate, setIssuedDate] = useState<Date | undefined>(undefined);
  
  // 세금계산서 목록 조회
  const { data: taxInvoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['/api/accounting/tax-invoices'],
    select: (data) => data as TaxInvoice[]
  });
  
  // 거래처 목록 조회
  const { data: partners = [] } = useQuery({
    queryKey: ['/api/partners'],
    select: (data) => data as Partner[]
  });
  
  // 미결제 거래 목록 조회
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/transactions");
      return await res.json();
    },
    select: (data) => data as Transaction[]
  });
  
  // 세금계산서 생성 뮤테이션
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InsertTaxInvoice) => {
      const res = await apiRequest("POST", "/api/accounting/tax-invoices", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/tax-invoices'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "등록 완료",
        description: "세금계산서가 성공적으로 등록되었습니다.",
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
  
  // 세금계산서 상태 변경 뮤테이션
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/accounting/tax-invoices/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/tax-invoices'] });
      toast({
        title: "상태 변경 완료",
        description: "세금계산서 상태가 성공적으로 변경되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 세금계산서 세금청 전송 뮤테이션
  const sendToTaxOfficeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/tax-invoices/${id}/submit`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/tax-invoices'] });
      toast({
        title: "전송 완료",
        description: "세금계산서가 국세청에 성공적으로 전송되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "전송 실패",
        description: "국세청 전송에 실패했습니다. API 키를 확인하세요.",
        variant: "destructive",
      });
    },
  });
  
  // 인쇄 핸들러
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: '세금계산서',
    onAfterPrint: () => console.log('인쇄 완료')
  });
  
  // 검색된 세금계산서 목록
  const filteredInvoices = taxInvoices.filter(invoice => 
    invoice.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.partner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 거래 선택 핸들러
  const handleSelectTransaction = (transactionId: number | null) => {
    if (!transactionId) {
      setInvoiceData({
        ...invoiceData,
        transactionId: null,
        amount: 0,
        taxAmount: 0,
        partnerId: 0
      });
      return;
    }
    
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
      const invoiceType = transaction.type === 'sale' ? 'sales' : 'purchase';
      const taxAmount = Math.round(transaction.totalAmount * 0.1); // 10% 세율
      
      setInvoiceData({
        ...invoiceData,
        transactionId,
        amount: transaction.totalAmount - taxAmount,
        taxAmount,
        partnerId: transaction.partnerId,
        type: invoiceType
      });
    }
  };
  
  // 거래처 선택 핸들러
  const handleSelectPartner = (partnerId: number) => {
    setInvoiceData({
      ...invoiceData,
      partnerId
    });
  };
  
  // 날짜 선택 핸들러
  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setInvoiceData({
        ...invoiceData,
        date: date.toISOString().split('T')[0]
      });
    }
  };
  
  // 발행일 선택 핸들러
  const handleSelectIssuedDate = (date: Date | undefined) => {
    if (date) {
      setIssuedDate(date);
      setInvoiceData({
        ...invoiceData,
        issuedAt: date.toISOString().split('T')[0],
        status: 'issued'
      });
    } else {
      setIssuedDate(undefined);
      setInvoiceData({
        ...invoiceData,
        issuedAt: null,
        status: 'draft'
      });
    }
  };
  
  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      const amount = parseInt(value) || 0;
      const taxAmount = Math.round(amount * 0.1); // 10% 세율
      
      setInvoiceData({
        ...invoiceData,
        amount,
        taxAmount
      });
    } else if (name === 'taxAmount') {
      setInvoiceData({
        ...invoiceData,
        taxAmount: parseInt(value) || 0
      });
    } else {
      setInvoiceData({
        ...invoiceData,
        [name]: value
      });
    }
  };
  
  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceData.partnerId || !invoiceData.amount || !invoiceData.code) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    createInvoiceMutation.mutate(invoiceData as InsertTaxInvoice);
  };
  
  // 폼 초기화
  const resetForm = () => {
    setInvoiceData({
      code: "",
      type: "sales",
      date: new Date().toISOString().split('T')[0],
      partnerId: 0,
      amount: 0,
      taxAmount: 0,
      status: "draft",
      issuedAt: null,
      transactionId: null
    });
    setSelectedDate(new Date());
    setIssuedDate(undefined);
  };
  
  // 코드 생성
  const generateCode = () => {
    const type = invoiceData.type === 'sales' ? "세금계산서" : "매입계산서";
    const today = new Date();
    const yearMonth = format(today, 'yyMM');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${type}-${yearMonth}-${randomNum}`;
    
    setInvoiceData({
      ...invoiceData,
      code
    });
  };
  
  // 세금계산서 미리보기
  const handlePreview = (invoice: TaxInvoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };
  
  // 세금계산서 국세청 전송
  const handleSubmitToTaxOffice = (id: number) => {
    sendToTaxOfficeMutation.mutate(id);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">세금계산서 관리</h1>
              <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                신규 작성
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
            
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="sales">매출 세금계산서</TabsTrigger>
                <TabsTrigger value="purchase">매입 세금계산서</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <TaxInvoicesTable 
                  invoices={filteredInvoices} 
                  isLoading={isLoadingInvoices}
                  partners={partners}
                  onPreview={handlePreview}
                  onStatusChange={updateInvoiceStatusMutation.mutate}
                  onSubmitToTaxOffice={handleSubmitToTaxOffice}
                />
              </TabsContent>
              
              <TabsContent value="sales">
                <TaxInvoicesTable 
                  invoices={filteredInvoices.filter(invoice => invoice.type === 'sales')} 
                  isLoading={isLoadingInvoices}
                  partners={partners}
                  onPreview={handlePreview}
                  onStatusChange={updateInvoiceStatusMutation.mutate}
                  onSubmitToTaxOffice={handleSubmitToTaxOffice}
                />
              </TabsContent>
              
              <TabsContent value="purchase">
                <TaxInvoicesTable 
                  invoices={filteredInvoices.filter(invoice => invoice.type === 'purchase')} 
                  isLoading={isLoadingInvoices}
                  partners={partners}
                  onPreview={handlePreview}
                  onStatusChange={updateInvoiceStatusMutation.mutate}
                  onSubmitToTaxOffice={handleSubmitToTaxOffice}
                />
              </TabsContent>
            </Tabs>
            
            {/* 세금계산서 작성 다이얼로그 */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>세금계산서 작성</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="space-y-2 flex-grow">
                      <Label htmlFor="code">문서번호</Label>
                      <div className="flex gap-2">
                        <Input
                          id="code"
                          name="code"
                          placeholder="문서번호를 입력하세요"
                          value={invoiceData.code}
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
                      <Label>작성일자</Label>
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
                    <Label htmlFor="type">세금계산서 종류</Label>
                    <Select 
                      defaultValue={invoiceData.type}
                      onValueChange={(value) => setInvoiceData({...invoiceData, type: value})}
                      disabled={invoiceData.transactionId !== null}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">매출 세금계산서</SelectItem>
                        <SelectItem value="purchase">매입 세금계산서</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="transaction">관련 거래</Label>
                    <Select 
                      onValueChange={(value) => handleSelectTransaction(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="관련 거래 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">거래 없음</SelectItem>
                        {transactions
                          .filter(tx => 
                            (invoiceData.type === 'sales' && tx.type === 'sale') || 
                            (invoiceData.type === 'purchase' && tx.type === 'purchase')
                          )
                          .map(transaction => (
                            <SelectItem key={transaction.id} value={transaction.id.toString()}>
                              {transaction.code} ({transaction.totalAmount.toLocaleString()}원)
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partnerId">
                      {invoiceData.type === 'sales' ? '공급받는자' : '공급자'}
                    </Label>
                    <Select 
                      onValueChange={(value) => handleSelectPartner(parseInt(value))}
                      defaultValue={invoiceData.partnerId?.toString()}
                      disabled={invoiceData.transactionId !== null}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="거래처 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {partners
                          .filter(partner => 
                            (invoiceData.type === 'sales' && partner.type === 'customer') || 
                            (invoiceData.type === 'purchase' && partner.type === 'supplier')
                          )
                          .map(partner => (
                            <SelectItem key={partner.id} value={partner.id.toString()}>
                              {partner.name} ({partner.businessNumber || '사업자번호 미등록'})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">공급가액</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        placeholder="공급가액을 입력하세요"
                        value={invoiceData.amount || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="taxAmount">세액</Label>
                      <Input
                        id="taxAmount"
                        name="taxAmount"
                        type="number"
                        placeholder="세액을 입력하세요"
                        value={invoiceData.taxAmount || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="issued"
                        checked={issuedDate !== undefined}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleSelectIssuedDate(new Date());
                          } else {
                            handleSelectIssuedDate(undefined);
                          }
                        }}
                      />
                      <Label htmlFor="issued">발행됨</Label>
                    </div>
                    
                    {issuedDate && (
                      <div className="pt-2">
                        <Label>발행일자</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !issuedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {issuedDate ? (
                                format(issuedDate, "PPP", { locale: ko })
                              ) : (
                                <span>발행일 선택</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={issuedDate}
                              onSelect={handleSelectIssuedDate}
                              initialFocus
                              locale={ko}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit" disabled={createInvoiceMutation.isPending}>
                      {createInvoiceMutation.isPending ? "처리 중..." : "저장"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* 세금계산서 미리보기 다이얼로그 */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>세금계산서 미리보기</DialogTitle>
                </DialogHeader>
                
                {selectedInvoice && (
                  <div ref={printRef} className="p-6 bg-white">
                    <div className="text-center font-bold text-2xl mb-4">
                      {selectedInvoice.type === 'sales' ? '(매출) 세금계산서' : '(매입) 세금계산서'}
                    </div>
                    
                    <div className="border border-gray-300 mb-6">
                      <div className="grid grid-cols-5 border-b border-gray-300">
                        <div className="col-span-3 grid grid-cols-3 border-r border-gray-300">
                          <div className="bg-gray-100 p-2 font-semibold text-center border-r border-gray-300">발행 번호</div>
                          <div className="col-span-2 p-2">{selectedInvoice.code}</div>
                        </div>
                        <div className="col-span-2 grid grid-cols-2">
                          <div className="bg-gray-100 p-2 font-semibold text-center border-r border-gray-300">작성일자</div>
                          <div className="p-2">{new Date(selectedInvoice.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2">
                        <div className="border-r border-gray-300">
                          <div className="bg-gray-200 p-2 font-bold text-center border-b border-gray-300">
                            {selectedInvoice.type === 'sales' ? '공급자' : '공급받는자'}
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">상호</span>
                              <span className="col-span-3">우리 회사</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">사업자번호</span>
                              <span className="col-span-3">123-45-67890</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">대표자</span>
                              <span className="col-span-3">홍길동</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">주소</span>
                              <span className="col-span-3">서울시 강남구 테헤란로 123</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">업태</span>
                              <span className="col-span-3">도소매</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="bg-gray-200 p-2 font-bold text-center border-b border-gray-300">
                            {selectedInvoice.type === 'sales' ? '공급받는자' : '공급자'}
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">상호</span>
                              <span className="col-span-3">{selectedInvoice.partner?.name || ''}</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">사업자번호</span>
                              <span className="col-span-3">{selectedInvoice.partner?.businessNumber || ''}</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">대표자</span>
                              <span className="col-span-3">{selectedInvoice.partner?.representative || ''}</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">주소</span>
                              <span className="col-span-3">{selectedInvoice.partner?.address || ''}</span>
                            </div>
                            <div className="grid grid-cols-4">
                              <span className="font-semibold">업태</span>
                              <span className="col-span-3">{selectedInvoice.partner?.businessType || ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-gray-300 mb-4">
                      <div className="grid grid-cols-10 border-b border-gray-300 bg-gray-100 text-center font-semibold">
                        <div className="p-2 border-r border-gray-300">일자</div>
                        <div className="p-2 border-r border-gray-300 col-span-4">품목</div>
                        <div className="p-2 border-r border-gray-300">규격</div>
                        <div className="p-2 border-r border-gray-300">수량</div>
                        <div className="p-2 border-r border-gray-300">단가</div>
                        <div className="p-2 border-r border-gray-300">공급가액</div>
                        <div className="p-2">세액</div>
                      </div>
                      
                      <div className="grid grid-cols-10 text-center">
                        <div className="p-2 border-r border-gray-300">{new Date(selectedInvoice.date).toLocaleDateString()}</div>
                        <div className="p-2 border-r border-gray-300 col-span-4 text-left">
                          {selectedInvoice.transaction 
                            ? `${selectedInvoice.transaction.type === 'sale' ? '매출' : '매입'} - ${selectedInvoice.transaction.code}`
                            : '일반 거래'
                          }
                        </div>
                        <div className="p-2 border-r border-gray-300">-</div>
                        <div className="p-2 border-r border-gray-300">1</div>
                        <div className="p-2 border-r border-gray-300">-</div>
                        <div className="p-2 border-r border-gray-300">{selectedInvoice.amount.toLocaleString()}</div>
                        <div className="p-2">{selectedInvoice.taxAmount.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 border border-gray-300">
                      <div className="p-2 bg-gray-100 font-semibold text-center border-r border-gray-300">합계금액</div>
                      <div className="p-2 text-right border-r border-gray-300 font-bold">
                        {(selectedInvoice.amount + selectedInvoice.taxAmount).toLocaleString()}원
                      </div>
                      <div className="p-2 bg-gray-100 font-semibold text-center border-r border-gray-300">상태</div>
                      <div className="p-2 col-span-2">
                        <span className={getInvoiceStatusClass(selectedInvoice.status)}>
                          {getInvoiceStatusText(selectedInvoice.status)}
                        </span>
                        {selectedInvoice.issuedAt && (
                          <span className="ml-2 text-sm text-gray-500">
                            발행일: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button onClick={handlePrint} className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    인쇄
                  </Button>
                  <Button onClick={() => setIsPreviewOpen(false)} variant="outline">
                    닫기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

// 세금계산서 상태 텍스트 변환
function getInvoiceStatusText(status: string) {
  const statuses: Record<string, string> = {
    'draft': '작성 중',
    'issued': '발행됨',
    'sent': '국세청 전송 완료',
    'confirmed': '승인됨',
    'rejected': '거부됨',
    'cancelled': '취소됨'
  };
  
  return statuses[status] || status;
}

// 세금계산서 상태 클래스 설정
function getInvoiceStatusClass(status: string) {
  const colors: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-800',
    'issued': 'bg-blue-100 text-blue-800',
    'sent': 'bg-indigo-100 text-indigo-800',
    'confirmed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'cancelled': 'bg-orange-100 text-orange-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// 거래처 이름 조회
function getPartnerName(partnerId: number, partners: Partner[]) {
  const partner = partners.find(p => p.id === partnerId);
  return partner ? partner.name : '-';
}

// 세금계산서 테이블 컴포넌트
interface TaxInvoicesTableProps {
  invoices: TaxInvoice[];
  isLoading: boolean;
  partners: Partner[];
  onPreview: (invoice: TaxInvoice) => void;
  onStatusChange: (data: { id: number, status: string }) => void;
  onSubmitToTaxOffice: (id: number) => void;
}

function TaxInvoicesTable({ 
  invoices, 
  isLoading, 
  partners, 
  onPreview, 
  onStatusChange,
  onSubmitToTaxOffice
}: TaxInvoicesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>문서번호</TableHead>
            <TableHead>거래처</TableHead>
            <TableHead>종류</TableHead>
            <TableHead>발행일</TableHead>
            <TableHead className="text-right">공급가액</TableHead>
            <TableHead className="text-right">세액</TableHead>
            <TableHead className="text-right">총액</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10">
                데이터를 불러오는 중...
              </TableCell>
            </TableRow>
          ) : invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10">
                등록된 세금계산서가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.code}</TableCell>
                <TableCell>{getPartnerName(invoice.partnerId, partners)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${invoice.type === 'sales' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                    {invoice.type === 'sales' ? '매출' : '매입'}
                  </span>
                </TableCell>
                <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">{invoice.amount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{invoice.taxAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{(invoice.amount + invoice.taxAmount).toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${getInvoiceStatusClass(invoice.status)}`}>
                    {getInvoiceStatusText(invoice.status)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPreview(invoice)}
                      title="미리보기"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    
                    {invoice.status === 'issued' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSubmitToTaxOffice(invoice.id)}
                        title="국세청 전송"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {invoice.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStatusChange({ id: invoice.id, status: 'issued' })}
                        title="발행하기"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}