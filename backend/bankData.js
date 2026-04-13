// Static bank data for supported countries
const BANKS = {
  NG: [
    { code: "044", name: "Access Bank" },
    { code: "023", name: "Citibank Nigeria" },
    { code: "050", name: "EcoBank Nigeria" },
    { code: "011", name: "First Bank of Nigeria" },
    { code: "214", name: "First City Monument Bank (FCMB)" },
    { code: "070", name: "Fidelity Bank" },
    { code: "058", name: "Guaranty Trust Bank (GTBank)" },
    { code: "030", name: "Heritage Bank" },
    { code: "301", name: "Jaiz Bank" },
    { code: "082", name: "Keystone Bank" },
    { code: "526", name: "Parallex Bank" },
    { code: "076", name: "Polaris Bank" },
    { code: "101", name: "Providus Bank" },
    { code: "221", name: "Stanbic IBTC Bank" },
    { code: "068", name: "Standard Chartered Bank" },
    { code: "232", name: "Sterling Bank" },
    { code: "100", name: "Suntrust Bank" },
    { code: "032", name: "Union Bank of Nigeria" },
    { code: "033", name: "United Bank for Africa (UBA)" },
    { code: "215", name: "Unity Bank" },
    { code: "035", name: "Wema Bank" },
    { code: "057", name: "Zenith Bank" },
  ],
  GH: [
    { code: "GCB", name: "GCB Bank" },
    { code: "ECO", name: "Ecobank Ghana" },
    { code: "CAL", name: "CalBank" },
    { code: "ADB", name: "Agricultural Development Bank" },
    { code: "SCB", name: "Standard Chartered Bank Ghana" },
    { code: "ZEN", name: "Zenith Bank Ghana" },
    { code: "UBA", name: "United Bank for Africa Ghana" },
    { code: "FBN", name: "First National Bank Ghana" },
  ],
  KE: [
    { code: "KCB", name: "KCB Bank Kenya" },
    { code: "EQT", name: "Equity Bank Kenya" },
    { code: "CBA", name: "Commercial Bank of Africa" },
    { code: "BBK", name: "Barclays Bank of Kenya" },
    { code: "SCB", name: "Standard Chartered Bank Kenya" },
    { code: "DTB", name: "Diamond Trust Bank Kenya" },
    { code: "NIC", name: "NIC Bank Kenya" },
    { code: "CFC", name: "CFC Stanbic Bank Kenya" },
  ],
  ZA: [
    { code: "ABSA", name: "ABSA Bank" },
    { code: "FNB", name: "First National Bank" },
    { code: "NED", name: "Nedbank" },
    { code: "STD", name: "Standard Bank" },
    { code: "CAP", name: "Capitec Bank" },
    { code: "INV", name: "Investec Bank" },
    { code: "TYM", name: "TymeBank" },
    { code: "DIS", name: "Discovery Bank" },
  ],
  US: [
    { code: "JPMC", name: "JPMorgan Chase" },
    { code: "BAC", name: "Bank of America" },
    { code: "WFC", name: "Wells Fargo" },
    { code: "C", name: "Citibank" },
    { code: "USB", name: "U.S. Bank" },
    { code: "PNC", name: "PNC Bank" },
    { code: "GS", name: "Goldman Sachs Bank" },
    { code: "MS", name: "Morgan Stanley Bank" },
  ],
  GB: [
    { code: "HSBC", name: "HSBC UK" },
    { code: "BARC", name: "Barclays" },
    { code: "LLOY", name: "Lloyds Bank" },
    { code: "NWB", name: "NatWest" },
    { code: "SANT", name: "Santander UK" },
    { code: "STAR", name: "Starling Bank" },
    { code: "MONT", name: "Monzo" },
    { code: "REVO", name: "Revolut" },
  ],
};

/**
 * Returns banks for a given country, optionally filtered by a search query.
 * @param {string} country - ISO 2-letter country code (e.g. "NG", "GH")
 * @param {string} [query] - Optional search string to filter by bank name or code
 * @returns {Array<{code: string, name: string}>}
 */
export function getBanks(country = "", query = "") {
  const countryBanks = BANKS[country.toUpperCase()] || [];
  if (!query) return countryBanks;
  const q = query.toLowerCase();
  return countryBanks.filter(
    (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
  );
}
