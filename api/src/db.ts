import sql from "mssql";

let poolPromise: Promise<sql.ConnectionPool> | undefined;

export function getPool(): Promise<sql.ConnectionPool> {
  const connectionString = process.env.SQL_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Missing SQL_CONNECTION_STRING app setting.");
  }

  poolPromise ??= new sql.ConnectionPool(connectionString).connect();
  return poolPromise;
}

export { sql };
