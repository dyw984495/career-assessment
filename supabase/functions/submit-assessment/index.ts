// ============================================================
// Supabase Edge Functions - 提交测评
// Deno Runtime（服务端执行评分，确保分数不可篡改）
// 部署路径：supabase/functions/submit-assessment/index.ts
// 调用方式：POST /functions/v1/submit-assessment
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 头（允许前端域名访问）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------- 评分逻辑（服务端版本） ----------

type InterestKey = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
type PersonalityKey = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'stability'
type InterestScores = Record<InterestKey, number>
type PersonalityScores = Record<PersonalityKey, number>

const INTEREST_KEYS: InterestKey[] = ['R', 'I', 'A', 'S', 'E', 'C']
const PERSONALITY_KEYS: PersonalityKey[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'stability']

const INTEREST_LABELS: Record<InterestKey, string> = {
  R: '现实型', I: '研究型', A: '艺术型', S: '社会型', E: '企业型', C: '常规型',
}

const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  openness: '开放性', conscientiousness: '尽责性', extraversion: '外向性', agreeableness: '宜人性', stability: '情绪稳定性',
}

// 题目数据（与前端完全一致）
const questionData: Array<[number, 'interest' | 'personality', string, string, boolean?]> = [
  [1,'interest','R','我愿意动手完成具体任务。'], [2,'interest','R','我喜欢看见直接成果。'], [3,'interest','R','我对现场执行类工作有兴趣。'],
  [4,'interest','I','我愿意研究问题原因。'], [5,'interest','I','分析归纳会让我有成就感。'], [6,'interest','I','我倾向先分析再下结论。'],
  [7,'interest','A','我喜欢创意表达。'], [8,'interest','A','我喜欢尝试新方法。'], [9,'interest','A','有创作空间时我更投入。'],
  [10,'interest','S','我愿意倾听并帮助别人。'], [11,'interest','S','看到别人进步会让我满足。'], [12,'interest','S','我更容易被服务支持类工作吸引。'],
  [13,'interest','E','我愿意争取资源推动目标。'], [14,'interest','E','我不回避说服他人。'], [15,'interest','E','我对组织带动结果类工作有兴趣。'],
  [16,'interest','C','我对整理信息和流程执行有耐心。'], [17,'interest','C','规则清晰时我更容易发挥。'], [18,'interest','C','我不排斥核对排期复盘。'],
  [19,'personality','extraversion','我通常愿意主动表达。'], [20,'personality','agreeableness','我愿意配合团队推进。'],
  [21,'personality','conscientiousness','我做事有计划。'], [22,'personality','stability','我常因压力明显焦虑。',true],
  [23,'personality','openness','我对新想法保持开放。'], [24,'personality','extraversion','我更倾向独处。',true],
  [25,'personality','agreeableness','我有时不太顾及他人感受。',true], [26,'personality','conscientiousness','我偶尔会拖延。',true],
  [27,'personality','stability','我通常能较快恢复稳定。'], [28,'personality','openness','我不太愿意尝试新做法。',true],
  [29,'personality','extraversion','我能自然加入讨论。'], [30,'personality','agreeableness','我愿意理解不同观点。'],
  [31,'personality','conscientiousness','我重视质量和结果闭环。'], [32,'personality','stability','我容易反复担心。',true],
  [33,'personality','openness','我愿意多角度思考。'], [34,'personality','extraversion','陌生场景中我通常不主动。',true],
  [35,'personality','agreeableness','为了目标我有时不顾协调过程。',true], [36,'personality','conscientiousness','没有要求时我不一定主动检查细节。',true],
  [37,'personality','stability','遇到变化时我大多能保持冷静。'], [38,'personality','openness','我愿意接触新领域。'],
  [39,'interest','R','我更喜欢把想法变成看得见的成果。'], [40,'interest','I','遇到复杂问题时，我会想继续追根究底。'],
  [41,'interest','A','我喜欢在固定要求之外加入自己的表达方式。'], [42,'interest','S','我会因为帮助别人解决问题而获得满足感。'],
  [43,'interest','E','我愿意主动带头推动一件事往前走。'], [44,'interest','C','我做事时会自然去整理顺序和细节。'],
]

const questions = questionData.map(([id, kind, dim, text, reverse]) => ({
  id, kind, dim: dim as InterestKey | PersonalityKey, text, reverse: reverse ?? false,
}))

// 评分函数
function score(answers: Record<number, number>): { interest: InterestScores; personality: PersonalityScores } {
  const interestBuckets = Object.fromEntries(INTEREST_KEYS.map(k => [k, [] as number[]])) as Record<InterestKey, number[]>
  const personalityBuckets = Object.fromEntries(PERSONALITY_KEYS.map(k => [k, [] as number[]])) as Record<PersonalityKey, number[]>

  questions.forEach(q => {
    const raw = answers[q.id]
    if (typeof raw !== 'number') return
    const value = Math.max(1, Math.min(5, raw))
    if (q.kind === 'interest') {
      interestBuckets[q.dim as InterestKey].push(value)
    } else {
      personalityBuckets[q.dim as PersonalityKey].push(q.reverse ? 6 - value : value)
    }
  })

  const rawInterest = INTEREST_KEYS.reduce((acc, k, idx) => {
    const arr = interestBuckets[k]
    const weightedSum = arr.reduce((sum, v, i) => sum + v * (1 + i * 0.04), 0)
    const weightedWeight = arr.reduce((sum, _, i) => sum + 1 + i * 0.04, 0) || 1
    acc[k] = (arr.length ? weightedSum / weightedWeight : 3) + idx * 0.002
    return acc
  }, { R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 } as InterestScores)

  const values = INTEREST_KEYS.map(k => rawInterest[k])
  const m = values.reduce((a, b) => a + b, 0) / values.length
  const spread = Math.max(...values) - Math.min(...values)
  const amp = spread < 0.2 ? 2.2 : spread < 0.35 ? 2.0 : spread < 0.5 ? 1.75 : 1.55

  const interest = INTEREST_KEYS.reduce((acc, k) => {
    const centered = rawInterest[k] - m
    const scaled = 50 + centered * 25 * amp
    acc[k] = Math.max(18, Math.min(92, Math.round(scaled)))
    return acc
  }, { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 } as InterestScores)

  const mean5 = (arr: number[], fallback = 3) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback

  const personality = PERSONALITY_KEYS.reduce((acc, k) => {
    acc[k] = Math.round(((mean5(personalityBuckets[k]) - 1) / 4) * 100)
    return acc
  }, { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, stability: 50 } as PersonalityScores)

  return { interest, personality }
}

