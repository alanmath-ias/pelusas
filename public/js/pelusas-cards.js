/**
 * Generador visual de las 10 cartas y monstruitos de Pelusas
 * Gráficos vectoriales SVG animados de alta fidelidad
 */

const PELUSAS_DATA = {
  1: {
    name: 'Pelusa Celeste',
    color1: '#0284c7',
    color2: '#38bdf8',
    numColor: '#38bdf8',
    copies: 13,
    renderMonster: () => `
      <g class="pelusa-monster m-1">
        <!-- Cuerpo redondo peludo -->
        <circle cx="50" cy="65" r="28" fill="#38bdf8" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <path d="M24 62 Q20 50 28 45 Q35 38 50 37 Q65 38 72 45 Q80 50 76 62 Q78 75 70 85 Q50 95 30 85 Q22 75 24 62 Z" fill="#0284c7"/>
        <circle cx="50" cy="65" r="23" fill="#38bdf8"/>
        <!-- Ojos tiernos grandes -->
        <g class="anim-blink">
          <circle cx="43" cy="58" r="9" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <circle cx="57" cy="58" r="9" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <g class="anim-look">
            <circle cx="44" cy="58" r="5" fill="#0369a1"/>
            <circle cx="44" cy="58" r="3" fill="#0f172a"/>
            <circle cx="46" cy="56" r="1.5" fill="#ffffff"/>
            <circle cx="58" cy="58" r="5" fill="#0369a1"/>
            <circle cx="58" cy="58" r="3" fill="#0f172a"/>
            <circle cx="60" cy="56" r="1.5" fill="#ffffff"/>
          </g>
        </g>
        <!-- Boca feliz -->
        <path d="M44 72 Q50 78 56 72" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="50" cy="74" rx="3" ry="2" fill="#f43f5e" opacity="0.8"/>
      </g>
    `
  },
  2: {
    name: 'Pelusa Púrpura',
    color1: '#6b21a8',
    color2: '#a855f7',
    numColor: '#c084fc',
    copies: 13,
    renderMonster: () => `
      <g class="pelusa-monster m-2">
        <!-- Cuerpo rectangular redondeado -->
        <rect x="25" y="42" width="50" height="46" rx="14" fill="#9333ea" stroke="#581c87" stroke-width="2.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Pelitos en esquinas -->
        <path d="M25 45 Q20 38 28 36 Q32 42 35 43" fill="#a855f7"/>
        <path d="M75 45 Q80 38 72 36 Q68 42 65 43" fill="#a855f7"/>
        <!-- Ojos saltones -->
        <g class="anim-blink">
          <ellipse cx="38" cy="52" rx="8" ry="7" fill="#ffffff" stroke="#2e1065" stroke-width="2"/>
          <circle cx="40" cy="52" r="3.5" fill="#10b981"/>
          <circle cx="40" cy="52" r="2" fill="#0f172a"/>
          <ellipse cx="62" cy="52" rx="8" ry="7" fill="#ffffff" stroke="#2e1065" stroke-width="2"/>
          <circle cx="60" cy="52" r="3.5" fill="#10b981"/>
          <circle cx="60" cy="52" r="2" fill="#0f172a"/>
        </g>
        <!-- Boca con lengua afuera animada -->
        <path d="M40 68 Q50 67 60 68" stroke="#2e1065" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path class="anim-tongue" d="M48 68 Q50 78 54 78 Q58 78 56 68 Z" fill="#fb7185" stroke="#be123c" stroke-width="1.5"/>
      </g>
    `
  },
  3: {
    name: 'Pelusa Terracota',
    color1: '#c2410c',
    color2: '#fb923c',
    numColor: '#fb923c',
    copies: 13,
    renderMonster: () => `
      <g class="pelusa-monster m-3">
        <!-- Cuerpo montaña inclinado -->
        <path d="M22 88 Q30 75 40 55 Q48 38 58 45 Q70 52 74 72 Q78 85 68 88 Q45 92 22 88 Z" fill="#ea580c" stroke="#7c2d12" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Mechoncitos -->
        <circle cx="30" cy="85" r="8" fill="#ea580c"/>
        <circle cx="65" cy="85" r="9" fill="#ea580c"/>
        <!-- Cejas curiosas -->
        <path class="anim-eyebrows" d="M45 48 Q50 45 54 48 M58 50 Q63 46 67 49" stroke="#7c2d12" stroke-width="2" stroke-linecap="round" fill="none"/>
        <!-- Ojos grandes expresivos -->
        <g class="anim-blink">
          <ellipse cx="49" cy="57" rx="7" ry="8" fill="#ffffff" stroke="#431407" stroke-width="2"/>
          <circle cx="51" cy="58" r="3" fill="#1c1917"/>
          <circle cx="53" cy="56" r="1.2" fill="#ffffff"/>
          <ellipse cx="64" cy="58" rx="7" ry="8" fill="#ffffff" stroke="#431407" stroke-width="2"/>
          <circle cx="66" cy="59" r="3" fill="#1c1917"/>
          <circle cx="68" cy="57" r="1.2" fill="#ffffff"/>
        </g>
        <!-- Boquita curiosa -->
        <ellipse cx="58" cy="74" rx="3.5" ry="2.5" fill="#431407"/>
      </g>
    `
  },
  4: {
    name: 'Pelusa Magenta',
    color1: '#86198f',
    color2: '#e879f9',
    numColor: '#f472b6',
    copies: 13,
    renderMonster: () => `
      <g class="pelusa-monster m-4">
        <!-- Cuerpo cúpula con mechones -->
        <path d="M26 86 Q22 65 34 46 Q45 36 55 36 Q68 36 76 52 Q82 68 76 86 Q50 92 26 86 Z" fill="#c026d3" stroke="#4a044e" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Orejitas / mechones -->
        <polygon points="34,44 26,32 38,36" fill="#e879f9" stroke="#4a044e" stroke-width="1.5"/>
        <polygon points="68,44 76,32 64,36" fill="#e879f9" stroke="#4a044e" stroke-width="1.5"/>
        <!-- Ojos redondos -->
        <g class="anim-blink">
          <circle cx="43" cy="54" r="7.5" fill="#ffffff" stroke="#4a044e" stroke-width="2"/>
          <circle cx="44" cy="54" r="3" fill="#0284c7"/>
          <circle cx="44" cy="54" r="1.5" fill="#0f172a"/>
          <circle cx="61" cy="54" r="7.5" fill="#ffffff" stroke="#4a044e" stroke-width="2"/>
          <circle cx="60" cy="54" r="3" fill="#0284c7"/>
          <circle cx="60" cy="54" r="1.5" fill="#0f172a"/>
        </g>
        <!-- Boca abierta sonriente con 2 dientitos -->
        <path class="anim-bounce" d="M42 68 Q52 82 62 68 Z" fill="#3b0764" stroke="#4a044e" stroke-width="2"/>
        <rect x="47" y="68" width="3" height="3.5" rx="1" fill="#ffffff"/>
        <rect x="54" y="68" width="3" height="3.5" rx="1" fill="#ffffff"/>
      </g>
    `
  },
  5: {
    name: 'Pelusa Lima',
    color1: '#4d7c0f',
    color2: '#a3e635',
    numColor: '#a3e635',
    copies: 13,
    renderMonster: () => `
      <g class="pelusa-monster m-5">
        <!-- Cuerpo dinámico hacia atrás -->
        <path d="M25 86 Q20 70 30 52 Q42 42 62 40 Q75 42 82 50 Q78 62 70 75 Q60 88 38 88 Z" fill="#84cc16" stroke="#365314" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Mechones peinados hacia atrás -->
        <path d="M60 40 Q78 30 76 44 M52 38 Q68 24 64 40 M45 42 Q58 20 54 38" stroke="#365314" stroke-width="2" fill="#a3e635"/>
        <!-- Ojos: Guiño animado pillo -->
        <g class="anim-wink">
          <!-- Ojo izquierdo bien abierto -->
          <circle cx="45" cy="56" r="7.5" fill="#ffffff" stroke="#1a2e05" stroke-width="2"/>
          <circle cx="46" cy="56" r="3.2" fill="#15803d"/>
          <circle cx="46" cy="56" r="1.8" fill="#0f172a"/>
          <!-- Ojo derecho guiñando -->
          <path class="eye-wink-line" d="M58 56 Q64 51 70 56" stroke="#1a2e05" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        </g>
        <!-- Sonrisa traviesa con colmillo -->
        <path d="M42 70 Q54 78 68 68" stroke="#1a2e05" stroke-width="2" fill="none"/>
        <polygon points="46,71 49,76 52,72" fill="#ffffff" stroke="#1a2e05" stroke-width="1"/>
      </g>
    `
  },
  6: {
    name: 'Pelusa Ámbar',
    color1: '#b45309',
    color2: '#fbbf24',
    numColor: '#f59e0b',
    copies: 9,
    renderMonster: () => `
      <g class="pelusa-monster m-6">
        <!-- Cuerpo gordito suave -->
        <ellipse cx="50" cy="68" rx="28" ry="22" fill="#f59e0b" stroke="#78350f" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <path d="M26 66 Q20 54 28 50 Q36 48 48 48 Q64 48 72 50 Q80 54 74 66" fill="#f59e0b"/>
        <!-- Ojos dormilones felices -->
        <g class="anim-blink">
          <path d="M35 58 Q42 52 48 58" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <circle cx="42" cy="59" r="1.8" fill="#451a03"/>
          <path d="M54 58 Q60 52 67 58" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <circle cx="60" cy="59" r="1.8" fill="#451a03"/>
        </g>
        <!-- Sonrisa pilla con dos pequeños colmillos -->
        <path d="M38 68 Q50 78 64 68" stroke="#451a03" stroke-width="2" fill="none"/>
        <polygon points="44,70 47,75 50,71" fill="#ffffff" stroke="#451a03" stroke-width="1"/>
        <polygon points="52,71 55,75 58,70" fill="#ffffff" stroke="#451a03" stroke-width="1"/>
      </g>
    `
  },
  7: {
    name: 'Pelusa Dorada',
    color1: '#a16207',
    color2: '#fde047',
    numColor: '#facc15',
    copies: 9,
    renderMonster: () => `
      <g class="pelusa-monster m-7">
        <!-- Cuerpo fantasmita alegre -->
        <path d="M30 86 Q26 62 36 46 Q46 36 56 36 Q68 36 74 48 Q80 62 76 86 Q66 84 54 88 Q40 84 30 86 Z" fill="#eab308" stroke="#713f12" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Brazo saludando con animación continua -->
        <g class="anim-wave-arm" transform-origin="72 58">
          <path d="M72 58 Q85 48 88 38 Q84 34 78 44 Z" fill="#facc15" stroke="#713f12" stroke-width="2"/>
          <circle cx="86" cy="38" r="4" fill="#fde047"/>
        </g>
        <!-- Ojos alegres -->
        <g class="anim-blink">
          <ellipse cx="43" cy="52" rx="7" ry="8" fill="#ffffff" stroke="#713f12" stroke-width="2"/>
          <circle cx="45" cy="52" r="3.2" fill="#0f172a"/>
          <circle cx="47" cy="50" r="1.2" fill="#ffffff"/>
          <ellipse cx="61" cy="52" rx="7" ry="8" fill="#ffffff" stroke="#713f12" stroke-width="2"/>
          <circle cx="63" cy="52" r="3.2" fill="#0f172a"/>
          <circle cx="65" cy="50" r="1.2" fill="#ffffff"/>
        </g>
        <!-- Boca contenta sacando la lengua -->
        <path d="M42 66 Q52 74 62 66" stroke="#713f12" stroke-width="2" fill="none"/>
        <path d="M49 68 Q52 76 57 73 Q58 68 55 68 Z" fill="#f43f5e" stroke="#9f1239" stroke-width="1.2"/>
      </g>
    `
  },
  8: {
    name: 'Pelusa Índigo',
    color1: '#312e81',
    color2: '#6366f1',
    numColor: '#818cf8',
    copies: 9,
    renderMonster: () => `
      <g class="pelusa-monster m-8">
        <!-- Cuerpo alargado vertical misterioso -->
        <path d="M30 88 Q28 55 35 40 Q45 32 55 32 Q67 32 73 44 Q76 60 74 88 Q50 92 30 88 Z" fill="#3730a3" stroke="#1e1b4b" stroke-width="2.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Mechones sombríos en la base -->
        <path d="M26 86 Q35 78 45 88 Q55 80 65 88 Q72 82 78 86" fill="none" stroke="#1e1b4b" stroke-width="2"/>
        <!-- Único OJO central misterioso -->
        <g class="anim-blink">
          <ellipse cx="52" cy="54" rx="12" ry="10" fill="#ffffff" stroke="#1e1b4b" stroke-width="2.5"/>
          <g class="anim-look-around">
            <circle cx="52" cy="54" r="5.5" fill="#4338ca"/>
            <circle cx="52" cy="54" r="3" fill="#030712"/>
            <circle cx="54" cy="52" r="1.5" fill="#38bdf8"/>
          </g>
        </g>
        <!-- Boca sutil enigmática -->
        <path d="M47 72 Q52 70 57 72" stroke="#1e1b4b" stroke-width="2" stroke-linecap="round"/>
      </g>
    `
  },
  9: {
    name: 'Pelusa Esmeralda',
    color1: '#115e59',
    color2: '#2dd4bf',
    numColor: '#2dd4bf',
    copies: 9,
    renderMonster: () => `
      <g class="pelusa-monster m-9">
        <!-- Criatura peluda estilo gatito suave -->
        <ellipse cx="50" cy="68" rx="27" ry="22" fill="#0d9488" stroke="#134e4a" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Orejitas peludas -->
        <polygon points="32,48 24,36 38,40" fill="#14b8a6" stroke="#134e4a" stroke-width="1.5"/>
        <polygon points="68,48 76,36 62,40" fill="#14b8a6" stroke="#134e4a" stroke-width="1.5"/>
        <!-- Ojos anime súper brillantes y tiernos -->
        <g class="anim-blink">
          <circle cx="41" cy="56" r="9" fill="#042f2e" stroke="#134e4a" stroke-width="1.5"/>
          <circle cx="41" cy="56" r="8" fill="#facc15"/>
          <circle cx="41" cy="56" r="5" fill="#0f172a"/>
          <circle cx="39" cy="53" r="2.8" fill="#ffffff"/>
          <circle cx="43" cy="58" r="1.3" fill="#ffffff"/>

          <circle cx="61" cy="56" r="9" fill="#042f2e" stroke="#134e4a" stroke-width="1.5"/>
          <circle cx="61" cy="56" r="8" fill="#facc15"/>
          <circle cx="61" cy="56" r="5" fill="#0f172a"/>
          <circle cx="59" cy="53" r="2.8" fill="#ffffff"/>
          <circle cx="63" cy="58" r="1.3" fill="#ffffff"/>
        </g>
        <!-- Boquita estilo :3 tierna -->
        <path d="M44 68 Q47 72 50 69 Q53 72 56 68" stroke="#042f2e" stroke-width="2" stroke-linecap="round" fill="none"/>
      </g>
    `
  },
  10: {
    name: 'Pelusa Fiesta Rosa',
    color1: '#9d174d',
    color2: '#f43f5e',
    numColor: '#fb7185',
    copies: 9,
    renderMonster: () => `
      <g class="pelusa-monster m-10 anim-jump-happy">
        <!-- Cuerpo eufórico de celebración -->
        <path d="M28 88 Q22 66 32 50 Q42 40 55 40 Q68 40 76 52 Q82 68 76 88 Q50 92 28 88 Z" fill="#db2777" stroke="#831843" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <!-- Brazos levantados arriba festejando -->
        <g class="anim-cheer-arms">
          <path d="M28 54 Q18 42 16 28 Q22 28 30 42 Z" fill="#f43f5e" stroke="#831843" stroke-width="2"/>
          <circle cx="17" cy="27" r="4" fill="#fb7185"/>
          <path d="M74 54 Q84 42 86 28 Q80 28 72 42 Z" fill="#f43f5e" stroke="#831843" stroke-width="2"/>
          <circle cx="85" cy="27" r="4" fill="#fb7185"/>
        </g>
        <!-- Ojos súper felices -->
        <g class="anim-blink">
          <circle cx="42" cy="52" r="7.5" fill="#ffffff" stroke="#831843" stroke-width="2"/>
          <circle cx="43" cy="52" r="3.2" fill="#0f172a"/>
          <circle cx="45" cy="50" r="1.3" fill="#ffffff"/>
          <circle cx="62" cy="52" r="7.5" fill="#ffffff" stroke="#831843" stroke-width="2"/>
          <circle cx="63" cy="52" r="3.2" fill="#0f172a"/>
          <circle cx="65" cy="50" r="1.3" fill="#ffffff"/>
        </g>
        <!-- Boca gigante feliz cantando ¡10! -->
        <path d="M38 64 Q52 82 66 64 Z" fill="#500724" stroke="#831843" stroke-width="2"/>
        <path d="M46 72 Q52 76 58 72" fill="#fb7185"/>
      </g>
    `
  }
};

