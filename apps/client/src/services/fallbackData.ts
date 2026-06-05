import type {
  DashboardSummary,
  FamilyOverview,
  InventoryProductSummary,
  PetProfileSummary,
  ProductStockLogSummary,
  ProfileSummary,
  ReminderItem,
  RestockPlan,
  StatisticsRange,
  StatisticsSummary,
} from "@family-inventory/shared-types";

export const fallbackProducts: InventoryProductSummary[] = [
  {
    id: "prod_orijen_fish_cat",
    name: "渴望六种鱼猫粮",
    category: "猫粮",
    brand: "Orijen",
    spec: "5.4kg/袋",
    quantity: 2,
    unit: "袋",
    status: "enough",
    statusText: "充足",
    image: "/static/products/orijen.png",
    purchasePrice: 429,
    purchaseChannel: "天猫",
    location: "客厅储物柜",
    isOpened: true,
    stockInDate: "2026-01-02",
  },
  {
    id: "prod_ziwi_beef_can",
    name: "巅峰牛肉主食罐",
    category: "罐头",
    brand: "Ziwi Peak",
    spec: "170g/罐",
    quantity: 3,
    unit: "罐",
    status: "low",
    statusText: "即将耗尽",
    image: "/static/products/ziwi.png",
    purchasePrice: 28.9,
    purchaseChannel: "京东",
    location: "厨房收纳架",
    isOpened: false,
    stockInDate: "2026-01-08",
  },
  {
    id: "prod_n1_tofu_litter",
    name: "N1豆腐猫砂 原味",
    category: "猫砂",
    brand: "N1",
    spec: "17.5L/包",
    quantity: 0,
    unit: "包",
    status: "empty",
    statusText: "已耗尽",
    image: "/static/products/litter.png",
    purchasePrice: 79,
    purchaseChannel: "线下门店",
    location: "阳台储物区",
    isOpened: true,
    stockInDate: "2026-01-12",
  },
  {
    id: "prod_royal_kitten_food",
    name: "皇家 (Royal Canin) 幼猫全价猫粮",
    category: "主粮",
    brand: "Royal Canin",
    spec: "2kg/袋",
    quantity: 2.5,
    unit: "kg",
    status: "low",
    statusText: "临期",
    image: "/static/products/royal-kitten-food.jpg",
    purchasePrice: 168,
    purchaseChannel: "宠物店",
    location: "储物柜顶层",
    isOpened: false,
    stockInDate: "2026-01-10",
  },
];

export const fallbackStockLogs: ProductStockLogSummary[] = [
  {
    id: "log_orijen_initial",
    productId: "prod_orijen_fish_cat",
    action: "stock_in",
    actionText: "初始入库",
    quantity: 2,
    unit: "袋",
    operatorName: "张三",
    operatedAt: "2026-01-02T10:00:00.000Z",
    notes: "首批入库",
  },
  {
    id: "log_ziwi_initial",
    productId: "prod_ziwi_beef_can",
    action: "stock_in",
    actionText: "初始入库",
    quantity: 3,
    unit: "罐",
    operatorName: "张三",
    operatedAt: "2026-01-08T10:00:00.000Z",
  },
  {
    id: "log_litter_initial",
    productId: "prod_n1_tofu_litter",
    action: "stock_out",
    actionText: "消耗出库",
    quantity: 1,
    unit: "包",
    operatorName: "李四",
    operatedAt: "2026-01-12T10:00:00.000Z",
    notes: "最后一包已用完",
  },
  {
    id: "log_royal_initial",
    productId: "prod_royal_kitten_food",
    action: "stock_in",
    actionText: "初始入库",
    quantity: 2.5,
    unit: "kg",
    operatorName: "张三",
    operatedAt: "2026-01-10T10:00:00.000Z",
    notes: "临期批次待优先消耗",
  },
];

export const fallbackProfile: ProfileSummary = {
  id: "user_demo",
  name: "张三丰",
  familyName: "张三丰的家",
  avatar: "/static/family/zhangsan.png",
  stats: {
    petCount: 3,
    bookkeepingDays: 365,
    reminderCount: 8,
  },
};

