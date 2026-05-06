"use server";

import ActionResult from "@/app/components/ActionResult";
import { Amenity } from "@/generated/prisma/browser";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import { prettifyError } from "zod";
import {
  createEventSpaceSchema,
  EventSpaceData,
  IMAGE_MIME_TYPES,
  updateEventSpaceSchema,
} from "./schema";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_COUNT = 8;

function extractImageFiles(data: FormData) {
  return data
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function validateImageFiles(files: File[]) {
  if (files.length > MAX_IMAGE_COUNT) {
    return `You can upload up to ${MAX_IMAGE_COUNT} images.`;
  }

  const invalidType = files.find(
    (file) => !IMAGE_MIME_TYPES.includes(file.type as any),
  );
  if (invalidType) {
    return "Invalid image file type.";
  }

  const tooLarge = files.find((file) => file.size > MAX_IMAGE_BYTES);
  if (tooLarge) {
    return "Each image must be 10 MB or less.";
  }

  return null;
}

function isSuperAdmin(role?: string | null) {
  return role?.toUpperCase() === "SUPER_ADMIN";
}

export async function getAllEventSpaces(): Promise<
  ActionResult<EventSpaceData[]>
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    const spaces = await prisma.eventSpace.findMany({
      include: {
        amenities: true,
        images: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    });

    return {
      success: true,
      data: spaces,
    };
  } catch (error) {
    console.error("Error fetching event spaces:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch event spaces.",
    };
  }
}

export async function getGlobalVenueBlocks(): Promise<ActionResult<any[]>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    const blocks = await prisma.venueBlock.findMany({
      where: {
        eventSpaceId: null,
      },
      select: {
        id: true,
        title: true,
        reason: true,
        schedules: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
          },
          orderBy: {
            startAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      data: blocks,
    };
  } catch (error) {
    console.error("Error fetching university-wide blocks:", error);
    return {
      success: false,
      message:
        (error as Error).message || "Failed to fetch university-wide blocks.",
    };
  }
}

