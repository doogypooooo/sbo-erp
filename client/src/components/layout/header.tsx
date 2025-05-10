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

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // 알림 데이터 불러오기 (예시)
  useEffect(() => {
    // 실제 구현에서는 API 호출로 대체
    setNotifications(3);
  }, []);
  
  // 로그아웃 핸들러
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
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
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>알림</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                <DropdownMenuItem>
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive bg-opacity-10 flex items-center justify-center text-destructive">
                      <i className="mdi mdi-alert-circle"></i>
                    </div>
                    <div>
                      <p className="text-sm">재고 부족 알림: <span className="font-medium">무선 블루투스 이어폰</span> (현재 5개)</p>
                      <p className="text-xs text-neutral-300 mt-1">2023-07-28 09:15:32</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary bg-opacity-10 flex items-center justify-center text-secondary">
                      <i className="mdi mdi-clock"></i>
                    </div>
                    <div>
                      <p className="text-sm">미수금 기한 도래: <span className="font-medium">모바일프렌즈</span> (525,000원)</p>
                      <p className="text-xs text-neutral-300 mt-1">2023-07-28 08:30:14</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center text-primary">
                      <i className="mdi mdi-cart"></i>
                    </div>
                    <div>
                      <p className="text-sm">신규 주문 접수: <span className="font-medium">디지털월드</span> (12건)</p>
                      <p className="text-xs text-neutral-300 mt-1">2023-07-27 16:45:50</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-primary">
                모든 알림 보기
              </DropdownMenuItem>
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
