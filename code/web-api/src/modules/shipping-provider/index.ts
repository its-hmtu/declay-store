import config from '@/config/env';
import type { ShippingProvider } from './provider';
import { MockShippingProvider } from './mock.provider';
import { EasyshipProvider } from './easyship.provider';

let cached: ShippingProvider | null = null;

/** Pick the active shipping provider: Easyship when a token is configured, else the mock. */
export function getShippingProvider(): ShippingProvider {
  if (cached) return cached;
  cached = config.easyship.apiKey
    ? new EasyshipProvider(config.easyship.apiKey, config.easyship.baseUrl, config.easyship.sandbox)
    : new MockShippingProvider();
  return cached;
}

export * from './provider';
