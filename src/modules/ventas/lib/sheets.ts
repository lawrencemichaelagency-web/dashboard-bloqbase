import { google } from "googleapis";
import type { LeadProspeccion } from "./types";

const SHEET_IDS = {
  linkedin: "10cd7J-eTxuSkVesO2Jg0HmeecKzO8yfBG0EmbHjbZIE",
  partners: "1hAmRjkgxUplEPIkIHClGnlISwYlh41reQZzdYI_IWBY",
  subvenciones: "1hh8O5RKvoO2fRP7eGvpqHAAHEcprJrLWtjwdWt9XQvw",
} as const;

function getAuth() {
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
  if (!keyB64) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_B64 no está definida.");
  const credentials = JSON.parse(Buffer.from(keyB64, "base64").toString("utf8"));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function readSheetValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values as string[][]) ?? [];
}

export function normalizeProspeccionRows(input: {
  linkedin: string[][];
  partners: string[][];
  subvenciones: string[][];
}): LeadProspeccion[] {
  const parse = (rows: string[][], fuente: LeadProspeccion["fuente"]): LeadProspeccion[] =>
    rows
      .slice(1) // skip header row
      .filter((row) => row.length > 0 && row.some((cell) => cell?.trim()))
      .map((row) => ({
        fuente,
        fecha: row[0] ?? "",
        empresa: row[1] ?? "",
        estado: row[2] ?? "",
      }));

  return [
    ...parse(input.linkedin, "linkedin"),
    ...parse(input.partners, "partners"),
    ...parse(input.subvenciones, "subvenciones"),
  ];
}

export async function fetchProspeccionSnapshot(): Promise<LeadProspeccion[]> {
  const [linkedin, partners, subvenciones] = await Promise.all([
    readSheetValues(SHEET_IDS.linkedin, "Prospección!A1:L5000"),
    readSheetValues(SHEET_IDS.partners, "'Partnerships - Aliados'!A1:M2000"),
    readSheetValues(SHEET_IDS.subvenciones, "Ayudas!A1:Z5000"),
  ]);
  return normalizeProspeccionRows({ linkedin, partners, subvenciones });
}
