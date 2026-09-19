import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiError, ApiErrorCode } from '@social/schemas';
import type { Request, Response } from 'express';
import {
  type ApplicationErrorCode,
  ApplicationException,
} from '#shared/domain/exceptions/application.exception.js';
import { DomainException } from '#shared/domain/exceptions/domain.exception.js';
import { RequestValidationException } from '../pipes/validation.pipe.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { status, body } = toApiError(exception);

    if (status >= 500) {
      // TODO: Logger 구현 시 500이상 코드에대한 로그 남기기
      console.log(
        `${req.method}-${req.url}: ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(body);
  }
}

function fieldOf(e: { field?: string; message: string }) {
  return e.field ? { fields: { [e.field]: e.message } } : {};
}

// Record로 타입을 지정하면 코드 추가 시 tsc가 누락을 감지
const APPLICATION_STATUS: Record<ApplicationErrorCode, HttpStatus> = {
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
};

const HTTP_STATUS_TO_CODE: Partial<Record<number, ApiErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

function toApiError(e: unknown): { status: number; body: ApiError } {
  if (e instanceof RequestValidationException) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        code: 'VALIDATION_ERROR',
        message: e.message,
        fields: e.fields,
      },
    };
  }

  if (e instanceof DomainException) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        code: 'VALIDATION_ERROR',
        message: e.message,
        ...fieldOf(e),
      },
    };
  }

  if (e instanceof ApplicationException) {
    return {
      status: APPLICATION_STATUS[e.code],
      body: {
        code: e.code,
        message: e.message,
        ...fieldOf(e),
      },
    };
  }

  // 라우트 없음 404, CORS 403등
  if (e instanceof HttpException) {
    return {
      status: e.getStatus(),
      body: {
        code: HTTP_STATUS_TO_CODE[e.getStatus()] ?? 'INTERNAL_ERROR',
        message: e.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      code: 'INTERNAL_ERROR',
      message: '일시적인 오류가 발생했습니다.',
    },
  };
}
