/**
 * PocketBase client shaped like the supabase-js surface this app uses.
 *
 * The funnel moved to PocketBase, so the app has to follow or the two halves point at
 * different databases. Rather than rewrite 19 query call sites plus the auth provider,
 * this exposes the same shape and translates underneath — the same approach used for
 * the PHP backend, and reversible for the same reason.
 *
 * Deliberately dependency-free: adding the official SDK means touching package.json
 * and the lockfile, which RORK builds from. `fetch` is enough for what is needed here,
 * and the official SDK's default auth store is localStorage, which does not exist on a
 * device — a custom AsyncStorage-backed store would have been required regardless.
 *
 * Two behavioural differences from supabase-js, both intentional:
 *
 *  - Realtime is polling. PocketBase streams over SSE, which React Native does not
 *    support natively. Both subscriptions in this app exist only to invalidate a React
 *    Query cache, and both already fall back to 30s polling when the socket fails, so
 *    polling is the path the app was written to tolerate.
 *  - PostgREST embeds (`products(slug)`) have no PocketBase equivalent and are dropped
 *    from the field list. The one caller that used an embed has been changed to read
 *    the column it already had.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PB_URL =
  process.env.EXPO_PUBLIC_POCKETBASE_URL || 'https://astrolyfe-main.cloudpod.pro';

const AUTH_KEY = 'pb_auth';

// ── types mirroring the bits of supabase-js the app consumes ──────────

export interface PbUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

export interface PbSession {
  access_token: string;
  user: PbUser;
}

interface Result<T> {
  data: T;
  error: { message: string; code?: string } | null;
}

type AuthChangeHandler = (event: string, session: PbSession | null) => void;

// ── auth store ────────────────────────────────────────────────────────

let currentToken: string | null = null;
let currentUser: PbUser | null = null;
let loaded = false;
const authListeners = new Set<AuthChangeHandler>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshInFlight: Promise<void> | null = null;

function session(): PbSession | null {
  return currentToken && currentUser
    ? { access_token: currentToken, user: currentUser }
    : null;
}

function emit(event: string): void {
  const s = session();
  authListeners.forEach((fn) => {
    try {
      fn(event, s);
    } catch {
      // A listener throwing must not take down the auth flow.
    }
  });
}

async function loadAuth(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    let raw: string | null = null;
    if (Platform.OS !== 'web') {
      try {
        raw = await SecureStore.getItemAsync(AUTH_KEY);
      } catch {
        // A device without a usable keychain should still be able to sign in.
      }
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(AUTH_KEY);
      // Migrate sessions written by older builds into the platform keychain.
      if (raw && Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync(AUTH_KEY, raw);
          await AsyncStorage.removeItem(AUTH_KEY);
        } catch {
          // Keep the legacy value if migration is unavailable on this device.
        }
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      currentToken = parsed?.token ?? null;
      currentUser = parsed?.user ?? null;
    }
  } catch {
    currentToken = null;
    currentUser = null;
  }
}

async function saveAuth(token: string | null, user: PbUser | null): Promise<void> {
  currentToken = token;
  currentUser = user;
  // Memory is now authoritative. Without this, a later loadAuth() — which only runs
  // once and is triggered by getSession() — would read storage and overwrite a
  // session that sign-in had just established, silently logging the user back out.
  loaded = true;
  try {
    if (token && user) {
      const raw = JSON.stringify({ token, user });
      if (Platform.OS !== 'web') {
        let storedSecurely = false;
        try {
          await SecureStore.setItemAsync(AUTH_KEY, raw);
          storedSecurely = true;
        } catch {
          // The keychain is unavailable, or rejected the value outright — Android caps
          // a SecureStore entry at roughly 2KB and a populated quiz_data can exceed
          // that. Clearing any older entry before falling back is what makes the
          // fallback safe: loadAuth() reads SecureStore BEFORE AsyncStorage, so a
          // smaller stale copy left behind here would win on every cold start and
          // resurrect a superseded token forever.
          try { await SecureStore.deleteItemAsync(AUTH_KEY); } catch { /* best effort */ }
        }
        if (storedSecurely) {
          // Deliberately its own try: if this throws inside the block above, execution
          // would fall through and ALSO write the token to AsyncStorage, leaving it
          // sitting in plaintext storage next to the keychain copy.
          try { await AsyncStorage.removeItem(AUTH_KEY); } catch { /* best effort */ }
          return;
        }
      }
      await AsyncStorage.setItem(AUTH_KEY, raw);
    } else {
      if (Platform.OS !== 'web') {
        try { await SecureStore.deleteItemAsync(AUTH_KEY); } catch { /* best effort */ }
      }
      await AsyncStorage.removeItem(AUTH_KEY);
    }
  } catch {
    // A storage failure costs persistence across restarts, not this session.
  }
}

