import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BarcodeGenerator } from "@/components/barcode/barcode-generator";
import { BarcodePrint } from "@/components/barcode/barcode-print";
import { Item, InsertBarcode } from "@shared/schema";
import { Pencil, Plus, Printer, Search, Trash } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function BarcodesPage() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarcodes, setSelectedBarcodes] = useState<any[]>([]);
  const [isMultiPrintOpen, setIsMultiPrintOpen] = useState(false);
  
  // 바코드 목록 조회
  const { data: barcodes = [], isLoading: isLoadingBarcodes } = useQuery({
    queryKey: ['/api/barcodes'],
    select: (data) => data as any[]
  });
  
  // 품목 목록 조회
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/items'],
    select: (data) => data as Item[]
  });
  
  // 바코드 추가 뮤테이션
  const createBarcodeMutation = useMutation({
    mutationFn: async (barcode: InsertBarcode) => {
      const res = await apiRequest(
        "POST",
        `/api/items/${barcode.itemId}/barcodes`,
        { barcode: barcode.barcode, isActive: barcode.isActive }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/barcodes'] });
      setIsDialogOpen(false);
      toast({
        title: "바코드 생성 성공",
        description: "새로운 바코드가 성공적으로 생성되었습니다.",
      });
      // 목록 새로고침
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "바코드 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 바코드 삭제 뮤테이션
  const deleteBarcodesMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/barcodes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/barcodes'] });
      toast({
        title: "바코드 삭제 성공",
        description: "바코드가 성공적으로 삭제되었습니다.",
      });
      // 목록 새로고침
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "바코드 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 바코드 저장 핸들러
  const handleSaveBarcode = (barcodeValue: string) => {
    if (!selectedItem) return;
    
    createBarcodeMutation.mutate({
      itemId: selectedItem.id,
      barcode: barcodeValue,
      isActive: true
    });
  };
  
  // 바코드 선택 토글 핸들러
  const toggleBarcodeSelection = (barcode: any) => {
    if (selectedBarcodes.some(b => b.id === barcode.id)) {
      setSelectedBarcodes(selectedBarcodes.filter(b => b.id !== barcode.id));
    } else {
      setSelectedBarcodes([...selectedBarcodes, barcode]);
    }
  };
  
  // 검색된 바코드 목록
  const filteredBarcodes = barcodes.filter(barcode => 
    barcode.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.item?.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 필터링된 품목 목록
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 바코드 인쇄 목록 생성
  const printBarcodes = selectedBarcodes.map(barcode => ({
    value: barcode.barcode,
    name: barcode.item?.name,
    info: barcode.item?.code
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">바코드 관리</h1>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsMultiPrintOpen(true)}
                  disabled={selectedBarcodes.length === 0}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  선택 바코드 인쇄 ({selectedBarcodes.length})
                </Button>
                <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  바코드 생성
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <Input
                placeholder="바코드 또는 품목으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="h-4 w-4 absolute top-3 left-3 text-gray-400" />
            </div>
            
            <Tabs defaultValue="barcodes">
              <TabsList className="mb-4">
                <TabsTrigger value="barcodes">바코드 목록</TabsTrigger>
                <TabsTrigger value="items">품목별 바코드</TabsTrigger>
              </TabsList>
              
              <TabsContent value="barcodes">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">선택</TableHead>
                        <TableHead>바코드</TableHead>
                        <TableHead>품목 코드</TableHead>
                        <TableHead>품목명</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBarcodes ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            데이터를 불러오는 중...
                          </TableCell>
                        </TableRow>
                      ) : filteredBarcodes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            {searchTerm ? '검색 결과가 없습니다.' : '등록된 바코드가 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBarcodes.map((barcode) => (
                          <TableRow key={barcode.id}>
                            <TableCell>
                              <input 
                                type="checkbox" 
                                checked={selectedBarcodes.some(b => b.id === barcode.id)}
                                onChange={() => toggleBarcodeSelection(barcode)}
                                className="w-4 h-4"
                              />
                            </TableCell>
                            <TableCell>{barcode.barcode}</TableCell>
                            <TableCell>{barcode.item?.code}</TableCell>
                            <TableCell>{barcode.item?.name}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full ${barcode.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {barcode.isActive ? '활성' : '비활성'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteBarcodesMutation.mutate(barcode.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="items">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>품목 코드</TableHead>
                        <TableHead>품목명</TableHead>
                        <TableHead>바코드 수</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingItems ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            데이터를 불러오는 중...
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            {searchTerm ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => {
                          const itemBarcodes = barcodes.filter(barcode => 
                            barcode.itemId === item.id
                          );
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{item.code}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{itemBarcodes.length}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* 바코드 생성 다이얼로그 */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedItem ? `${selectedItem.name} 바코드 생성` : '품목 선택'}
                  </DialogTitle>
                </DialogHeader>
                
                {selectedItem ? (
                  <BarcodeGenerator 
                    itemName={selectedItem.name}
                    itemInfo={selectedItem.code}
                    onSave={handleSaveBarcode}
                  />
                ) : (
                  <div className="space-y-4">
                    <Label htmlFor="search-item">품목 검색</Label>
                    <Input
                      id="search-item"
                      placeholder="품목명 또는 코드로 검색"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    <div className="max-h-60 overflow-auto">
                      {filteredItems.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          {searchTerm ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <div 
                            key={item.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.code}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
            {/* 바코드 일괄 인쇄 다이얼로그 */}
            <Dialog open={isMultiPrintOpen} onOpenChange={setIsMultiPrintOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>바코드 일괄 인쇄</DialogTitle>
                </DialogHeader>
                
                <BarcodePrint barcodes={printBarcodes} />
              </DialogContent>
            </Dialog>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}