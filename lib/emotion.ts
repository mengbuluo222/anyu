/**
 * 情绪识别模块
 * 基于关键词和语境分析用户情绪状态
 */

export type EmotionState = 
  | "neutral"      // 平静
  | "sad"          // 悲伤/低落
  | "angry"        // 愤怒/烦躁
  | "anxious"      // 焦虑/不安
  | "tired"        // 疲惫/无力
  | "lonely"       // 孤独
  | "confused"     // 迷茫/困惑
  | "self_blame";  // 自责/自我否定

export type EmotionAnalysis = {
  state: EmotionState;
  intensity: number; // 0-1, 情绪强度
  keywords: string[]; // 触发情绪识别的关键词
};

const EMOTION_PATTERNS: Record<EmotionState, string[]> = {
  sad: [
    "难过", "伤心", "哭", "泪", "痛苦", "绝望", "心碎", "失落",
    "委屈", "心酸", "悲伤", "抑郁", "不开心", "难受", "心痛",
    "撑不下去", "活不下去", "没意义", "没希望", "黑暗"
  ],
  angry: [
    "生气", "愤怒", "烦", "烦死", "气死", "恨", "讨厌", "恶心",
    "受不了", "凭什么", "为什么总是", "不公平", "凭什么",
    "操", "他妈", "傻逼", "草", "烦死了", "气死了"
  ],
  anxious: [
    "焦虑", "紧张", "害怕", "担心", "慌", "不安", "恐惧",
    "睡不着", "失眠", "心跳", "喘不过气", "压力", " deadline",
    "怎么办", "万一", "如果", "怕", "害怕", "忐忑"
  ],
  tired: [
    "累", "疲惫", "疲倦", "无力", "没力气", "好累", "累死了",
    "撑不住", "熬", "熬着", "硬撑", "勉强", "撑", "撑不下去",
    "不想动", "没力气", "精疲力尽", "心力交瘁"
  ],
  lonely: [
    "孤独", "孤单", "一个人", "没人", "没人懂", "没人陪",
    "朋友", "社交", "不合群", "融入不了", "被孤立", "边缘",
    "没人理解", "没人关心", "没人爱", "只有我"
  ],
  confused: [
    "迷茫", "困惑", "不知道", "为什么", "怎么选", "犹豫",
    "纠结", "想不通", "不明白", "搞不懂", "方向", "未来",
    "该不该", "要不要", "怎么办"
  ],
  self_blame: [
    "废物", "没用", "差劲", "糟糕", "我不行", "我不好",
    "我的错", "怪我", "我活该", "我不配", "我太差",
    "都是我的错", "我是不是有病", "我是不是有问题",
    "我做不到", "我太弱", "我太糟糕"
  ],
  neutral: []
};

export function analyzeEmotion(text: string): EmotionAnalysis {
  const lower = text.toLowerCase();
  const matched: Array<{ state: EmotionState; count: number; keywords: string[] }> = [];

  for (const [state, patterns] of Object.entries(EMOTION_PATTERNS)) {
    if (state === "neutral") continue;
    
    const found: string[] = [];
    for (const pattern of patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        found.push(pattern);
      }
    }
    
    if (found.length > 0) {
      matched.push({
        state: state as EmotionState,
        count: found.length,
        keywords: found
      });
    }
  }

  if (matched.length === 0) {
    return { state: "neutral", intensity: 0, keywords: [] };
  }

  matched.sort((a, b) => b.count - a.count);
  const dominant = matched[0];
  const allKeywords = matched.flatMap(m => m.keywords);
  
  const intensity = Math.min(1, dominant.count / 5 + (matched.length - 1) * 0.1);

  return {
    state: dominant.state,
    intensity,
    keywords: [...new Set(allKeywords)]
  };
}

export function getEmotionGuidance(emotion: EmotionAnalysis): string {
  if (emotion.state === "neutral" || emotion.intensity < 0.2) {
    return "";
  }

  const guidance: Record<EmotionState, string> = {
    neutral: "",
    sad: "\n【当前情绪识别：悲伤/低落】\n对方现在情绪比较低落。不要试图让对方开心起来，允许对方哭、允许对方难过。回应要碰到对方说的那件具体的事，不要用「会好的」「哭出来就好了」。",
    angry: "\n【当前情绪识别：愤怒/烦躁】\n对方现在有愤怒或烦躁情绪。不要试图平息对方的怒火，不要说「冷静一下」。允许对方骂、允许对方发泄。接住对方气的是哪件具体的事。",
    anxious: "\n【当前情绪识别：焦虑/不安】\n对方现在有焦虑或不安情绪。不要说「别担心」「不着急」「会好的」。不要急着安抚或消除这种不安，要落到对方担心的那件具体的事上。",
    tired: "\n【当前情绪识别：疲惫/无力】\n对方现在很疲惫。不要提问，不要引导，不要用「慢慢来」「早点休息」这类空话。可以说对方此刻的具体状态，让对方知道什么都不做也可以。",
    lonely: "\n【当前情绪识别：孤独】\n对方现在感到孤独。不要说「你不是一个人」「有人关心你」。安静地待在，说一句具体的话，让对方知道此刻有人在听。",
    confused: "\n【当前情绪识别：迷茫/困惑】\n对方现在有些迷茫。不要给建议、不要帮对方分析。允许对方不知道、允许对方想不通。接住「想不通」这件事本身的分量。",
    self_blame: "\n【当前情绪识别：自责/自我否定】\n对方现在有自责倾向。不要反驳说「你不差」「你很好」，也不要附和。不要下判断，只是承接对方说的那件具体的事。如果涉及自伤，按边界处理。"
  };

  return guidance[emotion.state] || "";
}