import { prisma } from "@/lib/prisma";

export async function getVenueCalendarData() {
  const [venues, globalBlocks] = await Promise.all([
    prisma.eventSpace.findMany({
      where: {
        status: {
          in: ["ACTIVE", "UNDER_MAINTENANCE"] as any,
        },
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
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
                department: true,
                status: true,
                createdAt: true,
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
          include: {
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
      orderBy: {
        name: "asc",
      },
    }),
    prisma.venueBlock.findMany({
      where: {
        eventSpaceId: null,
      },
      include: {
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

  return {
    venues: venues.map((venue: any) => ({
      ...venue,
      sapfRequests: venue.sapfRequestVenues.map((item: any) => item.request),
      imagesData: (venue.images || []).map(
        (img: any) =>
          `data:image/jpeg;base64,${Buffer.from(img.data).toString("base64")}`,
      ),
    })),
    globalBlocks,
  };
}
