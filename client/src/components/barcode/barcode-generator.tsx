import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { useReactToPrint } from 'react-to-print';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, RefreshCw, Save } from 'lucide-react';

interface BarcodeGeneratorProps {
  initialValue?: string;
  itemName?: string;
  itemInfo?: string;
  onSave?: (barcodeValue: string) => void;
}

export function BarcodeGenerator({
  initialValue = '',
  itemName = '',
  itemInfo = '',
  onSave
}: BarcodeGeneratorProps) {
  const [barcodeValue, setBarcodeValue] = React.useState(initialValue);
  const [productName, setProductName] = React.useState(itemName);
  const [productInfo, setProductInfo] = React.useState(itemInfo);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  // 바코드 생성 함수
  const generateBarcode = () => {
    if (!canvasRef.current || !barcodeValue) return;
    
    try {
      JsBarcode(canvasRef.current, barcodeValue, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
        margin: 10,
      });
    } catch (error) {
      console.error("바코드 생성 오류:", error);
    }
  };
  
  // 바코드 값이 변경될 때마다 새로운 바코드 생성
  useEffect(() => {
    generateBarcode();
  }, [barcodeValue]);
  
  // 인쇄 핸들러
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `바코드-${barcodeValue}`,
    onAfterPrint: () => console.log('인쇄 완료')
  });
  
  // 바코드 저장 핸들러
  const handleSave = () => {
    if (onSave && barcodeValue) {
      onSave(barcodeValue);
    }
  };
  
  // 임의의 바코드 생성 (EAN-13 형식)
  const generateRandomBarcode = () => {
    // EAN-13 형식의 임의 바코드 생성
    let barcode = "880"; // 한국 국가 코드 (880)
    for (let i = 0; i < 9; i++) {
      barcode += Math.floor(Math.random() * 10);
    }
    
    // 체크섬 계산
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    barcode += checksum;
    
    setBarcodeValue(barcode);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>바코드 생성</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode-value">바코드 값</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode-value"
                  placeholder="바코드 값을 입력하세요"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={generateRandomBarcode}
                  title="임의 바코드 생성"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-name">상품명</Label>
              <Input
                id="product-name"
                placeholder="상품명을 입력하세요"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-info">상품 정보</Label>
              <Input
                id="product-info"
                placeholder="상품 정보를 입력하세요"
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <div ref={printRef} className="p-4 border rounded-md bg-white">
              <div className="text-center font-bold mb-2">{productName}</div>
              <canvas ref={canvasRef} className="w-full"></canvas>
              <div className="text-center text-sm mt-2">{productInfo}</div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button 
          variant="secondary" 
          onClick={handlePrint}
          disabled={!barcodeValue}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
        {onSave && (
          <Button 
            onClick={handleSave}
            disabled={!barcodeValue}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            저장
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}