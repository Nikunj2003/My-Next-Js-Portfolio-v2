/** The chat route caps a message at 1200 characters; the prefix counts toward it. */
const MAX_MESSAGE = 1200;
const PREFIX = "Here is a role I'm hiring for. In a few lines, how does Nikunj's work fit it, and where are the gaps? Role: ";
export const MAX_ROLE_LENGTH = MAX_MESSAGE - PREFIX.length;

/** The question sent to Nex for a pasted role, always within the route's limit. */
export function roleFitQuestion(role: string) {
  return PREFIX + role.trim().slice(0, MAX_ROLE_LENGTH);
}
