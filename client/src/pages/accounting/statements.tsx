import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  TableFooter
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, Printer } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useReactToPrint } from 'react-to-print';
import { useRef } from "react";

export default function StatementsPage() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // 인쇄 핸들러
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: '재무제표',
    onAfterPrint: () => console.log('인쇄 완료')
  });
  
  // 손익계산서 데이터 조회
  const { data: incomeStatementData = {}, isLoading: isLoadingIncomeStatement } = useQuery({
    queryKey: ['/api/accounting/statements/income', startDate, endDate],
    queryFn: async () => {
      const from = format(startDate, 'yyyy-MM-dd');
      const to = format(endDate, 'yyyy-MM-dd');
      const res = await apiRequest("GET", `/api/accounting/statements/income?from=${from}&to=${to}`);
      return await res.json();
    }
  });
  
  // 재무상태표 데이터 조회
  const { data: balanceSheetData = {}, isLoading: isLoadingBalanceSheet } = useQuery({
    queryKey: ['/api/accounting/statements/balance', endDate],
    queryFn: async () => {
      const date = format(endDate, 'yyyy-MM-dd');
      const res = await apiRequest("GET", `/api/accounting/statements/balance?date=${date}`);
      return await res.json();
    }
  });
  
  // 현금흐름표 데이터 조회
  const { data: cashFlowData = {}, isLoading: isLoadingCashFlow } = useQuery({
    queryKey: ['/api/accounting/statements/cashflow', startDate, endDate],
    queryFn: async () => {
      const from = format(startDate, 'yyyy-MM-dd');
      const to = format(endDate, 'yyyy-MM-dd');
      const res = await apiRequest("GET", `/api/accounting/statements/cashflow?from=${from}&to=${to}`);
      return await res.json();
    }
  });
  
  // 월별 판매/매출 차트 데이터 조회
  const { data: monthlyData = [], isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['/api/accounting/monthly', startDate, endDate],
    queryFn: async () => {
      const from = format(startDate, 'yyyy-MM-dd');
      const to = format(endDate, 'yyyy-MM-dd');
      const res = await apiRequest("GET", `/api/accounting/monthly?from=${from}&to=${to}`);
      return await res.json();
    }
  });
  
  // 매출/비용 데이터 포맷팅
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(amount);
  };
  
  // 종류별 데이터 합계 계산
  const calculateTotal = (items: any[]) => {
    return items ? items.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
  };
  
  // 데이터 로딩 중 표시
  const isLoading = isLoadingIncomeStatement || isLoadingBalanceSheet || isLoadingCashFlow || isLoadingMonthly;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">재무제표</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? (
                              format(startDate, "PPP", { locale: ko })
                            ) : (
                              <span>시작일</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(date)}
                            initialFocus
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? (
                              format(endDate, "PPP", { locale: ko })
                            ) : (
                              <span>종료일</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            initialFocus
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  인쇄
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard 
                title="총 매출" 
                value={`${formatAmount(incomeStatementData.totalRevenue || 0)}원`} 
                label={`${format(startDate, 'yyyy.MM.dd')} ~ ${format(endDate, 'yyyy.MM.dd')}`}
              />
              <StatsCard 
                title="총 비용" 
                value={`${formatAmount(incomeStatementData.totalExpenses || 0)}원`} 
                label={`${format(startDate, 'yyyy.MM.dd')} ~ ${format(endDate, 'yyyy.MM.dd')}`}
              />
              <StatsCard 
                title="순이익" 
                value={`${formatAmount((incomeStatementData.totalRevenue || 0) - (incomeStatementData.totalExpenses || 0))}원`} 
                label={`${format(startDate, 'yyyy.MM.dd')} ~ ${format(endDate, 'yyyy.MM.dd')}`}
              />
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${formatAmount(value as number)}원`} />
                  <Legend />
                  <Bar dataKey="revenue" name="매출" fill="#4f46e5" />
                  <Bar dataKey="expenses" name="비용" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div ref={printRef}>
              <Tabs defaultValue="income">
                <TabsList className="mb-4">
                  <TabsTrigger value="income">손익계산서</TabsTrigger>
                  <TabsTrigger value="balance">재무상태표</TabsTrigger>
                  <TabsTrigger value="cash-flow">현금흐름표</TabsTrigger>
                </TabsList>
                
                <TabsContent value="income">
                  <Card>
                    <CardHeader className="text-center">
                      <CardTitle>손익계산서</CardTitle>
                      <p className="text-sm text-gray-500">
                        {format(startDate, 'yyyy년 MM월 dd일')} ~ {format(endDate, 'yyyy년 MM월 dd일')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-3/5">계정</TableHead>
                            <TableHead className="text-right">금액</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingIncomeStatement ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-10">
                                데이터를 불러오는 중...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              <TableRow>
                                <TableCell colSpan={2} className="font-bold bg-gray-50">매출</TableCell>
                              </TableRow>
                              {incomeStatementData.revenue && incomeStatementData.revenue.map((item: any, index: number) => (
                                <TableRow key={`revenue-${index}`}>
                                  <TableCell className="pl-8">{item.name}</TableCell>
                                  <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-bold">총 매출</TableCell>
                                <TableCell className="text-right font-bold">{formatAmount(incomeStatementData.totalRevenue || 0)}원</TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell colSpan={2} className="font-bold bg-gray-50">비용</TableCell>
                              </TableRow>
                              {incomeStatementData.expenses && incomeStatementData.expenses.map((item: any, index: number) => (
                                <TableRow key={`expense-${index}`}>
                                  <TableCell className="pl-8">{item.name}</TableCell>
                                  <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-bold">총 비용</TableCell>
                                <TableCell className="text-right font-bold">{formatAmount(incomeStatementData.totalExpenses || 0)}원</TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell className="font-bold">순이익</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatAmount((incomeStatementData.totalRevenue || 0) - (incomeStatementData.totalExpenses || 0))}원
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="balance">
                  <Card>
                    <CardHeader className="text-center">
                      <CardTitle>재무상태표</CardTitle>
                      <p className="text-sm text-gray-500">
                        {format(endDate, 'yyyy년 MM월 dd일')} 기준
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-lg font-bold mb-2">자산</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>항목</TableHead>
                                <TableHead className="text-right">금액</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingBalanceSheet ? (
                                <TableRow>
                                  <TableCell colSpan={2} className="text-center py-10">
                                    데이터를 불러오는 중...
                                  </TableCell>
                                </TableRow>
                              ) : (
                                <>
                                  <TableRow>
                                    <TableCell colSpan={2} className="font-bold bg-gray-50">유동자산</TableCell>
                                  </TableRow>
                                  {balanceSheetData.currentAssets && balanceSheetData.currentAssets.map((item: any, index: number) => (
                                    <TableRow key={`current-asset-${index}`}>
                                      <TableCell className="pl-8">{item.name}</TableCell>
                                      <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell className="font-bold">유동자산 소계</TableCell>
                                    <TableCell className="text-right font-bold">{formatAmount(calculateTotal(balanceSheetData.currentAssets))}원</TableCell>
                                  </TableRow>
                                  
                                  <TableRow>
                                    <TableCell colSpan={2} className="font-bold bg-gray-50">비유동자산</TableCell>
                                  </TableRow>
                                  {balanceSheetData.nonCurrentAssets && balanceSheetData.nonCurrentAssets.map((item: any, index: number) => (
                                    <TableRow key={`non-current-asset-${index}`}>
                                      <TableCell className="pl-8">{item.name}</TableCell>
                                      <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell className="font-bold">비유동자산 소계</TableCell>
                                    <TableCell className="text-right font-bold">{formatAmount(calculateTotal(balanceSheetData.nonCurrentAssets))}원</TableCell>
                                  </TableRow>
                                </>
                              )}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell className="font-bold">자산 총계</TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatAmount(
                                    calculateTotal(balanceSheetData.currentAssets) + 
                                    calculateTotal(balanceSheetData.nonCurrentAssets)
                                  )}원
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-bold mb-2">부채 및 자본</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>항목</TableHead>
                                <TableHead className="text-right">금액</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingBalanceSheet ? (
                                <TableRow>
                                  <TableCell colSpan={2} className="text-center py-10">
                                    데이터를 불러오는 중...
                                  </TableCell>
                                </TableRow>
                              ) : (
                                <>
                                  <TableRow>
                                    <TableCell colSpan={2} className="font-bold bg-gray-50">유동부채</TableCell>
                                  </TableRow>
                                  {balanceSheetData.currentLiabilities && balanceSheetData.currentLiabilities.map((item: any, index: number) => (
                                    <TableRow key={`current-liability-${index}`}>
                                      <TableCell className="pl-8">{item.name}</TableCell>
                                      <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell className="font-bold">유동부채 소계</TableCell>
                                    <TableCell className="text-right font-bold">{formatAmount(calculateTotal(balanceSheetData.currentLiabilities))}원</TableCell>
                                  </TableRow>
                                  
                                  <TableRow>
                                    <TableCell colSpan={2} className="font-bold bg-gray-50">비유동부채</TableCell>
                                  </TableRow>
                                  {balanceSheetData.nonCurrentLiabilities && balanceSheetData.nonCurrentLiabilities.map((item: any, index: number) => (
                                    <TableRow key={`non-current-liability-${index}`}>
                                      <TableCell className="pl-8">{item.name}</TableCell>
                                      <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell className="font-bold">비유동부채 소계</TableCell>
                                    <TableCell className="text-right font-bold">{formatAmount(calculateTotal(balanceSheetData.nonCurrentLiabilities))}원</TableCell>
                                  </TableRow>
                                  
                                  <TableRow>
                                    <TableCell className="font-bold">부채 총계</TableCell>
                                    <TableCell className="text-right font-bold">
                                      {formatAmount(
                                        calculateTotal(balanceSheetData.currentLiabilities) + 
                                        calculateTotal(balanceSheetData.nonCurrentLiabilities)
                                      )}원
                                    </TableCell>
                                  </TableRow>
                                  
                                  <TableRow>
                                    <TableCell colSpan={2} className="font-bold bg-gray-50">자본</TableCell>
                                  </TableRow>
                                  {balanceSheetData.equity && balanceSheetData.equity.map((item: any, index: number) => (
                                    <TableRow key={`equity-${index}`}>
                                      <TableCell className="pl-8">{item.name}</TableCell>
                                      <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell className="font-bold">자본 총계</TableCell>
                                    <TableCell className="text-right font-bold">{formatAmount(calculateTotal(balanceSheetData.equity))}원</TableCell>
                                  </TableRow>
                                </>
                              )}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell className="font-bold">부채 및 자본 총계</TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatAmount(
                                    calculateTotal(balanceSheetData.currentLiabilities) + 
                                    calculateTotal(balanceSheetData.nonCurrentLiabilities) +
                                    calculateTotal(balanceSheetData.equity)
                                  )}원
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="cash-flow">
                  <Card>
                    <CardHeader className="text-center">
                      <CardTitle>현금흐름표</CardTitle>
                      <p className="text-sm text-gray-500">
                        {format(startDate, 'yyyy년 MM월 dd일')} ~ {format(endDate, 'yyyy년 MM월 dd일')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-3/5">항목</TableHead>
                            <TableHead className="text-right">금액</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingCashFlow ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-10">
                                데이터를 불러오는 중...
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              <TableRow>
                                <TableCell className="font-bold">기초 현금 및 현금성 자산</TableCell>
                                <TableCell className="text-right">{formatAmount(cashFlowData.beginningCash || 0)}원</TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell colSpan={2} className="font-bold bg-gray-50">영업활동 현금흐름</TableCell>
                              </TableRow>
                              {cashFlowData.operatingActivities && cashFlowData.operatingActivities.map((item: any, index: number) => (
                                <TableRow key={`operating-${index}`}>
                                  <TableCell className="pl-8">{item.name}</TableCell>
                                  <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-bold">영업활동 현금흐름 소계</TableCell>
                                <TableCell className="text-right font-bold">{formatAmount(calculateTotal(cashFlowData.operatingActivities))}원</TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell colSpan={2} className="font-bold bg-gray-50">투자활동 현금흐름</TableCell>
                              </TableRow>
                              {cashFlowData.investingActivities && cashFlowData.investingActivities.map((item: any, index: number) => (
                                <TableRow key={`investing-${index}`}>
                                  <TableCell className="pl-8">{item.name}</TableCell>
                                  <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-bold">투자활동 현금흐름 소계</TableCell>
                                <TableCell className="text-right font-bold">{formatAmount(calculateTotal(cashFlowData.investingActivities))}원</TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell colSpan={2} className="font-bold bg-gray-50">재무활동 현금흐름</TableCell>
                              </TableRow>
                              {cashFlowData.financingActivities && cashFlowData.financingActivities.map((item: any, index: number) => (
                                <TableRow key={`financing-${index}`}>
                                  <TableCell className="pl-8">{item.name}</TableCell>
                                  <TableCell className="text-right">{formatAmount(item.amount)}원</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-bold">재무활동 현금흐름 소계</TableCell>
                                <TableCell className="text-right font-bold">{formatAmount(calculateTotal(cashFlowData.financingActivities))}원</TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell className="font-bold">현금흐름 순증감</TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatAmount(
                                    calculateTotal(cashFlowData.operatingActivities) + 
                                    calculateTotal(cashFlowData.investingActivities) +
                                    calculateTotal(cashFlowData.financingActivities)
                                  )}원
                                </TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell className="font-bold">기말 현금 및 현금성 자산</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatAmount(
                                (cashFlowData.beginningCash || 0) + 
                                calculateTotal(cashFlowData.operatingActivities) + 
                                calculateTotal(cashFlowData.investingActivities) +
                                calculateTotal(cashFlowData.financingActivities)
                              )}원
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatsCard({ title, value, label }: { title: string, value: string, label?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </CardContent>
    </Card>
  );
}