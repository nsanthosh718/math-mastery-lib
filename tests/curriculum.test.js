import { describe, it, expect } from 'vitest';
import { TRACK_LIST, getTrack, allProblems, strandBalance } from '../src/data/curriculum/index.js';

describe('curriculum content', () => {
  it('ships both tracks with twelve weeks each', () => {
    expect(TRACK_LIST).toHaveLength(2);
    for (const track of TRACK_LIST) {
      expect(track.weeks).toHaveLength(12);
      expect(track.weeks.map((w) => w.week)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
    }
  });

  it('gives every week 4-5+ problems and a stated big idea', () => {
    for (const track of TRACK_LIST) {
      for (const week of track.weeks) {
        expect(week.problems.length).toBeGreaterThanOrEqual(4);
        expect(week.theme).toBeTruthy();
        expect(week.bigIdea).toBeTruthy();
        expect(week.mentalMath.strategy).toBeTruthy();
      }
    }
  });

  it('holds the 80/20 reasoning-to-theory balance the brief asks for', () => {
    for (const track of TRACK_LIST) {
      const balance = strandBalance(track);
      expect(balance.reasoningShare).toBeGreaterThanOrEqual(0.78);
      expect(balance.reasoningShare).toBeLessThanOrEqual(0.86);
    }
  });

  it('gives every problem a worked answer key with reasoning, not just an answer', () => {
    for (const track of TRACK_LIST) {
      for (const problem of allProblems(track)) {
        expect(problem.answerKey.answer, `${problem.id} answer`).toBeTruthy();
        expect(problem.answerKey.approaches.length, `${problem.id} approaches`).toBeGreaterThanOrEqual(1);
        for (const approach of problem.answerKey.approaches) {
          expect(approach.name).toBeTruthy();
          expect(approach.steps.length).toBeGreaterThanOrEqual(1);
        }
        expect(problem.answerKey.lookFor, `${problem.id} lookFor`).toBeTruthy();
      }
    }
  });

  it('gives every week at least one explain-your-thinking or solve-it-two-ways problem', () => {
    for (const track of TRACK_LIST) {
      for (const week of track.weeks) {
        const openEnded = week.problems.filter((p) =>
          ['explain', 'two-ways', 'explore'].includes(p.format),
        );
        expect(openEnded.length, `${track.trackId} week ${week.week}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('uses unique problem ids across every track', () => {
    const ids = TRACK_LIST.flatMap((t) => allProblems(t).map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('schedules cumulative review at least every four weeks in the grade 5 track', () => {
    const reviews = getTrack('grade5').weeks.filter((w) => w.cumulativeReview).map((w) => w.week);
    expect(reviews).toEqual([4, 8, 12]);
  });
});
