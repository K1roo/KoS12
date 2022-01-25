/* eslint-disable @typescript-eslint/naming-convention */
export interface TwitchStreamsResponse {
  data: {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids?: string[];
    is_mature: boolean;
  };
  pagination: {
    cursor?: string;
  };
}
