import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Http");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = process.hrtime.bigint();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const route = `${request.method} ${request.originalUrl ?? request.url}`;

    return next.handle().pipe(
      tap({
        next: () => this.log(route, response.statusCode, startedAt),
        error: () => this.log(route, response.statusCode || 500, startedAt, true),
      }),
    );
  }

  private log(route: string, status: number, startedAt: bigint, errored = false): void {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const elapsed = `${ms.toFixed(1)}ms`;

    if (errored || status >= 500) {
      this.logger.error(`${route} -> ${status} (${elapsed})`);
      return;
    }

    if (status >= 400) {
      this.logger.warn(`${route} -> ${status} (${elapsed})`);
      return;
    }

    this.logger.log(`${route} -> ${status} (${elapsed})`);
  }
}
