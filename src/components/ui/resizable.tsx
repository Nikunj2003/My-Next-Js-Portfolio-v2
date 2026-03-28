"use client";

import { GripVertical } from "lucide-react";
import {
  Group as ResizableGroup,
  Panel as ResizablePanel,
  Separator as ResizableSeparator,
  type GroupProps as ResizablePanelGroupProps,
  type SeparatorProps as ResizableHandleProps,
} from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: ResizablePanelGroupProps) => (
  <ResizableGroup className={cn("h-full w-full", className)} {...props} />
);

type ResizableHandlePropsWithHandle = ResizableHandleProps & {
  withHandle?: boolean;
};

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: ResizableHandlePropsWithHandle) => (
  <ResizableSeparator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 aria-[orientation=vertical]:h-px aria-[orientation=vertical]:w-full aria-[orientation=vertical]:after:left-0 aria-[orientation=vertical]:after:h-1 aria-[orientation=vertical]:after:w-full aria-[orientation=vertical]:after:-translate-y-1/2 aria-[orientation=vertical]:after:translate-x-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [&[aria-orientation=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizableSeparator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
