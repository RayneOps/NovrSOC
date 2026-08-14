import 'dotenv/config';
import { vtCheckIP } from '../services/virustotal';
import { enrichIP } from '../services/geoEnrichment';

async function run() {
    console.log('\n=== NovrSOC New API Tests ===\n');

    // Test known malicious IP (Tor exit node)
    const TEST_IP = '185.220.101.47';

    console.log('1. Testing VirusTotal...');
    const vt = await vtCheckIP(TEST_IP);
    if (vt) {
        const total = vt.stats.malicious + vt.stats.suspicious + vt.stats.undetected + vt.stats.harmless;
        console.log(`   ✅ VirusTotal: ${vt.stats.malicious}/${total} engines flagged ${TEST_IP}`);
        console.log(`   Verdict: ${vt.verdict} | AS: ${vt.as_owner || 'N/A'}`);
    } else {
        console.log('   ⚠️  VirusTotal: returned null (check key or rate limit)');
    }

    console.log('\n2. Testing IPregistry...');
    try {
        const geo = await enrichIP('102.89.45.13'); // Nigerian MTN IP
        if (geo && geo.country_code) {
            console.log(`   ✅ IPregistry: ${geo.country_name} | ${geo.city} | ISP: ${geo.isp}`);
            console.log(`   Nigerian: ${geo.is_nigerian} | ASN: ${geo.asn}`);
        } else {
            console.log('   ⚠️  IPregistry: returned empty result (check key)');
        }
    } catch (err) {
        console.log(`   ❌ IPregistry: ${err}`);
    }

    console.log('\n=== Done ===\n');
}

run().catch(console.error);
