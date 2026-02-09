// Barrel export for all shadcn/ui components

// Avatar
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarStatus,
  AvatarGroup,
} from './avatar';
export type { AvatarProps, AvatarFallbackProps, AvatarStatusProps, AvatarGroupProps } from './avatar';

// Badge
export { Badge, badgeVariants, DotBadge, CountBadge } from './badge';
export type { BadgeProps, DotBadgeProps, CountBadgeProps } from './badge';

// Button
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatsCard,
  cardVariants,
} from './card';
export type { CardProps, StatsCardProps, CardPropsType } from './card';

// Checkbox
export { Checkbox, checkboxVariants } from './checkbox';
export type { CheckboxProps } from './checkbox';

// Command
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command';

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
  ConfirmDialog,
  dialogContentVariants,
} from './dialog';
export type { DialogContentProps, ConfirmDialogProps } from './dialog';

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';

// Form
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './form';

// Input
export { Input, inputVariants, InputWrapper, InputIcon } from './input';
export type { InputProps, InputWrapperProps, InputIconProps } from './input';

// Label
export { Label, labelVariants } from './label';
export type { LabelProps } from './label';

// Popover
export { Popover, PopoverTrigger, PopoverContent } from './popover';

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';
export type { SelectTriggerProps } from './select';

// Radio Group
export { RadioGroup, RadioGroupItem, radioItemVariants } from './radio-group';
export type { RadioGroupItemProps } from './radio-group';

// Separator
export { Separator } from './separator';

// Sheet
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet';

// Skeleton
export { Skeleton } from './skeleton';

// Switch
export { Switch } from './switch';
export type { SwitchProps } from './switch';

// Sonner (Toasts)
export { Toaster } from './sonner';

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableVariants,
} from './table';
export type { TableProps, TableHeadProps } from './table';

// Tabs
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  VerticalTabsList,
  VerticalTabsTrigger,
  VerticalTabsContent,
  tabsListVariants,
  tabsTriggerVariants,
} from './tabs';
export type { TabsListProps, TabsTriggerProps } from './tabs';

// Textarea
export { Textarea, textareaVariants } from './textarea';
export type { TextareaProps } from './textarea';

// Tooltip
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  RichTooltipContent,
  HelpTooltip,
  tooltipContentVariants,
} from './tooltip';
export type { TooltipContentProps, HelpTooltipProps } from './tooltip';
