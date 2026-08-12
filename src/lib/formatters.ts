export function parseIndonesianNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  let str = String(value).trim();
  if (!str) return 0;

  // Clean currency prefixes and spaces
  str = str.replace(/Rp\.?\s*/gi, '').trim();

  // Handle dot vs comma in Indonesian format:
  // "10.000" -> 10000
  // "1.000.000" -> 1000000
  // "1.500,50" -> 1500.50
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else if (str.includes('.')) {
    str = str.replace(/\./g, '');
  } else if (str.includes(',')) {
    str = str.replace(/,/g, '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function formatRupiah(amount: number | string): string {
  const numericAmount = typeof amount === 'number' ? amount : parseIndonesianNumber(amount);
  const isNegative = numericAmount < 0;
  const absAmount = Math.abs(numericAmount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(absAmount);

  // Format result nicely like "Rp 150.000" instead of "Rp150.000,00"
  const cleanFormatted = formatted.replace('Rp', 'Rp ');
  return isNegative ? `-${cleanFormatted}` : cleanFormatted;
}

export function formatTanggal(dateStr: string, includeDayName = true): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return dateStr;

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeDayName ? { weekday: 'long' } : {}),
    };

    return date.toLocaleDateString('id-ID', options);
  } catch (e) {
    return dateStr;
  }
}

export function formatTanggalDisatuin(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    return `${dayName}, ${dayNum} ${monthName}`;
  } catch (e) {
    return dateStr;
  }
}

export function formatTanggalRealtime(): string {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function generateInvoiceNumber(suffix?: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  const cleanSuffix = suffix ? `/${suffix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)}` : '';
  return `INV/${year}${month}${day}${cleanSuffix}/${randomNum}`;
}

export function getTokoBadgeStyle(tokoName: string): string {
  if (!tokoName) return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
  return 'bg-slate-100 text-slate-900 border-slate-300 font-extrabold shadow-2xs';
}

