const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const fs = require("fs");
 
const getCustomerOrder = async (req, res) => {
  try {
    const { customer_id } = req.params;
 
    const orders = await prisma.customer_order.findMany({
      where: { customer_id: parseInt(customer_id) },
      select: {
        id: true,
        item_name: true,
        description: true,
        weight: true,
        due_date: true,
        status: true,
        worker_name: true,
        order_group_id: true,
        productImages: { select: { filename: true } },
      },
      orderBy: { order_group_id: "asc" },
    });
 
    const grouped = {};
 
    for (const order of orders) {
      const groupId = order.order_group_id;
      if (!grouped[groupId]) grouped[groupId] = [];
 
      grouped[groupId].push(order);
    }
 
    return res.status(200).json({
      message: "Grouped orders fetched",
      data: grouped,
    });
  } catch (error) {
    console.error("Error fetching grouped orders:", error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
};
 
const createCustomerOrder = async (req, res) => {
  try {
    const {
      customer_id,
      item_name,
      description,
      weight,
      due_date,
      worker_name,
      order_group_id,
    } = req.body;
 
    const names = Array.isArray(item_name) ? item_name : [item_name];
    const descriptions = Array.isArray(description)
      ? description
      : [description];
    const weights = Array.isArray(weight) ? weight : [weight];
    const dueDates = Array.isArray(due_date) ? due_date : [due_date];
    const workerNames = Array.isArray(worker_name)
      ? worker_name
      : [worker_name];
 
    const groupId = order_group_id
      ? parseInt(order_group_id)
      : Math.floor(Date.now() / 1000);
    const createdOrders = [];
 
    for (let i = 0; i < names.length; i++) {
      const dueDate = new Date(dueDates[i]);
 
      const order = await prisma.customer_order.create({
        data: {
          customer_id: parseInt(customer_id),
          item_name: names[i],
          description: descriptions[i],
          weight: parseFloat(weights[i]),
          due_date: dueDate,
          worker_name: workerNames[i],
          order_group_id: groupId,
          status: "Pending",
        },
      });
 
      const filesForThisItem = (req.files || []).filter((file) =>
        file.fieldname.startsWith(`images_${i}`)
      );
 
      if (filesForThisItem.length > 0) {
        const imageRecords = filesForThisItem.map((file) => ({
          customer_order_id: order.id,
          filename: file.filename,
        }));
 
        await prisma.product_multiple_images.createMany({ data: imageRecords });
      }
 
      createdOrders.push(order);
    }
 
    return res.status(201).json({
      message: "Customer orders created successfully",
      data: createdOrders,
      order_group_id: groupId,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({ error: "Failed to create customer order" });
  }
};
 
const updateCustomerOrder = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: "Invalid order ID" });
    }
 
    const {
      item_name,
      description,
      weight,
      due_date,
      status,
      worker_name,
      order_group_id,
    } = req.body;
 
    const existingOrder = await prisma.customer_order.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order item not found" });
    }
 
    if (
      order_group_id &&
      parseInt(order_group_id) !== existingOrder.order_group_id
    ) {
      return res.status(400).json({ error: "Order group ID mismatch" });
    }
 
    const dataToUpdate = {};
 
    if (item_name !== undefined) dataToUpdate.item_name = item_name;
    if (description !== undefined) dataToUpdate.description = description;
    if (weight !== undefined) dataToUpdate.weight = parseFloat(weight);
    if (due_date !== undefined) {
      const parsedDate = new Date(due_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid due date format" });
      }
      dataToUpdate.due_date = parsedDate;
    }
    if (status !== undefined) dataToUpdate.status = status;
    if (worker_name !== undefined) dataToUpdate.worker_name = worker_name;
 
    const updatedOrder = await prisma.customer_order.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });
 
    if (req.files && req.files.length > 0) {
      const imageRecords = req.files.map((file) => ({
        customer_order_id: parseInt(id),
        filename: file.filename,
      }));
 
      await prisma.product_multiple_images.createMany({
        data: imageRecords,
      });
    }
 
    return res.status(200).json({
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ error: "Failed to update customer order" });
  }
};
 
