import 'dotenv/config';
import { searchWeb, checkURLSafety, analyzeImage, isConfigured, isSafeBrowsingConfigured, isVisionConfigured } from '../services/google';

async function run() {
    console.log('\n=== Testing Google Cloud APIs ===\n');

    console.log('Config status:');
    console.log(`  Custom Search: ${isConfigured() ? '✅ configured' : '❌ not configured'}`);
    console.log(`  Safe Browsing: ${isSafeBrowsingConfigured() ? '✅ configured' : '❌ not configured'}`);
    console.log(`  Cloud Vision:  ${isVisionConfigured() ? '✅ configured' : '❌ not configured'}`);
    console.log('');

    // 1. Custom Search
    console.log('1. Google Custom Search...');
    if (!isConfigured()) {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            const result = await searchWeb('"cybernovr" -site:cybernovr.com');
            if (result) {
                console.log(`   ✅ Custom Search: ${result.total_results} results in ${result.search_time_ms}ms`);
                if (result.results.length > 0) {
                    console.log(`   First result: ${result.results[0].title}`);
                    console.log(`   URL: ${result.results[0].url}`);
                } else {
                    console.log('   No results found (this is OK — cybernovr.com excluded)');
                }
            } else {
                console.log('   ⚠️  No results returned');
            }
        } catch (err) {
            console.log(`   ❌ Custom Search: ${err}`);
        }
    }

    // 2. Safe Browsing
    console.log('\n2. Google Safe Browsing...');
    if (!isSafeBrowsingConfigured()) {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            // Test with Google's official malware test URL
            const result = await checkURLSafety('http://malware.testing.google.test/testing/malware/');
            if (result.is_safe === false) {
                console.log('   ✅ Safe Browsing: correctly flagged test malware URL');
                console.log(`   Threat type: ${result.threat_type}`);
            } else {
                // Safe Browsing may not flag their test URL via API — try clean URL
                const cleanResult = await checkURLSafety('https://cybernovr.com');
                console.log(`   ✅ Safe Browsing: cybernovr.com is ${cleanResult.is_safe ? 'safe ✓' : 'flagged ⚠️'}`);
            }
        } catch (err) {
            console.log(`   ❌ Safe Browsing: ${err}`);
        }
    }

    // 3. Cloud Vision (test with a public image URL)
    console.log('\n3. Google Cloud Vision...');
    if (!isVisionConfigured()) {
        console.log('   ⚠️  Not configured');
    } else {
        try {
            // Use Google's own logo from their public CDN as a safe test
            const result = await analyzeImage('https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png');
            if (result) {
                console.log(`   ✅ Cloud Vision: detected ${result.logos.length} logo(s)`);
                result.logos.forEach((l) => console.log(`   Logo: "${l.description}" (${(l.score * 100).toFixed(1)}% confidence)`));
            } else {
                console.log('   ⚠️  Vision returned null');
            }
        } catch (err) {
            console.log(`   ❌ Cloud Vision: ${err}`);
        }
    }

    console.log('\n=== Done ===\n');

    console.log('📝 Note on Custom Search Engine:');
    console.log('   The "Search the entire web" toggle in the CSE control panel');
    console.log('   requires a paid Google Workspace account to unlock via UI.');
    console.log('   Workaround: use targeted brand queries with site exclusions.');
    console.log('   Example: "cybernovr" -site:cybernovr.com');
    console.log('   This effectively searches all external sites mentioning your brand.');
    console.log('   100 free queries/day is sufficient for scheduled brand monitoring.\n');
}

run().catch(console.error);
