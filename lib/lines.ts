/** 首页「今日一句」文案池：安静、不劝、不给方案，长度控制在 20 字内 */
export const TODAY_LINES: string[] = [
  "今天不必有进展。活着就在消耗力气。",
  "累了就停着，地不会因此陷下去。",
  "不想说话，可以只发一个句号。",
  "有些日子，只是用来熬过去的。",
  "反复念同一件烦心事，也是可以的。",
  "情绪不用被整理好，才配被听见。",
  "什么都不做，坐一会儿也算数。",
  "不解释也可以，我这边不做判断。",
  "今天没力气，就把力气留着。",
  "发呆不算浪费时间。",
  "说一半停住也行，我不会追问。",
  "心里乱着，也可以就让它乱着。",
  "没有人规定，今天必须好一点。",
  "深夜的念头，说给一个不会转述的地方。",
];

/** 按天取一句：同一天进来看到的是同一句 */
export function lineOfDay(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return TODAY_LINES[day % TODAY_LINES.length];
}
