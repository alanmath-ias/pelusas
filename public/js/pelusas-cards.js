/**
 * Generador visual de las 10 cartas y monstruitos de Pelusas
 * Colores sólidos y gradientes seguros sin colisión de IDs en SVG
 */

const PELUSAS_DATA = {
  1: {
    name: 'Pelusa Celeste',
    bg: 'linear-gradient(135deg, #38bdf8, #0284c7)',
    borderColor: '#bae6fd',
    textColor: '#0284c7',
    renderMonster: () => `
      <g class="pelusa-monster m-1">
        <circle cx="50" cy="62" r="26" fill="#0284c7"/>
        <circle cx="50" cy="62" r="22" fill="#38bdf8"/>
        <g class="anim-blink">
          <circle cx="43" cy="56" r="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
          <circle cx="57" cy="56" r="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>
          <g class="anim-look">
            <circle cx="44" cy="56" r="4.5" fill="#0369a1"/>
            <circle cx="44" cy="56" r="2.5" fill="#0f172a"/>
            <circle cx="46" cy="54" r="1.2" fill="#ffffff"/>
            <circle cx="58" cy="56" r="4.5" fill="#0369a1"/>
            <circle cx="58" cy="56" r="2.5" fill="#0f172a"/>
            <circle cx="60" cy="54" r="1.2" fill="#ffffff"/>
          </g>
        </g>
        <path d="M44 68 Q50 74 56 68" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="50" cy="70" rx="2.5" ry="1.5" fill="#f43f5e"/>
      </g>
    `
  },
  2: {
    name: 'Pelusa Púrpura',
    bg: 'linear-gradient(135deg, #a855f7, #6b21a8)',
    borderColor: '#e9d5ff',
    textColor: '#6b21a8',
    renderMonster: () => `
      <g class="pelusa-monster m-2">
        <rect x="25" y="42" width="50" height="42" rx="12" fill="#9333ea" stroke="#581c87" stroke-width="2"/>
        <g class="anim-blink">
          <ellipse cx="38" cy="50" rx="7.5" ry="6.5" fill="#ffffff" stroke="#2e1065" stroke-width="1.8"/>
          <circle cx="40" cy="50" r="3" fill="#10b981"/>
          <circle cx="40" cy="50" r="1.5" fill="#0f172a"/>
          <ellipse cx="62" cy="50" rx="7.5" ry="6.5" fill="#ffffff" stroke="#2e1065" stroke-width="1.8"/>
          <circle cx="60" cy="50" r="3" fill="#10b981"/>
          <circle cx="60" cy="50" r="1.5" fill="#0f172a"/>
        </g>
        <path d="M40 64 Q50 63 60 64" stroke="#2e1065" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path class="anim-tongue" d="M48 64 Q50 74 54 74 Q58 74 56 64 Z" fill="#fb7185" stroke="#be123c" stroke-width="1.2"/>
      </g>
    `
  },
  3: {
    name: 'Pelusa Terracota',
    bg: 'linear-gradient(135deg, #fb923c, #c2410c)',
    borderColor: '#ffedd5',
    textColor: '#c2410c',
    renderMonster: () => `
      <g class="pelusa-monster m-3">
        <path d="M22 84 Q30 72 40 52 Q48 38 58 44 Q70 50 74 68 Q78 80 68 84 Q45 88 22 84 Z" fill="#ea580c" stroke="#7c2d12" stroke-width="2"/>
        <g class="anim-blink">
          <ellipse cx="49" cy="54" rx="6.5" ry="7.5" fill="#ffffff" stroke="#431407" stroke-width="1.8"/>
          <circle cx="51" cy="55" r="2.8" fill="#1c1917"/>
          <circle cx="53" cy="53" r="1" fill="#ffffff"/>
          <ellipse cx="64" cy="55" rx="6.5" ry="7.5" fill="#ffffff" stroke="#431407" stroke-width="1.8"/>
          <circle cx="66" cy="56" r="2.8" fill="#1c1917"/>
          <circle cx="68" cy="54" r="1" fill="#ffffff"/>
        </g>
        <ellipse cx="58" cy="70" rx="3" ry="2" fill="#431407"/>
      </g>
    `
  },
  4: {
    name: 'Pelusa Magenta',
    bg: 'linear-gradient(135deg, #e879f9, #86198f)',
    borderColor: '#f5d0fe',
    textColor: '#86198f',
    renderMonster: () => `
      <g class="pelusa-monster m-4">
        <path d="M26 84 Q22 64 34 46 Q45 36 55 36 Q68 36 76 50 Q82 66 76 84 Q50 90 26 84 Z" fill="#c026d3" stroke="#4a044e" stroke-width="2"/>
        <polygon points="34,44 26,34 38,36" fill="#e879f9"/>
        <polygon points="68,44 76,34 64,36" fill="#e879f9"/>
        <g class="anim-blink">
          <circle cx="43" cy="52" r="7" fill="#ffffff" stroke="#4a044e" stroke-width="1.8"/>
          <circle cx="44" cy="52" r="2.8" fill="#0284c7"/>
          <circle cx="61" cy="52" r="7" fill="#ffffff" stroke="#4a044e" stroke-width="1.8"/>
          <circle cx="60" cy="52" r="2.8" fill="#0284c7"/>
        </g>
        <path class="anim-bounce" d="M42 66 Q52 78 62 66 Z" fill="#3b0764"/>
        <rect x="47" y="66" width="2.5" height="3" rx="1" fill="#ffffff"/>
        <rect x="54" y="66" width="2.5" height="3" rx="1" fill="#ffffff"/>
      </g>
    `
  },
  5: {
    name: 'Pelusa Lima',
    bg: 'linear-gradient(135deg, #a3e635, #4d7c0f)',
    borderColor: '#ecfccb',
    textColor: '#4d7c0f',
    renderMonster: () => `
      <g class="pelusa-monster m-5">
        <path d="M25 84 Q20 68 30 52 Q42 42 62 40 Q75 42 82 50 Q78 62 70 74 Q60 86 38 86 Z" fill="#84cc16" stroke="#365314" stroke-width="2"/>
        <g class="anim-wink">
          <circle cx="45" cy="54" r="7" fill="#ffffff" stroke="#1a2e05" stroke-width="1.8"/>
          <circle cx="46" cy="54" r="3" fill="#15803d"/>
          <circle cx="46" cy="54" r="1.5" fill="#0f172a"/>
          <path d="M58 54 Q64 50 70 54" stroke="#1a2e05" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        </g>
        <path d="M42 68 Q54 75 68 66" stroke="#1a2e05" stroke-width="2" fill="none"/>
        <polygon points="46,69 49,74 52,70" fill="#ffffff"/>
      </g>
    `
  },
  6: {
    name: 'Pelusa Ámbar',
    bg: 'linear-gradient(135deg, #fbbf24, #b45309)',
    borderColor: '#fef3c7',
    textColor: '#b45309',
    renderMonster: () => `
      <g class="pelusa-monster m-6">
        <ellipse cx="50" cy="65" rx="27" ry="20" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
        <g class="anim-blink">
          <path d="M35 56 Q42 50 48 56" stroke="#451a03" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          <path d="M54 56 Q60 50 67 56" stroke="#451a03" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        </g>
        <path d="M38 66 Q50 75 64 66" stroke="#451a03" stroke-width="2" fill="none"/>
        <polygon points="44,68 47,73 50,69" fill="#ffffff"/>
        <polygon points="52,69 55,73 58,68" fill="#ffffff"/>
      </g>
    `
  },
  7: {
    name: 'Pelusa Dorada',
    bg: 'linear-gradient(135deg, #fde047, #a16207)',
    borderColor: '#fef08a',
    textColor: '#a16207',
    renderMonster: () => `
      <g class="pelusa-monster m-7">
        <path d="M30 84 Q26 62 36 46 Q46 36 56 36 Q68 36 74 48 Q80 62 76 84 Q66 82 54 86 Q40 82 30 84 Z" fill="#eab308" stroke="#713f12" stroke-width="2"/>
        <g class="anim-wave-arm" transform-origin="72 56">
          <path d="M72 56 Q85 46 88 36 Q84 32 78 42 Z" fill="#facc15" stroke="#713f12" stroke-width="1.8"/>
        </g>
        <g class="anim-blink">
          <ellipse cx="43" cy="50" rx="6.5" ry="7.5" fill="#ffffff" stroke="#713f12" stroke-width="1.8"/>
          <circle cx="45" cy="50" r="3" fill="#0f172a"/>
          <ellipse cx="61" cy="50" rx="6.5" ry="7.5" fill="#ffffff" stroke="#713f12" stroke-width="1.8"/>
          <circle cx="63" cy="50" r="3" fill="#0f172a"/>
        </g>
        <path d="M42 64 Q52 72 62 64" stroke="#713f12" stroke-width="2" fill="none"/>
        <path d="M49 66 Q52 74 57 71 Q58 66 55 66 Z" fill="#f43f5e"/>
      </g>
    `
  },
  8: {
    name: 'Pelusa Índigo',
    bg: 'linear-gradient(135deg, #6366f1, #312e81)',
    borderColor: '#c7d2fe',
    textColor: '#312e81',
    renderMonster: () => `
      <g class="pelusa-monster m-8">
        <path d="M30 86 Q28 55 35 40 Q45 32 55 32 Q67 32 73 44 Q76 60 74 86 Q50 90 30 86 Z" fill="#3730a3" stroke="#1e1b4b" stroke-width="2"/>
        <g class="anim-blink">
          <ellipse cx="52" cy="52" rx="11" ry="9" fill="#ffffff" stroke="#1e1b4b" stroke-width="2"/>
          <g class="anim-look-around">
            <circle cx="52" cy="52" r="5" fill="#4338ca"/>
            <circle cx="52" cy="52" r="2.8" fill="#030712"/>
            <circle cx="54" cy="50" r="1.2" fill="#38bdf8"/>
          </g>
        </g>
        <path d="M47 70 Q52 68 57 70" stroke="#1e1b4b" stroke-width="2" stroke-linecap="round"/>
      </g>
    `
  },
  9: {
    name: 'Pelusa Esmeralda',
    bg: 'linear-gradient(135deg, #2dd4bf, #115e59)',
    borderColor: '#ccfbf1',
    textColor: '#115e59',
    renderMonster: () => `
      <g class="pelusa-monster m-9">
        <ellipse cx="50" cy="65" rx="26" ry="20" fill="#0d9488" stroke="#134e4a" stroke-width="2"/>
        <polygon points="32,46 24,34 38,38" fill="#14b8a6"/>
        <polygon points="68,46 76,34 62,38" fill="#14b8a6"/>
        <g class="anim-blink">
          <circle cx="41" cy="54" r="8" fill="#042f2e"/>
          <circle cx="41" cy="54" r="7" fill="#facc15"/>
          <circle cx="41" cy="54" r="4.5" fill="#0f172a"/>
          <circle cx="39" cy="51" r="2.4" fill="#ffffff"/>
          <circle cx="61" cy="54" r="8" fill="#042f2e"/>
          <circle cx="61" cy="54" r="7" fill="#facc15"/>
          <circle cx="61" cy="54" r="4.5" fill="#0f172a"/>
          <circle cx="59" cy="51" r="2.4" fill="#ffffff"/>
        </g>
        <path d="M44 66 Q47 70 50 67 Q53 70 56 66" stroke="#042f2e" stroke-width="2" stroke-linecap="round" fill="none"/>
      </g>
    `
  },
  10: {
    name: 'Pelusa Fiesta Rosa',
    bg: 'linear-gradient(135deg, #f43f5e, #9d174d)',
    borderColor: '#ffe4e6',
    textColor: '#9d174d',
    renderMonster: () => `
      <g class="pelusa-monster m-10 anim-jump-happy">
        <path d="M28 86 Q22 66 32 50 Q42 40 55 40 Q68 40 76 52 Q82 68 76 86 Q50 90 28 86 Z" fill="#db2777" stroke="#831843" stroke-width="2"/>
        <g class="anim-cheer-arms">
          <path d="M28 54 Q18 42 16 28 Q22 28 30 42 Z" fill="#f43f5e" stroke="#831843" stroke-width="1.8"/>
          <circle cx="17" cy="27" r="3.5" fill="#fb7185"/>
          <path d="M74 54 Q84 42 86 28 Q80 28 72 42 Z" fill="#f43f5e" stroke="#831843" stroke-width="1.8"/>
          <circle cx="85" cy="27" r="3.5" fill="#fb7185"/>
        </g>
        <g class="anim-blink">
          <circle cx="42" cy="50" r="7" fill="#ffffff" stroke="#831843" stroke-width="1.8"/>
          <circle cx="43" cy="50" r="3" fill="#0f172a"/>
          <circle cx="62" cy="50" r="7" fill="#ffffff" stroke="#831843" stroke-width="1.8"/>
          <circle cx="63" cy="50" r="3" fill="#0f172a"/>
        </g>
        <path d="M38 62 Q52 78 66 62 Z" fill="#500724" stroke="#831843" stroke-width="1.8"/>
      </g>
    `
  }
};