function sortEntries<T extends string>(obj: Record<T, number>): Array<[T, number]> {
  return (Object.entries(obj) as Array<[T, number]>).sort((a, b) => b[1] - a[1])
}

function topKeys<T extends string>(obj: Record<T, number>, n: number): T[] {
  return sortEntries(obj).slice(0, n).map(([key]) => key)
}

function distance<T extends string>(user: Record<T, number>, target: Record<T, number>): number {
  const keys = Object.keys(target) as T[]
  const total = keys.reduce((sum, key) => sum + Math.abs((user[key] ?? 0) - target[key]), 0)
  return Math.round((1 - total / (keys.length * 100)) * 100)
}

// 岗位数据（核心 40 个）
const roleData = [
  ['产品经理','📦',{R:35,I:82,A:68,S:58,E:72,C:58},{openness:76,conscientiousness:74,extraversion:58,agreeableness:60,stability:64},'识别用户问题，定义方案并推动上线。',['需求分析','跨团队推进','版本复盘'],'头部大厂更偏好 985/211、海本海硕或强专业背景。',['需求分析','原型','SQL','PPT'],['校招 15-25 万/年','2-3 年 25-40 万/年','高级 40-70 万/年','负责人 70 万+/年'],['互联网','企业服务','AI 应用'],['腾讯','阿里巴巴','字节跳动','美团']],
  ['用户运营','👥',{R:20,I:54,A:58,S:80,E:72,C:70},{openness:60,conscientiousness:80,extraversion:68,agreeableness:74,stability:68},'负责用户增长、留存和活动转化。',['活动策划','留存分析','协同优化'],'一线平台更看学校背景，中腰部更灵活。',['Excel','活动策划','内容运营','用户洞察'],['校招 12-20 万/年','2-3 年 20-30 万/年','高级 30-50 万/年'],['互联网','消费品牌','电商'],['字节跳动','小红书','得物','京东']],
  ['数据分析','📊',{R:24,I:92,A:28,S:26,E:32,C:84},{openness:60,conscientiousness:84,extraversion:36,agreeableness:54,stability:72},'负责数据整理、问题诊断与结论输出。',['数据清洗','报表搭建','诊断分析'],'大厂通常偏好 985/211、海本海硕和数理背景。',['SQL','Excel','Python','结构化表达'],['校招 15-25 万/年','2-3 年 25-40 万/年','高级 40-65 万/年'],['互联网','金融科技','咨询'],['腾讯','阿里巴巴','美团','拼多多']],
  ['市场策划','✨',{R:18,I:48,A:88,S:54,E:74,C:42},{openness:84,conscientiousness:62,extraversion:64,agreeableness:58,stability:56},'围绕品牌传播和活动创意做策划执行。',['主题策划','方案撰写','效果复盘'],'头部平台会看学校和作品集。',['文案','提案','传播','PPT'],['校招 12-18 万/年','2-3 年 18-30 万/年','高级 30-50 万/年'],['快消','互联网品牌','广告公关'],['宝洁','联合利华','字节跳动','小红书']],
  ['项目管理','🎯',{R:32,I:58,A:32,S:56,E:66,C:88},{openness:48,conscientiousness:90,extraversion:56,agreeableness:66,stability:78},'负责项目排期、协调和交付。',['计划制定','风险管理','协同验收'],'更看执行闭环和协作经历。',['排期推进','跨部门协同','Excel','汇报'],['校招 12-20 万/年','2-3 年 20-35 万/年','高级 35-55 万/年'],['互联网','制造业','咨询服务'],['华为','美团','阿里云','德勤']],
  ['销售顾问','🚀',{R:20,I:34,A:42,S:62,E:92,C:42},{openness:54,conscientiousness:70,extraversion:88,agreeableness:56,stability:68},'负责客户开发、方案推荐和成交推进。',['需求挖掘','方案呈现','成交转化'],'学校门槛相对没那么刚性。',['表达说服','谈判成交','客户管理','目标管理'],['校招 10-18 万底薪 + 提成','2-3 年 20-40 万+/年','主管 35-60 万+/年'],['企业服务','教育服务','SaaS'],['腾讯企点','字节商业化','北森','BOSS直聘']],
  ['招聘顾问 / HRBP','🤝',{R:18,I:46,A:38,S:88,E:72,C:58},{openness:56,conscientiousness:72,extraversion:70,agreeableness:84,stability:64},'负责人才招募、沟通评估和组织支持。',['需求澄清','候选人沟通','业务协同'],'大厂 HR 校招仍有学校门槛。',['沟通评估','筛选判断','协调推进','数据复盘'],['校招 12-18 万/年','2-3 年 18-30 万/年','高级 30-50 万/年'],['互联网','招聘平台','教育服务'],['字节跳动','腾讯','BOSS直聘','领英']],
  ['内容策划','📝',{R:12,I:60,A:86,S:48,E:52,C:46},{openness:88,conscientiousness:66,extraversion:44,agreeableness:62,stability:58},'负责选题规划、文案撰写和传播优化。',['选题策划','文案制作','数据复盘'],'更看作品和项目成果。',['选题','文案','内容审美','数据复盘'],['校招 10-16 万/年','2-3 年 16-28 万/年','高级 28-45 万/年'],['内容平台','互联网品牌','新消费'],['小红书','字节跳动','哔哩哔哩','知乎']],
  ['商业分析','📁',{R:24,I:88,A:40,S:34,E:62,C:74},{openness:64,conscientiousness:82,extraversion:46,agreeableness:56,stability:72},'围绕业务问题做研究、分析和结论输出。',['市场研究','问题拆解','汇报建议'],'头部咨询和战略岗偏好更强学校背景。',['研究分析','PPT','Excel/SQL','问题拆解'],['校招 15-22 万/年','2-3 年 22-38 万/年','高级 38-60 万/年'],['咨询','互联网','金融科技'],['麦肯锡','波士顿咨询','德勤','阿里巴巴']],
  ['行业分析师','📈',{R:18,I:92,A:32,S:20,E:44,C:76},{openness:66,conscientiousness:82,extraversion:36,agreeableness:50,stability:72},'围绕行业趋势、公司经营和估值逻辑输出研究观点。',['行研建模','公司跟踪','研究报告'],'券商研究所和头部机构通常更偏好 985/211、海硕和金融经管背景。',['财务分析','估值模型','行业研究','PPT/Excel'],['校招 18-30 万/年','2-3 年 30-50 万/年','高级 50-80 万/年'],['券商研究','资产管理','买方投资'],['中金公司','中信证券','华泰证券','国泰海通']],
  ['投行经理','💼',{R:24,I:84,A:34,S:32,E:76,C:74},{openness:58,conscientiousness:88,extraversion:60,agreeableness:48,stability:70},'参与 IPO、并购重组、再融资等项目执行。',['材料撰写','尽调访谈','项目推进'],'头部投行明显偏好顶尖院校、金融会计法律背景和较强实习经历。',['财务会计','Excel/建模','PPT/Word','项目执行'],['校招 20-35 万/年','2-3 年 35-60 万/年','VP/经理 60-100 万/年'],['投资银行','资本市场','并购服务'],['中金公司','中信证券','中信建投','高盛']],
  ['咨询顾问','🧠',{R:18,I:82,A:42,S:46,E:72,C:78},{openness:70,conscientiousness:84,extraversion:58,agreeableness:54,stability:70},'帮助客户拆解问题、形成方案并推进落地。',['访谈研究','问题拆解','汇报呈现'],'头部咨询偏好顶尖院校、海本海硕和高强度实习背景。',['问题拆解','PPT','Excel','沟通访谈'],['校招 18-30 万/年','2-3 年 30-55 万/年','经理 55-90 万/年'],['管理咨询','战略咨询','数字化转型'],['麦肯锡','波士顿咨询','贝恩','埃森哲']],
  ['战略投资','💰',{R:22,I:86,A:36,S:26,E:68,C:74},{openness:64,conscientiousness:82,extraversion:50,agreeableness:48,stability:72},'围绕投资机会识别、尽调和投后分析支持公司战略布局。',['投资研究','尽调分析','投后复盘'],'通常偏好顶尖院校、金融/咨询背景和投研相关实习。',['财务建模','行业研究','尽调分析','汇报表达'],['校招 18-28 万/年','2-3 年 28-45 万/年','经理 45-80 万/年'],['产业投资','战略投资','VC/PE'],['腾讯投资','小米战投','美团战投','字节投资']],
  ['审计','🧾',{R:26,I:72,A:24,S:36,E:40,C:90},{openness:42,conscientiousness:90,extraversion:46,agreeableness:64,stability:74},'围绕财务报表、内控和审计程序执行核查。',['底稿编制','财务核对','项目复盘'],'四大和大型会计师事务所偏好财经院校、会计背景和较稳定的学校成绩。',['会计准则','Excel','审计底稿','细节核查'],['校招 10-18 万/年','2-3 年 18-30 万/年','经理 30-50 万/年'],['会计师事务所','企业财务','内控审计'],['普华永道','德勤','安永','毕马威']],
  ['量化研究员','📐',{R:30,I:96,A:20,S:12,E:28,C:82},{openness:70,conscientiousness:86,extraversion:20,agreeableness:38,stability:78},'围绕因子、策略和模型进行研究与回测。',['策略研究','回测分析','模型优化'],'量化岗位通常明显偏好顶尖院校、数学/统计/计算机背景。',['Python','概率统计','机器学习','数理建模'],['校招 25-40 万/年','2-3 年 40-80 万/年','高级 80-150 万/年'],['量化私募','券商自营','资管'],['幻方','九坤','明汯','中信证券']],
  ['游戏运营','🎮',{R:18,I:48,A:62,S:56,E:68,C:70},{openness:66,conscientiousness:76,extraversion:54,agreeableness:60,stability:62},'负责游戏活动、版本节奏、用户反馈和数据运营。',['活动策划','用户分析','版本协同'],'头部游戏公司更偏好学校背景和对游戏理解较深的候选人。',['活动运营','数据分析','用户洞察','跨团队协同'],['校招 12-20 万/年','2-3 年 20-35 万/年','高级 35-55 万/年'],['游戏研发','游戏发行','内容娱乐'],['腾讯游戏','网易游戏','米哈游','莉莉丝']],
  ['交互设计师','🖱️',{R:24,I:58,A:88,S:46,E:34,C:62},{openness:82,conscientiousness:70,extraversion:34,agreeableness:62,stability:64},'围绕用户体验完成交互流程与界面逻辑设计。',['交互原型','用户路径','设计迭代'],'头部互联网公司会看作品集、设计基础和实习经历。',['Figma','原型设计','用户研究','交互思维'],['校招 14-22 万/年','2-3 年 22-35 万/年','高级 35-60 万/年'],['互联网产品','消费科技','游戏'],['腾讯','字节跳动','阿里巴巴','美团']],
  ['品牌营销','🏷️',{R:18,I:42,A:84,S:56,E:76,C:48},{openness:82,conscientiousness:68,extraversion:66,agreeableness:60,stability:58},'围绕品牌定位、传播策略和营销活动进行统筹。',['品牌策略','campaign 统筹','效果复盘'],'头部快消和互联网品牌会看学校背景、作品和实习经历。',['品牌策略','文案表达','传播策划','数据复盘'],['校招 12-20 万/年','2-3 年 20-35 万/年','高级 35-60 万/年'],['快消','新消费','互联网品牌'],['宝洁','联合利华','可口可乐','小红书']],
  ['媒介策划','📺',{R:14,I:54,A:72,S:42,E:70,C:60},{openness:74,conscientiousness:72,extraversion:56,agreeableness:54,stability:60},'负责媒介组合、投放节奏和传播效率规划。',['媒介排期','投放规划','效果分析'],'广告公司、平台营销和品牌端偏好广告传播背景与相关实习。',['媒介规划','数据分析','沟通协作','PPT'],['校招 10-16 万/年','2-3 年 16-28 万/年','高级 28-45 万/年'],['广告代理','品牌营销','媒介平台'],['阳狮','群邑','蓝色光标','腾讯广告']],
  ['软件开发','💻',{R:42,I:88,A:28,S:18,E:18,C:72},{openness:64,conscientiousness:82,extraversion:20,agreeableness:42,stability:72},'负责业务系统、服务端或客户端功能开发。',['编码实现','联调测试','性能优化'],'大厂开发岗通常偏好 985/211、海本海硕和计算机背景。',['Java/Go/C++','数据结构算法','系统设计','调试能力'],['校招 18-30 万/年','2-3 年 30-50 万/年','高级 50-90 万/年'],['互联网','企业服务','AI 基础设施'],['腾讯','阿里巴巴','字节跳动','华为']],
  ['算法开发','🤖',{R:34,I:96,A:24,S:10,E:16,C:78},{openness:74,conscientiousness:84,extraversion:16,agreeableness:36,stability:78},'围绕模型、策略或推荐算法进行开发与优化。',['模型训练','特征工程','线上优化'],'通常明显偏好顶尖院校、硕博背景和强算法项目经历。',['机器学习','深度学习','Python/C++','数理基础'],['校招 25-40 万/年','2-3 年 40-80 万/年','高级 80-150 万/年'],['AI','推荐系统','自动驾驶'],['字节跳动','腾讯','阿里巴巴','百度']],
  ['测试开发','🧪',{R:44,I:74,A:20,S:18,E:22,C:84},{openness:54,conscientiousness:88,extraversion:24,agreeableness:46,stability:76},'负责测试框架、自动化脚本和质量保障。',['测试方案','自动化脚本','缺陷跟踪'],'大厂测试岗偏好计算机背景、项目经历和脚本能力。',['自动化测试','Python/Java','接口测试','质量意识'],['校招 14-24 万/年','2-3 年 24-40 万/年','高级 40-65 万/年'],['互联网','软件服务','智能硬件'],['腾讯','阿里巴巴','字节跳动','网易']],
  ['数据工程师','🛠️',{R:38,I:88,A:18,S:14,E:18,C:86},{openness:58,conscientiousness:88,extraversion:18,agreeableness:40,stability:78},'负责数据链路、仓库建模和数据基础设施建设。',['数据建模','ETL 开发','链路维护'],'通常偏好计算机、数据相关专业和工程项目经历。',['SQL','Spark/Hadoop','Python/Java','数据建模'],['校招 18-28 万/年','2-3 年 28-45 万/年','高级 45-80 万/年'],['互联网','数据平台','云服务'],['阿里云','腾讯云','字节跳动','京东']],
  ['供应链运营','🚚',{R:42,I:60,A:20,S:38,E:54,C:86},{openness:46,conscientiousness:88,extraversion:44,agreeableness:56,stability:72},'负责供应链计划、交付协同和库存效率管理。',['计划排期','交付协调','库存分析'],'偏好供应链、物流、管理工程背景和较强执行能力。',['Excel','计划管理','跨部门协同','数据分析'],['校招 10-18 万/年','2-3 年 18-30 万/年','高级 30-45 万/年'],['制造业','零售电商','消费品'],['京东物流','顺丰','阿里巴巴','美的']],
  ['财务分析','💹',{R:22,I:78,A:20,S:26,E:42,C:84},{openness:48,conscientiousness:88,extraversion:34,agreeableness:56,stability:74},'围绕经营数据、成本结构和财务指标做分析支持。',['预算分析','经营复盘','财务模型'],'偏好财经院校、财务背景和较强 Excel/建模能力。',['财务分析','预算管理','Excel','报表理解'],['校招 12-20 万/年','2-3 年 20-32 万/年','高级 32-50 万/年'],['企业财务','消费零售','互联网'],['宝洁','华为','阿里巴巴','联合利华']],
  ['风控分析','🛡️',{R:22,I:82,A:18,S:20,E:34,C:88},{openness:44,conscientiousness:86,extraversion:28,agreeableness:44,stability:78},'围绕风险规则、指标和异常行为做识别与分析。',['策略分析','规则优化','异常监控'],'偏好金融、统计、数学、计算机背景与相关实习。',['SQL/Python','统计分析','风控逻辑','指标体系'],['校招 15-25 万/年','2-3 年 25-40 万/年','高级 40-65 万/年'],['金融科技','消费金融','互联网'],['蚂蚁集团','腾讯金融','京东科技','招联金融']],
  ['电商运营','🛍️',{R:24,I:54,A:46,S:44,E:70,C:78},{openness:58,conscientiousness:82,extraversion:54,agreeableness:52,stability:66},'围绕店铺、活动、商品和转化效率开展运营。',['活动规划','商品分析','转化优化'],'平台和品牌方更看运营实习、数据能力和节奏感。',['Excel','活动运营','商品分析','投放协同'],['校招 10-18 万/年','2-3 年 18-30 万/年','高级 30-45 万/年'],['电商平台','新消费','零售品牌'],['阿里巴巴','京东','拼多多','抖音电商']],
  ['新媒体运营','📱',{R:14,I:42,A:82,S:54,E:58,C:54},{openness:82,conscientiousness:66,extraversion:56,agreeableness:60,stability:56},'负责账号内容、用户增长和平台运营节奏。',['选题策划','内容发布','账号复盘'],'更看内容感、平台理解和相关项目/实习成果。',['内容策划','剪辑/文案','数据复盘','平台理解'],['校招 9-15 万/年','2-3 年 15-26 万/年','高级 26-40 万/年'],['内容平台','新消费','教育服务'],['小红书','抖音','哔哩哔哩','知乎']],
  ['机械工程师','⚙️',{R:86,I:68,A:20,S:18,E:24,C:70},{openness:42,conscientiousness:82,extraversion:28,agreeableness:52,stability:74},'负责机械结构设计、工艺优化和设备问题解决。',['结构设计','图纸评审','试产验证'],'制造业和工程企业偏好机械相关专业背景与项目经历。',['CAD/CAE','机械设计','材料工艺','问题分析'],['校招 10-18 万/年','2-3 年 18-30 万/年','高级 30-45 万/年'],['制造业','汽车','装备工程'],['比亚迪','上汽集团','三一重工','美的']],
  ['电子工程师','🔌',{R:78,I:74,A:22,S:16,E:22,C:72},{openness:48,conscientiousness:84,extraversion:24,agreeableness:48,stability:76},'负责电路设计、器件选型和硬件调试。',['电路设计','硬件测试','问题定位'],'硬件企业偏好电子、电气、自动化背景与相关项目。',['电路基础','硬件调试','示波器','嵌入式基础'],['校招 12-20 万/年','2-3 年 20-35 万/年','高级 35-55 万/年'],['消费电子','半导体','智能硬件'],['华为','小米','立讯精密','大疆']],
  ['商务拓展BD','🧩',{R:18,I:36,A:34,S:58,E:90,C:44},{openness:54,conscientiousness:70,extraversion:86,agreeableness:54,stability:66},'负责拓展合作伙伴、谈判资源和推动商业合作落地。',['合作洽谈','资源拓展','合同推进'],'偏好表达强、目标感强且有 BD/销售实习经历的候选人。',['商务谈判','资源整合','客户沟通','目标管理'],['校招 12-20 万底薪 + 提成','2-3 年 20-40 万+/年','高级 40-60 万+/年'],['互联网平台','企业服务','本地生活'],['美团','字节跳动','腾讯','BOSS直聘']],
  ['人力资源专员','👤',{R:18,I:42,A:30,S:86,E:60,C:64},{openness:54,conscientiousness:74,extraversion:62,agreeableness:82,stability:64},'负责招聘、员工关系、流程支持等基础 HR 工作。',['招聘协助','流程支持','员工沟通'],'大厂 HR 校招会看学校背景、学生工作和实习经历。',['沟通协调','基础数据','人事流程','职业判断'],['校招 10-16 万/年','2-3 年 16-26 万/年','高级 26-40 万/年'],['互联网','制造业','教育服务'],['腾讯','美团','字节跳动','华为']],
  ['产品运营','🧭',{R:24,I:62,A:42,S:54,E:62,C:78},{openness:60,conscientiousness:82,extraversion:50,agreeableness:58,stability:68},'围绕产品使用路径、转化节点和用户反馈做运营优化。',['流程优化','转化分析','需求协同'],'偏好运营、产品、商分相关背景和实习经历。',['数据分析','流程设计','沟通协同','用户理解'],['校招 12-20 万/年','2-3 年 20-32 万/年','高级 32-50 万/年'],['互联网','SaaS','教育科技'],['美团','字节跳动','腾讯','飞书']],
  ['广告投放','🎯',{R:22,I:66,A:56,S:28,E:62,C:78},{openness:64,conscientiousness:82,extraversion:46,agreeableness:48,stability:66},'围绕效果广告进行投放优化和 ROI 管理。',['账户搭建','素材测试','投放复盘'],'平台广告、代理公司和品牌方更看数据能力与投放实习。',['投放平台','数据分析','素材测试','ROI 思维'],['校招 10-18 万/年','2-3 年 18-30 万/年','高级 30-50 万/年'],['电商营销','广告代理','增长团队'],['巨量引擎','腾讯广告','小红书','阿里妈妈']],
  ['公关传播','📣',{R:14,I:40,A:76,S:60,E:72,C:50},{openness:78,conscientiousness:68,extraversion:66,agreeableness:62,stability:58},'负责媒体关系、传播策略和舆情协同。',['媒体沟通','传播策划','舆情跟踪'],'偏好传播、公关、新闻背景和相关实习经历。',['媒体关系','传播策划','文案表达','危机意识'],['校招 10-18 万/年','2-3 年 18-30 万/年','高级 30-50 万/年'],['公关传播','品牌营销','互联网'],['蓝色光标','奥美公关','小红书','腾讯']],
  ['运营管理培训生','🧑‍💼',{R:28,I:56,A:32,S:48,E:64,C:82},{openness:52,conscientiousness:86,extraversion:52,agreeableness:58,stability:70},'在轮岗中学习业务运营、项目推进和管理基础。',['业务轮岗','项目支持','经营复盘'],'偏好学校背景较好、综合素质强且有实习经历的候选人。',['Excel/PPT','项目管理','沟通协调','学习能力'],['校招 12-20 万/年','2-3 年 20-35 万/年','高级 35-55 万/年'],['零售连锁','互联网','制造业'],['美的','海底捞','华为','京东']],
]

