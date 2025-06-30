export interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  description?: string;
  context_length: number;
  is_active: boolean;
  is_default: boolean;
  capabilities: string[];
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ModelAccess {
  id: string;
  user_id: string;
  model_id: string;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface UsageStats {
  model_id: string;
  model_name: string;
  total_requests: number;
  total_tokens: number;
  avg_response_time: number;
  success_rate: number;
  last_used: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  service: string;
  user_id?: string;
  username?: string;
  message: string;
  details?: Record<string, any>;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_models: number;
  active_models: number;
  total_requests_today: number;
  total_requests_week: number;
  average_response_time: number;
  system_health: 'healthy' | 'warning' | 'critical';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  is_admin?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

export interface CreateModelRequest {
  name: string;
  provider: string;
  model_id: string;
  description?: string;
  context_length: number;
  capabilities: string[];
  parameters?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateModelRequest {
  name?: string;
  description?: string;
  context_length?: number;
  capabilities?: string[];
  parameters?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateAccessRequest {
  user_id: string;
  model_id: string;
  expires_at?: string;
}
