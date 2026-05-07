import {
  provisionCredentialAccount,
  type ManagedRole,
} from "@/lib/account-provisioning";
import { prisma } from "@/lib/prisma";
import { v4 as uuid } from "uuid";

async function createAccount(
  email: string,
  password: string,
  name: string,
  role: ManagedRole,
  title?: string,
) {
  return provisionCredentialAccount(
    {
      email,
      password,
      name,
      role,
      title,
    },
    {
      allowExisting: true,
      resetPassword: true,
    },
  );
}

async function main() {
  console.log("Seeding officer-only SAPF reservation system...");

  const superAdmin = await createAccount(
    "ryanphilippeiori.cu@email.lcup.edu.ph",
    "Super_Admin123",
    "Super Admin",
    "SUPER_ADMIN",
  );

  const amenities = await Promise.all(
    [
      ["a1", "WiFi", "wifi"],
      ["a2", "Projector", "projector"],
      ["a3", "Sound System", "sound"],
      ["a4", "Stage", "stage"],
      ["a5", "Air Conditioning", "air"],
      ["a6", "One Long Table", "chairs"],
    ].map(([id, name, icon]) =>
      prisma.amenity.upsert({
        where: { id },
        update: { name, icon },
        create: { id, name, icon },
      }),
    ),
  );

  const [wifi, projector, sound, stage, air, chairs] = amenities;

  await prisma.eventSpace.upsert({
    where: { id: "venue-auditorium" },
    update: {},
    create: {
      id: "venue-auditorium",
      name: "Main Auditorium",
      capacity: 200,
      location: "Main Building, Ground Floor",
      description: "Large venue for assemblies, seminars, and major programs.",
      status: "ACTIVE",
      amenities: {
        connect: [
          { id: projector.id },
          { id: sound.id },
          { id: stage.id },
          { id: air.id },
          { id: chairs.id },
        ],
      },
    },
  });

  await prisma.eventSpace.upsert({
    where: { id: "venue-gym" },
    update: {},
    create: {
      id: "venue-gym",
      name: "Gymnasium",
      capacity: 350,
      location: "Sports Complex",
      description: "Open floor venue for large organization activities.",
      status: "ACTIVE",
      amenities: {
        connect: [{ id: sound.id }, { id: chairs.id }],
      },
    },
  });

  await prisma.eventSpace.upsert({
    where: { id: "venue-function-hall" },
    update: {},
    create: {
      id: "venue-function-hall",
      name: "Function Hall",
      capacity: 120,
      location: "Administration Building, 2nd Floor",
      description:
        "Flexible indoor venue for councils, seminars, and receptions.",
      status: "ACTIVE",
      amenities: {
        connect: [{ id: wifi.id }, { id: projector.id }, { id: air.id }],
      },
    },
  });

  await prisma.venueBlock.create({
    data: {
      id: uuid(),
      title: "University Foundation Week",
      reason: "University event",
      createdById: superAdmin.id,
      schedules: {
        create: {
          id: uuid(),
          startAt: new Date("2026-06-20T00:00:00.000Z"),
          endAt: new Date("2026-06-20T10:00:00.000Z"),
        },
      },
    },
  });

  console.log("Seed complete.");
  console.log(
    "Super admin: ryanphilippeiori.cu@email.lcup.edu.ph / Super_Admin123",
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
