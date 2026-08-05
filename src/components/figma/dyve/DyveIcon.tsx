import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  Camera,
  Calendar,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Clock3,
  CreditCard,
  EyeOff,
  FileBadge2,
  FileText,
  Flame,
  Gift,
  Globe,
  Grid3X3,
  Handshake,
  Heart,
  Home,
  ImagePlus,
  Info,
  Instagram,
  LayoutGrid,
  Landmark,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Mic2,
  MonitorSpeaker,
  Music,
  DoorOpen,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Share,
  Shield,
  ShieldAlert,
  ShieldOff,
  Sparkles,
  Star,
  Target,
  Ticket,
  Timer,
  TrendingUp,
  Upload,
  User,
  UserCircle2,
  Users,
  Volume2,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  X,
  XCircle,
  Plus,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { cn } from "../ui/utils";

// Central icon layer so lucide icons can be swapped for a DYVE SVG set later without touching screen components.
type DyveIconSize = "sm" | "md" | "lg";
type DyveIconTone = "default" | "muted" | "primary" | "inverse";
type DyveIconButtonVariant = "ghost" | "surface" | "overlay";
type SvgIconComponent = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: string | number }>;
export type DyveIconName =
  | "alert-circle"
  | "alert-triangle"
  | "arrow-left"
  | "arrow-up-right"
  | "badge-check"
  | "badge-check-detail"
  | "bar-chart-3"
  | "bell"
  | "bell-unread"
  | "building-2"
  | "camera"
  | "calendar"
  | "calendar-booked"
  | "calendar-check"
  | "calendar-days"
  | "calendar-days-range"
  | "calendar-days-series"
  | "calendar-full"
  | "chevron-left"
  | "chevron-right"
  | "check"
  | "check-circle-2"
  | "clipboard-list"
  | "clock"
  | "clock-3"
  | "credit-card"
  | "credit-card-alt"
  | "eye-off"
  | "file-badge-2"
  | "file-text"
  | "flame"
  | "gift"
  | "globe"
  | "grid-3x3"
  | "handshake"
  | "heart"
  | "heart-filled"
  | "home"
  | "image-plus"
  | "info"
  | "instagram"
  | "layout-grid"
  | "landmark"
  | "lock"
  | "map-pin"
  | "map-pin-verified"
  | "message-circle"
  | "message-circle-notification"
  | "message-square"
  | "message-square-support"
  | "mic-2"
  | "mic-2-live"
  | "monitor-speaker"
  | "music"
  | "door-open"
  | "plus"
  | "qr-code"
  | "receipt"
  | "refresh-cw"
  | "search"
  | "settings"
  | "share"
  | "shield"
  | "shield-alert"
  | "shield-off"
  | "sparkles"
  | "star"
  | "star-favorite"
  | "star-featured"
  | "target"
  | "ticket"
  | "ticket-checked"
  | "ticket-issued"
  | "ticket-perforated"
  | "ticket-priority"
  | "timer"
  | "trending-up"
  | "upload"
  | "user"
  | "user-admin"
  | "user-circle-2"
  | "users"
  | "users-compact"
  | "volume-2"
  | "wallet"
  | "wallet-chargeback"
  | "wallet-failure"
  | "wallet-payout"
  | "wallet-refund"
  | "wifi"
  | "wine"
  | "wrench"
  | "x"
  | "x-circle";

const iconSizeClassMap: Record<DyveIconSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const iconStrokeWidthMap: Record<DyveIconSize, number> = {
  sm: 1.85,
  md: 1.9,
  lg: 2,
};

const iconToneClassMap: Record<DyveIconTone, string> = {
  default: "text-[var(--color-ink)]",
  muted: "text-[var(--color-muted)]",
  primary: "text-[var(--color-primary)]",
  inverse: "text-white",
};

const buttonVariantClassMap: Record<DyveIconButtonVariant, string> = {
  ghost: "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]",
  surface: "border border-[var(--color-hairline)] bg-[var(--color-canvas)]/80 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]",
  /* 이미지 위 오버레이 버튼 — 반투명 스크림 배경, 아이콘은 항상 흰색 */
  overlay:
    "border border-white/18 bg-black/34 text-white shadow-[0_10px_24px_rgba(35,35,35,0.22)] backdrop-blur-md hover:border-white/28 hover:bg-black/50",
};

function DyveSearchIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="5.75" />
      <path d="M15.5 15.5 19 19" />
      <path d="M10.9 8.25a2.9 2.9 0 0 0-2.65 2.65" opacity="0.55" />
    </svg>
  );
}

function DyveBellIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.5 17.25h7" />
      <path d="M9.35 18.1a2.65 2.65 0 0 0 5.3 0" />
      <path d="M6.75 16.85c1.1-1.05 1.55-2.4 1.55-4.8 0-2.45 1.65-4.45 3.7-4.45s3.7 2 3.7 4.45c0 2.4.45 3.75 1.55 4.8" />
      <path d="M10.55 6.55a2.1 2.1 0 0 1 2.9 0" opacity="0.55" />
    </svg>
  );
}

function DyveBellUnreadIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.5 17.25h7" />
      <path d="M9.35 18.1a2.65 2.65 0 0 0 5.3 0" />
      <path d="M6.75 16.85c1.1-1.05 1.55-2.4 1.55-4.8 0-2.45 1.65-4.45 3.7-4.45s3.7 2 3.7 4.45c0 2.4.45 3.75 1.55 4.8" />
      <circle cx="17.95" cy="6.45" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveMessageCircleIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5.5c-4.35 0-7.5 2.62-7.5 6.25 0 2.2 1.15 4.08 3.15 5.22v2.03l2.65-1.6c.55.1 1.12.15 1.7.15 4.35 0 7.5-2.62 7.5-6.25S16.35 5.5 12 5.5Z" />
      <path d="M9.15 11.55h5.7" />
      <path d="M9.15 14.15h3.55" opacity="0.7" />
    </svg>
  );
}

function DyveMessageCircleNotificationIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11.5 5.5c-4.2 0-7.25 2.58-7.25 6.1 0 2.12 1.12 3.93 3.05 5.03v1.97l2.52-1.52c.53.1 1.08.15 1.68.15 4.2 0 7.25-2.58 7.25-6.1S15.7 5.5 11.5 5.5Z" />
      <path d="M8.8 11.45h5.45" />
      <path d="M8.8 13.9h3.35" opacity="0.72" />
      <circle cx="17.7" cy="7.35" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveMic2Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13.15 13.95a3.45 3.45 0 0 0 2.4-.98l1.5-1.5a3.4 3.4 0 1 0-4.8-4.8l-1.48 1.48a3.4 3.4 0 0 0 2.38 5.8Z" />
      <path d="m9.3 12.9-3.55 3.55" />
      <path d="m5.45 18.55 2.25-2.25" />
      <path d="M13.05 8.25h.01" />
      <path d="M16.2 13.85 18.55 16.2" opacity="0.65" />
    </svg>
  );
}

