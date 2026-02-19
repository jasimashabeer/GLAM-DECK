const Coupon = require("../../models/couponSchema");

const loadCoupon = async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    res.render("coupon", {
      coupons,
      editCoupon: null,
      errorMsg: null,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const createCoupon = async (req, res) => {
  try {
    const { couponName, startDate, endDate, offerPrice, minimumPrice } =
      req.body;

    const existingCoupon = await Coupon.findOne({
      couponName: couponName.trim(),
    });
    if (existingCoupon) {
      return res.render("coupon", {
        coupons: await Coupon.find({}),
        editCoupon: null,
        errorMsg: "Coupon name already exists",
      });
    }

    const newCoupon = new Coupon({
      couponName,
      startDate: new Date(startDate + "T00:00:00"),
      endDate: new Date(endDate + "T00:00:00"),
      offerPrice: Number(offerPrice),
      minimumPrice: Number(minimumPrice),
    });

    await newCoupon.save();
    res.redirect("/admin/coupons");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const { couponName, startDate, endDate, offerPrice, minimumPrice } =
      req.body;

    // Check if another coupon with the same name already exists (excluding current)
    const duplicate = await Coupon.findOne({
      couponName: couponName.trim(),
      _id: { $ne: couponId },
    });

    if (duplicate) {
      const coupons = await Coupon.find({});
      const couponToEdit = await Coupon.findById(couponId);

      return res.render("coupon", {
        coupons,
        editCoupon: couponToEdit,
        errorMsg: "Coupon name already exists",
      });
    }

    // Update the coupon
    await Coupon.findByIdAndUpdate(couponId, {
      couponName,
      startDate: new Date(startDate + "T00:00:00"),
      endDate: new Date(endDate + "T00:00:00"),
      offerPrice: Number(offerPrice),
      minimumPrice: Number(minimumPrice),
    });

    res.redirect("/admin/coupons");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const editCouponForm = async (req, res) => {
  try {
    const couponId = req.params.id;
    const couponToEdit = await Coupon.findById(couponId);
    const allCoupons = await Coupon.find({});

    if (!couponToEdit) {
      return res.redirect("/admin/coupons");
    }

    res.render("coupon", {
      coupons: allCoupons,
      editCoupon: couponToEdit,
      errorMsg: null,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/pageerror");
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await Coupon.findByIdAndDelete(couponId);
    res.status(200).json({ ok: true, msg: "Coupon deleted" });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

module.exports = {
  loadCoupon,
  createCoupon,
  updateCoupon,
  editCouponForm,
  deleteCoupon,
};