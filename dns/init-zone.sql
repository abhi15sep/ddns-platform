-- Initialize the DDNS zone
-- Replace 'ddns.devops-monk.com', 'ns1.devops-monk.com', and YOUR_VPS_IP with your actual values

INSERT INTO domains (name, type) VALUES ('ddns.devops-monk.com', 'NATIVE');

SET @did = (SELECT id FROM domains WHERE name='ddns.devops-monk.com');

INSERT INTO records (domain_id, name, type, content, ttl) VALUES
(@did, 'ddns.devops-monk.com', 'SOA',
  'ns1.devops-monk.com. hostmaster.devops-monk.com. 1 3600 600 604800 300', 300),
(@did, 'ddns.devops-monk.com', 'NS', 'ns1.devops-monk.com', 300),
-- Apex A record: makes ddns.devops-monk.com itself resolve to the VPS (serves the dashboard)
(@did, 'ddns.devops-monk.com', 'A', 'YOUR_VPS_IP', 300);