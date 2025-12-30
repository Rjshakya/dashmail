import { env } from "cloudflare:workers";
import { ThreadSummarySchema } from "../ai/summary/schema";
import { execAsync } from "./general";
import { financialDocument } from "../ai/finance/schema";

export interface IUIData {
  summaries: ThreadSummarySchema[];
  financial: financialDocument[];
  metaData: any;
}

export interface IkvPair {
  key: string;
  value: string;
  base64?: boolean;
  expiration?: number;
  expiration_ttl?: number;
}

export const saveUIData = async (params: IUIData, userId: string, expiration_ttl?: number) => {
  const kvPairs = Object.entries(params).map(([k, v]) => {
    console.log(v);

    return {
      key: `dashmail:${userId}:${k}`,
      value: JSON.stringify(v, null, 2) || "[]",
      expiration_ttl,
    } satisfies IkvPair;
  });

  console.log(kvPairs);

  await kvBulkWrite(kvPairs, "7b0eeaf5827a4b219c4524602b552834");
};

export const getUIData = async (userId: string) => {
  return execAsync("getUIData", async () => {
    const res = await kvBulkRead(
      [
        `dashmail:${userId}:summaries`,
        `dashmail:${userId}:financial`,
        `dashmail:${userId}:metaData`,
      ],
      "7b0eeaf5827a4b219c4524602b552834",
    );
    const values = {
      summaries: [] as ThreadSummarySchema[],
      financial: [] as financialDocument[],
      metaData: [] as any,
    };

    Object.entries(res?.result?.values).forEach(([k, v]: [string, any]) => {
      const parsedValue = v ? JSON.parse(v || "") : "";
      if (k.includes("summaries")) {
        values.summaries = parsedValue;
      }

      if (k.includes("financial")) {
        values.financial = parsedValue;
      }

      if (k.includes("metaData")) {
        values.metaData = parsedValue;
      }
    });

    return values;
  });
};

const kvBulkWrite = async (kvPairs: IkvPair[], namespaceID: string) => {
  return execAsync("kvBulkWrite", async () => {
    console.log("body", JSON.stringify(kvPairs));

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACC_ID}/storage/kv/namespaces/${namespaceID}/bulk`,
      {
        headers: {
          Authorization: `Bearer ${env.CF_KV_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kvPairs),
        method: "PUT",
      },
    );

    if (!res.ok) {
      console.log(res.status);
      console.log(res.statusText);

      throw new Error("failed to kvBulkWrite");
    }

    return true;
  });
};

const kvBulkRead = async (keys: string[], namespaceID: string) => {
  return execAsync("kvBulkRead", async () => {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACC_ID}/storage/kv/namespaces/${namespaceID}/bulk/get`,
      {
        headers: {
          Authorization: `Bearer ${env.CF_KV_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keys }),
        method: "POST",
      },
    );

    if (!res.ok) return;
    const json = (await res.json()) as any;
    return json;
  });
};
