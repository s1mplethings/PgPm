export const pad = (value: number, width = 2) => String(value).padStart(width, '0');

export function ymd(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function ymdhm(date = new Date()) {
  return `${ymd(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let seq = 0;

export function newId(prefix = 'T') {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}`;
  seq = (seq + 1) % 1000;
  return `${prefix}-${stamp}-${pad(seq, 3)}`;
}
