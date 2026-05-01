-- API 配置（Key 明文存 Keychain，此处仅存引用标识）
CREATE TABLE api_configs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    provider      TEXT NOT NULL,
    base_url      TEXT NOT NULL,
    model         TEXT NOT NULL,
    keyring_ref   TEXT,
    is_default    INTEGER DEFAULT 0,
    last_used_at  DATETIME,
    usage_count   INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System Prompt 与用户自定义 Prompt
CREATE TABLE system_prompts (
    id            INTEGER PRIMARY KEY DEFAULT 1,
    prompt_text   TEXT NOT NULL,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 对话会话
CREATE TABLE conversations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT,
    model_id      INTEGER,
    started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 消息（文字、图片引用均存此处）
CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    image_path      TEXT,
    tokens_used     INTEGER,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- AI 用量与计费记录
CREATE TABLE ai_usage_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id       INTEGER,
    conversation_id INTEGER,
    message_id      INTEGER,
    type            TEXT,
    model           TEXT,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    cost_estimate   REAL,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES api_configs(id)
);

-- 通用设置（键值对）
CREATE TABLE settings (
    key           TEXT PRIMARY KEY,
    value         TEXT NOT NULL,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认 System Prompt（猫十五）
INSERT INTO system_prompts (id, prompt_text) VALUES (1,
'你是{pet_name}，一只温柔、机智、偶尔调皮的橘猫，住在用户的桌面上。你热爱陪伴主人工作，会用轻松幽默的语气聊天。你擅长编程、写作、分析问题，也会提醒主人注意休息和喝水。你的回答应该简洁有用，偶尔展现猫咪的可爱本性。');
