import { defineExtension } from "@earendil-works/pi-durable";
import { DeliverScheduledInstruction } from "./delivery.ts";
import { scheduleTool } from "./tool.ts";

export const scheduleExtension = defineExtension({
  name: "schedule",
  tasks: [DeliverScheduledInstruction],
  tools: [scheduleTool],
});
