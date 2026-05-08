import "dotenv/config";
import {
  provisionCredentialAccount,
  type ManagedRole,
} from "@/lib/account-provisioning";
import { prisma } from "@/lib/prisma";
import { v4 as uuid } from "uuid";

type ApproverPositionValue =
  | "ADVISER"
  | "DEAN"
  | "SDS"
  | "SAS"
  | "ADDITIONAL_SIGNATORY"
  | "VPAA_ASSISTANT"
  | "VPAA"
  | "UNIVERSITY_PRESIDENT";

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

async function assignApproverPosition(
  userId: string,
  position: ApproverPositionValue,
) {
  await prisma.approverPositionUser.upsert({
    where: {
      userId_position: {
        userId,
        position,
      },
    },
    update: { active: true },
    create: {
      id: uuid(),
      userId,
      position,
      active: true,
    },
  });
}

async function upsertAmenity({
  id,
  name,
  icon,
  supportLabel,
}: {
  id: string;
  name: string;
  icon: string;
  supportLabel: string | null;
}) {
  const existing = await prisma.amenity.findFirst({
    where: supportLabel
      ? {
          OR: [{ id }, { supportLabel }],
        }
      : { id },
  });

  if (existing) {
    return prisma.amenity.update({
      where: { id: existing.id },
      data: { name, icon, supportLabel, active: true },
    });
  }

  return prisma.amenity.create({
    data: { id, name, icon, supportLabel, active: true },
  });
}

