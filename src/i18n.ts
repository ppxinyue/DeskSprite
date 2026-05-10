import { useMemo } from 'react';
import { useSettingsStore, type AppLanguage } from '@/features/settings/settingsStore';

export const LANGUAGE_OPTIONS: Array<{ id: AppLanguage; label: string; description: string }> = [
  { id: 'zh', label: '中文', description: '简体中文' },
  { id: 'en', label: 'English', description: 'English' },
];

const EN: Record<string, string> = {
  '个人档案': 'Profile',
  '通用': 'General',
  '外观': 'Appearance',
  '提醒事项': 'Reminders',
  'AI 对话': 'AI Chat',
  '对话历史': 'Chat History',
  '加载中...': 'Loading...',
  '加载中': 'Loading',
  '语言': 'Language',
  '界面语言': 'Interface Language',
  '选择界面显示语言': 'Choose the app display language',
  '中文': 'Chinese',
  '简体中文': 'Simplified Chinese',
  '英文': 'English',
  '开机自启': 'Launch at Login',
  '登录 macOS 后自动启动 DeskSprite': 'Start DeskSprite after logging in to macOS',
  'Timeline 记录': 'Timeline Recording',
  '不开专注模式也会全程记录达到最小时长的前台窗口': 'Record foreground windows that meet the minimum duration, even outside Focus Mode',
  'Timeline 最小时长': 'Timeline Minimum Duration',
  '短于该时长的快速切屏不会记录，也不会打断当前 app 时段': 'Quick switches shorter than this are ignored and will not split the current app segment',
  '游戏识别列表': 'Game Detection List',
  '当用户正在进行以下游戏时，会自动取消置顶，并暂停 Timeline 刷新监测，以保证游戏性能。': 'When you are playing the games below, DeskSprite automatically disables always-on-top and pauses Timeline monitoring to protect game performance.',
  '添加游戏': 'Add Game',
  '共享屏幕时隐藏灵宠': 'Hide Pet While Screen Sharing',
  '默认开启，防止共享屏幕时灵宠进入画面': 'Enabled by default to keep the pet out of screen shares',
  '全局唤起': 'Global Shortcut',
  '截图快捷键': 'Screenshot Shortcut',
  '清除所有对话历史': 'Clear All Chat History',
  '删除所有 API 配置': 'Delete All API Configs',
  '导出对话资料 (JSON)': 'Export Chat Data (JSON)',
  '外观设置': 'Appearance',
  '形象模式': 'Avatar Mode',
  '主题': 'Theme',
  '跟随系统': 'Follow System',
  '浅色': 'Light',
  '深色': 'Dark',
  '跟随 macOS 外观设置': 'Follow macOS appearance',
  '始终使用浅色主题': 'Always use light theme',
  '始终使用深色主题': 'Always use dark theme',
  '灵宠/悬浮球透明度': 'Pet / Orb Opacity',
  '灵宠/悬浮球大小': 'Pet / Orb Size',
  '对话框宽度': 'Chat Width',
  '对话字号': 'Chat Font Size',
  '始终置顶显示': 'Always on Top',
  '穿越全屏应用': 'Stay Above Fullscreen Apps',
  '自定义形象': 'Custom Avatar',
  '灵宠动作': 'Pet Motion',
  '灵宠形象使用 GIF 动图时，不叠加动作效果': 'GIF avatars do not use additional motion effects.',
  'Orb 模式由程序绘制，图片与 GIF 设置已收起': 'Orb Mode is rendered in code, so image and GIF settings are hidden.',
  'Orb 模式使用代码动效，不需要图片动作参数': 'Orb Mode uses code-based animation and does not need pet motion settings.',
  '休息提醒': 'Rest Reminders',
  '休息喝水提醒': 'Rest & Hydration Reminder',
  '提醒间隔': 'Reminder Interval',
  '休息时长': 'Rest Duration',
  '专注模式': 'Focus Mode',
  '退出专注': 'Exit Focus',
  '专注时长': 'Focus Duration',
  '分心检测': 'Distraction Detection',
  '检测宽限期': 'Grace Period',
  '屏蔽应用': 'Blocked Apps',
  '添加应用': 'Add App',
  '屏蔽关键词': 'Blocked Keywords',
  '添加关键词': 'Add Keyword',
  '确认': 'Apply',
  '已应用，前端计时已刷新': 'Applied. Timers updated.',
  '内置额度': 'Built-in Quota',
  '本机额度': 'Local Quota',
  'CloseAI 默认服务': 'CloseAI Default Service',
  'Key: 内置隐藏': 'Key: Built-in, Hidden',
  'Coding 模式': 'Coding Mode',
  '退出 Coding 模式': 'Exit Coding Mode',
  '继承当前 session': 'Attach to Current Session',
  '开启新 session': 'Start New Session',
  'Chat 模型': 'Chat Model',
  '模型': 'Model',
  '默认': 'Default',
  '自定义': 'Custom',
  '自定义配置': 'Custom Configuration',
  '添加 API Key': 'Add API Key',
  '宠物名字': 'Pet Name',
  'Orb 模式使用通用 AI 助手身份': 'Orb Mode uses a general AI assistant identity',
  'Orb 模式使用独立的 AI 助手 Prompt，不会覆盖灵宠模式的设定。': 'Orb Mode uses a separate AI assistant prompt and will not overwrite Pet Mode settings.',
  'System Prompt': 'System Prompt',
  '保存': 'Save',
  '修改': 'Edit',
  '完成': 'Done',
  '重置为默认': 'Reset to Default',
  '语音模型': 'Voice Models',
  'STT 模型': 'STT Model',
  'TTS 模型': 'TTS Model',
  '语音设置': 'Voice Settings',
  '语音输入语言': 'Speech Input Language',
  '系统输入': 'System Input',
  '系统朗读': 'System Voice',
  '语音输出': 'Voice Output',
  '语音唤醒': 'Voice Wake',
  '开启后，说出唤醒词即可唤醒灵宠对话': 'When enabled, saying the wake word opens pet chat.',
  '唤醒词': 'Wake Word',
  '自动朗读 AI 回复': 'Auto-read AI Replies',
  '朗读语速': 'Speech Rate',
  '暂无对话历史': 'No chat history',
  'Coding 历史': 'Coding History',
  '返回': 'Back',
  '空对话': 'Empty conversation',
  '编辑 API 配置': 'Edit API Config',
  '添加 API 配置': 'Add API Config',
  '配置你的 AI 模型 API Key。Key 只保存在本机数据库中，界面不会展示明文。': 'Configure your AI model API key. Keys are stored locally and never shown in plain text.',
  '服务提供商': 'Provider',
  '模型名称': 'Model Name',
  '请填写模型名称，例如：gpt-4o-mini': 'Enter a model name, for example: gpt-4o-mini',
  '获取 API Key：': 'Get API Key:',
  '取消': 'Cancel',
  '添加': 'Add',
  '使用中': 'Active',
  '设为默认': 'Set Default',
  '使用此配置': 'Use This Config',
  '测试': 'Test',
  '正在测试连接...': 'Testing connection...',
  '暂无 API 配置，点击“添加 API Key”添加': 'No API configs yet. Click “Add API Key” to add one.',
  '上传图片': 'Upload Image',
  '语音输入': 'Voice Input',
  '输入消息...': 'Type a message...',
  '发送': 'Send',
  '停止朗读': 'Stop Reading',
  '朗读': 'Read Aloud',
  '复制': 'Copy',
  '剪贴板图片': 'Clipboard Image',
  '图片': 'Image',
  '对话': 'Chat',
  '新对话': 'New Chat',
  '历史对话': 'History',
  '暂无历史': 'No History',
  '设置': 'Settings',
  '隐藏': 'Hide',
  '退出': 'Quit',
  '当前': 'Current',
  '该休息啦': 'Time to rest',
  '继续专注': 'Keep Focusing',
  '结束专注': 'End Focus',
  'OK': 'OK',
  '忽略': 'Ignore',
  '提前结束': 'End Early',
  '最近 14 天': 'Last 14 Days',
  '专注次数': 'Focus Sessions',
  '分心次数': 'Distractions',
  'Coding 模式时长': 'Coding Mode Time',
  'Timeline': 'Timeline',
  '暂无足够长的焦点窗口记录': 'No long-enough focus window records yet',
  'Top 软件': 'Top Apps',
  '全天活跃度': 'Daily Activity',
  '分心软件排名': 'Distracting Apps',
  '分心软件排行': 'Distracting Apps',
  '今天': 'Today',
  '昨天': 'Yesterday',
  '昨日示例': 'Yesterday Example',
  '上个月': 'Previous Month',
  '下个月': 'Next Month',
  '前一天': 'Previous Day',
  '后一天': 'Next Day',
  '选择统计日期': 'Select Date',
  '横向滑动查看历史': 'Scroll horizontally to view history',
  '最高单日专注': 'Best Focus Day',
  '平均每日专注': 'Average Daily Focus',
  '平均分心次数': 'Average Distractions',
  '这一天还没有记录到分心软件': 'No distracting apps recorded on this day',
  '暂无 Coding 对话': 'No coding conversations',
  '新 session 历史': 'New Session History',
  '新建 session': 'New Session',
  '后台详情': 'Background Details',
  '无标题活动': 'Untitled Activity',
  '无窗口标题': 'No Window Title',
  '浏览器': 'Browser',
  '办公': 'Work',
  '娱乐': 'Entertainment',
  '其他': 'Other',
  '通知': 'Notifications',
  '记录': 'Record',
  '记录达到最小时长的前台窗口，浏览器会尽量保留当前网站': 'Records foreground windows that reach the minimum duration. Browser entries try to keep the current site.',
  '软件': 'App',
  '段': 'segments',
  '个 task': 'tasks',
  '共': 'Total',
  '累计': 'Total',
  '分钟': 'min',
  '小时': 'h',
  '天专注': 'days focused',
  '次专注': 'focus sessions',
  '次分心': 'distractions',
  '动图': 'GIF',
  'GIF 动图': 'GIF',
  '常见图片格式': 'Common Image Formats',
  '图片方案只能上传 PNG、JPG、JPEG、WEBP 或 BMP。': 'Image mode supports PNG, JPG, JPEG, WEBP, or BMP only.',
  '方案只能上传 .gif 动图。': 'GIF mode supports .gif files only.',
  'GIF 方案只能上传 .gif 动图。': 'GIF mode supports .gif files only.',
  '只能上传图片，请选择 PNG、JPG、JPEG、WEBP、GIF 或 BMP 格式。': 'Upload an image in PNG, JPG, JPEG, WEBP, GIF, or BMP format.',
  '图片无法预览': 'Image preview unavailable',
  '确定要删除这个 GIF 吗？': 'Delete this GIF?',
  '确定要删除这张图片吗？': 'Delete this image?',
  '确定要恢复全部默认吗？这将删除所有自定义图片。': 'Restore all defaults? This will remove all custom images.',
  '恢复全部默认': 'Restore Defaults',
  '系统默认图片不可删除': 'Built-in images cannot be deleted',
  '至少需要保留一个正在使用的灵宠 GIF。': 'Keep at least one active pet GIF.',
  '至少需要保留一张正在使用的灵宠图片。': 'Keep at least one active pet image.',
  '上传': 'Upload',
  '使用': 'Use',
  '待机': 'Idle',
  '休息': 'Rest',
  '专注': 'Focus',
  '删除': 'Delete',
  '关闭': 'Off',
  '打开对话': 'Open Chat',
  '打开 Coding 模式': 'Open Coding Mode',
  '放大到大聊天框': 'Expand to Full Chat',
  '收起': 'Collapse',
  '开始一次新的对话': 'Start a new conversation',
  '选择模型': 'Select Model',
  '先写点内容，或添加一张图片。': 'Type something or add an image first.',
  '暂不支持图片输入，请切换到支持视觉的模型。': 'Image input is not supported. Switch to a vision-capable model.',
  '请先在设置中配置 API Key。': 'Configure an API key in Settings first.',
  '请允许麦克风权限以使用语音输入。': 'Allow microphone access to use voice input.',
  '无法启动系统语音输入。': 'Could not start system voice input.',
  '内置语音输入额度已用完或云端识别暂不可用，已切换到系统语音输入。': 'Built-in speech quota is exhausted or cloud recognition is unavailable. Switched to system voice input.',
  '自定义 STT 未配置或暂不可用，已切换到系统语音输入。': 'Custom STT is not configured or unavailable. Switched to system voice input.',
  '当前系统 WebView 没有暴露系统语音识别接口，无法直接启动语音输入。': 'The current WebView does not expose system speech recognition, so voice input cannot start.',
  '当前运行环境缺少系统语音识别权限说明，已阻止启动以避免 macOS 闪退。请使用打包后的 .app 版本。': 'System speech recognition permission text is missing in this runtime. Voice input was blocked to avoid macOS crashes. Use the packaged .app build.',
  '请分析这张图片。': 'Please analyze this image.',
  '请填写 API Key。': 'Enter an API key.',
  '缺少 API Key，请重新保存配置。': 'API key is missing. Save the config again.',
  '已保存，留空则不修改': 'Saved. Leave blank to keep unchanged.',
  '留空保存则不修改，重新粘贴会覆盖。': 'Leave blank when saving to keep unchanged. Paste a new key to replace it.',
  '保存后会显示长度、尾号和指纹，方便确认测试时使用的是同一把 Key。': 'After saving, length, suffix, and fingerprint are shown so you can verify tests use the same key.',
  '标记为默认的配置会用于 Chat': 'The default config is used for Chat.',
  '选择“使用此配置”后用于语音输入': 'Choose “Use This Config” to use it for speech input.',
  '选择“使用此配置”后用于语音输出': 'Choose “Use This Config” to use it for speech output.',
  '未设置模型': 'No model set',
  '未使用': 'Unused',
  '不使用': 'Do Not Use',
  '内置默认模型': 'Built-in Default Model',
  '默认模型': 'Default Model',
  '默认服务': 'Default Service',
  '内置隐藏': 'Built-in Hidden',
  '当前使用': 'Current',
  '开启后，Coding 模式中显示 Codex 继承 session 和新 session 入口': 'When enabled, Coding Mode shows Codex attach-current-session and new-session entries.',
  '开启后，Coding 模式中显示 Claude Code 继承 session 和新 session 入口': 'When enabled, Coding Mode shows Claude Code attach-current-session and new-session entries.',
  '请回到 Codex 中回复或处理。': 'Return to Codex to reply or handle this.',
  '请回到 Claude Code 中回复或处理。': 'Return to Claude Code to reply or handle this.',
  '正在工作中': 'Working',
  '没有新的': 'No new',
  '无法连接': 'Unable to connect',
  '继承 session': 'Attach Session',
  '新建面板': 'New Panel',
  '跳动': 'Jump',
  '跳动动作': 'Jump Motion',
  '上下轻跳': 'Gentle Jump',
  '摇摆': 'Wobble',
  '摇摆动作': 'Wobble Motion',
  '左右轻晃': 'Wobble',
  '呼吸': 'Breathe',
  '呼吸动作': 'Breathing Motion',
  '轻微缩放': 'Subtle Scale',
  '幅度': 'Amplitude',
  '速度': 'Speed',
  '角度': 'Angle',
  '动作': 'Motion',
  '模式': 'Mode',
  '四宫格': 'Grid',
  '单窗口': 'Single Window',
  '横向并排': 'Side by Side',
  '纵向并排': 'Stacked',
  '日': 'Sun',
  '一': 'Mon',
  '二': 'Tue',
  '三': 'Wed',
  '四': 'Thu',
  '五': 'Fri',
  '六': 'Sat',
};

