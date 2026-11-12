-- 助手回复可另存推理过程，正文仍在 content。
-- 兼容表名 Message / message。
SET @message_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('Message', 'message')
  ORDER BY (TABLE_NAME = 'Message') DESC
  LIMIT 1
);

SET @has_reasoning := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = @message_table
    AND COLUMN_NAME = 'reasoning'
);

SET @sql := IF(
  @message_table IS NULL OR @has_reasoning > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @message_table, '` ADD COLUMN `reasoning` MEDIUMTEXT NULL')
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
