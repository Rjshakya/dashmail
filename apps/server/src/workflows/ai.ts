import { WorkflowEntrypoint } from "cloudflare:workers";


interface AIGistWorkflowInput {
    
}

export class AIGistWorkflow extends WorkflowEntrypoint {
  async run(
    event: Readonly<CloudflareWorkersModule.WorkflowEvent<unknown>>,
    step: CloudflareWorkersModule.WorkflowStep
  ) {



  }
}
