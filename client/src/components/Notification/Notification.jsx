// import React, { useState,useEffect } from "react";
// import axios from "axios";
// import {
//   Badge,
//   IconButton,
//   Popover,
//   Typography,
//   List,
//   ListItem,
//   ListItemText,
//   Box,
//   Divider,
//   Button,
// } from "@mui/material";
// import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
// import CircleIcon from "@mui/icons-material/Circle";
// import { BACKEND_SERVER_URL } from "../../Config/Config";



// const NotificationBell = () => {
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [notificationList, setNotificationList] = useState([]);
//   const unread = notificationList.filter((n) => !n.seen).length;

//   useEffect(() => {
//   const fetchNotifications = async () => {
//     try {
//       const res = await axios.get(`${BACKEND_SERVER_URL}/api/customerOrder/dueTomorrow`);
//       setNotificationList(res.data.data);
//     } catch (err) {
//       console.error("Failed to fetch notifications", err);
//     }
//   };

//   fetchNotifications();
// }, []);


//   const handleClick = (e) => setAnchorEl(e.currentTarget);
//   const handleClose = () => setAnchorEl(null);

//   const markAllAsRead = () => {
//     setNotificationList(notificationList.map((n) => ({ ...n, seen: true })));
//   };

//   return (
//     <>
//       <IconButton
//         onClick={handleClick}
//         sx={{
//           "&:hover": {
//             backgroundColor: "rgba(255, 255, 255, 0.1)",
//           },
//         }}
//       >
//         <Badge
//           badgeContent={unread}
//           color="error"
//           invisible={unread === 0}
//           sx={{
//             "& .MuiBadge-badge": {
//               right: 5,
//               top: 5,
//               padding: "0 4px",
//               height: "16px",
//               minWidth: "16px",
//             },
//           }}
//         >
//           <NotificationsNoneIcon
//             sx={{
//               color: "#fff",
//               fontSize: "1.5rem",
//             }}
//           />
//         </Badge>
//       </IconButton>

//       <Popover
//         anchorEl={anchorEl}
//         open={Boolean(anchorEl)}
//         onClose={handleClose}
//         anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
//         transformOrigin={{ vertical: "top", horizontal: "right" }}
//         PaperProps={{
//           sx: {
//             mt: 1.5,
//             borderRadius: "12px",
//             width: 380,
//             boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.15)",
//             overflow: "hidden",
//           },
//         }}
//       >
//         <Box
//           sx={{
//             px: 2,
//             py: 1.5,
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             backgroundColor: "#f8f9fa",
//             borderBottom: "1px solid #e9ecef",
//           }}
//         >
//           <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>
//             Notifications {unread > 0 && `(${unread} new)`}
//           </Typography>
//           {unread > 0 && (
//             <Button
//               onClick={markAllAsRead}
//               size="small"
//               sx={{
//                 textTransform: "none",
//                 fontSize: "0.75rem",
//                 color: "#6c757d",
//                 "&:hover": {
//                   backgroundColor: "transparent",
//                   color: "#495057",
//                 },
//               }}
//             >
//               Mark all as read
//             </Button>
//           )}
//         </Box>
        

//         <List dense disablePadding>
//   {notificationList.length ? (
//     notificationList.map((note) => (
//       <ListItem key={note.id}>
//         ...
//         <Typography>{note.message}({note.date})</Typography>
//       </ListItem>
//     ))
//   ) : (
//     <Typography>No new notifications</Typography>
//   )}
// </List>

//       </Popover>
//     </>
//   );
// };

// export default NotificationBell;



import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Badge,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Divider,
  Button,
  Checkbox,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationList, setNotificationList] = useState([]);
  const unread = notificationList.filter((n) => !n.seen).length;

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/customerOrder/dueTomorrow`
      );
      const enriched = res.data.data.map((n) => ({
        ...n,
        status: n.status || "Pending",
      }));
      setNotificationList(enriched);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
  fetchNotifications(); 

  const handleRefresh = () => {
    fetchNotifications();
  };

  window.addEventListener("refresh-notifications", handleRefresh);

  return () => {
    window.removeEventListener("refresh-notifications", handleRefresh);
  };
}, []);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, seen: true })));
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

 const handleMarkDelivered = async (noteId) => {
  try {
    await axios.patch(
      `${BACKEND_SERVER_URL}/api/customerOrder/markAsDelivered/${noteId}`
    );
    window.dispatchEvent(new Event("refresh-customer-orders"));

        await fetchNotifications();

  } catch (err) {
    console.error("Failed to update delivery status", err);
  }
};


  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <Badge
          badgeContent={unread}
          color="error"
          invisible={unread === 0}
          sx={{
            "& .MuiBadge-badge": {
              right: 5,
              top: 5,
              padding: "0 4px",
              height: "16px",
              minWidth: "16px",
            },
          }}
        >
          <NotificationsNoneIcon
            sx={{
              color: "#fff",
              fontSize: "1.5rem",
            }}
          />
        </Badge>
      </IconButton>

      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1.5,
            borderRadius: "12px",
            width: 420,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.15)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #e9ecef",
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>
            Notifications {unread > 0 && `(${unread} new)`}
          </Typography>
          {unread > 0 && (
            <Button
              onClick={markAllAsRead}
              size="small"
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                color: "#6c757d",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "#495057",
                },
              }}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        <List dense disablePadding sx={{ maxHeight: 450, overflowY: "auto" }}>
          {notificationList.length ? (
            notificationList.map((note) => (
              <React.Fragment key={note.id}>
                <ListItem
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: !note.seen ? "#f8f9fa" : "transparent",
                    "&:hover": {
                      backgroundColor: "#f1f3f5",
                    },
                  }}
                >
                  <Checkbox
                    checked={note.status === "Delivered"}
                    onChange={() => handleMarkDelivered(note.id)}
                    disabled={note.status === "Delivered"}
                    size="small"
                    sx={{
                      mr: 2,
                      color: "#6c757d",
                      "&.Mui-checked": {
                        color: "#28a745",
                      },
                      "&.Mui-disabled": {
                        color: "#ced4da",
                      },
                    }}
                  />
                  <ListItemText
                    primary={
                      <Typography
                        fontSize="0.875rem"
                        fontWeight={note.status === "Delivered" ? 400 : 500}
                        color={
                          note.status === "Delivered"
                            ? "#28a745"
                            : "text.primary"
                        }
                        sx={{
                          textDecoration:
                            note.status === "Delivered" ? "line-through" : "none",
                        }}
                      >
                        {note.message}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        fontSize="0.75rem"
                        color={
                          note.status === "Delivered" ? "#adb5bd" : "#868e96"
                        }
                      >
                        Due on {formatDate(note.date)}
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider sx={{ my: 0 }} />
              </React.Fragment>
            ))
          ) : (
            <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
              <Typography fontSize="0.875rem" color="text.secondary">
                No new notifications.
              </Typography>
            </Box>
          )}
        </List>
      </Popover>
    </>
  );
};

export default NotificationBell;


