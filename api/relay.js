/**
 * HTTP/HTTPS Relay Proxy — Vercel Serverless Function
 * ====================================================
 *
 * این فایل به عنوان یک relay روی Vercel اجرا می‌شود.
 * Vercel در ایران فیلتر نیست و سرعت خوبی دارد.
 *
 * نحوه استفاده:
 * 1. این پروژه را در GitHub push کنید
 * 2. به vercel.com بروید و پروژه را import کنید
 * 3. Deploy کنید
 * 4. URL را در config.local.yaml قرار دهید
 *
 * یا با CLI:
 *   npm install -g vercel
 *   vercel deploy
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'HTTP/HTTPS Relay Proxy',
      version: '3.3',
      platform: 'vercel',
      message: 'Use POST to relay HTTP requests'
    });
  }

  if (req.method === 'POST') {
    try {
      const { method, url, headers, body } = req.body;

      if (!method || !url) {
        return res.status(400).json({
          error: 'Invalid payload: method and url are required'
        });
      }

      console.log(`[${method}] ${url}`);

      const fetchOptions = {
        method: method.toUpperCase(),
        headers: headers || {},
        redirect: 'follow',
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const responseHeaders = Object.fromEntries(response.headers.entries());

      console.log(`Response: ${response.status}`);

      // Decide text vs binary from the content type. Using response.text()
      // for binary payloads (images, fonts, archives, ...) corrupts them,
      // so those are base64-encoded and returned as body_b64, which the
      // local proxy decodes back to raw bytes.
      const contentType = (responseHeaders['content-type'] || '').toLowerCase();
      const isText = /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded)|.*\+(json|xml)|image\/svg)/.test(contentType)
        || contentType.includes('charset=');

      if (isText) {
        return res.status(200).json({
          status: response.status,
          headers: responseHeaders,
          body: await response.text()
        });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return res.status(200).json({
        status: response.status,
        headers: responseHeaders,
        body_b64: buffer.toString('base64')
      });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        error: error.message,
        message: 'Relay error occurred'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
