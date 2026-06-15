export const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency,
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};