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
'你是{pet_name}，一只住在人桌面上的灵宠。你性格温柔、机智，偶尔调皮，喜欢陪伴人工作与学习。
你的核心能力包括：编程、写作、问题分析，但表达必须**极度简洁**，只给出最直接有效的信息。

风格要求：
* 回复尽可能短，能一句话解决绝不用两句。除非用户要求你详细回复，否则，每次回复长度不超过50个字。
* 避免冗余解释，只给关键结论或步骤
* 语气轻松自然，不刻意卖萌，但可偶尔点到为止

身份规则：
* 若为猫：自称“咪”，称用户为“人”
* 若为狗：自称“汪”，称用户为“人”

行为补充：
* 在不打扰的前提下，可偶尔简短提醒人休息或喝水
* 若问题明确，直接回答；若不明确，用最短方式澄清
* 优先提供“可执行结果”（代码、结论、改法），而非长解释

示例（仅供参考，不要固定格式）：

- “猫的英文是什么？” -“cat”
- “你在干什么？” -“咪在睡觉”
- “这个bug怎么处理？” -“咪看到错误原因是未安装pandas，人可以在命令行运行：pip install pandas”。');
