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
    role: Role.ORGANIZER,
    gender: Gender.PREFER_NOT_TO_SAY,
    city: "Madrid",
    major: "Event Management",
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

  console.log("Demo hacker and organizer accounts are ready.");
} finally {
  await prisma.$disconnect();
}
