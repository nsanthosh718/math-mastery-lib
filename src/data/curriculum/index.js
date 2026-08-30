import kindergarten from './kindergarten.json';
import grade5 from './grade5.json';

/**
 * Curriculum registry. Content lives entirely in the JSON files beside this one —
 * add or edit a week there and nothing in the app needs to change. To add a third
 * track (a 2nd grader, say), drop in a JSON file with the same shape and register
 * it here.
 */
export const TRACKS = { kindergarten, grade5 };

export const TRACK_LIST = Object.values(TRACKS);

export function getTrack(trackId) {
  const track = TRACKS[trackId];
  if (!track) throw new Error(`Unknown curriculum track: ${trackId}`);
  return track;
}

export function getWeek(trackId, weekNumber) {
  return getTrack(trackId).weeks.find((w) => w.week === weekNumber);
}

export function allProblems(track) {
  return track.weeks.flatMap((w) => w.problems);
}

/** The reasoning-vs-theory balance the brief targets at roughly 80/20. */
export function strandBalance(track) {
  const problems = allProblems(track);
  const theory = problems.filter((p) => p.strand === 'theory').length;
  const reasoning = problems.length - theory;
  return {
    total: problems.length,
    theory,
    reasoning,
    reasoningShare: problems.length === 0 ? 0 : reasoning / problems.length,
  };
}
