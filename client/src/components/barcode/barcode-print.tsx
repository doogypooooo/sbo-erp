import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface BarcodePrintProps {
  barcodes: Array<{
    value: string;
    name?: string;
    info?: string;
  }>;
  columns?: number;
  rows?: number;
}

export function BarcodePrint({ barcodes, columns = 3, rows = 8 }: BarcodePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // 인쇄 핸들러
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: '바코드 인쇄',
    onAfterPrint: () => console.log('인쇄 완료')
  });
  
  // 페이지에 바코드 표시 후 생성
  React.useEffect(() => {
    barcodes.forEach((barcode, index) => {
      const canvas = document.getElementById(`barcode-${index}`) as HTMLCanvasElement;
      if (canvas && barcode.value) {
        try {
          JsBarcode(canvas, barcode.value, {
            format: "CODE128",
            lineColor: "#000",
            width: 1.5,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 5
          });
        } catch (error) {
          console.error(`바코드 생성 오류(${barcode.value}):`, error);
        }
      }
    });
  }, [barcodes]);
  
  // 바코드 배열을 그리드에 맞게 분할
  const totalSlots = columns * rows;
  const filledSlots = [...barcodes];
  
  // 빈 슬롯 채우기
  while (filledSlots.length < totalSlots) {
    filledSlots.push({ value: '' });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={handlePrint} 
          disabled={barcodes.length === 0}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          일괄 인쇄
        </Button>
      </div>
      
      <div ref={printRef} className="w-full p-4 bg-white">
        <div 
          className="grid gap-2" 
          style={{ 
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, auto)`
          }}
        >
          {filledSlots.map((barcode, index) => (
            <div 
              key={index} 
              className="border rounded p-2 flex flex-col items-center justify-center"
              style={{ minHeight: '100px', pageBreakInside: 'avoid' }}
            >
              {barcode.value ? (
                <>
                  {barcode.name && (
                    <div className="text-center font-bold text-xs mb-1">{barcode.name}</div>
                  )}
                  <canvas id={`barcode-${index}`} className="w-full"></canvas>
                  {barcode.info && (
                    <div className="text-center text-xs mt-1">{barcode.info}</div>
                  )}
                </>
              ) : (
                <div className="text-gray-300 text-xs">빈 슬롯</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}