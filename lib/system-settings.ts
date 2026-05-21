import { prisma } from "@/lib/prisma";

export type SystemEmailSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName: string;
};

export async function getEmailSettings(): Promise<SystemEmailSettings> {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "SYSTEM" },
    create: { id: "SYSTEM" },
    update: {},
  });

  return {
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    senderEmail: settings.senderEmail,
    senderName: settings.senderName,
  };
}
