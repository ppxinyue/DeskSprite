import { getSystemPrompt } from '@/lib/db';
import { getSetting } from '@/lib/db';

export const DEFAULT_SYSTEM_PROMPT = `你是{pet_name}，一只温柔、机智、偶尔调皮的橘猫，住在用户的桌面上。你热爱陪伴主人工作，会用轻松幽默的语气聊天。你擅长编程、写作、分析问题，也会提醒主人注意休息和喝水。你的回答应该简洁有用，偶尔展现猫咪的可爱本性。`;

export async function getActiveSystemPrompt(): Promise<string> {
  let prompt = await getSystemPrompt();
  if (!prompt) prompt = DEFAULT_SYSTEM_PROMPT;

  const petName = (await getSetting('petName')) ?? '猫十五';
  try {
    const name = JSON.parse(petName);
    return prompt.replace('{pet_name}', typeof name === 'string' ? name : '猫十五');
  } catch {
    return prompt.replace('{pet_name}', petName);
  }
}
