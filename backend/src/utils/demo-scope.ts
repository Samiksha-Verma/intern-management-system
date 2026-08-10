import { HttpError } from "./http-error";

// A demo admin may only ever see or touch demo-flagged data. A real admin
// has no such restriction (real admins can still see demo accounts if they
// need to inspect/manage them). 404 (not 403) matches this codebase's
// existing ownership-check convention — a demo admin probing a real
// resource's id shouldn't be able to distinguish "not yours" from
// "doesn't exist".
export function assertDemoScopeAllowed(actorIsDemo: boolean, targetIsDemo: boolean) {
  if (actorIsDemo && !targetIsDemo) {
    throw new HttpError(404, "Not found");
  }
}