/**
 * Renderiza la carta completa con fondo sólido y borde visible garantizado
 */
function renderPelusaCard(value, options = {}) {
  const data = PELUSAS_DATA[value] || PELUSAS_DATA[1];
  const sizeClass = options.size || 'normal';
  const isClickable = options.isClickable;
  const extraAttrs = options.attrs || '';
  const badgeHtml = options.badge !== undefined && options.badge !== null 
    ? `<div class="card-count-badge">x${options.badge}</div>` 
    : '';

  let widthPx = 76;
  if (sizeClass === 'tiny') widthPx = 34;
  else if (sizeClass === 'avatar') widthPx = 52;
  else if (sizeClass === 'mini') widthPx = 44;
  else if (sizeClass === 'medium') widthPx = 68;
  else if (sizeClass === 'large') widthPx = 100;

  return `
    <div class="pelusa-card-wrapper card-val-${value} ${sizeClass} ${isClickable ? 'clickable' : ''}" 
         data-value="${value}" 
         ${extraAttrs}
         style="width: ${widthPx}px; aspect-ratio: 100/145; background: ${data.bg}; border: 2px solid #ffffff; border-radius: 9px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); position: relative; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: ${isClickable ? 'pointer' : 'default'};">
      
      <!-- Número grande de pegatina en la parte superior -->
      <div class="card-num-sticker" style="position: absolute; top: 3px; left: 0; right: 0; text-align: center; font-family: 'Outfit', sans-serif; font-weight: 900; font-size: ${sizeClass === 'tiny' || sizeClass === 'mini' ? '14px' : '22px'}; line-height: 1; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.6), 0 0 2px #000;">
        ${value}
      </div>

      <!-- SVG del monstrito -->
      <svg class="pelusa-card-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 85%; height: auto; margin-top: 18%; display: block; overflow: visible;">
        ${data.renderMonster()}
      </svg>
      ${badgeHtml}
    </div>
  `;
}
