import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "EVENT_NOT_FOUND"
  | "EVENT_ALREADY_EXISTS"
  | "INVALID_EVENT_TIME"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT_NOT_FOUND"
  | "EXPENSE_NOT_FOUND"
  | "INVALID_EXPENSE_AMOUNT"
  | "BUDGET_NOT_FOUND"
  | "FILE_UPLOAD_FAILED"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | string;

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponseSuccess<T>>(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status = 400
) {
  return NextResponse.json<ApiResponseError>(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