/**
 * PocketBase tokens do not refresh merely because a client uses them. Refresh while
 * the app is active so a returning customer does not retain a stale local session
 * whose protected requests then fail. A transient network failure leaves the current
 * session intact; an explicitly rejected token clears it and notifies the app.
 */
async function refreshAuth(): Promise<void> {
  await loadAuth();
  if (!currentToken || refreshInFlight) return refreshInFlight ?? undefined;

  const work = (async () => {
    try {
      const res = await pbFetch('/api/collections/users/auth-refresh', { method: 'POST' });
      if (typeof res?.token !== 'string' || !res?.record) {
        throw new Error('PocketBase returned an invalid refreshed session');
      }
      await saveAuth(res.token, res.record as PbUser);
      emit('TOKEN_REFRESHED');
    } catch (e: any) {
      // Offline/temporary failures should not force a customer out. A rejected
      // token, however, cannot recover and must not leave a misleading session.
      if (e?.status === 401 || e?.status === 403) {
        await saveAuth(null, null);
        emit('SIGNED_OUT');
      }
    }
  })();

  refreshInFlight = work;
  try {
    await work;
  } finally {
    if (refreshInFlight === work) refreshInFlight = null;
  }
}

// ── transport ─────────────────────────────────────────────────────────

async function pbFetch(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (currentToken) headers.Authorization = currentToken;
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${PB_URL}${path}`, { ...init, headers, signal });
  const text = await res.text();
  let body: any = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    const err: any = new Error(body?.message || `PocketBase HTTP ${res.status}`);
    err.status = res.status;
    err.data = body?.data;
    throw err;
  }
  return body;
}

/**
 * Escape a value for a PocketBase filter expression. Interpolating raw would let an
 * apostrophe in an email break or alter the filter.
 */
function filterValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (v === null || v === undefined) return 'null';
  return `'${String(v).replace(/'/g, "\\'")}'`;
}

/**
 * Public URL for a file stored on a record's file-type field, per PocketBase's
 * `/api/files/{collection}/{recordId}/{filename}` convention.
 */
export function getFileUrl(collection: string, recordId: string, filename: string): string {
  return `${PB_URL}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(filename)}`;
}

/**
 * Multipart upload to a single file-type field. Separate from the Query builder's
 * JSON-only update() because PocketBase (like any REST API) needs an actual
 * multipart/form-data body for a file, which a JSON PATCH cannot carry.
 */
