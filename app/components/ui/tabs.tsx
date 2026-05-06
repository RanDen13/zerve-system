"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

type TabsMotionContextValue = {
  activeValue?: string
  setActiveValue: (value: string) => void
  layoutId: string
}

const TabsMotionContext = React.createContext<TabsMotionContextValue | null>(
  null
)

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const generatedId = React.useId()
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | undefined
  >(defaultValue)
  const activeValue = value ?? uncontrolledValue

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      setUncontrolledValue(nextValue)
      onValueChange?.(nextValue)
    },
    [onValueChange]
  )

  return (
    <TabsMotionContext.Provider
      value={{
        activeValue,
        setActiveValue: handleValueChange,
        layoutId: `tabs-active-${generatedId}`,
      }}
    >
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsMotionContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground relative isolate inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const motionContext = React.useContext(TabsMotionContext)
  const isActive = motionContext?.activeValue === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring data-[state=active]:text-foreground text-muted-foreground relative isolate inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 overflow-visible rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      value={value}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={motionContext.layoutId}
          className="absolute inset-0 z-0 rounded-md bg-black/8 shadow-sm dark:bg-white/12"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
