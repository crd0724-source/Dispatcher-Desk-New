import { SupportedTimezone } from '../types/domain.types.ts';

export const SUPPORTED_TIMEZONES: SupportedTimezone[] = [
  { id: 'America/New_York', label: 'US Eastern (ET)', code: 'EST/EDT', region: 'US' },
  { id: 'America/Chicago', label: 'US Central (CT)', code: 'CST/CDT', region: 'US' },
  { id: 'America/Denver', label: 'US Mountain (MT)', code: 'MST/MDT', region: 'US' },
  { id: 'America/Los_Angeles', label: 'US Pacific (PT)', code: 'PST/PDT', region: 'US' },
  { id: 'America/Toronto', label: 'Canada Eastern (ET)', code: 'EST/EDT', region: 'Canada' },
  { id: 'Asia/Kolkata', label: 'India Standard Time (IST)', code: 'IST', region: 'India' },
  { id: 'Asia/Karachi', label: 'Pakistan Standard Time (PKT)', code: 'PKT', region: 'Pakistan' },
];

export const DEFAULT_DISPATCHER_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_OPERATIONAL_TIMEZONE = 'America/Chicago';

/**
 * Formats a UTC / ISO timestamp for display in a specific IANA timezone.
 * Uses Intl.DateTimeFormat to respect DST changes automatically.
 */
export function formatInTimezone(
  dateString: string | null | undefined,
  timeZone: string,
  options: {
    includeDate?: boolean;
    includeTime?: boolean;
    includeSeconds?: boolean;
    includeTimezoneCode?: boolean;
  } = {}
): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  const {
    includeDate = true,
    includeTime = true,
    includeSeconds = false,
    includeTimezoneCode = true,
  } = options;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: includeDate ? 'short' : undefined,
      day: includeDate ? '2-digit' : undefined,
      year: includeDate ? 'numeric' : undefined,
      hour: includeTime ? '2-digit' : undefined,
      minute: includeTime ? '2-digit' : undefined,
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
      timeZoneName: includeTimezoneCode ? 'short' : undefined,
    });

    return formatter.format(date);
  } catch {
    // Fallback if timezone string is invalid
    return date.toISOString().replace('T', ' ').substring(0, 16);
  }
}

/**
 * Returns formatted dual timestamp for dispatchers (e.g. US Ops Time + Dispatcher IST Time)
 * Example: "Oct 24, 10:00 AM CDT (8:30 PM IST)"
 */
export function formatDualTime(
  dateString: string | null | undefined,
  opsTimezone = DEFAULT_OPERATIONAL_TIMEZONE,
  localTimezone = DEFAULT_DISPATCHER_TIMEZONE
): {
  primary: string;
  secondary: string;
  combined: string;
} {
  if (!dateString) {
    return { primary: '—', secondary: '—', combined: '—' };
  }

  const primary = formatInTimezone(dateString, opsTimezone, {
    includeDate: true,
    includeTime: true,
    includeTimezoneCode: true,
  });

  const secondary = formatInTimezone(dateString, localTimezone, {
    includeDate: false,
    includeTime: true,
    includeTimezoneCode: true,
  });

  return {
    primary,
    secondary,
    combined: `${primary} (${secondary})`,
  };
}

/**
 * Get current time in specified timezone formatted for live clocks in Header.
 */
export function getCurrentTimeInZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString();
  }
}
