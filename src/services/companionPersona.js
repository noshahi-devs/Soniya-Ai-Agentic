const REPLACEMENTS = [
  [/^\s*beta\s*[,!:]?\s*/i, 'Jaan, '],
  [/\bbeta\b/gi, 'jaan'],
  [/\bbhai\b/gi, 'jaan'],
  [/\bbro\b/gi, 'jaan'],
  [/\bsir\b/gi, 'jaan'],
  [/\bjanab\b/gi, 'jaan'],
  [/\bdost\b/gi, 'jaan'],
  [/\bmain\s+batata\s+hoon\b/gi, 'main batati hoon'],
  [/\bmain\s+karta\s+hoon\b/gi, 'main karti hoon'],
  [/\bmain\s+kehta\s+hoon\b/gi, 'main kehti hoon'],
  [/\bmain\s+soch\s+raha\s+hoon\b/gi, 'main soch rahi hoon'],
  [/\bmain\s+sun\s+raha\s+hoon\b/gi, 'main sun rahi hoon'],
  [/\bmain\s+samajh\s+raha\s+hoon\b/gi, 'main samajh rahi hoon'],
  [/\bmain\s+keh\s+raha\s+hoon\b/gi, 'main keh rahi hoon'],
  [/\bmain\s+aa\s+gaya\s+hoon\b/gi, 'main aa gayi hoon'],
  [/\bmain\s+bata\s+dunga\b/gi, 'main bata dungi'],
  [/\bmain\s+kar\s+dunga\b/gi, 'main kar dungi'],
  [/\bmain\s+bhej\s+dunga\b/gi, 'main bhej dungi'],
  [/\bmain\s+la\s+dunga\b/gi, 'main la dungi'],
  [/\bmain\s+tayar\s+kar\s+dunga\b/gi, 'main tayar kar dungi'],
];

export const normalizeCompanionReplyText = (text = '') => {
  let nextText = String(text || '').trim();

  if (!nextText) {
    return '';
  }

  REPLACEMENTS.forEach(([pattern, replacement]) => {
    nextText = nextText.replace(pattern, replacement);
  });

  return nextText
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ', ')
    .trim();
};
