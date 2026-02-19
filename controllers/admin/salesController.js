const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

/* ───────────────────────── helpers ───────────────────────── */

const buildDateRange = (range, query = {}) => {
  const now = new Date();
  let startDate, endDate;

  switch (range) {
    case 'daily': {
      // Current calendar day (local time)
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );
      break;
    }

    case 'weekly': {
      // Last 7 days including today (rolling week)
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    }

    case 'monthly': {
      // Current calendar month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }

    case 'yearly': {
      // Current calendar year
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }

    case 'custom': {
      if (query.from && query.to) {
        startDate = new Date(query.from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(query.to);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Fallback to whole year if custom dates are missing
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
      break;
    }

    default: {
      // Default to "daily"
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );
    }
  }

  return { startDate, endDate };
};





// ───────────────────────── getSales (finalAmount‑based) ─────────────────────────
const getSales = async (req, res) => {
  try {
    /* 1. date range */
    const range = req.query.range || 'daily';
    const { startDate, endDate } = buildDateRange(range, req.query);

    /* 2. aggregation */
    const [stats = {
      totalSales: 0,
      totalDiscounts: 0,
      netRevenue: 0,
      totalOrders: 0,
      totalProducts: 0,
      monthly: []
    }] = await Order.aggregate([
      {
        $match: {
          status: { $regex: /^confirmed$/i },
          createdOn: { $gte: startDate, $lte: endDate }
        }
      },

      /* ---- facet overall + monthly ---- */
      {
        $facet: {
          overall: [{
            $group: {
              _id: null,
              totalSales: { $sum: '$finalAmount' }, // PAID amount
              totalDiscounts: { $sum: '$totalDiscount' },
              netRevenue: { $sum: { $subtract: ['$finalAmount', '$totalDiscount'] } },
              totalOrders: { $sum: 1 },
              totalProducts: { $sum: { $size: '$orderedItems' } }
            }
          }],
          monthly: [
            {
              $group: {
                _id: { $month: '$createdOn' },
                netRevenue: { $sum: { $subtract: ['$finalAmount', '$totalDiscount'] } },
                orderCount: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      },

      /* ---- flatten ---- */
      {
        $project: {
          totalSales: { $ifNull: [{ $arrayElemAt: ['$overall.totalSales', 0] }, 0] },
          totalDiscounts: { $ifNull: [{ $arrayElemAt: ['$overall.totalDiscounts', 0] }, 0] },
          netRevenue: { $ifNull: [{ $arrayElemAt: ['$overall.netRevenue', 0] }, 0] },
          totalOrders: { $ifNull: [{ $arrayElemAt: ['$overall.totalOrders', 0] }, 0] },
          totalProducts: { $ifNull: [{ $arrayElemAt: ['$overall.totalProducts', 0] }, 0] },
          monthly: 1
        }
      }
    ]);

    /* 3. derived */
    const averageOrderValue = stats.totalOrders
      ? stats.totalSales / stats.totalOrders
      : 0;

    /* 4. chart arrays */
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
      'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesArr = Array(12).fill(0);
    const ordersArr = Array(12).fill(0);

    stats.monthly.forEach(m => {
      salesArr[m._id - 1] = m.netRevenue;
      ordersArr[m._id - 1] = m.orderCount;
    });

    /* 5. render */
    res.render('sales', {
      totalSales: stats.totalSales,
      totalOrders: stats.totalOrders,
      totalProducts: stats.totalProducts,
      totalDiscounts: stats.totalDiscounts,
      netRevenue: stats.netRevenue,
      averageOrderValue,
      salesData: { months: monthLabels, sales: salesArr, orders: ordersArr },
      range,
      from: req.query.from,
      to: req.query.to
    });

  } catch (err) {
    console.error('sales page error:', err);
    res.redirect('/admin/pageerror');
  }
};

/* ───────────────────────── SALES REPORT ───────────────────────── */
const getSalesReport = async (req, res, next) => {
  try {
    const range = req.query.range || 'daily';
    const { startDate, endDate } = buildDateRange(range, req.query);

    const [stats] = await Order.aggregate([
      {
        $match: {
          status: { $regex: /^confirmed$/i },
          createdOn: { $gte: startDate, $lte: endDate }
        }
      },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },

      /* --------------- facets --------------- */
      {
        $facet: {
          overall: [{
            $group: {
              _id: null,
              totalSales: { $sum: '$totalPrice' },   // before coupon
              totalDiscounts: { $sum: '$totalDiscount' },   // coupon
              totalPrice: { $sum: '$finalAmount' },   // what was paid
              totalOrders: { $sum: 1 },
              totalProducts: { $sum: { $size: '$orderedItems' } }
            }
          }],
          monthly: [{
            $group: {
              _id: { $month: '$createdOn' },
              netRevenue: { $sum: '$finalAmount' },
              orderCount: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }],
          orders: [{ $sort: { createdOn: -1 } }]
        }
      },

      /* --------------- flatten --------------- */
      {
        $project: {
          totalSales: { $ifNull: [{ $arrayElemAt: ['$overall.totalSales', 0] }, 0] },
          totalDiscounts: { $ifNull: [{ $arrayElemAt: ['$overall.totalDiscounts', 0] }, 0] },
          totalPrice: { $ifNull: [{ $arrayElemAt: ['$overall.totalPrice', 0] }, 0] },
          totalOrders: { $ifNull: [{ $arrayElemAt: ['$overall.totalOrders', 0] }, 0] },
          totalProducts: { $ifNull: [{ $arrayElemAt: ['$overall.totalProducts', 0] }, 0] },
          monthly: 1,
          orders: 1
        }
      }
    ]);

    /* ---------- derived ---------- */
    const netRevenue = stats.totalPrice;               
    const averageOrderValue = stats.totalOrders
      ? stats.totalPrice / stats.totalOrders
      : 0;

    /* ---------- chart arrays ---------- */
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
      'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesArr = Array(12).fill(0);
    const ordersArr = Array(12).fill(0);

    stats.monthly.forEach(m => {
      salesArr[m._id - 1] = m.netRevenue;
      ordersArr[m._id - 1] = m.orderCount;
    });

    /* ---------- render ---------- */
    res.render('salesReport', {
      totalSales: stats.totalSales,
      totalOrders: stats.totalOrders,
      totalProducts: stats.totalProducts,
      totalDiscounts: stats.totalDiscounts,
      netRevenue,
      averageOrderValue,
      salesData: { months: labels, sales: salesArr, orders: ordersArr },
      range,
      from: req.query.from,
      to: req.query.to,
      orders: stats.orders,
      startDate, endDate
    });

  } catch (err) { next(err); }
};


/* ───────────────────────── DASHBOARD ───────────────────────── */
const getDashboard = async (req, res) => {
  try {
    const filter = req.query.filter || 'daily';
    const { startDate, endDate } = buildDateRange(filter, req.query);

    const match = {
      status: { $regex: /^confirmed$/i },
      createdOn: { $gte: startDate, $lte: endDate }
    };

    // TOP PRODUCTS (With Lookup)
    const topProducts = await Order.aggregate([
      { $match: match },
      { $unwind: '$orderedItems' },
      {
        $group: {
          _id: '$orderedItems.product',
          totalSold: { $sum: '$orderedItems.quantity' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.productName',
          totalSold: 1
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // TOP CATEGORIES (Same as before)
    const topCategories = await Order.aggregate([
      { $match: match },
      { $unwind: '$orderedItems' },
      {
        $lookup: {
          from: 'products',
          localField: 'orderedItems.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSold: { $sum: '$orderedItems.quantity' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          name: '$category.name',
          totalSold: 1
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    console.log('Top Products:', topProducts);
console.log('Top Categories:', topCategories);

    res.render('dashboard', { filter, topProducts, topCategories });
  } catch (err) {
    console.error('dashboard error:', err);
    res.redirect('/admin/pageerror');
  }
};


module.exports = {
  getSales,
  getSalesReport,
  getDashboard
};