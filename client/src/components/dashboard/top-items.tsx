import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

// 인기 품목 데이터 타입
interface TopItem {
  id: number;
  name: string;
  quantity: number;
  rank: number;
}

export default function TopItems() {
  // 인기 품목 데이터 조회
  const { data: topItems, isLoading } = useQuery<TopItem[]>({
    queryKey: ["/api/dashboard/top-selling-items"],
    queryFn: async () => {
      
      const response = await fetch("/api/dashboard/top-selling-items");
      
      if (!response.ok) {
        throw new Error("인기 품목 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  return (
    <Card className="bg-white rounded-lg shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">판매 상위 품목</h3>
          <Link href="/items">
            <Button variant="link" size="sm" className="text-primary">
              더보기
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : topItems && topItems.length > 0 ? (
          <ul className="space-y-4">
            {topItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full bg-primary ${item.rank > 1 ? `bg-opacity-${100 - (item.rank-1)*20}` : ''} flex items-center justify-center text-white text-xs`}>
                    {item.rank}
                  </span>
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-mono">{item.quantity}개</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex justify-center items-center h-40 text-gray-500">
            데이터가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
