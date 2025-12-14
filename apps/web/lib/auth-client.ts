import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
});

export const signIn = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: process.env.NEXT_PUBLIC_CLIENT_URL + "/dashboard",
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
  });
};

export const signOut = async () => {
  await authClient.signOut({
    fetchOptions: {
      onSuccess(ctx) {
        window.location.href = process.env.NEXT_PUBLIC_CLIENT_URL + "/auth";
      },
    },
  });
};
