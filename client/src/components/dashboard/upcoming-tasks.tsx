import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// 예정 작업 타입 정의
type TaskType = "inventory" | "tax" | "meeting";

// 예정 작업 데이터 타입
interface Task {
  id: number;
  type: TaskType;
  title: string;
  date: string;
  daysLeft: number;
}

export default function UpcomingTasks() {
  // 예정 작업 데이터 조회
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      
      if (!response.ok) {
        throw new Error("예정 작업 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json();
    }
  });
  
  // 임시 예정 작업 데이터 (API 연동 전)
  const tempTasks: Task[] = [
    {
      id: 1,
      type: "inventory",
      title: "월간 재고실사",
      date: "2023-07-31",
      daysLeft: 3
    },
    {
      id: 2,
      type: "tax",
      title: "7월 부가세 신고",
      date: "2023-08-25",
      daysLeft: 28
    },
    {
      id: 3,
      type: "meeting",
      title: "거래처 미팅: 테크서플라이",
      date: "2023-08-02",
      daysLeft: 5
    }
  ];
  
  // 작업 타입에 따른 아이콘 클래스
  const getIconClass = (type: TaskType) => {
    switch (type) {
      case "inventory":
        return "mdi mdi-calendar-check text-success";
      case "tax":
        return "mdi mdi-file-document text-primary";
      case "meeting":
        return "mdi mdi-account-group text-secondary";
      default:
        return "mdi mdi-calendar text-primary";
    }
  };
  
  // 작업 타입에 따른 배경 클래스
  const getBgClass = (type: TaskType) => {
    switch (type) {
      case "inventory":
        return "bg-success bg-opacity-10";
      case "tax":
        return "bg-primary bg-opacity-10";
      case "meeting":
        return "bg-secondary bg-opacity-10";
      default:
        return "bg-primary bg-opacity-10";
    }
  };
  
  // 새 일정 추가 핸들러
  const handleAddTask = () => {
    // 일정 추가 모달 또는 페이지로 이동
    console.log("일정 추가");
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">예정된 작업</h3>
          <Button variant="link" size="sm" className="text-primary" onClick={handleAddTask}>
            일정 추가
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ul className="space-y-4">
            {(tasks || tempTasks).map((task) => (
              <li key={task.id} className="flex space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getBgClass(task.type)} flex items-center justify-center`}>
                  <i className={getIconClass(task.type)}></i>
                </div>
                <div>
                  <p className="text-sm">{task.title}</p>
                  <p className="text-xs text-neutral-300 mt-1">{task.date} (D-{task.daysLeft})</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
