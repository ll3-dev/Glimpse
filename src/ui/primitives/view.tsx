import { cn } from "@/src/lib/utils";
import { ComponentProps, PropsWithChildren } from "react";
import { View as OriginView } from "react-native";

interface ViewProps
  extends PropsWithChildren<ComponentProps<typeof OriginView>> {
  vertical?: boolean;
}

export function View({ children, className, vertical, ...props }: ViewProps) {
  return (
    <OriginView
      {...props}
      className={cn(className, vertical ? "flex-col" : "flex-row")}
    >
      {children}
    </OriginView>
  );
}
