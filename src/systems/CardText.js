// Тексти карток вікна рівня. Чисті функції без Phaser: їх читає і LevelUpScene, і довідник (етап 7).
import { BALANCE } from '../config/balance.js';
import { cardUpgrade, cardWeapon, damageCardBonus, iceStats } from './Progression.js';
import { cardLoot, hatStats, invisStats, maxLivesFor, shurikenStats } from './Skills.js';
import { KEEP_SLOTS, cardSlot, slotName } from './Arsenal.js';

export const WEAPON_DESC = {
  axe: (w) => `розмах навколо: ×${w.damageMul} шкоди всім поруч,\nзокрема босу; лише ближній бій`,
  chakra: (w) => `черга з ${w.burst} пострілів, перезарядка ×${w.reloadMul}\nстрибки на ${Math.round((w.jumpSpeedMul - 1) * 100)}% швидші`,
  shotgun: (w) => `3 кулі віялом ±${w.spreadDeg}°,\nкожна ×${String(w.damageMul).replace('.', ',')} шкоди`,
  // етап 14
  lightning: (w) => `розряд перескакує на ${w.targets} ворогів,\nкожен перескок слабший — проти натовпу`,
  fire: (w) => `вогняна куля: ворог горить ${w.burnMs / 1000} с —\nпроти товстих і босів`,
  boomerang: (w) => `летить і повертається, пробиває\nвсіх на лінії туди й назад`,
};

/** Картка зброї: назва з прогресом, опис і що станеться після взяття. */
function weaponText(weaponId, arsenal) {
  const w = BALANCE.weapons[weaponId];
  const done = arsenal?.progress?.[weaponId] ?? 0;
  const next = done + 1;
  const pips = '■'.repeat(next) + '□'.repeat(w.steps - next);
  const full = arsenal?.slots?.every(Boolean);
  const outcome = next >= w.steps ? (full ? 'готова — обереш, який слот замінити' : 'готова — стане в другий слот') : `${pips} ${next}/${w.steps}`;
  return { title: `${w.name}  ${done}/${w.steps}`, desc: `${WEAPON_DESC[weaponId](w)}\n${outcome}` };
}

const pct = (x) => Math.round(x * 100);
const num = (x) => String(Math.round(x * 100) / 100).replace('.', ',');

/** Що дасть наступна прокачка основної зброї (фідбек-2). */
const UPGRADE_DESC = {
  axe: (n, U) => {
    const a = U.axe;
    const extra = n === a.miniAxeAt ? '\n+ міні-сокира-помічниця!' : a.tiers.includes(n) ? '\n+ новий вигляд сокири!' : '';
    return `+${num(a.damageAdd ?? U.damageAdd)} шкоди, радіус +${pct(a.radiusStep - 1)}%,\nрозмах частіше на ${pct(1 - a.intervalStep)}%${extra}`;
  },
  shotgun: (n, U) => {
    const a = U.shotgun;
    const extra = n === a.extraAt ? '\n+ ще 2 кулі ширшим віялом!' : n === a.ricochetAt ? '\n+ рикошет від стін!' : '';
    return `+${num(a.damageAdd ?? U.damageAdd)} шкоди кожній кулі,\nшвидкість атаки +${pct(a.speedStep - 1)}%${extra}`;
  },
  lightning: (n, U) => {
    const a = U.lightning;
    const extra = a.moreAt.includes(n) ? '\n+ ще один перескок!' : n === a.stunAt ? '\n+ вражені застигають!' : n === a.blastAt ? '\n+ вибух у кінці ланцюга!' : '';
    return `+${num(a.damageAdd)} шкоди розряду,\nшвидкість атаки +${pct(a.speedStep - 1)}%${extra}`;
  },
  fire: (n, U) => {
    const a = U.fire;
    const extra = n === a.spreadAt ? '\n+ вогонь перекидається на сусіда!' : n === a.explodeAt ? '\n+ згорілі вибухають!' : '';
    return `+${num(a.damageAdd)} шкоди, горіння +${pct(a.burnStep)}%\nі на ${num(a.burnMsStep / 1000)} с довше${extra}`;
  },
  boomerang: (n, U) => {
    const a = U.boomerang;
    const extra = n === a.twinAt ? '\n+ два бумеранги!' : n === a.shieldAt ? '\n+ щит над слизаком!' : '';
    return `+${num(a.damageAdd)} шкоди, далі на ${pct(a.rangeStep - 1)}%,\nшвидкість атаки +${pct(a.speedStep - 1)}%${extra}`;
  },
  chakra: (n, U) => {
    const a = U.chakra;
    const extra = n === a.extraAt ? `\n+ черга довша на ${a.extraBurst} постріли!` : '';
    return `+${num(U.damageAdd)} шкоди кожному пострілу,\nшвидкість атаки +${pct(a.speedStep - 1)}%${extra}`;
  },
};

