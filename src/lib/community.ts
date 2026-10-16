export const categories = ["能跑就行", "AI 套壳", "网页小玩具", "手机端", "游戏乱炖", "纯抽象", "教程与求助"];
export const projectStatus: Record<string, string> = { pending: "待审核", approved: "已公开", rejected: "需修改", withdrawn: "已撤回" };
export function serverDate(value: string): Date {
  // Database timestamps without an offset are UTC, not the viewer's local time.
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : value.replace(" ", "T") + "Z");
}
export type Project = {
  id: number; user_id: number; title: string; summary: string; category: string;
  demo_url: string; repo_url?: string; tech_stack?: string; confession?: string; cover_url?: string;
  status: string; is_deleted: number; is_featured: number; moderation_note?: string; revision: number;
  votes_count: number; comments_count: number; views_count: number; created_at: string; updated_at: string;
  author_name: string; author_points: number; has_voted: boolean;
};
