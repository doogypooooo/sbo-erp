import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// 거래 유형 정의
type TransactionType = "all" | "sale" | "purchase";

// 거래 데이터 타입 정의
interface Transaction {
  id: number;
  code: string;
  type: 'sale' | 'purchase';
  partnerName: string;
  items: string;
  quantity: number;
  amount: number;
  date: string;
  status: string;
}

export default function TransactionTable() {
  const [currentType, setCurrentType] = useState<TransactionType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  
  // 거래 데이터 조회
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions", currentType],
    queryFn: async () => {
      const url = `/api/transactions${currentType !== "all" ? `?type=${currentType}` : ""}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("거래 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 필터링된 거래 목록
  const filteredTransactions = transactions || [];
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);
  
  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 거래 유형별 필터링
  const handleTypeChange = (type: TransactionType) => {
    setCurrentType(type);
    setCurrentPage(1); // 필터 변경 시 1페이지로 초기화
  };
  
  // 상태에 따른 스타일 클래스
  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-primary bg-opacity-10 text-primary";
      case "pending":
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
      case "unpaid":
        return "bg-secondary bg-opacity-10 text-secondary";
      case "partial":
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
      case "canceled":
        return "bg-destructive bg-opacity-10 text-destructive";
      default:
        return "bg-neutral-300 bg-opacity-10 text-neutral-300";
    }
  };
  
  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "완료";
      case "pending": return "대기";
      case "unpaid": return "미수금";
      case "partial": return "부분입고";
      case "canceled": return "취소";
      default: return status;
    }
  };
  
  // 거래 유형 텍스트 변환
  const getTypeText = (type: string) => {
    return type === "sale" ? "판매" : "구매";
  };

  // 거래 유형 스타일 클래스
  const getTypeClass = (type: string) => {
    return type === "sale" 
      ? "bg-success bg-opacity-10 text-success" 
      : "bg-destructive bg-opacity-10 text-destructive";
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">최근 거래내역</h3>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant={currentType === "all" ? "default" : "outline"}
              onClick={() => handleTypeChange("all")}
            >
              전체
            </Button>
            <Button 
              size="sm" 
              variant={currentType === "sale" ? "default" : "outline"}
              onClick={() => handleTypeChange("sale")}
            >
              매출
            </Button>
            <Button 
              size="sm" 
              variant={currentType === "purchase" ? "default" : "outline"}
              onClick={() => handleTypeChange("purchase")}
            >
              매입
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50 border-b">
            <TableRow>
              <TableHead className="text-xs">번호</TableHead>
              <TableHead className="text-xs">구분</TableHead>
              <TableHead className="text-xs">거래처</TableHead>
              <TableHead className="text-xs">품목</TableHead>
              <TableHead className="text-xs">수량</TableHead>
              <TableHead className="text-xs">금액</TableHead>
              <TableHead className="text-xs">날짜</TableHead>
              <TableHead className="text-xs">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  거래 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.code} className="hover:bg-gray-50">
                  <TableCell className="whitespace-nowrap">{transaction.code}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeClass(transaction.type)}`}>
                      {getTypeText(transaction.type)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{transaction.partnerName}</TableCell>
                  <TableCell className="whitespace-nowrap">{transaction.items}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono">{transaction.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono">{transaction.amount.toLocaleString()}원</TableCell>
                  <TableCell className="whitespace-nowrap">{transaction.date}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {filteredTransactions.length > 0 && (
        <div className="px-6 py-3 flex items-center justify-between border-t">
          <div className="text-xs text-neutral-300">
            총 <span className="font-medium">{filteredTransactions.length}</span>건 중 <span className="font-medium">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredTransactions.length)}</span>건 표시
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = index + 1;
              } else if (currentPage <= 3) {
                pageNum = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + index;
              } else {
                pageNum = currentPage - 2 + index;
              }
              
              return (
                <Button 
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <Button variant="outline" size="sm" disabled>...</Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
