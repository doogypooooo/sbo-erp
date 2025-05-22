import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  results: { items: any[], partners: any[], transactions: any[] } | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function SearchResultsModal({
  isOpen,
  onClose,
  query,
  results,
  isLoading,
  error,
}: SearchResultsModalProps) {
  const [, setLocation] = useLocation();

  // Close modal if query becomes empty (e.g., user clears search in header)
  useEffect(() => {
    if (!query && isOpen) {
      onClose();
    }
  }, [query, isOpen, onClose]);

  const handleItemClick = (item: any) => {
    setLocation(`/items`);
    onClose();
  };

  const handlePartnerClick = (partner: any) => {
    setLocation(`/partners`);
    onClose();
  };

  const handleTransactionClick = (transaction: any) => {
    setLocation(`/sales`);
    onClose();
  };

  const hasResults = results && (results.items.length > 0 || results.partners.length > 0 || results.transactions.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>'{query}' 검색 결과</DialogTitle>
          {/* <DialogDescription> 검색어 '{query}' 에 대한 결과입니다. </DialogDescription> */}
        </DialogHeader>

        {isLoading && (
          <div className="grid gap-4 py-4">
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Separator className="my-2" />
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {error && (
          <div className="grid gap-4 py-4">
            <p>오류가 발생했습니다: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && !hasResults && query && (
          <div className="grid gap-4 py-4">
            <p>'{query}' 에 대한 검색 결과가 없습니다.</p>
          </div>
        )}
         {!isLoading && !error && !query && (
          <div className="grid gap-4 py-4">
            <p>검색어를 입력해주세요.</p>
          </div>
        )}


        {!isLoading && !error && hasResults && results && (
          <div className="grid gap-4 py-4">
            {/* 품목 결과 */}
            {results.items.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">품목 ({results.items.length})</h3>
                <div className="mt-2 space-y-2">
                  {results.items.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                      onClick={() => handleItemClick(item)}
                    >
                      <p className="font-medium">{item.name} ({item.code})</p>
                      <p className="text-sm text-gray-500">단가: {item.unitPrice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 거래처 결과 */}
            {results.partners.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">거래처 ({results.partners.length})</h3>
                <div className="mt-2 space-y-2">
                  {results.partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                      onClick={() => handlePartnerClick(partner)}
                    >
                      <p className="font-medium">{partner.name} ({partner.businessNumber})</p>
                      <p className="text-sm text-gray-500">담당자: {partner.contactName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 거래 결과 */}
            {results.transactions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold">거래 ({results.transactions.length})</h3>
                <div className="mt-2 space-y-2">
                  {results.transactions.map((transaction) => (
                     <div
                      key={transaction.id}
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <p className="font-medium">{transaction.code}</p>
                      <p className="text-sm text-gray-500">타입: {transaction.type}, 상태: {transaction.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 