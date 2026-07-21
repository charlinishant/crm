const { connectTwoNumbers } = require("./twilioVoice.service")
const mcubeVoice = require("./mcubeVoice.service")

exports.startProviderCall = async ({ lead, phone, agentPhone, callLogId }) => {
  const provider = String(process.env.CALL_PROVIDER || "twilio").trim().toLowerCase()
  const connector = provider === "mcube" ? mcubeVoice : { connectTwoNumbers }
  const result = await connector.connectTwoNumbers({
    agentPhone,
    leadPhone:phone,
    callLogId,
    leadId:lead?.id,
  })

  return {
    ...result,
    callId:result.providerCallId,
  }
}
