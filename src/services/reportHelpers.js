/** America/La_Paz (UTC-4, no DST) period helpers. Ranges are [inicio, finExclusive). */

const LA_PAZ_OFFSET = '-04:00';

const pad = (n) => String(n).padStart(2, '0');

/** Parse YYYY-MM-DD as start of that calendar day in La Paz → UTC Date */
export const laPazDayStartUtc = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00${LA_PAZ_OFFSET}`);
};

/** Exclusive end = start of day after `hasta` inclusive date */
export const laPazRangeExclusive = (desde, hasta) => {
  const start = laPazDayStartUtc(desde);
  const endInclusive = laPazDayStartUtc(hasta);
  const endExclusive = new Date(endInclusive.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
};

export const formatLaPazDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};