function DyveMic2LiveIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13.15 13.95a3.45 3.45 0 0 0 2.4-.98l1.5-1.5a3.4 3.4 0 1 0-4.8-4.8l-1.48 1.48a3.4 3.4 0 0 0 2.38 5.8Z" />
      <path d="m9.3 12.9-3.55 3.55" />
      <path d="m5.45 18.55 2.25-2.25" />
      <path d="M13.05 8.25h.01" />
      <path d="M18.35 9.55a2.2 2.2 0 0 1 0 3.1" />
    </svg>
  );
}

function DyveMapPinIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20c3.95-4.45 5.92-7.62 5.92-10.1A5.92 5.92 0 1 0 6.08 9.9C6.08 12.38 8.05 15.55 12 20Z" />
      <circle cx="12" cy="9.85" r="2.1" />
    </svg>
  );
}

function DyveMapPinVerifiedIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20c3.95-4.45 5.92-7.62 5.92-10.1A5.92 5.92 0 1 0 6.08 9.9C6.08 12.38 8.05 15.55 12 20Z" />
      <circle cx="12" cy="9.85" r="2.1" />
      <path d="m15.6 16.2 1.15 1.15 2.4-2.45" />
    </svg>
  );
}

function DyveHomeIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.75 10.2 12 5.25l6.25 4.95" />
      <path d="M7.4 9.85v8.4h9.2v-8.4" />
      <path d="M10.2 18.25v-4.35h3.6v4.35" />
    </svg>
  );
}

function DyveTicketIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.2 7.1h11.6a1.2 1.2 0 0 1 1.2 1.2v2.1a1.9 1.9 0 0 0 0 3.8v2.1a1.2 1.2 0 0 1-1.2 1.2H6.2A1.2 1.2 0 0 1 5 16.3v-2.1a1.9 1.9 0 0 0 0-3.8V8.3a1.2 1.2 0 0 1 1.2-1.2Z" />
      <path d="M10.05 9.15v1.35" />
      <path d="M10.05 13.5v1.35" />
    </svg>
  );
}

function DyveTicketIssuedIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.2 8.1h11.6a1.65 1.65 0 0 1 1.65 1.65v1.05a1.95 1.95 0 0 0 0 3.9v1.05a1.65 1.65 0 0 1-1.65 1.65H6.2a1.65 1.65 0 0 1-1.65-1.65V14.7a1.95 1.95 0 0 0 0-3.9V9.75A1.65 1.65 0 0 1 6.2 8.1Z" />
      <path d="M12 8.75v8.5" opacity="0.55" />
      <path d="m9.65 12.95 1.45 1.45 3-3.1" />
    </svg>
  );
}

function DyveTicketCheckedIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.2 8.1h11.6a1.65 1.65 0 0 1 1.65 1.65v1.05a1.95 1.95 0 0 0 0 3.9v1.05a1.65 1.65 0 0 1-1.65 1.65H6.2a1.65 1.65 0 0 1-1.65-1.65V14.7a1.95 1.95 0 0 0 0-3.9V9.75A1.65 1.65 0 0 1 6.2 8.1Z" />
      <path d="M12 8.75v8.5" opacity="0.45" />
      <circle cx="16.95" cy="8.2" r="2.2" fill="currentColor" stroke="none" />
      <path d="m15.95 8.2.65.65 1.35-1.4" stroke="#FFF3F3" strokeWidth="1.4" />
    </svg>
  );
}

function DyveTicketPerforatedIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.2 7.1h11.6a1.2 1.2 0 0 1 1.2 1.2v2.1a1.9 1.9 0 0 0 0 3.8v2.1a1.2 1.2 0 0 1-1.2 1.2H6.2A1.2 1.2 0 0 1 5 16.3v-2.1a1.9 1.9 0 0 0 0-3.8V8.3a1.2 1.2 0 0 1 1.2-1.2Z" />
      <path d="M10.1 9.1v1.05" />
      <path d="M10.1 11.65v1.05" />
      <path d="M10.1 14.2v1.05" />
    </svg>
  );
}

function DyveTicketPriorityIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.2 8.1h11.6a1.65 1.65 0 0 1 1.65 1.65v1.05a1.95 1.95 0 0 0 0 3.9v1.05a1.65 1.65 0 0 1-1.65 1.65H6.2a1.65 1.65 0 0 1-1.65-1.65V14.7a1.95 1.95 0 0 0 0-3.9V9.75A1.65 1.65 0 0 1 6.2 8.1Z" />
      <path d="M12 8.75v8.5" opacity="0.45" />
      <path d="m9.2 14.45 4.95-4.95" />
      <path d="M11.2 9.5h2.95v2.95" />
    </svg>
  );
}

function DyveFlameIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.1 20c3.45 0 5.9-2.22 5.9-5.65 0-3.8-2.48-5.62-4.27-7.15-.67-.58-1.05-1.6-.95-2.7-2.62 1.2-4.73 3.9-4.73 6.55 0 1.27-.45 2.18-1.25 3.05A4.97 4.97 0 0 0 6 17.1C6 18.92 8.35 20 12.1 20Z" />
      <path d="M12 18.1c1.62 0 2.7-.96 2.7-2.42 0-1.37-.88-2.25-1.83-3.08-.28.97-.87 1.66-1.73 2.37-.78.63-1.14 1.24-1.14 1.98 0 1.04.87 1.15 2 1.15Z" />
    </svg>
  );
}

function DyveUsersIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.4 12.2a2.55 2.55 0 1 0 0-5.1 2.55 2.55 0 0 0 0 5.1Z" />
      <path d="M15.9 11.45a2.15 2.15 0 1 0 0-4.3 2.15 2.15 0 0 0 0 4.3Z" />
      <path d="M4.95 17.8c.48-2.08 2.12-3.2 4.1-3.2 2 0 3.62 1.12 4.1 3.2" />
      <path d="M13.85 17.4c.34-1.45 1.46-2.3 2.96-2.3 1.1 0 1.96.34 2.74 1.2" />
    </svg>
  );
}

function DyveUsersCompactIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 11.9a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7Z" />
      <path d="M15.8 11.2a1.95 1.95 0 1 0 0-3.9 1.95 1.95 0 0 0 0 3.9Z" />
      <path d="M5.4 17.15c.45-1.8 1.88-2.78 3.6-2.78 1.73 0 3.15.98 3.6 2.78" />
      <path d="M13.55 16.8c.28-1.22 1.25-1.93 2.52-1.93.95 0 1.7.3 2.38 1.02" />
    </svg>
  );
}

function DyveUserIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 12.45a3.15 3.15 0 1 0 0-6.3 3.15 3.15 0 0 0 0 6.3Z" />
      <path d="M6.3 18.15c.6-2.38 2.55-3.65 5.7-3.65s5.1 1.27 5.7 3.65" />
    </svg>
  );
}

function DyveUserAdminIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11.45 12.2a2.95 2.95 0 1 0 0-5.9 2.95 2.95 0 0 0 0 5.9Z" />
      <path d="M6.2 18.05c.55-2.15 2.3-3.32 5.25-3.32 1.65 0 2.95.36 3.95 1.05" />
      <path d="m16.25 12.35 1 .6 1-.6v1.15l1 .58-.38 1.13.72.9-.9.8.18 1.18-1.17.2-.45 1.1-1.1-.45-1.02.62-.8-.9-1.18.18-.2-1.17-1.1-.45.45-1.1-.62-1.02.9-.8-.18-1.18 1.17-.2.45-1.1 1.1.45 1.02-.62.8.9Z" />
    </svg>
  );
}

function DyveArrowLeftIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18.1 12H6.5" />
      <path d="m10.35 7.75-4.25 4.25 4.25 4.25" />
    </svg>
  );
}

function DyveChevronRightIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9.35 6.95 5.35 5.05-5.35 5.05" />
    </svg>
  );
}

function DyvePlusIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 6.2v11.6" />
      <path d="M6.2 12h11.6" />
    </svg>
  );
}

function DyveXIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m7.35 7.35 9.3 9.3" />
      <path d="m16.65 7.35-9.3 9.3" />
    </svg>
  );
}

function DyveChevronLeftIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m14.65 6.95-5.35 5.05 5.35 5.05" />
    </svg>
  );
}

function DyveCalendarDaysIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.45 8.1h11.1a1.35 1.35 0 0 1 1.35 1.35v7.95a1.35 1.35 0 0 1-1.35 1.35H6.45A1.35 1.35 0 0 1 5.1 17.4V9.45A1.35 1.35 0 0 1 6.45 8.1Z" />
      <path d="M8.15 5.7v3.05" />
      <path d="M15.85 5.7v3.05" />
      <path d="M5.1 11.05h13.8" />
      <path d="M8.15 14.05h2.15" />
      <path d="M12.1 14.05h1.75" />
      <path d="M8.15 16.5h5.7" opacity="0.75" />
    </svg>
  );
}

function DyveCalendarDaysRangeIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.05" y="6.1" width="13.9" height="12.35" rx="1.8" />
      <path d="M8.35 4.9v2.4" />
      <path d="M15.65 4.9v2.4" />
      <path d="M5.05 9.7h13.9" />
      <rect x="8.05" y="12.35" width="7.9" height="3.2" rx="1.1" fill="currentColor" stroke="none" opacity="0.2" />
      <path d="M8.15 13.95h7.7" opacity="0.8" />
    </svg>
  );
}

function DyveCalendarDaysSeriesIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.05" y="6.1" width="13.9" height="12.35" rx="1.8" />
      <path d="M8.35 4.9v2.4" />
      <path d="M15.65 4.9v2.4" />
      <path d="M5.05 9.7h13.9" />
      <circle cx="9" cy="13.95" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.95" r="1.05" fill="currentColor" stroke="none" opacity="0.72" />
      <circle cx="15" cy="13.95" r="1.05" fill="currentColor" stroke="none" opacity="0.48" />
    </svg>
  );
}

function DyveMessageSquareIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.1 6.25h9.8a2.05 2.05 0 0 1 2.05 2.05v6.4a2.05 2.05 0 0 1-2.05 2.05h-6.3l-3.55 2.35v-2.35H7.1A2.05 2.05 0 0 1 5.05 14.7V8.3A2.05 2.05 0 0 1 7.1 6.25Z" />
      <path d="M8.8 10.35h6.4" />
      <path d="M8.8 13h4.05" opacity="0.72" />
    </svg>
  );
}

function DyveMessageSquareSupportIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.15 6.55h11.7a1.8 1.8 0 0 1 1.8 1.8v6.3a1.8 1.8 0 0 1-1.8 1.8H11.8l-3.45 2.85v-2.85H6.15a1.8 1.8 0 0 1-1.8-1.8v-6.3a1.8 1.8 0 0 1 1.8-1.8Z" />
      <path d="M8.7 10.55h6.6" />
      <path d="M8.7 13.15h4.05" opacity="0.72" />
      <circle cx="16.95" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveArrowUpRightIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.1 15.9 15.9 8.1" />
      <path d="M9.55 8.1h6.35v6.35" />
    </svg>
  );
}

function DyveCalendarIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.6 8.15h10.8a1.4 1.4 0 0 1 1.4 1.4v7.85a1.4 1.4 0 0 1-1.4 1.4H6.6a1.4 1.4 0 0 1-1.4-1.4V9.55a1.4 1.4 0 0 1 1.4-1.4Z" />
      <path d="M8.3 5.65v3.1" />
      <path d="M15.7 5.65v3.1" />
      <path d="M5.2 11.15h13.6" />
      <path d="M8.55 13.95h.01" />
      <path d="M12 13.95h.01" />
      <path d="M15.45 13.95h.01" />
    </svg>
  );
}

function DyveClockIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="6.9" />
      <path d="M12 8.35v4.05l2.85 1.75" />
      <path d="M12 5.1v.01" opacity="0.45" />
    </svg>
  );
}

function DyveShareIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15.9 7.15 8.35 11.1" />
      <path d="m15.9 16.85-7.55-3.95" />
      <circle cx="17.55" cy="6.35" r="1.95" />
      <circle cx="6.45" cy="12" r="1.95" />
      <circle cx="17.55" cy="17.65" r="1.95" />
    </svg>
  );
}

function DyveHeartIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 19.25c-4.8-3-7.25-5.72-7.25-8.6 0-2.2 1.62-3.9 3.72-3.9 1.38 0 2.62.7 3.53 1.87.91-1.17 2.15-1.87 3.53-1.87 2.1 0 3.72 1.7 3.72 3.9 0 2.88-2.45 5.6-7.25 8.6Z" />
    </svg>
  );
}

function DyveHeartFilledIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 19.25c-4.8-3-7.25-5.72-7.25-8.6 0-2.2 1.62-3.9 3.72-3.9 1.38 0 2.62.7 3.53 1.87.91-1.17 2.15-1.87 3.53-1.87 2.1 0 3.72 1.7 3.72 3.9 0 2.88-2.45 5.6-7.25 8.6Z" />
    </svg>
  );
}

function DyveSettingsIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="2.45" />
      <path d="M18.55 13.2v-2.4l-1.8-.45a5.2 5.2 0 0 0-.45-1.05l1-1.55-1.7-1.7-1.55 1a5.2 5.2 0 0 0-1.05-.45l-.45-1.8h-2.4l-.45 1.8a5.2 5.2 0 0 0-1.05.45l-1.55-1-1.7 1.7 1 1.55a5.2 5.2 0 0 0-.45 1.05l-1.8.45v2.4l1.8.45c.1.37.25.72.45 1.05l-1 1.55 1.7 1.7 1.55-1c.33.2.68.35 1.05.45l.45 1.8h2.4l.45-1.8c.37-.1.72-.25 1.05-.45l1.55 1 1.7-1.7-1-1.55c.2-.33.35-.68.45-1.05l1.8-.45Z" />
    </svg>
  );
}

function DyveCalendarBookedIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.1" y="6.1" width="13.8" height="12.3" rx="1.8" />
      <path d="M8.35 4.9v2.4" />
      <path d="M15.65 4.9v2.4" />
      <path d="M5.1 9.65h13.8" />
      <path d="m9.55 13.05 1.65 1.65 3.3-3.4" />
    </svg>
  );
}

function DyveCalendarFullIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.1" y="6.1" width="13.8" height="12.3" rx="1.8" />
      <path d="M8.35 4.9v2.4" />
      <path d="M15.65 4.9v2.4" />
      <path d="M5.1 9.65h13.8" />
      <path d="m9.65 13.05 4.7 4.7" />
      <path d="m14.35 13.05-4.7 4.7" />
    </svg>
  );
}

function DyveCalendarCheckIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.45 8.1h11.1a1.35 1.35 0 0 1 1.35 1.35v7.95a1.35 1.35 0 0 1-1.35 1.35H6.45A1.35 1.35 0 0 1 5.1 17.4V9.45A1.35 1.35 0 0 1 6.45 8.1Z" />
      <path d="M8.15 5.7v3.05" />
      <path d="M15.85 5.7v3.05" />
      <path d="M5.1 11.05h13.8" />
      <path d="m9.2 15.05 1.65 1.6 3.65-3.7" />
    </svg>
  );
}

function DyveReceiptIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.2 5.4h9.6v13.2l-1.45-1.05-1.55 1.05-1.8-1.05-1.8 1.05-1.5-1.05-1.55 1.05V5.4Z" />
      <path d="M9.35 9.1h5.3" />
      <path d="M9.35 12.1h5.3" />
      <path d="M9.35 15.1h3.05" />
    </svg>
  );
}

function DyveTargetIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="6.75" />
      <circle cx="12" cy="12" r="3.7" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveGiftIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.45 10.1h13.1v8.25H5.45V10.1Z" />
      <path d="M12 10.1v8.25" />
      <path d="M4.75 10.1h14.5V7.65H4.75v2.45Z" />
      <path d="M9.35 7.65c-1.35 0-2.15-.7-2.15-1.8 0-.95.68-1.6 1.65-1.6 1.45 0 2.45 1.5 3.15 3.4" />
      <path d="M14.65 7.65c1.35 0 2.15-.7 2.15-1.8 0-.95-.68-1.6-1.65-1.6-1.45 0-2.45 1.5-3.15 3.4" />
    </svg>
  );
}

function DyveUserCircle2Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 11.55a2.85 2.85 0 1 0 0-5.7 2.85 2.85 0 0 0 0 5.7Z" />
      <path d="M8.05 17.05c.7-1.6 2.1-2.45 3.95-2.45s3.25.85 3.95 2.45" />
    </svg>
  );
}

function DyveInfoIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="7.4" />
      <path d="M12 10.4v4.55" />
      <path d="M12 8.05h.01" />
    </svg>
  );
}

function DyveSparklesIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 5.3 1.1 3.2 3.2 1.1-3.2 1.1L12 13.9l-1.1-3.2-3.2-1.1 3.2-1.1L12 5.3Z" />
      <path d="m17.95 12.75.7 2.05 2.05.7-2.05.7-.7 2.05-.7-2.05-2.05-.7 2.05-.7.7-2.05Z" />
      <path d="m7.15 14.95.8 2.35 2.35.8-2.35.8-.8 2.35-.8-2.35-2.35-.8 2.35-.8.8-2.35Z" />
    </svg>
  );
}

function DyveMusicIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.75 6.35v8.1" />
      <path d="M14.75 6.35 9.25 7.9" />
      <path d="M14.75 9.5 9.25 11.05" />
      <circle cx="9.05" cy="14.95" r="2.15" />
      <circle cx="14.55" cy="17.05" r="2.15" />
    </svg>
  );
}

function DyveBuilding2Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.75 18.75V7.1l6.25-1.85v13.5" />
      <path d="M12 18.75V9.2l6.25-1.6v11.15" />
      <path d="M8.35 9.95h.01" />
      <path d="M8.35 12.8h.01" />
      <path d="M15.65 11.4h.01" />
      <path d="M15.65 14.25h.01" />
      <path d="M10.35 18.75h3.3" />
    </svg>
  );
}

function DyveGlobeIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="7.55" />
      <path d="M4.95 12h14.1" />
      <path d="M12 4.45c2.12 2.2 3.3 4.8 3.3 7.55 0 2.75-1.18 5.35-3.3 7.55" />
      <path d="M12 4.45c-2.12 2.2-3.3 4.8-3.3 7.55 0 2.75 1.18 5.35 3.3 7.55" />
      <path d="M6.95 8.2c1.3-.72 3.1-1.15 5.05-1.15s3.75.43 5.05 1.15" opacity="0.68" />
      <path d="M6.95 15.8c1.3.72 3.1 1.15 5.05 1.15s3.75-.43 5.05-1.15" opacity="0.68" />
    </svg>
  );
}

function DyveLayoutGridIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.2" y="5.2" width="5.9" height="5.9" rx="1.35" />
      <rect x="12.9" y="5.2" width="5.9" height="5.9" rx="1.35" />
      <rect x="5.2" y="12.9" width="5.9" height="5.9" rx="1.35" />
      <rect x="12.9" y="12.9" width="5.9" height="5.9" rx="1.35" />
    </svg>
  );
}

function DyveLandmarkIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.9 18.45h14.2" />
      <path d="M6.85 18.45v-6.1" />
      <path d="M10.6 18.45v-6.1" />
      <path d="M13.4 18.45v-6.1" />
      <path d="M17.15 18.45v-6.1" />
      <path d="M5.35 10.9h13.3L12 5.55l-6.65 5.35Z" />
      <path d="M4.4 20.15h15.2" opacity="0.72" />
    </svg>
  );
}

function DyveMonitorSpeakerIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4.8" y="6" width="10.5" height="7.95" rx="1.5" />
      <path d="M8.15 18.1h3.8" />
      <path d="M10.05 13.95v4.15" />
      <rect x="16.65" y="7.2" width="2.8" height="9.8" rx="1.4" />
      <circle cx="18.05" cy="10.35" r="0.9" />
      <circle cx="18.05" cy="13.7" r="1.45" />
    </svg>
  );
}

function DyveWalletIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.45 7.65h10.85a2.25 2.25 0 0 1 2.25 2.25v6.45a1.7 1.7 0 0 1-1.7 1.7H7.15a1.7 1.7 0 0 1-1.7-1.7V8.95a1.3 1.3 0 0 1 1.3-1.3Z" />
      <path d="M5.45 9.1V7.95c0-1 .7-1.7 1.7-1.7h8.4" opacity="0.7" />
      <path d="M14.85 12.9h3.7" />
      <circle cx="14.95" cy="12.9" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveWalletChargebackIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.45 7.65h10.85a2.25 2.25 0 0 1 2.25 2.25v6.45a1.7 1.7 0 0 1-1.7 1.7H7.15a1.7 1.7 0 0 1-1.7-1.7V8.95a1.3 1.3 0 0 1 1.3-1.3Z" />
      <path d="M5.45 9.1V7.95c0-1 .7-1.7 1.7-1.7h8.4" opacity="0.7" />
      <path d="M14.85 12.9h3.7" />
      <circle cx="14.95" cy="12.9" r="0.55" fill="currentColor" stroke="none" />
      <path d="M11.55 10.45a2.7 2.7 0 1 0-.1 4.9" />
      <path d="m9.05 11 1.95-.35-.35-1.95" />
    </svg>
  );
}

function DyveWalletFailureIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.45 7.65h10.85a2.25 2.25 0 0 1 2.25 2.25v6.45a1.7 1.7 0 0 1-1.7 1.7H7.15a1.7 1.7 0 0 1-1.7-1.7V8.95a1.3 1.3 0 0 1 1.3-1.3Z" />
      <path d="M5.45 9.1V7.95c0-1 .7-1.7 1.7-1.7h8.4" opacity="0.7" />
      <path d="M14.85 12.9h3.7" />
      <circle cx="14.95" cy="12.9" r="0.55" fill="currentColor" stroke="none" />
      <path d="m9.55 11.15 2.75 2.75" />
      <path d="m12.3 11.15-2.75 2.75" />
    </svg>
  );
}

function DyveWalletPayoutIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.45 7.65h10.85a2.25 2.25 0 0 1 2.25 2.25v6.45a1.7 1.7 0 0 1-1.7 1.7H7.15a1.7 1.7 0 0 1-1.7-1.7V8.95a1.3 1.3 0 0 1 1.3-1.3Z" />
      <path d="M5.45 9.1V7.95c0-1 .7-1.7 1.7-1.7h8.4" opacity="0.7" />
      <path d="M14.75 12.9h3.8" />
      <circle cx="14.95" cy="12.9" r="0.55" fill="currentColor" stroke="none" />
      <path d="m8.25 13 1.55 1.55 2.9-3.05" />
    </svg>
  );
}

function DyveWalletRefundIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.45 7.65h10.85a2.25 2.25 0 0 1 2.25 2.25v6.45a1.7 1.7 0 0 1-1.7 1.7H7.15a1.7 1.7 0 0 1-1.7-1.7V8.95a1.3 1.3 0 0 1 1.3-1.3Z" />
      <path d="M5.45 9.1V7.95c0-1 .7-1.7 1.7-1.7h8.4" opacity="0.7" />
      <path d="M14.85 12.9h3.7" />
      <circle cx="14.95" cy="12.9" r="0.55" fill="currentColor" stroke="none" />
      <path d="M10.55 10.45a2.65 2.65 0 1 0 1.95 4.45" />
      <path d="m8.85 11.05 1.75-.6-.6-1.7" />
    </svg>
  );
}

function DyveShieldIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4.95 18 7.2v4.55c0 3.38-2.08 5.92-6 7.3-3.92-1.38-6-3.92-6-7.3V7.2L12 4.95Z" />
      <path d="m9.4 12.15 1.75 1.8 3.45-3.7" />
    </svg>
  );
}

function DyveShieldAlertIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4.95 18 7.2v4.55c0 3.38-2.08 5.92-6 7.3-3.92-1.38-6-3.92-6-7.3V7.2L12 4.95Z" />
      <path d="M12 9.1v3.45" />
      <circle cx="12" cy="14.95" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveShieldOffIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4.95 18 7.2v4.55c0 2.1-.8 3.94-2.35 5.35" />
      <path d="M9.8 18.55c-2.53-1.45-3.8-3.73-3.8-6.8V7.2L12 4.95" />
      <path d="m5.25 5.25 13.5 13.5" />
    </svg>
  );
}

function DyveVolume2Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.35 13.95H8.1l3.55 3.15V6.9L8.1 10.05H5.35v3.9Z" />
      <path d="M15.15 9.35a4.2 4.2 0 0 1 0 5.3" />
      <path d="M17.55 7.25a7.1 7.1 0 0 1 0 9.5" />
    </svg>
  );
}

function DyveBadgeCheckIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="10.9" r="5.2" />
      <path d="m9.65 10.95 1.55 1.55 3.1-3.2" />
      <path d="m9.1 16.25-.55 2.1L12 16.8l3.45 1.55-.55-2.1" />
    </svg>
  );
}

function DyveBadgeCheckDetailIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="10.6" r="5.05" />
      <path d="m9.65 10.7 1.55 1.55 3.15-3.2" />
      <path d="m8.85 15.85-.75 2.75L12 16.8l3.9 1.8-.75-2.75" />
      <path d="M12 5.55v-1" opacity="0.45" />
    </svg>
  );
}

function DyveCreditCardIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4.85" y="6.55" width="14.3" height="10.9" rx="1.8" />
      <path d="M4.85 10.3h14.3" />
      <path d="M8.15 14.05h2.8" />
      <path d="M13.3 14.05h2.55" opacity="0.72" />
    </svg>
  );
}

function DyveCreditCardAltIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4.85" y="6.55" width="14.3" height="10.9" rx="1.8" />
      <path d="M4.85 10.25h14.3" />
      <path d="M7.55 14.15h3.05" />
      <rect x="12.2" y="13.2" width="4.1" height="1.7" rx="0.5" fill="currentColor" stroke="none" opacity="0.2" />
    </svg>
  );
}

function DyveImagePlusIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.1" y="6.05" width="10.8" height="11.9" rx="1.6" />
      <circle cx="9.05" cy="10.05" r="1.15" />
      <path d="m7.15 16.2 2.95-3.1 2.15 2.1 1.8-1.8 1.85 1.85" />
      <path d="M18.1 8.15v4.9" />
      <path d="M15.65 10.6h4.9" />
    </svg>
  );
}

function DyveLockIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6.45" y="10.65" width="11.1" height="7.55" rx="1.65" />
      <path d="M8.8 10.65V8.8a3.2 3.2 0 0 1 6.4 0v1.85" />
      <circle cx="12" cy="14.4" r="0.75" fill="currentColor" stroke="none" />
      <path d="M12 15.15v1.55" />
    </svg>
  );
}

function DyveQrCodeIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.2" y="5.2" width="4.5" height="4.5" rx="0.8" />
      <rect x="14.3" y="5.2" width="4.5" height="4.5" rx="0.8" />
      <rect x="5.2" y="14.3" width="4.5" height="4.5" rx="0.8" />
      <path d="M15.2 14.3h1.85" />
      <path d="M18.8 14.3v1.85" />
      <path d="M15.2 18.8h1.85v-1.95h1.75V18.8" />
      <path d="M7.45 7.45h.01" />
      <path d="M16.55 7.45h.01" />
      <path d="M7.45 16.55h.01" />
    </svg>
  );
}

function DyveRefreshCwIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.4 9.1A5.85 5.85 0 0 0 7.7 7.7L6.1 9.25" />
      <path d="M6.1 6.75v2.5h2.5" />
      <path d="M6.6 14.9a5.85 5.85 0 0 0 9.7 1.4l1.6-1.55" />
      <path d="M17.9 17.25v-2.5h-2.5" />
    </svg>
  );
}

function DyveTrendingUpIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6.2 15.8 4.05-4.05 2.95 2.95 4.6-5" />
      <path d="M14.35 9.7h3.45v3.45" />
    </svg>
  );
}

function DyveAlertCircleIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="7.35" />
      <path d="M12 8.55v4.35" />
      <circle cx="12" cy="15.65" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveAlertTriangleIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5.45 18.3 17.2a1 1 0 0 1-.9 1.5H6.6a1 1 0 0 1-.9-1.5L12 5.45Z" />
      <path d="M12 9.45v4.1" />
      <circle cx="12" cy="16.1" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveBarChart3Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.8 18.2h12.4" />
      <path d="M8.05 18.2v-5.4" />
      <path d="M12 18.2V8.95" />
      <path d="M15.95 18.2v-7.2" />
    </svg>
  );
}

function DyveClipboardListIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6.25" y="5.65" width="11.5" height="12.9" rx="1.5" />
      <path d="M9.3 5.65h5.4v2.05H9.3Z" />
      <path d="M8.9 10.3h6.2" />
      <path d="M8.9 13.25h6.2" />
      <path d="M8.9 16.2h3.9" opacity="0.72" />
    </svg>
  );
}

function DyveFileBadge2Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 5.7h5.55l2.45 2.45v9.95a1.45 1.45 0 0 1-1.45 1.45H8a1.45 1.45 0 0 1-1.45-1.45V7.15A1.45 1.45 0 0 1 8 5.7Z" />
      <path d="M13.55 5.7v2.45H16" />
      <circle cx="11.25" cy="13.05" r="1.95" />
      <path d="m10.3 16.15.95.9.95-.9" />
    </svg>
  );
}

function DyveFileTextIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 5.7h5.55l2.45 2.45v9.95a1.45 1.45 0 0 1-1.45 1.45H8a1.45 1.45 0 0 1-1.45-1.45V7.15A1.45 1.45 0 0 1 8 5.7Z" />
      <path d="M13.55 5.7v2.45H16" />
      <path d="M9.2 11.15h4.8" />
      <path d="M9.2 13.95h4.8" />
      <path d="M9.2 16.75h3.2" opacity="0.72" />
    </svg>
  );
}

function DyveGrid3X3Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.2" y="5.2" width="3.2" height="3.2" rx="0.65" />
      <rect x="10.4" y="5.2" width="3.2" height="3.2" rx="0.65" />
      <rect x="15.6" y="5.2" width="3.2" height="3.2" rx="0.65" />
      <rect x="5.2" y="10.4" width="3.2" height="3.2" rx="0.65" />
      <rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.65" />
      <rect x="15.6" y="10.4" width="3.2" height="3.2" rx="0.65" />
      <rect x="5.2" y="15.6" width="3.2" height="3.2" rx="0.65" />
      <rect x="10.4" y="15.6" width="3.2" height="3.2" rx="0.65" />
      <rect x="15.6" y="15.6" width="3.2" height="3.2" rx="0.65" />
    </svg>
  );
}

function DyveCameraIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.45 8.1h9.1a1.95 1.95 0 0 1 1.95 1.95v6.5a1.95 1.95 0 0 1-1.95 1.95h-9.1A1.95 1.95 0 0 1 5.5 16.55v-6.5A1.95 1.95 0 0 1 7.45 8.1Z" />
      <path d="m9.1 8.1.9-1.65h4l.9 1.65" />
      <circle cx="12" cy="13.25" r="2.55" />
    </svg>
  );
}

function DyveCheckCircle2Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="7.35" />
      <path d="m9.25 12.05 1.8 1.8 3.7-4" />
    </svg>
  );
}

function DyveClock3Icon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="6.95" />
      <path d="M12 8.35v3.75h2.95" />
      <path d="M12 5.05v.01" opacity="0.42" />
    </svg>
  );
}

function DyveDoorOpenIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.15 18.45V6.6l8.1-1.35v13.2" />
      <path d="M15.25 18.45h2.2" />
      <path d="M7.15 18.45H5.5" />
      <circle cx="12.4" cy="12.15" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveEyeOffIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.15 9.2A10.4 10.4 0 0 1 12 7.45c3.8 0 6.8 1.85 8.65 4.55a10.74 10.74 0 0 1-2.85 2.95" />
      <path d="M15.15 15.1A4.35 4.35 0 0 1 12 16.45c-3.8 0-6.8-1.85-8.65-4.55a10.72 10.72 0 0 1 2.95-3" />
      <path d="m4.95 4.95 14.1 14.1" />
      <path d="M10.25 10.25a2.45 2.45 0 0 0 3.5 3.5" />
    </svg>
  );
}

function DyveInstagramIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5.45" y="5.45" width="13.1" height="13.1" rx="3.1" />
      <circle cx="12" cy="12" r="3.15" />
      <circle cx="16.05" cy="7.95" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveStarIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 5.35 1.85 3.8 4.2.6-3.02 2.95.72 4.15L12 14.9l-3.75 1.95.72-4.15L5.95 9.75l4.2-.6L12 5.35Z" />
    </svg>
  );
}

function DyveStarFeaturedIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 5.15 1.85 3.75 4.15.6-3 2.95.72 4.15L12 14.65 8.28 16.6 9 12.45l-3-2.95 4.15-.6L12 5.15Z" />
      <circle cx="18.15" cy="6.8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveStarFavoriteIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 5.15 1.85 3.75 4.15.6-3 2.95.72 4.15L12 14.65 8.28 16.6 9 12.45l-3-2.95 4.15-.6L12 5.15Z" />
    </svg>
  );
}

function DyveCheckIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m7.95 12.25 2.55 2.6 5.55-5.8" />
    </svg>
  );
}

function DyveTimerIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="13.2" r="5.8" />
      <path d="M10 5.7h4" />
      <path d="M12 13.2 14.6 11.1" />
      <path d="M15.8 7.35 17 6.15" />
    </svg>
  );
}

function DyveUploadIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 16.75V7.55" />
      <path d="m8.9 10.65 3.1-3.1 3.1 3.1" />
      <path d="M6.2 18.2h11.6" />
    </svg>
  );
}

function DyveWifiIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.9 9.75a9.55 9.55 0 0 1 12.2 0" />
      <path d="M8.55 12.65a5.5 5.5 0 0 1 6.9 0" />
      <path d="M11 15.55a1.85 1.85 0 0 1 2 0" />
      <circle cx="12" cy="18.05" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DyveWineIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.3 5.8h7.4v1.3a3.7 3.7 0 0 1-3.7 3.7h0a3.7 3.7 0 0 1-3.7-3.7V5.8Z" />
      <path d="M12 10.8v6.1" />
      <path d="M9.45 18.2h5.1" />
    </svg>
  );
}

function DyveWrenchIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.85 7.3a2.95 2.95 0 0 0-3.95 3.95l-4.9 4.9a1.4 1.4 0 1 0 1.98 1.98l4.9-4.9a2.95 2.95 0 0 0 3.95-3.95l-2.15 2.15-1.8-1.8 1.97-2.33Z" />
    </svg>
  );
}

function DyveXCircleIcon({ strokeWidth = 1.9, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="7.35" />
      <path d="m9.45 9.45 5.1 5.1" />
      <path d="m14.55 9.45-5.1 5.1" />
    </svg>
  );
}

const customIconRegistry: Partial<Record<DyveIconName, SvgIconComponent>> = {
  "alert-circle": DyveAlertCircleIcon,
  "alert-triangle": DyveAlertTriangleIcon,
  "badge-check": DyveBadgeCheckIcon,
  "badge-check-detail": DyveBadgeCheckDetailIcon,
  "arrow-left": DyveArrowLeftIcon,
  "arrow-up-right": DyveArrowUpRightIcon,
  "bar-chart-3": DyveBarChart3Icon,
  bell: DyveBellIcon,
  "bell-unread": DyveBellUnreadIcon,
  "building-2": DyveBuilding2Icon,
  camera: DyveCameraIcon,
  calendar: DyveCalendarIcon,
  "calendar-booked": DyveCalendarBookedIcon,
  "calendar-check": DyveCalendarCheckIcon,
  "calendar-days": DyveCalendarDaysIcon,
  "calendar-days-range": DyveCalendarDaysRangeIcon,
  "calendar-days-series": DyveCalendarDaysSeriesIcon,
  "calendar-full": DyveCalendarFullIcon,
  "chevron-left": DyveChevronLeftIcon,
  "chevron-right": DyveChevronRightIcon,
  check: DyveCheckIcon,
  "check-circle-2": DyveCheckCircle2Icon,
  clock: DyveClockIcon,
  "clock-3": DyveClock3Icon,
  "clipboard-list": DyveClipboardListIcon,
  "credit-card": DyveCreditCardIcon,
  "credit-card-alt": DyveCreditCardAltIcon,
  "door-open": DyveDoorOpenIcon,
  "eye-off": DyveEyeOffIcon,
  flame: DyveFlameIcon,
  "file-badge-2": DyveFileBadge2Icon,
  "file-text": DyveFileTextIcon,
  gift: DyveGiftIcon,
  globe: DyveGlobeIcon,
  "grid-3x3": DyveGrid3X3Icon,
  heart: DyveHeartIcon,
  "heart-filled": DyveHeartFilledIcon,
  home: DyveHomeIcon,
  "image-plus": DyveImagePlusIcon,
  info: DyveInfoIcon,
  instagram: DyveInstagramIcon,
  "layout-grid": DyveLayoutGridIcon,
  landmark: DyveLandmarkIcon,
  lock: DyveLockIcon,
  "map-pin": DyveMapPinIcon,
  "map-pin-verified": DyveMapPinVerifiedIcon,
  "message-circle": DyveMessageCircleIcon,
  "message-circle-notification": DyveMessageCircleNotificationIcon,
  "message-square": DyveMessageSquareIcon,
  "message-square-support": DyveMessageSquareSupportIcon,
  "mic-2": DyveMic2Icon,
  "mic-2-live": DyveMic2LiveIcon,
  "monitor-speaker": DyveMonitorSpeakerIcon,
  music: DyveMusicIcon,
  plus: DyvePlusIcon,
  "qr-code": DyveQrCodeIcon,
  receipt: DyveReceiptIcon,
  "refresh-cw": DyveRefreshCwIcon,
  search: DyveSearchIcon,
  settings: DyveSettingsIcon,
  share: DyveShareIcon,
  shield: DyveShieldIcon,
  "shield-alert": DyveShieldAlertIcon,
  "shield-off": DyveShieldOffIcon,
  sparkles: DyveSparklesIcon,
  star: DyveStarIcon,
  "star-favorite": DyveStarFavoriteIcon,
  "star-featured": DyveStarFeaturedIcon,
  target: DyveTargetIcon,
  ticket: DyveTicketIcon,
  "ticket-checked": DyveTicketCheckedIcon,
  "ticket-issued": DyveTicketIssuedIcon,
  "ticket-perforated": DyveTicketPerforatedIcon,
  "ticket-priority": DyveTicketPriorityIcon,
  timer: DyveTimerIcon,
  "trending-up": DyveTrendingUpIcon,
  upload: DyveUploadIcon,
  user: DyveUserIcon,
  "user-admin": DyveUserAdminIcon,
  "user-circle-2": DyveUserCircle2Icon,
  users: DyveUsersIcon,
  "users-compact": DyveUsersCompactIcon,
  "volume-2": DyveVolume2Icon,
  wallet: DyveWalletIcon,
  "wallet-chargeback": DyveWalletChargebackIcon,
  "wallet-failure": DyveWalletFailureIcon,
  "wallet-payout": DyveWalletPayoutIcon,
  "wallet-refund": DyveWalletRefundIcon,
  wifi: DyveWifiIcon,
  wine: DyveWineIcon,
  wrench: DyveWrenchIcon,
  x: DyveXIcon,
  "x-circle": DyveXCircleIcon,
};

