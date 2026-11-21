/* Cloud sync & file storage — SAME Supabase project as the original site
   (js/config.js), so this app shares the same cloud data and files. */
export const JL_CLOUD = {
  url: 'https://xntlkyjjxhtmojaamxvc.supabase.co',
  key: 'sb_publishable_lShSA_dy3AYAGRx0Qy_p8Q_nKJTLyBw', // publishable key — safe for browsers
  user: 'main',        // single-user profile key
  bucket: 'jl-files',  // storage bucket
};

export function cloudEnabled(): boolean {
  return Boolean(JL_CLOUD.url && JL_CLOUD.key);
}

export function cloudHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { apikey: JL_CLOUD.key, Authorization: 'Bearer ' + JL_CLOUD.key };
  if (extra) for (const k of Object.keys(extra)) h[k] = extra[k];
  return h;
}

export function cloudFileUrl(id: string): string {
  return (
    JL_CLOUD.url + '/storage/v1/object/' + JL_CLOUD.bucket + '/' +
    encodeURIComponent(JL_CLOUD.user || 'main') + '/' + encodeURIComponent(id)
  );
}
