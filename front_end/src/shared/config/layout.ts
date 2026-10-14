/** Height of the app bar and of the brand block beside it, so their bottom borders line up. */
export const APP_HEADER_HEIGHT = 64;

/** Gap between the app bar and side panels that stick while the page scrolls. */
const STICKY_GAP = 16;

/** Sticky side panels (source list, dataset list) start just below the app bar... */
export const STICKY_PANEL_TOP = APP_HEADER_HEIGHT + STICKY_GAP;

/** ...and stop the same gap above the bottom of the window. */
export const STICKY_PANEL_HEIGHT = `calc(100vh - ${APP_HEADER_HEIGHT + STICKY_GAP * 2}px)`;
