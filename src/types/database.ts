export type TaskStatus = 'open' | 'accepted' | 'completed' | 'cancelled';
export type TaskCategory = 'food' | 'grocery' | 'coffee';
export type TaskUrgency = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  store: string;
  dropoff_address: string;
  dropoff_instructions: string;
  urgency: TaskUrgency;
  reward_cents: number;
  estimated_minutes: number;
  status: TaskStatus;
  created_by: string;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: TaskCategory;
  store: string;
  dropoff_address: string;
  dropoff_instructions: string;
  urgency: TaskUrgency;
  reward_cents: number;
  estimated_minutes: number;
}

export interface UpdateTaskData {
  status?: TaskStatus;
  accepted_by?: string | null;
  updated_at?: string;
}