export const fallbackPets: PetProfileSummary[] = [
  {
    id: "pet_orange",
    name: "橘座",
    species: "猫",
    breed: "中华田园猫",
    ageText: "3岁",
    weightKg: 5.2,
    avatar: "/static/pets/orange-avatar.jpg",
    colorTone: "orange",
    tags: ["贪吃", "亲人", "爱睡觉"],
    diet: {
      staple: "皇家室内成猫粮",
      snack: "冻干鹌鹑",
    },
    inventoryEstimate: {
      foodDays: 12,
      litterDays: 5,
    },
    weightTrend: [
      { label: "08月", value: 60 },
      { label: "09月", value: 65 },
      { label: "10月", value: 62 },
      { label: "11月", value: 70 },
      { label: "12月", value: 80 },
    ],
    albumCount: 15,
    albumPhotos: [
      "/static/pets/orange-hero.jpg",
      "/static/pets/orange-play.jpg",
      "/static/pets/orange-sleep.jpg",
      "/static/pets/orange-window.jpg",
    ],
  },
  {
    id: "pet_white",
    name: "小白",
    species: "狗",
    breed: "比熊犬",
    ageText: "2岁",
    weightKg: 4.8,
    avatar: "/static/pets/white-avatar.jpg",
    colorTone: "white",
    tags: ["活泼", "黏人", "爱散步"],
    diet: {
      staple: "小型犬成犬粮",
      snack: "鸡肉冻干",
    },
    inventoryEstimate: {
      foodDays: 18,
      litterDays: 0,
    },
    weightTrend: [
      { label: "08月", value: 55 },
      { label: "09月", value: 58 },
      { label: "10月", value: 62 },
      { label: "11月", value: 64 },
      { label: "12月", value: 68 },
    ],
    albumCount: 8,
    albumPhotos: [
      "/static/pets/white-hero.jpg",
      "/static/pets/white-avatar.jpg",
    ],
  },
  {
    id: "pet_doubao",
    name: "豆包",
    species: "猫",
    breed: "英短",
    ageText: "4岁",
    weightKg: 6.1,
    avatar: "/static/pets/doubao-avatar.jpg",
    colorTone: "mint",
    tags: ["安静", "挑食"],
    diet: {
      staple: "低敏猫粮",
      snack: "猫条",
    },
    inventoryEstimate: {
      foodDays: 16,
      litterDays: 9,
    },
    weightTrend: [
      { label: "08月", value: 66 },
      { label: "09月", value: 64 },
      { label: "10月", value: 68 },
      { label: "11月", value: 70 },
      { label: "12月", value: 72 },
    ],
    albumCount: 6,
    albumPhotos: [
      "/static/pets/doubao-hero.jpg",
      "/static/pets/doubao-avatar.jpg",
    ],
  },
];

export const fallbackStatistics: StatisticsSummary = {
  range: "month",
  totalExpense: 4285.5,
  trendRate: -12.4,
  recordCount: 32,
  averageDailyExpense: 142.85,
  trendSeries: [
    { label: "一", amount: 640, percent: 48, active: false },
    { label: "二", amount: 960, percent: 72, active: false },
    { label: "三", amount: 480, percent: 36, active: false },
    { label: "四", amount: 1280, percent: 96, active: true },
    { label: "五", amount: 770, percent: 58, active: false },
    { label: "六", amount: 1090, percent: 82, active: false },
  ],
  categoryRatio: [
    { category: "主粮", percent: 45 },
    { category: "医疗", percent: 25 },
    { category: "服务", percent: 20 },
    { category: "其他", percent: 10 },
  ],
  topExpenses: [
    { id: "exp_1", rank: 1, name: "皇家小型犬成犬粮 8kg", category: "主粮", date: "10月12日", amount: 389 },
    { id: "exp_2", rank: 2, name: "年度体检套餐", category: "医疗", date: "10月05日", amount: 299 },
    { id: "exp_3", rank: 3, name: "洗护美容服务", category: "服务", date: "10月20日", amount: 158 },
  ],
};

export function getFallbackStatistics(range: StatisticsRange = "month"): StatisticsSummary {
  if (range === "week") {
    return {
      range,
      totalExpense: 986.8,
      trendRate: -4.8,
      recordCount: 8,
      averageDailyExpense: 140.97,
      trendSeries: [
        { label: "一", amount: 120, percent: 48, active: false },
        { label: "二", amount: 155, percent: 62, active: false },
        { label: "三", amount: 90, percent: 36, active: false },
        { label: "四", amount: 230, percent: 92, active: true },
        { label: "五", amount: 145, percent: 58, active: false },
        { label: "六", amount: 175, percent: 70, active: false },
        { label: "日", amount: 105, percent: 42, active: false },
      ],
      categoryRatio: [
        { category: "主粮", percent: 52 },
        { category: "零食", percent: 18 },
        { category: "用品", percent: 17 },
        { category: "其他", percent: 13 },
      ],
      topExpenses: [
        { id: "week_exp_1", rank: 1, name: "渴望六种鱼猫粮 1.8kg", category: "主粮", date: "06月02日", amount: 289 },
        { id: "week_exp_2", rank: 2, name: "冻干零食补充装", category: "零食", date: "06月01日", amount: 126 },
        { id: "week_exp_3", rank: 3, name: "除臭喷雾", category: "用品", date: "05月30日", amount: 69.8 },
      ],
    };
  }

  if (range === "year") {
    return {
      range,
      totalExpense: 48692.4,
      trendRate: 8.6,
      recordCount: 366,
      averageDailyExpense: 133.4,
      trendSeries: [
        { label: "Q1", amount: 11200, percent: 78, active: false },
        { label: "Q2", amount: 12600, percent: 88, active: true },
        { label: "Q3", amount: 9200, percent: 64, active: false },
        { label: "Q4", amount: 7600, percent: 52, active: false },
      ],
      categoryRatio: [
        { category: "主粮", percent: 42 },
        { category: "医疗", percent: 24 },
        { category: "用品", percent: 20 },
        { category: "其他", percent: 14 },
      ],
      topExpenses: [
        { id: "year_exp_1", rank: 1, name: "年度体检与疫苗套餐", category: "医疗", date: "03月18日", amount: 1299 },
        { id: "year_exp_2", rank: 2, name: "自动喂食器升级款", category: "用品", date: "04月09日", amount: 899 },
        { id: "year_exp_3", rank: 3, name: "大包装主粮组合", category: "主粮", date: "01月22日", amount: 728 },
      ],
    };
  }

  return {
    ...fallbackStatistics,
    range,
  };
}

