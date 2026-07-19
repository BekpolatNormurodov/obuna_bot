import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminIds: number[];

  constructor() {
    this.adminIds = (process.env.ADMIN_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number);
  }

  canActivate(context: ExecutionContext): boolean {
    const telegrafContext = TelegrafExecutionContext.create(context);
    const ctx = telegrafContext.getContext<Context>();
    const userId = ctx.from?.id;
    return typeof userId === 'number' && this.adminIds.includes(userId);
  }
}