const roles = roleData.map(r => ({
  name: r[0] as string, icon: r[1] as string, interest: r[2] as InterestScores,
  personality: r[3] as PersonalityScores, desc: r[4] as string, tasks: r[5] as string[],
  school: r[6] as string, skills: r[7] as string[], salary: r[8] as string[],
  industries: r[9] as string[], companies: r[10] as string[],
}))

const highInternshipRoles = new Set(['投行经理','量化研究员','产品经理','战略投资','咨询顾问'])

const taskNotes: Record<string, string> = {
  需求分析:'先把用户问题收一遍，分清哪些是真的高频痛点，再给出优先级判断。',
  跨团队推进:'要盯设计、研发、测试三边进度，把卡点一一推开。',
  版本复盘:'上线后你得回答：用户有没有用、数据有没有变好、最大的坑是什么。',
  主题策划:'先定传播主题，讲新品、讲态度还是讲场景，要先拎清楚。',
  方案撰写:'把方向写成完整方案：受众、卖点、节奏、资源分配都要写清楚。',
  效果复盘:'项目结束后要看清楚：哪一步最有效，哪部分花了钱却没出结果。',
  媒介排期:'把广告什么时候上、先上哪个平台、每个平台跑多久全部排清楚。',
  投放规划:'先把预算切开：主投哪里、补量哪里、什么条件下加钱或停投。',
  效果分析:'投放后要算明白：哪个渠道最值、哪类人群转化最好、哪部分曝光没意义。',
  品牌策略:'第一件事不是做图，而是先回答品牌这次到底想让用户记住什么。',
  'campaign 统筹':'把创意、物料、渠道、排期和预算全串起来，任何一环都不能掉。',
  活动策划:'先判断活动目标是拉新、促活还是转化，再把玩法和节奏排出来。',
  留存分析:'把用户流失点一层层扒开，找到真正掉人的环节。',
  协同优化:'拉着产品、内容、投放一起改，把一轮优化真的落下去。',
  数据清洗:'先把乱数据整理干净，不然后面的分析结论都不可信。',
  报表搭建:'做一张能每天看核心指标的报表，让团队一眼看到异常。',
  诊断分析:'不能只说数据跌了，而是要查出到底是哪一层出了问题。',
  计划制定:'把整个项目时间表排出来，节点、负责人、截止时间都得落到表上。',
  风险管理:'提前判断谁可能拖期、哪个环节最危险、备用方案是什么。',
  协同验收:'做完不是结束，你得拉着相关同事逐项验收，确认能真正交付。',
  需求挖掘:'先问清客户到底想买什么、为什么犹豫、预算卡在哪里。',
  方案呈现:'把方案当面讲清楚，让对方听完知道为什么适合他。',
  成交转化:'盯住最后一步：是谁没拍板、为什么没签、现在该怎么把单子收回来。',
  需求澄清:'把模糊的人才需求翻译成可执行的岗位要求。',
  候选人沟通:'真的和候选人聊岗位、意愿和时间，不是只转发简历。',
  业务协同:'盯住业务方和候选人两边节奏，保证面试和反馈不断线。',
  选题策划:'先判断用户现在最关心什么，再挑最值得做的题。',
  文案制作:'把内容真的写出来，标题、结构、行动引导都得服务结果。',
  数据复盘:'看清楚内容到底是哪里带来了阅读、互动和转化。',
  市场研究:'先把市场和竞品摸透，看清机会点到底在哪里。',
  问题拆解:'不能把大问题原样端上去，而是要先拆成几块逐一分析。',
  汇报建议:'老板不要资料堆砌，而是要你讲结论：现在最该做哪三件事。',
  行研建模:'把行业、公司和假设装进模型里，算出这个方向到底值不值得看。',
  公司跟踪:'持续盯一家公司，看公告、业务动作和财务变化是否超预期。',
  研究报告:'写出一份真正能给投资经理看的报告。',
  材料撰写:'把一堆零散资料整理成正式材料，能直接拿去走流程。',
  尽调访谈:'把业务真相、关键风险和核心数据从访谈里问出来。',
  项目推进:'盯住每个节点往前走，不能让整个项目在你这里掉链子。',
  访谈研究:'真的去访谈客户或用户，把真实需求挖出来。',
  汇报呈现:'把复杂问题讲成老板能听懂、能做决策的内容。',
  投资研究:'把一个项目从行业到财务全看一遍，再判断值不值得投。',
  尽调分析:'把尽调资料一条条过，分清哪些地方靠谱、哪些地方有风险。',
  投后复盘:'项目投完以后你还得回头看，当初判断到底对不对。',
  底稿编制:'把检查过程和证据完整写进底稿里。',
  财务核对:'把账表、凭证、明细一项项对上，哪里不对就查哪里。',
  项目复盘:'回头看本次流程里哪些浪费时间、哪些错误重复出现。',
  策略研究:'先提出策略假设，再决定值不值得继续做。',
  回测分析:'把策略放进历史数据里跑，验证收益、回撤和稳定性。',
  模型优化:'继续调参数和特征，把模型表现稳定下来。',
  用户分析:'看清楚哪些用户最活跃、最付费、最容易流失。',
  版本协同:'上线前把玩法、公告、客服口径等所有东西全部对齐。',
  交互原型:'把用户流程做成可演示的原型，而不是只停留在口头描述。',
  用户路径:'站在真实用户角度走一遍流程，看看他到底会卡在哪一步。',
  设计迭代:'根据反馈一轮轮改方案，把不顺的地方改顺。',
  客户沟通:'把客户想要什么问透，同时把公司能给什么讲明白。',
  需求整理:'把零散要求整理成明确清单，分清必须做和可以谈的部分。',
  项目执行:'你的任务是把事情真正做完，不是只提想法。',
  账户搭建:'把投放账户结构搭好，不然数据后面根本没法看。',
  素材测试:'一口气测几版素材，看哪种内容最能带来点击和转化。',
  投放复盘:'把钱花去哪了、哪部分最值、哪部分该立刻停说清楚。',
  招聘协助:'把筛简历、约面试、催反馈这些事真正推进下去。',
  流程支持:'把基础流程跑顺，别让业务因为流程卡住。',
  员工沟通:'接住员工问题，把政策和安排讲明白。',
  课程设计:'先想清楚这门课到底解决什么问题，再设计内容结构。',
  培训实施:'把培训真正跑起来，讲师、现场、节奏都得盯住。',
  效果评估:'培训后验证到底有没有效果，而不是只收满意度表。',
  结构设计:'把结构方案真正画出来，把不合理的地方提前发现。',
  图纸评审:'带着图纸逐项过，看看哪里装不上、哪里成本太高。',
  试产验证:'去现场看方案能不能真做出来，问题到底出在哪。',
  电路设计:'把关键电路方案定下来，器件、功耗和稳定性都得考虑进去。',
  硬件测试:'拿真实板子跑测试，看它到底稳不稳。',
  问题定位:'设备出问题后先判断到底是硬件、软件还是连接链路有问题。',
  编码实现:'分到一个明确模块后，你得把代码真正写出来。',
  联调测试:'把上下游系统接起来跑通，确认接口和数据都没问题。',
  性能优化:'把慢的地方查出来并改快，不能只说"后面再看"。',
  模型训练:'把数据喂进模型里真的跑起来，看效果到底怎么样。',
  特征工程:'筛特征、改特征，找出真正有用的信息。',
  线上优化:'模型上了线以后还得盯指标和反馈，继续调。',
  测试方案:'先写出完整测试方案，明确测什么、怎么测、风险点在哪。',
  自动化脚本:'把重复测试动作写成脚本，减少手工点点点。',
  缺陷跟踪:'提了 bug 以后还得盯着修复和回归，直到真正关闭。',
  数据建模:'先把数据表结构和口径统一设计好。',
  'ETL 开发':'把数据抽取、清洗、入库这条链路亲手打通。',
  链路维护:'数据链路一挂，你得第一时间查清楚是哪一步断了。',
  工艺优化:'去现场找出最费时间、最容易出错的工序，再想办法改掉。',
  良率提升:'围着不良率往下查，把合格率真正拉上去。',
  问题排查:'现场一有异常你就得去摸问题，不是等别人汇报。',
  计划排期:'把供应、生产、发货几段时间全部对齐。',
  交付协调:'不停和仓库、工厂、物流对接，保证东西按时送到。',
  库存分析:'看清哪些货压太多、哪些货快断了，让库存回到合理水平。',
  预算分析:'把预算拆开看，算清楚钱到底花在哪、还能不能省。',
  经营复盘:'把一段时间的经营结果重新拉通看一遍。',
  财务模型:'把收入、成本、利润和假设都装进模型里。',
  合作洽谈:'把合作逻辑和推进方式谈清楚，不是光寒暄。',
  资源拓展:'继续往外找新的渠道、合作方和入口。',
  合同推进:'有合作意向后继续追，把合同真的签下来。',
  媒体沟通:'直接对接媒体，把口径和重点信息喂到位。',
  传播策划:'先定传播认知，再决定内容怎么放、节奏怎么推。',
  舆情跟踪:'盯住外部舆论，一有风险苗头就立刻反馈。',
  商品分析:'看清楚哪些款卖得好、哪些款有流量却转不动。',
  转化优化:'盯住从访问到下单的整条链路，把最堵的环节先改掉。',
  内容发布:'按平台节奏把内容发出去，发布时间和包装都得盯。',
  账号复盘:'回头看涨粉、互动和转化到底是靠什么来的。',
  策略分析:'把风控策略拆开看，判断哪条规则松了、哪条太狠了。',
  规则优化:'真的去改规则，而不是只讨论风控逻辑。',
  异常监控:'持续盯异常信号，一跳就要马上查。',
  流程优化:'把用户路径重新过一遍，先疏通最堵的那一环。',
  转化分析:'把访问、注册、付费每一层掉了多少人看明白。',
  需求协同:'发现问题后把需求推给产品、研发、设计一起改。',
  创意发想:'先想出几种完全不同的创意方向，再筛最能打的。',
  传播落地:'有了想法以后把它真的放进内容、物料和渠道里。',
  业务轮岗:'被放进新部门后，尽快搞懂这块业务怎么转。',
  项目支持:'接住一个正在推进的项目，把资料、节奏和问题都盯起来。',
}