export const fallbackDashboard: DashboardSummary = {
  familyName: "我家的猫窝",
  greeting: "下午好，主人",
  avatar: "/static/profile/cat-avatar.png",
  alerts: [
    { id: "expiring", title: "即将过期", count: 2, icon: "calendar", tone: "danger" },
    { id: "warning", title: "库存告急", count: 1, icon: "warning", tone: "warning" },
    { id: "restock", title: "待补货", count: 3, icon: "cart", tone: "info" },
  ],
  categories: [
    { id: "food", name: "猫粮", icon: "shop", total: 12, unit: "袋", days: "约45天", tone: "mint" },
    { id: "can", name: "罐头", icon: "goods", total: 24, unit: "罐", days: "约12天", tone: "lake" },
    { id: "litter", name: "猫砂", icon: "layers", total: 3, unit: "包", days: "约8天", tone: "yellow" },
  ],
};

export const fallbackReminders: ReminderItem[] = [
  {
    id: "reminder_orijen_expiring",
    category: "soon",
    title: "渴望六种鱼猫粮 5.4kg",
    description: "批次: L20230501 · 剩余 2 袋",
    badgeText: "3天后过期",
    timeText: "今天 09:00",
    productId: "prod_orijen_fish_cat",
    tone: "warning",
    primaryActionText: "立即处理",
  },
  {
    id: "reminder_deworm_expired",
    category: "expired",
    title: "拜宠清 驱虫药",
    description: "批次: B220911 · 剩余 1 盒",
    badgeText: "已过期",
    timeText: "昨天 14:30",
    tone: "danger",
    primaryActionText: "报废处理",
  },
];

export const fallbackFamily: FamilyOverview = {
  id: "family_demo",
  name: "幸福的小窝",
  createdAt: "2023-05-12",
  memberCount: 3,
  address: {
    contactName: "张三",
    phone: "13800000000",
    region: "上海市 浦东新区",
    detail: "花木路 100 号 8 幢 1602",
    notes: "补货可放门口置物架",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  members: [
    {
      id: "member_zhangsan",
      name: "张三（我）",
      subtitle: "zhangsan@example.com",
      avatar: "/static/family/zhangsan.png",
      role: "admin",
      roleText: "管理员",
    },
    {
      id: "member_lisi",
      name: "李四",
      subtitle: "lisi@example.com",
      avatar: "/static/family/lisi.png",
      role: "member",
      roleText: "成员",
    },
    {
      id: "member_wangwu",
      name: "王五",
      subtitle: "临时访客",
      role: "guest",
      roleText: "访客",
    },
  ],
  settings: [
    { id: "rename", label: "修改家庭名称" },
    { id: "address", label: "家庭地址管理" },
    { id: "permissions", label: "权限与分享设置" },
  ],
};

export const fallbackRestockPlan: RestockPlan = {
  estimatedCost: 342.5,
  lastRestockedText: "12天前（10月12日）",
  groups: [
    {
      id: "food",
      title: "主粮与零食",
      icon: "shop",
      items: [
        {
          id: "royal_food",
          name: "皇家成犬粮 2kg",
          description: "需补: 1袋 · 约 ¥128",
          productId: "prod_royal_food",
          category: "狗粮",
          unit: "袋",
          suggestedQuantity: 1,
          image: "/static/products/orijen.png",
          selected: false,
        },
        {
          id: "chicken_snack",
          name: "冻干鸡肉粒",
          description: "需补: 2罐 · 约 ¥79",
          productId: "prod_chicken_snack",
          category: "零食",
          unit: "罐",
          suggestedQuantity: 2,
          image: "/static/products/ziwi.png",
          selected: false,
        },
      ],
    },
    {
      id: "cleaning",
      title: "日用清洁",
      icon: "layers",
      items: [
        {
          id: "pee_pad",
          name: "除臭尿垫 M码",
          description: "需补: 1包 · 约 ¥45",
          productId: "prod_pee_pad",
          category: "用品",
          unit: "包",
          suggestedQuantity: 1,
          icon: "layers",
          selected: false,
        },
      ],
    },
  ],
  recommendations: [
    {
      id: "shampoo",
      name: "温和沐浴露",
      reason: "上次购买3个月前",
      image: "/static/products/litter.png",
    },
    {
      id: "insect_repellent",
      name: "内外驱虫滴剂",
      reason: "即将到期",
      icon: "warning",
    },
  ],
};
