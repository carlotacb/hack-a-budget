import { Gender, PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const demoUsers = [
  {
    name: "Demo Hacker",
    email: "hacker@example.com",
    password: "DemoHacker123!",
    role: Role.HACKER,
    gender: Gender.NON_BINARY,
    city: "Barcelona",
    major: "Computer Science",
  },
  {
    name: "Demo Organizer",
    email: "organizer@example.com",
    password: "DemoOrganizer123!",
    role: Role.ADMIN,
    gender: Gender.PREFER_NOT_TO_SAY,
    city: "Madrid",
    major: "Event Management",
  },
];

const categories = [
  {
    name: "Venue",
    budgetCents: 500000,
    subcategories: [
      { name: "Space rental", budgetCents: 400000 },
      { name: "Equipment", budgetCents: 100000 },
    ],
  },
  {
    name: "Catering",
    budgetCents: 300000,
    subcategories: [
      { name: "Meals", budgetCents: 250000 },
      { name: "Snacks and drinks", budgetCents: 50000 },
    ],
  },
  {
    name: "Prizes",
    budgetCents: 200000,
    subcategories: [
      { name: "Cash prizes", budgetCents: 150000 },
      { name: "Swag", budgetCents: 50000 },
    ],
  },
  {
    name: "Marketing",
    budgetCents: 100000,
    subcategories: [
      { name: "Advertising", budgetCents: 70000 },
      { name: "Printing", budgetCents: 30000 },
    ],
  },
  {
    name: "Other",
    budgetCents: 100000,
    subcategories: [{ name: "Miscellaneous", budgetCents: 100000 }],
  },
];

const departments = [
  { code: "hx", name: "HX" },
  { code: "logistics", name: "Logistics" },
  { code: "general", name: "General" },
  { code: "mkt", name: "Marketing" },
  { code: "staff", name: "Staff" },
  { code: "webdev", name: "Web Development" },
  { code: "design", name: "Design" },
];

try {
  for (const user of demoUsers) {
    const passwordHash = await hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        gender: user.gender,
        city: user.city,
        major: user.major,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        gender: user.gender,
        city: user.city,
        major: user.major,
      },
    });
  }

  for (const category of categories) {
    const { subcategories, ...categoryData } = category;
    const savedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: { active: true },
      create: categoryData,
    });

    for (const subcategory of subcategories) {
      await prisma.subcategory.upsert({
        where: {
          categoryId_name: {
            categoryId: savedCategory.id,
            name: subcategory.name,
          },
        },
        update: { active: true },
        create: {
          categoryId: savedCategory.id,
          ...subcategory,
        },
      });
    }

    await prisma.expense.updateMany({
      where: {
        categoryId: null,
        categoryLabel: category.name,
      },
      data: { categoryId: savedCategory.id },
    });
  }

  for (const department of departments) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name, active: true },
      create: department,
    });
  }

  console.log("Demo hacker and admin accounts are ready.");
} finally {
  await prisma.$disconnect();
}
