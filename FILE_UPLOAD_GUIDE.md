# File Upload Feature Guide

## Overview

The booking system now supports file uploads for requirements documents. Users can attach PDF, DOCX, or image files to their booking requests.

## Features

### Supported File Types

- **PDF**: `.pdf` files
- **DOCX**: Microsoft Word documents (`.docx`)
- **Images**: JPEG, PNG, GIF, WEBP formats

### File Size Limit

- Maximum file size: **5MB**

### Validation

The system performs comprehensive validation:

1. **File size check**: Ensures files don't exceed 5MB
2. **File type check**: Only allows PDF, DOCX, and image files
3. **MIME type validation**: Validates actual file content, not just extension

## Implementation Details

### Database Schema

The `Booking` model includes two optional fields:

```prisma
model Booking {
  // ... other fields
  requirementsData     Bytes?
  requirementsDataType FileType?
}
```

`FileType` enum:

```prisma
enum FileType {
  PDF
  DOCX
  IMAGE
}
```

### Frontend Components

#### 1. EventSpacePage (Booking Form)

- Located: `app/components/pages/Spaces/EventSpacePage.tsx`
- Features:
  - File input with drag-and-drop styling
  - Visual feedback for selected files
  - File removal option
  - File size and type display

#### 2. FileDisplay Component

- Located: `app/components/pages/Booking/FileDisplay.tsx`
- Purpose: Display and download uploaded files
- Features:
  - Shows file icon based on type
  - Displays file name and type
  - Download button to retrieve the file

### Backend Processing

#### File Validation (`lib/utils.ts`)

```typescript
validateFile(file: File) => {
  valid: boolean;
  error?: string;
  fileType?: FileType;
}
```

Checks:

- File size ≤ 5MB
- File MIME type matches allowed types

#### File Conversion

Files are converted to Base64 for transmission:

- `fileToBase64()`: Converts File to Base64 string
- `base64ToBuffer()`: Converts Base64 back to Buffer for storage

#### Booking Creation (`BookingActions.ts`)

The `createBooking` function:

1. Validates booking data
2. If a file is present:
   - Converts Base64 to Buffer
   - Stores in database with file type
3. Creates booking record

## Usage

### For Users (Creating a Booking)

1. Navigate to a space detail page
2. Fill in booking details (date, time, attendees, purpose)
3. **Optional**: Click "Click to upload" or drag a file
4. Select a PDF, DOCX, or image file (max 5MB)
5. Review the file details displayed
6. Submit the booking

To remove a file before submission, click the X button.

### For Developers (Accessing Uploaded Files)

**Retrieve booking with file:**

```typescript
const booking = await prisma.booking.findUnique({
  where: { id: bookingId },
  select: {
    requirementsData: true,
    requirementsDataType: true,
    // ... other fields
  },
});

if (booking.requirementsData && booking.requirementsDataType) {
  // File is attached
  const buffer = booking.requirementsData;
  const fileType = booking.requirementsDataType; // "PDF" | "DOCX" | "IMAGE"
}
```

**Display file in UI:**

```tsx
import FileDisplay from "@/app/components/pages/Booking/FileDisplay";

{
  booking.requirementsData && booking.requirementsDataType && (
    <FileDisplay
      fileName="requirements.pdf"
      fileData={booking.requirementsData}
      fileType={booking.requirementsDataType}
    />
  );
}
```

## Security Considerations

1. **File Size Limit**: Prevents large file uploads that could cause storage/memory issues
2. **MIME Type Validation**: Checks actual file content, not just extension
3. **Binary Storage**: Files stored as `Bytes` in database (secure, no file system exposure)
4. **Server-side Validation**: Backend validates all file data before storage

## Error Handling

### User-facing Errors

- "File size must be less than 5MB"
- "Only PDF, DOCX, and image files (JPEG, PNG, GIF, WEBP) are allowed"
- "Failed to process file"

### Developer Tips

- Always check if file fields exist before accessing
- Handle Buffer conversion carefully
- Validate MIME types on both client and server

## Future Enhancements

Potential improvements:

- [ ] Multiple file uploads
- [ ] File preview before submission
- [ ] Compress images automatically
- [ ] Virus scanning integration
- [ ] Cloud storage integration (S3, Azure Blob)
- [ ] File versioning
- [ ] Admin file management interface

## Testing

### Test Cases

1. Upload a valid PDF file
2. Upload a valid DOCX file
3. Upload a valid image (JPEG, PNG)
4. Try uploading a file > 5MB (should fail)
5. Try uploading an invalid file type (should fail)
6. Submit booking without a file (should work - optional)
7. Remove a selected file before submission
8. Download an uploaded file from booking details

## Troubleshooting

### File not uploading

- Check file size (max 5MB)
- Verify file type is supported
- Check browser console for errors

### File not displaying after upload

- Ensure `requirementsData` and `requirementsDataType` are in query
- Verify Buffer conversion is working
- Check FileDisplay component props

### Download not working

- Verify Blob creation
- Check MIME type mapping
- Ensure browser allows downloads

## Related Files

- `prisma/schema.prisma` - Database schema
- `lib/utils.ts` - File validation and conversion utilities
- `app/components/pages/Booking/schema.ts` - Zod validation schema
- `app/components/pages/Booking/BookingActions.ts` - Server actions
- `app/components/pages/Spaces/EventSpacePage.tsx` - Booking form
- `app/components/pages/Booking/FileDisplay.tsx` - File display component