const iconRegistry: Record<DyveIconName, LucideIcon> = {
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  "arrow-left": ArrowLeft,
  "arrow-up-right": ArrowUpRight,
  "badge-check": BadgeCheck,
  "badge-check-detail": BadgeCheck,
  "bar-chart-3": BarChart3,
  bell: Bell,
  "bell-unread": Bell,
  "building-2": Building2,
  camera: Camera,
  calendar: Calendar,
  "calendar-booked": Calendar,
  "calendar-check": CalendarCheck,
  "calendar-days": CalendarDays,
  "calendar-days-range": CalendarDays,
  "calendar-days-series": CalendarDays,
  "calendar-full": Calendar,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  check: Check,
  "check-circle-2": CheckCircle2,
  "clipboard-list": ClipboardList,
  clock: Clock,
  "clock-3": Clock3,
  "credit-card": CreditCard,
  "credit-card-alt": CreditCard,
  "eye-off": EyeOff,
  "file-badge-2": FileBadge2,
  "file-text": FileText,
  flame: Flame,
  gift: Gift,
  globe: Globe,
  "grid-3x3": Grid3X3,
  handshake: Handshake,
  heart: Heart,
  "heart-filled": Heart,
  home: Home,
  "image-plus": ImagePlus,
  info: Info,
  instagram: Instagram,
  "layout-grid": LayoutGrid,
  landmark: Landmark,
  lock: Lock,
  "map-pin": MapPin,
  "map-pin-verified": MapPin,
  "message-circle": MessageCircle,
  "message-circle-notification": MessageCircle,
  "message-square": MessageSquare,
  "message-square-support": MessageSquare,
  "mic-2": Mic2,
  "mic-2-live": Mic2,
  "monitor-speaker": MonitorSpeaker,
  music: Music,
  "door-open": DoorOpen,
  plus: Plus,
  "qr-code": QrCode,
  receipt: Receipt,
  "refresh-cw": RefreshCw,
  search: Search,
  settings: Settings,
  share: Share,
  shield: Shield,
  "shield-alert": ShieldAlert,
  "shield-off": ShieldOff,
  sparkles: Sparkles,
  star: Star,
  "star-favorite": Star,
  "star-featured": Star,
  target: Target,
  ticket: Ticket,
  "ticket-checked": Ticket,
  "ticket-issued": Ticket,
  "ticket-perforated": Ticket,
  "ticket-priority": Ticket,
  timer: Timer,
  "trending-up": TrendingUp,
  upload: Upload,
  user: User,
  "user-admin": User,
  "user-circle-2": UserCircle2,
  users: Users,
  "users-compact": Users,
  "volume-2": Volume2,
  wallet: Wallet,
  "wallet-chargeback": Wallet,
  "wallet-failure": Wallet,
  "wallet-payout": Wallet,
  "wallet-refund": Wallet,
  wifi: Wifi,
  wine: Wine,
  wrench: Wrench,
  x: X,
  "x-circle": XCircle,
};

type DyveIconProps = Omit<LucideProps, "size"> & (
  | { icon: LucideIcon; name?: never }
  | { name: DyveIconName; icon?: never }
);

interface DyveIconBaseProps {
  size?: DyveIconSize;
  tone?: DyveIconTone;
}

type DyveIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  (
    | { icon: LucideIcon; name?: never }
    | { name: DyveIconName; icon?: never }
  ) & {
  label: string;
  iconSize?: DyveIconSize;
  iconTone?: DyveIconTone;
  variant?: DyveIconButtonVariant;
  badge?: ReactNode;
  iconClassName?: string;
};

export function DyveIcon({
  icon,
  name,
  size = "md",
  tone = "default",
  className,
  strokeWidth,
  ...props
}: DyveIconProps & DyveIconBaseProps) {
  const resolvedClassName = cn(
    iconSizeClassMap[size],
    iconToneClassMap[tone],
    className,
  );

  if (icon) {
    const Icon = icon;
    return (
      <Icon
        className={resolvedClassName}
        strokeWidth={strokeWidth ?? iconStrokeWidthMap[size]}
        {...props}
      />
    );
  }

  const Icon = customIconRegistry[name] ?? iconRegistry[name];

  return (
    <Icon
      className={resolvedClassName}
      strokeWidth={strokeWidth ?? iconStrokeWidthMap[size]}
      {...props}
    />
  );
}

export function DyveIconButton({
  icon,
  name,
  label,
  iconSize = "md",
  iconTone = "muted",
  variant = "ghost",
  badge,
  className,
  iconClassName,
  type = "button",
  ...props
}: DyveIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-lg)] transition-all duration-200 active:scale-[0.98]",
        buttonVariantClassMap[variant],
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none inline-flex h-4.5 w-4.5 items-center justify-center">
        {icon ? (
          <DyveIcon icon={icon} size={iconSize} tone={iconTone} className={iconClassName} />
        ) : (
          <DyveIcon name={name} size={iconSize} tone={iconTone} className={iconClassName} />
        )}
      </span>
      {badge}
    </button>
  );
}
