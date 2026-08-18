import { TextClassContext } from './text';
import { cn } from '../lib/cn';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';

function Tabs({
  className,
  ...props
}: TabsPrimitive.RootProps & React.RefAttributes<TabsPrimitive.RootRef>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({
  className,
  ...props
}: TabsPrimitive.ListProps & React.RefAttributes<TabsPrimitive.ListRef>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex h-9 flex-row items-center justify-center rounded-md bg-app-border/40 p-[3px]',
        Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.TriggerProps & React.RefAttributes<TabsPrimitive.TriggerRef>) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium text-app-muted',
        value === props.value && 'text-app-text font-semibold'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex flex-row items-center justify-center gap-1.5 rounded border border-transparent px-2.5 py-1',
          Platform.select({
            web: 'inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] web:h-[calc(100%-1px)] focus-visible:outline-1 focus-visible:outline-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          props.value === value && 'bg-app-surface border-app-border shadow-xs',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.ContentProps & React.RefAttributes<TabsPrimitive.ContentRef>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
