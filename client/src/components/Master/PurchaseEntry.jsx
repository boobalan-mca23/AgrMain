.stock-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.stock-heading {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

.stock-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.stock-card {
  background-color: #f0f4ff;
  padding: 8px;
  border-radius: 8px;
  flex: 1 0 250px; /* make boxes slightly wider to fit mini-tables */
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
}

.stock-label {
  font-size: 14px;
  color: #333;
}

.stock-value {
  font-size: 20px;
  font-weight: bold;
  color: #0074d9;
}

/* Mini-table wrapper ensures tables stay compact and scroll horizontally if needed */
.mini-table-wrapper {
  margin-top: 6px;
  overflow-x: auto;
}

/* Small table used inside the cards */
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  line-height: 1.15;
  table-layout: auto;
}

.mini-table th,
.mini-table td {
  border: 1px solid #d6e2ff;
  padding: 4px 6px;
  text-align: center;
  white-space: nowrap;
}

.mini-table thead th {
  background-color: #dfeeff;
  color: #002a66;
  font-weight: 600;
}

.mini-table tfoot td {
  background-color: #eef6ff;
  font-weight: 700;
}

.mini-table tbody td {
  background-color: transparent;
}

/* Keep main stock table readable */
.stock-table-container {
  overflow-x: auto;
}

.stock-table {
  width: 100%;
  border-collapse: collapse;
}

.stock-table th,
.stock-table td {
  padding: 10px 12px;
  border: 1px solid #ddd;
  text-align: center;
}

.stock-table th {
  background-color: #0074d9;
  color: white;
}

.in-stock-status {
  color: green;
  font-weight: bold;
}

.sold-status {
  color: red;
  font-weight: bold;
}

.returned-status {
  color: orange;
  font-weight: bold;
}

.stock-weight-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}
