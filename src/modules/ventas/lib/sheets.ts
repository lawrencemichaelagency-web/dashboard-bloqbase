import { google } from "googleapis";
import type { LeadProspeccion } from "./types";

const SHEET_IDS = {
  linkedin: "10C0BWxKDX4fzcyyzbSyfxfWOPnoTKg9aioSgipQ0Ok0",
  // "Partners" y "Subvenciones" viven en el mismo spreadsheet (pestañas distintas)
  partners: "1hh8O5RKvoO2fRP7eGvpqHAAHEcprJrLWtjwdWt9XQvw",
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
  const nonEmpty = (rows: string[][]) => rows.slice(1).filter((row) => row.length > 0 && row.some((cell) => cell?.trim()));

  // LinkedIn: Link perfil(0) / Fecha envío(1) / Nombre(2) / Empresa(3) / ... / Respondió(8)
  const linkedin: LeadProspeccion[] = nonEmpty(input.linkedin).map((row) => ({
    fuente: "linkedin",
    fecha: row[1] || "",
    empresa: row[3] || row[2] || "",
    estado: row[8] ? `Respondió (${row[9] || "sin clasificar"})` : "Contactado",
  }));

  // Partnerships - Aliados: Fecha(0) / Empresa(1) / Tipo(2) / ... / Estado(11)
  const partners: LeadProspeccion[] = nonEmpty(input.partners).map((row) => ({
    fuente: "partners",
    fecha: row[0] || "",
    empresa: row[1] || "",
    estado: row[11] || "",
  }));

  // Ayudas: ID(0) / Fuente(1) / Tipo(2) / Nombre(3) / ... / Fecha límite(9) / ... / Estado(13) / Fecha añadido(14)
  const subvenciones: LeadProspeccion[] = nonEmpty(input.subvenciones).map((row) => ({
    fuente: "subvenciones",
    fecha: row[14] || "",
    empresa: row[3] || "",
    estado: row[13] || "",
  }));

  return [...linkedin, ...partners, ...subvenciones];
}

export async function fetchProspeccionSnapshot(): Promise<LeadProspeccion[]> {
  const [linkedin, partners, subvenciones] = await Promise.all([
    readSheetValues(SHEET_IDS.linkedin, "Prospección!A1:L5000"),
    readSheetValues(SHEET_IDS.partners, "'Partnerships - Aliados'!A1:M2000"),
    readSheetValues(SHEET_IDS.subvenciones, "Ayudas!A1:Z5000"),
  ]);
  return normalizeProspeccionRows({ linkedin, partners, subvenciones });
}
