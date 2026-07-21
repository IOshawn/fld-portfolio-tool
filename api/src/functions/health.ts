import { app, HttpResponseInit } from "@azure/functions";

app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (): Promise<HttpResponseInit> => ({
    status: 200,
    jsonBody: {
      ok: true,
      service: "frontline-portfolio-hub-api"
    }
  })
});
