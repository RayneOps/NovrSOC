export interface GeoRecord {
  ip: string;

  country: string;
  countryCode: string;

  state?: string;
  city?: string;

  latitude: number;
  longitude: number;

  asn: number;
  asnName: string;

  isp: string;
  organization: string;

  vpn: boolean;
  proxy: boolean;
  tor: boolean;
  hosting: boolean;

  riskScore: number;

  lastSeen: string;
}