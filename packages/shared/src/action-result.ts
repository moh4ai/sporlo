// Shared return shape for every Server Action. Replaces the ad-hoc {ok, error}
// in apps/app/src/app/[locale]/onboarding/actions.ts. Discriminated union so
// callers narrow on `ok`.

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionOkVoid(): ActionResult<void> {
  return { ok: true, data: undefined };
}

export function actionError(error: string, field?: string): ActionResult<never> {
  return { ok: false, error, ...(field ? { field } : {}) };
}
