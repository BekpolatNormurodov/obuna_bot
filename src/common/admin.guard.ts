import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { getAdminIds } from './admin-ids';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminIds: number[];

  constructor() {
    this.adminIds = getAdminIds();
  }

  canActivate(context: ExecutionContext): boolean {
    const telegrafContext = TelegrafExecutionContext.create(context);
    const ctx = telegrafContext.getContext<Context>();
    const userId = ctx.from?.id;
    return typeof userId === 'number' && this.adminIds.includes(userId);
  }
}