export async function uploadFile(
  collection: string,
  recordId: string,
  field: string,
  file: { uri: string; name: string; type: string },
): Promise<any> {
  await loadAuth();
  const form = new FormData();
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (currentToken) headers.Authorization = currentToken;

  const res = await fetch(
    `${PB_URL}/api/collections/${encodeURIComponent(collection)}/records/${recordId}`,
    { method: 'PATCH', headers, body: form },
  );
  const text = await res.text();
  let body: any = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 200) };
    }
  }
  if (!res.ok) {
    const err: any = new Error(body?.message || `PocketBase HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// ── query builder ─────────────────────────────────────────────────────

class Query<T = any> implements PromiseLike<Result<T>> {
  private filters: string[] = [];
  private fields = '';
  private sort = '';
  private perPage = 200;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private signal?: AbortSignal;
  // supabase-js applies filters AFTER the verb: .update({...}).eq('id', x). The write
  // is therefore recorded here and dispatched on await, once the filters are known.
  private op:
    | { kind: 'insert'; values: Record<string, unknown> }
    | { kind: 'update'; values: Record<string, unknown> }
    | { kind: 'upsert'; values: Record<string, unknown>; opts?: { onConflict?: string; ignoreDuplicates?: boolean } }
    | { kind: 'delete' }
    | null = null;

  constructor(private collection: string) {}

  select(columns = '*'): this {
    if (columns.trim() !== '*') {
      // Drop PostgREST embeds like `products(slug)` — no PocketBase equivalent.
      this.fields = columns
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c !== '' && !c.includes('('))
        .join(',');
    }
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push(`${column}=${filterValue(value)}`);
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.sort = `${opts?.ascending === false ? '-' : ''}${column}`;
    return this;
  }

  limit(n: number): this {
    this.perPage = Math.max(1, n);
    return this;
  }

  abortSignal(signal: AbortSignal): this {
    this.signal = signal;
    return this;
  }

  single(): this {
    this.mode = 'single';
    this.perPage = 1;
    return this;
  }

  maybeSingle(): this {
    this.mode = 'maybeSingle';
    this.perPage = 1;
    return this;
  }

  insert(values: Record<string, unknown>): this {
    this.op = { kind: 'insert', values };
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.op = { kind: 'update', values };
    return this;
  }

  upsert(
    values: Record<string, unknown>,
    opts?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.op = { kind: 'upsert', values, opts };
    return this;
  }

  delete(): this {
    this.op = { kind: 'delete' };
    return this;
  }

  private async runInsert(values: Record<string, unknown>): Promise<Result<any>> {
    const data = await pbFetch(
      `/api/collections/${encodeURIComponent(this.collection)}/records`,
      { method: 'POST', body: JSON.stringify(values) },
      this.signal,
    );
    return { data, error: null };
  }

  private async runUpdate(values: Record<string, unknown>): Promise<Result<any>> {
    const rows = await this.fetchRows(['id']);
    const out = [];
    for (const row of rows) {
      out.push(
        await pbFetch(
          `/api/collections/${encodeURIComponent(this.collection)}/records/${row.id}`,
          { method: 'PATCH', body: JSON.stringify(values) },
          this.signal,
        ),
      );
    }
    return { data: out, error: null };
  }

  private async runDelete(): Promise<Result<any>> {
    const rows = await this.fetchRows(['id']);
    for (const row of rows) {
      await pbFetch(
        `/api/collections/${encodeURIComponent(this.collection)}/records/${row.id}`,
        { method: 'DELETE' },
        this.signal,
      );
    }
    return { data: rows.map((r: any) => r.id), error: null };
  }

  /**
   * PocketBase has no ON CONFLICT, so this looks the row up and creates or patches.
   * ignoreDuplicates mirrors supabase-js: leave an existing row alone.
   */
  private async runUpsert(
    values: Record<string, unknown>,
    opts?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): Promise<Result<any>> {
    const keys = (opts?.onConflict ?? 'id').split(',').map((k) => k.trim());
    let lookup = new Query(this.collection).limit(1);
    let hasKey = false;
    for (const k of keys) {
      if (values[k] !== undefined) {
        lookup = lookup.eq(k, values[k]);
        hasKey = true;
      }
    }

    const existing = hasKey ? (await lookup.fetchRows())[0] : undefined;

    if (existing) {
      if (opts?.ignoreDuplicates) return { data: existing, error: null };
      const data = await pbFetch(
        `/api/collections/${encodeURIComponent(this.collection)}/records/${existing.id}`,
        { method: 'PATCH', body: JSON.stringify(values) },
        this.signal,
      );
      return { data, error: null };
    }

    return this.runInsert(values);
  }

  private async fetchRows(only?: string[]): Promise<any[]> {
    const params = new URLSearchParams({ perPage: String(this.perPage) });
    if (this.filters.length) params.set('filter', this.filters.join(' && '));
    const fields = only ? only.join(',') : this.fields;
    if (fields) params.set('fields', fields);
    if (this.sort) params.set('sort', this.sort);

    const res = await pbFetch(
      `/api/collections/${encodeURIComponent(this.collection)}/records?${params.toString()}`,
      {},
      this.signal,
    );
    return res.items ?? [];
  }

  // Thenable so `await supabase.from(...).select(...)` yields { data, error },
  // exactly as the existing call sites expect.
  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<Result<any>> {
    try {
      if (this.op) {
        switch (this.op.kind) {
          case 'insert':
            return await this.runInsert(this.op.values);
          case 'update':
            return await this.runUpdate(this.op.values);
          case 'upsert':
            return await this.runUpsert(this.op.values, this.op.opts);
          case 'delete':
            return await this.runDelete();
        }
      }

      const rows = await this.fetchRows();
      if (this.mode === 'many') return { data: rows, error: null };
      if (rows.length > 0) return { data: rows[0], error: null };
      // supabase-js: single() errors on no row, maybeSingle() returns null.
      return this.mode === 'single'
        ? { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
        : { data: null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? 'query failed' } };
    }
  }
}

// ── realtime, implemented as polling ──────────────────────────────────

class Channel {
  private handlers: ((payload?: unknown) => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private name: string) {}

  on(_event: string, _filter: unknown, handler: (payload?: unknown) => void): this {
    this.handlers.push(handler);
    return this;
  }

  subscribe(cb?: (status: string) => void): this {
    this.timer = setInterval(() => {
      this.handlers.forEach((h) => {
        try {
          h(undefined);
        } catch {
          // one bad handler should not stop the rest
        }
      });
    }, 15000);
    cb?.('SUBSCRIBED');
    return this;
  }

  unsubscribe(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

// ── the exported client ───────────────────────────────────────────────

export const supabase = {
  from(collection: string) {
    return new Query(collection);
  },

  channel(name: string) {
    return new Channel(name);
  },

  removeChannel(ch: Channel) {
    ch?.unsubscribe?.();
    return Promise.resolve('ok');
  },

  auth: {
    async getSession(): Promise<{ data: { session: PbSession | null }; error: null }> {
      await loadAuth();
      return { data: { session: session() }, error: null };
    },

    async getUser(): Promise<{ data: { user: PbUser | null }; error: null }> {
      await loadAuth();
      return { data: { user: currentUser }, error: null };
    },

    async signUp({ email, password }: { email: string; password: string; options?: unknown }) {
      try {
        // PocketBase requires passwordConfirm; supabase-js has no such concept.
        await pbFetch('/api/collections/users/records', {
          method: 'POST',
          body: JSON.stringify({ email, password, passwordConfirm: password }),
        });
      } catch (e: any) {
        // An existing lead row from the funnel is expected: the customer was created
        // at the offer page before choosing a password. Fall through and sign in.
        const already = e?.status === 400 && JSON.stringify(e?.data ?? {}).includes('email');
        if (!already) {
          return { data: { user: null, session: null }, error: { message: e?.message ?? 'sign up failed' } };
        }
      }
      return this.signInWithPassword({ email, password });
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await pbFetch('/api/collections/users/auth-with-password', {
          method: 'POST',
          body: JSON.stringify({ identity: email, password }),
        });
        await saveAuth(res.token, res.record);
        emit('SIGNED_IN');
        return { data: { user: res.record as PbUser, session: session() }, error: null };
      } catch (e: any) {
        return { data: { user: null, session: null }, error: { message: e?.message ?? 'sign in failed' } };
      }
    },

    async signOut() {
      await saveAuth(null, null);
      emit('SIGNED_OUT');
      return { error: null };
    },

    onAuthStateChange(handler: AuthChangeHandler) {
      authListeners.add(handler);
      // Report the restored session once, matching supabase-js's initial emit.
      void loadAuth().then(() => handler('INITIAL_SESSION', session()));
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(handler);
            },
          },
        },
      };
    },

    // AuthProvider starts/stops this with the app lifecycle. Refresh immediately on
    // foregrounding, then every six hours while the app remains in use.
    startAutoRefresh() {
      void refreshAuth();
      if (!refreshTimer) {
        refreshTimer = setInterval(() => {
          void refreshAuth();
        }, 6 * 60 * 60 * 1000);
      }
    },
    stopAutoRefresh() {
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = null;
    },
  },
};

export default supabase;
