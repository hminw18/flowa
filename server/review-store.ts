import { v4 as uuidv4 } from 'uuid';
import { query } from './db';

export type ReviewSession = {
  title: string;
  description: string;
  keyExpressions: string[];
  openingLine: string;
  turns?: Array<{
    cue: string;
    expectedText?: string | null;
    expectedEnglish?: string | null;
    partnerMessages?: Array<{
      text: string;
      username: string | null;
    }>;
    partnerEnglish?: string | null;
    partnerUsername?: string | null;
  }>;
};

export async function getTodayReview(userId: string): Promise<ReviewSession[] | null> {
  const result = await query<{ sessions: ReviewSession[] }>(
    'select sessions from roleplay_reviews where user_id = $1 and review_date = current_date',
    [userId]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0].sessions;
}

export async function saveTodayReview(userId: string, sessions: ReviewSession[]): Promise<void> {
  await query(
    `insert into roleplay_reviews (review_id, user_id, review_date, sessions)
     values ($1, $2, current_date, $3)
     on conflict (user_id, review_date) do update
     set sessions = excluded.sessions,
         created_at = now()`,
    [uuidv4(), userId, JSON.stringify(sessions)]
  );
}
