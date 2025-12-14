import { env } from "cloudflare:workers";

export const getAccessToken = async (refreshToken: string) => {
  try {
    const body = {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });

    if (!res.ok) {
      throw new Error("failed to refresh token" + res.status);
    }

    const data = (await res.json()) as any;
    return {
      accessToken: data?.access_token as string,
      refreshToken: data?.refresh_token as string,
    };
  } catch (e) {
    throw new Error("failed to refresh token" + e);
  }
};
