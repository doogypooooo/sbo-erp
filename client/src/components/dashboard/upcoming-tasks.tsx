import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// 예정 작업 데이터 타입 (백엔드 스키마와 일치)
interface ScheduledTask {
  id: number;
  description: string;
  createdAt: string; // ISO date string
  dueDate?: string; // ISO date string
}

// Scheduled task type after date transformation
interface CalendarTask extends Omit<ScheduledTask, 'dueDate'> {
  dueDate?: Date; // dueDate is a Date object after transformation
}

export default function UpcomingTasks() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState<Date | undefined>(undefined);

  // 예정 작업 데이터 조회
  const { data: tasks, isLoading, error } = useQuery<ScheduledTask[], Error, CalendarTask[]>({
    queryKey: ["/api/scheduled-tasks"],
    queryFn: async () => {
      const response = await fetch("/api/scheduled-tasks");
      
      if (!response.ok) {
        throw new Error("예정 작업 데이터를 불러오는데 실패했습니다.");
      }
      
      return response.json() as Promise<ScheduledTask[]>; // Cast to original type
    },
    select: (data) => data.map((task: ScheduledTask) => ({
      ...task,
      // Convert dueDate string to Date object if it exists
      dueDate: task.dueDate ? parseISO(task.dueDate) : undefined,
    }))
  });
  
  // 새 예정 작업 추가 뮤테이션
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: { description: string, dueDate?: string }) => {
      const response = await fetch("/api/scheduled-tasks", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) {
        throw new Error('Failed to add scheduled task');
      }
      return response.json();
    },
    onSuccess: () => {
      // 작업 추가 성공 시 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      setNewTaskDescription("");
      setNewTaskDueDate(undefined);
      setCreateOpen(false);
    },
    onError: (error) => {
      console.error('Error adding task:', error);
      alert('예정 작업 추가에 실패했습니다.');
    }
  });

  // 예정 작업 수정 뮤테이션
  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: { id: number, description?: string, dueDate?: string }) => {
      const response = await fetch(`/api/scheduled-tasks/${taskData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) {
        throw new Error('Failed to update scheduled task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      setEditOpen(false);
      setSelectedTask(null);
      setEditTaskDescription("");
      setEditTaskDueDate(undefined);
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      alert('예정 작업 수정에 실패했습니다.');
    }
  });

  // 예정 작업 삭제 뮤테이션
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/scheduled-tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete scheduled task');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      setEditOpen(false);
      setSelectedTask(null);
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      alert('예정 작업 삭제에 실패했습니다.');
    }
  });

  // FullCalendar events data
  const calendarEvents = tasks?.map((task: CalendarTask) => ({
    id: task.id.toString(),
    title: task.description,
    start: task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : undefined,
    allDay: true, // assuming tasks are all-day events
  })) || [];

  // Handle date click on calendar (for adding task)
  const handleDateClick = (arg: any) => {
    setNewTaskDueDate(arg.date);
    setCreateOpen(true);
  };

  // Handle event click on calendar (for editing/deleting task)
  const handleEventClick = (arg: any) => {
    const taskId = parseInt(arg.event.id);
    const task = tasks?.find((t: CalendarTask) => t.id === taskId);
    if (task) {
      // Ensure dueDate is a Date object before setting state
      setSelectedTask(task);
      setEditTaskDescription(task.description);
      setEditTaskDueDate(task.dueDate);
      setEditOpen(true);
    }
  };

  // Handle new task submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskDescription.trim()) {
      addTaskMutation.mutate({ 
        description: newTaskDescription,
        dueDate: newTaskDueDate ? newTaskDueDate.toISOString() : undefined
      });
    }
  };

  // Handle edit task submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask && editTaskDescription.trim()) {
      updateTaskMutation.mutate({
        id: selectedTask.id,
        description: editTaskDescription,
        dueDate: editTaskDueDate ? editTaskDueDate.toISOString() : undefined
      });
    }
  };

  // Handle delete task
  const handleDeleteTask = () => {
    if (selectedTask) {
      deleteTaskMutation.mutate(selectedTask.id);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">예정된 작업</h3>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> 일정 추가
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive">예정된 작업을 불러오는데 실패했습니다.</div>
        ) : (
          <div className="calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView='dayGridMonth'
              events={calendarEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek,dayGridDay'
              }}
              locale='ko'
            />
          </div>
        )}
      </CardContent>

      {/* 일정 추가 Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 일정 추가</DialogTitle>
            <DialogDescription>
              새로운 예정된 작업에 대한 설명을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-description" className="text-right">
                  설명
                </Label>
                <Input
                  id="task-description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-dueDate" className="text-right">
                  날짜
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal col-span-3",
                        !newTaskDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTaskDueDate ? format(newTaskDueDate, "yyyy년 MM월 dd일") : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newTaskDueDate}
                      onSelect={setNewTaskDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addTaskMutation.isPending}>저장</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 일정 수정/삭제 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>일정 수정/삭제</DialogTitle>
            <DialogDescription>
              예정된 작업 정보를 수정하거나 삭제합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-task-description" className="text-right">
                  설명
                </Label>
                <Input
                  id="edit-task-description"
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-task-dueDate" className="text-right">
                  날짜
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal col-span-3",
                        !editTaskDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editTaskDueDate ? format(editTaskDueDate, "yyyy년 MM월 dd일") : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editTaskDueDate}
                      onSelect={setEditTaskDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="destructive" onClick={handleDeleteTask} disabled={deleteTaskMutation.isPending}>
                {deleteTaskMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                삭제
              </Button>
              <Button type="submit" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                수정
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
