import type { ReviewField, ReviewSummary } from './types';

export function getReviewSummary(fields: ReviewField[]): ReviewSummary {
  return fields.reduce<ReviewSummary>(
    (summary, field) => {
      const next = {
        ...summary,
        total: summary.total + 1,
        decided: field.reviewState === 'pending' ? summary.decided : summary.decided + 1,
        pending: field.reviewState === 'pending' ? summary.pending + 1 : summary.pending,
        unknownDropped:
          field.classification === 'UNKNOWN' && field.action === 'DROP'
            ? summary.unknownDropped + 1
            : summary.unknownDropped,
      };

      return {
        ...next,
        [field.action.toLowerCase()]: next[field.action.toLowerCase() as keyof ReviewSummary] + 1,
      };
    },
    {
      total: 0,
      decided: 0,
      pending: 0,
      unknownDropped: 0,
      mask: 0,
      drop: 0,
      hmac: 0,
      keep: 0,
    },
  );
}

export function canBuildDataset(fields: ReviewField[]): boolean {
  return fields.every((field) => field.reviewState !== 'pending');
}
