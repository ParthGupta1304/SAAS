import tls from 'tls';
import { URL } from 'url';

/**
 * Parses the hostname and port from a URL or raw address.
 */
function parseHostname(url: string): { hostname: string; port: number } {
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) {
    target = 'https://' + target;
  }
  try {
    const parsed = new URL(target);
    return {
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 443,
    };
  } catch {
    const clean = target.replace(/^https?:\/\//i, '').split('/')[0];
    const parts = clean.split(':');
    return {
      hostname: parts[0],
      port: parts[1] ? parseInt(parts[1], 10) : 443,
    };
  }
}

/**
 * Connects to a server via TLS socket to fetch and parse its SSL certificate.
 * Calculates remaining days and returns validation details.
 * 
 * @param url The URL of the website to check SSL for.
 * @returns A promise resolving to SSL validity info.
 */
export function checkSSL(url: string): Promise<{
  success: boolean;
  daysRemaining?: number;
  validTo?: Date;
  errorMsg?: string;
}> {
  return new Promise((resolve) => {
    const { hostname, port } = parseHostname(url);

    if (!hostname) {
      return resolve({
        success: false,
        errorMsg: 'Invalid URL or hostname provided',
      });
    }

    let socket: tls.TLSSocket | null = null;
    let resolved = false;

    const cleanupAndResolve = (result: {
      success: boolean;
      daysRemaining?: number;
      validTo?: Date;
      errorMsg?: string;
    }) => {
      if (resolved) return;
      resolved = true;
      if (socket) {
        socket.destroy();
      }
      resolve(result);
    };

    try {
      const options = {
        servername: hostname,
        rejectUnauthorized: false, // Allows us to fetch cert metadata even if expired or untrusted
      };

      socket = tls.connect(port, hostname, options, () => {
        if (!socket) return;
        
        const cert = socket.getPeerCertificate();

        if (!cert || Object.keys(cert).length === 0) {
          cleanupAndResolve({
            success: false,
            errorMsg: 'No certificate returned from server',
          });
          return;
        }

        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const msRemaining = validTo.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));

        // Check if the certificate was authorized by a standard CA and matches host
        if (!socket.authorized) {
          cleanupAndResolve({
            success: false,
            daysRemaining,
            validTo,
            errorMsg: socket.authorizationError
              ? `Certificate validation failed: ${socket.authorizationError}`
              : 'Certificate is not authorized or self-signed',
          });
          return;
        }

        // Additional expiry check
        if (daysRemaining <= 0) {
          cleanupAndResolve({
            success: false,
            daysRemaining,
            validTo,
            errorMsg: 'Certificate has expired',
          });
          return;
        }

        cleanupAndResolve({
          success: true,
          daysRemaining,
          validTo,
        });
      });

      // Set a 5-second socket timeout to prevent hanging connections
      socket.setTimeout(5000);

      socket.on('timeout', () => {
        cleanupAndResolve({
          success: false,
          errorMsg: 'TLS socket connection timed out after 5000ms',
        });
      });

      socket.on('error', (err) => {
        cleanupAndResolve({
          success: false,
          errorMsg: err instanceof Error ? err.message : 'TLS connection error',
        });
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initiate TLS connection';
      resolve({
        success: false,
        errorMsg,
      });
    }
  });
}
