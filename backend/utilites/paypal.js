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

export const createPayPalCheckoutOrder = async ({ amount, localOrderId }) => {
  const accessToken = await generatePayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
    }),
  });

  const data = await parsePayPalResponse(response);

  if (!response.ok || !data.id) {
    throw createPayPalError(
      data?.message || "Failed to create PayPal order",
      response.status || 502,
      data,
    );
  }

  return data;
};

export const capturePayPalCheckoutOrder = async (paypalOrderId) => {
  const accessToken = await generatePayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await parsePayPalResponse(response);

  if (!response.ok) {
    throw createPayPalError(
      data?.message || "Failed to capture PayPal order",
      response.status || 502,
      data,
    );
  }

  return data;
};
