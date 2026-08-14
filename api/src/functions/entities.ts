import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createProjectUpdate, createRow, deleteRow, EntityName, ENTITIES, getPortfolio, listRows, patchRow } from "../sqlRepository.js";
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

const RESOURCE_ENTITIES = {
  "projects": "Projects",
  "milestones": "Milestones",
  "engagements": "Engagements",
  "travel-entries": "TravelEntries",
  "quarterly-milestones": "QuarterlyMilestones",
} as const satisfies Record<string, EntityName>;

async function resourceHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const resource = request.params.resource;
    const entity = RESOURCE_ENTITIES[resource as keyof typeof RESOURCE_ENTITIES];
    if (!entity) return json({ error: "Unknown resource." }, 404);
    const id = request.params.id;
    switch (request.method) {
      case "GET":
        if (id) return json({ error: "GET by id is not supported." }, 405);
        return json(await listRows(entity));
      case "POST":
        return json(await createRow(entity, await readBody(request)), 201);
      case "PATCH":
        if (!id) return json({ error: "An id is required." }, 400);
        return json(await patchRow(entity, id, await readBody(request)));
      case "DELETE":
        if (!id) return json({ error: "An id is required." }, 400);
        await deleteRow(entity, id);
        return { status: 204 };
      default:
        return json({ error: "Method not allowed." }, 405);
    }
  } catch (error) {
    context.error(error);
    return errorResponse(error);
  }
}

app.http("portfolio", {
  route: "portfolio",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (_request, context) => {
    try { return json(await getPortfolio()); }
    catch (error) { context.error(error); return errorResponse(error); }
  }
});

app.http("projectUpdates", {
  route: "project-updates",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try { return json(await createProjectUpdate(await readBody(request)), 201); }
    catch (error) { context.error(error); return errorResponse(error); }
  }
});

app.http("resourceCollection", {
  route: "{resource:alpha}",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: resourceHandler
});

app.http("resourceItem", {
  route: "{resource:alpha}/{id}",
  methods: ["PATCH", "DELETE"],
  authLevel: "anonymous",
  handler: resourceHandler
});
