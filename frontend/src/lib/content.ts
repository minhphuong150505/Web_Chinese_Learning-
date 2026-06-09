/**
 * Static UI content (plain strings — pinyin is derived client-side by lib/zh.ts).
 * Scenario content per spec/11-sample-content.md (HSK 2-3 restaurant-ordering +
 * daily-routine set). Relocated out of the retired mock seam in Round 21.
 */

export const CHAT_SUGGESTIONS: string[] = [
  '我想要两个包子。',
  '有什么推荐？',
  '一杯热茶，谢谢。',
];

export interface ConversationPracticeTopic {
  id: string;
  title: string;
  titleVi: string;
  zh: string;
  level: string;
  scenario: string;
  scenarioVi: string;
  suggestions: string[];
}

export const CONVERSATION_TOPICS: ConversationPracticeTopic[] = [
  {
    id: 'restaurant',
    title: 'Ordering food',
    titleVi: 'Gọi món',
    zh: '点菜',
    level: 'HSK 2',
    scenario: 'Practice ordering food and drinks at a small Chinese restaurant. The AI is the server and the learner is the customer.',
    scenarioVi: 'Luyện gọi món ăn và đồ uống tại một nhà hàng Trung Quốc nhỏ. AI đóng vai nhân viên phục vụ và người học là khách hàng.',
    suggestions: ['我想要两个包子。', '有什么推荐？', '一杯热茶，谢谢。'],
  },
  {
    id: 'cafe',
    title: 'Cafe order',
    titleVi: 'Gọi món ở quán cà phê',
    zh: '咖啡店',
    level: 'HSK 2',
    scenario: 'Practice buying coffee, tea, and snacks at a cafe. Ask about hot or iced drinks and prices.',
    scenarioVi: 'Luyện mua cà phê, trà và đồ ăn nhẹ tại quán. Hỏi về đồ uống nóng, lạnh và giá tiền.',
    suggestions: ['我要一杯咖啡。', '有冰的吗？', '多少钱？'],
  },
  {
    id: 'shopping',
    title: 'Shopping',
    titleVi: 'Mua sắm',
    zh: '买东西',
    level: 'HSK 2',
    scenario: 'Practice shopping for clothes and daily items. Ask for size, color, price, and recommendations.',
    scenarioVi: 'Luyện mua quần áo và đồ dùng hằng ngày. Hỏi về kích cỡ, màu sắc, giá tiền và gợi ý.',
    suggestions: ['这件多少钱？', '有没有小一点的？', '我想试一下。'],
  },
  {
    id: 'hotel',
    title: 'Hotel check-in',
    titleVi: 'Nhận phòng khách sạn',
    zh: '住酒店',
    level: 'HSK 3',
    scenario: 'Practice checking in at a hotel, asking about breakfast, Wi-Fi, room number, and checkout time.',
    scenarioVi: 'Luyện nhận phòng khách sạn, hỏi về bữa sáng, Wi-Fi, số phòng và giờ trả phòng.',
    suggestions: ['我有预订。', '早餐几点开始？', '房间有无线网吗？'],
  },
  {
    id: 'taxi',
    title: 'Taxi ride',
    titleVi: 'Đi taxi',
    zh: '打车',
    level: 'HSK 2',
    scenario: 'Practice taking a taxi or ride share. Say the destination, ask about time, and confirm the route.',
    scenarioVi: 'Luyện đi taxi hoặc xe công nghệ. Nói điểm đến, hỏi thời gian và xác nhận tuyến đường.',
    suggestions: ['我要去火车站。', '大概要多久？', '请在这里停车。'],
  },
  {
    id: 'doctor',
    title: 'Clinic visit',
    titleVi: 'Đi khám bệnh',
    zh: '看医生',
    level: 'HSK 3',
    scenario: 'Practice visiting a clinic. Explain symptoms, ask about medicine, and understand simple advice.',
    scenarioVi: 'Luyện đi khám tại phòng khám. Mô tả triệu chứng, hỏi về thuốc và hiểu lời khuyên đơn giản.',
    suggestions: ['我头疼。', '我需要吃药吗？', '我应该休息几天？'],
  },
  {
    id: 'airport',
    title: 'Airport',
    titleVi: 'Sân bay',
    zh: '机场',
    level: 'HSK 3',
    scenario: 'Practice airport check-in, luggage, boarding gate, delay questions, and asking for directions.',
    scenarioVi: 'Luyện làm thủ tục sân bay, hỏi về hành lý, cửa ra máy bay, chuyến bay trễ và đường đi.',
    suggestions: ['我想办理登机。', '登机口在哪里？', '我的行李可以托运吗？'],
  },
  {
    id: 'directions',
    title: 'Directions',
    titleVi: 'Hỏi đường',
    zh: '问路',
    level: 'HSK 2',
    scenario: 'Practice asking for directions in a city. The AI gives simple directions using left, right, front, and nearby places.',
    scenarioVi: 'Luyện hỏi đường trong thành phố. AI chỉ đường đơn giản bằng các từ trái, phải, phía trước và địa điểm gần đó.',
    suggestions: ['地铁站在哪里？', '远不远？', '怎么走？'],
  },
  {
    id: 'school',
    title: 'Classmate chat',
    titleVi: 'Trò chuyện với bạn học',
    zh: '同学聊天',
    level: 'HSK 2',
    scenario: 'Practice chatting with a classmate about classes, homework, teachers, and plans after school.',
    scenarioVi: 'Luyện trò chuyện với bạn học về lớp học, bài tập, giáo viên và kế hoạch sau giờ học.',
    suggestions: ['今天有中文课吗？', '作业难不难？', '下课以后你做什么？'],
  },
  {
    id: 'job',
    title: 'Job interview',
    titleVi: 'Phỏng vấn xin việc',
    zh: '面试',
    level: 'HSK 3',
    scenario: 'Practice a simple job interview. Talk about experience, strengths, schedule, and why the learner wants the job.',
    scenarioVi: 'Luyện một cuộc phỏng vấn xin việc đơn giản. Nói về kinh nghiệm, điểm mạnh, lịch làm việc và lý do muốn ứng tuyển.',
    suggestions: ['我想申请这个工作。', '我会说中文和英文。', '我可以周末工作。'],
  },
  {
    id: 'weekend',
    title: 'Weekend plans',
    titleVi: 'Kế hoạch cuối tuần',
    zh: '周末计划',
    level: 'HSK 2',
    scenario: 'Practice making weekend plans with a friend. Discuss time, place, activities, and preferences.',
    scenarioVi: 'Luyện lên kế hoạch cuối tuần với bạn. Trao đổi về thời gian, địa điểm, hoạt động và sở thích.',
    suggestions: ['周末你有空吗？', '我们去看电影吧。', '你想几点见面？'],
  },
  {
    id: 'market',
    title: 'Market bargaining',
    titleVi: 'Mua hàng ở chợ',
    zh: '买菜',
    level: 'HSK 3',
    scenario: 'Practice buying fruit and vegetables at a market. Ask about quantity, freshness, price, and bargaining politely.',
    scenarioVi: 'Luyện mua rau quả ở chợ. Hỏi về số lượng, độ tươi, giá tiền và trả giá lịch sự.',
    suggestions: ['苹果怎么卖？', '便宜一点可以吗？', '我要两斤。'],
  },
];

