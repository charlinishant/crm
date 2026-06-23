const { connectTwoNumbers } = require("./twilioVoice.service")

exports.startProviderCall = async ({ phone, agentPhone, callLogId }) => {
  const result = await connectTwoNumbers({
    agentPhone,
    leadPhone:phone,
    callLogId,
  })

  return {
    ...result,
    callId:result.providerCallId,
  }
}