const ZH_BY_EN = new Map(Object.entries(EN).map(([zh, en]) => [en, zh]));

export function translateText(language: AppLanguage | undefined, text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (language === 'en') return preserveOuterWhitespace(text, EN[trimmed] ?? translateDynamicEnglish(text));
  return preserveOuterWhitespace(text, ZH_BY_EN.get(trimmed) ?? text);
}

export function useI18n() {
  const language = useSettingsStore((state) => state.settings.appLanguage);
  return useMemo(() => ({
    language,
    t: (text: string) => translateText(language, text),
  }), [language]);
}

export function applyDocumentLanguage(language: AppLanguage) {
  const root = document.documentElement;
  root.lang = language === 'en' ? 'en' : 'zh-CN';
  root.dataset.appLanguage = language;

  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const next = translateText(language, node.textContent ?? '');
      if (next !== node.textContent) node.textContent = next;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.closest('[data-i18n-ignore="true"]')) return;
    for (const attr of ['title', 'aria-label', 'placeholder']) {
      const value = node.getAttribute(attr);
      if (!value) continue;
      const next = translateText(language, value);
      if (next !== value) node.setAttribute(attr, next);
    }
    node.childNodes.forEach(translateNode);
  };

  translateNode(document.body);
}

export function installDocumentTranslator(language: AppLanguage) {
  let scheduled = 0;
  const run = () => {
    scheduled = 0;
    applyDocumentLanguage(language);
  };
  run();
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = window.setTimeout(run, 30);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label', 'placeholder'],
  });
  return () => {
    if (scheduled) window.clearTimeout(scheduled);
    observer.disconnect();
  };
}

