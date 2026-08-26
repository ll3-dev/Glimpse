/**
 * Rule-based labeling lives in @glimpse/features so mobile and desktop share
 * one keyword taxonomy; this module keeps the historical import path.
 */
export {
  RULE_BASED_LABELER_VERSION,
  deriveRuleBasedLabels,
  formatKnowledgeLabel,
  getDisplayLabels,
} from '@glimpse/features';
