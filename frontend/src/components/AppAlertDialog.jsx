import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const AppAlertContext = createContext(() => {});

export const useAppAlert = () => useContext(AppAlertContext);

const AppAlertDialog = ({ message, onClose }) => {
  const okButtonRef = useRef(null);
  const isError = /\b(error|failed|unable|missing|invalid|wrong|please|required|could not|no leads)\b/i.test(message);

  useEffect(() => {
    if (!message) return undefined;

    okButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" || event.key === "Enter") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="app-alert-backdrop" role="presentation">
      <div
        className="app-alert-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-alert-title"
        aria-describedby="app-alert-message"
      >
        <div className={`app-alert-icon${isError ? " app-alert-icon-error" : ""}`} aria-hidden="true">
          {isError ? "!" : "\u2713"}
        </div>
        <h2 id="app-alert-title">{isError ? "Please check" : "Success"}</h2>
        <p id="app-alert-message">{message}</p>
        <button ref={okButtonRef} type="button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export const AppAlertProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const currentMessage = messages[0] || "";

  const showAlert = useCallback((message) => {
    setMessages((current) => [...current, String(message || "Something went wrong.")]);
  }, []);

  const closeAlert = useCallback(() => {
    setMessages((current) => current.slice(1));
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = showAlert;
    return () => {
      window.alert = nativeAlert;
    };
  }, [showAlert]);

  return (
    <AppAlertContext.Provider value={showAlert}>
      {children}
      <AppAlertDialog message={currentMessage} onClose={closeAlert} />
    </AppAlertContext.Provider>
  );
};
