import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Something went wrong. Please try again.';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        if (Array.isArray(obj.message)) {
          message = obj.message.map((m) => String(m));
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        } else if (typeof obj.error === 'string') {
          message = obj.error;
        } else {
          message = exception.message || 'Request failed';
        }
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Full detail goes to logs only — never leak internals to the client.
      if (exception && typeof exception === 'object') {
        const err = exception as Record<string, unknown>;
        this.logger.error(
          `Internal Error: name=${err.name} code=${err.code} meta=${JSON.stringify(err.meta || {})} clientVersion=${err.clientVersion}\nMessage: ${err.message}`,
          typeof err.stack === 'string' ? err.stack : undefined,
        );
      } else {
        this.logger.error(exception);
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
