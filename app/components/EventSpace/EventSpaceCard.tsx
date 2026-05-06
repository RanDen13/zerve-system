"use client";

import { deleteEventSpace } from "@/app/components/pages/Spaces/EventSpaceActions";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Amenity,
  EventSpace,
  EventSpaceImage,
} from "@/generated/prisma/browser";
import { motion } from "framer-motion";
import { Building2, Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePopup } from "../Popup/PopupProvider";
import { amenityIcons } from "./AmenityIcon";
import EditEventSpacePopup from "./EditEventSpacePopup";
import VenueImageCarousel from "./VenueImageCarousel";

interface EventAreaProps {
  eventSpace: EventSpace & {
    amenities?: Amenity[];
    images?: EventSpaceImage[];
  };
  showAdminActions?: boolean;
  detailsHref?: string;
}

export default function EventSpaceCard({
  eventSpace,
  showAdminActions = false,
  detailsHref,
}: EventAreaProps) {
  const {
    id,
    name,
    description,
    location,
    capacity,
    status,
    amenities = [],
    images = [],
  } = eventSpace;
  const [showEditPopup, setShowEditPopup] = useState<boolean>(false);
  const statusPopup = usePopup();
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to delete the event space "${name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    statusPopup.showLoading("Deleting event space...");
    const result = await deleteEventSpace(id);
    if (!result.success) {
      statusPopup.showError(result.message || "Failed to delete event space.");
      return;
    }
    router.refresh();
    statusPopup.showSuccess("Event space deleted successfully.");
  };

  return (
    <>
      <motion.div
        className="h-full"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      >
      <Card className="h-full overflow-hidden transition-all hover:shadow-xl flex flex-col">
        {/* Image */}
        <div className="relative h-48 bg-linear-to-br from-sky-500/15 to-emerald-500/15">
          <VenueImageCarousel
            images={
              images.length
                ? images.map(
                    (image) =>
                      `data:image/jpeg;base64,${Buffer.from(image.data).toString("base64")}`,
                  )
                : eventSpace.image
                  ? [
                      `data:image/jpeg;base64,${Buffer.from(eventSpace.image).toString("base64")}`,
                    ]
                  : []
            }
            alt={name}
            className="h-full"
            showControls={false}
            showDots={false}
          />
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                status === "ACTIVE"
                  ? "bg-emerald-500 text-white"
                  : status === "UNDER_MAINTENANCE"
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {status === "ACTIVE"
                ? "Active"
                : status === "UNDER_MAINTENANCE"
                  ? "Maintenance"
                  : "Inactive"}
            </span>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-2">{name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>

            {/* Location & Capacity */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Capacity: {capacity} people</span>
              </div>
              {showAdminActions && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>Managed by super admin</span>
                </div>
              )}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  AMENITIES
                </p>
                <div className="flex flex-wrap gap-2">
                  {amenities.slice(0, 3).map((amenity) => (
                    <span
                      key={amenity.id}
                      className="px-2 py-1 bg-muted rounded-md text-xs flex items-center gap-1"
                    >
                      {amenityIcons[amenity.name] || (
                        <Building2 className="w-4 h-4" />
                      )}
                      {amenity.name}
                    </span>
                  ))}
                  {amenities.length > 3 && (
                    <span className="px-2 py-1 bg-muted rounded-md text-xs">
                      +{amenities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {showAdminActions ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setShowEditPopup(true)}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={handleDelete}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          ) : (
            <Link href={detailsHref || `/user/spaces/${id}`} className="block">
              <Button variant="outline" className="w-full cursor-pointer">
                View Details
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
      </motion.div>
      {showEditPopup && (
        <EditEventSpacePopup
          eventSpace={eventSpace}
          onClose={() => setShowEditPopup(false)}
        />
      )}
    </>
  );
}