const majorRules = [
  {keys:['计算机','软件','信息','数据','统计','数学','人工智能','电子','自动化','算法'],label:'数理技术类',direct:['数据分析','商业分析','软件开发','算法开发','测试开发','数据工程师','产品经理','电子工程师'],adjacent:['交互设计师','项目管理','产品运营'],note:'你的本科背景更适合分析、技术、产品与工程方向。'},
  {keys:['金融','经济','会计','财务','国贸','国际贸易','证券','投资','保险'],label:'经管金融类',direct:['行业分析师','投行经理','战略投资','审计','量化研究员','财务分析','商业分析'],adjacent:['咨询顾问','产品经理','项目管理'],note:'你的本科背景与金融研究、投行、审计和经营分析等方向更相关。'},
  {keys:['市场','广告','传播','新闻','中文','英语','媒体','公关','设计'],label:'传播内容类',direct:['市场策划','内容策划','品牌营销','媒介策划','AE客户执行','广告投放','交互设计师','新媒体运营'],adjacent:['用户运营','产品经理','公关传播'],note:'你的本科背景更适合品牌传播、内容策划、媒介、公关和设计方向。'},
  {keys:['工商','管理','物流','工程管理','行政管理','供应链'],label:'管理运营类',direct:['项目管理','用户运营','产品运营','咨询顾问','供应链运营','游戏运营'],adjacent:['商业分析','销售顾问','品牌营销'],note:'你的本科背景更适合项目推进、运营协同和管理咨询等方向。'},
  {keys:['人力','心理','教育','社工','社会学','法学'],label:'人文服务类',direct:['招聘顾问 / HRBP','人力资源专员','培训发展','客户成功'],adjacent:['用户运营','销售顾问','咨询顾问'],note:'你的本科背景更适合沟通服务、组织支持和人岗匹配类方向。'},
  {keys:['机械','材料','车辆','能源','电气','制造'],label:'工程制造类',direct:['机械工程师','电子工程师','工艺工程师','供应链运营'],adjacent:['数据工程师','项目管理','产品经理'],note:'你的本科背景更适合工程、制造、测试和供应链方向。'},
]

