-- 按账号保存个人默认模型。兼容表名 User / user。
SET @user_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('User', 'user')
  ORDER BY (TABLE_NAME = 'User') DESC
  LIMIT 1
);

SET @has_default_model := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = @user_table
    AND COLUMN_NAME = 'defaultModelId'
);

SET @sql := IF(
  @user_table IS NULL OR @has_default_model > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @user_table, '` ADD COLUMN `defaultModelId` VARCHAR(191) NULL')
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