const addExtraItemToOrderGroup = async (req, res) => {
  try {
    const { order_group_id } = req.params;
    const {
      customer_id,
      item_name,
      description,
      weight,
      due_date,
      worker_name,
    } = req.body;
 
    const dueDate = new Date(due_date);
 
    const order = await prisma.customer_order.create({
      data: {
        customer_id: parseInt(customer_id),
        item_name,
        description,
        weight: parseFloat(weight),
        due_date: dueDate,
        worker_name,
        order_group_id: parseInt(order_group_id),
        status: "Pending",
      },
    });
 
    if (req.files && req.files.length > 0) {
      const imageRecords = req.files.map((file) => ({
        customer_order_id: order.id,
        filename: file.filename,
      }));
 
      await prisma.product_multiple_images.createMany({ data: imageRecords });
    }
 
    return res.status(201).json({
      message: "Item added to order group successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error adding to group:", error);
    return res.status(500).json({ error: "Failed to add item to order group" });
  }
};
 
// const deleteCustomerOrder = async (req, res) => {
//   try {
//     const orderId = parseInt(req.params?.orderId?.toString());
 
//     const existingOrder = await prisma.customer_order.findUnique({
//       where: { id: orderId },
//     });
 
//     if (!existingOrder) {
//       return res.status(404).json({ error: "Order not found" });
//     }
//     await prisma.product_multiple_images.deleteMany({
//       where: { customer_order_id: orderId },
//     });
//     const deletedOrder = await prisma.customer_order.delete({
//       where: { id: orderId },
//     });
 
//     res.status(200).json({
//       message: "Successfully deleted",
//       data: deletedOrder,
//     });
//   } catch (error) {
//     console.error("Error deleting order:", error);
//     res.status(500).json({ error: "Failed to delete order" });
//   }
// };
 
// const deleteOrderById=async(req,res)=>{
//   try{
//     const {customer_id,orderId}=req.params
//       const ifExist= await prisma.customer_order.findUnique({
//         where:{
//           id:parseInt(orderId)
//         }
//       })
 
//       if(!ifExist){
//         return res.status(400).json({err:`this order id ${orderId} not exist for this customer`})
//       }
//      await prisma.customer_order.delete({
//       where:{
//          id:parseInt(orderId)
//       }
//      })
 
//     const orders = await prisma.customer_order.findMany({
//       where: { customer_id: parseInt(customer_id) },
//       select: {
//         id: true,
//         item_name: true,
//         description: true,
//         weight: true,
//         due_date: true,
//         status: true,
//         worker_name: true,
//         order_group_id: true,
//         productImages: { select: { filename: true } },
//       },
//       orderBy: { order_group_id: "asc" },
//     });
 
//     const grouped = {};
 
//     for (const order of orders) {
//       const groupId = order.order_group_id;
//       if (!grouped[groupId]) grouped[groupId] = [];
 
//       grouped[groupId].push(order);
//     }
 
//     return res.status(200).json({
//       message: "Grouped orders fetched",
//       data: grouped,
//     });
   
 
//   }catch(err){
//     return res.status(500).json({err:err.message})
//   }
// }
 
const deleteImageById = async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }
 
    const image = await prisma.product_multiple_images.findUnique({
      where: { id: imageId },
    });
 
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
 
    const fs = require("fs");
    const path = require("path");
    const imagePath = path.join(__dirname, "../../uploads", image.filename);
 
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
 
    await prisma.product_multiple_images.delete({
      where: { id: imageId },
    });
 
    return res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    return res.status(500).json({ error: "Failed to delete image" });
  }
};
 
