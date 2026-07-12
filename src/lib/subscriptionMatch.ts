import type { Story } from '../api/firebase.js';

/** OR across the two thresholds; 0 disables a side. Both 0 = match everything (today's default). */
export function passesThreshold(story: Story, minPoints: number, minComments: number): boolean {
  if (minPoints === 0 && minComments === 0) return true;
  const pointsOk = minPoints > 0 && story.score >= minPoints;
  const commentsOk = minComments > 0 && story.descendants >= minComments;
  return pointsOk || commentsOk;
}