const GRADE_ADVICE: Record<string, string> = {
  大一:'先做职业探索与基础能力建设。',
  大二:'开始岗位定向补强；如已有相关实习，继续提高实习质量与岗位相关性；如尚无相关实习，尽快争取首段岗位相关实习。',
  大三:'围绕目标岗位继续补强经历质量，检查是否已具备 1-2 段有含金量的相关实习。',
  大四:'聚焦秋招春招投递、面试与简历打磨。',
  研一:'尽快锁定目标岗位并完成高质量实习。',
  研二:'重点放在秋招转化和 offer 结果。',
  研三:'快速补强短板并进入高频投递。',
  '已毕业 / Gap':'缩窄岗位范围，补可验证经历。',
}

function majorProfile(major: string) {
  const value = major.trim()
  if (!value) return {label:'未填写专业',note:'由于未输入本科专业，系统无法做专业相关性校正。',direct:[],adjacent:[]}
  const hits = majorRules.filter(item => item.keys.some(kw => value.includes(kw)))
  if (!hits.length) return {label:'通用专业背景',note:'该专业未命中预设分类，系统将按通用职业能力进行推荐。',direct:[],adjacent:[]}
  return {
    label:[...new Set(hits.map(i => i.label))].join(' / '),
    note:[...new Set(hits.map(i => i.note))].join(' '),
    direct:[...new Set(hits.flatMap(i => i.direct))],
    adjacent:[...new Set(hits.flatMap(i => i.adjacent))],
  }
}

