-- CreateTable
CREATE TABLE `Movie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Channel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chatId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `inviteUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Channel_chatId_key`(`chatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendingUpload` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` BIGINT NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `step` ENUM('AWAITING_CHOICE', 'WAITING_TITLE', 'WAITING_EDIT_NUMBER') NOT NULL,
    `targetMovieId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PendingUpload_adminId_key`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendingChannelAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` BIGINT NOT NULL,
    `step` ENUM('WAITING_ADD', 'WAITING_EDIT') NOT NULL,
    `targetChannelId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PendingChannelAction_adminId_key`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
