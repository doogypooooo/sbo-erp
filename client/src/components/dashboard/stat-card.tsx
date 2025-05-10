import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    percentage?: string;
    isPositive?: boolean;
  };
  previous?: string;
}

export default function StatCard({ title, value, change, previous }: StatCardProps) {
  return (
    <Card className="bg-white rounded-lg shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-neutral-400">{title}</h3>
          {change?.percentage && (
            <span className={`text-xs px-2 py-1 rounded-full ${change.isPositive ? 'bg-success bg-opacity-10 text-success' : 'bg-destructive bg-opacity-10 text-destructive'}`}>
              {change.isPositive ? '+' : ''}{change.percentage}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold font-mono">{value}</p>
        {previous && (
          <div className="mt-2 text-xs text-neutral-300">
            전월: {previous}
          </div>
        )}
        {change?.value && !previous && (
          <div className="mt-2 text-xs text-neutral-300">
            전월 대비: <span className={change.isPositive ? 'text-success' : 'text-destructive'}>
              {change.isPositive ? '+' : ''}{change.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
