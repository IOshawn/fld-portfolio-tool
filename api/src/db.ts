import sql from "mssql";

let poolPromise: Promise<sql.ConnectionPool> | undefined;

function createConfig(connectionString: string): sql.config {
  const config = sql.ConnectionPool.parseConnectionString(connectionString);
  const authentication = connectionString.match(/Authentication\s*=\s*"?([^;"]+)/i)?.[1]?.toLowerCase();

  if (authentication?.includes("active directory")) {
    delete config.user;
    delete config.password;

    config.authentication = {
      type: "azure-active-directory-default",
      options: {},
    };
  }

  return config;
}

export function getPool(): Promise<sql.ConnectionPool> {
  const connectionString = process.env.SQL_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Missing SQL_CONNECTION_STRING app setting.");
  }

  poolPromise ??= new sql.ConnectionPool(createConfig(connectionString)).connect();
  return poolPromise;
}

export { sql };
