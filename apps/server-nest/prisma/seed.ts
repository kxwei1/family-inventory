/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.family.findFirst();

  if (existing) {
    console.log(`Family already exists (${existing.id}); skipping seed.`);
    return;
  }

  const family = await prisma.family.create({
    data: {
      name: "幸福的小窝",
      address: {
        create: {
          contactName: "张三",
          phone: "13800000000",
          region: "上海市 浦东新区",
          detail: "花木路 100 号 8 幢 1602",
          notes: "补货可放门口置物架",
        },
      },
      notification: {
        create: {
          stockWarningEnabled: true,
          expiryReminderEnabled: true,
        },
      },
      members: {
        create: [
          {
            name: "张三（我）",
            subtitle: "zhangsan@example.com",
            avatar: "/static/family/zhangsan.png",
            role: "ADMIN",
            isOwner: true,
          },
          {
            name: "李四",
            subtitle: "lisi@example.com",
            avatar: "/static/family/lisi.png",
            role: "MEMBER",
          },
          {
            name: "王五",
            subtitle: "临时访客",
            role: "GUEST",
          },
        ],
      },
    },
    include: { members: true },
  });

  const owner = family.members.find((member) => member.isOwner) ?? family.members[0];

  await prisma.userProfile.create({
    data: {
      memberId: owner.id,
      name: "张三丰",
      familyName: family.name,
      avatar: "/static/family/zhangsan.png",
      petCount: 3,
      bookkeepingDays: 365,
      reminderCount: 8,
    },
  });

  await prisma.product.createMany({
    data: [
      {
        familyId: family.id,
        name: "渴望六种鱼猫粮",
        category: "猫粮",
        brand: "Orijen",
        spec: "5.4kg/袋",
        unit: "袋",
        quantity: 2,
        status: "ENOUGH",
        statusText: "充足",
        image: "/static/products/orijen.png",
        purchasePrice: 429,
        purchaseChannel: "天猫",
        location: "客厅储物柜",
        isOpened: true,
        stockInDate: new Date("2026-01-02"),
      },
      {
        familyId: family.id,
        name: "巅峰牛肉主食罐",
        category: "罐头",
        brand: "Ziwi Peak",
        spec: "170g/罐",
        unit: "罐",
        quantity: 3,
        status: "LOW",
        statusText: "即将耗尽",
        image: "/static/products/ziwi.png",
        purchasePrice: 28.9,
        purchaseChannel: "京东",
        location: "厨房收纳架",
        isOpened: false,
        stockInDate: new Date("2026-01-08"),
      },
      {
        familyId: family.id,
        name: "N1豆腐猫砂 原味",
        category: "猫砂",
        brand: "N1",
        spec: "17.5L/包",
        unit: "包",
        quantity: 0,
        status: "EMPTY",
        statusText: "已耗尽",
        image: "/static/products/litter.png",
        purchasePrice: 79,
        purchaseChannel: "线下门店",
        location: "阳台储物区",
        isOpened: true,
        stockInDate: new Date("2026-01-12"),
      },
    ],
  });

  await prisma.pet.createMany({
    data: [
      {
        familyId: family.id,
        name: "橘座",
        species: "猫",
        breed: "中华田园猫",
        ageText: "3岁",
        weightKg: 5.2,
        avatar: "/static/pets/orange-avatar.jpg",
        colorTone: "orange",
        tags: ["贪吃", "亲人", "爱睡觉"],
        dietStaple: "皇家室内成猫粮",
        dietSnack: "冻干鹌鹑",
        estimateFoodDays: 12,
        estimateLitterDays: 5,
        weightTrend: [
          { label: "08月", value: 60 },
          { label: "09月", value: 65 },
          { label: "10月", value: 62 },
          { label: "11月", value: 70 },
          { label: "12月", value: 80 },
        ],
        albumPhotos: [
          "/static/pets/orange-hero.jpg",
          "/static/pets/orange-play.jpg",
          "/static/pets/orange-sleep.jpg",
          "/static/pets/orange-window.jpg",
        ],
      },
    ],
  });

  console.log(`Seeded family ${family.name} (${family.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
