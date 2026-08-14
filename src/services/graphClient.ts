/**
 * Microsoft Graph utilities — user search and mail send.
 *
 * sendMail calls POST /v1.0/me/sendMail using the same SWA-acquired token.
 * It requires the Mail.Send delegated permission on the Entra ID app registration.
 *
 * Lightweight Microsoft Graph search utility.
 *
 * Acquires a Graph-scoped access token using the Azure SWA /.auth/me endpoint
 * (available in production) and queries the /v1.0/users search endpoint.
 *
 * When running in Replit (no SWA auth) or when Graph is unavailable for any
 * reason, the function throws and callers should fall back to the local
 * people.json directory.
 */
import type { PersonRef } from "../types/models";

interface SwaAuthClaim {
  typ: string;
  val: string;
}

interface SwaClientPrincipal {
  userId: string;
  userRoles: string[];
  claims: SwaAuthClaim[];
  identityProvider: string;
  accessToken?: string;
}

interface SwaAuthResponse {
  clientPrincipal: SwaClientPrincipal | null;
}

/** Fetch the SWA /.auth/me response to obtain the AAD access token. */
async function getSwaAccessToken(): Promise<string> {
  const res = await fetch("/.auth/me");
  if (!res.ok) throw new Error("SWA auth endpoint unavailable");
  const data: SwaAuthResponse = await res.json();
  const token = data.clientPrincipal?.accessToken;
  if (!token) throw new Error("No access token in SWA auth response");
  return token;
}

interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

interface GraphSearchResponse {
  value: GraphUser[];
}

/**
 * Search Azure AD / Entra ID for users matching `query` (name or email).
 *
 * @throws when Graph is unavailable (caller should fall back to local list)
 */
export async function graphSearchUsers(query: string): Promise<PersonRef[]> {
  if (!query || query.length < 2) return [];

  const token = await getSwaAccessToken();

  const url = `https://graph.microsoft.com/v1.0/users?$search="displayName:${encodeURIComponent(query)}" OR "mail:${encodeURIComponent(query)}"&$top=10&$select=id,displayName,mail,userPrincipalName`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "ConsistencyLevel": "eventual",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /users search failed: ${res.status}${text ? ` — ${text}` : ""}`);
  }

  const data: GraphSearchResponse = await res.json();

  return (data.value ?? []).map((u) => ({
    name: u.displayName ?? "",
    email: u.mail ?? u.userPrincipalName ?? "",
    // corpId derived from the UPN prefix (e.g. "brett.riley@riotinto.com" → "brett.riley")
    corpId: (u.mail ?? u.userPrincipalName ?? "").split("@")[0].toLowerCase(),
  }));
}

// ---------------------------------------------------------------------------
// Mail send
// ---------------------------------------------------------------------------

/**
 * Thrown when the Graph sendMail call is rejected with HTTP 403.
 * This typically means the Entra ID app registration is missing the
 * Mail.Send delegated permission — the user should fall back to mailto.
 */
export class GraphPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphPermissionError";
  }
}

export interface SendMailParams {
  /** Recipient email address */
  to: string;
  subject: string;
  /** Plain-text body */
  body: string;
}

/**
 * Send an email from the signed-in user via Microsoft Graph POST /me/sendMail.
 *
 * Requires the Mail.Send delegated permission on the Entra ID app registration.
 * Throws `GraphPermissionError` when the response is 403 (insufficient permissions).
 * Throws `Error` for all other failures or when Graph is unavailable.
 */
export async function graphSendMail({ to, subject, body }: SendMailParams): Promise<void> {
  const token = await getSwaAccessToken();

  const payload = {
    message: {
      subject,
      body: {
        contentType: "Text",
        content: body,
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
    },
    saveToSentItems: true,
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 403) {
      throw new GraphPermissionError(
        "Mail.Send permission is not granted on this app registration. " +
          "Ask your Azure admin to add the Mail.Send delegated permission, or use your mail client instead."
      );
    }
    throw new Error(`Graph sendMail failed: ${res.status}${text ? ` — ${text}` : ""}`);
  }
}
