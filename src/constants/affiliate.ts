export const AFFILIATE_COOKIE_MARKERS = [
  // High confidence
  {
    pattern: /aff_id|affid|affiliateid|affiliate_id/i,
    score: 10,
    label: 'Affiliate ID',
  },
  {
    pattern: /clickid|click_id|cj_data|cjclick|irclickid/i,
    score: 10,
    label: 'Click tracking ID',
  },
  {
    pattern: /subid|sub_id|sid|transaction_id|txid/i,
    score: 9,
    label: 'Sub-ID / Transaction ID',
  },
  { pattern: /partnerid|partner_id|pid/i, score: 8, label: 'Partner ID' },
  { pattern: /campaignid|campaign_id|cid/i, score: 8, label: 'Campaign ID' },

  // Medium-high
  {
    pattern: /utm_source|utm_medium|utm_campaign|utm_content|utm_term/i,
    score: 6,
    label: 'UTM tracking',
  },
  {
    pattern: /ref|referrer|refer|refid|ref_id/i,
    score: 5,
    label: 'Referral marker',
  },
  {
    pattern: /tag|afftag|affiliate_tag/i,
    score: 5,
    label: 'Tag / tracking tag',
  },
  { pattern: /source|src|medium/i, score: 4, label: 'Source/medium marker' },

  // Network-specific / common cookie names
  {
    pattern: /_aff_|_affiliate_|_partner_/i,
    score: 7,
    label: 'Generic affiliate cookie prefix',
  },
  { pattern: /cjevent|cje|cj/i, score: 9, label: 'CJ / Commission Junction' },
  { pattern: /ir_|impact|irclick/i, score: 9, label: 'Impact / Impact Radius' },
  { pattern: /sas_|shareasale/i, score: 8, label: 'ShareASale' },
  { pattern: /awin|awc|aw_/i, score: 8, label: 'Awin' },
  {
    pattern: /rakuten|linksynergy|ranMID|ranEAID/i,
    score: 8,
    label: 'Rakuten Advertising',
  },
  { pattern: /skim|skimlinks/i, score: 7, label: 'Skimlinks' },
  { pattern: /viglink|vglnk/i, score: 7, label: 'VigLink / Sovrn' },
  { pattern: /cb_|clickbank/i, score: 8, label: 'ClickBank' },
  { pattern: /pepperjam|pj_/i, score: 7, label: 'Pepperjam' },
  { pattern: /avantlink|avl_/i, score: 7, label: 'AvantLink' },
  { pattern: /webgains|wg_/i, score: 7, label: 'Webgains' },
  { pattern: /tradedoubler|tduid/i, score: 7, label: 'Tradedoubler' },
  {
    pattern: /partnerize|performancehorizon|phg/i,
    score: 8,
    label: 'Partnerize',
  },
  { pattern: /admitad|ad_|uid/i, score: 7, label: 'Admitad' },
  {
    pattern: /cj\.com|anrdoezrs|dpbolvw|qksrv/i,
    score: 9,
    label: 'CJ tracking domains in cookie',
  },
];

// 2. Affiliate Network Intelligence Database
export const KNOWN_AFFILIATE_NETWORKS = [
  // Major networks
  {
    pattern:
      /anrdoezrs\.net|dpbolvw\.net|qksrv\.net|cj\.com|commission-junction/i,
    name: 'Commission Junction (CJ)',
  },
  {
    pattern: /impact\.com|impactradius\.com|pxf\.io|ojrq\.net/i,
    name: 'Impact',
  },
  { pattern: /shareasale\.com|shareasale-analytics\.com/i, name: 'ShareASale' },
  { pattern: /awin1\.com|awin\.com|zenaps\.com|dwin1\.com/i, name: 'Awin' },
  {
    pattern: /linksynergy\.com|rakuten\.com|ran-europe\.com|rmbn\.net/i,
    name: 'Rakuten Advertising',
  },
  {
    pattern: /clickbank\.net|clickbank\.com|hop\.clickbank\.net/i,
    name: 'ClickBank',
  },
  { pattern: /flexoffers\.com/i, name: 'FlexOffers' },
  { pattern: /skimlinks\.com|skimresources\.com/i, name: 'Skimlinks' },
  {
    pattern: /viglink\.com|vglnk\.com|sovrn\.com/i,
    name: 'VigLink / Sovrn Commerce',
  },

  // Additional well-known networks
  { pattern: /pepperjam\.com|pjatr\.com|gopjn\.com/i, name: 'Pepperjam' },
  { pattern: /avantlink\.com|avl\.com/i, name: 'AvantLink' },
  { pattern: /webgains\.com|track\.webgains\.com/i, name: 'Webgains' },
  {
    pattern: /tradedoubler\.com|tdw\.com|tb\.tradedoubler\.com/i,
    name: 'Tradedoubler',
  },
  {
    pattern: /partnerize\.com|performancehorizon\.com|prf\.hn|phg\.io/i,
    name: 'Partnerize (Performance Horizon)',
  },
  { pattern: /admitad\.com|ad\.admitad\.com/i, name: 'Admitad' },
  { pattern: /cj\.com|commissionjunction/i, name: 'CJ Affiliate' },
  {
    pattern: /amazon\.com\/gp\/(?:product|redirect)|amzn\.to|a\.co/i,
    name: 'Amazon Associates',
  },
  {
    pattern: /ebay\.com\/(?:itm|p)|rover\.ebay/i,
    name: 'eBay Partner Network',
  },
  {
    pattern: /shopify\.com\/.*\/a\/|shop\.app/i,
    name: 'Shopify affiliate-style tracking',
  },
  { pattern: /refersion\.com/i, name: 'Refersion' },
  { pattern: /tapfiliate\.com/i, name: 'Tapfiliate' },
  { pattern: /firstpromoter\.com/i, name: 'FirstPromoter' },
  { pattern: /postaffiliatepro\.com|pap\./i, name: 'Post Affiliate Pro' },
  {
    pattern: /hasoffers\.com|tune\.com|go2cloud\.com/i,
    name: 'HasOffers / TUNE',
  },
  {
    pattern: /linkbux\.com|linkconnector\.com/i,
    name: 'LinkConnector / LinkBux',
  },
  { pattern: /affiliatly\.com/i, name: 'Affiliatly' },
  { pattern: /idevaffiliate\.com/i, name: 'iDevAffiliate' },
];
