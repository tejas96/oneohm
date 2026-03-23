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
export { Input, inputVariants } from './input';
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

// FormFieldInput
export { FormFieldInput } from './form-field';
export type { FormFieldInputProps } from './form-field';

// Label
export { Label, labelVariants } from './label';
export type { LabelProps } from './label';

// Popover
export { Popover, PopoverTrigger, PopoverContent } from './popover';

// Calendar
export { Calendar } from './calendar';
export type { CalendarProps } from './calendar';

// DatePicker
export { DatePicker } from './date-picker';
export type { DatePickerProps } from './date-picker';

// DateRangePicker
export { DateRangePicker } from './date-range-picker';
export type { DateRangePickerProps } from './date-range-picker';

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
export { Switch, switchVariants } from './switch';
export type { SwitchProps } from './switch';

// MUI Switch
export { MUISwitch } from './mui-switch';
export type { MUISwitchProps } from './mui-switch';

// MUI Date Picker
export { MUIDatePicker } from './mui-date-picker';
export type { MUIDatePickerProps } from './mui-date-picker';

// MUI Shared (labels, ref utils)
export { MUIFieldLabel, mergeRefs } from './mui-shared';
export type { MUIFieldLabelProps } from './mui-shared';

// MUI User Assignee Selector
export { MUIUserAssigneeSelector } from './mui-user-assignee-selector';
export type { MUIUserAssigneeSelectorProps } from './mui-user-assignee-selector';

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
export {
  Progress,
  progressVariants,
  indicatorVariants,
  ProgressWithLabel,
  CircularProgress,
  SegmentedProgress,
} from './progress';
export type {
  ProgressProps,
  ProgressWithLabelProps,
  CircularProgressProps,
  SegmentedProgressProps,
} from './progress';

// Spinner
export { Spinner, spinnerVariants, LoadingDots, loadingDotsVariants } from './spinner';
export type { SpinnerProps, LoadingDotsProps } from './spinner';

// Typography
export { Typography } from './typography';
export type { TypographyProps } from './typography';

// WhatsApp Icon
export { WhatsAppIcon } from './whatsapp-icon';
