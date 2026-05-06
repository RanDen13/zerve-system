import {
  Amenity,
  EventSpace,
  EventSpaceImage,
  EventSpaceStatus,
} from "@/generated/prisma/browser";
import z from "zod";

export type EventSpaceData = EventSpace & {
  amenities?: Amenity[];
  images?: EventSpaceImage[];
  sapfRequests?: any[];
  sapfRequestVenues?: any[];
  venueBlocks?: any[];
  globalBlocks?: any[];
};

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const IMAGE_SCHEMA = z
  .instanceof(File)
  .refine((file) => IMAGE_MIME_TYPES.includes(file.type as any), {
    message: "Invalid image file type",
  })
  .transform((file) => file.bytes());

export const createEventSpaceSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  location: z
    .string()
    .min(3, "Location must be at least 3 characters")
    .max(200, "Location must be less than 200 characters"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters"),
  status: z.enum(EventSpaceStatus).default(EventSpaceStatus.ACTIVE),
  amenities: z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.array(z.string()).optional())
    .optional(),
});

export const updateEventSpaceSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  location: z
    .string()
    .min(3, "Location must be at least 3 characters")
    .max(200, "Location must be less than 200 characters")
    .optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  status: z.enum(EventSpaceStatus).optional(),
  amenities: z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.array(z.string()).optional())
    .optional(),
});
