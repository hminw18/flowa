import { v4 as uuidv4 } from 'uuid';
import { query } from './db';

export type QuizItem = {
  prompt: string;
  answer: string;
  source: 'saved' | 'key';
};

export type QuizResponse = QuizItem & {
  userAnswer: string;
  correct: boolean;
  suggestion?: string;
  firstAnswer?: string;
  finalAnswer?: string;
  correctOnFirst?: boolean;
};

export type QuizRecord = {
  quizId: string;
  quizDate: string;
  items: QuizItem[];
  responses: QuizResponse[] | null;
  score: number | null;
  completedAt: string | null;
  createdAt: string;
};

export type QuizSummary = {
  quizDate: string;
  createdAt: string;
  completedAt: string | null;
  score: number | null;
  totalCount: number;
};

export async function listQuizzes(userId: string): Promise<QuizSummary[]> {
  const result = await query<{
    quiz_date: string;
    created_at: string;
    completed_at: string | null;
    score: number | null;
    total_count: number;
  }>(
    `select quiz_date::text as quiz_date, created_at, completed_at, score, jsonb_array_length(items) as total_count
     from daily_quizzes
     where user_id = $1
     order by quiz_date desc`,
    [userId]
  );

  return result.rows.map((row) => ({
    quizDate: row.quiz_date,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    score: row.score,
    totalCount: row.total_count,
  }));
}

export async function getQuizByDate(userId: string, quizDate: string): Promise<QuizRecord | null> {
  const result = await query<{
    quiz_id: string;
    quiz_date: string;
    items: QuizItem[];
    responses: QuizResponse[] | null;
    score: number | null;
    completed_at: string | null;
    created_at: string;
  }>(
    `select quiz_id, quiz_date::text as quiz_date, items, responses, score, completed_at, created_at
     from daily_quizzes
     where user_id = $1 and quiz_date = $2`,
    [userId, quizDate]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    quizId: row.quiz_id,
    quizDate: row.quiz_date,
    items: row.items,
    responses: row.responses,
    score: row.score,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function saveTodayQuiz(userId: string, items: QuizItem[]): Promise<void> {
  await query(
    `insert into daily_quizzes (quiz_id, user_id, quiz_date, items)
     values ($1, $2, current_date, $3)
     on conflict (user_id, quiz_date) do update
     set items = excluded.items,
         created_at = now()`,
    [uuidv4(), userId, JSON.stringify(items)]
  );
}

export async function saveQuizResponses(
  userId: string,
  quizDate: string,
  responses: QuizResponse[],
  score: number
): Promise<void> {
  await query(
    `update daily_quizzes
     set responses = $3,
         score = $4,
         completed_at = now()
     where user_id = $1 and quiz_date = $2`,
    [userId, quizDate, JSON.stringify(responses), score]
  );
}
