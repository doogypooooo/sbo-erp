import { Router } from 'express';
import { storage } from '../storage';
import { scheduledTasks, NewScheduledTask, ScheduledTask } from '@shared/schema';
import { co } from 'node_modules/@fullcalendar/core/internal-common';

const router = Router();

// Get all scheduled tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await storage.getScheduledTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching scheduled tasks:', error);
    res.status(500).json({ message: 'Failed to fetch scheduled tasks.' });
  }
});

// Add a new scheduled task
router.post('/', async (req, res) => {
  try {
    const newTask: NewScheduledTask = req.body;
    if (!newTask || !newTask.description) {
      return res.status(400).json({ message: 'Description is required.' });
    }
    const task = await storage.addScheduledTask(newTask);
    // 활동 로그 기록
    if (req.user) {
      console.log(req.body);
      await storage.addUserActivity({
        userId: req.user.id,
        action: "create",
        target: `예정 작업 ${task.description} (ID: ${task.id})`,
        description: "예정 작업 추가"
      });
    }
    res.status(201).json(task);
  } catch (error) {
    console.error('Error adding scheduled task:', error);
    res.status(500).json({ message: 'Failed to add scheduled task.' });
  }
});

// Update a scheduled task
router.put('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const updatedTask: Partial<NewScheduledTask> = req.body;
    if (!updatedTask || !updatedTask.description) {
      return res.status(400).json({ message: 'Description is required.' });
    }
    const task = await storage.updateScheduledTask(taskId, updatedTask);
    if (!task) {
      return res.status(404).json({ message: 'Scheduled task not found.' });
    }
    // 활동 로그 기록
    if (req.user) {
      console.log(req.body);
      await storage.addUserActivity({
        userId: req.user.id,
        action: "update",
        target: `예정 작업 ${task.description} (ID: ${task.id})`,
        description: "예정 작업 수정"
      });
    }
    res.json(task);
  } catch (error) {
    console.error('Error updating scheduled task:', error);
    res.status(500).json({ message: 'Failed to update scheduled task.' });
  }
});

// Delete a scheduled task
router.delete('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const success = await storage.deleteScheduledTask(taskId);
    if (!success) {
      return res.status(404).json({ message: 'Scheduled task not found.' });
    }
    // 활동 로그 기록
    if (req.user) {
      await storage.addUserActivity({
        userId: req.user.id,
        action: "delete",
        target: `예정 작업 ID: ${taskId}`,
        description: "예정 작업 삭제"
      });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting scheduled task:', error);
    res.status(500).json({ message: 'Failed to delete scheduled task.' });
  }
});

export default router; 