import type { IResult } from "mssql";
import { getPool, sql } from "./db.js";

type Row = Record<string, unknown>;

type EntityConfig = {
  table: string;
  idType: "string" | "int";
  columns: string[];
  orderBy: string;
};

export const ENTITIES = {
  Projects: {
    table: "phub.Projects",
    idType: "string",
    columns: [
      "title",
      "abbrev",
      "portfolio",
      "productArea",
      "owner",
      "sponsor",
      "stage",
      "status",
      "startDate",
      "endDate",
      "summary",
      "outcomeStatement",
      "businessValue",
      "dependencies",
      "fundingSource",
      "projectCode",
      "lastUpdate",
      "lastUpdated"
    ],
    orderBy: "[title]"
  },
  Milestones: {
    table: "phub.Milestones",
    idType: "int",
    columns: ["projectId", "name", "date", "status", "notes"],
    orderBy: "[date], [id]"
  },
  Engagements: {
    table: "phub.Engagements",
    idType: "int",
    columns: [
      "initiativeId",
      "portfolio",
      "site",
      "workArea",
      "team",
      "stage",
      "status",
      "startDate",
      "endDate",
      "purpose",
      "notes"
    ],
    orderBy: "[site], [workArea], [id]"
  },
  Updates: {
    table: "phub.Updates",
    idType: "int",
    columns: ["projectId", "date", "summary", "risks", "decisionsRequired", "submittedBy"],
    orderBy: "[date] DESC, [id] DESC"
  }
} satisfies Record<string, EntityConfig>;

export type EntityName = keyof typeof ENTITIES;

function bindValue(request: sql.Request, name: string, value: unknown): void {
  if (value === undefined) return;
  request.input(name, value === "" ? null : value);
}

function bindId(request: sql.Request, config: EntityConfig, id: string): void {
  if (config.idType === "int") request.input("id", sql.Int, Number(id));
  else request.input("id", sql.NVarChar(100), id);
}

function normalizeRows<T extends Row>(result: IResult<T>): T[] {
  return result.recordset.map((row) => ({ ...row }));
}

export async function listRows(entity: EntityName): Promise<Row[]> {
  const config = ENTITIES[entity];
  const pool = await getPool();
  const result = await pool.request().query<Row>(
    `SELECT * FROM ${config.table} ORDER BY ${config.orderBy}`
  );
  return normalizeRows(result);
}

export async function createRow(entity: EntityName, body: Row): Promise<Row> {
  const config = ENTITIES[entity];
  const columns = config.columns.filter((column) => body[column] !== undefined);
  if (entity === "Projects" && body.id !== undefined) columns.unshift("id");
  if (columns.length === 0) throw new Error(`No fields provided for ${entity}.`);

  const pool = await getPool();
  const request = pool.request();
  for (const column of columns) bindValue(request, column, body[column]);

  const columnList = columns.map((column) => `[${column}]`).join(", ");
  const valueList = columns.map((column) => `@${column}`).join(", ");
  const result = await request.query<Row>(
    `INSERT INTO ${config.table} (${columnList}) OUTPUT INSERTED.* VALUES (${valueList})`
  );
  return normalizeRows(result)[0];
}

export async function patchRow(entity: EntityName, id: string, body: Row): Promise<Row> {
  const config = ENTITIES[entity];
  const columns = config.columns.filter((column) => body[column] !== undefined);
  if (columns.length === 0) throw new Error(`No fields provided for ${entity}.`);

  const pool = await getPool();
  const request = pool.request();
  bindId(request, config, id);
  for (const column of columns) bindValue(request, column, body[column]);

  const setList = columns.map((column) => `[${column}] = @${column}`).join(", ");
  const result = await request.query<Row>(
    `UPDATE ${config.table} SET ${setList} OUTPUT INSERTED.* WHERE [id] = @id`
  );
  const row = normalizeRows(result)[0];
  if (!row) throw new Error(`${entity} record not found: ${id}`);
  return row;
}
