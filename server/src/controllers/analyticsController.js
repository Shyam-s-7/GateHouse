const mongoose = require('mongoose');
const GatewayLog = require('../models/GatewayLog');
const ApiKey = require('../models/ApiKey');
const Service = require('../models/Service');

// @desc    Get KPI metrics for dashboard
// @route   GET /api/analytics/kpis
// @access  Private
exports.getKpis = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const range = req.query.range || '7d';

    let startDate = new Date();
    if (range === '24h') startDate.setHours(startDate.getHours() - 24);
    else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    else startDate.setDate(startDate.getDate() - 7); // Default 7d

    const matchQuery = {
      $or: [
        { user: userId },
        { user: { $exists: false } }, // For system demo logs
      ],
      timestamp: { $gte: startDate },
    };

    const stats = await GatewayLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          avgLatency: { $avg: '$latencyMs' },
          errorRequests: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0],
            },
          },
          successRequests: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] }, 1, 0],
            },
          },
          rateLimitedRequests: {
            $sum: {
              $cond: [{ $eq: ['$statusCode', 429] }, 1, 0],
            },
          },
        },
      },
    ]);

    const activeKeysCount = await ApiKey.countDocuments({ user: req.user.id, status: 'active' });
    const activeServicesCount = await Service.countDocuments({ user: req.user.id, isActive: true });

    const totalRequests = stats[0]?.totalRequests || 0;
    const errorRequests = stats[0]?.errorRequests || 0;
    const successRequests = stats[0]?.successRequests || 0;
    const rateLimitedRequests = stats[0]?.rateLimitedRequests || 0;
    const avgLatency = Math.round((stats[0]?.avgLatency || 0) * 10) / 10;
    const errorRate = totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 1000) / 10 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        errorRate,
        avgLatency,
        successRequests,
        errorRequests,
        rateLimitedRequests,
        activeKeysCount,
        activeServicesCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get traffic timeline (daily/hourly volume)
// @route   GET /api/analytics/timeline
// @access  Private
exports.getTrafficTimeline = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const range = req.query.range || '7d';

    let startDate = new Date();
    if (range === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }

    const matchQuery = {
      $or: [{ user: userId }, { user: { $exists: false } }],
      timestamp: { $gte: startDate },
    };

    const dateFormat = range === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';

    const timeline = await GatewayLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$timestamp' },
          },
          total: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] }, 1, 0],
            },
          },
          rateLimited: {
            $sum: {
              $cond: [{ $eq: ['$statusCode', 429] }, 1, 0],
            },
          },
          errors: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$statusCode', 400] },
                    { $ne: ['$statusCode', 429] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          avgLatency: { $avg: '$latencyMs' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          total: 1,
          successful: 1,
          rateLimited: 1,
          errors: 1,
          avgLatency: { $round: ['$avgLatency', 1] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get status code distribution for donut chart
// @route   GET /api/analytics/status-distribution
// @access  Private
exports.getStatusDistribution = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const matchQuery = {
      $or: [{ user: userId }, { user: { $exists: false } }],
    };

    const distribution = await GatewayLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$statusCode',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Format for charts with category labels & enterprise colors
    const colorMap = {
      200: { label: '200 OK', color: '#10b981' },
      201: { label: '201 Created', color: '#059669' },
      400: { label: '400 Bad Request', color: '#f59e0b' },
      401: { label: '401 Unauthorized', color: '#ec4899' },
      403: { label: '403 Forbidden', color: '#8b5cf6' },
      404: { label: '404 Not Found', color: '#6366f1' },
      429: { label: '429 Rate Limited', color: '#f97316' },
      500: { label: '500 Server Error', color: '#ef4444' },
      502: { label: '502 Bad Gateway', color: '#dc2626' },
      504: { label: '504 Gateway Timeout', color: '#b91c1c' },
    };

    const formattedData = distribution.map((item) => {
      const info = colorMap[item._id] || {
        label: `HTTP ${item._id}`,
        color: '#94a3b8',
      };
      return {
        code: item._id,
        name: info.label,
        count: item.count,
        color: info.color,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get top services breakdown
// @route   GET /api/analytics/services-breakdown
// @access  Private
exports.getServicesBreakdown = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const breakdown = await GatewayLog.aggregate([
      {
        $match: {
          $or: [{ user: userId }, { user: { $exists: false } }],
        },
      },
      {
        $group: {
          _id: '$serviceSlug',
          serviceName: { $first: '$serviceName' },
          totalRequests: { $sum: 1 },
          avgLatency: { $avg: '$latencyMs' },
          errorCount: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
        },
      },
      { $sort: { totalRequests: -1 } },
      { $limit: 10 },
      {
        $project: {
          slug: '$_id',
          name: { $ifNull: ['$serviceName', '$_id'] },
          totalRequests: 1,
          avgLatency: { $round: ['$avgLatency', 1] },
          errorRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$errorCount', { $cond: [{ $eq: ['$totalRequests', 0] }, 1, '$totalRequests'] }] },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated, filterable request logs
// @route   GET /api/analytics/logs
// @access  Private
exports.getLogs = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { page = 1, limit = 25, serviceSlug, statusCode, method, search } = req.query;

    const query = {
      $or: [{ user: userId }, { user: { $exists: false } }],
    };

    if (serviceSlug) query.serviceSlug = serviceSlug;
    if (statusCode) query.statusCode = Number(statusCode);
    if (method) query.method = method.toUpperCase();

    if (search) {
      query.$or = [
        { path: { $regex: search, $options: 'i' } },
        { apiKeyPrefix: { $regex: search, $options: 'i' } },
        { serviceSlug: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      GatewayLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      GatewayLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: logs,
    });
  } catch (err) {
    next(err);
  }
};
