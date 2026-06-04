import React from "react";
import { FaTimes } from "react-icons/fa";

const UserBookingForm = ({
  isOpen,
  children,
  bookingSteps,
  bookingStepIndex,
  bookingMessage,
  bookingProjectMessage,
  bookingProjectSelectValue,
  bookingForm,
  leadName,
  isSavingBooking,
  isLoadingBookingProject,
  onClose,
  onSubmit,
  onPrevious,
  onMarkInterested,
}) => {
  if (!isOpen) return null;

  const submitLabel = isSavingBooking
    ? "Saving..."
    : isLoadingBookingProject
      ? "Loading..."
      : bookingStepIndex === 0
        ? "Next"
        : bookingStepIndex === 1
          ? "Select Unit"
          : bookingStepIndex === 2
            ? "Next"
            : "Confirm Booking";

  return (
    <div className="booking-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      <form className="booking-modal lead-preview-booking-form" onSubmit={onSubmit}>
        <div className="booking-modal-header">
          <h2 className="booking-modal-title" id="booking-modal-title">Booking Details</h2>
          <button
            type="button"
            className="booking-modal-close"
            onClick={onClose}
            aria-label="Close booking details"
          >
            <FaTimes />
          </button>
        </div>

        <div className="booking-modal-stepper" aria-label="Booking progress">
          {bookingSteps.map((step, index) => (
            <div
              className={`booking-step${index < bookingStepIndex ? " is-complete" : ""}${index === bookingStepIndex ? " is-active" : ""}`}
              key={step}
            >
              <span className="booking-step-number">{String(index + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {bookingMessage && (
          <div className="booking-modal-alert">{bookingMessage}</div>
        )}
        {bookingStepIndex === 1 && bookingProjectMessage && (
          <div className="booking-modal-alert">{bookingProjectMessage}</div>
        )}

        {children}

        <input name="customerName" type="hidden" value={bookingForm.customerName} readOnly />
        <input name="stage" type="hidden" value={bookingForm.stage} readOnly />
        <input name="bookedOn" type="hidden" value={bookingForm.bookedOn} readOnly />
        <input name="saleableArea" type="hidden" value={bookingForm.saleableArea} readOnly />
        <input name="basePrice" type="hidden" value={bookingForm.basePrice} readOnly />
        <input name="baseRate" type="hidden" value={bookingForm.baseRate} readOnly />

        <div className={`booking-modal-footer${bookingStepIndex === 0 ? " is-project-step" : ""}`}>
          {bookingStepIndex > 0 && (
            <div className="booking-modal-footer-note">
              You are taking a booking for <span>{leadName}</span>
            </div>
          )}
          <div className="booking-modal-footer-actions">
            <button
              type="button"
              className="lead-preview-booking-cancel"
              onClick={bookingStepIndex === 0 ? onClose : onPrevious}
            >
              {bookingStepIndex === 0 ? "Cancel" : "Previous"}
            </button>
            {bookingStepIndex === 1 && (
              <button
                type="button"
                className="lead-preview-booking-cancel"
                onClick={onMarkInterested}
              >
                Mark as Interested
              </button>
            )}
            <button
              type="submit"
              className="lead-preview-booking-save"
              disabled={
                isSavingBooking ||
                isLoadingBookingProject ||
                (bookingStepIndex === 0 && !bookingProjectSelectValue) ||
                (bookingStepIndex > 0 && !bookingForm.unit)
              }
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserBookingForm;
