import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { getAdminIds } from '../common/admin-ids';
import { ADMIN_COMMANDS, BOT_PROFILE, PUBLIC_COMMANDS } from './bot-commands';

@Injectable()
export class BotProfileService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotProfileService.name);

  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async onApplicationBootstrap() {
    try {
      await this.bot.telegram.setMyDescription(BOT_PROFILE.description);
      await this.bot.telegram.setMyShortDescription(BOT_PROFILE.shortDescription);
      await this.bot.telegram.setMyCommands([...PUBLIC_COMMANDS]);

      for (const adminId of getAdminIds()) {
        await this.bot.telegram.setMyCommands([...ADMIN_COMMANDS], {
          scope: { type: 'chat', chat_id: adminId },
        });
      }

      this.logger.log('Bot profile (description, short description, commands) configured');
    } catch (error) {
      this.logger.warn(
        `Could not configure bot profile: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
