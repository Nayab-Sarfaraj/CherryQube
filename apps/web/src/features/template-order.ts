import { orderTemplates } from "@greetings/shared";
import type { Template } from "@greetings/remotion/templates";

export { orderTemplates };

export function orderTemplateRegistry(templates: Template[], now = new Date()) {
  return orderTemplates(templates, now);
}
