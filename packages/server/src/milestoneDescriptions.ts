const MILESTONE_DESCRIPTION_KEY = /^Milestone ([1-9]|10)$/;

export function isMilestoneDescriptionKey(value: string): boolean {
  return MILESTONE_DESCRIPTION_KEY.test(value);
}
