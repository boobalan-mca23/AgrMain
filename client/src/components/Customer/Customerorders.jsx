import React, { useState, useEffect } from "react";
import axios from "axios";

import { useLocation } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Box,
  Divider,
  Tooltip,
  useTheme,
  Modal,
} from "@mui/material";
import {
  AddCircleOutline,
  Add,
  Close,
  CheckCircle,
  PendingActions,
  Image as ImageIcon,
  Edit,
  Delete,
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: alpha(theme.palette.primary.light, 0.05),
  },
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.light, 0.15),
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 600,
  minWidth: 120,
  ...(status === "Pending" && {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.dark,
    border: `1px solid ${theme.palette.warning.main}`,
  }),
  ...(status === "Delivered" && {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.dark,
    border: `1px solid ${theme.palette.success.main}`,
  }),
}));

const OrderCard = styled(Paper)(({ theme }) => ({
  margin: theme.spacing(3, 0),
  padding: theme.spacing(3),
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  background: theme.palette.background.paper,
  transition: "all 0.3s ease",
}));

const ImagePreview = styled("div")(({ theme }) => ({
  width: 60,
  height: 60,
  borderRadius: 4,
  backgroundColor: "#f5f5f5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  cursor: "pointer",
  position: "relative",
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
}));

const FullSizeImageModal = styled(Modal)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiBox-root": {
    outline: "none",
    position: "relative",
    maxWidth: "90%",
    maxHeight: "90%",
  },
  "& img": {
    maxWidth: "100%",
    maxHeight: "90vh",
    boxShadow: theme.shadows[10],
  },
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  right: 10,
  top: 10,
  backgroundColor: alpha(theme.palette.common.black, 0.5),
  color: theme.palette.common.white,
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.black, 0.8),
  },
}));

