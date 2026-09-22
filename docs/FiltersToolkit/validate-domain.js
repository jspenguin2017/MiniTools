const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * Validate a plain ASCII hostname, IPv4 address, or bracketed IPv6 address.
 * Hostnames require at least two labels. Callers trim input; spelling is preserved.
 * @param {string} domain Domain to validate without a scheme, port, or path.
 * @returns {boolean} Whether the domain is supported by all domain tools.
 */
export function isValidDomain(domain) {
  if (domain.length > 253 || /[^a-z0-9.:[\]-]/i.test(domain)) {
    return false;
  }
  if (domain.startsWith("[") && domain.endsWith("]")) {
    return URL.canParse("https://" + domain);
  }
  const labels = domain.split(".");
  return (
    labels.length >= 2 &&
    labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label)) &&
    // URL parsing also rejects invalid IP addresses.
    URL.canParse("https://" + domain)
  );
}
