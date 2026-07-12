import { formatDistanceToNow, format } from 'date-fns';

export const relativeTime = (date: string) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'just now';
  return formatDistanceToNow(d, { addSuffix: true });
};

export const shortDate = (date: string) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return format(d, 'MMM d, yyyy');
};

export const timeOnly = (date: string) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return format(d, 'h:mm a');
};
