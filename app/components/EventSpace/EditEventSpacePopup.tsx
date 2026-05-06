"use client";

import {
  getAllAmenities,
  updateEventSpace,
} from "@/app/components/pages/Spaces/EventSpaceActions";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Amenity,
  EventSpace,
  EventSpaceImage,
} from "@/generated/prisma/browser";
import { Building2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ModalBase from "../Popup/ModalBase";
import { usePopup } from "../Popup/PopupProvider";
import { amenityIcons } from "./AmenityIcon";

const EditEventSpacePopup = ({
  eventSpace,
  onClose,
}: {
  eventSpace: EventSpace & {
    amenities?: Amenity[];
    images?: EventSpaceImage[];
  };
  onClose: () => void;
}) => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    eventSpace.amenities?.map((a) => a.id) || [],
  );
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagesUpdated, setImagesUpdated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const statusPopup = usePopup();
  const router = useRouter();

  useEffect(() => {
    const fetchAmenities = async () => {
      const result = await getAllAmenities();
      if (result.success && result.data) {
        setAmenities(result.data);
      }
    };
    fetchAmenities();
  }, []);

  const handleImageChange = (files: FileList | File[]) => {
    const nextFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (nextFiles.length === 0) return;

    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    const previews = nextFiles.map((file) => URL.createObjectURL(file));
    setImageFiles(nextFiles);
    setImagePreviews(previews);
    setImagesUpdated(true);
  };

  const removeImageAt = (index: number) => {
    setImageFiles((current) => current.filter((_, idx) => idx !== index));
    setImagePreviews((current) => {
      const preview = current[index];
      if (preview) URL.revokeObjectURL(preview);
      return current.filter((_, idx) => idx !== index);
    });
    setImagesUpdated(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleImageChange(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (imagesUpdated && imageFiles.length > 0) {
      imageFiles.forEach((file) => formData.append("images", file));
    }

    console.log("data:", Object.fromEntries(formData.entries()));

    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to update the event space "${eventSpace.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    statusPopup.showLoading("Updating event space...");
    setIsSubmitting(true);

    try {
      const result = await updateEventSpace(formData);

      if (!result.success) {
        statusPopup.showError(
          result.message || "Failed to update event space.",
        );
        return;
      }

      statusPopup.showSuccess("Event space updated successfully.");
      router.refresh();
      onClose();
    } catch {
      statusPopup.showError(
        "An error occurred while updating the event space.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalBase onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
              Edit Event Space
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6">
            <input type="hidden" name="id" value={eventSpace.id} readOnly />
            <div className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Space Images</Label>
                <div
                  className={`relative border-2 border-dashed rounded-lg transition-colors ${
                    isDragging
                      ? "border-sky-500/60 bg-sky-500/10"
                      : "border-border hover:border-foreground/20"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {(() => {
                    const existingImages = eventSpace.images?.length
                      ? eventSpace.images.map(
                          (image) =>
                            `data:image/jpeg;base64,${Buffer.from(image.data).toString("base64")}`,
                        )
                      : eventSpace.image
                        ? [
                            `data:image/jpeg;base64,${Buffer.from(eventSpace.image).toString("base64")}`,
                          ]
                        : [];
                    const displayImages = imagePreviews.length
                      ? imagePreviews
                      : existingImages;

                    if (displayImages.length === 0) {
                      return (
                        <label className="flex flex-col items-center justify-center h-48 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files)
                                handleImageChange(e.target.files);
                            }}
                          />
                          <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                          <p className="text-sm font-semibold text-foreground">
                            Click or drag to upload
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF, WebP, SVG up to 10MB each (max 8)
                          </p>
                        </label>
                      );
                    }

                    return (
                      <div className="space-y-3 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {displayImages.length} image
                              {displayImages.length === 1 ? "" : "s"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Uploading new images will replace this gallery.
                            </p>
                          </div>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files)
                                  handleImageChange(e.target.files);
                              }}
                            />
                            <div className="bg-card text-foreground rounded-lg px-3 py-1.5 flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                Replace Images
                              </span>
                            </div>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {displayImages.map((preview, index) => (
                            <div
                              key={`${preview}-${index}`}
                              className="group relative h-24 overflow-hidden rounded-md border"
                            >
                              <Image
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              {imagePreviews.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => removeImageAt(index)}
                                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Space Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Conference Room A"
                  defaultValue={eventSpace.name}
                  required
                  minLength={3}
                  maxLength={100}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={eventSpace.location}
                  placeholder="e.g., Building A, 2nd Floor"
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity">
                  Capacity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  name="capacity"
                  defaultValue={eventSpace.capacity}
                  placeholder="e.g., 20"
                  required
                  min={1}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={eventSpace.description || ""}
                  placeholder="Brief description of the event space"
                  onChange={(e) => {
                    setDescriptionLength(e.target.value.length);
                  }}
                  required
                  maxLength={500}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {descriptionLength}/500 characters
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select name="status" defaultValue={eventSpace.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="z-10000">
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">
                      Under Maintenance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="border border-border bg-muted/20 rounded-lg p-4 max-h-48 overflow-y-auto space-y-3">
                  <input
                    type="hidden"
                    name="amenities"
                    value={JSON.stringify(selectedAmenities)}
                    readOnly
                  />
                  {amenities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No amenities available
                    </p>
                  ) : (
                    amenities.map((amenity) => (
                      <div
                        key={amenity.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`amenity-${amenity.id}`}
                          checked={selectedAmenities.includes(amenity.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAmenities([
                                ...selectedAmenities,
                                amenity.id,
                              ]);
                            } else {
                              setSelectedAmenities(
                                selectedAmenities.filter(
                                  (id) => id !== amenity.id,
                                ),
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`amenity-${amenity.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {amenityIcons[amenity.name] || (
                            <Building2 className="w-4 h-4" />
                          )}{" "}
                          {amenity.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedAmenities.length} amenity(ies) selected
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/40">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
            >
              {isSubmitting ? "Updating..." : "Update Space"}
            </Button>
          </div>
        </div>
      </form>
    </ModalBase>
  );
};

export default EditEventSpacePopup;
