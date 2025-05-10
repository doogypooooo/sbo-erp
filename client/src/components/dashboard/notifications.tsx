import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

// 알림 타입 정의
type NotificationType = "error" | "warning" | "info";

// 알림 데이터 타입
interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  detail: string;
  date: string;
}

export default function Notifications() {
  // 알림 데이터 조회
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      
      if (!response.ok) {
        throw new Error("알림 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 임시 알림 데이터 (API 연동 전)
  const tempNotifications: Notification[] = [
    {
      id: 1,
      type: "error",
      message: "재고 부족 알림",
      detail: "무선 블루투스 이어폰 (현재 5개)",
      date: "2023-07-28 09:15:32"
    },
    {
      id: 2,
      type: "warning",
      message: "미수금 기한 도래",
      detail: "모바일프렌즈 (525,000원)",
      date: "2023-07-28 08:30:14"
    },
    {
      id: 3,
      type: "info",
      message: "신규 주문 접수",
      detail: "디지털월드 (12건)",
      date: "2023-07-27 16:45:50"
    }
  ];
  
  // 알림 타입에 따른 아이콘 클래스
  const getIconClass = (type: NotificationType) => {
    switch (type) {
      case "error":
        return "mdi mdi-alert-circle text-destructive";
      case "warning":
        return "mdi mdi-clock text-secondary";
      case "info":
        return "mdi mdi-cart text-primary";
      default:
        return "mdi mdi-information text-primary";
    }
  };
  
  // 알림 타입에 따른 배경 클래스
  const getBgClass = (type: NotificationType) => {
    switch (type) {
      case "error":
        return "bg-destructive bg-opacity-10";
      case "warning":
        return "bg-secondary bg-opacity-10";
      case "info":
        return "bg-primary bg-opacity-10";
      default:
        return "bg-primary bg-opacity-10";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">시스템 알림</h3>
          <Button variant="link" size="sm" className="text-primary">
            모두 보기
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ul className="space-y-4">
            {(notifications || tempNotifications).map((notification) => (
              <li key={notification.id} className="flex space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getBgClass(notification.type)} flex items-center justify-center`}>
                  <i className={getIconClass(notification.type)}></i>
                </div>
                <div>
                  <p className="text-sm">
                    {notification.message}: <span className="font-medium">{notification.detail}</span>
                  </p>
                  <p className="text-xs text-neutral-300 mt-1">{notification.date}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