function preserveOuterWhitespace(source: string, translated: string): string {
  if (translated === source) return translated;
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

function translateDynamicEnglish(text: string): string {
  if (!/[\u4e00-\u9fff]/.test(text)) return text;
  let next = text;
  next = next.replace(/(\d{4})年(\d{1,2})月/g, (_, year, month) => `${monthName(Number(month))} ${year}`);
  next = next.replace(/(\d{1,2})月(\d{1,2})日/g, (_, month, day) => `${monthName(Number(month))} ${Number(day)}`);
  next = next.replace(/(\d+)\s*小时\s*(\d+)\s*分钟/g, '$1h $2m');
  next = next.replace(/(\d+)\s*小时/g, '$1h');
  next = next.replace(/(\d+)\s*分钟/g, '$1m');
  next = next.replace(/共\s*/g, 'Total ');
  next = next.replace(/累计\s*/g, 'Total ');
  next = next.replace(/分心\s*(\d+)\s*次/g, '$1 distractions');
  next = next.replace(/(\d+)\s*次专注/g, '$1 focus sessions');
  next = next.replace(/(\d+)\s*次分心/g, '$1 distractions');
  next = next.replace(/(\d+)\s*次/g, '$1 times');
  next = next.replace(/(\d+)\s*段/g, '$1 segments');
  next = next.replace(/(\d+)\s*个\s*task/gi, '$1 tasks');
  next = next.replace(/当前使用：/g, 'Current: ');
  next = next.replace(/当前使用\s*(\d+)\s*\/\s*(\d+)\s*个\s*GIF/g, 'Using $1 / $2 GIFs');
  next = next.replace(/当前使用\s*(\d+)\s*\/\s*(\d+)\s*张图片/g, 'Using $1 / $2 images');
  next = next.replace(/（(\d+)\s*个）/g, ' ($1)');
  next = next.replace(/（(\d+)\s*张）/g, ' ($1)');
  next = next.replace(/\((\d+)\s*个\)/g, '($1)');
  next = next.replace(/\((\d+)\s*张\)/g, '($1)');
  next = next.replace(/(\d+)\s*个\s*GIF/g, '$1 GIFs');
  next = next.replace(/(\d+)\s*个/g, '$1');
  next = next.replace(/(\d+)\s*张图片/g, '$1 images');
  next = next.replace(/(\d+)\s*张/g, '$1');
  next = next.replace(/周([日一二三四五六])/g, (_, day) => EN[day] ?? day);
  return next;
}

function monthName(month: number): string {
  return [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][Math.min(11, Math.max(0, month - 1))] ?? String(month);
}
