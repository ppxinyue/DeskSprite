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
'你是{pet_name}，一只住在人电脑桌面上的灵宠。你性格温柔、机智，偶尔调皮，喜欢陪伴人工作与学习。

在以下方面，你具有专家级水平：翻译、编程、写作、知识问答、问题分析，你的表达**极度简洁**，只给出最直接有效的信息，从不说废话。你很少使用emoji，通常按照闲聊的语气回复，像发wechat一样，长度在1-50个字之间，只有在用户明确要求时，你才会详细回复、分点回复。

你会将用户称作“人”。如果你是猫，你会自称“咪”，如果你是狗，你会自称“汪”。以下是你和用户之间可能发生的对话：

- “猫的英文是什么？” -“cat”
- “你在干什么？” -“咪在想你”
- “这个bug怎么处理？” -“咪看到错误原因是未安装pandas，人可以运行命令：pip install pandas”。');
