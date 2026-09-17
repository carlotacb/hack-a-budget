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
  {
    name: "Demo Director",
    email: "director@example.com",
    password: "DemoDirector123!",
    role: Role.DIRECTOR,
    gender: Gender.PREFER_NOT_TO_SAY,
    city: "Valencia",
    major: "Operations",
  },
  {
    name: "Demo Plain Organizer",
    email: "plain-organizer@example.com",
    password: "DemoOrganizer123!",
    role: Role.ORGANIZER,
    gender: Gender.PREFER_NOT_TO_SAY,
    city: "Seville",
    major: "Logistics",
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

const categories = [
  {
    name: "Venue",
    budgetCents: 500000,
    subcategories: [
      { name: "Space rental", budgetCents: 400000, departmentCode: "logistics" },
      { name: "Equipment", budgetCents: 100000, departmentCode: "logistics" },
    ],
  },
  {
    name: "Catering",
    budgetCents: 300000,
    subcategories: [
      { name: "Meals", budgetCents: 250000, departmentCode: "hx" },
      {
        name: "Snacks and drinks",
        budgetCents: 50000,
        departmentCode: "hx",
      },
    ],
  },
  {
    name: "Prizes",
    budgetCents: 200000,
    subcategories: [
      { name: "Cash prizes", budgetCents: 150000, departmentCode: "hx" },
      { name: "Swag", budgetCents: 50000, departmentCode: "hx" },
    ],
  },
  {
    name: "Marketing",
    budgetCents: 100000,
    subcategories: [
      {
        name: "Advertising",
        budgetCents: 70000,
        departmentCode: "mkt",
      },
      { name: "Printing", budgetCents: 30000, departmentCode: "mkt" },
    ],
  },
  {
    name: "Other",
    budgetCents: 100000,
    subcategories: [
      {
        name: "Miscellaneous",
        budgetCents: 100000,
        departmentCode: "general",
      },
    ],
  },
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

  const departmentIdByCode = new Map();
  for (const department of departments) {
    const savedDepartment = await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name, active: true },
      create: department,
    });
    departmentIdByCode.set(department.code, savedDepartment.id);
  }

  for (const category of categories) {
    const { subcategories, ...categoryData } = category;
    const savedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: { active: true },
      create: categoryData,
    });

    for (const { departmentCode, ...subcategory } of subcategories) {
      const departmentId = departmentIdByCode.get(departmentCode);

      await prisma.subcategory.upsert({
        where: {
          categoryId_name: {
            categoryId: savedCategory.id,
            name: subcategory.name,
          },
        },
        update: { active: true, departmentId },
        create: {
          categoryId: savedCategory.id,
          departmentId,
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

  await prisma.travelEventSettings.upsert({
    where: { id: "event" },
    update: {},
    create: {
      id: "event",
      hackathonStartAt: new Date(Date.now() - 60 * 60 * 1000),
      reimbursementInstructions:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Keep your ticket and follow the event desk instructions for reimbursement.",
      finalReviewInstructions:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Your demo proof and final checklist will be reviewed by the event team.",
    },
  });

  for (const name of [
    "Project or demo URL is accessible",
    "Demo was presented to the review team",
    "Travel ticket and identity details match",
  ]) {
    await prisma.travelFinalRequirement.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const template of [
    {
      type: "REQUEST_CHANGES",
      name: "Wrong travel dates",
      message:
        "Your travel dates don't line up with the event schedule. Please update your outbound and return journeys and resubmit.",
    },
    {
      type: "REQUEST_CHANGES",
      name: "Missing luggage receipt",
      message:
        "You've marked luggage as paid separately, but we couldn't find a matching receipt on the ticket. Please resubmit with proof of the luggage cost.",
    },
    {
      type: "REJECT",
      name: "Missing or unreadable ticket",
      message:
        "We couldn't verify your travel ticket. Please resubmit your request with a clear, valid ticket attached.",
    },
    {
      type: "REJECT",
      name: "Ineligible origin",
      message:
        "The submitted origin doesn't match an eligible location for this event's travel reimbursement policy.",
    },
  ]) {
    await prisma.travelMessageTemplate.upsert({
      where: { type_name: { type: template.type, name: template.name } },
      update: { message: template.message, active: true },
      create: template,
    });
  }

  console.log("Demo accounts, travel settings, and metadata are ready.");
} finally {
  await prisma.$disconnect();
}
