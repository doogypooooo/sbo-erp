import { useState } from "react";
import { DateRange } from "react-day-picker";
import { addMonths } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import StatCard from "@/components/dashboard/stat-card";
import TransactionTable from "@/components/dashboard/transaction-table";
import SalesChart from "@/components/dashboard/sales-chart";
import TopItems from "@/components/dashboard/top-items";
import Notifications from "@/components/dashboard/notifications";
import UpcomingTasks from "@/components/dashboard/upcoming-tasks";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCcw } from "lucide-react";

export default function Dashboard() {
  // 날짜 범위 상태
  const defaultDateRange = {
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  };
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  
  // 대시보드 데이터 조회
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard", dateRange],
    queryFn: async () => {
      const from = dateRange?.from?.toISOString() || "";
      const to = dateRange?.to?.toISOString() || "";
      
      const response = await fetch(`/api/dashboard?from=${from}&to=${to}`);
      
      if (!response.ok) {
        throw new Error("대시보드 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  // 새로고침 핸들러
  const handleRefresh = () => {
    refetch();
  };
  
  // 임시 대시보드 데이터 (API 연동 전)
  const tempDashboardData = {
    sales: {
      current: "32,450,000원",
      previous: "28,800,000원",
      change: "+12.5%",
      isPositive: true
    },
    purchases: {
      current: "18,720,000원",
      previous: "17,280,000원",
      change: "+8.3%",
      isPositive: false
    },
    unpaid: {
      current: "5,280,000원",
      change: "+1,200,000원",
      count: 4,
      isPositive: false
    },
    liability: {
      current: "3,450,000원",
      change: "-860,000원",
      count: 2,
      isPositive: true
    }
  };

  const data = dashboardData || tempDashboardData;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* 페이지 제목 및 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">대시보드</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                새로고침
              </Button>
              
              <DatePickerWithRange
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
          </div>
          
          {/* 현황 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="이번 달 매출"
              value={data.sales.current}
              previous={data.sales.previous}
              change={{
                percentage: data.sales.change,
                isPositive: data.sales.isPositive
              }}
            />
            
            <StatCard
              title="이번 달 매입"
              value={data.purchases.current}
              previous={data.purchases.previous}
              change={{
                percentage: data.purchases.change,
                isPositive: data.purchases.isPositive
              }}
            />
            
            <StatCard
              title="미수금"
              value={data.unpaid.current}
              change={{
                value: data.unpaid.change,
                isPositive: data.unpaid.isPositive
              }}
            />
            
            <StatCard
              title="미지급금"
              value={data.liability.current}
              change={{
                value: data.liability.change,
                isPositive: data.liability.isPositive
              }}
            />
          </div>
          
          {/* 차트 및 통계 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <SalesChart />
            <TopItems />
          </div>
          
          {/* 최근 거래내역 */}
          <div className="mb-6">
            <TransactionTable />
          </div>
          
          {/* 알림 및 예정 작업 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Notifications />
            <UpcomingTasks />
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
