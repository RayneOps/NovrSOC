import 'dotenv/config';
import { searchURL, isConfigured as urlscanOk } from '../services/urlscanio';
import { lookupIP, isConfigured as maxmindOk } from '../services/maxmind';
import { getMonitors } from '../services/uptimerobot';

async function run() {
    console.log('\n=== Testing 3 New API Keys ===\n');

    // 1. URLScan.io
    console.log('1. URLScan.io...');
    if (!urlscanOk()) {
        console.log('   ⚠️  Key not configured');
    } else {
        try {
            const result = await searchURL('https://cybernovr.com');
            if (result !== null) {
                console.log(`   ✅ URLScan.io: ${result.total} historical scans for cybernovr.com`);
            } else {
                console.log('   ⚠️  URLScan.io: returned null (check key)');
            }
        } catch (err) {
            console.log(`   ❌ URLScan.io: ${err}`);
        }
    }

    // 2. MaxMind GeoLite2
    console.log('\n2. MaxMind GeoLite2...');
    if (!maxmindOk()) {
        console.log('   ⚠️  Database not downloaded yet');
        console.log('   Run: npm run geoip:download');
    } else {
        try {
            const geo = await lookupIP('102.89.45.13'); // Nigerian MTN IP
            if (geo) {
                console.log(`   ✅ MaxMind: ${geo.city}, ${geo.country_name} (${geo.country_code})`);
                console.log(`   Lat/Lng: ${geo.latitude}, ${geo.longitude}`);
            } else {
                console.log('   ⚠️  MaxMind: IP not found in database');
            }
        } catch (err) {
            console.log(`   ❌ MaxMind: ${err}`);
        }
    }

    // 3. UptimeRobot
    console.log('\n3. UptimeRobot...');
    try {
        const monitors = await getMonitors();
        if (monitors.length > 0) {
            console.log(`   ✅ UptimeRobot: ${monitors.length} monitor(s) found`);
            monitors.slice(0, 3).forEach((m) => {
                console.log(`   - ${m.friendly_name}: status ${m.status} | uptime ${m.uptime_ratio}%`);
            });
        } else {
            console.log('   ✅ UptimeRobot: connected (0 monitors configured yet — add some at uptimerobot.com)');
        }
    } catch (err) {
        console.log(`   ❌ UptimeRobot: ${err}`);
    }

    console.log('\n=== Done ===\n');
}

run().catch(console.error);