async function main() {
  console.log("Seeding officer-only SAPF reservation system...");

  const superAdmin = await createAccount(
    "ryanphilippeiori.cu@email.lcup.edu.ph",
    "Super_Admin123",
    "Super Admin",
    "SUPER_ADMIN",
  );

  const mockSds = await createAccount(
    "mock.sds@email.lcup.edu.ph",
    "SDS_Mock123",
    "Mock SDS Admin",
    "ADMIN",
    "Student Discipline and Services Admin",
  );

  const mockAdviser = await createAccount(
    "mock.adviser@email.lcup.edu.ph",
    "Adviser123",
    "Mock Adviser",
    "APPROVER",
    "Organization Adviser",
  );

  const mockDean = await createAccount(
    "mock.dean@email.lcup.edu.ph",
    "Dean123",
    "Mock Dean",
    "APPROVER",
    "College Dean",
  );

  await createAccount(
    "mock.officer@email.lcup.edu.ph",
    "Officer123",
    "Mock Officer",
    "OFFICER",
    "Student Organization Officer",
  );

  const seededApprovers = await Promise.all([
    createAccount(
      "mock.sas@email.lcup.edu.ph",
      "SAS_Mock123",
      "Mock SAS Approver",
      "APPROVER",
      "Student Affairs Services Director",
    ),
    createAccount(
      "mock.vpaa.asst@email.lcup.edu.ph",
      "VPAA_Asst123",
      "Mock VPAA Assistant",
      "APPROVER",
      "Vice President for Academic Affairs Assistant",
    ),
    createAccount(
      "mock.vpaa@email.lcup.edu.ph",
      "VPAA_Mock123",
      "Mock VPAA",
      "APPROVER",
      "Vice President for Academic Affairs",
    ),
    createAccount(
      "mock.president@email.lcup.edu.ph",
      "President123",
      "Mock University President",
      "APPROVER",
      "University President",
    ),
    createAccount(
      "mock.vp.finance@email.lcup.edu.ph",
      "VPFinance123",
      "Mock Additional Signatory 1",
      "APPROVER",
      "Vice President for Finance and Administration",
    ),
    createAccount(
      "mock.vp.research@email.lcup.edu.ph",
      "VPResearch123",
      "Mock Additional Signatory 2",
      "APPROVER",
      "Vice President Research and Innovation",
    ),
    createAccount(
      "mock.vp.spiritual@email.lcup.edu.ph",
      "VPSpiritual123",
      "Mock Additional Signatory 3",
      "APPROVER",
      "Vice President for Spiritual Formation and Extension",
    ),
  ]);

  await Promise.all([
    assignApproverPosition(mockSds.id, "SDS"),
    assignApproverPosition(mockAdviser.id, "ADVISER"),
    assignApproverPosition(mockDean.id, "DEAN"),
    assignApproverPosition(seededApprovers[0].id, "SAS"),
    assignApproverPosition(seededApprovers[1].id, "VPAA_ASSISTANT"),
    assignApproverPosition(seededApprovers[2].id, "VPAA"),
    assignApproverPosition(seededApprovers[3].id, "UNIVERSITY_PRESIDENT"),
    assignApproverPosition(seededApprovers[4].id, "ADDITIONAL_SIGNATORY"),
    assignApproverPosition(seededApprovers[5].id, "ADDITIONAL_SIGNATORY"),
    assignApproverPosition(seededApprovers[6].id, "ADDITIONAL_SIGNATORY"),
  ]);

  const amenities = await Promise.all(
    [
      { id: "a1", name: "WiFi", icon: "wifi", supportLabel: null },
      {
        id: "a2",
        name: "Projector",
        icon: "projector",
        supportLabel: "LCD Projector",
      },
      {
        id: "a3",
        name: "Sound System",
        icon: "sound",
        supportLabel: "Sound System",
      },
      { id: "a4", name: "Stage", icon: "stage", supportLabel: null },
      {
        id: "a5",
        name: "Air Conditioning",
        icon: "air",
        supportLabel: null,
      },
      { id: "a6", name: "Tables", icon: "tables", supportLabel: "Tables" },
      { id: "a7", name: "Chairs", icon: "chairs", supportLabel: "Chairs" },
      {
        id: "a8",
        name: "Microphone",
        icon: "microphone",
        supportLabel: "Microphone",
      },
    ].map(upsertAmenity),
  );

  const [wifi, projector, sound, stage, air, tables, chairs] = amenities;

  await Promise.all(
    [
      ["eq_sound_system", "Sound System", "Sound System", 1],
      ["eq_microphone", "Microphone", "Microphone", 10],
      ["eq_lcd_projector", "LCD Projector", "LCD Projector", 3],
      ["eq_long_table", "Tables", "Tables", 20],
      ["eq_chairs", "Chairs", "Chairs", 100],
    ].map(([id, name, supportLabel, totalQuantity]) =>
      prisma.equipmentItem.upsert({
        where: { id: String(id) },
        update: {
          name: String(name),
          supportLabel: String(supportLabel),
          totalQuantity: Number(totalQuantity),
          active: true,
        },
        create: {
          id: String(id),
          name: String(name),
          supportLabel: String(supportLabel),
          totalQuantity: Number(totalQuantity),
          active: true,
          createdById: superAdmin.id,
        },
      }),
    ),
  );

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
          { id: tables.id },
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
        connect: [{ id: sound.id }, { id: tables.id }, { id: chairs.id }],
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

  await prisma.venueBlock.upsert({
    where: { id: "block-foundation-week-2026" },
    update: {
      title: "University Foundation Week",
      reason: "University event",
      createdById: superAdmin.id,
      schedules: {
        deleteMany: {},
        create: {
          id: uuid(),
          startAt: new Date("2026-06-20T00:00:00.000Z"),
          endAt: new Date("2026-06-20T10:00:00.000Z"),
        },
      },
    },
    create: {
      id: "block-foundation-week-2026",
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
  console.log("Mock approver accounts:");
  console.log("SDS/Admin: mock.sds@email.lcup.edu.ph / SDS_Mock123");
  console.log("Adviser: mock.adviser@email.lcup.edu.ph / Adviser123");
  console.log("Dean: mock.dean@email.lcup.edu.ph / Dean123");
  console.log("SAS: mock.sas@email.lcup.edu.ph / SAS_Mock123");
  console.log("VPAA Assistant: mock.vpaa.asst@email.lcup.edu.ph / VPAA_Asst123");
  console.log("VPAA: mock.vpaa@email.lcup.edu.ph / VPAA_Mock123");
  console.log("University President: mock.president@email.lcup.edu.ph / President123");
  console.log(
    "Additional Signatory 1: mock.vp.finance@email.lcup.edu.ph / VPFinance123",
  );
  console.log(
    "Additional Signatory 2: mock.vp.research@email.lcup.edu.ph / VPResearch123",
  );
  console.log(
    "Additional Signatory 3: mock.vp.spiritual@email.lcup.edu.ph / VPSpiritual123",
  );
  console.log("Mock officer account:");
  console.log("Officer: mock.officer@email.lcup.edu.ph / Officer123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
