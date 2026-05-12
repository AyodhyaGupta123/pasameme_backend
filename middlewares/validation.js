// Request validation middleware

// Register validation
const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Username validation
  if (!username) {
    errors.push("Username is required");
  } else if (username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  } else if (username.length > 30) {
    errors.push("Username cannot exceed 30 characters");
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, and underscores");
  }

  // Email validation
  if (!email) {
    errors.push("Email is required");
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("Please enter a valid email address");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  } else if (password.length > 100) {
    errors.push("Password is too long");
  }

  // Return response if validation errors exist
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors[0],
      allErrors: errors,
    });
  }

  next();
};

// Login validation
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Email validation
  if (!email) {
    errors.push("Email is required");
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push("Please enter a valid email address");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  }

  // Return response if validation errors exist
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors[0],
      allErrors: errors,
    });
  }

  next();
};

// Balance update validation
const validateBalance = (req, res, next) => {
  const { amount } = req.body;

  if (amount === undefined || amount === null) {
    return res.status(400).json({
      error: "Amount is required",
    });
  }

  if (typeof amount !== "number") {
    return res.status(400).json({
      error: "Amount must be a number",
    });
  }

  if (amount < 0) {
    return res.status(400).json({
      error: "Amount cannot be negative",
    });
  }

  next();
};

const validateCardDeposit = (req, res, next) => {
  const { amount, gateway, cardHolder, cardNumber, expiry, cvv } = req.body;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  if (!gateway || !["stripe", "razorpay"].includes(gateway)) {
    return res.status(400).json({
      error: "Gateway must be one of: stripe, razorpay",
    });
  }

  if (!cardHolder || cardHolder.trim().length < 3) {
    return res.status(400).json({ error: "Card holder name is required" });
  }

  const normalizedCard = String(cardNumber || "").replace(/\s|-/g, "");
  if (!/^\d{13,19}$/.test(normalizedCard)) {
    return res.status(400).json({ error: "Invalid card number" });
  }

  if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(String(expiry || ""))) {
    return res.status(400).json({ error: "Expiry must be in MM/YY format" });
  }

  if (!/^\d{3,4}$/.test(String(cvv || ""))) {
    return res.status(400).json({ error: "Invalid CVV" });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateBalance,
  validateCardDeposit,
};
