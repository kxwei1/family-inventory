import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorBody {
  error: string;
  statusCode: number;
  path: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, details } = this.extract(exception);
    const body: ErrorBody = {
      error: message,
      statusCode,
      path: request.url,
      ...(details ? { details } : {}),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode} ${message}`);
    }

    response.status(statusCode).json(body);
  }

  private extract(exception: unknown): {
    statusCode: number;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") {
        return { statusCode: exception.getStatus(), message: response };
      }

      if (response && typeof response === "object") {
        const payload = response as { message?: string | string[]; error?: string };
        const message = Array.isArray(payload.message)
          ? payload.message.join("; ")
          : payload.message ?? payload.error ?? exception.message;
        return {
          statusCode: exception.getStatus(),
          message,
          details: Array.isArray(payload.message) ? payload.message : undefined,
        };
      }

      return { statusCode: exception.getStatus(), message: exception.message };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || "Internal Server Error",
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error",
    };
  }
}
