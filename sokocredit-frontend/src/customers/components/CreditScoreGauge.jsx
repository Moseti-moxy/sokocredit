// src/features/customers/components/CreditScoreGauge.jsx
import PropTypes from 'prop-types';
import './CreditScoreGauge.css';

function getTier(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export default function CreditScoreGauge({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const dashOffset = circumference * (1 - progress);
  const tier = getTier(score);

  return (
    <div className="credit-score-gauge">
      <svg width="140" height="140" viewBox="0 0 140 140" data-testid="credit-score-gauge">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#3d7a24"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" className="credit-score-gauge__value">
          {score}
        </text>
        <text x="70" y="86" textAnchor="middle" className="credit-score-gauge__tier">
          {tier.toUpperCase()}
        </text>
      </svg>

      <div className="credit-score-gauge__scale">
        {['Poor', 'Fair', 'Good', 'Excellent'].map((label) => (
          <span
            key={label}
            className={label === tier ? 'credit-score-gauge__scale-item--active' : ''}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

CreditScoreGauge.propTypes = {
  score: PropTypes.number.isRequired,
};
