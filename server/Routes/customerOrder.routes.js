const express = require("express");
const {
  getCustomerOrder,
  createCustomerOrder,
  updateCustomerOrder,

  // deleteCustomerOrder,
  // deleteOrderById,
  deleteOrderGroup,
  deleteOrderById,
  addExtraItemToOrderGroup,
  deleteImageById,
  getAllCustomerOrders,
  getDueTomorrowOrders,
  makeStatusAsDelivered,

} = require("../Controllers/customerOrder.controllers");
const router = express.Router();
const upload = require("../Utils/fileUpload");

router.get("/getCustomerInfo/:customer_id", getCustomerOrder);
router.post("/create", upload.any(), createCustomerOrder);
router.post("/addToGroup/:order_group_id",upload.any(),addExtraItemToOrderGroup);
router.put("/update/:id", upload.any(), updateCustomerOrder);
// router.delete("/:customer_id/:orderId",deleteOrderById);
// router.delete("/delete/:orderId", deleteCustomerOrder);
router.delete("/deleteGroup/:groupId",deleteOrderGroup)
router.delete("/delete/:itemId", deleteOrderById);

router.delete("/image/:imageId", deleteImageById);
router.get("/all-customer-orders", getAllCustomerOrders);
router.get('/dueTomorrow',getDueTomorrowOrders);
router.patch('/markAsDelivered/:id',makeStatusAsDelivered);

module.exports = router;
