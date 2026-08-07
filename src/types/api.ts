export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{ code: string; path: string[]; message: string }>;
}