function upgradeText(weaponId, arsenal) {
  const U = BALANCE.weaponUpgrades;
  const n = (arsenal?.upgrades?.[weaponId] ?? 0) + 1;
  return { title: `${BALANCE.weapons[weaponId].name} +${n}`, desc: UPGRADE_DESC[weaponId](n, U) };
}

export const LOOT_TEXT = {
  armor: () => ({ title: 'Зробити кожух з павучихи', desc: `життя-броня знімається першим,\nвідновлюється через ${BALANCE.bossLoot.armor.regenMs / 1000} с` }),
  venom: () => {
    const v = BALANCE.bossLoot.venom;
    return { title: 'Ядовита морда', desc: `влучання: −${Math.round((1 - v.slowFactor) * 100)}% швидкості ворога\nі ${v.dps} шкоди/с протягом ${v.durationMs / 1000} с` };
  },
  oksana: () => ({ title: 'Дитинча павучихи Оксанка', desc: `невмируща помічниця: кидається на ворога\nраз на ${BALANCE.bossLoot.oksana.intervalMs / 1000} с, шкода ${BALANCE.bossLoot.oksana.damage},\nросте з «Уроном» і з кожним біомом` }),
  web: () => {
    const w = BALANCE.bossLoot.web;
    return { title: 'Дупа павучихи', desc: `кулі павутини приклеюють ворога на ${num(w.rootMs / 1000)} с\n(боса — на ${num(w.bossRootMs / 1000)} с), ${num(w.damage)} шкоди раз на ${num(w.tickMs / 1000)} с` };
  },
  form: () => ({ title: 'Ти став павуком', desc: `скін павука, стрибок на ${Math.round((BALANCE.bossLoot.form.jumpSpeedMul - 1) * 100)}% швидший;\nкнопка «Рій»: ${BALANCE.forms.swarm.count} павучків на ворогів, раз на ${BALANCE.forms.cdMs / 1000} с` }),
  sack: () => ({
    title: 'Мішок Шкодька',
    desc: `раз на ${BALANCE.shkodkoLoot.sack.everyMs / 1000} с: бомби, досвід чи Шаги;\nзрідка — ще один рівень однієї з твоїх навичок\n(напис покаже, якої саме)`,
  }),
  iam: () => {
    const I = BALANCE.shkodkoLoot.iam;
    return {
      title: 'Я ШКОДЬКО',
      desc: `скін Шкодька, бомба на ${I.bombDamage} кожні ${I.bombEveryMs / 1000} с;\nкнопка «Потяг»: ${BALANCE.forms.train.ms / 1000} с невразливий у паровозі`,
    };
  },
  // етап 9 — трофеї Колі
  larva: () => {
    const L = BALANCE.kolyaLoot.larva;
    return { title: 'Личинка-помічник', desc: `сидить на тобі й плює в ворога\nраз на ${num(L.everyMs / 1000)} с (росте з «Уроном»)` };
  },
  iamkolya: () => {
    const C = BALANCE.forms.clones;
    return { title: 'Я КОЛЯ', desc: `скін слимака; кнопка «Клони»: двоє тебе\nна ${C.ms / 1000} с атакують як ти, раз на ${BALANCE.forms.cdMs / 1000} с` };
  },
  // етап 11 — трофеї Казана
  ladle: () => {
    const L = BALANCE.kazanLoot.ladle;
    return { title: 'Черпачок', desc: `кружляє довкола й хлюпає лавою\nраз на ${num(L.everyMs / 1000)} с на ${L.damage} (росте з «Уроном»)` };
  },
  iamkazan: () => {
    const I = BALANCE.kazanLoot.iam;
    return {
      title: 'Я КАЗАН',
      desc: `скін казанчика. Раз за рівень\nзамість мінус життя: ${num(I.invulnMs / 1000)} с щит і кільце лави на ${I.damage}`,
    };
  },
};

