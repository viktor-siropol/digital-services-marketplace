import crypto from "crypto";

const PAYPAL_API_URL =
  process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

const createPayPalError = (message, statusCode = 502, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const parsePayPalResponse = async (response) => {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { rawText };
  }
};

const getPayPalCredentials = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw createPayPalError("PayPal credentials are not configured", 500);
  }

  return { clientId, clientSecret };
};

const getPayPalWebhookId = () => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw createPayPalError("PayPal webhook ID is not configured", 500);
  }

  return webhookId;
};

export const getPayPalClientIdValue = () => {
  return process.env.PAYPAL_CLIENT_ID || "";
};

export const generatePayPalAccessToken = async () => {
  const { clientId, clientSecret } = getPayPalCredentials();

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await parsePayPalResponse(response);

  if (!response.ok || !data.access_token) {
    throw createPayPalError(
      data?.error_description ||
        data?.error ||
        "Failed to generate PayPal access token",
      response.status || 502,
      data,
    );
  }

  return data.access_token;
};

const sendPayPalRequest = async (
  pathname,
  { method = "GET", body, headers = {} } = {},
) => {
  const accessToken = await generatePayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parsePayPalResponse(response);

  if (!response.ok) {
    throw createPayPalError(
      data?.message || data?.error_description || "PayPal request failed",
      response.status || 502,
      data,
    );
  }

  return data;
};

export const createPayPalCheckoutOrder = async ({ amount, localOrderId }) => {
  return sendPayPalRequest("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: localOrderId,
          amount: {
            currency_code: "USD",
            value: Number(amount).toFixed(2),
          },
        },
      ],
    },
  });
};

export const capturePayPalCheckoutOrder = async (paypalOrderId) => {
  return sendPayPalRequest(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    body: {},
  });
};

export const refundPayPalCapturedPayment = async (paypalCaptureId) => {
  return sendPayPalRequest(`/v2/payments/captures/${paypalCaptureId}/refund`, {
    method: "POST",
    headers: {
      "PayPal-Request-Id": crypto.randomUUID(),
      Prefer: "return=representation",
    },
    body: {},
  });
};

export const verifyPayPalWebhookSignature = async ({
  headers,
  webhookEvent,
}) => {
  const webhookId = getPayPalWebhookId();

  return sendPayPalRequest("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      transmission_id: headers["paypal-transmission-id"] || "",
      transmission_time: headers["paypal-transmission-time"] || "",
      cert_url: headers["paypal-cert-url"] || "",
      auth_algo: headers["paypal-auth-algo"] || "",
      transmission_sig: headers["paypal-transmission-sig"] || "",
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    },
  });
};
