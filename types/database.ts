export type TaskStatus = 'open' | 'accepted' | 'completed' | 'cancelled';
export type TaskCurrentStatus = 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'completed';
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
  current_status: TaskCurrentStatus;
  last_status_update: string;
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

export interface TaskStatusHistory {
  id: string;
  task_id: string;
  status: TaskCurrentStatus;
  changed_by: {
    id: string;
    full_name: string | null;
    username: string | null;
  };
  note: string;
  photo_url: string;
  created_at: string;
}

export interface UpdateTaskStatusData {
  taskId: string;
  newStatus: TaskCurrentStatus;
  note?: string;
  photoUrl?: string;
}