-- Initialize the DDNS zone
-- Replace 'dyn.devops-monk.com' and 'ns1.devops-monk.com' with your actual domain

INSERT INTO domains (name, type) VALUES ('dyn.devops-monk.com', 'NATIVE');

SET @did = (SELECT id FROM domains WHERE name='dyn.devops-monk.com');

INSERT INTO records (domain_id, name, type, content, ttl) VALUES
(@did, 'dyn.devops-monk.com', 'SOA',
  'ns1.devops-monk.com. hostmaster.devops-monk.com. 1 3600 600 604800 300', 300),
(@did, 'dyn.devops-monk.com', 'NS', 'ns1.devops-monk.com', 300);