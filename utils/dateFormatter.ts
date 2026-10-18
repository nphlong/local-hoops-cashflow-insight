export const formatDate = (date: Date, format: string = 'medium'): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

export const formatDateISO = (date: Date): string => {
  return date.toISOString();
};

export const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${month}-${year}`;
};

export const getMonthLabel = (date: Date): string => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const getPreviousMonth = (date: Date): Date => {
  const prev = new Date(date);
  prev.setMonth(prev.getMonth() - 1);
  return prev;
};

export const getNextMonth = (date: Date): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
};

export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const startFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(startDate);
  
  const endFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(endDate);
  
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${startFormatted} - ${endDate.getDate()} ${endFormatted}`;
  }
  
  return `${startFormatted} - ${endFormatted}`;
};