export const WRITING_PROMPT_TOPIC = 'My daily routine';
export const WRITING_PROMPT_TOPIC_VI = 'Sinh hoạt hằng ngày của tôi';
export const WRITING_PROMPT_TEXT = '用三到四个句子介绍你的日常生活。';

export interface WritingPracticeTopic {
  id: string;
  title: string;
  titleVi: string;
  zh: string;
  level: string;
  context: string;
  contextVi: string;
}

export const WRITING_TOPICS: WritingPracticeTopic[] = [
  {
    id: 'daily-routine',
    title: 'Daily routine',
    titleVi: 'Sinh hoạt hằng ngày',
    zh: '日常生活',
    level: 'HSK 2',
    context: 'Create a writing task about the learner daily routine: wake-up time, meals, study, work, and evening habits.',
    contextVi: 'Tạo đề viết về sinh hoạt hằng ngày của người học: giờ thức dậy, bữa ăn, học tập, công việc và thói quen buổi tối.',
  },
  {
    id: 'self-intro',
    title: 'Self introduction',
    titleVi: 'Tự giới thiệu',
    zh: '自我介绍',
    level: 'HSK 2',
    context: 'Create a writing task where the learner introduces their name, age, country, studies, hobbies, and family.',
    contextVi: 'Tạo đề viết để người học giới thiệu tên, tuổi, quốc gia, việc học, sở thích và gia đình.',
  },
  {
    id: 'family',
    title: 'Family',
    titleVi: 'Gia đình',
    zh: '我的家',
    level: 'HSK 2',
    context: 'Create a writing task about the learner family members, what they do, and what they like.',
    contextVi: 'Tạo đề viết về các thành viên trong gia đình, công việc và sở thích của họ.',
  },
  {
    id: 'weekend',
    title: 'Weekend plan',
    titleVi: 'Kế hoạch cuối tuần',
    zh: '周末计划',
    level: 'HSK 2',
    context: 'Create a writing task about weekend plans: where to go, who to meet, what to eat, and why.',
    contextVi: 'Tạo đề viết về kế hoạch cuối tuần: đi đâu, gặp ai, ăn gì và lý do.',
  },
  {
    id: 'travel',
    title: 'Travel diary',
    titleVi: 'Nhật ký du lịch',
    zh: '旅行',
    level: 'HSK 3',
    context: 'Create a writing task about a trip: destination, transportation, activities, food, weather, and feelings.',
    contextVi: 'Tạo đề viết về một chuyến đi: điểm đến, phương tiện, hoạt động, món ăn, thời tiết và cảm xúc.',
  },
  {
    id: 'restaurant',
    title: 'Restaurant review',
    titleVi: 'Đánh giá nhà hàng',
    zh: '餐厅',
    level: 'HSK 3',
    context: 'Create a writing task about a restaurant experience: dishes ordered, service, price, taste, and recommendation.',
    contextVi: 'Tạo đề viết về trải nghiệm tại nhà hàng: món đã gọi, phục vụ, giá tiền, hương vị và lời giới thiệu.',
  },
  {
    id: 'school',
    title: 'School life',
    titleVi: 'Cuộc sống ở trường',
    zh: '学校生活',
    level: 'HSK 2',
    context: 'Create a writing task about school life: classes, teachers, classmates, homework, and favorite subject.',
    contextVi: 'Tạo đề viết về cuộc sống ở trường: lớp học, giáo viên, bạn học, bài tập và môn học yêu thích.',
  },
  {
    id: 'shopping',
    title: 'Shopping',
    titleVi: 'Mua sắm',
    zh: '买东西',
    level: 'HSK 2',
    context: 'Create a writing task about shopping for clothes or daily items: color, size, price, and opinion.',
    contextVi: 'Tạo đề viết về mua quần áo hoặc đồ dùng hằng ngày: màu sắc, kích cỡ, giá tiền và nhận xét.',
  },
  {
    id: 'health',
    title: 'Health',
    titleVi: 'Sức khỏe',
    zh: '健康',
    level: 'HSK 3',
    context: 'Create a writing task about health habits or feeling sick: symptoms, rest, medicine, exercise, and advice.',
    contextVi: 'Tạo đề viết về thói quen sức khỏe hoặc khi bị ốm: triệu chứng, nghỉ ngơi, thuốc, vận động và lời khuyên.',
  },
  {
    id: 'weather',
    title: 'Weather',
    titleVi: 'Thời tiết',
    zh: '天气',
    level: 'HSK 2',
    context: 'Create a writing task about today weather and what the learner wants to do because of it.',
    contextVi: 'Tạo đề viết về thời tiết hôm nay và điều người học muốn làm vì thời tiết đó.',
  },
  {
    id: 'work',
    title: 'Work day',
    titleVi: 'Một ngày làm việc',
    zh: '工作',
    level: 'HSK 3',
    context: 'Create a writing task about a work day: schedule, tasks, coworkers, problems, and feelings.',
    contextVi: 'Tạo đề viết về một ngày làm việc: lịch trình, nhiệm vụ, đồng nghiệp, vấn đề và cảm xúc.',
  },
  {
    id: 'hobby',
    title: 'Hobbies',
    titleVi: 'Sở thích',
    zh: '爱好',
    level: 'HSK 2',
    context: 'Create a writing task about hobbies: what the learner likes, when they do it, who they do it with, and why.',
    contextVi: 'Tạo đề viết về sở thích: người học thích gì, làm khi nào, cùng ai và vì sao.',
  },
];
