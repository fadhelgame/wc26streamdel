/**
 * Netlify Function — Proxy API untuk World Cup Stream
 * 
 * Fungsi: Ambil data live stream dari reference site & kirim ke frontend.
 * Alasan: API upstream (stream.mjr-dev.cloud) ga punya CORS header,
 *         jadi browser ga bisa fetch langsung. Fungsi ini jembatani.
 * 
 * Endpoint setelah deploy:
 *   https://[site-name].netlify.app/.netlify/functions/proxy?type=live
 *   https://[site-name].netlify.app/.netlify/functions/proxy?type=upcoming
 */

const UPSTREAM_BASE = 'https://stream.mjr-dev.cloud/wc26';

export async function handler(event) {
  const params = event.queryStringParameters || {};
  const type = params.type === 'upcoming' ? 'api_upcoming.php' : params.type === 'skor' ? 'api_skor.php' : 'api.php';
  const url = `${UPSTREAM_BASE}/${type}`;

  // Set timeout 15 detik biar ga ngantung
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WorldCupStream/1.0)',
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders(),
        body: JSON.stringify({ status: 0, error: `Upstream returned ${response.status}` }),
      };
    }

    const text = await response.text();

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15',  // cache 15 detik aja biar realtime
      },
      body: text,
    };
  } catch (error) {
    clearTimeout(timeout);

    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({
        status: 0,
        error: error.name === 'AbortError' ? 'Upstream timeout' : error.message,
      }),
    };
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
