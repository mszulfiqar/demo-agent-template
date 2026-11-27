import { inngest } from "./client";

/** Infrastructure smoke test. Trigger with app/test.background-job. */
export const testBackgroundJob = inngest.createFunction(
  { id: "test-background-job", retries: 3, triggers: [{ event: "app/test.background-job" }] },
  async ({ event, step }) => step.run("process-test-event", async () => ({
    message: "Inngest is connected to the HVAC operations dashboard.",
    receivedAt: new Date().toISOString(),
    payload: event.data,
  }))
);

export const inngestFunctions = [testBackgroundJob];
