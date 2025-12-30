import { env } from "cloudflare:workers";
import { CreateEmailOptions, Resend } from "resend";
import { SendEmailOptions, Unosend } from "@unosend/node";

export interface IsendEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

export const resend = () => new Resend(env.RESEND_API_KEY);
export const unosend = () => new Unosend(env.UNOSEND_API_KEY);
export const sendEmail = async (params: CreateEmailOptions) => {
  try {
    const mailClient = resend();
    const { data } = await mailClient.emails.send(params);
    return data?.id;
  } catch (e) {
    console.error(e);
    throw new Error("failed to send email");
  }
};

export const unosendEmail = async (params: SendEmailOptions) => {
  // dashmail.planetform.xyz

  const client = unosend();
  const { data, error } = await client.emails.send(params);
  if (error) {
    console.error("Failed to send:", error.message);
    return null;
  }

  console.log("Email sent:", data?.id);
  return data;
};

export const unosendEmailBatch = async (params: SendEmailOptions[]) => {
  const client = unosend();
  const { data, error } = await client.emails.batch(params)
  if (error) {
    console.error("Failed to send:", error.message);
    return null;
  }

  console.log("Email sent:", data?.success_count);
  return data;
};
