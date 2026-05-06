import { Building2, Coffee, Monitor, Presentation, Wifi } from "lucide-react";

export const amenityIcons: { [key: string]: React.ReactNode } = {
  WiFi: <Wifi className="w-4 h-4" />,
  Projector: <Presentation className="w-4 h-4" />,
  "TV Display": <Monitor className="w-4 h-4" />,
  "Coffee Machine": <Coffee className="w-4 h-4" />,
  Whiteboard: <Presentation className="w-4 h-4" />,
  "Video Conferencing": <Monitor className="w-4 h-4" />,
  "Sound System": <Monitor className="w-4 h-4" />,
  Stage: <Building2 className="w-4 h-4" />,
  "Air Conditioning": <Building2 className="w-4 h-4" />,
  Computers: <Monitor className="w-4 h-4" />,
  Sofas: <Building2 className="w-4 h-4" />,
  TV: <Monitor className="w-4 h-4" />,
  Podium: <Building2 className="w-4 h-4" />,
};
