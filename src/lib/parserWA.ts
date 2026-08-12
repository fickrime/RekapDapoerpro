import { TextParseResult } from '../types';

/**
 * Parses raw text (e.g. copied from WhatsApp messages) into structured order items.
 * Handles patterns like:
 * - "Beras 5kg @ 15000 / 18000"
 * - "10x Minyak 2L hb 30000 hj 35000"
 * - "Tahu 40 pcs - 50000"
 * - "Daging Ayam 2 kg x 45000 (hj: 50000)"
 */
export function parseWhatsAppText(
  text: string,
  defaultToko = 'HTG',
  defaultDapur = 'Siliragung',
  defaultPemasok = 'Pemasok 1'
): TextParseResult[] {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n');
  const results: TextParseResult[] = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    // Skip empty lines or header/footer noise
    if (!line || line.startsWith('===') || line.startsWith('---')) continue;

    // Remove leading numbering like "1. ", "2) ", "- ", "* "
    line = line.replace(/^[\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '').trim();

    if (line.length < 3) continue;

    let qty = 1;
    let hargaBeli = 0;
    let hargaJual = 0;
    let namaBarang = line;

    // 1. Try to extract numbers with 'hb' (harga beli) and 'hj' (harga jual)
    const hbHjMatch = line.match(/hb\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:k)?\b.*?hj\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:k)?\b/i);
    if (hbHjMatch) {
      hargaBeli = parsePriceValue(hbHjMatch[1]);
      hargaJual = parsePriceValue(hbHjMatch[2]);
      // Remove hb/hj substring from name
      namaBarang = line.replace(/hb\s*[:=]?\s*\d+.*$/i, '').trim();
    } else {
      // 2. Try pattern `@ hargaBeli / hargaJual` or `@ hargaBeli`
      const atMatch = line.match(/@\s*(\d+(?:[.,]\d+)?)\s*(?:k)?(?:\s*[\/\-]\s*(\d+(?:[.,]\d+)?)\s*(?:k)?)?/i);
      if (atMatch) {
        hargaBeli = parsePriceValue(atMatch[1]);
        if (atMatch[2]) {
          hargaJual = parsePriceValue(atMatch[2]);
        } else {
          // Default markup 10% or round up
          hargaJual = Math.round(hargaBeli * 1.15);
        }
        namaBarang = line.slice(0, line.indexOf('@')).trim();
      } else {
        // 3. Try to find trailing numbers as price or total
        const priceMatch = line.match(/(?:Rp\.?|rp\.?|=|:|-)?\s*(\d{4,9})/i);
        if (priceMatch) {
          const val = parseInt(priceMatch[1], 10);
          hargaBeli = val;
          hargaJual = Math.round(val * 1.12); // Estimated sell price if not specified
          namaBarang = line.replace(/(?:Rp\.?|rp\.?|=|:|-)?\s*\d{4,9}.*$/i, '').trim();
        }
      }
    }

    // Extract quantity from name if specified like "5 kg", "10 pcs", "3x", "2 box"
    const qtyMatch = namaBarang.match(/(\d+)\s*(?:kg|pcs|x|karton|dus|pack|liter|l|pax|botol|ikatan|ikat|krg|karung)\b/i) 
      || namaBarang.match(/^(\d+)\s*(?:x|\*|\b)/i);
    
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10) || 1;
    }

    // Clean up nama barang
    namaBarang = namaBarang
      .replace(/^[\s\-:=]+|[\s\-:=]+$/g, '')
      .replace(/\s+/g, ' ');

    if (!namaBarang) {
      namaBarang = `Barang Pesanan (${rawLine.slice(0, 15)})`;
    }

    // Default prices if none found
    if (hargaBeli === 0) hargaBeli = 15000;
    if (hargaJual === 0) hargaJual = Math.round(hargaBeli * 1.15);

    results.push({
      namaBarang,
      qty,
      hargaBeli,
      hargaJual,
      toko: defaultToko,
      tujuanDapur: defaultDapur,
      pemasok: defaultPemasok
    });
  }

  return results;
}

function parsePriceValue(valStr: string): number {
  if (!valStr) return 0;
  let clean = valStr.replace(/\./g, '').replace(',', '.');
  let num = parseFloat(clean);
  if (isNaN(num)) return 0;
  // If price is written like "15k" or "25", scale appropriately if < 1000
  if (num < 1000) {
    num = num * 1000;
  }
  return num;
}
