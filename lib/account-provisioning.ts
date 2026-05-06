import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";
import { v4 as uuid } from "uuid";

export const managedRoles = ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"] as const;

export type ManagedRole = (typeof managedRoles)[number];

type ProvisionAccountInput = {
  email: string;
  password: string;
  name: string;
  role: ManagedRole;
  title?: string;
};

type ProvisionAccountOptions = {
  allowExisting?: boolean;
  resetPassword?: boolean;
};

async function setCredentialPassword(
  userId: string,
  password: string,
  title?: string,
) {
  const passwordHash = await hashPassword(password);
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
  });

  if (account) {
    return prisma.account.update({
      where: { id: account.id },
      data: {
        accountId: userId,
        password: passwordHash,
        ...(title !== undefined ? { title: title || null } : {}),
      },
    });
  }

  return prisma.account.create({
    data: {
      id: uuid(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      title: title || null,
    },
  });
}

export async function provisionCredentialAccount(
  input: ProvisionAccountInput,
  options: ProvisionAccountOptions = {},
) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && !options.allowExisting) {
    throw new Error("An account with this email already exists.");
  }

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        role: input.role,
        emailVerified: true,
      },
    });

    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (options.resetPassword || !credentialAccount?.password) {
      await setCredentialPassword(user.id, input.password, input.title);
    }

    return user;
  }

  const user = await prisma.user.create({
    data: {
      id: uuid(),
      email,
      name: input.name,
      role: input.role,
      emailVerified: true,
    },
  });

  await setCredentialPassword(user.id, input.password, input.title);

  return user;
}

export async function provisionMagicAccount(input: Omit<ProvisionAccountInput, "password">) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  return prisma.user.create({
    data: {
      id: uuid(),
      email,
      name: input.name,
      role: input.role,
      emailVerified: true,
    },
  });
}
