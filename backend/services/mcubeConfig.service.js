const { normalizePhoneNumber } = require("../utils/phone");

/**
 * MCube Configuration Service
 * Handles loading, validating, and providing MCube configuration
 * Ensures secrets are never exposed to frontend
 */
class McubeConfigService {
  constructor() {
    this.config = this.loadConfig();
    this.validationErrors = this.validateConfig();
    this.isEnabled = this.isMcubeEnabled();
  }

  /**
   * Load MCube configuration from environment variables
   * @returns {Object} Configuration object
   */
  loadConfig() {
    return {
      enabled: String(process.env.MCUBE_ENABLED || "false").toLowerCase() === "true",

      // Core API endpoints
      token: String(process.env.MCUBE_TOKEN || "").trim(),
      click2callUrl: String(process.env.MCUBE_CLICK2CALL_URL || process.env.MCUBE_OUTBOUND_API_URL || "https://api.mcube.com/Restmcube-api/outbound-calls").trim(),
      dispositionUrl: String(process.env.MCUBE_DISPOSITION_URL || "https://config.mcube.com/business/disposition-api/disposition").trim(),
      webphoneUrl: String(process.env.MCUBE_WEBPHONE_URL || process.env.MCUBE_SOFTPHONE_URL || "https://mcube.vmc.in/common-widget/Phone/auth").trim(),

      // Tokens (backend only - never exposed to frontend)
      click2callToken: String(process.env.MCUBE_CLICK2CALL_TOKEN || process.env.MCUBE_TOKEN || "").trim(),
      dispositionToken: String(process.env.MCUBE_DISPOSITION_TOKEN || process.env.MCUBE_TOKEN || "").trim(),
      webphoneToken: String(process.env.MCUBE_WEBPHONE_TOKEN || process.env.MCUBE_SOFTPHONE_TOKEN || process.env.MCUBE_TOKEN || "").trim(),

      // Phone numbers
      inboundNumber: String(process.env.MCUBE_INBOUND_NUMBER || "").trim(),
      outboundNumber: String(process.env.MCUBE_OUTBOUND_NUMBER || "").trim(),
      defaultAgentNumber: String(process.env.MCUBE_DEFAULT_AGENT_NUMBER || "").trim(),

      // Webhook security
      webhookToken: String(process.env.MCUBE_WEBHOOK_TOKEN || "").trim(),
      webhookSecret: String(process.env.MCUBE_WEBHOOK_SECRET || "").trim(),

      // Features
      sendCrmMetadata: String(process.env.MCUBE_SEND_CRM_METADATA || "").toLowerCase() === "true",
      requestTimeoutMs: Number(process.env.MCUBE_REQUEST_TIMEOUT_MS) || 20000,
      recordingBaseUrl: String(process.env.MCUBE_RECORDING_BASE_URL || "").trim(),
      defaultCountryCode: String(process.env.MCUBE_DEFAULT_COUNTRY_CODE || process.env.DEFAULT_PHONE_COUNTRY_CODE || "91").replace(/\D/g, ""),
      webphoneTokenParam: String(process.env.MCUBE_WEBPHONE_TOKEN_PARAM || "auth_token").trim(),
      callbackUrl: String(process.env.MCUBE_CALLBACK_URL || "").trim() || "1",
      staleActiveCallMs: Number(process.env.MCUBE_STALE_ACTIVE_CALL_MS) || 2 * 60 * 1000,
      inboundAgentId: String(process.env.MCUBE_INBOUND_AGENT_ID || process.env.MCUBE_DEFAULT_AGENT_ID || "").trim(),
      inboundAgentEmail: String(process.env.MCUBE_INBOUND_AGENT_EMAIL || "").trim().toLowerCase(),
      inboundAgentPhone: String(process.env.MCUBE_INBOUND_AGENT_PHONE || process.env.MCUBE_DEFAULT_AGENT_NUMBER || "").trim(),
      recordingMatchWindowDays: Number(process.env.MCUBE_RECORDING_MATCH_WINDOW_DAYS) || 30,

      // Agent mapping environment variables (fallbacks)
      agentEmailMap: String(process.env.MCUBE_AGENT_EMAIL_MAP || "").trim(),
      agentExtMap: String(process.env.MCUBE_AGENT_EXT_MAP || "").trim(),
      agentNumberMap: String(process.env.MCUBE_AGENT_NUMBER_MAP || process.env.MCUBE_AGENT_PHONE_MAP || "").trim(),
      agentModeMap: String(process.env.MCUBE_AGENT_MODE_MAP || "").trim(),
      agentIdMap: String(process.env.MCUBE_AGENT_ID_MAP || "").trim(),

      // Feature flags
      useCrmUserEmail: String(process.env.MCUBE_USE_CRM_USER_EMAIL || "").toLowerCase() === "true",
    };
  }

