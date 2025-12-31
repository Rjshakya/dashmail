import { Credentials, OAuth2Client } from "google-auth-library";
import { calendar } from "@googleapis/calendar";
import { execAsync } from "../utils/general";
import { env } from "cloudflare:workers";

interface Ieventdate {
  dateTime: string;
  timeZone: string;
}

interface IcreateEvent {
  summary: string;
  description: string;
  start: Ieventdate;
  end: Ieventdate;
}

export class GCalenderManager {
  private auth: OAuth2Client;

  constructor(tokens: Credentials) {
    this.auth = new OAuth2Client();
    this.auth.credentials.access_token = tokens.access_token;
    this.auth.credentials.refresh_token = tokens.refresh_token;
    this.auth._clientId = env.GOOGLE_CLIENT_ID;
    this.auth._clientSecret=env.GOOGLE_CLIENT_SECRET
  }

  async createEvent(params: IcreateEvent) {
    return execAsync("createEvent", async () => {
      const { summary, description, end, start } = params;
      const event = await calendar({ version: "v3", auth: this.auth }).events.insert({
        calendarId: "primary",
        requestBody: { summary, description, start, end },
        sendUpdates: "all",
      });

      return event.data.id;
    });
  }
}
