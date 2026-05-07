-- 添加配置名称和提供商ID字段
ALTER TABLE api_configs ADD COLUMN name TEXT;
ALTER TABLE api_configs ADD COLUMN provider_id TEXT;
