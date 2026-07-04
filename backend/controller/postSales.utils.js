const buildBookingDocumentContext = (booking, documentType) => {
  const customerName = [booking?.customerName, booking?.lead?.firstName, booking?.lead?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Customer';

  const unitSummary = [booking?.unit?.type, booking?.unit?.description]
    .filter(Boolean)
    .join(' - ')
    .trim() || 'Unit details pending';

  return {
    bookingId: booking?.id ?? 'N/A',
    bookingNo: booking?.id ?? 'N/A',
    customerName,
    projectName: booking?.projectDetails || 'Project details pending',
    unitSummary,
    bookingDate: booking?.bookedOn ? new Date(booking.bookedOn).toLocaleDateString('en-IN') : 'N/A',
    documentType: (documentType || 'WELCOME_LETTER').replace(/_/g, ' '),
  };
};

const mergeTemplate = (template, context) => {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context?.[key];
    return value === undefined || value === null ? '' : String(value);
  });
};

const calculateDemandBreakdown = ({ agreementValue, percentage, gstRate }) => {
  const principalValue = Number(agreementValue || 0) * (Number(percentage || 0) / 100);
  const gstValue = principalValue * (Number(gstRate || 0) / 100);
  const totalAmount = principalValue + gstValue;

  return {
    principal: Number(principalValue.toFixed(2)),
    gst: Number(gstValue.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

module.exports = {
  buildBookingDocumentContext,
  mergeTemplate,
  calculateDemandBreakdown,
};
