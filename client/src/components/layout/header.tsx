import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Bell, Settings, LogOut, Languages, User } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // QueryClient 인스턴스 가져오기
  const queryClient = useQueryClient();
  
  // 알림 데이터 불러오기
  const { data: notificationsData, isLoading: isNotificationsLoading, error: notificationsError } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("알림을 불러오는데 실패했습니다.");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
  
  // 알림 개수 계산
  const unreadNotificationCount = notificationsData?.filter((n: any) => !n.isRead).length || 0;
  
  // 알림 읽음 처리 뮤테이션
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('알림 읽음 처리에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      // 성공 시 알림 목록 갱신
      queryClient.invalidateQueries(["/api/notifications"]);
    },
  });

  // 알림 클릭 시 읽음 처리 및 이동 (예시)
  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    // 알림 타입에 따라 다른 페이지로 이동하는 로직 추가 (예: 재고 부족 알림 클릭 시 재고 페이지로 이동)
    if (notification.type === 'stock_low') {
       setLocation('/inventory');
    } else if (notification.type === 'unpaid') {
       // 미수금 알림 클릭 시 거래 목록 또는 미수금 상세 페이지로 이동
       setLocation('/transactions?status=unpaid'); // 예시: 미수금 거래 목록으로 이동
    }
    // 다른 알림 타입에 대한 이동 로직 추가...
  };
  
  // 로그아웃 핸들러
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
        setTimeout(() => window.location.reload(), 100);
      }
    });
  };
  
  // 언어 변경 핸들러
  const changeLanguage = (language: string) => {
    // 언어 변경 로직 구현
    toast({
      title: "언어 변경",
      description: `언어가 ${language === 'ko' ? '한국어' : '영어'}로 변경되었습니다.`,
    });
  };
  
  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: "검색 결과",
        description: `"${searchQuery}"에 대한 검색 결과입니다.`,
      });
    }
  };

  return (
    <header className="bg-white shadow-sm border-b h-16 flex-shrink-0">
      <div className="flex items-center justify-between h-full px-4">
        {/* 중앙: 검색바 */}
        <div className="flex-1 max-w-2xl mx-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input 
                type="text" 
                placeholder="검색어를 입력하세요 (품목, 거래처, 문서번호 등)" 
                className="w-full py-2 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="mdi mdi-magnify absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-300"></i>
            </div>
          </form>
        </div>
        
        {/* 우측: 알림 및 설정 */}
        <div className="flex items-center space-x-3">
          {/* 알림 버튼 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>알림 ({unreadNotificationCount})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {isNotificationsLoading ? (
                  <DropdownMenuItem disabled>알림 불러오는 중...</DropdownMenuItem>
                ) : notificationsError ? (
                  <DropdownMenuItem disabled>알림 불러오기 실패</DropdownMenuItem>
                ) : notificationsData && notificationsData.length > 0 ? (
                  notificationsData.map((notification: any) => (
                    <DropdownMenuItem key={notification.id} onClick={() => handleNotificationClick(notification)}>
                      <div className="flex space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-opacity-10 flex items-center justify-center ${notification.type === 'stock_low' ? 'bg-destructive text-destructive' : notification.type === 'unpaid' ? 'bg-amber-500 text-amber-500' : 'bg-primary text-primary'}`}>
                          {notification.type === 'stock_low' && <i className="mdi mdi-alert-circle"></i>}
                          {notification.type === 'unpaid' && <i className="mdi mdi-cash-remove"></i>}
                          {!['stock_low', 'unpaid'].includes(notification.type) && <i className="mdi mdi-information"></i>}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className={`text-xs mt-1 ${notification.isRead ? 'text-neutral-400' : 'text-neutral-700 font-medium'}`}>{notification.message}</p>
                          <p className="text-xs text-neutral-300 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>새로운 알림이 없습니다.</DropdownMenuItem>
                )}
              </div>
              {notificationsData && notificationsData.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center text-primary">
                    모든 알림 보기
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 언어 선택 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Languages className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('ko')}>
                한국어
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 사용자 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name || '사용자'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/settings/preferences")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>환경설정</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
