import { randomUUID } from "node:crypto";
import type { IResult, Transaction } from "mssql";
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
      "nOrPCode",
      "sites",
      "projectStages",
      "ownerEmail",
      "ownerCorpId",
      "sponsorEmail",
      "sponsorCorpId",
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
    columns: ["projectId", "date", "summary", "risks", "decisionsRequired", "submittedBy", "submittedByEmail", "submittedByCorpId"],
    orderBy: "[date] DESC, [id] DESC"
  },
  TravelEntries: {
    table: "phub.TravelEntries",
    idType: "int",
    columns: [
      "person",
      "personEmail",
      "personCorpId",
      "initiativeId",
      "site",
      "workArea",
      "team",
      "departureDate",
      "returnDate",
      "flightNumber",
      "description",
      "status",
      "associatedWith"
    ],
    orderBy: "[departureDate], [id]"
  },
  QuarterlyMilestones: {
    table: "phub.QuarterlyMilestones",
    idType: "string",
    columns: ["portfolioArea", "subGroup", "initiative", "initiativeDescription", "milestone", "targetDate", "dateLabel", "notes"],
    orderBy: "[targetDate], [initiative], [id]"
  }
} satisfies Record<string, EntityConfig>;

export type EntityName = keyof typeof ENTITIES;

function dbValue(name: string, value: unknown): unknown {
  if (Array.isArray(value)) return name === "projectStages" ? JSON.stringify(value) : value.join(";");
  return value;
}

function bindValue(request: sql.Request, name: string, value: unknown): void {
  if (value === undefined) return;
  const normalized = dbValue(name, value);
  request.input(name, normalized === "" ? null : normalized);
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
  if ((entity === "Projects" || entity === "QuarterlyMilestones") && body.id === undefined) {
    body = { ...body, id: entity === "Projects" ? randomUUID() : `qm-${randomUUID()}` };
  }
  const columns = config.columns.filter((column) => body[column] !== undefined);
  if ((entity === "Projects" || entity === "QuarterlyMilestones") && body.id !== undefined) columns.unshift("id");
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

export async function getPortfolio(): Promise<Record<string, Row[]>> {
  const [projects, milestones, engagements, updates, travelEntries] = await Promise.all([
    listRows("Projects"), listRows("Milestones"), listRows("Engagements"), listRows("Updates"), listRows("TravelEntries")
  ]);
  return { projects, milestones, engagements, updates, travelEntries };
}

export async function createProjectUpdate(body: Row): Promise<{ update: Row; project: Row }> {
  const projectId = String(body.projectId ?? "");
  if (!projectId || !String(body.summary ?? "").trim()) throw new Error("projectId and summary are required.");
  const pool = await getPool();
  const transaction: Transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const updateRequest = new sql.Request(transaction);
    for (const column of ENTITIES.Updates.columns) bindValue(updateRequest, column, body[column]);
    const updateColumns = ENTITIES.Updates.columns.filter((column) => body[column] !== undefined);
    const updateResult = await updateRequest.query<Row>(
      `INSERT INTO phub.Updates (${updateColumns.map((column) => `[${column}]`).join(", ")}) OUTPUT INSERTED.* VALUES (${updateColumns.map((column) => `@${column}`).join(", ")})`
    );
    const projectRequest = new sql.Request(transaction);
    projectRequest.input("id", sql.NVarChar(100), projectId);
    projectRequest.input("lastUpdate", body.summary);
    projectRequest.input("lastUpdated", body.date || new Date().toISOString().slice(0, 10));
    if (body.newStatus !== undefined) projectRequest.input("status", body.newStatus);
    if (body.newStage !== undefined) projectRequest.input("stage", body.newStage);
    const setColumns = ["[lastUpdate] = @lastUpdate", "[lastUpdated] = @lastUpdated"];
    if (body.newStatus !== undefined) setColumns.push("[status] = @status");
    if (body.newStage !== undefined) setColumns.push("[stage] = @stage");
    const projectResult = await projectRequest.query<Row>(`UPDATE phub.Projects SET ${setColumns.join(", ")} OUTPUT INSERTED.* WHERE [id] = @id`);
    const project = normalizeRows(projectResult)[0];
    if (!project) throw new Error(`Projects record not found: ${projectId}`);
    await transaction.commit();
    return { update: normalizeRows(updateResult)[0], project };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deleteRow(entity: EntityName, id: string): Promise<void> {
  const config = ENTITIES[entity];
  const pool = await getPool();
  const request = pool.request();
  bindId(request, config, id);

  const result = await request.query(`DELETE FROM ${config.table} WHERE [id] = @id`);
  if ((result.rowsAffected[0] ?? 0) === 0) {
    throw new Error(`${entity} record not found: ${id}`);
  }
}
