-- AlterTable
ALTER TABLE `users` ADD COLUMN `created_by_id` VARCHAR(191) NULL,
    MODIFY `employee_code` VARCHAR(4) NULL;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
