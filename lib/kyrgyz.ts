const KYRGYZ_CHARS = /[А-Яа-яЁёҢңӨөҮү]/g;
const LATIN_CHARS = /[A-Za-z]/g;

export function isMostlyKyrgyz(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  const kyrgyzMatches = trimmed.match(KYRGYZ_CHARS)?.length ?? 0;
  const latinMatches = trimmed.match(LATIN_CHARS)?.length ?? 0;
  const totalLetters = kyrgyzMatches + latinMatches;
  if (totalLetters === 0) {
    return false;
  }
  const kyrgyzRatio = kyrgyzMatches / totalLetters;
  return kyrgyzRatio >= 0.7;
}

export function kyrgyzSystemPrompt() {
  return [
    "Сен ARIS — кыргыз тилинде гана жооп берген үн жардамчысың.",
    "Каалаган тилде суроо берилсе да, жоопту сөзсүз кыргызча бер.",
    "Кыска, түшүнүктүү жана сылык бол.",
    "Эгер кыргызча эмес жооп чыкса, дароо кыргызча кайра жаз."
  ].join(" ");
}
