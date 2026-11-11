// Сніжинка для снігопаду. Прозорість і кількість — у BALANCE.winter.snow.
import { C } from '../palette.js';

export default {
  key: 'snowflake',
  w: 6,
  h: 6,
  cell: 2,
  palette: { w: C.snow },
  frames: { flake: ['.w.', 'www', '.w.'] },
};