const CustomerOrders = () => {
  const theme = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const customerId = queryParams.get("id");
  const customerName = queryParams.get("name") || "Customer";

  const [open, setOpen] = useState(false);
  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [items, setItems] = useState([
    {
      itemName: "",
      description: "",
      weight: "",
      dueDate: new Date().toISOString().split("T")[0],
      workerName: "",
      images: [],
      imagePreviews: [],
      status: "Pending",
    },
  ]);

  const [orders, setOrders] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setEditingOrder(null);
    setItems([
      {
        itemName: "",
        description: "",
        weight: "",
        dueDate: new Date().toISOString().split("T")[0],
        workerName: "",
        images: [],
        imagePreviews: [],
        status: "Pending",
      },
    ]);
  };

  const handleDeleteOrderItem = async (itemId) => {
    if (!itemId) {
      console.error("Missing item ID for delete:", itemId);
      return;
    }

    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    } 
    

    try {
      const res = await axios.delete(
        `${BACKEND_SERVER_URL}/api/customerOrder/delete/${itemId}`
      );
      toast.success("Order item deleted successfully!");
      console.log(res.data.message);
      fetchCustomerOrders();
      window.dispatchEvent(new Event("refresh-notifications"));
    } catch (error) {
      console.error(
        "Error deleting order item:",
        error?.response?.data?.message || error.message
      );
      toast.error(
        error?.response?.data?.message || "Failed to delete order item."
      );
    }
  };

  // Delete a whole order group (groupId)
  const handleDeleteOrderGroup = async (groupId) => {
    if (!groupId) return;
    if (!window.confirm("Delete entire order group? This cannot be undone."))
      return;

    try {
      // NOTE: adjust endpoint if your backend uses a different path for group delete
      await axios.delete(
        `${BACKEND_SERVER_URL}/api/customerOrder/deleteGroup/${groupId}`
      );
      toast.success("Order group deleted");
      await fetchCustomerOrders();
      window.dispatchEvent(new Event("refresh-notifications"));
    } catch (err) {
      console.error("Failed to delete order group:", err?.response || err);
      toast.error("Failed to delete order group");
    }
  };

  const fetchCustomerOrders = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/customerOrder/getCustomerInfo/${customerId}`
      );
      const groupedData = res.data.data;

      const transformedOrders = Object.entries(groupedData).map(
        ([groupId, items]) => ({
          groupId,
          orderId: `#ORD-GRP-${groupId}`,
          orderDate: items[0]?.created_at || new Date(),
          items: items.map((item) => ({
            id: item.id,
            itemName: item.item_name,
            description: item.description,
            weight: item.weight,
            dueDate: formatDate(item.due_date),
            status: item.status || "Pending",
            workerName: item.worker_name || "",
            imagePreviews:
              item.productImages?.map(
                (img) => `${BACKEND_SERVER_URL}/uploads/${img.filename}`
              ) || [],
            existingImages:
              item.productImages?.map((img) => ({
                id: img.id,
                url: `${BACKEND_SERVER_URL}/uploads/${img.filename}`,
              })) || [],
          })),
        })
      );

      setOrders(transformedOrders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
    }
  };

  useEffect(() => {
    if (customerId) fetchCustomerOrders();
  }, [customerId]);

  const handleOpenImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setOpenImageModal(true);
  };

  const handleCloseImageModal = () => {
    setSelectedImage("");
    setOpenImageModal(false);
  };

  const handleChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const handleImageChange = (index, e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const previews = files.map((file) => URL.createObjectURL(file));

      setItems((prev) =>
        prev.map((it, idx) =>
          idx !== index
            ? it
            : {
                ...it,
                images: [...(it.images || []), ...files],
                imagePreviews: [...(it.imagePreviews || []), ...previews],
              }
        )
      );
    };


  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemName: "",
        description: "",
        weight: "",
        dueDate: new Date().toISOString().split("T")[0],
        workerName: "",
        images: [],
        imagePreviews: [],
        status: "Pending",
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const formatForInput = (ddmmyyyyStr) => {
    if (!ddmmyyyyStr || !ddmmyyyyStr.includes("-")) return "";
    const [dd, mm, yyyy] = ddmmyyyyStr.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleEditOrder = (order) => {
    const groupId = order.groupId;

    const fullItems = order.items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      description: item.description,
      weight: item.weight,
      dueDate: formatForInput(item.dueDate),
      status: item.status || "Pending",
      workerName: item.workerName || "",
      imagePreviews: [...item.imagePreviews],
      existingImages: item.existingImages || [],
      images: [],
      deletedImageIds: [],
    }));

    setEditingOrder({
      ...order,
      groupId,
      isEditingGroup: true,
    });

    setItems(fullItems);
    handleOpen();
  };

  // Edit a single item (record) inside an order
  const handleEditRecord = (order, item) => {
    const fullItem = {
      id: item.id,
      itemName: item.itemName,
      description: item.description,
      weight: item.weight,
      dueDate: formatForInput(item.dueDate),
      status: item.status || "Pending",
      workerName: item.workerName || "",
      imagePreviews: [...item.imagePreviews],
      existingImages: item.existingImages || [],
      images: [],
      deletedImageIds: [],
    };

    setEditingOrder({ groupId: order.groupId, isEditingSingle: true, order });
    setItems([fullItem]);
    handleOpen();
  };

  const handleAddItemToGroup = (order) => {
    const groupId = order.groupId;

    setEditingOrder({
      id: null,
      groupId,
      isAddToGroup: true,
    });

    setItems([
      {
        itemName: "",
        description: "",
        weight: "",
        dueDate: new Date().toISOString().split("T")[0],
        workerName: "",
        images: [],
        imagePreviews: [],
        status: "Pending",
      },
    ]);

    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingOrder?.isEditingSingle) {
        const item = items[0];
        const removedImageIds = item.deletedImageIds || [];
        if (removedImageIds.length > 0) {
          await Promise.all(
            removedImageIds.map((imgId) =>
              axios.delete(
                `${BACKEND_SERVER_URL}/api/customerOrder/image/${imgId}`
              )
            )
          );
        }

        const formData = new FormData();
        formData.append("item_name", item.itemName);
        formData.append("description", item.description);
        formData.append("weight", item.weight);
        formData.append("due_date", item.dueDate);
        formData.append("status", item.status);
        formData.append("worker_name", item.workerName);
        formData.append("order_group_id", editingOrder.groupId);

        if (item.images?.length > 0) {
          item.images.forEach((file) => formData.append("images", file));
        }

        await axios.put(
          `${BACKEND_SERVER_URL}/api/customerOrder/update/${item.id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        toast.success("Item updated");
      }
      // 2) Group edit (multiple items in the dialog)
      else if (editingOrder?.isEditingGroup) {
        const updatePromises = items.map(async (item) => {
          const formData = new FormData();
          formData.append("item_name", item.itemName);
          formData.append("description", item.description);
          formData.append("weight", item.weight);
          formData.append("due_date", item.dueDate);
          formData.append("status", item.status);
          formData.append("worker_name", item.workerName);
          formData.append("order_group_id", editingOrder.groupId);

          const removedImageIds = item.deletedImageIds || [];
          if (removedImageIds.length > 0) {
            await Promise.all(
              removedImageIds.map((imgId) =>
                axios.delete(
                  `${BACKEND_SERVER_URL}/api/customerOrder/image/${imgId}`
                )
              )
            );
          }

          if (item.images?.length > 0) {
            item.images.forEach((file) => formData.append("images", file));
          }

          return axios.put(
            `${BACKEND_SERVER_URL}/api/customerOrder/update/${item.id}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        });

        await Promise.all(updatePromises);
        toast.success("Order group updated successfully");
      }
      // 3) Add single item to existing group
      else if (editingOrder?.isAddToGroup && editingOrder.groupId) {
        const item = items[0];
        const formData = new FormData();

        formData.append("customer_id", customerId);
        formData.append("item_name", item.itemName);
        formData.append("description", item.description);
        formData.append("weight", item.weight);
        formData.append("due_date", item.dueDate);
        formData.append("worker_name", item.workerName);

        if (item.images?.length > 0)
          item.images.forEach((f) => formData.append("images", f));

        await axios.post(
          `${BACKEND_SERVER_URL}/api/customerOrder/addToGroup/${editingOrder.groupId}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        toast.success("Item added to group");
      }
      // 4) Create new orders
      else {
        const formData = new FormData();
        formData.append("customer_id", customerId);

        items.forEach((item, index) => {
          formData.append("item_name", item.itemName);
          formData.append("description", item.description);
          formData.append("weight", item.weight);
          formData.append("due_date", item.dueDate);
          formData.append("worker_name", item.workerName);
          formData.append("image", item.images);

          if (item.images?.length > 0) {
            item.images.forEach((file) => {
              formData.append(`images_${index}[]`, file);
            });
          }
        });

        await axios.post(
          `${BACKEND_SERVER_URL}/api/customerOrder/create`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        toast.success("Order(s) created");
      }

      await fetchCustomerOrders();
      window.dispatchEvent(new Event("refresh-notifications"));

      handleClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save order");
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      fetchCustomerOrders();
    };

    window.addEventListener("refresh-customer-orders", handleRefresh);

    return () => {
      window.removeEventListener("refresh-customer-orders", handleRefresh);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Delivered":
        return <CheckCircle fontSize="small" />;
      case "Pending":
        return <PendingActions fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Order History of {customerName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={handleOpen}
          sx={{
            bgcolor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
            px: 3,
            py: 1.5,
            borderRadius: "8px",
            textTransform: "none",
          }}
        >
          New Order
        </Button>
      </Box>

      {orders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: "12px" }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No orders found for {customerName}
          </Typography>
        </Paper>
      ) : (
        orders.map((order, orderIdx) => (
          <OrderCard key={order.orderId || orderIdx}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Order #{orderIdx + 1}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  label={`${order.items.length} ${
                    order.items.length === 1 ? "item" : "items"
                  }`}
                  variant="outlined"
                  color="primary"
                  style={{position:"relative",top:5}}
                />

                {/* Edit order button commented out as requested */}
                {/* <Tooltip title="Edit Order">
                      <IconButton color="info" onClick={() => handleEditOrder(order)}>
                      <Edit />
                      </IconButton>
                      </Tooltip> */}

                <Tooltip title="Add Item to this Group">
                  <IconButton
                    color="success"
                    onClick={() => handleAddItemToGroup(order)}
                  >
                    <AddCircleOutline />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete entire order group">
                    <Button
                        variant="contained"
                        startIcon={<Delete />}
                        color="error" 
                        onClick={() => handleDeleteOrderGroup(order.groupId)}
                        sx={{ textTransform: "none", px:2, py:1.2,padding:0, minWidth:130 }}
                        >        
                        Delete Order
                   </Button>
               {/* <IconButton color="error" onClick={() => handleDeleteOrderGroup(order.groupId)}>
               <p style={{fontSize:15,padding:5}}>Delete Order</p><Delete />
              </IconButton> */}
                </Tooltip>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    backgroundColor: "#e3f2fd",
                    "& th": {
                      backgroundColor: "#e3f2fd",
                      color: "#0d47a1",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    },
                  }}
                >
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="center">Weight</TableCell>
                    <TableCell align="center">Due Date</TableCell>
                    <TableCell align="center">Worker Name</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item, iIdx) => (
                    <StyledTableRow key={item.id ?? `${order.groupId}-${iIdx}`}>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          {item.imagePreviews?.length > 0 && (
                            <Box
                              sx={{
                                mt: 1,
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              {item.imagePreviews.map((preview, pIdx) => (
                                <Box key={`${item.id ?? order.groupId}-${pIdx}`} sx={{ position: "relative" }}>
                                <ImagePreview onClick={() => handleOpenImageModal(preview)}>
                                  <img src={preview} alt={`preview-${pIdx}`} />
                                </ImagePreview>
                              </Box>
                              ))}
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.itemName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-line" }}
                        >
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.weight}</TableCell>
                      <TableCell align="center">
                        {item.dueDate || "N/A"}
                      </TableCell>
                      <TableCell align="center">
                        {item.workerName || "N/A"}
                      </TableCell>
                      <TableCell align="center">
                        <StatusChip
                          label={item.status}
                          status={item.status}
                          icon={getStatusIcon(item.status)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit this item">
                          <IconButton
                            color="info"
                            onClick={() => handleEditRecord(order, item)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete this item">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteOrderItem(item.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </OrderCard>
        ))
      )}

       <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth={false} // Disable the built-in width limit
          PaperProps={{
            sx: {
             width:
                items.length === 1
                  ? "30vw !important"
                  : items.length === 2
                  ? "40vw!important"
                  : "60vw!important",
              maxWidth: "1600px",
              borderRadius: 3,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              backgroundColor: "#fafafa",
              transition: "width 0.3s ease-in-out", // smooth resize
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 2,
              px: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {editingOrder ? "Edit Order" : "Create New Order"}
            </Typography>
            <IconButton onClick={handleClose} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent
            dividers
            sx={{
              py: 3,
              px: 4,
              maxHeight: "75vh",
              overflowY: "auto",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
              Order Items
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:`repeat(${Math.min(items.length, 3)}, 1fr)`,
                gap: 2,
              }}
            >
              {items.map((item, index) => (
                <Box
                  key={item.id ?? index}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 2,
                    p: 2,
                    backgroundColor: "white",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    position: "relative",
                  }}
                >
                  {items.length > 1 && (
                    <Tooltip title="Remove item">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        color="error"
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  <TextField
                    label="Item Name"
                    value={item.itemName}
                    onChange={(e) => handleChange(index, "itemName", e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <TextField
                    label="Description"
                    value={item.description}
                    onChange={(e) => handleChange(index, "description", e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                  />
                  <TextField
                    label="Weight (grams)"
                    type="text"
                    value={item.weight}
                    onChange={(e) => handleChange(index, "weight", e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <TextField
                    label="Due Date"
                    type="date"
                    value={item.dueDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => handleChange(index, "dueDate", e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Worker Name"
                    value={item.workerName}
                    onChange={(e) => handleChange(index, "workerName", e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <TextField
                    select
                    label="Status"
                    value={item.status}
                    onChange={(e) => handleChange(index, "status", e.target.value)}
                    size="small"
                    fullWidth
                    required
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Delivered">Delivered</MenuItem>
                  </TextField>

                  <Box>
                    <input
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      id={`image-upload-${index}`}
                      type="file"
                      onChange={(e) => handleImageChange(index, e)}
                    />
                    <label htmlFor={`image-upload-${index}`}>
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<ImageIcon />}
                        fullWidth
                        sx={{ height: "40px" }}
                      >
                        Upload Image
                      </Button>
                    </label>

                    {(item.existingImages?.length || item.imagePreviews?.length) > 0 && (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                        {item.imagePreviews.map((preview, pIdx) => (
                          <ImagePreview
                            key={pIdx}
                            onClick={() => handleOpenImageModal(preview)}
                          >
                            <img src={preview} alt={`preview-${pIdx}`} />
                          </ImagePreview>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddItem}
              sx={{ mt: 3 }}
            >
              Add Another Item
            </Button> */}
          </DialogContent>

          <DialogActions sx={{ px: 4, py: 2 }}>
             <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddItem}
              sx={{ display:"flex",flexDirection:"row", alignItems:"center", justifyContent:"center" }}
            >
              Add Another Item
            </Button>
            <Button onClick={handleClose} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={
                !items.every(
                  (item) =>
                    item.itemName &&
                    item.description &&
                    item.weight &&
                    item.dueDate &&
                    item.workerName
                )
              }
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
                px: 3,
                textTransform: "none",
              }}
            >
              {editingOrder ? "Save Changes" : "Save Order"}
            </Button>
          </DialogActions>
        </Dialog>



      <FullSizeImageModal open={openImageModal} onClose={handleCloseImageModal}>
        <Box>
          <img src={selectedImage} alt="Full size preview" />
          <CloseButton onClick={handleCloseImageModal}>
            <Close />
          </CloseButton>
        </Box>
      </FullSizeImageModal>
    </Container>
  );
};

export default CustomerOrders;
