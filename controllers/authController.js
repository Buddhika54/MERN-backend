const Customer = require('../models/customerModel');

// Helper to sanitize output
function toPublicCustomer(c) {
  return {
    id: c._id,
    name: c.name,
    email: c.email,
    contactNumber: c.contactNumber || '',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// POST /api/auth/register
// { name, email, contactNumber?, password }
async function register(req, res) {
  try {
    const { name, email, contactNumber, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'name, email and password are required' });
    }

    const existing = await Customer.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const customer = new Customer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      contactNumber: (contactNumber || '').trim(),
      passwordHash: 'placeholder',
      passwordSalt: 'placeholder',
    });
    customer.setPassword(password);
    await customer.save();

    return res.json({ success: true, customer: toPublicCustomer(customer) });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

// POST /api/auth/login
// { email }
async function login(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) {
      return res.status(401).json({ success: false, error: 'Email not registered' });
    }

    // Minimal auth for now: email-only check
    return res.json({ success: true, customer: toPublicCustomer(customer) });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = { register, login };
