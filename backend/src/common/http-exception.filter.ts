import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = exception.getResponse();
    const detail =
      typeof response === 'string'
        ? { message: response }
        : (response as {
            message?: string | string[];
            errorMessage?: string;
            errors?: string[];
          });
    const errors =
      detail.errors ??
      (Array.isArray(detail.message) ? detail.message : undefined);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(exception.getStatus())
      .json({
        success: false,
        errorCode: exception.getStatus(),
        errorMessage:
          detail.errorMessage ??
          (typeof detail.message === 'string'
            ? detail.message
            : exception.message),
        ...(errors ? { errors } : {}),
      });
  }
}
