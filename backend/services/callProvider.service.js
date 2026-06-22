const { connectTwoNumbers } = require("./exotel.service")

exports.startProviderCall = async ({ phone, agentPhone }) => {
  const result = await connectTwoNumbers({
    agentPhone,
    leadPhone:phone,
  })

  return {
    ...result,
    callId:result.providerCallId,
  }
}
