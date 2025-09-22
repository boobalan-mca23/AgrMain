export const formatToFixed3Strict = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  if (isNaN(value)) return "-";
  return parseFloat(value).toFixed(3);
};