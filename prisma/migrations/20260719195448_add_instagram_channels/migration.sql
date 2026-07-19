-- AlterTable
ALTER TABLE `channel` ADD COLUMN `type` ENUM('TELEGRAM', 'INSTAGRAM') NOT NULL DEFAULT 'TELEGRAM',
    MODIFY `chatId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pendingchannelaction` ADD COLUMN `draftLink` VARCHAR(191) NULL,
    MODIFY `step` ENUM('WAITING_TYPE', 'WAITING_TELEGRAM_IDENTIFIER', 'WAITING_INSTAGRAM_LINK', 'WAITING_INSTAGRAM_TITLE') NOT NULL;

-- CreateTable
CREATE TABLE `InstagramFollow` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channelId` INTEGER NOT NULL,
    `userId` BIGINT NOT NULL,
    `confirmed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InstagramFollow_channelId_userId_key`(`channelId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