/**
 * Genera el HTML de una carta de Pelusas
 * @param {number} value Número de la carta (1 al 10)
 * @param {object} options Opciones de presentación { size: 'normal'|'small'|'large', isClickable: boolean, badge: string|number }
 */
function renderPelusaCard(value, options = {}) {
  const data = PELUSAS_DATA[value] || PELUSAS_DATA[1];
  const sizeClass = options.size || 'normal';
  const clickableClass = options.isClickable ? 'clickable' : '';
  const badgeHtml = options.badge !== undefined && options.badge !== null 
    ? `<div class="card-count-badge">x${options.badge}</div>` 
    : '';

  return `
    <div class="pelusa-card-wrapper card-val-${value} ${sizeClass} ${clickableClass}" data-value="${value}">
      <svg class="pelusa-card-svg" viewBox="0 0 100 145" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad_${value}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${data.color2}" />
            <stop offset="100%" stop-color="${data.color1}" />
          </linearGradient>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.3"/>
          </filter>
        </defs>

        <!-- Fondo de la carta con textura suave -->
        <rect x="3" y="3" width="94" height="139" rx="10" fill="url(#grad_${value})" stroke="#ffffff" stroke-width="2.5" filter="url(#card-shadow)"/>
        
        <!-- Textura de manchas / polvo tenue -->
        <g opacity="0.15" fill="#ffffff">
          <circle cx="20" cy="30" r="14"/>
          <circle cx="80" cy="40" r="18"/>
          <circle cx="25" cy="115" r="16"/>
          <circle cx="75" cy="120" r="20"/>
        </g>

        <!-- Número estilizado con borde de pegatina blanca idéntico a las cartas reales -->
        <g class="card-number-sticker">
          <text x="50" y="34" text-anchor="middle" font-family="'Outfit', sans-serif" font-weight="900" font-size="${value === 10 ? '30' : '34'}" fill="#ffffff" stroke="#ffffff" stroke-width="6" stroke-linejoin="round">${value}</text>
          <text x="50" y="34" text-anchor="middle" font-family="'Outfit', sans-serif" font-weight="900" font-size="${value === 10 ? '30' : '34'}" fill="${data.color1}">${value}</text>
        </g>

        <!-- Monstrito ilustrado y animado -->
        <g transform="translate(0, 32)">
          ${data.renderMonster()}
        </g>
      </svg>
      ${badgeHtml}
    </div>
  `;
}
