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

/** Starts durable processing after owner approval. Calendar/SMS actions await provider setup. */
export const appointmentApprovedWorkflow = inngest.createFunction(
  { id: "appointment-approved-workflow", retries: 5, triggers: [{ event: "hvac/appointment.approved" }] },
  async ({ event, step }) => step.run("record-approval-workflow-started", async () => ({
    appointmentId: event.data.appointmentId,
    technicianId: event.data.technicianId,
    acceptedAt: new Date().toISOString(),
    nextAction: "calendar_booking_integration_required",
  }))
);

export const inngestFunctions = [testBackgroundJob, appointmentApprovedWorkflow];
