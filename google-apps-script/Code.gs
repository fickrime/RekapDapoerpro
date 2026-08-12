const TOKEN = "Gakusah";

function doGet(e) {
  const sheetName = (e && e.parameter && e.parameter.sheet) || "pesanan";
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data[0];
  const rows = data.slice(1)
    .map((row, i) => {
      let obj = { rowIndex: i + 2 };
      headers.forEach((h, idx) => {
        let val = row[idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        }
        obj[h] = val;
      });
      return obj;
    })
    .filter(r => r.ITEM || r.BARANG || r.NO || r.TANGGAL);

  return ContentService.createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Mencegah error 'postData of undefined' saat ditekan Run di editor Apps Script
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: "JANGAN menekan tombol 'Run' pada doPost di editor Apps Script! Fungsi ini berjalan otomatis dari aplikasi Web/HP." 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid JSON format" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (body.token !== TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: "unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheetName = body.sheet || "pesanan";
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(sheetName);

  // Buat sheet & header default jika sheet belum ada di Google Sheets
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "pesanan") {
      sheet.appendRow(["NO", "DAPUR", "ITEM", "DATE", "QTY", "TOKO", "PAYMENT", "DILEVERY", "H. JUAL", "H. BELI"]);
    } else if (sheetName === "transaksi") {
      sheet.appendRow(["TANGGAL", "PEMASOK", "BARANG", "TOKO", "QTY", "H. BELI", "TOTAL", "STATUS"]);
    }
  }

  const lastCol = sheet.getLastColumn();
  let headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  // ACTION: UPDATE
  if (body.action === "update") {
    const colIndex = headers.indexOf(body.column) + 1;
    if (colIndex > 0 && body.rowIndex) {
      sheet.getRange(body.rowIndex, colIndex).setValue(body.value);

      if (sheetName === "transaksi" && (body.column === "QTY" || body.column === "H. BELI")) {
        const qtyCol = headers.indexOf("QTY") + 1;
        const hbeliCol = headers.indexOf("H. BELI") + 1;
        const totalCol = headers.indexOf("TOTAL") + 1;
        if (qtyCol > 0 && hbeliCol > 0 && totalCol > 0) {
          const qty = Number(sheet.getRange(body.rowIndex, qtyCol).getValue()) || 0;
          const hbeli = Number(sheet.getRange(body.rowIndex, hbeliCol).getValue()) || 0;
          sheet.getRange(body.rowIndex, totalCol).setValue(qty * hbeli);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ACTION: ADD
  if (body.action === "add") {
    const dataObj = body.data || {};
    
    // Jika sheet belum punya header, gunakan key dari dataObj
    if (headers.length === 0) {
      headers = Object.keys(dataObj);
      sheet.appendRow(headers);
    }

    const lastRow = sheet.getLastRow() + 1;
    const newRow = headers.map(h => {
      if (h === "NO") {
        return dataObj["NO"] || (lastRow - 1);
      }
      if (h === "TOTAL" && sheetName === "transaksi") {
        const qty = Number(dataObj["QTY"]) || 0;
        const hbeli = Number(dataObj["H. BELI"]) || 0;
        return dataObj["TOTAL"] !== undefined ? dataObj["TOTAL"] : (qty * hbeli);
      }
      const val = dataObj[h];
      return (val !== undefined && val !== null) ? val : "";
    });

    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({ success: true, rowIndex: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ACTION: DELETE
  if (body.action === "delete") {
    if (body.rowIndex && body.rowIndex >= 2) {
      sheet.deleteRow(body.rowIndex);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ error: "unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}
