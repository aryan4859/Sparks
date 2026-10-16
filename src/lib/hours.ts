/**
 * Opening hours: reads the free-text "hours" field and answers "is it open now?"
 * in Nepal time. Understands the common ways people write hours:
 *
 *   9:00am - 8:30pm            07:00-22:00            8:00 – 20:00 daily
 *   Mo-Su 10:00-21:00          Mon-Fri 8am-6pm; Sat 9am-2pm; Sun closed
 *   Sun-Sat 11:30 - 9:00       24/7                   18:00-02:00 (past midnight)
 *
 * Anything else (e.g. "sunrise-sunset") is "not understood": the place still
 * shows its text, but the "Open now" filter leaves it out.
 */

/** Minutes since midnight; `end` may pass 1440 when a place closes after midnight. */
export type Interval = [start: number, end: number];
/** "always", or opening intervals for each weekday (0 = Monday … 6 = Sunday). */
export type Schedule = "always" | Interval[][];

const DAYS: Record<string, number> = {
  mo: 0, mon: 0, monday: 0,
  tu: 1, tue: 1, tues: 1, tuesday: 1,
  we: 2, wed: 2, wednesday: 2,
  th: 3, thu: 3, thur: 3, thurs: 3, thursday: 3,
  fr: 4, fri: 4, friday: 4,
  sa: 5, sat: 5, saturday: 5,
  su: 6, sun: 6, sunday: 6,
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const EVERY_DAY = /^(daily|every ?day|everyday|all days|all week)$/;

function parseDays(s: string): number[] | null {
  s = s.replace(/[:,]\s*$/, "").trim();
  if (!s || EVERY_DAY.test(s)) return ALL_DAYS;
  const days = new Set<number>();
  for (const part of s.split(/\s*,\s*/)) {
    if (part === "ph") continue; // public holidays: not tracked, so "PH off" changes nothing
    const [a, b] = part.split(/\s*-\s*/);
    if (!(a in DAYS) || (b !== undefined && !(b in DAYS))) return null;
    if (b === undefined) {
      days.add(DAYS[a]);
    } else {
      // Ranges may wrap around the week: "Fr-Mo", "Su-Sa".
      for (let d = DAYS[a], n = 0; n < 7; d = (d + 1) % 7, n++) {
        days.add(d);
        if (d === DAYS[b]) break;
      }
    }
  }
  return [...days];
}

const TIME = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?`;
const RANGE = new RegExp(`^${TIME}\\s*(?:-|to)\\s*${TIME}$`);

function toMinutes(h: number, m: number, suffix?: string) {
  if (suffix === "am") h = h === 12 ? 0 : h;
  if (suffix === "pm") h = h === 12 ? 12 : h + 12;
  return h * 60 + m;
}

function parseRange(s: string): Interval | null {
  const r = s.trim().match(RANGE);
  if (!r) return null;
  const [, h1, m1 = "0", sx1, h2, m2 = "0", sx2] = r;
  const nums = [Number(h1), Number(m1), Number(h2), Number(m2)];
  if (nums[0] > 24 || nums[2] > 24 || nums[1] > 59 || nums[3] > 59) return null;
  if ((sx1 || sx2) && (nums[0] > 12 || nums[2] > 12)) return null;

  let startSuffix = sx1;
  // "9-5pm" → 9am; "6-9pm" → 6pm: borrow the end's am/pm unless that would start after it ends.
  if (!sx1 && sx2) {
    startSuffix = toMinutes(nums[0], nums[1], sx2) <= toMinutes(nums[2], nums[3], sx2) ? sx2 : sx2 === "pm" ? "am" : "pm";
  }
  const start = toMinutes(nums[0], nums[1], startSuffix);
  let end = toMinutes(nums[2], nums[3], sx2);
  // No am/pm anywhere and "11:30 - 9:00": almost certainly 9 in the evening.
  if (!sx1 && !sx2 && end < start && end <= 12 * 60 && end + 12 * 60 > start) end += 12 * 60;
  if (end <= start) end += 24 * 60; // closes after midnight
  if (start >= 24 * 60) return null;
  return [start, end];
}

export function parseHours(text: string | undefined | null): Schedule | null {
  const s = (text ?? "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\b([ap])\.m\./g, "$1m")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;
  if (/^(24\/7|24 ?hours?|open 24 hours|always open)$/.test(s)) return "always";

  const week: Interval[][] = ALL_DAYS.map(() => []);
  let understood = false;
  for (let rule of s.split(/\s*[;\n]\s*/).filter(Boolean)) {
    // "8:00 - 20:00 daily": a trailing "daily" applies to every day.
    rule = rule.replace(/\s+(daily|every ?day|everyday)$/, "");
    const firstTime = rule.search(/\d|\b(off|closed)\b/);
    if (firstTime < 0) return null;
    const days = parseDays(rule.slice(0, firstTime));
    if (!days) return null;
    const times = rule.slice(firstTime).trim();
    let intervals: Interval[] = [];
    if (!/^(off|closed)$/.test(times)) {
      for (const part of times.split(/\s*,\s*/)) {
        const range = parseRange(part);
        if (!range) return null;
        intervals.push(range);
      }
    }
    if (/^(off|closed)$/.test(times)) intervals = [];
    for (const d of days) week[d] = intervals; // later rules override earlier ones, as in OpenStreetMap
    understood = true;
  }
  return understood ? week : null;
}

/** Day of week (0 = Monday) and minutes since midnight, in Nepal time. */
export function nepalNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = DAY_LABELS.indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** The interval that's open right now, if any (including last night's late hours). */
function currentInterval(schedule: Interval[][], day: number, minutes: number): { closes: number } | null {
  for (const [start, end] of schedule[day]) if (start <= minutes && minutes < end) return { closes: end };
  const yesterday = (day + 6) % 7;
  for (const [, end] of schedule[yesterday]) if (end > 1440 && minutes < end - 1440) return { closes: end - 1440 };
  return null;
}

export function isOpen(schedule: Schedule | null, date = new Date()) {
  if (!schedule) return false;
  if (schedule === "always") return true;
  const { day, minutes } = nepalNow(date);
  return currentInterval(schedule, day, minutes) !== null;
}

export function formatTime(minutes: number) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${String(min).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

/** "Open now · until 8:30pm" / "Closed · opens tomorrow 9am", or null if the hours weren't understood. */
export function openStatus(schedule: Schedule | null, date = new Date()): { open: boolean; text: string } | null {
  if (!schedule) return null;
  if (schedule === "always") return { open: true, text: "Open 24 hours" };
  const { day, minutes } = nepalNow(date);
  const now = currentInterval(schedule, day, minutes);
  if (now) return { open: true, text: `Open now · until ${formatTime(now.closes)}` };
  for (let ahead = 0; ahead < 7; ahead++) {
    const d = (day + ahead) % 7;
    const next = schedule[d].filter(([start]) => ahead > 0 || start > minutes).sort((a, b) => a[0] - b[0])[0];
    if (next) {
      const when = ahead === 0 ? "" : ahead === 1 ? "tomorrow " : `${DAY_LABELS[d]} `;
      return { open: false, text: `Closed · opens ${when}${formatTime(next[0])}` };
    }
  }
  return { open: false, text: "Closed" };
}

/** A tidy summary: "Every day 9am–8:30pm", "Mon–Fri 8am–6pm · Sat 9am–2pm · Sun closed". */
export function formatSchedule(schedule: Schedule): string {
  if (schedule === "always") return "Open 24 hours, every day";
  const label = (d: Interval[]) => (d.length ? d.map(([a, b]) => `${formatTime(a)}–${formatTime(b)}`).join(", ") : "closed");
  const groups: { from: number; to: number; text: string }[] = [];
  schedule.forEach((intervals, d) => {
    const text = label(intervals);
    const last = groups.at(-1);
    if (last && last.text === text && last.to === d - 1) last.to = d;
    else groups.push({ from: d, to: d, text });
  });
  if (groups.length === 1) return `Every day ${groups[0].text}`;
  return groups
    .map((g) => `${g.from === g.to ? DAY_LABELS[g.from] : `${DAY_LABELS[g.from]}–${DAY_LABELS[g.to]}`} ${g.text}`)
    .join(" · ");
}
