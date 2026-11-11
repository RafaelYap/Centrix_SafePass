let pendingVerification = null;

export const setPendingVerification = (details) => {
  pendingVerification = details;
};

export const getPendingVerification = () => pendingVerification;

export const clearPendingVerification = () => {
  pendingVerification = null;
};
