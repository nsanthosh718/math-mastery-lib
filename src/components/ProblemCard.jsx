import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { getProblemRecord, SELF_CHECK_OPTIONS } from '../lib/progress.js';

const FORMAT_LABELS = {
  notation: 'New notation',
  explain: 'Explain your thinking',
  'two-ways': 'Solve it two ways',
  explore: 'Open exploration',
};

/**
 * One problem, with its answer key hidden behind a deliberate two-step reveal:
 * the child must confirm they have had a go before the worked reasoning appears.
 */
export default function ProblemCard({ problem, childId, index }) {
  const { state, dispatch, today } = useApp();
  const child = state.children.find((c) => c.id === childId);
  const record = getProblemRecord(child, problem.id);
  const [confirming, setConfirming] = useState(false);

  const attempt = () =>
    dispatch({ type: 'mark-attempted', childId, problemId: problem.id, date: today });

  const reveal = () => {
    dispatch({ type: 'reveal-key', childId, problemId: problem.id, date: today });
    setConfirming(false);
  };

  return (
    <article className={`card problem ${record.keyRevealed ? 'problem--reviewed' : ''}`}>
      <div className="problem__head">
        <span className="problem__number">{index + 1}</span>
        <span className={`tag tag--${problem.strand}`}>
          {FORMAT_LABELS[problem.format] ?? problem.format}
        </span>
        {record.keyRevealed && <span className="tag tag--done">Reviewed</span>}
      </div>

      <p className="problem__prompt">{problem.prompt}</p>
      {problem.materials && <p className="problem__materials">You will need: {problem.materials}</p>}

      {!record.attempted && (
        <button className="btn btn--primary" onClick={attempt}>
          I had a go at this
        </button>
      )}

      {record.attempted && !record.keyRevealed && !confirming && (
        <button className="btn btn--secondary" onClick={() => setConfirming(true)}>
          Show the worked answer
        </button>
      )}

      {confirming && !record.keyRevealed && (
        <div className="confirm">
          <p className="confirm__question">
            Have you written or said your own answer first? The key is much more useful after you
            have committed to something.
          </p>
          <div className="row">
            <button className="btn btn--primary" onClick={reveal}>
              Yes, show me
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirming(false)}>
              Not yet
            </button>
          </div>
        </div>
      )}

      {record.keyRevealed && <AnswerKey answerKey={problem.answerKey} />}

      {record.keyRevealed && (
        <div className="self-check">
          <p className="self-check__label">How did that go?</p>
          <div className="row row--wrap">
            {SELF_CHECK_OPTIONS.map((option) => (
              <button
                key={option.value}
                title={option.hint}
                className={`chip ${record.selfCheck === option.value ? 'chip--on' : ''}`}
                onClick={() =>
                  dispatch({
                    type: 'set-self-check',
                    childId,
                    problemId: problem.id,
                    value: option.value,
                    date: today,
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function AnswerKey({ answerKey }) {
  return (
    <div className="answer-key">
      <p className="answer-key__answer">
        <strong>Answer:</strong> {answerKey.answer}
      </p>

      {answerKey.approaches.map((approach) => (
        <div key={approach.name} className="approach">
          <h4 className="approach__name">{approach.name}</h4>
          <ol className="approach__steps">
            {approach.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      ))}

      {answerKey.lookFor && (
        <p className="answer-key__note answer-key__note--look">
          <strong>Parent — look for:</strong> {answerKey.lookFor}
        </p>
      )}
      {answerKey.misconception && (
        <p className="answer-key__note answer-key__note--miss">
          <strong>Common misconception:</strong> {answerKey.misconception}
        </p>
      )}
    </div>
  );
}
