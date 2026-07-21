// Barrel export for all shadcn/ui components

// Avatar
export { Avatar, AvatarImage, AvatarFallback, AvatarStatus, AvatarGroup } from './avatar';
export type {
  AvatarProps,
  AvatarFallbackProps,
  AvatarStatusProps,
  AvatarGroupProps,
} from './avatar';

// Badge
export { Badge, DotBadge, CountBadge } from './badge';
export type { BadgeProps, DotBadgeProps, CountBadgeProps } from './badge';

// Button
export { Button } from './button';
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
} from './card';
export type { CardProps, StatsCardProps, CardPropsType } from './card';

// Checkbox
export { Checkbox } from './checkbox';
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
} from './dialog';
export type { DialogContentProps, ConfirmDialogProps } from './dialog';

// MUI Breadcrumb
export { MUIBreadcrumb } from './mui-breadcrumb';
export type { MUIBreadcrumbProps, MUIBreadcrumbItem } from './mui-breadcrumb';

// MUI Dialog
export {
  MUIDialog,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogDescription,
  MUIDialogBody,
  MUIDialogFooter,
} from './mui-dialog';
export type { MUIDialogProps } from './mui-dialog';

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

// Input
export { Input } from './input';
export type { InputProps } from './input';

// MUI Input
export { MUIInput } from './mui-input';
export type { MUIInputProps } from './mui-input';

// MUI Select
export { MUISelect } from './mui-select';
export type { MUISelectProps, MUISelectOption } from './mui-select';

// PasswordInput
export { PasswordInput } from './password-input';
export type { PasswordInputProps } from './password-input';

// OtpInput
export { OtpInput } from './otp-input';
export type { OtpInputProps } from './otp-input';

// Label
export { Label } from './label';
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

// MUI Switch
export { MUISwitch } from './mui-switch';
export type { MUISwitchProps } from './mui-switch';

// MUI Date Picker
export { MUIDatePicker } from './mui-date-picker';
export type { MUIDatePickerProps } from './mui-date-picker';
export { MUIDateRangePicker } from './mui-date-range-picker';
export type { MUIDateRangePickerProps } from './mui-date-range-picker';

// MUI Shared (labels, ref utils)
export { MUIFieldLabel, mergeRefs } from './mui-shared';
export type { MUIFieldLabelProps } from './mui-shared';

// MUI User Assignee Selector
export { MUIUserAssigneeSelector, MUIAvatarGroup } from './mui-user-assignee-selector';
export type {
  MUIUserAssigneeSelectorProps,
  AssigneeOption,
  MUIAvatarGroupProps,
  MUIAvatarGroupMember,
} from './mui-user-assignee-selector';

// MUI Avatar
export { MUIAvatar } from './mui-avatar';
export type { MUIAvatarProps } from './mui-avatar';

// MUI Typography
export { MUITypography } from './mui-typography';
export type { MUITypographyProps, MUITypographyVariant } from './mui-typography';

// MUI Status Chip
export { MUIStatusChip } from './mui-status-chip';
export type { MUIStatusChipProps, StatusChipColor, StatusChipVariant } from './mui-status-chip';

// System Size Display
export { SystemSizeDisplay } from './system-size-display';
export type {
  SystemSizeDisplayLayout,
  SystemSizeDisplayProps,
  SystemSizeDisplaySize,
} from './system-size-display';

// Sonner (Toasts)
export { Toaster, showToast } from './sonner';

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
} from './tabs';
export type { TabsListProps, TabsTriggerProps } from './tabs';

// Textarea
export { Textarea } from './textarea';
export type { TextareaProps } from './textarea';

// Tooltip
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  RichTooltipContent,
  HelpTooltip,
} from './tooltip';
export type { TooltipContentProps, HelpTooltipProps } from './tooltip';

// Accordion
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export type { AccordionItemProps, AccordionTriggerProps } from './accordion';

// Breadcrumb
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  BreadcrumbHome,
} from './breadcrumb';
export type {
  BreadcrumbListProps,
  BreadcrumbLinkProps,
  BreadcrumbSeparatorProps,
} from './breadcrumb';

// Progress
export { Progress, ProgressWithLabel, CircularProgress, SegmentedProgress } from './progress';
export type {
  ProgressProps,
  ProgressWithLabelProps,
  CircularProgressProps,
  SegmentedProgressProps,
} from './progress';

// Spinner
export { Spinner, LoadingDots } from './spinner';
export type { SpinnerProps, LoadingDotsProps } from './spinner';

// ZigzagLoader
export { ZigzagLoader } from './zigzag-loader';

// Typography
export { Typography } from './typography';
export type { TypographyProps } from './typography';

// WhatsApp Icon
export { WhatsAppIcon } from './whatsapp-icon';
