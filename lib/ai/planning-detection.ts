export function isComplexPlanningQuery(query: string): boolean {
  const planningPatterns = [
    /\b(implementation|action)\s*plan\b/i,
    /\b(year[- ]by[- ]year|phase[- ]by[- ]phase|week[- ]by[- ]week|step[- ]by[- ]step)\b/i,
    /\b(budget|cost\s+estimat|material\s+list|shopping\s+list)\b/i,
    /\b(planting\s+schedule|planting\s+calendar|seasonal\s+plan)\b/i,
    /\b(plan\s+my\s+(whole|entire)|design\s+my\s+(whole|entire))\b/i,
    /\b(timeline|gantt|project\s+plan|roadmap)\b/i,
    /\b(how\s+much\s+will\s+it\s+cost|total\s+cost|estimate\s+the\s+cost)\b/i,
    /\b(create\s+a\s+plan|make\s+a\s+plan|build\s+a\s+plan|develop\s+a\s+plan)\b/i,
  ];
  return planningPatterns.some(pattern => pattern.test(query));
}
