/**
 * Utility to parse Size-Price pair strings configured by Admin in Expo RN app
 * Example input: "26-400, 28-420, 30-450, 32-480, 34-510, 36-540" or "26:400, 28:420"
 */
export function parseSizePriceMapping(input, fallbackPrice = 699) {
  const sizePrices = {};
  const sizes = [];

  if (!input || !input.trim()) {
    const defaultSizes = ['26', '28', '30', '32', '34', '36'];
    const defaultMapping = {
      '26': 400,
      '28': 420,
      '30': 450,
      '32': 480,
      '34': 510,
      '36': 540,
    };
    return {
      sizes: defaultSizes,
      sizePrices: defaultMapping,
      basePrice: 400,
      sizesText: 'Sizes: 26-36',
    };
  }

  // Split by comma, semicolon, or newline
  const items = input.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

  for (const item of items) {
    // Regex matches size name and price e.g. "26-400", "26: 400", "26 = 400", "26 (₹400)"
    const match = item.match(/^([A-Za-z0-9\s]+?)\s*[:\-=\s]\s*₹?(\d+(?:\.\d+)?)$/);
    if (match) {
      const sizeKey = match[1].trim();
      const priceVal = parseFloat(match[2]);
      if (sizeKey && !isNaN(priceVal)) {
        sizes.push(sizeKey);
        sizePrices[sizeKey] = priceVal;
      }
    } else {
      // Single size without explicit price separator
      const cleanSize = item.replace(/₹\d+/g, '').trim();
      if (cleanSize) {
        sizes.push(cleanSize);
        sizePrices[cleanSize] = Number(fallbackPrice) || 500;
      }
    }
  }

  if (sizes.length === 0) {
    const defaultSizes = ['26', '28', '30', '32', '34', '36'];
    const defaultMapping = {
      '26': 400,
      '28': 420,
      '30': 450,
      '32': 480,
      '34': 510,
      '36': 540,
    };
    return {
      sizes: defaultSizes,
      sizePrices: defaultMapping,
      basePrice: 400,
      sizesText: 'Sizes: 26-36',
    };
  }

  const priceValues = Object.values(sizePrices);
  const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : fallbackPrice;
  const cleanSummary =
    sizes.length > 1
      ? `Sizes: ${sizes[0]}-${sizes[sizes.length - 1]}`
      : sizes.length === 1
      ? `Size: ${sizes[0]}`
      : 'Sizes Available';

  return {
    sizes,
    sizePrices,
    basePrice: minPrice,
    sizesText: cleanSummary,
  };
}

/**
 * Format sizePrices object back into editable string format "26-400, 28-420, 30-450..."
 */
export function stringifySizePrices(sizes = [], sizePrices = {}, fallbackText = '') {
  if (sizePrices && Object.keys(sizePrices).length > 0) {
    return Object.entries(sizePrices)
      .map(([sz, pr]) => `${sz}-${pr}`)
      .join(', ');
  }
  if (Array.isArray(sizes) && sizes.length > 0) {
    return sizes.join(', ');
  }
  return fallbackText || '26-400, 28-420, 30-450, 32-480, 34-510, 36-540';
}
