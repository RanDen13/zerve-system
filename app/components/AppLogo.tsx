import { cn } from "@/lib/utils";
import Image from "next/image";

type AppLogoProps = {
  className?: string;
  variant?: "adaptive" | "dark" | "light";
  priority?: boolean;
};

export default function AppLogo({
  className,
  variant = "adaptive",
  priority = false,
}: AppLogoProps) {
  const logoClassName = cn("h-full w-full object-contain", className);

  if (variant === "light") {
    return (
      <Image
        src="/logo_light.png"
        alt="Zerve logo"
        width={1600}
        height={1600}
        priority={priority}
        className={logoClassName}
      />
    );
  }

  if (variant === "dark") {
    return (
      <Image
        src="/logo_dark.png"
        alt="Zerve logo"
        width={1600}
        height={1600}
        priority={priority}
        className={logoClassName}
      />
    );
  }

  return (
    <>
      <Image
        src="/logo_dark.png"
        alt="Zerve logo"
        width={1600}
        height={1600}
        priority={priority}
        className={cn(logoClassName, "dark:hidden")}
      />
      <Image
        src="/logo_light.png"
        alt=""
        aria-hidden
        width={1600}
        height={1600}
        priority={priority}
        className={cn(logoClassName, "hidden dark:block")}
      />
    </>
  );
}
