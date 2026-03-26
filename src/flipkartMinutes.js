const axios = require('axios');

const API_URL = 'https://2.rome.api.flipkart.com/api/4/page/fetch?cacheFirst=false';

const HEADERS = {
  'Accept': '*/*',
  'Content-Type': 'application/json',
  'Origin': 'https://www.flipkart.com',
  'Referer': 'https://www.flipkart.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'X-User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 FKUA/msite/0.0.4/msite/Mobile',
  'flipkart_secure': 'true',
};

// Session cookies - these expire periodically, update from browser DevTools
// Copy fresh cookies from: Chrome DevTools > Network > any fetch request > Headers > Cookie
const COOKIES = process.env.FLIPKART_COOKIES || '';

function buildPayload(lat, lng, pincode = 560102) {
  return {
    pageUri: `/user-address-v4?marketplace=HYPERLOCAL&latitude=${lat}&longitude=${lng}&locationEnabled=true`,
    pageContext: { trackingContext: {}, networkSpeed: 9600 },
    locationContext: { pincode, changed: false }
  };
}

async function checkServiceability(lat, lng, pincode) {
  try {
    const response = await axios.post(API_URL, buildPayload(lat, lng, pincode), {
      headers: {
        ...HEADERS,
        'Cookie': COOKIES,
      },
      timeout: 15000,
    });

    const data = response.data;
    const tracking = data?.RESPONSE?.pageData?.trackingContext?.tracking || {};
    const isServiceable = tracking.isServiceable === 'true';
    const mpId = tracking.mpId;

    // Extract saved addresses and their serviceability
    const slots = data?.RESPONSE?.pageData?.trackingContext || {};
    const pageTitle = data?.RESPONSE?.pageData?.pageTitle || '';

    // Look for address widgets with validation status
    const addressSlots = (data?.RESPONSE?.slots || [])
      .filter(s => s?.widget?.type === 'USER_ADDRESS_SELECTION_V3');

    const addresses = [];
    for (const slot of addressSlots) {
      const components = slot?.widget?.data?.renderableComponents || [];
      for (const comp of components) {
        const val = comp?.value;
        if (val?.type === 'BillingAddressInfoV2') {
          addresses.push({
            state: val.state,
            locationType: val.locationTypeTag,
            validation: val.addressValidation?.status,
            active: val.active,
          });
        }
      }
    }

    // Check current location widget for serviceability message
    const locationSlots = (data?.RESPONSE?.slots || [])
      .filter(s => s?.widget?.type === 'USER_CURRENT_LOCATION_V2');

    let locationMessage = null;
    for (const slot of locationSlots) {
      const val = slot?.widget?.data?.data?.value;
      if (val) {
        const subtitle = val.subtitle?.text;
        const title = val.title?.text;
        const ctaDisabled = val.ctaDisabled;
        locationMessage = { title, subtitle, ctaDisabled };
      }
    }

    return {
      lat,
      lng,
      isServiceable,
      marketplace: mpId,
      locationMessage,
      savedAddressCount: addresses.length,
    };
  } catch (error) {
    return {
      lat,
      lng,
      error: error.response?.status === 529
        ? 'Site blocked request (429/529) - cookies may be expired'
        : error.message,
    };
  }
}

async function checkMultipleLocations(locations) {
  console.log('Flipkart Minutes - Serviceability Checker');
  console.log('=========================================\n');

  const results = [];
  for (const loc of locations) {
    const result = await checkServiceability(loc.lat, loc.lng, loc.pincode);
    results.push(result);

    if (result.error) {
      console.log(`[${loc.name || `${loc.lat},${loc.lng}`}]`);
      console.log(`  ERROR: ${result.error}\n`);
    } else {
      console.log(`[${loc.name || `${loc.lat},${loc.lng}`}]`);
      console.log(`  Serviceable: ${result.isServiceable ? 'YES' : 'NO'}`);
      if (result.locationMessage?.subtitle) {
        console.log(`  Message: ${result.locationMessage.subtitle}`);
      }
      console.log();
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

// Locations to check
const locations = [
  { name: 'Kerala (Kochi area)', lat: 10.027027, lng: 76.3110593654827, pincode: 682001 },
  { name: 'Bangalore (East)', lat: 12.72973, lng: 77.8201783926145, pincode: 560102 },
];

// Add more locations here as needed, e.g.:
// { name: 'HSR Layout', lat: 12.9116, lng: 77.6741, pincode: 560102 },
// { name: 'Koramangala', lat: 12.9352, lng: 77.6245, pincode: 560034 },

checkMultipleLocations(locations);