  /**
   * Validate MCube configuration
   * @returns {Array} List of validation errors (empty if valid)
   */
  validateConfig() {
    const errors = [];

    if (!this.isEnabled) {
      return errors; // Skip validation if disabled
    }

    // Validate required tokens for enabled features
    if (!this.config.click2callToken) {
      errors.push("MCUBE_CLICK2CALL_TOKEN or MCUBE_TOKEN is required for click-to-call functionality");
    }

    if (!this.config.dispositionToken) {
      errors.push("MCUBE_DISPOSITION_TOKEN or MCUBE_TOKEN is required for disposition functionality");
    }

    if (!this.config.webphoneToken) {
      errors.push("MCUBE_WEBPHONE_TOKEN, MCUBE_SOFTPHONE_TOKEN, or MCUBE_TOKEN is required for webphone functionality");
    }

    // Validate webhook security (recommended but not required for basic functionality)
    if (!this.config.webhookToken && !this.config.webhookSecret) {
      // Just log warning, don't error as webhooks can work without token in some configurations
      console.warn("MCube webhook token/secret not configured - webhooks may be insecure");
    }

    // Validate phone numbers if provided
    if (this.config.inboundNumber && !/^\d+$/.test(this.config.inboundNumber)) {
      errors.push("MCUBE_INBOUND_NUMBER must contain only digits");
    }

    if (this.config.outboundNumber && !/^\d+$/.test(this.config.outboundNumber)) {
      errors.push("MCUBE_OUTBOUND_NUMBER must contain only digits");
    }

    if (this.config.defaultAgentNumber && !/^\d+$/.test(this.config.defaultAgentNumber)) {
      errors.push("MCUBE_DEFAULT_AGENT_NUMBER must contain only digits");
    }

    return errors;
  }

  /**
   * Check if MCube is enabled
   * @returns {boolean}
   */
  isMcubeEnabled() {
    return this.config.enabled;
  }

  /**
   * Get configuration status for logging (safe version without secrets)
   * @returns {Object} Safe configuration status
   */
  getSafeStatus() {
    return {
      enabled: this.config.enabled,
      clickToCallConfigured: !!this.config.click2callToken,
      dispositionConfigured: !!this.config.dispositionToken,
      webphoneConfigured: !!this.config.webphoneToken,
      webhookConfigured: !(this.config.webhookToken === "" && this.config.webhookSecret === ""),
      inboundNumberConfigured: !!this.config.inboundNumber,
      outboundNumberConfigured: !!this.config.outboundNumber,
      defaultAgentNumberConfigured: !!this.config.defaultAgentNumber,
      sendCrmMetadata: this.config.sendCrmMetadata,
      recordingBaseUrlConfigured: !!this.config.recordingBaseUrl,
      validationErrors: this.validationErrors,
      isValid: this.validationErrors.length === 0
    };
  }

  /**
   * Get configuration for MCube services (backend use only)
   * @returns {Object} Configuration for service use
   */
  getServiceConfig() {
    return {
      click2callToken: this.config.click2callToken,
      dispositionToken: this.config.dispositionToken,
      webphoneToken: this.config.webphoneToken,
      click2callUrl: this.config.click2callUrl,
      dispositionUrl: this.config.dispositionUrl,
      webphoneUrl: this.config.webphoneUrl,
      inboundNumber: this.config.inboundNumber,
      outboundNumber: this.config.outboundNumber,
      defaultAgentNumber: this.config.defaultAgentNumber,
      webhookToken: this.config.webhookToken,
      webhookSecret: this.config.webhookSecret,
      sendCrmMetadata: this.config.sendCrmMetadata,
      requestTimeoutMs: this.config.requestTimeoutMs,
      recordingBaseUrl: this.config.recordingBaseUrl,
      defaultCountryCode: this.config.defaultCountryCode,
      agentEmailMap: this.config.agentEmailMap,
      agentExtMap: this.config.agentExtMap,
      agentNumberMap: this.config.agentNumberMap,
      agentModeMap: this.config.agentModeMap,
      agentIdMap: this.config.agentIdMap,
      useCrmUserEmail: this.config.useCrmUserEmail
    };
  }

  /**
   * Get safe configuration for frontend (no secrets)
   * @returns {Object} Safe configuration for frontend consumption
   */
  getFrontendConfig() {
    return {
      enabled: this.config.enabled,
      webphoneUrl: this.config.webphoneUrl,
      sendCrmMetadata: this.config.sendCrmMetadata,
      defaultCountryCode: this.config.defaultCountryCode
      // NOTE: Never include tokens or sensitive configuration
    };
  }

  /**
   * Check if MCube is properly configured and valid
   * @returns {boolean}
   */
  isConfigured() {
    return this.isEnabled && this.validationErrors.length === 0;
  }

  /**
   * Get validation errors
   * @returns {Array} Validation error messages
   */
  getValidationErrors() {
    return [...this.validationErrors]; // Return copy to prevent mutation
  }
}

// Export singleton instance
const mcubeConfigService = new McubeConfigService();
module.exports = mcubeConfigService;