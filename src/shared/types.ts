// API types shared by Worker and browser. Must match specs/001-todo-app/contracts/openapi.yaml.

export type TodoStatus = "pending" | "completed";

export interface Todo {
  id: number;
  description: string;
  status: TodoStatus;
  /** ISO 8601 UTC, e.g. "2026-11-10T09:15:02.123Z". */
  createdAt: string;
  /** ISO 8601 UTC; null while pending. */
  completedAt: string | null;
}

export type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "INTERNAL_ERROR";

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}
