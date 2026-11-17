// The shared geometry of the play field: one fixed logical size (the canvas
// is scaled by CSS to fit the window), a header band for the HUD, the dial
// itself where signals travel, a ticker band at the bottom for the message
// being assembled, and the vertical zone the tuner guards.

export const WIDTH = 1280;
export const HEIGHT = 800;

export const HUD_BOTTOM = 104; // header band: score, night, integrity
export const FIELD_TOP = 128; // top of the dial
export const FIELD_BOTTOM = 688; // bottom of the dial
export const TICKER_TOP = 712; // message ticker band below the dial

// The tuner's zone: a signal is decodable only while its head is inside.
export const ZONE_LEFT = 138;
export const ZONE_RIGHT = 252;
export const ZONE_CENTER = (ZONE_LEFT + ZONE_RIGHT) / 2;

// A signal is lost once its head passes this line undecided.
export const LOST_X = 56;
