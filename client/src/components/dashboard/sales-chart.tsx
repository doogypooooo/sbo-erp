import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 기간 타입 정의
type PeriodType = "3month" | "6month" | "year";

export default function SalesChart() {
  const [period, setPeriod] = useState<PeriodType>("6month");
  
  // 차트 데이터 조회
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["/api/sales/chart", period],
    queryFn: async () => {
      const response = await fetch(`/api/sales/chart?period=${period}`);
      
      if (!response.ok) {
        throw new Error("차트 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 기간 변경 핸들러
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  };
  
  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return `${(amount / 10000).toFixed(0)}만원`;
  };

  return (
    <Card className="bg-white rounded-lg shadow lg:col-span-2">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">월별 매출/매입 추이</h3>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant={period === "year" ? "default" : "outline"}
              onClick={() => handlePeriodChange("year")}
            >
              연간
            </Button>
            <Button 
              size="sm" 
              variant={period === "6month" ? "default" : "outline"}
              onClick={() => handlePeriodChange("6month")}
            >
              6개월
            </Button>
            <Button 
              size="sm" 
              variant={period === "3month" ? "default" : "outline"}
              onClick={() => handlePeriodChange("3month")}
            >
              3개월
            </Button>
          </div>
        </div>
        
        <div className="w-full h-64">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatAmount} />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
                <Legend />
                <Bar dataKey="매출" fill="#1976D2" />
                <Bar dataKey="매입" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
