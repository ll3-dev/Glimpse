import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../lib/cn";
import { useSemanticColor } from "../theme/semantic-colors";

function Input({
  className,
  placeholderTextColorClassName,
  ...props
}: TextInputProps & {
  placeholderTextColorClassName?: string;
  ref?: React.RefObject<TextInput>;
}) {
  const placeholderColor = useSemanticColor("appSubtle");

  return (
    <TextInput
      className={cn(
        "web:flex h-11 native:h-12 web:w-full rounded-lg border border-app-border bg-app-surface px-3.5 web:py-2.5 text-sm native:text-base text-app-text web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-app-primary/20 web:focus-visible:border-app-primary",
        props.editable === false && "opacity-50 web:cursor-not-allowed",
        className
      )}
      placeholderTextColor={props.placeholderTextColor || placeholderColor}
      {...props}
    />
  );
}

export { Input };
