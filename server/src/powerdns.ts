import axios from 'axios';
import { config } from './config.js';

const pdnsClient = axios.create({
  baseURL: config.PDNS_API_URL,
  headers: { 'X-API-Key': config.PDNS_API_KEY },
});

export async function updateDNSRecord(
  subdomain: string,
  ip: string,
  type: 'A' | 'AAAA' = 'A'
): Promise<void> {
  const fqdn = `${subdomain}.${config.DDNS_ZONE}.`;
  await pdnsClient.patch(`/servers/localhost/zones/${config.DDNS_ZONE}`, {
    rrsets: [
      {
        name: fqdn,
        type,
        ttl: 60,
        changetype: 'REPLACE',
        records: [{ content: ip, disabled: false }],
      },
    ],
  });
}

export async function deleteDNSRecord(
  subdomain: string,
  type: 'A' | 'AAAA' = 'A'
): Promise<void> {
  const fqdn = `${subdomain}.${config.DDNS_ZONE}.`;
  await pdnsClient.patch(`/servers/localhost/zones/${config.DDNS_ZONE}`, {
    rrsets: [{ name: fqdn, type, changetype: 'DELETE' }],
  });
}

export async function getDNSRecord(
  subdomain: string
): Promise<{ type: string; content: string; ttl: number }[] | null> {
  const fqdn = `${subdomain}.${config.DDNS_ZONE}.`;
  try {
    const res = await pdnsClient.get(
      `/servers/localhost/zones/${config.DDNS_ZONE}`
    );
    const rrsets = res.data.rrsets || [];
    const match = rrsets.filter(
      (rr: any) => rr.name === fqdn && (rr.type === 'A' || rr.type === 'AAAA')
    );
    if (!match.length) return null;
    return match.flatMap((rr: any) =>
      rr.records.map((r: any) => ({
        type: rr.type,
        content: r.content,
        ttl: rr.ttl,
      }))
    );
  } catch {
    return null;
  }
}