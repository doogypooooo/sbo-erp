import { useAuth, usePermission } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 반응형 처리
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 모바일에서 외부 클릭 시 사이드바 닫기
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar');
      if (isMobile && isOpen && sidebar && !sidebar.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isMobile, isOpen]);

  // 모바일 메뉴 토글
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // 사이드바 스타일
  const sidebarClasses = cn(
    "sidebar bg-white w-64 shadow-md flex-shrink-0 h-full flex flex-col z-10",
    isMobile && "fixed top-0 bottom-0 left-0 transition-transform duration-300",
    isMobile && !isOpen && "-translate-x-full"
  );

  // 메뉴 아이템 스타일
  const menuItemClasses = (path: string) => {
    return cn(
      "sidebar-item block px-4 py-2",
      location === path && "active border-l-4 border-primary bg-primary/5 text-primary"
    );
  };

  // 권한 확인
  const hasPartnerPermission = usePermission("partners", "read");
  const hasItemPermission = usePermission("items", "read");
  const hasBarcodePermission = usePermission("barcodes", "read");
  const hasPurchasePermission = usePermission("purchases", "read");
  const hasSalePermission = usePermission("sales", "read");
  const hasInventoryPermission = usePermission("inventory", "read");
  const hasVoucherPermission = usePermission("vouchers", "read");
  const hasAccountPermission = usePermission("accounts", "read");
  const hasPaymentPermission = usePermission("payments", "read");
  const hasStatementPermission = usePermission("statements", "read");
  const hasTaxPermission = usePermission("tax", "read");
  const hasUserPermission = usePermission("users", "read");
  const hasSettingPermission = usePermission("settings", "read");

  return (
    <>
      {/* 모바일 토글 버튼 */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-20 lg:hidden"
          onClick={toggleSidebar}
        >
          <i className="mdi mdi-menu text-xl"></i>
        </Button>
      )}

      {/* 사이드바 */}
      <aside className={sidebarClasses}>
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">SBO-ERP <span className="text-xs text-neutral-300">v1.0</span></h1>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <i className="mdi mdi-close text-xl"></i>
            </Button>
          )}
        </div>
        
        {/* 사용자 프로필 영역 */}
        <div className="p-4 border-b flex items-center space-x-3">
          {/* 사용자 아바타 */}
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
            <span>{user?.name?.charAt(0) || '?'}</span>
          </div>
          {/* 사용자 정보 */}
          <div className="flex-1">
            <p className="font-medium">{user?.name || '사용자'}</p>
            <p className="text-xs text-neutral-300">{user?.role === 'admin' ? '관리자' : '일반 사용자'}</p>
          </div>
        </div>
        
        {/* 메뉴 영역 */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-4 py-2 text-xs text-neutral-300 uppercase">기초자료</div>
          
          <Link href="/" className={menuItemClasses("/")}>
            <div className="flex items-center space-x-2">
              <i className="mdi mdi-view-dashboard"></i>
              <span>대시보드</span>
            </div>
          </Link>
          
          {hasPartnerPermission && (
            <Link href="/partners" className={menuItemClasses("/partners")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-account-multiple"></i>
                <span>거래처 관리</span>
              </div>
            </Link>
          )}
          
          {hasItemPermission && (
            <Link href="/items" className={menuItemClasses("/items")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-package-variant-closed"></i>
                <span>품목 관리</span>
              </div>
            </Link>
          )}
          
          {hasBarcodePermission && (
            <Link href="/barcodes" className={menuItemClasses("/barcodes")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-barcode-scan"></i>
                <span>바코드 관리</span>
              </div>
            </Link>
          )}
          
          <div className="px-4 py-2 text-xs text-neutral-300 uppercase mt-4">거래관리</div>
          
          {hasPurchasePermission && (
            <Link href="/purchase" className={menuItemClasses("/purchase")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-cart-arrow-down"></i>
                <span>구매/입고</span>
              </div>
            </Link>
          )}
          
          {hasSalePermission && (
            <Link href="/sales" className={menuItemClasses("/sales")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-cart-arrow-up"></i>
                <span>판매/출고</span>
              </div>
            </Link>
          )}
          
          {hasInventoryPermission && (
            <Link href="/inventory" className={menuItemClasses("/inventory")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-cube-outline"></i>
                <span>재고 관리</span>
              </div>
            </Link>
          )}
          
          <div className="px-4 py-2 text-xs text-neutral-300 uppercase mt-4">회계/재무</div>
          
          {hasVoucherPermission && (
            <Link href="/accounting/vouchers" className={menuItemClasses("/accounting/vouchers")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-file-document-outline"></i>
                <span>전표 관리</span>
              </div>
            </Link>
          )}
          
          {hasAccountPermission && (
            <Link href="/accounting/accounts" className={menuItemClasses("/accounting/accounts")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-bank"></i>
                <span>계정과목 관리</span>
              </div>
            </Link>
          )}
          
          {hasPaymentPermission && (
            <Link href="/accounting/payments" className={menuItemClasses("/accounting/payments")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-currency-krw"></i>
                <span>수금/지급 관리</span>
              </div>
            </Link>
          )}
          
          {hasStatementPermission && (
            <Link href="/accounting/statements" className={menuItemClasses("/accounting/statements")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-file-chart"></i>
                <span>재무제표</span>
              </div>
            </Link>
          )}
          
          {hasTaxPermission && (
            <Link href="/accounting/tax-invoices" className={menuItemClasses("/accounting/tax-invoices")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-receipt"></i>
                <span>세금계산서</span>
              </div>
            </Link>
          )}
          
          <div className="px-4 py-2 text-xs text-neutral-300 uppercase mt-4">설정</div>
          
          {hasUserPermission && (
            <Link href="/settings/users" className={menuItemClasses("/settings/users")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-account-cog"></i>
                <span>사용자/권한</span>
              </div>
            </Link>
          )}
          
          {hasSettingPermission && (
            <Link href="/settings/preferences" className={menuItemClasses("/settings/preferences")}>
              <div className="flex items-center space-x-2">
                <i className="mdi mdi-cog"></i>
                <span>환경설정</span>
              </div>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
