// Hero SVG dimensions
const W = 560, H = 200;
const PAD = { l: 24, r: 16, t: 20, b: 32 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;
const X_MIN = 400, X_MAX = 2500;
const Y_MAX = 0.92;

// Real oak leaf (fresh) spectrum from USGS Spectral Library 7b, sampled every 6 nm
// Shows chlorophyll absorption dip at ~672 nm and the steep red edge rise to ~750 nm
const OAK_LEAF_DATA: [number, number][] = [
  [402, 0.0955], [408, 0.0954], [414, 0.0955], [420, 0.0956], [426, 0.0962], [432, 0.0965],
  [438, 0.0966], [444, 0.0968], [450, 0.097], [456, 0.0973], [462, 0.0975], [468, 0.0976],
  [474, 0.0976], [480, 0.0977], [486, 0.0978], [492, 0.0981], [498, 0.099], [504, 0.1007],
  [510, 0.1042], [516, 0.1112], [522, 0.1234], [528, 0.1393], [534, 0.1535], [540, 0.163],
  [546, 0.1694], [552, 0.1744], [558, 0.1753], [564, 0.1698], [570, 0.1598], [576, 0.148],
  [582, 0.1389], [588, 0.1329], [594, 0.1292], [600, 0.1271], [606, 0.1245], [612, 0.1204],
  [618, 0.1162], [624, 0.1135], [630, 0.1123], [636, 0.1115], [642, 0.1093], [648, 0.106],
  [654, 0.1035], [660, 0.1012], [666, 0.0989], [672, 0.0977], [678, 0.0978], [684, 0.0991],
  [690, 0.1038], [696, 0.1217], [702, 0.1677], [708, 0.2372], [714, 0.3171], [720, 0.4022],
  [726, 0.4897], [732, 0.5731], [738, 0.6465], [744, 0.7065], [750, 0.7519], [756, 0.7833],
  [762, 0.8031], [768, 0.8153], [774, 0.8228], [780, 0.8277], [786, 0.8311], [792, 0.8338],
  [798, 0.8361], [804, 0.838], [810, 0.8398], [816, 0.8416], [822, 0.8434], [828, 0.8453],
  [834, 0.8468], [840, 0.8489], [846, 0.8513], [852, 0.8537], [858, 0.856], [864, 0.858],
  [870, 0.8596], [876, 0.861], [882, 0.862], [888, 0.8627], [894, 0.863], [900, 0.8631],
  [906, 0.8631], [912, 0.8628], [918, 0.8625], [924, 0.8618], [930, 0.8605], [936, 0.8587],
  [942, 0.8561], [948, 0.8515], [954, 0.8451], [960, 0.8357], [966, 0.828], [972, 0.8242],
  [978, 0.8227], [984, 0.8225], [990, 0.8237], [996, 0.8265], [1002, 0.8329], [1008, 0.8376],
  [1014, 0.8408], [1020, 0.8443], [1026, 0.8488], [1032, 0.8527], [1038, 0.8564], [1044, 0.8595],
  [1050, 0.8625], [1056, 0.8647], [1062, 0.8666], [1068, 0.8678], [1074, 0.8687], [1080, 0.8687],
  [1086, 0.8683], [1092, 0.8671], [1098, 0.8655], [1104, 0.8635], [1110, 0.8605], [1116, 0.8573],
  [1122, 0.8519], [1128, 0.8432], [1134, 0.8286], [1140, 0.8081], [1146, 0.7851], [1152, 0.7648],
  [1158, 0.7509], [1164, 0.7429], [1170, 0.7386], [1176, 0.7356], [1182, 0.7324], [1188, 0.7294],
  [1194, 0.7274], [1200, 0.7267], [1206, 0.7272], [1212, 0.7291], [1218, 0.7334], [1224, 0.739],
  [1230, 0.745], [1236, 0.7499], [1242, 0.754], [1248, 0.7575], [1254, 0.7599], [1260, 0.7616],
  [1266, 0.7622], [1272, 0.7619], [1278, 0.7608], [1284, 0.7586], [1290, 0.755], [1296, 0.75],
  [1302, 0.7429], [1308, 0.7339], [1314, 0.7226], [1320, 0.7088], [1326, 0.6928], [1332, 0.6751],
  [1338, 0.657], [1344, 0.6395], [1350, 0.6238], [1356, 0.6095], [1362, 0.5947], [1368, 0.5766],
  [1374, 0.5522], [1380, 0.5179], [1386, 0.4718], [1392, 0.4188], [1398, 0.3667], [1404, 0.3225],
  [1410, 0.2895], [1416, 0.2674], [1422, 0.2537], [1428, 0.2456], [1434, 0.2415], [1440, 0.24],
  [1446, 0.2402], [1452, 0.2415], [1458, 0.2435], [1464, 0.2472], [1470, 0.253], [1476, 0.261],
  [1482, 0.2704], [1488, 0.2804], [1494, 0.291], [1500, 0.3018], [1506, 0.3128], [1512, 0.3237],
  [1518, 0.3344], [1524, 0.3449], [1530, 0.355], [1536, 0.3648], [1542, 0.3741], [1548, 0.3831],
  [1554, 0.3917], [1560, 0.3997], [1566, 0.4073], [1572, 0.4144], [1578, 0.4214], [1584, 0.4281],
  [1590, 0.4346], [1596, 0.4409], [1602, 0.4469], [1608, 0.4526], [1614, 0.4578], [1620, 0.4624],
  [1626, 0.4667], [1632, 0.4704], [1638, 0.4736], [1644, 0.4758], [1650, 0.477], [1656, 0.4767],
  [1662, 0.4755], [1668, 0.474], [1674, 0.4722], [1680, 0.4697], [1686, 0.4661], [1692, 0.4614],
  [1698, 0.4565], [1704, 0.4509], [1710, 0.4449], [1716, 0.4389], [1722, 0.4327], [1728, 0.4272],
  [1734, 0.4244], [1740, 0.4226], [1746, 0.4195], [1752, 0.4145], [1758, 0.4093], [1764, 0.4049],
  [1770, 0.4019], [1776, 0.3998], [1782, 0.398], [1788, 0.3968], [1794, 0.3964], [1800, 0.3965],
  [1806, 0.3962], [1812, 0.397], [1818, 0.3972], [1824, 0.3972], [1830, 0.3961], [1836, 0.3938],
  [1842, 0.3889], [1848, 0.3804], [1854, 0.3671], [1860, 0.347], [1866, 0.3197], [1872, 0.2835],
  [1878, 0.2411], [1884, 0.1988], [1890, 0.1619], [1896, 0.1352], [1902, 0.1193], [1908, 0.1109],
  [1914, 0.1069], [1920, 0.1052], [1926, 0.1047], [1932, 0.1051], [1938, 0.1061], [1944, 0.1078],
  [1950, 0.1098], [1956, 0.1124], [1962, 0.1155], [1968, 0.1188], [1974, 0.1227], [1980, 0.127],
  [1986, 0.1316], [1992, 0.1366], [1998, 0.1415], [2004, 0.1466], [2010, 0.1518], [2016, 0.1568],
  [2022, 0.1615], [2028, 0.1659], [2034, 0.1699], [2040, 0.1736], [2046, 0.1769], [2052, 0.1801],
  [2058, 0.1833], [2064, 0.187], [2070, 0.1907], [2076, 0.1945], [2082, 0.1981], [2088, 0.2014],
  [2094, 0.2046], [2100, 0.2079], [2106, 0.2108], [2112, 0.2137], [2118, 0.2163], [2124, 0.2186],
  [2130, 0.2206], [2136, 0.2225], [2142, 0.2243], [2148, 0.2264], [2154, 0.2286], [2160, 0.2308],
  [2166, 0.233], [2172, 0.2354], [2178, 0.2379], [2184, 0.2404], [2190, 0.2432], [2196, 0.2459],
  [2202, 0.2481], [2208, 0.2499], [2214, 0.2511], [2220, 0.2513], [2226, 0.2507], [2232, 0.2487],
  [2238, 0.2453], [2244, 0.241], [2250, 0.236], [2256, 0.2304], [2262, 0.225], [2268, 0.2197],
  [2274, 0.2152], [2280, 0.211], [2286, 0.207], [2292, 0.2026], [2298, 0.1978], [2304, 0.1931],
  [2310, 0.1896], [2316, 0.1883], [2322, 0.1882], [2328, 0.1865], [2334, 0.1834], [2340, 0.1794],
  [2346, 0.1756], [2352, 0.1727], [2358, 0.1709], [2364, 0.1689], [2370, 0.1662], [2376, 0.1636],
  [2382, 0.1605], [2388, 0.1574], [2394, 0.1548], [2400, 0.1517], [2406, 0.1488], [2412, 0.1458],
  [2418, 0.1426], [2424, 0.1395], [2430, 0.1368], [2436, 0.1335], [2442, 0.1305], [2448, 0.1284],
  [2454, 0.1256], [2460, 0.1232], [2466, 0.1209], [2472, 0.12], [2478, 0.1177], [2484, 0.1178],
  [2490, 0.1165], [2496, 0.1182],
];

const xs = (v: number) => PAD.l + ((v - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
const ys = (v: number) => PAD.t + PLOT_H - (v / Y_MAX) * PLOT_H;

// Compute path once at module load — static data, no props
const SAMPLES = OAK_LEAF_DATA.filter(([w]) => w >= X_MIN && w <= X_MAX);
const PATH = SAMPLES.map(([lam, r], i) =>
  `${i === 0 ? "M" : "L"}${xs(lam).toFixed(2)} ${ys(r).toFixed(2)}`
).join(" ");

// Lens centered on the chlorophyll absorption feature around 680 nm
const LENS_WAVELENGTH = 680;
const LENS_R = OAK_LEAF_DATA.reduce((a, b) =>
  Math.abs(b[0] - LENS_WAVELENGTH) < Math.abs(a[0] - LENS_WAVELENGTH) ? b : a
)[1];
const GLASS_CX = xs(LENS_WAVELENGTH);
const GLASS_CY = ys(LENS_R);
const GLASS_R = 62;
const ZOOM = 1.5;

const H2O_GAPS: [number, number][] = [[1350, 1450], [1800, 1950]];
const X_TICKS = [400, 800, 1200, 1600, 2000, 2400];

export default function MagnifyingGlassHero() {
  const handleAngle = Math.PI / 4;
  const handleX1 = GLASS_CX + Math.cos(handleAngle) * GLASS_R;
  const handleY1 = GLASS_CY + Math.sin(handleAngle) * GLASS_R;
  const handleX2 = GLASS_CX + Math.cos(handleAngle) * (GLASS_R + 38);
  const handleY2 = GLASS_CY + Math.sin(handleAngle) * (GLASS_R + 38);

  const specularCx = GLASS_CX - GLASS_R * 0.38;
  const specularCy = GLASS_CY - GLASS_R * 0.48;

  return (
    <div style={{ position: "relative", width: W, height: H + 16 }}>
      <svg width={W} height={H + 16} style={{ overflow: "visible" }}>
        <defs>
          <clipPath id="lens-clip">
            <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 4} />
          </clipPath>
          <filter id="lens-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="black" floodOpacity="0.15" />
          </filter>
          <radialGradient id="lens-tint" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="40%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.06 }} />
          </radialGradient>
        </defs>

        {/* Axis baselines */}
        <line x1={PAD.l} y1={PAD.t + PLOT_H} x2={PAD.l + PLOT_W} y2={PAD.t + PLOT_H}
          style={{ stroke: "var(--color-border)" }} strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PLOT_H}
          style={{ stroke: "var(--color-border)" }} strokeWidth="1" />

        {/* X ticks */}
        {X_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={xs(t)} x2={xs(t)}
              y1={PAD.t + PLOT_H} y2={PAD.t + PLOT_H + 3}
              style={{ stroke: "var(--color-ink-soft)" }} strokeWidth="0.8"
            />
            <text
              x={xs(t)} y={PAD.t + PLOT_H + 14}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--color-ink-soft)" }}
            >
              {t}
            </text>
          </g>
        ))}

        {/* H₂O gap bands */}
        {H2O_GAPS.map(([lo, hi], i) => (
          <rect
            key={i} x={xs(lo)} y={PAD.t}
            width={xs(hi) - xs(lo)} height={PLOT_H}
            style={{ fill: "var(--color-border-soft)" }} opacity="0.6"
          />
        ))}

        {/* Base spectrum line */}
        <path d={PATH} fill="none"
          style={{ stroke: "var(--color-ink)" }}
          strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9"
        />

        {/* Magnified content inside lens */}
        <g clipPath="url(#lens-clip)">
          <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 4}
            style={{ fill: "var(--color-surface)" }} />
          {/* Crosshair guides */}
          <line
            x1={GLASS_CX - GLASS_R} x2={GLASS_CX + GLASS_R}
            y1={GLASS_CY} y2={GLASS_CY}
            style={{ stroke: "var(--color-border)" }}
            strokeDasharray="2 3" strokeWidth="0.8" opacity="0.6"
          />
          <line
            x1={GLASS_CX} x2={GLASS_CX}
            y1={GLASS_CY - GLASS_R} y2={GLASS_CY + GLASS_R}
            style={{ stroke: "var(--color-border)" }}
            strokeDasharray="2 3" strokeWidth="0.8" opacity="0.6"
          />
          {/* Zoomed path via SVG transform */}
          <g transform={`translate(${GLASS_CX} ${GLASS_CY}) scale(${ZOOM}) translate(${-GLASS_CX} ${-GLASS_CY})`}>
            <path d={PATH} fill="none"
              style={{ stroke: "var(--color-accent)" }}
              strokeWidth={1.4 / ZOOM * 1.6}
              strokeLinejoin="round" strokeLinecap="round"
            />
          </g>
          {/* Label */}
          <text
            x={GLASS_CX - 28} y={GLASS_CY + GLASS_R - 12}
            style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--color-accent)" }}
            opacity="0.85"
          >
            chlorophyll
          </text>
        </g>

        {/* Glass tint overlay */}
        <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 4}
          fill="url(#lens-tint)" style={{ pointerEvents: "none" }} />

        {/* Lens rim and handle */}
        <g filter="url(#lens-shadow)">
          <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R}
            fill="none" style={{ stroke: "var(--color-ink)" }} strokeWidth="3.5" />
          <circle cx={GLASS_CX} cy={GLASS_CY} r={GLASS_R - 3.5}
            fill="none" style={{ stroke: "var(--color-ink)" }} strokeWidth="0.6" opacity="0.3" />
          <line
            x1={handleX1} y1={handleY1} x2={handleX2} y2={handleY2}
            style={{ stroke: "var(--color-ink)" }} strokeWidth="6.5" strokeLinecap="round"
          />
        </g>

        {/* Specular highlight */}
        <ellipse
          cx={specularCx} cy={specularCy}
          rx={GLASS_R * 0.28} ry={GLASS_R * 0.12}
          fill="white" opacity="0.55"
          transform={`rotate(-35 ${specularCx} ${specularCy})`}
        />
      </svg>
    </div>
  );
}
