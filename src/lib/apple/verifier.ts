import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { appleAppAppleId, appleBundleId } from "./config";
import { getAppleRootCertificates } from "./rootCertificates";

// One app build is used for both TestFlight (sandbox) and live App Store
// (production) users, and Apple signs sandbox transactions with the same
// JWS format tagged with environment: "Sandbox" inside the payload. A
// verifier constructed for one environment rejects payloads signed for the
// other, so we keep one of each and try production first (the common
// case), falling back to sandbox — the standard pattern Apple's own sample
// code uses for this exact situation.
let productionVerifier: SignedDataVerifier | null = null;
let sandboxVerifier: SignedDataVerifier | null = null;

function getVerifier(environment: Environment): SignedDataVerifier {
  const cached = environment === Environment.PRODUCTION ? productionVerifier : sandboxVerifier;
  if (cached) return cached;

  const verifier = new SignedDataVerifier(
    getAppleRootCertificates(),
    true,
    environment,
    appleBundleId(),
    appleAppAppleId(),
  );

  if (environment === Environment.PRODUCTION) {
    productionVerifier = verifier;
  } else {
    sandboxVerifier = verifier;
  }
  return verifier;
}

export async function verifyAndDecodeAppleTransaction(
  signedTransactionInfo: string,
): Promise<JWSTransactionDecodedPayload> {
  try {
    return await getVerifier(Environment.PRODUCTION).verifyAndDecodeTransaction(signedTransactionInfo);
  } catch {
    return await getVerifier(Environment.SANDBOX).verifyAndDecodeTransaction(signedTransactionInfo);
  }
}

export async function verifyAndDecodeAppleNotification(
  signedPayload: string,
): Promise<ResponseBodyV2DecodedPayload> {
  try {
    return await getVerifier(Environment.PRODUCTION).verifyAndDecodeNotification(signedPayload);
  } catch {
    return await getVerifier(Environment.SANDBOX).verifyAndDecodeNotification(signedPayload);
  }
}
