import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { AdminGuard } from './common/admin.guard';
import { BotUpdate } from './bot/bot.update';
import { TextRouterUpdate } from './bot/text-router.update';
import { ChannelsService } from './channels/channels.service';
import { ChannelsUpdate } from './channels/channels.update';
import { PendingChannelActionService } from './channels/pending-channel-action.service';
import { MoviesService } from './movies/movies.service';
import { MoviesUpdate } from './movies/movies.update';
import { PendingUploadService } from './movies/pending-upload.service';
import { UploadUpdate } from './movies/upload.update';
import { PrismaModule } from './prisma/prisma.module';
import { SubscriptionService } from './subscription/subscription.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TelegrafModule.forRoot({ token: process.env.BOT_TOKEN as string }),
  ],
  providers: [
    AdminGuard,
    ChannelsService,
    PendingChannelActionService,
    MoviesService,
    PendingUploadService,
    SubscriptionService,
    BotUpdate,
    TextRouterUpdate,
    ChannelsUpdate,
    MoviesUpdate,
    UploadUpdate,
  ],
})
export class AppModule {}
