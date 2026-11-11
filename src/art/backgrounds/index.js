// Фони біомів. Біом 1 — slimeCave, зима — winterNight, бамбук — bgBamboo і туман fog (bambooFog.js). Заміна готовим малюнком: src/art/png/<key>.png (будь-якого розміру, тайлиться).
import slimeCave from './slimeCave.js';
import winterNight from './winterNight.js';
import { bgBamboo, fog } from './bambooFog.js';

export const BACKGROUNDS = [slimeCave, winterNight, bgBamboo, fog];