function majorScore(roleName: string, profile: ReturnType<typeof majorProfile>): number {
  if (profile.direct.includes(roleName)) return 92
  if (profile.adjacent.includes(roleName)) return 78
  return profile.direct.length || profile.adjacent.length ? 55 : 70
}

function gradeAdvice(grade: string): string {
  return GRADE_ADVICE[grade] || '尽快把测评结果转化为岗位选择与经历补强行动。'
}

function recommend(interest: InterestScores, personality: PersonalityScores, profile: ReturnType<typeof majorProfile>) {
  return roles
    .map(role => ({
      ...role,
      score: Math.round(distance(interest, role.interest) * 0.4 + distance(personality, role.personality) * 0.35 + majorScore(role.name, profile) * 0.25),
      why: [
        {label:'兴趣模型',text:`你的高分兴趣为「${topKeys(interest, 3).map(k => INTEREST_LABELS[k]).join('、')}」，该岗位更偏向「${topKeys(role.interest, 3).map(k => INTEREST_LABELS[k]).join('、')}」的工作场景。`},
        {label:'性格模型',text:`你的突出工作风格为「${topKeys(personality, 2).map(k => PERSONALITY_LABELS[k]).join('、')}」，与该岗位常见要求较接近。`},
        {label:'专业相关性',text: profile.direct.includes(role.name) ? '该岗位与你的本科专业相关性较强。' : profile.adjacent.includes(role.name) ? '该岗位与你的本科专业存在可迁移关联。' : '该岗位更多基于通用能力匹配。'},
      ],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

// ---------- HTTP Handler ----------

serve(async (req) => {
  // 处理 CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 解析请求体
    const { token, answers, student } = await req.json()

    if (!token || !answers || !student) {
      return new Response(JSON.stringify({ success: false, error: '缺少必要参数' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 初始化 Supabase 客户端（服务端用 service role key）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 校验 token
    const { data: task, error: taskError } = await supabase
      .from('assessment_tasks')
      .select('*')
      .eq('token', token)
      .single()

    if (taskError || !task) {
      return new Response(JSON.stringify({ success: false, error: 'Token 无效' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 校验是否已提交
    if (task.status === 'submitted') {
      return new Response(JSON.stringify({ success: false, error: '该测评已提交，请勿重复提交' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 校验是否过期
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      // 自动更新过期状态
      await supabase.from('assessment_tasks').update({ status: 'expired' }).eq('token', token)
      return new Response(JSON.stringify({ success: false, error: '该测评链接已过期' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 服务端重新计算分数（防止前端篡改）
    const { interest, personality } = score(answers)

    // 生成推荐岗位
    const profile = majorProfile(student.major || '')
    const interestResult = {
      code: topKeys(interest, 3).join(''),
      title: topKeys(interest, 3).map(k => INTEREST_LABELS[k]).join(' × '),
      text: `你的职业兴趣更集中在「${topKeys(interest, 3).map(k => INTEREST_LABELS[k]).join('、')}」上。相对而言，「${sortEntries(interest).slice(-2).map(([k]) => INTEREST_LABELS[k]).join('、')}」不是当前最强方向。`,
    }
    const personalityResult = {
      headline: topKeys(personality, 2).map(k => PERSONALITY_LABELS[k]).join(' × '),
      text: `你当前较突出的工作风格主要体现在「${topKeys(personality, 2).map(k => PERSONALITY_LABELS[k]).join('、')}」上；相对而言，「${sortEntries(personality).slice(-2).map(([k]) => PERSONALITY_LABELS[k]).join('、')}」不是当前最突出的特征。`,
    }
    const topRoles = recommend(interest, personality, profile)
    const tips = [gradeAdvice(student.grade || '大三'), `建议尽早围绕「${topRoles[0]?.name || '目标岗位'}」补齐相关实习或项目经历，并尽快进入岗位化准备。`]

    // 构建完整报告
    const report = {
      id: `RP-${Date.now()}`,
      createdAt: new Date().toISOString(),
      student,
      profile,
      interest,
      personality,
      interestResult,
      personalityResult,
      selectedRoles: topRoles,
      tips,
      taskNotes,
      highInternshipRoles: [...highInternshipRoles],
    }

    // 写入 submission
    const { error: insertError } = await supabase.from('assessment_submissions').insert({
      task_id: task.id,
      answers_json: answers,
      riasec_scores_json: interest,
      ipip_scores_json: personality,
      top_roles_json: topRoles,
      report_json: report,
    })

    if (insertError) {
      console.error('[submit-assessment] 写入失败:', insertError)
      return new Response(JSON.stringify({ success: false, error: '提交失败，请重试' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 更新任务状态
    await supabase.from('assessment_tasks').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('token', token)

    // 返回成功（不返回完整报告！）
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[submit-assessment] 异常:', err)
    return new Response(JSON.stringify({ success: false, error: '服务器异常' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
