// Legacy TaskService - DEPRECATED
// Use TaskRepo instead for all new code
// This file is kept for backward compatibility during migration

import { TaskRepo } from './taskRepo';

/**
 * @deprecated Use TaskRepo instead
 * Legacy TaskService wrapper around TaskRepo
 */
export class TaskService {
  static async getAvailableTasks(userId: string, limit?: number, offset?: number) {
    return TaskRepo.listOpenTasks(userId, limit, offset);
  }

  static async getUserDoingTasks(userId: string) {
    return TaskRepo.listUserDoingTasks(userId);
  }

  static async getUserPostedTasks(userId: string) {
    return TaskRepo.listUserPostedTasks(userId);
  }

  static async createTask(taskData: any, userId: string) {
    return TaskRepo.createTask(taskData, userId);
  }

  static async acceptTask(taskId: string, userId: string) {
    return TaskRepo.acceptTask(taskId, userId);
  }

  static async cancelTask(taskId: string, userId: string) {
    return TaskRepo.cancelTask(taskId, userId);
  }

  // Utility methods
  static formatReward = TaskRepo.formatReward;
  static formatEstimatedTime = TaskRepo.formatEstimatedTime;
  static formatCategory = TaskRepo.formatCategory;
  static formatUrgency = TaskRepo.formatUrgency;
  static getUrgencyColor = TaskRepo.getUrgencyColor;
}