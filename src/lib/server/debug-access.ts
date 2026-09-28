import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

// The /__debug room shows every page generated in the toolkit (HTML, tool calls and all), so it is
// limited to the uids in DEBUG_USER_IDS (comma-separated, in .env). In dev it is open to anyone.
export function debugAllowed(userId: string | undefined): boolean {
    if (dev) return true;
    const allowed = (env.DEBUG_USER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    return Boolean(userId && allowed.includes(userId));
}
