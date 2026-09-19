const mcubeVoice = require("./mcubeVoice.service")

exports.startProviderCall = async ({ lead, phone, agentPhone, agentExtension, callLogId }) => {
  const result = await mcubeVoice.connectTwoNumbers({
    agentPhone,
    agentExtension,
    leadPhone:phone,
    callLogId,
    leadId:lead?.id,
  })

  return {
    ...result,
    callId:result.providerCallId,
  }
}
