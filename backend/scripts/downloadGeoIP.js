// Downloads MaxMind's GeoLite2-City database to backend/geoip/GeoLite2-City.mmdb.
// services/maxmind.ts reads from this exact location by default (see the comment there and in
// backend/.env next to MAXMIND_LICENSE_KEY for why no absolute MAXMIND_DB_PATH is set).
//
// Usage: npm run geoip:download   (reads MAXMIND_LICENSE_KEY / MAXMIND_ACCOUNT_ID from .env)

require('dotenv/config');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tar = require('tar');

const LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY;
const ACCOUNT_ID = process.env.MAXMIND_ACCOUNT_ID;
const DB_DIR = process.env.MAXMIND_DB_DIR || path.join(__dirname, '../geoip');
const DB_PATH = path.join(DB_DIR, 'GeoLite2-City.mmdb');

const DOWNLOAD_URL = 'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz';

async function download() {
    if (!LICENSE_KEY || LICENSE_KEY === 'REPLACE_WHEN_OBTAINED') {
        throw new Error('MAXMIND_LICENSE_KEY not set in backend/.env');
    }
    if (!ACCOUNT_ID || ACCOUNT_ID === 'REPLACE_WHEN_OBTAINED') {
        throw new Error('MAXMIND_ACCOUNT_ID not set in backend/.env');
    }

    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log(`Created directory: ${DB_DIR}`);
    }

    console.log('Downloading MaxMind GeoLite2-City database...');
    console.log(`Account: ${ACCOUNT_ID}`);

    const auth = Buffer.from(`${ACCOUNT_ID}:${LICENSE_KEY}`).toString('base64');

    // MaxMind's download endpoint 302-redirects to a pre-signed URL — https.get() doesn't
    // follow redirects on its own, so this walks the chain manually (up to 5 hops). The
    // redirect target is pre-signed, so only the *first* request carries the Basic auth header.
    function requestWithRedirects(url, useAuth, hopsLeft) {
        return new Promise((resolve, reject) => {
            if (hopsLeft <= 0) {
                reject(new Error('Too many redirects'));
                return;
            }

            const req = https.get(url, { headers: useAuth ? { Authorization: `Basic ${auth}` } : {} }, (res) => {
                if (res.statusCode === 401) {
                    reject(new Error('Invalid MaxMind credentials — check MAXMIND_LICENSE_KEY and MAXMIND_ACCOUNT_ID'));
                    return;
                }
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                    res.resume(); // discard this response body before following the redirect
                    resolve(requestWithRedirects(res.headers.location, false, hopsLeft - 1));
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                resolve(res);
            });
            req.on('error', reject);
        });
    }

    const res = await requestWithRedirects(DOWNLOAD_URL, true, 5);

    return new Promise((resolve, reject) => {
        const extract = tar.extract({
            cwd: DB_DIR,
            filter: (filePath) => filePath.endsWith('.mmdb'),
            strip: 1,
        });

        res.pipe(zlib.createGunzip()).pipe(extract);

        extract.on('finish', () => {
            const files = fs.readdirSync(DB_DIR).filter((f) => f.endsWith('.mmdb'));
            if (files.length > 0) {
                const extracted = path.join(DB_DIR, files[0]);
                if (extracted !== DB_PATH) {
                    fs.renameSync(extracted, DB_PATH);
                }
            }
            console.log(`✅ MaxMind GeoLite2-City downloaded to: ${DB_PATH}`);
            resolve(DB_PATH);
        });

        extract.on('error', reject);
    });
}

download().catch((err) => {
    console.error('❌ GeoIP download failed:', err.message);
    process.exit(1);
});
