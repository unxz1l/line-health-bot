export function log(level, action, details = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    action,
    ...details,
  });
  if (level === 'ERROR') console.error(entry);
  else if (level === 'WARN') console.warn(entry);
  else console.log(entry);
}
