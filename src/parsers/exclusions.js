/**
 * Address exclusion helpers and lists.
 */

// TODO: add more address suffixes as we support them.
const ADDRESS_SUFFIXES = ['.eth', '.base.eth', '.sol', '.near'];

// Domain exclusions apply to full tokens and also match subdomains/paths.
const DOMAIN_EXCLUSION_LIST = ['claude.ai'];

// Treat letters, numbers, and underscores as "word continuation" so
// matches like "x.ethers" are excluded, while emoji after "x.eth" are allowed.
const WORD_CONTINUATION_PATTERN = /[\p{L}\p{N}_]/u;

// Check if the matched candidate substring ends with a supported address suffix.
function hasKnownAddressSuffix(candidate) {
  const lowerCandidate = candidate.toLowerCase();
  return ADDRESS_SUFFIXES.some((suffix) => lowerCandidate.endsWith(suffix));
}

// Return the whitespace-delimited token containing the matched substring.
function getToken(text, startIndex) {
  let start = startIndex;
  let end = startIndex;

  while (start > 0 && !/\s/.test(text[start - 1])) {
    start -= 1;
  }

  while (end < text.length && !/\s/.test(text[end])) {
    end += 1;
  }

  return text.slice(start, end);
}

// Decide if a candidate match should be excluded based on suffixes,
// word-continuation, or domain exclusion list.
function isExcludedAddressMatch(candidate, text, startIndex) {
  if (!hasKnownAddressSuffix(candidate)) {
    return true;
  }

  const nextChar = text[startIndex + candidate.length];
  if (nextChar && WORD_CONTINUATION_PATTERN.test(nextChar)) {
    return true;
  }

  const token = getToken(text, startIndex).toLowerCase();
  for (const domain of DOMAIN_EXCLUSION_LIST) {
    if (token.includes(domain)) {
      return true;
    }
  }

  return false;
}

const AddressExclusions = {
  ADDRESS_SUFFIXES,
  DOMAIN_EXCLUSION_LIST,
  WORD_CONTINUATION_PATTERN,
  hasKnownAddressSuffix,
  getToken,
  isExcludedAddressMatch,
};

if (typeof window !== 'undefined') {
  window.AddressExclusions = AddressExclusions;
}
