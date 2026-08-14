/**
 * useExportCsv — utility hook for downloading data as a CSV file.
 * Builds a data: URI and triggers a synthetic anchor click.
 */

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(escapeCsvCell).join(",");
  const dataRows = rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(","));
  return [headerRow, ...dataRows].join("\r\n");
}

export function downloadCsv(
  rows: Record<string, string | number | null | undefined>[],
  filename: string
): void {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