const getAllCustomerOrders = async (req, res) => {
  try {
    const orders = await prisma.customer_order.findMany({
      select: {
        id: true,
        item_name: true,
        description: true,
        weight: true,
        due_date: true,
        status: true,
        worker_name: true,
        order_group_id: true,
        customer_id: true,
        created_at: true,
        updatedAt: true,
        productImages: { select: { filename: true } },
        customers: { select: { name: true } },
      },
    });
 
    res.status(200).json({
      message: "All customer orders fetched",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
 
const getDueTomorrowOrders = async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
 
    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);
 
    const orders = await prisma.customer_order.findMany({
      where: {
        due_date: {
          gte: tomorrow,
          lt: nextDay,
        },
        status: "Pending",
      },
      select: {
        id: true,
        item_name: true,
        description: true,
        weight: true,
        due_date: true,
        status: true,
        worker_name: true,
        order_group_id: true,
        customer_id: true,
        created_at: true,
        updatedAt: true,
        customers: {
          select: {
            name: true,
          },
        },
      },
    });
 
    const notifications = orders.map((order) => ({
      id: order.id,
      message: `${order.item_name} order due tomorrow for ${
        order.customers?.name || "Unknown Customer"
      } (Worker: ${order.worker_name || "N/A"})`,
      date: order.due_date,
      status: order.status,
    }));
 
    res.json({ message: "Notifications fetched", data: notifications });
  } catch (error) {
    console.error("Error fetching notifications", error);
    res.status(500).json({ error: "Failed to fetch due orders" });
  }
};
 
const makeStatusAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;
 
    const existingOrder = await prisma.customer_order.findUnique({
      where: { id: parseInt(id) },
    });
 
    if (!existingOrder) {
      return res.status(404).json({ error: "Order item not found" });
    }
 
    const updatedOrder = await prisma.customer_order.update({
      where: { id: parseInt(id) },
      data: { status: "Delivered" },
    });
 
    return res.json({
      message: "Order marked as delivered",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error marking order delivered:", error);
    return res.status(500).json({ error: "Failed to update order status" });
  }
};

/**
 * DELETE whole order group
 * Route: DELETE /api/customerOrder/deleteGroup/:groupId
 */
const deleteOrderGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    console.log("Deleting order group:", groupId);
    if (isNaN(groupId)) return res.status(400).json({ error: "Invalid groupId" });

    // find orders in group
    const orders = await prisma.customer_order.findMany({
      where: { order_group_id: groupId },
      select: { id: true },
    });

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) {
      return res.status(404).json({ error: "No orders found for this group" });
    }

    const images = await prisma.product_multiple_images.findMany({
      where: { customer_order_id: { in: orderIds } },
      select: { id: true, filename: true },
    });

    for (const img of images) {
      try {
        const imagePath = path.join(__dirname, "../../uploads", img.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (e) {
        console.error(`Failed to unlink file for image id ${img.id}:`, e);
      }
    }
    await prisma.product_multiple_images.deleteMany({
      where: { customer_order_id: { in: orderIds } },
    });

    await prisma.customer_order.deleteMany({
      where: { order_group_id: groupId },
    });

    return res.status(200).json({ message: "Order group deleted successfully" });
  } catch (error) {
    console.error("Error deleting order group:", error);
    return res.status(500).json({ error: "Failed to delete order group" });
  }
};

const deleteOrderById = async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log("Deleting single order:", itemId);
    if (isNaN(parseInt(itemId)))
      return res.status(400).json({ error: "Invalid order ID" });
    const existingOrder = await prisma.customer_order.findUnique({
      where: { id: parseInt(itemId) },
    });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    await prisma.product_multiple_images.deleteMany({
      where: { customer_order_id: parseInt(itemId) },  
    });
    const deletedOrder = await prisma.customer_order.delete({
      where: { id: parseInt(itemId) },
    });
    res.status(200).json({
      message: "Successfully deleted",
      data: deletedOrder,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
};
 
module.exports = {
  getCustomerOrder,
  createCustomerOrder,
  updateCustomerOrder,
  // deleteCustomerOrder,
  deleteOrderById,
  addExtraItemToOrderGroup,
  deleteImageById,
  getAllCustomerOrders,
  getDueTomorrowOrders,
  makeStatusAsDelivered,
  deleteOrderGroup,
};
 
