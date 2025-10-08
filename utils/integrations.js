// backend/utils/integrations.js
// Thin wrappers around external services. If env URLs are not provided, we simulate success.

const INVENTORY_CHECK_URL = process.env.INVENTORY_CHECK_URL || "";
const DELIVERY_REQUEST_URL = process.env.DELIVERY_REQUEST_URL || "";

async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, {
    method: options.method || "POST",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

async function checkInventory({ product, items = 1, productSpecs }) {
  try {
    if (!INVENTORY_CHECK_URL) {
      // Simulate: available
      return { available: true, reference: "simulated-inventory-ok" };
    }
    const { ok, data } = await safeFetchJson(INVENTORY_CHECK_URL, {
      method: "POST",
      body: { product, quantity: items, specs: productSpecs },
    });
    if (!ok) return { available: false, error: (data && (data.error || data.message)) || "Inventory check failed" };
    // Expecting response like { available: boolean, stock?: number, reference?: string }
    return {
      available: !!(data && data.available),
      stock: data && data.stock,
      reference: data && (data.reference || data.requestId),
    };
  } catch (err) {
    return { available: false, error: err.message || "Inventory request error" };
  }
}

async function requestDelivery(order) {
  try {
    if (!DELIVERY_REQUEST_URL) {
      // Simulate delivery accepted
      return { requested: true, requestId: "simulated-delivery-req", status: "Requested" };
    }
    const { ok, data } = await safeFetchJson(DELIVERY_REQUEST_URL, {
      method: "POST",
      body: {
        orderId: String(order._id),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        contactNumber: order.contactNumber,
        address: order.deliveryInstructions,
        product: order.product,
        items: order.items,
        specs: order.productSpecs,
        price: order.price,
      },
    });
    if (!ok) return { requested: false, error: (data && (data.error || data.message)) || "Delivery request failed" };
    return {
      requested: true,
      requestId: data && (data.requestId || data.id || data.reference),
      status: data && (data.status || "Requested"),
    };
  } catch (err) {
    return { requested: false, error: err.message || "Delivery request error" };
  }
}

module.exports = { checkInventory, requestDelivery };
