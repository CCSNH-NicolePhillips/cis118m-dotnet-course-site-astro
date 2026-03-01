import type { APIRoute } from 'astro';
import { WEEKS } from '../../config/site';

export const prerender = false;

export const GET: APIRoute = () => {
  const dueDates: Record<string, string> = {};
  for (const week of WEEKS) {
    if (week.dueDate) {
      dueDates[String(parseInt(week.slug, 10))] = week.dueDate;
    }
  }
  return new Response(JSON.stringify(dueDates), {
    headers: { 'Content-Type': 'application/json' }
  });
};
