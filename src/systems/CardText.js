// Тексти карток вікна рівня. Чисті функції без Phaser: їх читає і LevelUpScene, і довідник (етап 7).
import { BALANCE } from '../config/balance.js';
import { cardUpgrade, cardWeapon, damageCardBonus, iceStats } from './Progression.js';
import { cardLoot, hatStats, invisStats, maxLivesFor } from './Skills.js';

export const WEAPON_DESC = {
  axe: (w) => `розмах навколо: ×${w.damageMul} шкоди всім поруч,\nзокрема босу; лише ближній бій`,
  chakra: (w) => `черга з ${w.burst} пострілів, перезарядка ×${w.reloadMul}\nстрибки на ${Math.round((w.jumpSpeedMul - 1) * 100)}% швидші`,
  shotgun: (w) => `3 кулі віялом ±${w.spreadDeg}°,\nкожна ×${String(w.damageMul).replace('.', ',')} шкоди`,
};

/** Картка зброї: назва з прогресом, опис і що станеться після взяття. */
function weaponText(weaponId, arsenal) {
  const w = BALANCE.weapons[weaponId];
  const done = arsenal?.progress?.[weaponId] ?? 0;
  const next = done + 1;
  const pips = '■'.repeat(next) + '□'.repeat(w.steps - next);
  const main = arsenal?.main;
  const outcome =
    next >= w.steps ? `стане основною${main ? ` замість «${BALANCE.weapons[main].name}»` : ''}` : `${pips} ${next}/${w.steps}`;
  return { title: `${w.name}  ${done}/${w.steps}`, desc: `${WEAPON_DESC[weaponId](w)}\n${outcome}` };
}

const pct = (x) => Math.round(x * 100);
const num = (x) => String(Math.round(x * 100) / 100).replace('.', ',');

/** Що дасть наступна прокачка основної зброї (фідбек-2). */
const UPGRADE_DESC = {
  axe: (n, U) => {
    const a = U.axe;
    const extra = n === a.miniAxeAt ? '\n+ міні-сокира-помічниця!' : a.tiers.includes(n) ? '\n+ новий вигляд сокири!' : '';
    return `+${num(U.damageAdd)} шкоди, радіус +${pct(a.radiusStep - 1)}%,\nрозмах частіше на ${pct(1 - a.intervalStep)}%${extra}`;
  },
  shotgun: (n, U) => {
    const a = U.shotgun;
    const extra = n === a.extraAt ? '\n+ ще 2 кулі ширшим віялом!' : '';
    return `+${num(U.damageAdd)} шкоди кожній кулі,\nшвидкість атаки +${pct(a.speedStep - 1)}%${extra}`;
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
  armor: () => ({ title: 'Зробити кожух з павучихи', desc: `чорне життя-броня знімається першим,\nвідновлюється через ${BALANCE.bossLoot.armor.regenMs / 1000} с` }),
  venom: () => {
    const v = BALANCE.bossLoot.venom;
    return { title: 'Ядовита морда', desc: `влучання: −${Math.round((1 - v.slowFactor) * 100)}% швидкості ворога\nі ${v.dps} шкоди/с протягом ${v.durationMs / 1000} с` };
  },
  oksana: () => ({ title: 'Дитинча павучихи Оксанка', desc: `невмируща помічниця: кидається на ворога\nраз на ${BALANCE.bossLoot.oksana.intervalMs / 1000} с, росте з «Уроном»` }),
  web: () => {
    const w = BALANCE.bossLoot.web;
    return { title: 'Дупа павучихи', desc: `кулі павутини приклеюють ворога на ${w.rootMs / 1000} с\n(боса — на ${w.bossRootMs / 1000} с)` };
  },
  form: () => ({ title: 'Ти став павуком', desc: `скін чорного павука,\nстрибок на ${Math.round((BALANCE.bossLoot.form.jumpSpeedMul - 1) * 100)}% швидший` }),
  sack: () => ({
    title: 'Мішок Шкодька',
    desc: `раз на ${BALANCE.shkodkoLoot.sack.everyMs / 1000} с: бомби, досвід\nчи Шаги, зрідка навичка +1`,
  }),
  iam: () => {
    const I = BALANCE.shkodkoLoot.iam;
    return {
      title: 'Я ШКОДЬКО',
      desc: `скін Шкодька (скасовує павука),\nдосвід кожні ${I.xpEveryMs / 1000} с, бомба кожні ${I.bombEveryMs / 1000} с`,
    };
  },
  // етап 9 — трофеї Колі
  larva: () => {
    const L = BALANCE.kolyaLoot.larva;
    return { title: 'Личинка-помічник', desc: `сидить на тобі й плює в ворога\nраз на ${num(L.everyMs / 1000)} с (росте з «Уроном»)` };
  },
  iamkolya: () => {
    const I = BALANCE.kolyaLoot.iam;
    return {
      title: 'Я КОЛЯ',
      desc: `скін слимака (скасовує інші). Раз за рівень\nзамість мінус життя: ${num(I.invulnMs / 1000)} с щит і ${I.copies} мінікопії`,
    };
  },
};

export function cardText(id, picks, arsenal) {
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
    case 'extraLife':
      return { title: 'Додаткове життя', desc: `+1 серце (до ${maxLivesFor(n)} з ${BALANCE.skills.extraLife.maxLives})` };
    case 'attackSpeed':
      return { title: 'Швидкість атаки', desc: `постріл частіше на ${Math.round((1 - c.attackSpeedFactor) * 100)}%` };
    case 'damage':
      return { title: 'Урон', desc: `+${damageCardBonus({ picks })} шкоди кожним пострілом` };
    case 'slow': {
      const st = iceStats(n);
      const I = BALANCE.ice;
      return {
        title: `Крижана атака${n > 1 ? ` ${n}` : ''}`,
        desc: `заморожує на ${st.durationMs / 1000} с: −${pct(1 - st.factor)}% швидкості\nі ${num(st.dps)} шкоди/с (боса лише −${pct(1 - I.bossFactor)}%)`,
      };
    }
    default:
      return { title: id, desc: '' };
  }
}
