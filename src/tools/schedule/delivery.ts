import { type ConversationId, defineDoc, defineTask } from "@earendil-works/pi-durable";
import { formatScheduledInstruction } from "../../protocol.ts";
import type { ScheduleRecurrence } from "./recurrence.ts";

/** Durable input of one scheduled delivery. */
export type ScheduledInstruction = {
  readonly id: string;
  readonly conversationId: ConversationId;
  readonly instruction: string;
  /** Unix timestamp in milliseconds. */
  readonly runAt: number;
  readonly recurrence?: ScheduleRecurrence;
};

type DeliveryState = { phase: "wait" } | { phase: "mark" } | { phase: "deliver" };

/** Deliveries currently running, so `schedule` can reject accidental recursion. */
export const ScheduleDeliveries = defineDoc<{
  active: Array<{
    scheduleId: string;
    conversationId: ConversationId;
    instruction: string;
    runAt: number;
    recurrence?: ScheduleRecurrence;
    successor?: ScheduledInstruction;
  }>;
}>({
  kind: "app.schedule-deliveries",
  version: 1,
  scope: "session",
  initial: () => ({ active: [] }),
  // Changed by every delivery for the life of the session: store a small base whenever none is active, as the
  // built-in inbox does, so replay stays short.
  checkpointWhen: (value) => value.active.length === 0,
});

export const DeliverScheduledInstruction = defineTask<ScheduledInstruction, DeliveryState, null>({
  name: "app.deliver-scheduled-instruction",
  version: 1,
  initial: () => ({ phase: "wait" }),
  phases: {
    // A durable sleep: the task holds no invocation until runAt, and `onWake` moves the alarm.
    wait: (task, runtime, context) =>
      runtime.sleepUntil(task.input.runAt, { phase: "mark" }, context),
    mark: async (task, runtime, context) => {
      await runtime.commit(async (tx) => {
        const deliveries = await tx.doc(ScheduleDeliveries);
        if (!deliveries.active.some(({ scheduleId }) => scheduleId === task.input.id)) {
          deliveries.active.push({
            scheduleId: task.input.id,
            conversationId: task.input.conversationId,
            instruction: task.input.instruction,
            runAt: task.input.runAt,
            ...(task.input.recurrence === undefined ? {} : { recurrence: task.input.recurrence }),
          });
        }
        return { status: "running", checkpoint: { phase: "deliver" } };
      }, context);
    },
    deliver: async (task, runtime, context) => {
      try {
        const conversation = await runtime.conversation(task.input.conversationId, context);
        if (conversation !== undefined) {
          const submission = await conversation.submit(
            {
              type: "input",
              content: formatScheduledInstruction(task.input),
              requestId: task.input.id,
              whenBusy: "followUp",
            },
            context,
          );
          await submission.wait(context);
        } else {
          runtime.report(
            new Error(
              `Scheduled instruction ${task.input.id} conversation ${task.input.conversationId} is missing`,
            ),
          );
        }
      } finally {
        await runtime.commit(async (tx) => {
          removeDelivery(await tx.doc(ScheduleDeliveries), task.input.id);
          return { status: "running", checkpoint: { phase: "deliver" } };
        }, context);
      }

      await runtime.commit(
        () => ({ status: "terminal", outcome: { status: "completed", result: null } }),
        context,
      );
    },
  },
  abort: async (task, runtime, context) => {
    await runtime.commit(async (tx) => {
      removeDelivery(await tx.doc(ScheduleDeliveries), task.input.id);
      return { status: "terminal", outcome: { status: "aborted" } };
    }, context);
  },
});

const removeDelivery = (
  deliveries: { active: Array<{ scheduleId: string }> },
  scheduleId: string,
): void => {
  const index = deliveries.active.findIndex((delivery) => delivery.scheduleId === scheduleId);
  if (index !== -1) deliveries.active.splice(index, 1);
};
