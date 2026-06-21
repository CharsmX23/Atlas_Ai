/*
# Seed agent_registry table with Atlas AI agents

1. Inserts 12 agents with their details, sources, descriptions, and initial status.
*/

INSERT INTO public.agent_registry (name, source, description, status, reliability, jobs, latency_ms, domain, icon, icon_color)
VALUES
  ('Google Search Agent', 'google.com, bing.com', 'Searches Google Business Profiles and web results for business listings, contact info, and reviews.', 'online', 94, 342, 820, 'google.com', 'Search', '#4285F4'),
  ('Yelp Scraper', 'yelp.com', 'Extracts business listings, ratings, review counts, and photos from Yelp.', 'online', 88, 198, 1240, 'yelp.com', 'Globe', '#D32323'),
  ('Yellow Pages', 'yellowpages.com', 'Scans legacy directory listings for phone numbers, addresses, and business categories.', 'online', 80, 112, 980, 'yellowpages.com', 'ClipboardList', '#FDD835'),
  ('LinkedIn Agent', 'linkedin.com', 'Finds professional profiles, company pages, and employee count for B2B verification.', 'online', 90, 134, 1520, 'linkedin.com', 'Briefcase', '#0077B5'),
  ('Facebook Agent', 'facebook.com', 'Collects business page info, hours, ratings, and public reviews from Facebook.', 'degraded', 72, 89, 1340, 'facebook.com', 'Globe', '#1877F2'),
  ('Healthgrades', 'healthgrades.com', 'Healthcare directory — searches for doctors, dentists, and specialists with ratings.', 'online', 96, 198, 1240, 'healthgrades.com', 'ClipboardCheck', '#00BCD4'),
  ('Avvo / Justia', 'avvo.com', 'Legal directory — finds attorneys and law firms with peer endorsements and ratings.', 'online', 91, 76, 940, 'avvo.com', 'Shield', '#E65100'),
  ('BBB Verifier', 'bbb.org', 'Better Business Bureau checker for accreditation status, ratings, and complaint history.', 'online', 91, 76, 940, 'bbb.org', 'FileCheck', '#1A73E8'),
  ('Government License DB', 'state licensing boards', 'Queries government databases for professional license verification and status.', 'online', 98, 67, 1800, 'government.gov', 'Shield', '#4CAF50'),
  ('Website Detail Agent', 'direct site scraping', 'Visits official business websites to extract contact info, hours, services, and meta data.', 'online', 100, 234, 2150, '44 sites', 'Globe', '#7B68EE'),
  ('Image Collector', 'unsplash, source images', 'Collects business photos, storefront images, and professional headshots from image sources.', 'online', 85, 156, 620, 'images', 'Search', '#9C27B0'),
  ('Quality Auditor', 'meta-agent', 'Audits other workers'' output, flags conflicts, and scores overall data quality.', 'online', 89, 156, 520, 'internal', 'FileCheck', '#FF9800');
