const User = require('../models/User');

// Demo account constants — single source of truth shared by seed.js and this controller
const DEMO_EMAIL = 'developer@gatehouse.io';
const DEMO_PASSWORD = 'Password123!';
const DEMO_NAME = 'Alex Morgan';
const DEMO_ORG = 'Acme Cloud Platform';

module.exports.DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD };

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      organization: organization || 'Gatehouse Engineering',
    });

    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Instant demo login — upserts demo account if missing, returns JWT
// @route   POST /api/auth/demo
// @access  Public
exports.demoLogin = async (req, res, next) => {
  try {
    // Check if demo user already exists
    let user = await User.findOne({ email: DEMO_EMAIL }).select('+password');

    if (!user) {
      // Auto-create demo user on-demand (handles fresh Atlas DB after redeploy)
      console.log('[Auth] Demo user not found — auto-creating demo account...');
      user = await User.create({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        organization: DEMO_ORG,
        role: 'developer',
      });
      console.log('[Auth] Demo account created successfully.');
      // Reload with password field for token generation
      user = await User.findOne({ email: DEMO_EMAIL });
    }

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

