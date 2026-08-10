import { parse } from "csv-parse/sync";

export interface CsvInternRow {
  name: string;
  email: string;
  department: string;
}

export function parseInternCsv(buffer: Buffer): CsvInternRow[] {
  const records = parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((r) => ({
    name: r.name ?? "",
    email: r.email ?? "",
    department: r.department ?? "",
  }));
}