/** Етап 14: картки вікна «Куди поставити?» — заміна слота або «Не брати». */
function slotText(slot, arsenal) {
  const w = arsenal?.pending;
  const name = w ? BALANCE.weapons[w].name : '';
  if (slot === KEEP_SLOTS) return { title: 'Не брати', desc: `слоти лишаються як є,\n«${name}» можна знайти знову` };
  const old = arsenal?.slots?.[slot];
  const up = old && arsenal?.upgrades?.[old] ? `\nрівень прокачки +${arsenal.upgrades[old]} збережеться` : '';
  return { title: `Замість: ${slotName(old)}`, desc: `слот ${slot + 1} → «${name}»${up}` };
}

export function cardText(id, picks, arsenal) {
  const slot = cardSlot(id);
  if (slot !== null) return slotText(slot, arsenal);
  const weaponId = cardWeapon(id);
  if (weaponId) return weaponText(weaponId, arsenal);
  const upId = cardUpgrade(id);
  if (upId) return upgradeText(upId, arsenal);
  const loot = cardLoot(id);
  if (loot) return LOOT_TEXT[loot]();
  const c = BALANCE.cards;
  const n = (picks[id] ?? 0) + 1; // яке це буде взяття
  switch (id) {
    case 'invisibility': {
      const st = invisStats(n);
      const head = n === 1 ? 'окрема кнопка справа внизу.\n' : '';
      return { title: `Невидимість${n > 1 ? ` ${n}` : ''}`, desc: `${head}${st.durationMs / 1000} с невидимий і невразливий,\nперезарядка ${st.cooldownMs / 1000} с` };
    }
    case 'hat': {
      const st = hatStats(n);
      const two = st.count > hatStats(n - 1).count && n > 1 ? 'друга шляпа!\n' : '';
      const name = BALANCE.skills.hat.name;
      return { title: `${name}${n > 1 ? ` ${n}` : ''}`, desc: `${two}злітає на ворога і завжди влучає:\n${st.damage} шкоди за удар` };
    }
    case 'shuriken': {
      const st = shurikenStats(n);
      const more = n > 1 && st.count > shurikenStats(n - 1).count ? `${st.count}-й сюрикен!\n` : '';
      return { title: `${BALANCE.skills.shuriken.name}${n > 1 ? ` ${n}` : ''}`, desc: `${more}${st.count} крутяться довкола тебе й ріжуть\nкожного, хто зачепить: ${st.damage} шкоди` };
    }
    case 'halfblood':
      return { title: BALANCE.skills.halfblood.name, desc: 'трансформації більше не скасовують\nодна одну: можна бути і павуком, і Шкодьком…' };
    case 'extraLife':
      return { title: 'Додаткове життя', desc: `+1 серце і +2 життя (до ${maxLivesFor(n)} з ${BALANCE.skills.extraLife.maxLives})` };
    case 'attackSpeed':
      return { title: 'Швидкість атаки', desc: `постріл частіше на ${Math.round((1 - c.attackSpeedFactor) * 100)}%` };
    case 'damage':
      return { title: 'Урон', desc: `+${damageCardBonus({ picks })} шкоди кожним пострілом` };
    case 'slow': {
      const st = iceStats(n);
      const I = BALANCE.ice;
      return {
        title: `Крижана атака${n > 1 ? ` ${n}` : ''}`,
        desc: `заморожує на ${num(st.durationMs / 1000)} с: −${pct(1 - st.factor)}% швидкості\nі ${num(st.dps)} шкоди/с (боса лише −${pct(1 - st.bossFactor)}%)`,
      };
    }
    default:
      return { title: id, desc: '' };
  }
}
