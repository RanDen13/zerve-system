import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type DefaultLoadingProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  message?: string;
};

const sizeMap = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const DefaultLoading = ({
  size = "xl",
  color = "text-primary",
  className = "",
  message,
}: DefaultLoadingProps) => {
  return (
    <div
      className={`${className} flex flex-col items-center justify-center h-full space-y-4`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className={`${sizeMap[size]} ${color}`} />
      </motion.div>
      <p className="text-muted-foreground font-medium">
        {message || "Loading..."}
      </p>
    </div>
  );
};

export default DefaultLoading;