export async function getEventSpaceById(
  id: string,
): Promise<ActionResult<EventSpaceData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }
    const [space, globalBlocks] = await Promise.all([
      prisma.eventSpace.findUnique({
        where: { id },
        include: {
          amenities: true,
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          sapfRequestVenues: {
            where: {
              request: {
                status: {
                  in: [
                    "SUBMITTED",
                    "IN_REVIEW",
                    "RETURNED_FOR_REVISION",
                    "APPROVED",
                  ] as any,
                },
              },
            },
            include: {
              request: {
                select: {
                  id: true,
                  requestNumber: true,
                  title: true,
                  organization: true,
                  status: true,
                  schedules: {
                    select: {
                      id: true,
                      startAt: true,
                      endAt: true,
                    },
                    orderBy: {
                      startAt: "asc",
                    },
                  },
                },
              },
            },
          },
          venueBlocks: {
            select: {
              id: true,
              title: true,
              reason: true,
              schedules: {
                select: {
                  id: true,
                  startAt: true,
                  endAt: true,
                },
                orderBy: {
                  startAt: "asc",
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),
      prisma.venueBlock.findMany({
        where: {
          eventSpaceId: null,
        },
        select: {
          id: true,
          title: true,
          reason: true,
          schedules: {
            select: {
              id: true,
              startAt: true,
              endAt: true,
            },
            orderBy: {
              startAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);
    if (!space) {
      return {
        success: false,
        message: "Event space not found.",
      };
    }

    return {
      success: true,
      data: {
        ...space,
        sapfRequests: (space as any).sapfRequestVenues.map(
          (item: any) => item.request,
        ),
        globalBlocks,
      },
    };
  } catch (error) {
    console.error("Error fetching event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch event space.",
    };
  }
}

export async function getAllAmenities(): Promise<ActionResult<Amenity[]>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return {
        success: false,
        message: "Only super admins can update venues.",
      };
    }

    const amenities = await prisma.amenity.findMany({
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: amenities,
    };
  } catch (error) {
    console.error("Error fetching amenities:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch amenities.",
    };
  }
}

export async function createEventSpace(
  data: FormData,
): Promise<ActionResult<EventSpaceData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return {
        success: false,
        message: "Only super admins can delete venues.",
      };
    }

    const validation = await createEventSpaceSchema.safeParseAsync(
      Object.fromEntries(data),
    );
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return {
        success: false,
        message: prettifyError(validation.error),
      };
    }
    const validatedData = validation.data;
    const imageFiles = extractImageFiles(data);
    const imageError = validateImageFiles(imageFiles);
    if (imageError) {
      return {
        success: false,
        message: imageError,
      };
    }

    // Parse amenities from JSON string if present
    const amenitiesData = data.get("amenities");
    const amenities = amenitiesData
      ? JSON.parse(amenitiesData as string)
      : validatedData.amenities;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { amenities: _amenities, ...restData } = validatedData;

    const imageBuffers = await Promise.all(
      imageFiles.map(async (file) => Buffer.from(await file.arrayBuffer())),
    );

    const newSpace = await prisma.$transaction(async (tx) => {
      const created = await tx.eventSpace.create({
        data: {
          id: uuid(),
          ...restData,
          image: imageBuffers[0] || undefined,
          amenities: amenities
            ? {
                connect: amenities.map((id: string) => ({ id })),
              }
            : undefined,
        },
        include: {
          amenities: true,
        },
      });

      if (imageBuffers.length > 0) {
        await tx.eventSpaceImage.createMany({
          data: imageBuffers.map((buffer, index) => ({
            id: uuid(),
            eventSpaceId: created.id,
            data: buffer,
            sortOrder: index,
          })),
        });
      }

      return created;
    });

    return {
      success: true,
      data: newSpace,
    };
  } catch (error) {
    console.error("Error creating event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to create event space.",
    };
  }
}

export async function updateEventSpace(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    const validatedData = await updateEventSpaceSchema.safeParseAsync(
      Object.fromEntries(data),
    );
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error);
      return {
        success: false,
        message: prettifyError(validatedData.error),
      };
    }

    const {
      id,
      amenities: validatedAmenities,
      ...updateData
    } = validatedData.data;

    const imageFiles = extractImageFiles(data);
    const imageError = validateImageFiles(imageFiles);
    if (imageError) {
      return {
        success: false,
        message: imageError,
      };
    }

    const imageBuffers = await Promise.all(
      imageFiles.map(async (file) => Buffer.from(await file.arrayBuffer())),
    );

    // Parse amenities from JSON string if present
    const amenitiesData = data.get("amenities");
    const amenities = amenitiesData
      ? JSON.parse(amenitiesData as string)
      : validatedAmenities;

    // If amenities are provided, first disconnect all existing amenities, then connect new ones
    const amenitiesUpdate = amenities
      ? {
          set: [], // Disconnect all existing
          connect: amenities.map((amenityId: string) => ({ id: amenityId })),
        }
      : undefined;

    await prisma.$transaction(async (tx) => {
      if (imageBuffers.length > 0) {
        await tx.eventSpaceImage.deleteMany({
          where: { eventSpaceId: id },
        });
        await tx.eventSpaceImage.createMany({
          data: imageBuffers.map((buffer, index) => ({
            id: uuid(),
            eventSpaceId: id,
            data: buffer,
            sortOrder: index,
          })),
        });
      }

      await tx.eventSpace.update({
        where: { id },
        data: {
          ...updateData,
          ...(amenitiesUpdate && { amenities: amenitiesUpdate }),
          ...(imageBuffers.length > 0 ? { image: imageBuffers[0] } : {}),
        },
        include: {
          amenities: true,
        },
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update event space.",
    };
  }
}

export async function deleteEventSpace(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    if (!id) {
      return {
        success: false,
        message: "Event space ID is required.",
      };
    }

    await prisma.eventSpace.delete({
      where: { id },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to delete event space.",
    };
  }
}
