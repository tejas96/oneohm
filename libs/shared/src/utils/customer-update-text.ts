/**
 * The one-line update a customer gets on WhatsApp when a step is done.
 *
 * It travels as the {{update}} parameter of the `project_step_update` template,
 * and Meta refuses a parameter that holds a new line, a tab or a run of four or
 * more spaces. The admin form and the backend both check with these, so the form
 * refuses exactly what the API would.
 */
export const CUSTOMER_UPDATE_TEXT_MAX = 200;

/** Trim, and drop trailing full stops: the template adds its own. */
export function normalizeCustomerUpdateText(text: string | null | undefined): string | null {
  const cleaned = (text ?? '').trim().replace(/\.+$/, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Why Meta would refuse this text, or null when it is fine. */
export function customerUpdateTextProblem(text: string): string | null {
  if (text.length > CUSTOMER_UPDATE_TEXT_MAX) {
    return `Keep the update to ${CUSTOMER_UPDATE_TEXT_MAX} characters`;
  }
  if (/[\r\n]/.test(text)) return 'Write the update on one line';
  if (/\t/.test(text)) return 'Remove the tab from the update';
  if (/ {4,}/.test(text)) return 'Remove the extra spaces from the update';
  return null;
}
