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
    "superadmin@lcup.edu.ph",
    "superadmin123",
    "Super Admin",
    "SUPER_ADMIN",
  );
  await createAccount(
    "officer@lcup.edu.ph",
    "officer123",
    "Org Officer",
    "OFFICER",
  );
  const adviser = await createAccount(
    "adviser@lcup.edu.ph",
    "adviser123",
    "Club Adviser",
    "APPROVER",
    "Organization Adviser",
  );
  const dean = await createAccount(
    "dean@lcup.edu.ph",
    "dean12345",
    "College Dean",
    "APPROVER",
    "Dean, CITE",
  );
  const sds = await createAccount(
    "sds@lcup.edu.ph",
    "sds12345",
    "Dr. Rosalyn Galvez",
    "ADMIN",
    "Director, Student Affairs and Services",
  );
  const sas = await createAccount(
    "sas@lcup.edu.ph",
    "sas12345",
    "SAS Director",
    "APPROVER",
    "SAS Director",
  );
  const finance = await createAccount(
    "finance@lcup.edu.ph",
    "finance123",
    "Sr. Jennifer Dela Cruz, OSA, Ph.D.",
    "APPROVER",
    "Vice President for Finance and Administration",
  );
  const spiritual = await createAccount(
    "spiritual@lcup.edu.ph",
    "spiritual123",
    "Sr. Regina M. Cesar, OSA",
    "APPROVER",
    "Asst. Vice President for Spiritual Formation and Extension",
  );
  const research = await createAccount(
    "research@lcup.edu.ph",
    "research123",
    "Dr. Mark Rey Santos",
    "APPROVER",
    "Vice President Research and Innovation",
  );
  const vpaaAssistant = await createAccount(
    "vpaa.assistant@lcup.edu.ph",
    "vpaaasst123",
    "VPAA Assistant",
    "APPROVER",
    "VPAA Assistant",
  );
  const vpaa = await createAccount(
    "vpaa@lcup.edu.ph",
    "vpaa12345",
    "VPAA",
    "APPROVER",
    "Vice President for Academic Affairs",
  );
  const president = await createAccount(
    "president@lcup.edu.ph",
    "president123",
    "Sr. Niceta M. Vargas, OSA, Ph.D.",
    "APPROVER",
    "University President",
  );

  await Promise.all(
    [
      { userId: adviser.id, position: "ADVISER" },
      { userId: dean.id, position: "DEAN" },
      { userId: sds.id, position: "SDS" },
      { userId: sas.id, position: "SAS" },
      { userId: finance.id, position: "ADDITIONAL_SIGNATORY" },
      { userId: research.id, position: "ADDITIONAL_SIGNATORY" },
      { userId: spiritual.id, position: "ADDITIONAL_SIGNATORY" },
      { userId: vpaaAssistant.id, position: "VPAA_ASSISTANT" },
      { userId: vpaa.id, position: "VPAA" },
      { userId: president.id, position: "UNIVERSITY_PRESIDENT" },
    ].map(({ userId, position }) =>
      prisma.approverPositionUser.upsert({
        where: {
          userId_position: {
            userId,
            position: position as any,
          },
        },
        update: {
          active: true,
        },
        create: {
          id: uuid(),
          userId,
          position: position as any,
        },
      }),
    ),
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
  console.log("Super admin: superadmin@lcup.edu.ph / superadmin123");
  console.log("Officer: officer@lcup.edu.ph / officer123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
