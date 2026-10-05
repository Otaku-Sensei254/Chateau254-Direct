/* Feature flags.
   Kept in one module so a switch is a single edit and the reasoning lives with
   the decision rather than being scattered as `if` statements across components.

   To re-enable a flag, flip it to true. Nothing needs to be uncommented. */

/* The client has not approved the Take-Out menu yet. It is disabled, not
   removed: the route, the menu catalogue and every navigation entry are still
   in place behind this flag so switching it back on restores the full feature.

   Note that `takeout_menu` also backs the Event Catering catalogue (eventItems
   is filtered out of the take-out rows), so that data source is left intact and
   only the public Take-Out menu is withheld. Admin can still manage the
   take-out items in the meantime. */
export const FEATURES = {
  takeout: false,
};

/* Convenience helpers so call sites read as intent, not as flag plumbing. */
export const isTakeoutEnabled = () => FEATURES.takeout;