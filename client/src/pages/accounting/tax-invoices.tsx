import { useState, useEffect } from "react";
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
import { CalendarIcon, Download, Plus, Printer, Search, Send, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import axios from "axios";

// TaxInvoice 타입에 taxRate를 추가 (schema.ts에 추가되었으므로 여기서는 확장하여 사용)
interface ExtendedTaxInvoice extends TaxInvoice {
  taxRate: number;
}

export default function TaxInvoicesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<ExtendedTaxInvoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [invoiceData, setInvoiceData] = useState<Partial<InsertTaxInvoice> & { taxRate?: number }>({
    code: "",
    type: "sales",
    date: new Date().toISOString().split('T')[0],
    partnerId: 0,
    netAmount: 0,
    taxRate: 10, // 기본값 10%
    taxAmount: 0,
    totalAmount: 0,
    status: "draft",
    transactionId: null
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [issuedDate, setIssuedDate] = useState<Date | undefined>(undefined);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<ExtendedTaxInvoice | null>(null);
  const [editType, setEditType] = useState('');
  
  useEffect(() => {
    if (isEditDialogOpen && editInvoice) {
      let mappedType = editInvoice.type;
      if (editInvoice.type === 'issue') mappedType = 'sales';
      else if (editInvoice.type === 'receive') mappedType = 'purchase';
      
      setEditType(mappedType);
      setEditInvoice({
        ...editInvoice,
        taxRate: editInvoice.netAmount ? Math.round((editInvoice.taxAmount / editInvoice.netAmount) * 100) : 10
      });
    }
  }, [isEditDialogOpen, editInvoice]);
  
  // 세금계산서 목록 조회
  const { data: taxInvoices = [], isLoading: isLoadingInvoices, refetch } = useQuery({
    queryKey: ['/api/accounting/tax-invoices'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/accounting/tax-invoices");
      return await res.json();
    },
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
      refetch();
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
  
  // 세금계산서 삭제 뮤테이션
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/tax-invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/tax-invoices'] });
      refetch();
      toast({ title: "삭제 완료", description: "세금계산서가 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    }
  });
  
  // 인쇄 핸들러
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: '세금계산서',
    onAfterPrint: () => console.log('인쇄 완료')
  });
  
  // 검색된 세금계산서 목록
  const filteredInvoices = taxInvoices.filter(invoice => 
    invoice.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (partners.find(p => p.id === invoice.partnerId)?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 거래 선택 핸들러
  const handleSelectTransaction = (transactionId: number | null) => {
    if (!transactionId) {
      setInvoiceData({
        ...invoiceData,
        transactionId: null,
        netAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        partnerId: 0
      });
      return;
    }
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
      const invoiceType = transaction.type === 'sale' ? 'sales' : 'purchase';
      const taxAmount = Math.round(transaction.totalAmount * 0.1); // 10% 세율
      const netAmount = transaction.totalAmount - taxAmount;
      setInvoiceData({
        ...invoiceData,
        transactionId,
        netAmount,
        taxAmount,
        totalAmount: netAmount + taxAmount,
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
        status: 'issued'
      });
    } else {
      setIssuedDate(undefined);
      setInvoiceData({
        ...invoiceData,
        status: 'draft'
      });
    }
  };
  
  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'netAmount' || name === 'taxRate') {
      const netAmount = name === 'netAmount' ? parseInt(value) || 0 : invoiceData.netAmount || 0;
      const taxRate = name === 'taxRate' ? parseFloat(value) || 0 : invoiceData.taxRate || 10;
      const taxAmount = Math.round(netAmount * (taxRate / 100));
      setInvoiceData({
        ...invoiceData,
        netAmount,
        taxRate,
        taxAmount,
        totalAmount: netAmount + taxAmount
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
    if (!invoiceData.partnerId || !invoiceData.netAmount || !invoiceData.code) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    // type 변환
    const serverType = invoiceData.type === 'sales' ? 'issue' : 'receive';
    createInvoiceMutation.mutate({
      ...invoiceData,
      type: serverType,
    } as InsertTaxInvoice);
  };
  
  // 폼 초기화
  const resetForm = () => {
    setInvoiceData({
      code: "",
      type: "sales",
      date: new Date().toISOString().split('T')[0],
      partnerId: 0,
      netAmount: 0,
      taxRate: 10,
      taxAmount: 0,
      totalAmount: 0,
      status: "draft",
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
    setSelectedInvoice(invoice as ExtendedTaxInvoice);
    setIsPreviewOpen(true);
  };
  
  // 세금계산서 국세청 전송
  const handleSubmitToTaxOffice = (id: number) => {
    toast({ title: '국세청 전송은 추후 지원 예정입니다.', variant: 'destructive' });
  };

  // 수정 핸들러
  const handleEdit = (invoice: TaxInvoice) => {
    setEditInvoice(invoice as ExtendedTaxInvoice);
    setIsEditDialogOpen(true);
  };

  // 발행 핸들러
  const handlePublish = (invoice: TaxInvoice) => {
    updateInvoiceStatusMutation.mutate({ id: invoice.id, status: 'issued' });
  };

  // 삭제 핸들러
  const handleDelete = (id: number) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  // 1. 공급자 정보(환경설정에서 불러옴)
  const [myCompany, setMyCompany] = useState({
    businessNumber: "",
    name: "",
    contactName: "",
    address: "",
    type: "",
    category: ""
  });
  useEffect(() => {
    axios.get("/api/settings/company").then((res: any) => {
      setMyCompany({
        businessNumber: res.data.businessNumber || "",
        name: res.data.name || "",
        contactName: res.data.contactName || "",
        address: res.data.address || "",
        type: res.data.type || "",
        category: res.data.category || ""
      });
    });
  }, []);

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
                  onSubmitToTaxOffice={(id) => toast({ title: '국세청 전송은 추후 지원 예정입니다.', variant: 'destructive' })}
                  onEdit={handleEdit}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                />
              </TabsContent>
              
              <TabsContent value="sales">
                <TaxInvoicesTable 
                  invoices={filteredInvoices.filter(invoice => invoice.type === 'sales')} 
                  isLoading={isLoadingInvoices}
                  partners={partners}
                  onPreview={handlePreview}
                  onStatusChange={updateInvoiceStatusMutation.mutate}
                  onSubmitToTaxOffice={(id) => toast({ title: '국세청 전송은 추후 지원 예정입니다.', variant: 'destructive' })}
                  onEdit={handleEdit}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                />
              </TabsContent>
              
              <TabsContent value="purchase">
                <TaxInvoicesTable 
                  invoices={filteredInvoices.filter(invoice => invoice.type === 'purchase')} 
                  isLoading={isLoadingInvoices}
                  partners={partners}
                  onPreview={handlePreview}
                  onStatusChange={updateInvoiceStatusMutation.mutate}
                  onSubmitToTaxOffice={(id) => toast({ title: '국세청 전송은 추후 지원 예정입니다.', variant: 'destructive' })}
                  onEdit={handleEdit}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
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
                      onValueChange={(value) => handleSelectTransaction(value === "none" ? null : parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="관련 거래 선택 (선택사항)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">거래 없음</SelectItem>
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
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="netAmount">공급가액</Label>
                      <Input
                        id="netAmount"
                        name="netAmount"
                        type="number"
                        placeholder="공급가액을 입력하세요"
                        value={invoiceData.netAmount || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">세율(%)</Label>
                      <Input
                        id="taxRate"
                        name="taxRate"
                        type="number"
                        min={0}
                        max={100}
                        value={invoiceData.taxRate ?? 10}
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
                        placeholder="세액"
                        value={invoiceData.taxAmount || ''}
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">총액</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      placeholder="총액"
                      value={invoiceData.totalAmount || ''}
                      readOnly
                    />
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
            
            {/* 세금계산서 수정 다이얼로그 */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>세금계산서 수정</DialogTitle>
                </DialogHeader>
                {editInvoice && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    // 폼 데이터 수집
                    const form = e.currentTarget as HTMLFormElement;
                    const formData = new FormData(form);
                    // 저장 시 다시 'sales'/'purchase'를 'issue'/'receive'로 변환
                    let apiType = editType;
                    if (editType === 'sales') apiType = 'issue';
                    else if (editType === 'purchase') apiType = 'receive';
                    const updated = {
                      code: formData.get('code') as string,
                      type: apiType,
                      date: formData.get('date') as string,
                      partnerId: Number(formData.get('partnerId')),
                      netAmount: Number(formData.get('netAmount')),
                      taxRate: Number(formData.get('taxRate')), // taxRate 추가
                      taxAmount: Number(formData.get('taxAmount')),
                      totalAmount: Number(formData.get('totalAmount')),
                      status: editInvoice.status,
                      transactionId: editInvoice.transactionId
                    };
                    try {
                      await apiRequest('PATCH', `/api/accounting/tax-invoices/${editInvoice.id}`, updated);
                      setIsEditDialogOpen(false);
                      refetch();
                      toast({ title: '수정 완료', description: '세금계산서가 수정되었습니다.' });
                    } catch (err: any) {
                      toast({ title: '수정 실패', description: err.message, variant: 'destructive' });
                    }
                  }} className="space-y-4">
                    <div className="space-y-2 flex-grow">
                      <Label htmlFor="code">문서번호</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editInvoice.code}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">세금계산서 종류</Label>
                      <Select value={editType} onValueChange={setEditType}>
                        <SelectTrigger>
                          <SelectValue placeholder="세금계산서 종류" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">매출 세금계산서</SelectItem>
                          <SelectItem value="purchase">매입 세금계산서</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">작성일자</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={editInvoice.date}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerId">거래처</Label>
                      <Select name="partnerId" defaultValue={editInvoice.partnerId?.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="거래처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {partners.map(partner => (
                            <SelectItem key={partner.id} value={partner.id.toString()}>
                              {partner.name} ({partner.businessNumber || '사업자번호 미등록'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="netAmount">공급가액</Label>
                        <Input
                          id="netAmount"
                          name="netAmount"
                          type="number"
                          defaultValue={editInvoice.netAmount}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxRate">세율(%)</Label>
                        <Input
                          id="taxRate"
                          name="taxRate"
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={editInvoice.taxRate ?? 10}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxAmount">세액</Label>
                        <Input
                          id="taxAmount"
                          name="taxAmount"
                          type="number"
                          defaultValue={editInvoice.taxAmount}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">총액</Label>
                      <Input
                        id="totalAmount"
                        name="totalAmount"
                        type="number"
                        defaultValue={editInvoice.totalAmount}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">저장</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
            
            {/* 세금계산서 미리보기 다이얼로그 */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>세금계산서 미리보기</DialogTitle>
                </DialogHeader>
                {selectedInvoice && (
                  <div ref={printRef} className="p-6 bg-white space-y-12">
                    {/* 2종(공급받는자/공급자) 한 번에 표시 - 첨부 이미지와 최대한 동일하게 구현 */}
                    {[
                      { label: '공급받는자 보관용', color: '#0033cc', border: 'blue' },
                      { label: '공급자 보관용', color: '#cc0000', border: 'red' },
                    ].map(({ label, color, border }) => (
                      <div key={label} className="flex flex-col items-center">
                        <div className="w-full max-w-[600px] bg-white p-2 rounded shadow border overflow-x-auto" style={{ borderColor: color }}>
                          <style>{`
                            .tax-invoice-table-${border} { border-collapse: collapse; width: 100%; font-family: '돋움', Dotum, Arial, sans-serif; font-size: 12px; color: ${color}; }
                            .tax-invoice-table-${border} th, .tax-invoice-table-${border} td { border: 1px solid ${color}; text-align: center; padding: 1px; height: 20px; vertical-align: middle; }
                            .tax-invoice-table-${border} .double-border-left { border-left: 2px solid ${color}; }
                            .tax-invoice-table-${border} .double-border-right { border-right: 2px solid ${color}; }
                            .tax-invoice-table-${border} .double-border-top { border-top: 2px solid ${color}; }
                            .tax-invoice-table-${border} .double-border-bottom { border-bottom: 2px solid ${color}; }
                            .tax-invoice-table-${border} .title { font-size: 22px; font-weight: bold; letter-spacing: 10px; border: none; text-align: center; padding: 10px 0 5px 0; height: auto; }
                            .tax-invoice-table-${border} .sub-label { font-size: 10px; font-weight: bold; border: none; text-align: right; padding-right: 4px; height: auto; }
                            .tax-invoice-table-${border} .small-text { font-size: 7pt; }
                            .tax-invoice-table-${border} .no-border { border: none !important; }
                            .tax-invoice-table-${border} .text-left { text-align: left !important; padding-left: 3px; }
                            .tax-invoice-table-${border} .text-right { text-align: right !important; padding-right: 3px; }
                            .tax-invoice-table-${border} .text-center { text-align: center !important; }
                            .tax-invoice-table-${border} .font-batang { font-family: '바탕', Batang, serif; }
                            .tax-invoice-table-${border} .font-gulim { font-family: '굴림', Gulim, sans-serif; }
                            .tax-invoice-table-${border} .pt-1 { padding-top: 1px; }
                            .tax-invoice-table-${border} .item-row td { height: 20px; } /* Fixed height for item rows */
                            .tax-invoice-table-${border} .header-cell { height: 22px; } 
                          `}</style>
                          <div style={{maxHeight: 'none', overflowY: 'auto'}}>
                            <table className={`tax-invoice-table-${border}`}>
                              <tbody>
                                <tr style={{height: '12pt'}}>
                                  <td colSpan={33} className="no-border text-left small-text pt-1">[별지 제11호 서식]</td>
                                </tr>
                                <tr style={{height: '20.1pt'}}>
                                  <td colSpan={15} rowSpan={2} className="title" style={{color: color, letterSpacing: border === 'blue' ? '10px' : '15px', fontSize: border === 'blue' ? '22pt': '22pt'}}>{border === 'blue' ? '세 금 계 산 서' : '세금계산서'}</td>
                                  <td rowSpan={2} className="sub-label text-center" style={{color: color}}>(</td>
                                  <td colSpan={5} className="sub-label text-center" style={{color: color, fontWeight: 'bold'}}>{label.includes('공급받는자') ? '공급받는자' : '공  급  자'}</td>
                                  <td rowSpan={2} className="sub-label text-center" style={{color: color}}>)</td>
                                  <td colSpan={4} className="header-cell">책&nbsp;&nbsp;&nbsp;번&nbsp;&nbsp;&nbsp;호</td>
                                  <td className="header-cell"></td>
                                  <td className="header-cell"></td>
                                  <td className="header-cell font-gulim">권</td>
                                  <td className="header-cell"></td>
                                  <td className="header-cell"></td>
                                  <td className="double-border-right header-cell font-gulim">호</td>
                                </tr>
                                <tr style={{height: '19.5pt'}}>
                                  <td colSpan={5} className="sub-label text-center" style={{color: color, fontWeight: 'bold'}}>보&nbsp;&nbsp;관&nbsp;&nbsp;용</td>
                                  <td colSpan={4} className="header-cell">일&nbsp;련&nbsp;번&nbsp;호</td>
                                  <td colSpan={5} className="double-border-right header-cell text-left">{selectedInvoice.code}</td>
                                </tr>
                                <tr>
                                  <td rowSpan={8} className="double-border-left double-border-top double-border-bottom font-gulim" style={{writingMode: 'vertical-rl', width: '25px'}}>공&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;급&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;자</td>
                                  <td colSpan={3} rowSpan={2} className="double-border-top header-cell">등록번호</td>
                                  <td colSpan={11} rowSpan={2} className="double-border-top double-border-right header-cell text-left font-batang">
                                    {myCompany.businessNumber?.split('').join(' ')}
                                  </td>
                                  <td rowSpan={8} className="double-border-left double-border-top double-border-bottom font-gulim" style={{writingMode: 'vertical-rl', width: '25px'}}>공급받는자</td>
                                  <td colSpan={3} rowSpan={2} className="double-border-top header-cell">등록번호</td>
                                  <td colSpan={11} rowSpan={2} className="double-border-top double-border-right header-cell text-left font-batang">
                                    {(partners.find(p => p.id === selectedInvoice.partnerId)?.businessNumber || '')?.split('').join(' ')}
                                  </td>
                                </tr>
                                <tr></tr>
                                <tr>
                                  <td colSpan={3} className="header-cell">상&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;호</td>
                                  <td colSpan={6} className="header-cell text-left">{myCompany.name}</td>
                                  <td rowSpan={2} className="header-cell">성명</td>
                                  <td colSpan={4} rowSpan={2} className="double-border-right header-cell text-left">{myCompany.contactName}</td>
                                  <td colSpan={3} className="header-cell">상&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;호</td>
                                  <td colSpan={6} className="header-cell text-left">{partners.find(p=>p.id === selectedInvoice.partnerId)?.name}</td>
                                  <td rowSpan={2} className="header-cell">성명</td>
                                  <td colSpan={4} rowSpan={2} className="double-border-right header-cell text-left">{partners.find(p=>p.id === selectedInvoice.partnerId)?.contactName}</td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="header-cell">(법인명)</td>
                                  <td colSpan={6} className="text-left"></td>
                                  <td colSpan={3} className="header-cell">(법인명)</td>
                                  <td colSpan={6} className="text-left"></td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="header-cell">사&nbsp;업&nbsp;장</td>
                                  <td colSpan={11} rowSpan={2} className="double-border-right header-cell text-left">{myCompany.address}</td>
                                  <td colSpan={3} className="header-cell">사&nbsp;업&nbsp;장</td>
                                  <td colSpan={11} rowSpan={2} className="double-border-right header-cell text-left">{partners.find(p=>p.id === selectedInvoice.partnerId)?.address}</td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="header-cell">주&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;소</td>
                                  <td colSpan={3} className="header-cell">주&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;소</td>
                                </tr>
                                <tr>
                                  <td colSpan={3} rowSpan={2} className="double-border-bottom header-cell">업&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;태</td>
                                  <td colSpan={6} rowSpan={2} className="double-border-bottom header-cell text-left">{myCompany.type}</td>
                                  <td rowSpan={2} className="double-border-bottom header-cell">종목</td>
                                  <td colSpan={4} rowSpan={2} className="double-border-bottom double-border-right header-cell text-left">{myCompany.category}</td>
                                  <td colSpan={3} rowSpan={2} className="double-border-bottom header-cell">업&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;태</td>
                                  <td colSpan={6} rowSpan={2} className="double-border-bottom header-cell text-left">{partners.find(p=>p.id === selectedInvoice.partnerId)?.type}</td>
                                  <td rowSpan={2} className="double-border-bottom header-cell">종목</td>
                                  <td colSpan={4} rowSpan={2} className="double-border-bottom double-border-right header-cell text-left">{(partners.find(p => p.id === selectedInvoice.partnerId) as any)?.category || ''}</td>
                                </tr>
                                <tr></tr>
                                <tr className="header-cell">
                                  <td colSpan={4} className="double-border-left double-border-top font-gulim">작&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;성</td>
                                  <td colSpan={13} className="double-border-top font-gulim">공&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;급&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;가&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;액</td>
                                  <td colSpan={10} className="double-border-top font-gulim">세&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;액</td>
                                  <td colSpan={5} className="double-border-top double-border-right font-gulim">비&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;고</td>
                                </tr>
                                <tr className="font-gulim header-cell">
                                  <td colSpan={2} className="double-border-left">년</td>
                                  <td>월</td>
                                  <td>일</td>
                                  <td colSpan={2}>공란수</td>
                                  <td>백</td>
                                  <td>십</td>
                                  <td>억</td>
                                  <td>천</td>
                                  <td>백</td>
                                  <td>십</td>
                                  <td>만</td>
                                  <td>천</td>
                                  <td>백</td>
                                  <td>십</td>
                                  <td>일</td>
                                  <td>십</td>
                                  <td>억</td>
                                  <td>천</td>
                                  <td>백</td>
                                  <td>십</td>
                                  <td>만</td>
                                  <td>천</td>
                                  <td>백</td>
                                  <td>십</td>
                                  <td>일</td>
                                  <td colSpan={5} rowSpan={2} className="double-border-right double-border-bottom"></td>
                                </tr>
                                <tr className="font-batang header-cell" style={{height: '15pt'}}>
                                  <td colSpan={2} className="double-border-left double-border-bottom text-center">{selectedInvoice?.date ? new Date(selectedInvoice.date).getFullYear() : ''}</td>
                                  <td className="double-border-bottom text-center">{selectedInvoice?.date ? new Date(selectedInvoice.date).getMonth() + 1 : ''}</td>
                                  <td className="double-border-bottom text-center">{selectedInvoice?.date ? new Date(selectedInvoice.date).getDate() : ''}</td>
                                  <td colSpan={2} className="double-border-bottom"></td> {/* 공란수 */}
                                  {Array.from(((selectedInvoice?.netAmount || 0).toString()).padStart(12, ' ')).map((char, i) => <td key={i} className="double-border-bottom">{char === ' ' ? '' : char}</td>)}
                                  {Array.from(((selectedInvoice?.taxAmount || 0).toString()).padStart(10, ' ')).map((char, i) => <td key={i} className="double-border-bottom">{char === ' ' ? '' : char}</td>)}
                                </tr>
                                <tr className="font-gulim header-cell">
                                  <td className="double-border-left">월</td>
                                  <td>일</td>
                                  <td colSpan={6}>품&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목</td>
                                  <td colSpan={4}>규&nbsp;&nbsp;&nbsp;&nbsp;격</td>
                                  <td colSpan={2}>수&nbsp;&nbsp;&nbsp;&nbsp;량</td>
                                  <td colSpan={5}>단&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;가</td>
                                  <td colSpan={6}>공&nbsp;&nbsp;급&nbsp;&nbsp;가&nbsp;&nbsp;액</td>
                                  <td colSpan={5}>세&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;액</td>
                                  <td colSpan={2} className="double-border-right">비고</td>
                                </tr>
                                {([...Array(4)]).map((_, idx) => (
                                  <tr key={`item-${idx}`} className="item-row font-batang">
                                    <td className="double-border-left">{idx === 0 && selectedInvoice?.date ? new Date(selectedInvoice.date).getMonth() + 1 : ''}</td>
                                    <td>{idx === 0 && selectedInvoice?.date ? new Date(selectedInvoice.date).getDate() : ''}</td>
                                    <td colSpan={6} className="text-left">
                                      {idx === 0 ? (selectedInvoice.transactionId && transactions.find(t => t.id === selectedInvoice.transactionId)?.notes) || '일반 거래 품목' : ''}
                                    </td>
                                    <td colSpan={4}></td> {/* 규격 */}
                                    <td colSpan={2}></td> {/* 수량 */}
                                    <td colSpan={5}></td> {/* 단가 */}
                                    <td colSpan={6} className="text-right">{idx === 0 ? selectedInvoice.netAmount.toLocaleString() : ''}</td>
                                    <td colSpan={5} className="text-right">{idx === 0 ? selectedInvoice.taxAmount.toLocaleString() : ''}</td>
                                    <td colSpan={2} className="double-border-right"></td> {/* 비고 */}
                                  </tr>
                                ))}
                                <tr className="font-gulim header-cell">
                                  <td colSpan={5} className="double-border-left double-border-bottom">합&nbsp;계&nbsp;금&nbsp;액</td>
                                  <td colSpan={5} className="double-border-bottom">현&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;금</td>
                                  <td colSpan={5} className="double-border-bottom">수&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;표</td>
                                  <td colSpan={5} className="double-border-bottom">어&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;음</td>
                                  <td colSpan={5} className="double-border-bottom">외상미수금</td>
                                  <td colSpan={4} rowSpan={2} className="double-border-bottom text-center">이 금액을</td>
                                  <td colSpan={2} rowSpan={2} className="double-border-bottom text-center font-batang" style={{fontWeight: 'bold', fontSize: border === 'blue' ? '9pt' : '7pt'}}>영수<br/>청구</td>
                                  <td rowSpan={2} className="double-border-right double-border-bottom text-center">함</td>
                                </tr>
                                <tr className="font-batang header-cell" style={{height: '20.1pt'}}>
                                  <td colSpan={5} className="double-border-left double-border-bottom text-right">{(selectedInvoice.netAmount + selectedInvoice.taxAmount).toLocaleString()}</td>
                                  <td colSpan={5} className="double-border-bottom"></td> {/* 현금 */}
                                  <td colSpan={5} className="double-border-bottom"></td> {/* 수표 */}
                                  <td colSpan={5} className="double-border-bottom"></td> {/* 어음 */}
                                  <td colSpan={5} className="double-border-bottom text-right">{(selectedInvoice.netAmount + selectedInvoice.taxAmount).toLocaleString()}</td> {/* 외상미수금 */}
                                </tr>
                                <tr style={{height: '12pt'}}>
                                  <td colSpan={15} className="no-border text-left small-text double-border-left pt-1">22226-28131일 '96.3.27승인</td>
                                  <td colSpan={17} className="no-border text-left small-text double-border-right pt-1">인쇄용지(특급)34g/m² 182mm×128mm</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

// 세금계산서 종류 변환 함수
function getInvoiceTypeLabel(type: string) {
  if (type === 'sales' || type === 'issue') return '매출';
  if (type === 'purchase' || type === 'receive') return '매입';
  return type;
}

function getInvoiceTypeClass(type: string) {
  if (type === 'sales' || type === 'issue') return 'bg-blue-100 text-blue-800';
  if (type === 'purchase' || type === 'receive') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-800';
}

// 세금계산서 테이블 컴포넌트
interface TaxInvoicesTableProps {
  invoices: TaxInvoice[];
  isLoading: boolean;
  partners: Partner[];
  onPreview: (invoice: TaxInvoice) => void;
  onStatusChange: (data: { id: number, status: string }) => void;
  onSubmitToTaxOffice: (id: number) => void;
  onEdit: (invoice: TaxInvoice) => void;
  onPublish: (invoice: TaxInvoice) => void;
  onDelete: (id: number) => void;
}

function TaxInvoicesTable({ 
  invoices, 
  isLoading, 
  partners, 
  onPreview, 
  onStatusChange,
  onSubmitToTaxOffice,
  onEdit,
  onPublish,
  onDelete
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
                  <span className={`px-2 py-1 text-xs rounded-full ${getInvoiceTypeClass(invoice.type)}`}>
                    {getInvoiceTypeLabel(invoice.type)}
                  </span>
                </TableCell>
                <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">{invoice.netAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{invoice.taxAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{(invoice.netAmount + invoice.taxAmount).toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${getInvoiceStatusClass(invoice.status)}`}>
                    {getInvoiceStatusText(invoice.status)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onPreview(invoice)}>
                        <Printer className="mr-2 h-4 w-4" />
                        미리보기
                      </DropdownMenuItem>
                      {invoice.status === 'draft' && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(invoice)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPublish(invoice)}>
                            <Download className="mr-2 h-4 w-4" />
                            발행
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(invoice.id)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSubmitToTaxOffice(invoice.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            국세청 전송
                          </DropdownMenuItem>
                        </>
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
  );
}