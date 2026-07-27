const mcubeVoice = require("./mcubeVoice.service")

exports.startProviderCall = async ({ lead, phone, agentPhone, callLogId }) => {
  const result = await mcubeVoice.connectTwoNumbers({
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
