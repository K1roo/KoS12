/* eslint-disable @typescript-eslint/naming-convention */
export interface TwitchAppAccessTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string[];
}
