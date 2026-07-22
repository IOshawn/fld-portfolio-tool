import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createRow, deleteRow, EntityName, ENTITIES, listRows, patchRow } from "../sqlRepository.js";
import { errorResponse, json } from "../http.js";

function getEntity(name: string): EntityName {
  if (name in ENTITIES) return name as EntityName;
  throw new Error(`Unknown entity: ${name}`);
}

async function readBody(request: HttpRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

async function listHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const entity = getEntity(request.params.entity);
    context.log(`Listing ${entity}`);
    return json(await listRows(entity));
  } catch (error) {
    context.error(error);
    return errorResponse(error);
  }
}

async function createHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const entity = getEntity(request.params.entity);
    const body = await readBody(request);
    context.log(`Creating ${entity}`);
    return json(await createRow(entity, body), 201);
  } catch (error) {
    context.error(error);
    return errorResponse(error);
  }
}

async function patchHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const entity = getEntity(request.params.entity);
    const body = await readBody(request);
    context.log(`Patching ${entity}/${request.params.id}`);
    return json(await patchRow(entity, request.params.id, body));
  } catch (error) {
    context.error(error);
    return errorResponse(error);
  }
}

async function deleteHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const entity = getEntity(request.params.entity);
    context.log(`Deleting ${entity}/${request.params.id}`);
    await deleteRow(entity, request.params.id);
    return { status: 204 };
  } catch (error) {
    context.error(error);
    return errorResponse(error);
  }
}

app.http("listEntities", {
  route: "{entity}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: listHandler
});

app.http("createEntity", {
  route: "{entity}",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createHandler
});

app.http("patchEntity", {
  route: "{entity}/{id}",
  methods: ["PATCH"],
  authLevel: "anonymous",
  handler: patchHandler
});

app.http("deleteEntity", {
  route: "{entity}/{id}",
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: deleteHandler
});
