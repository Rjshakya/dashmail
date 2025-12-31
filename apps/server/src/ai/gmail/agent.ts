import { Agent } from "agents";
import { generateText, Experimental_Agent as AiAgent, Output, stepCountIs } from "ai";
import { getModelWithFallback, handleNoObjectError } from "../../utils/ai-utils";
import { openRouterModels } from "../../utils/models";
import z from "zod";
import { FinalMessageSystemPrompt } from "../aggregator/prompt";
import { FinalMessageSchema } from "../aggregator/schema";
import { GCalenderManager } from "../../services/google.calender";
import { Credentials } from "google-auth-library";

interface IGmailAgentState {
  expense: number;
}

interface Irun {
  prompt: string;
  model: string;
  tokens: Credentials;
}

const createCalenderEventSchema = z.object({
  summary: z.string("title of event"),
  description: z.string("description of event"),
  start: z.object({
    dateTime: z.string("date in ISOstring format for google calender event"),
    timeZone: z.string("time zone for event"),
  }),
  end: z.object({
    dateTime: z.string("date in ISOstring format for google calender event"),
    timeZone: z.string("time zone for event"),
  }),
});

type TcreateCalenderEventSchema = z.infer<typeof createCalenderEventSchema>;

export class GmailAgent extends Agent<Cloudflare.Env, IGmailAgentState> {
  initialState: IGmailAgentState = {
    expense: 0,
  };

  async run({ model, prompt, tokens }: Irun) {
    try {
      const calender = new GCalenderManager(tokens);
      const { text } = await this.agent(model, calender).generate({
        prompt,
      });
      return text;
    } catch (e) {
      handleNoObjectError(e);
    }
  }

  agent(model: string, calender: GCalenderManager) {
    const _agent = new AiAgent({
      model: getModelWithFallback(model),
      system: FinalMessageSystemPrompt,
      tools: {
        getExpense: {
          name: "getExpense",
          description: "get expense of user",
          inputSchema: z.object({}),
          execute: () => {
            return this.state.expense;
          },
        },
        addExpense: {
          name: "addExpense",
          description: "add expense for user",
          inputSchema: z.object({ expense: z.number() }),
          execute: async ({ expense }) => {
            const _expense = this.state.expense + expense;
            this.setState({ expense: _expense });
            return { output: _expense };
          },
        },
        subtractExpanse: {
          name: "subtractExpanse",
          description: "subtract expense for user",
          inputSchema: z.object({ expense: z.number() }),
          execute: ({ expense }) => {
            const _expense = this.state.expense - expense < 0 ? 0 : this.state.expense - expense;
            this.setState({ expense: _expense });
            return { output: _expense };
          },
        },
        getCurrentTime: {
          name: "getCurrentTime",
          description: "Get current time in ISOstring",
          inputSchema: z.object({}),
          execute: () => {
            const time = new Date();
            return { output: time.toISOString() };
          },
        },
        createCalenderEvent: {
          name: "createCalenderEvent",
          description: "Create a event in user's google calender",
          inputSchema: createCalenderEventSchema,
          execute: async (params: TcreateCalenderEventSchema) => {
            console.log(params);
            const eventId = await calender.createEvent(params);
            return { output: `event created id:${eventId}` };
          },
        },
      },
      toolChoice: "auto",
      stopWhen: stepCountIs(20),
    });
    return _agent;
  }
}
