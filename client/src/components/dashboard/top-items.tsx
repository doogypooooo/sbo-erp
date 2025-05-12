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
  const { data: topItems, isLoading } = useQuery({
    queryKey: ["/api/items/top"],
    queryFn: async () => {
      
      const response = await fetch("/api/items/top");
      
      if (!response.ok) {
        throw new Error("인기 품목 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 임시 인기 품목 데이터 (API 연동 전)
  const tempTopItems: TopItem[] = [
    { id: 1, name: '무선 블루투스 이어폰', quantity: 452, rank: 1 },
    { id: 2, name: '스마트워치 충전기', quantity: 285, rank: 2 },
    { id: 3, name: 'USB-C 고속 충전 케이블', quantity: 217, rank: 3 },
    { id: 4, name: '보조배터리 20000mAh', quantity: 183, rank: 4 },
    { id: 5, name: '스마트폰 강화유리', quantity: 154, rank: 5 },
  ];

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
        ) : (
          <ul className="space-y-4">
            {(topItems || tempTopItems).map((item) => (
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
        )}
      </CardContent>
    </Card>
  );
}
