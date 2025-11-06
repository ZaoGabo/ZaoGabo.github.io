import { useCallback, useMemo, useState } from 'react';

const distance = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

const pointInPolygon = (points, x, y) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const withinShape = (diff, x, y) => {
  if (!diff) return false;
  const shape = diff.type ?? 'circle';
  if (shape === 'circle') {
    const radiusPercent = diff.radius ?? 5;
    const allow = diff.tolerance ?? 0;
    const nextRadius = radiusPercent + allow;
    return distance(diff.x, diff.y, x, y) <= nextRadius;
  }
  if (shape === 'rect') {
    const width = diff.width ?? 10;
    const height = diff.height ?? 10;
    const allow = diff.tolerance ?? 0;
    return (
      x >= diff.x - width / 2 - allow &&
      x <= diff.x + width / 2 + allow &&
      y >= diff.y - height / 2 - allow &&
      y <= diff.y + height / 2 + allow
    );
  }
  if (shape === 'polygon' && Array.isArray(diff.points)) {
    return pointInPolygon(diff.points, x, y);
  }
  return false;
};

export const useDifferences = (differences = [], scoringRules = {}) => {
  const [foundDifferences, setFoundDifferences] = useState([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrongClick, setWrongClick] = useState(null);

  const rules = useMemo(() => ({
    pointsPerHit: 200,
    penaltyPerMiss: 50,
    bonusPerSecond: 10,
    ...scoringRules,
  }), [scoringRules]);

  const registerClick = useCallback((xPercent, yPercent, context = {}) => {
    const available = differences.filter(diff => !foundDifferences.includes(diff.id));
    const match = available.find(diff => withinShape(diff, xPercent, yPercent));
    let result = { hit: false, diff: null };

    setAttempts(prev => prev + 1);

    if (match) {
      result = { hit: true, diff: match };
      setFoundDifferences(prev => [...prev, match.id]);
      setScore(prev => prev + rules.pointsPerHit);
      setWrongClick(null);
    } else {
      setScore(prev => Math.max(0, prev - rules.penaltyPerMiss));
      setWrongClick({ x: xPercent, y: yPercent, timestamp: Date.now(), context });
    }
    return result;
  }, [differences, foundDifferences, rules]);

  const applyBonus = useCallback((secondsRemaining) => {
    if (secondsRemaining > 0) {
      setScore(prev => prev + secondsRemaining * rules.bonusPerSecond);
    }
  }, [rules]);

  const reset = useCallback(() => {
    setFoundDifferences([]);
    setScore(0);
    setAttempts(0);
    setWrongClick(null);
  }, []);

  return {
    foundDifferences,
    score,
    attempts,
    wrongClick,
    registerClick,
    applyBonus,
    reset,
    scoringRules: rules,
  };
};

export default useDifferences;
